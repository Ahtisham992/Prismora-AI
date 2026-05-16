# app/api/v1/endpoints/extract_info.py
"""
Extract YouTube video metadata.

Strategy (in order):
  1. YouTube Data API v3 — if YOUTUBE_API_KEY is set (no yt-dlp, no cookies, free 10k/day)
  2. yt-dlp with iOS/tv_embedded clients — cookie-free, works for public videos
"""

import os
import re
import httpx
from fastapi import APIRouter, HTTPException
from app.schemas.extract_info import ExtractInfoRequest, ExtractInfoResponse

router = APIRouter()

# Player clients for yt-dlp fallback (cookie-free)
_PLAYER_CLIENTS = [["ios"], ["tv_embedded"], ["android"], ["mweb"]]


def _extract_video_id(url: str) -> str | None:
    """Extract YouTube video ID from any YouTube URL format."""
    patterns = [
        r"(?:v=|youtu\.be/|embed/|shorts/)([A-Za-z0-9_-]{11})",
    ]
    for pat in patterns:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return None


async def _extract_via_youtube_api(video_id: str, api_key: str) -> ExtractInfoResponse:
    """
    Use YouTube Data API v3 to get video metadata.
    Free, reliable, no cookies, 10,000 requests/day quota.
    """
    url = "https://www.googleapis.com/youtube/v3/videos"
    params = {
        "part": "snippet",
        "id": video_id,
        "key": api_key,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    items = data.get("items", [])
    if not items:
        raise ValueError(f"Video {video_id} not found via YouTube API")

    snippet = items[0]["snippet"]
    thumbs = snippet.get("thumbnails", {})
    # Best quality thumbnail available
    thumb_url = (
        thumbs.get("maxres", {}).get("url")
        or thumbs.get("high", {}).get("url")
        or thumbs.get("default", {}).get("url")
    )

    return ExtractInfoResponse(
        thumbnailSrc=thumb_url,
        title=snippet.get("title"),
        description=snippet.get("description"),
        tags=snippet.get("tags") or [],
    )


def _extract_via_ytdlp(url: str) -> ExtractInfoResponse:
    """
    Fallback: use yt-dlp with iOS/tv_embedded clients (cookie-free).
    """
    import yt_dlp
    from app.utils.file_utils import _find_cookie_file

    cookie_file = _find_cookie_file()
    last_err = None

    for clients in _PLAYER_CLIENTS:
        try:
            ydl_opts = {
                "quiet":                True,
                "skip_download":        True,
                "ignore_no_formats_error": True,  # Fixes iOS client failing when streams require PO Token
                "cookiesfrombrowser":   None,
                "cookiefile":           cookie_file,
                "socket_timeout":       30,
                "extractor_args": {
                    "youtube": {"player_client": clients}
                },
                "http_headers": {
                    "User-Agent": "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
                } if "ios" in clients else {},
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

            print(f"[ExtractInfo] Success with client {clients}")
            return ExtractInfoResponse(
                thumbnailSrc=info.get("thumbnail"),
                title=info.get("title"),
                description=info.get("description"),
                tags=info.get("tags") or [],
            )

        except Exception as e:
            err_str = str(e)
            last_err = e
            print(f"[ExtractInfo] Client {clients} failed, trying next... Error: {err_str[:150]}")
            continue

    raise HTTPException(
        status_code=500,
        detail=(
            f"All yt-dlp player clients blocked by YouTube bot detection. "
            f"Set YOUTUBE_API_KEY in Modal secrets for reliable metadata extraction. "
            f"Last error: {last_err}"
        ),
    )


async def _extract_via_zyla(url: str) -> ExtractInfoResponse:
    """
    Fallback 2: Use Zylalabs YouTube Download and Info API for metadata.
    """
    from app.core.config import settings
    if not settings.ZYLA_API_KEY:
        raise ValueError("ZYLA_API_KEY is not configured")
        
    video_id = _extract_video_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube URL")
        
    api_url = "https://zylalabs.com/api/11016/youtube+download+and+info+api/20761/download"
    headers = {
        "Authorization": f"Bearer {settings.ZYLA_API_KEY}"
    }
    # We just request an mp3 generation to get the fastest metadata payload available
    params = {"url": url, "format": "mp3"}
    
    print(f"[ExtractInfo] Fetching metadata via Zyla API for {video_id}...")
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(api_url, headers=headers, params=params)
        resp.raise_for_status()
        data = resp.json()
        
    if "progress_url" not in data:
         raise ValueError(f"Zyla API did not return a progress_url. Payload: {data}")
         
    progress_url = data["progress_url"]
    
    print(f"[ExtractInfo] Polling Zyla progress_url...")
    async with httpx.AsyncClient(timeout=20) as client:
         for _ in range(30):
             try:
                 p_resp = await client.get(progress_url)
                 p_data = p_resp.json()
                 
                 # Check if the job finished and returned metadata
                 if "download_url" in p_data or p_data.get("success") == 1:
                      # Usually zyla appends title, image, duration on completion
                      return ExtractInfoResponse(
                          thumbnailSrc=p_data.get("image", data.get("image", "")),
                          title=p_data.get("title", f"Video {video_id}"),
                          description=None,
                          tags=[] 
                      )
             except Exception as e:
                 print(f"[ExtractInfo] Poll error: {e}")
             import asyncio
             await asyncio.sleep(3)
             
    raise ValueError("Zyla API polling timed out.")

@router.post("/", response_model=ExtractInfoResponse)
async def extract_info(req: ExtractInfoRequest):
    """
    Extract YouTube metadata without downloading the video.
    Uses YouTube Data API v3 (if key available) or yt-dlp iOS client (fallback).
    """
    url = str(req.youtube_url)
    api_key = os.environ.get("YOUTUBE_API_KEY", "").strip()

    # Strategy 1: YouTube Data API v3 (preferred — no cookies, no rate limits, always works)
    if api_key:
        video_id = _extract_video_id(url)
        if video_id:
            try:
                result = await _extract_via_youtube_api(video_id, api_key)
                print(f"[ExtractInfo] Success via YouTube Data API v3")
                return result
            except Exception as e:
                print(f"[ExtractInfo] YouTube API failed ({e}), falling back to yt-dlp")

    # Strategy 2: yt-dlp with iOS/tv_embedded client (cookie-free)
    try:
        return _extract_via_ytdlp(url)
    except Exception as e:
        print(f"[ExtractInfo] yt-dlp failed ({e}), falling back to Zyla API")
        
    # Strategy 3: Zyla API
    try:
        return await _extract_via_zyla(url)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                f"All extraction methods failed (YouTube API, yt-dlp, Zyla API). "
                f"Set YOUTUBE_API_KEY in Modal secrets for reliable metadata extraction. "
                f"Zyla API Last error: {str(e)}"
            ),
        )