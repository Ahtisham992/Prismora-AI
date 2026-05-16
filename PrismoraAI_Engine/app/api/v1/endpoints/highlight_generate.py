# app/api/v1/endpoints/highlight_generate.py
"""
HIGHLIGHT GENERATE ENDPOINT  v4
Returns individual clip Cloudinary URLs — no merging.
Pass the clips list to /fuse-clips to get a single merged video.
"""

import os
import glob
import subprocess
from pathlib import Path
from fastapi import APIRouter, HTTPException
import yt_dlp

from app.schemas.highlight_generate import (
    HighlightGenerateRequest,
    HighlightGenerateResponse,
    ClipInfo,
)
from app.services.highlight_generation_service import highlight_generator
from app.utils.file_utils import download_audio, _find_cookie_file
from app.core.config import settings

router    = APIRouter()
_FFMPEG_BIN = settings.FFMPEG_BIN_DIR


# ── yt-dlp helpers (unchanged from previous version) ──────────────────────────

def _find_downloaded_file(out_dir: str, vid_id: str, suffix: str = "") -> str:
    patterns = [
        os.path.join(out_dir, f"{vid_id}{suffix}.mp4"),
        os.path.join(out_dir, f"{vid_id}{suffix}.webm"),
        os.path.join(out_dir, f"{vid_id}{suffix}.mkv"),
        os.path.join(out_dir, f"*{vid_id}{suffix}*"),
    ]
    for pat in patterns:
        hits = glob.glob(pat)
        if hits:
            return max(hits, key=os.path.getsize)
    raise RuntimeError(
        f"Cannot find downloaded file for id='{vid_id}' suffix='{suffix}' "
        f"in '{out_dir}'"
    )


def _ydl_download(url: str, fmt: str, outtmpl: str) -> str:
    cookie_file = _find_cookie_file()
    # ios MUST be first — it's the only client confirmed working on Modal datacenter IPs.
    # web/web_safari are blocked by YouTube bot detection from cloud IPs.
    _clients = [["ios"], ["android"], ["web"], ["web_safari"]]
    last_err = None

    for attempt, clients in enumerate(_clients):
        ydl_opts = {
            "format":               fmt,
            "merge_output_format":  "mp4",
            "outtmpl":              outtmpl,
            "quiet":                False,
            "noplaylist":           True,
            "prefer_ffmpeg":        True,
            "ffmpeg_location":      _FFMPEG_BIN,
            "ffprobe_location":     _FFMPEG_BIN,
            "socket_timeout":       60,
            "concurrent_fragment_downloads": 4,
            "cookiesfrombrowser":   None,
            "cookiefile":           cookie_file,
            "extractor_args": {
                "youtube": {"player_client": clients}
            },
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info   = ydl.extract_info(url, download=True)
                vid_id = info["id"]

            out_dir   = str(Path(outtmpl).parent)
            tmpl_stem = Path(outtmpl).stem
            suffix    = tmpl_stem.replace("%(id)s", "")
            return _find_downloaded_file(out_dir, vid_id, suffix)
        except Exception as e:
            last_err = e
            if attempt < len(_clients) - 1:
                print(f"[Download] ⚠️  Player {clients} failed, trying next...")
                continue
            raise last_err


def download_video_720p(url: str) -> str:
    Path("downloads").mkdir(exist_ok=True)

    # ── Cache check ──────────────────────────────────────────────────────────
    from app.utils.file_utils import _extract_video_id
    video_id = _extract_video_id(url)
    if video_id:
        for cached in [
            Path("downloads") / f"{video_id}.mp4",
            Path("downloads") / f"{video_id}_zyla.mp4",
        ]:
            if cached.exists() and cached.stat().st_size > 1_000_000:  # >1MB
                mb = cached.stat().st_size / 1024 / 1024
                print(f"[Download] ♻️  Cache hit — reusing 720p: {cached} ({mb:.1f} MB)")
                return str(cached)
    # ─────────────────────────────────────────────────────────────────────────

    fmt = (
        "22/"
        "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/"
        "136+140/"
        "best[height<=720][ext=mp4]/best[height<=720]"
    )
    print("[Download] 🎥 Downloading 720p…")
    try:
        path = _ydl_download(url, fmt, outtmpl="downloads/%(id)s.%(ext)s")
    except Exception as e:
        print(f"[Download] ⚠️  All yt-dlp attempts failed. Error: {e}")
        print("[Download] 🔄 Falling back to Zyla API...")
        from app.utils.file_utils import download_with_zyla
        path = download_with_zyla(url, "video", "downloads", "720p")
        
    mb   = os.path.getsize(path) / 1024 / 1024
    print(f"[Download] ✅ 720p → {path} ({mb:.1f} MB)")
    return path


def downscale_to_360p(video_720p: str) -> str:
    stem = Path(video_720p).stem
    out  = f"downloads/{stem}_360p.mp4"
    if os.path.exists(out):
        print(f"[Downscale] ♻️  Reusing 360p: {out}")
        return out

    print("[Downscale] 📹 Creating 360p analysis copy…")
    ffmpeg_exe = os.path.join(
        _FFMPEG_BIN, "ffmpeg.exe" if os.name == "nt" else "ffmpeg"
    )
    cmd = [
        ffmpeg_exe, "-y",
        "-i", video_720p,
        "-vf", "scale=-2:360",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "35",
        "-c:a", "copy",
        "-movflags", "+faststart",
        out,
    ]
    result = subprocess.run(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )
    if result.returncode != 0:
        print("[Downscale] ⚠️  ffmpeg failed — using 720p for analysis")
        return video_720p

    mb = os.path.getsize(out) / 1024 / 1024
    print(f"[Downscale] ✅ 360p → {out} ({mb:.1f} MB)")
    return out


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/", response_model=HighlightGenerateResponse)
async def generate_highlights(req: HighlightGenerateRequest):
    """
    Step 1 of 2-step highlight workflow.

    Runs the full multi-modal pipeline and returns each clip as a
    separate Cloudinary URL. No merging happens here.

    Step 2: POST /fuse-clips with the clips list to get a single merged video.
    """
    import asyncio
    from app.utils.cleanup_utils import cleanup_old_downloads

    def _blocking_pipeline():
        youtube_url = str(req.youtube_url)

        print("\n[Endpoint] ⬇️  Starting downloads…")
        audio_file = download_audio(youtube_url, output_dir="downloads")
        video_720p = download_video_720p(youtube_url)

        if req.demo_mode:
            video_analysis = video_720p
            print("[Endpoint] ⚡ demo_mode: skipping 360p downscale")
        else:
            video_analysis = downscale_to_360p(video_720p)

        print(f"\n[Endpoint] ✅ Downloads complete")
        print(f"  Audio      : {audio_file}")
        print(f"  720p (out) : {video_720p}")
        print(f"  360p (vis) : {video_analysis}")

        segments = req.segments
        if not segments:
            print("\n[Endpoint] ⚠️ No segments provided (timeout fallback). Running full internal transcription...")
            from app.services.transcribe_service import transcriber
            transcript_data = transcriber.transcribe_audio_file(audio_file)
            from app.schemas.highlight_generate import TranscriptSegment
            segments = [
                TranscriptSegment(
                    start=float(s["start"]),
                    end=float(s["end"]),
                    text=str(s["text"])
                )
                for s in transcript_data["segments"]
            ]
            print(f"[Endpoint] ✅ Internal transcription complete: {len(segments)} segments")

        return highlight_generator.create_highlights(
            video_path          = video_720p,
            audio_path          = audio_file,
            segments            = segments,
            duration_str        = req.duration,
            suggestion          = req.suggestion,
            num_clips           = None,
            demo_mode           = req.demo_mode,
            analysis_video_path = video_analysis,
        )

    try:
        result = await asyncio.to_thread(_blocking_pipeline)
        await asyncio.to_thread(cleanup_old_downloads, "downloads", 1.0)

        return HighlightGenerateResponse(
            clips = [ClipInfo(**c) for c in result["clips"]],
            clip_count     = result["clip_count"],
            total_duration = result["total_duration"],
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))