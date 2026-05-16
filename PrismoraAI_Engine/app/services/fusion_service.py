# app/services/fusion_service.py
"""
FUSION SERVICE
Takes a list of Cloudinary clip URLs (output of highlight-generate),
downloads them, merges with ffmpeg (NVENC GPU encode), uploads the
final merged video to Cloudinary, and returns the URL.

This is intentionally separate from highlight generation so each step
can be called independently and retried without re-running the full pipeline.
"""

import os
import time
import subprocess
import requests
import tempfile
from pathlib import Path
from typing import List, Optional

from app.utils.cloudinary_utils import upload_to_cloudinary
from app.core.config import settings

_FFMPEG_DIR = settings.FFMPEG_BIN_DIR
_EXE        = ".exe" if os.name == "nt" else ""
FFMPEG      = os.path.join(_FFMPEG_DIR, f"ffmpeg{_EXE}")


class FusionService:

    # ──────────────────────────────────────────────────────────────────
    # Download a single Cloudinary URL to a local temp file
    # ──────────────────────────────────────────────────────────────────
    def _download_clip(self, url: str, dest_path: str, timeout: int = 120) -> str:
        """
        Download a video from a URL (Cloudinary or any https) to dest_path.
        Returns dest_path on success, raises on failure.
        """
        print(f"[FusionService] ⬇️  Downloading: {url}")
        try:
            response = requests.get(url, stream=True, timeout=timeout)
            response.raise_for_status()
            with open(dest_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=1024 * 512):  # 512 KB chunks
                    if chunk:
                        f.write(chunk)
            size_mb = os.path.getsize(dest_path) / 1024 / 1024
            print(f"[FusionService] ✅ Downloaded → {dest_path} ({size_mb:.1f} MB)")
            return dest_path
        except Exception as e:
            raise RuntimeError(f"[FusionService] Failed to download {url}: {e}")

    # ──────────────────────────────────────────────────────────────────
    # Merge clips with ffmpeg
    # ──────────────────────────────────────────────────────────────────
    def _merge_clips(
        self,
        clip_paths:  List[str],
        output_path: str,
        transition:  str = "fade",   # "fade" | "cut"
    ) -> str:
        """
        Concatenate clips using ffmpeg filter_complex concat.
        This provides perfect sequential timestamps and ignores source PTS gaps,
        ensuring the final video duration matches the exact sum of the clips.
        
        Uses NVENC GPU encoding for speed; falls back to libx264 ultrafast.
        """
        print(f"[FusionService] 🔗 Merging {len(clip_paths)} clips → {output_path}")

        inputs = []
        filter_parts = []
        for i, p in enumerate(clip_paths):
            inputs.extend(["-i", os.path.abspath(p)])
            filter_parts.append(f"[{i}:v][{i}:a]")
            
        n = len(clip_paths)
        filter_complex = "".join(filter_parts) + f"concat=n={n}:v=1:a=1[outv][outa]"

        for vcodec, preset in [("h264_nvenc", "p4"), ("libx264", "ultrafast")]:
            cmd = [
                FFMPEG, "-y",
            ] + inputs + [
                "-filter_complex", filter_complex,
                "-map", "[outv]",
                "-map", "[outa]",
                "-c:v", vcodec,
                "-preset", preset,
                "-tune", "hq" if vcodec == "h264_nvenc" else "fastdecode",
                "-b:v", "1M",
                "-maxrate", "1.5M",
                "-c:a", "aac",
                "-b:a", "192k",
                "-movflags", "+faststart",
                output_path,
            ]
            result = subprocess.run(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
            )
            if result.returncode == 0:
                break
        else:
            raise RuntimeError(
                f"[FusionService] ffmpeg merge failed:\n{result.stderr[-800:]}"
            )

        size_mb = os.path.getsize(output_path) / 1024 / 1024
        print(f"[FusionService] ✅ Merged → {output_path} ({size_mb:.1f} MB)")
        return output_path

    # ──────────────────────────────────────────────────────────────────
    # Get total duration of a video file via ffprobe
    # ──────────────────────────────────────────────────────────────────
    def _get_duration(self, video_path: str) -> float:
        FFPROBE = os.path.join(_FFMPEG_DIR, f"ffprobe{_EXE}")
        try:
            result = subprocess.run(
                [
                    FFPROBE, "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    video_path,
                ],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
            )
            return float(result.stdout.strip())
        except Exception:
            return 0.0

    # ──────────────────────────────────────────────────────────────────
    # PUBLIC: Full fusion pipeline
    # ──────────────────────────────────────────────────────────────────
    def fuse(
        self,
        clip_urls:  List[str],
        transition: str = "fade",
    ) -> dict:
        """
        Download clips → merge → upload → return result dict.

        Args:
            clip_urls:  List of Cloudinary (or any https) video URLs.
                        Order determines the final video order.
            transition: "fade" | "cut"

        Returns:
        {
            "url":            str    – Cloudinary URL of merged video
            "total_duration": float  – duration in seconds
            "clip_count":     int
        }
        """
        if not clip_urls:
            raise ValueError("[FusionService] clip_urls must not be empty")

        t_start = time.time()
        cloud_url = None
        duration  = 0.0

        # Use a temp directory — cleaned up automatically after this method
        with tempfile.TemporaryDirectory(prefix="prismora_fusion_") as tmp_dir:

            # ── Download all clips ────────────────────────────────────
            local_paths: List[str] = []
            print(f"\n[FusionService] ⬇️  Downloading {len(clip_urls)} clips…")

            for i, url in enumerate(clip_urls, 1):
                dest = os.path.join(tmp_dir, f"clip_{i:03d}.mp4")
                self._download_clip(url, dest)
                local_paths.append(dest)

            # ── Single clip: no merge needed, just re-upload ──────────
            if len(local_paths) == 1:
                print("[FusionService] 1 clip — skipping merge, uploading directly")
                merged_path = local_paths[0]
            else:
                # ── Merge ─────────────────────────────────────────────
                import uuid
                unique_name = f"reel_{uuid.uuid4().hex[:8]}.mp4"
                merged_path = os.path.join(tmp_dir, unique_name)
                self._merge_clips(local_paths, merged_path, transition=transition)

            # ── Get duration ──────────────────────────────────────────
            duration = self._get_duration(merged_path)

            # ── Upload merged video to Cloudinary ─────────────────────
            size_mb = os.path.getsize(merged_path) / 1024 / 1024
            print(f"[FusionService] ☁️  Uploading merged video ({size_mb:.1f} MB)…")
            cloud_url = upload_to_cloudinary(merged_path)

            # ── If Cloudinary failed (local fallback), copy file out ──
            # The temp dir is about to be deleted, so we need to
            # preserve the merged file in highlights/ directory
            if cloud_url and ("/static/" in cloud_url or cloud_url.startswith("file://")):
                import shutil
                os.makedirs("highlights", exist_ok=True)
                filename = f"fused_{int(time.time())}.mp4"
                dest_path = os.path.join("highlights", filename)
                shutil.copy2(merged_path, dest_path)
                cloud_url = f"/api/v1/static/highlights/{filename}"
                print(f"[FusionService] 📁 Preserved merged video: {dest_path}")

        elapsed = time.time() - t_start
        print(
            f"\n[FusionService] ✅ Fusion complete in {elapsed:.1f}s\n"
            f"  Clips merged  : {len(clip_urls)}\n"
            f"  Duration      : {duration:.1f}s\n"
            f"  URL           : {cloud_url}\n"
        )

        return {
            "url":            cloud_url,
            "total_duration": duration,
            "clip_count":     len(clip_urls),
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
fusion_service = FusionService()