# app/utils/file_utils.py
"""
YOUTUBE DOWNLOAD UTILITY  v4  –  PERMANENT COOKIE-FREE

Key improvements over v3:
  ✅ iOS player client first — mimics the YouTube iOS app, no cookies needed for public videos
  ✅ tv_embedded client second — very reliable, used by embedded players
  ✅ android client third — reliable fallback
  ✅ Stale cookie detection — if cookies are marked as "no longer valid", SKIP them
  ✅ Works permanently on Modal without cookie management
"""

import os
import time
import requests
import re
import yt_dlp
from pathlib import Path
from app.core.config import settings

_FFMPEG_BIN = settings.FFMPEG_BIN_DIR

_FORMAT_STRATEGIES = [
    "bestaudio/best",
    "bestaudio[ext=m4a]/bestaudio/best",
    "best",
]

# Player client priority for cloud environments:
# ios + tv_embedded do NOT require cookies and are not blocked by datacenter IP detection.
# These clients are used by the actual YouTube iOS app and embedded TV players —
# YouTube cannot block them without breaking their own apps.
_PLAYER_CLIENTS = [
    ["ios"],                        # Best: iOS app client, no cookies needed
    ["tv_embedded"],                # TV embedded player, very reliable
    ["ios", "android"],             # Both mobile clients
    ["android"],                    # Android fallback
    ["mweb"],                       # Mobile web
    ["web"],                        # Web last (most affected by bot detection)
]


def _extract_video_id(url: str) -> str | None:
    patterns = [
        r"(?:v=|youtu\.be/|embed/|shorts/)([A-Za-z0-9_-]{11})",
    ]
    for pat in patterns:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return None


def download_with_zyla(youtube_url: str, media_type: str, output_dir: str = "downloads", resolution: str = "720p") -> str:
    """Fallback download using Zylalabs API (Async Polling)."""
    if not settings.ZYLA_API_KEY:
        raise ValueError("ZYLA_API_KEY is not set. Cannot use Zyla fallback.")
    
    video_id = _extract_video_id(youtube_url)
    if not video_id:
        raise ValueError("Could not extract video ID from URL")
        
    url = "https://zylalabs.com/api/11016/youtube+download+and+info+api/20761/download"
    headers = {
        "Authorization": f"Bearer {settings.ZYLA_API_KEY}"
    }
    
    ext = "mp4" if media_type == "video" else "mp3"
    api_format = resolution.replace("p", "") if media_type == "video" else "mp3"
    
    params = {
        "url": youtube_url,
        "format": api_format
    }
    
    print(f"[ZylaAPI] Starting job for {video_id} (format: {api_format})...")
    resp = requests.get(url, headers=headers, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    
    if "progress_url" not in data:
         print(f"[ZylaAPI] WARNING: Could not automatically locate progress_url in response. Dumping:")
         print(data)
         raise RuntimeError(f"Could not find progress_url for {media_type} in Zyla response")
         
    progress_url = data["progress_url"]
    download_url = None
    
    # ── Poll the progress_url until the file is ready ──
    # Long videos (1hr+) can take 3-5 min to process on Zyla's servers.
    # Old: 30 × 3s = 90s max → always timed out for podcasts.
    # New: 80 × 5s = 400s max → handles videos up to ~2hrs.
    print(f"[ZylaAPI] Polling for completion...")
    for poll_attempt in range(80):
        try:
            p_resp = requests.get(progress_url, timeout=15)
            p_data = p_resp.json()
            if "download_url" in p_data:
                download_url = p_data["download_url"]
                print(f"[ZylaAPI] Ready after {poll_attempt * 5}s of polling")
                break
            # Print progress every 30s so Modal logs show it's alive
            if poll_attempt % 6 == 0 and poll_attempt > 0:
                print(f"[ZylaAPI] Still waiting... ({poll_attempt * 5}s elapsed)")
        except Exception as e:
            print(f"[ZylaAPI] Polling warning: {e}")
        time.sleep(5)

    if not download_url:
        raise RuntimeError(
            f"Zyla API timed out after 400s waiting for {media_type} download link. "
            f"Video may be too long or Zyla servers are overloaded."
        )
         
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    out_file = output_path / f"{video_id}_zyla.{ext}"
    
    if out_file.exists() and out_file.stat().st_size > 0:
        print(f"[ZylaAPI] File already exists: {out_file}")
        return str(out_file)
        
    print(f"[ZylaAPI] Downloading {media_type} to {out_file}...")
    headers_stream = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    with requests.get(download_url, headers=headers_stream, stream=True) as r:
        r.raise_for_status()
        with open(out_file, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
                
    print(f"[ZylaAPI] Success: {out_file}")
    
    if media_type == "audio" and ext != "mp3":
        print("[ZylaAPI] Converting audio to mp3...")
        mp3_path = output_path / f"{video_id}.mp3"
        import subprocess
        cmd = [
            os.path.join(settings.FFMPEG_BIN_DIR, "ffmpeg.exe" if os.name == "nt" else "ffmpeg"),
            "-y", "-i", str(out_file), "-q:a", "2", str(mp3_path)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if mp3_path.exists():
            return str(mp3_path)
            
    return str(out_file)



def _find_cookie_file() -> str | None:
    """
    Find cookies.txt, but ONLY return it if it appears to be valid (not rotated).
    YouTube rotates cookies within hours when used from datacenter IPs.
    We skip cookies if they're clearly invalid (too small = no session tokens).
    """
    candidates = [
        Path("/root/cookies.txt"),                            # Modal container
        Path("/tmp/cookies.txt"),                             # Modal fallback
        Path("cookies.txt"),                                  # local dev
        Path(__file__).parent.parent.parent / "cookies.txt",  # repo root
    ]
    for p in candidates:
        try:
            if p.exists():
                size = p.stat().st_size
                if size >= 1000:  # Must have session tokens (SID, SAPISID etc.) = usually 1000-1500+ bytes
                    print(f"[yt-dlp] Using cookie file: {p} ({size} bytes)")
                    return str(p)
                elif size > 0:
                    print(f"[yt-dlp] Cookie file at {p} is too small ({size}B) — likely rotated/invalid, skipping")
        except Exception:
            continue

    print("[yt-dlp] No valid cookies.txt — using iOS/tv_embedded client (cookie-free)")
    return None


def _base_ydl_opts(output_path: Path, attempt: int = 0) -> dict:
    """
    Build yt-dlp options for the given attempt number.
    Uses iOS/tv_embedded player clients that work without cookies.
    Only includes cookies.txt if it appears valid.
    """
    cookie_file = _find_cookie_file()

    # Pick player client for this attempt
    clients = _PLAYER_CLIENTS[min(attempt, len(_PLAYER_CLIENTS) - 1)]

    opts = {
        "outtmpl":              str(output_path / "%(id)s.%(ext)s"),
        "prefer_ffmpeg":        True,
        "ffmpeg_location":      _FFMPEG_BIN,
        "ffprobe_location":     _FFMPEG_BIN,
        "quiet":                False,
        "no_warnings":          False,
        "noplaylist":           True,
        "socket_timeout":       60,
        "skip_unavailable_fragments": True,
        "allow_unplayable_formats":   False,
        # Cookie-free by default
        "cookiesfrombrowser":   None,
        "cookiefile":           cookie_file,
        # Player client — iOS/TV don't need cookies for public videos
        "extractor_args": {
            "youtube": {"player_client": clients}
        },
        # Additional anti-detection options
        "http_headers": {
            "User-Agent": "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
        } if "ios" in clients else {},
    }
    return opts


def download_audio(youtube_url: str, output_dir: str = "downloads", retries: int = 4) -> str:
    """
    Download YouTube audio and convert to MP3.
    Uses iOS/tv_embedded client — no cookies needed for public videos.
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # ── Cache check ──────────────────────────────────────────────────────────
    # If transcription already downloaded (or partially ran) and highlight_generate
    # calls this again for the same video, skip all yt-dlp/Zyla work entirely.
    video_id = _extract_video_id(youtube_url)
    if video_id:
        for cached in [
            output_path / f"{video_id}.mp3",       # yt-dlp path
            output_path / f"{video_id}_zyla.mp3",  # Zyla path
        ]:
            if cached.exists() and cached.stat().st_size > 50_000:  # >50KB = real file
                print(f"[download_audio] ♻️  Cache hit — reusing {cached}")
                return str(cached)
    # ─────────────────────────────────────────────────────────────────────────

    last_error = None

    for attempt in range(retries):
        clients = _PLAYER_CLIENTS[min(attempt, len(_PLAYER_CLIENTS) - 1)]
        fmt = _FORMAT_STRATEGIES[min(attempt, len(_FORMAT_STRATEGIES) - 1)]
        print(f"[download_audio] Attempt {attempt + 1} — client: {clients}, format: {fmt}")

        opts = _base_ydl_opts(output_path, attempt=attempt)
        opts.update({
            "format":   fmt,
            "keepvideo": True,
            "postprocessors": [{
                "key":              "FFmpegExtractAudio",
                "preferredcodec":   "mp3",
                "preferredquality": "128",
            }],
        })

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info    = ydl.extract_info(str(youtube_url), download=True)
                file_id = info.get("id")

            mp3_path = output_path / f"{file_id}.mp3"
            if not mp3_path.exists():
                raise RuntimeError("FFmpeg did not produce an mp3 file.")

            print(f"[download_audio] Success: {mp3_path}")
            return str(mp3_path)

        except Exception as e:
            last_error = e
            err_str = str(e)
            print(f"[download_audio] Attempt {attempt + 1} failed: {err_str[:200]}")
            print(f"[download_audio] Trying next client/format combination...")
            time.sleep(1)
            continue

    print(f"[download_audio] All yt-dlp attempts failed. Falling back to Zyla API. Last error: {last_error}")
    try:
        return download_with_zyla(youtube_url, "audio", output_dir)
    except Exception as zyla_ext:
        raise RuntimeError(f"download_audio failed entirely. yt-dlp error: {last_error}. Zyla error: {zyla_ext}")


def download_video(youtube_url: str, output_dir: str = "downloads",
                   resolution: str = "360p", retries: int = 4) -> str:
    """
    Download YouTube video at a specified resolution.
    Uses iOS/tv_embedded client — no cookies needed for public videos.
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    height_map = {"360p": 360, "480p": 480, "720p": 720, "1080p": 1080}
    height = height_map.get(resolution, 360)

    format_opts = [
        f"bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/best[height<={height}]",
        f"best[height<={height}]/bestvideo[height<={height}]+bestaudio/best",
        "best",
    ]

    last_error = None

    for attempt in range(retries):
        clients = _PLAYER_CLIENTS[min(attempt, len(_PLAYER_CLIENTS) - 1)]
        fmt = format_opts[min(attempt, len(format_opts) - 1)]
        print(f"[Download] Attempt {attempt + 1} — client: {clients}")

        opts = _base_ydl_opts(output_path, attempt=attempt)
        opts.update({
            "format": fmt,
            "merge_output_format": "mp4",
        })

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info    = ydl.extract_info(str(youtube_url), download=True)
                file_id = info.get("id")

            video_path = output_path / f"{file_id}.mp4"
            if not video_path.exists():
                raise RuntimeError(f"Video file not found: {video_path}")

            print(f"[Download] Success (attempt {attempt + 1}): {video_path}")
            return str(video_path)

        except Exception as e:
            last_error = e
            err_str = str(e)
            print(f"[Download] Attempt {attempt + 1} failed: {err_str[:200]}")
            print(f"[Download] Trying next client/format combination...")
            time.sleep(1)
            continue

    print(f"[Download] All yt-dlp attempts failed. Falling back to Zyla API. Last error: {last_error}")
    try:
        return download_with_zyla(youtube_url, "video", output_dir, resolution)
    except Exception as zyla_ext:
        raise RuntimeError(f"download_video failed entirely. yt-dlp error: {last_error}. Zyla error: {zyla_ext}")


def get_latest_audio_file(directory: str = "downloads") -> str:
    """Return the most recently modified mp3/wav in the downloads folder."""
    path = Path(directory)
    if not path.exists():
        return None
    files = list(path.glob("*.mp3")) + list(path.glob("*.wav"))
    if not files:
        return None
    return str(max(files, key=lambda f: f.stat().st_mtime))