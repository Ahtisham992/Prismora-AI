# app/services/podcast_validator.py
"""
Podcast Content Validation Service
===================================
Determines whether a YouTube URL points to speech-based content
(podcast, interview, lecture, documentary, etc.) before allowing
it through the expensive AI pipeline.

Signal priority (cheapest → costliest):
  1. YouTube category ID  — instant reject for Music category
  2. Metadata heuristics  — keyword scoring on title / tags / description
  3. Duration gate        — reject < 60 s (too short), soft flag > 6 h
  4. 30-second audio VAD  — Whisper voice-activity ratio (ambiguous cases only)

Fail-open policy: any transient network/IO error returns is_valid=True
so a real podcast is never silently blocked by an infrastructure fault.
"""

import os
import re
import httpx
import asyncio
import tempfile
from typing import Optional, Tuple


# ─────────────────────────────────────────────────────────────────────────────
# KEYWORD LISTS
# ─────────────────────────────────────────────────────────────────────────────

_REJECT_KEYWORDS = [
    "official music video", "official audio", "official video",
    "music video", "lyric video", "lyrics", "audio only",
    "ft.", "feat.", "instrumental", "remix", "cover",
    "vevo", "official mv", "mv", "official song",
    "official clip", "visualizer", "music audio",
    "official lyric video", "topic",              # YouTube auto-generated music
]

_PODCAST_KEYWORDS = [
    "podcast", "episode", "ep.", "ep #", "interview", "discussion", "talk",
    "conversation", "webinar", "lecture", "ted", "q&a", "fireside",
    "panel", "commentary", "explainer", "documentary", "lesson",
    "tutorial", "how to", "masterclass", "course", "breakdown",
    "analysis", "recap", "review", "debate", "summit", "keynote",
]

# YouTube category IDs (YouTube Data API v3 returns numeric strings)
# AND category names (yt-dlp returns human-readable strings like "Music")
_REJECT_CATEGORY_IDS = {
    "10",       # YouTube Data API v3 numeric ID for Music
    "Music",    # yt-dlp returns category name, not numeric ID
    "music",    # lower-case guard
}

# Duration thresholds (seconds)
_MIN_DURATION = 60       # < 60 s → too short, likely a music clip / short
_MAX_DURATION = 21600    # 6 hours → probably a raw live-stream (soft flag only)


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _extract_video_id(url: str) -> Optional[str]:
    """Extract 11-char YouTube video ID from any URL format."""
    m = re.search(r"(?:v=|youtu\.be/|embed/|shorts/)([A-Za-z0-9_-]{11})", url)
    return m.group(1) if m else None


def _normalise(text: Optional[str]) -> str:
    """Lower-case and collapse whitespace for reliable matching."""
    if not text:
        return ""
    return " ".join(text.lower().split())


def _keyword_hit(text: str, keywords: list) -> int:
    """Count how many keywords appear in text."""
    return sum(1 for kw in keywords if kw in text)


# ─────────────────────────────────────────────────────────────────────────────
# SIGNAL 1 + 2 + 3: Metadata heuristic
# Returns (score 0.0–1.0, reject_reason_or_None)
# ─────────────────────────────────────────────────────────────────────────────

def _score_from_metadata(
    title: Optional[str],
    description: Optional[str],
    tags: Optional[list],
    category_id: Optional[str],
    duration_seconds: Optional[int],
) -> Tuple[float, Optional[str]]:
    """
    Compute a 'podcast likelihood' score purely from metadata.
    Returns (score, hard_reject_reason).
    hard_reject_reason is set only when we are certain (category ID / duration).
    """

    # ── Signal 1: Category ──────────────────────────────────────────────────
    if category_id in _REJECT_CATEGORY_IDS:
        return 0.0, (
            "This video is categorised as Music on YouTube. "
            "Prismora only supports podcasts, interviews, lectures, and other "
            "talk-based content."
        )

    # ── Signal 3: Duration ──────────────────────────────────────────────────
    if duration_seconds is not None and duration_seconds < _MIN_DURATION:
        return 0.0, (
            f"This video is only {duration_seconds} second(s) long. "
            "Prismora requires videos of at least 1 minute with spoken content."
        )

    # ── Signal 2: Keyword scoring ───────────────────────────────────────────
    norm_title = _normalise(title)
    norm_desc  = _normalise(description)
    norm_tags  = " ".join(_normalise(t) for t in (tags or []))

    reject_hits  = _keyword_hit(norm_title, _REJECT_KEYWORDS)   # title has more weight
    reject_hits += _keyword_hit(norm_tags,  _REJECT_KEYWORDS) * 0.5

    podcast_hits  = _keyword_hit(norm_title, _PODCAST_KEYWORDS)
    podcast_hits += _keyword_hit(norm_tags,  _PODCAST_KEYWORDS) * 0.5
    podcast_hits += _keyword_hit(norm_desc,  _PODCAST_KEYWORDS) * 0.3

    # Start at neutral 0.5; push towards 0 (music) or 1 (podcast)
    score = 0.50
    score -= reject_hits  * 0.25
    score += podcast_hits * 0.20

    # Soft penalty for very long live-stream-style videos
    if duration_seconds and duration_seconds > _MAX_DURATION:
        score -= 0.10

    # Clamp
    score = max(0.0, min(1.0, score))

    return score, None


# ─────────────────────────────────────────────────────────────────────────────
# SIGNAL 4: 30-second audio VAD via faster-whisper
# ─────────────────────────────────────────────────────────────────────────────

def _speech_ratio_from_sample(youtube_url: str, sample_secs: int = 30) -> Optional[float]:
    """
    Downloads a short audio sample, runs Whisper VAD, returns voiced_ratio.
    Returns None on any failure so caller can fall-back gracefully.
    """
    try:
        import yt_dlp
        from app.utils.file_utils import _find_cookie_file
        from app.services.transcribe_service import transcriber  # reuse singleton

        cookie_file = _find_cookie_file()

        with tempfile.TemporaryDirectory() as tmpdir:
            out_template = os.path.join(tmpdir, "sample.%(ext)s")

            ydl_opts = {
                "quiet":          True,
                "no_warnings":    True,
                "format":         "bestaudio[ext=m4a]/bestaudio/best",
                "outtmpl":        out_template,
                "cookiefile":     cookie_file,
                "socket_timeout": 20,
                # Download only the first `sample_secs` seconds
                "postprocessors": [{
                    "key":            "FFmpegExtractAudio",
                    "preferredcodec": "wav",
                }],
                "external_downloader":         "ffmpeg",
                "external_downloader_args":    {"ffmpeg_i": ["-t", str(sample_secs)]},
                "extractor_args": {"youtube": {"player_client": ["ios"]}},
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([youtube_url])

            # Find the downloaded WAV
            wav_files = [
                os.path.join(tmpdir, f)
                for f in os.listdir(tmpdir)
                if f.endswith(".wav")
            ]
            if not wav_files:
                print("[PodcastValidator] Audio sample download produced no WAV file.")
                return None

            audio_path = wav_files[0]

            # Transcribe with VAD — reuse the already-loaded Whisper singleton
            result = transcriber.transcribe_audio_file(audio_path)

            segments = result.get("segments", [])
            if not segments:
                # No speech detected at all
                return 0.0

            # voiced_seconds = sum of (end - start) for each segment
            voiced_secs = sum(
                max(0.0, float(s["end"]) - float(s["start"]))
                for s in segments
                if float(s.get("no_speech_prob", 1.0)) < 0.6   # filter non-speech segs
            )
            total_secs = float(result.get("duration", sample_secs)) or sample_secs
            ratio = min(voiced_secs / total_secs, 1.0)
            print(f"[PodcastValidator] Speech ratio: {voiced_secs:.1f}s voiced / {total_secs:.1f}s total = {ratio:.2f}")
            return ratio

    except Exception as e:
        err_str = str(e).lower()
        # "Requested format is not available" / "Only images are available" means
        # yt-dlp found no downloadable audio stream — a strong signal this is a
        # music video served without a separate audio track.  Treat as 0% speech.
        if "format is not available" in err_str or "only images" in err_str:
            print("[PodcastValidator] No downloadable audio stream — treating as 0% speech.")
            return 0.0
        print(f"[PodcastValidator] Audio VAD sample failed: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# METADATA FETCH  (reuses YouTube API or yt-dlp — same strategy as extract_info)
# ─────────────────────────────────────────────────────────────────────────────

async def _fetch_metadata(youtube_url: str, video_id: str) -> dict:
    """
    Fetch title, description, tags, categoryId, duration via YouTube Data API v3.
    Falls back to yt-dlp snippet if no API key.
    Returns a plain dict (all keys optional).
    """
    api_key = os.environ.get("YOUTUBE_API_KEY", "").strip()

    if api_key:
        try:
            params = {
                "part":  "snippet,contentDetails",
                "id":    video_id,
                "key":   api_key,
            }
            async with httpx.AsyncClient(timeout=12) as client:
                resp = await client.get(
                    "https://www.googleapis.com/youtube/v3/videos",
                    params=params,
                )
                resp.raise_for_status()
                data = resp.json()

            items = data.get("items", [])
            if items:
                snippet = items[0].get("snippet", {})
                details = items[0].get("contentDetails", {})

                # Parse ISO 8601 duration → seconds
                duration_secs = _parse_iso_duration(details.get("duration", ""))

                return {
                    "title":       snippet.get("title"),
                    "description": snippet.get("description"),
                    "tags":        snippet.get("tags") or [],
                    "category_id": snippet.get("categoryId"),
                    "duration":    duration_secs,
                }
        except Exception as e:
            print(f"[PodcastValidator] YouTube API metadata fetch failed: {e}")

    # ── yt-dlp fallback ──────────────────────────────────────────────────────
    try:
        import yt_dlp
        from app.utils.file_utils import _find_cookie_file

        cookie_file = _find_cookie_file()
        ydl_opts = {
            "quiet":                    True,
            "skip_download":            True,
            "ignore_no_formats_error":  True,
            "cookiefile":               cookie_file,
            "socket_timeout":           20,
            "extractor_args": {"youtube": {"player_client": ["ios"]}},
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)

        return {
            "title":       info.get("title"),
            "description": info.get("description"),
            "tags":        info.get("tags") or [],
            "category_id": str(info.get("categories", [None])[0] or ""),
            "duration":    int(info.get("duration") or 0) or None,
        }
    except Exception as e:
        print(f"[PodcastValidator] yt-dlp metadata fetch failed: {e}")
        return {}


def _parse_iso_duration(iso: str) -> Optional[int]:
    """Convert ISO 8601 duration (PT1H2M3S) to total seconds."""
    if not iso:
        return None
    m = re.match(
        r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso
    )
    if not m:
        return None
    hours   = int(m.group(1) or 0)
    minutes = int(m.group(2) or 0)
    seconds = int(m.group(3) or 0)
    total   = hours * 3600 + minutes * 60 + seconds
    return total if total > 0 else None


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

async def validate_podcast(youtube_url: str) -> dict:
    """
    Main entry point.  Returns a dict compatible with ValidatePodcastResponse:
      {
        "is_valid":         bool,
        "reason":           str,
        "confidence":       float,   # 0.0–1.0
        "duration_seconds": int | None,
      }

    Fail-open: any unrecoverable error returns is_valid=True, confidence=0.5
    so the user is never silently blocked by an infrastructure fault.
    """
    try:
        video_id = _extract_video_id(youtube_url)
        if not video_id:
            return {
                "is_valid":         False,
                "reason":           "The URL does not appear to be a valid YouTube link.",
                "confidence":       1.0,
                "duration_seconds": None,
            }

        # ── Step 1: Fetch metadata ───────────────────────────────────────────
        print(f"[PodcastValidator] Fetching metadata for {video_id}…")
        meta = await _fetch_metadata(youtube_url, video_id)

        title       = meta.get("title")
        description = meta.get("description")
        tags        = meta.get("tags") or []
        category_id = meta.get("category_id")
        duration    = meta.get("duration")   # int seconds or None

        print(
            f"[PodcastValidator] title={title!r}  category={category_id}  "
            f"duration={duration}s  tags={tags[:5]}"
        )

        # ── Step 2: Heuristic score ──────────────────────────────────────────
        score, hard_reject = _score_from_metadata(
            title, description, tags, category_id, duration
        )
        print(f"[PodcastValidator] Heuristic score={score:.2f}  hard_reject={hard_reject is not None}")

        # Hard reject (category / duration gate)
        if hard_reject:
            return {
                "is_valid":         False,
                "reason":           hard_reject,
                "confidence":       1.0 - score,
                "duration_seconds": duration,
            }

        # Clear accept — confident enough, skip audio check
        if score >= 0.60:
            return {
                "is_valid":         True,
                "reason":           "Video appears to contain talk-based content.",
                "confidence":       score,
                "duration_seconds": duration,
            }

        # Clear reject from keywords — no need for audio check
        # Threshold raised to 0.28 so scores like 0.18 ("Lyrics" in title)
        # are caught here instead of falling through to the slow audio VAD path.
        if score <= 0.28:
            title_display = title or "This video"
            return {
                "is_valid":         False,
                "reason":           (
                    f'"{title_display}" appears to be a music track or music video. '
                    "Prismora only supports podcasts, interviews, lectures, and "
                    "other talk-based content."
                ),
                "confidence":       1.0 - score,
                "duration_seconds": duration,
            }

        # ── Step 3: Ambiguous → run 30-second audio VAD ──────────────────────
        print("[PodcastValidator] Score is ambiguous — running 30-second audio VAD sample…")
        speech_ratio = await asyncio.get_event_loop().run_in_executor(
            None, _speech_ratio_from_sample, youtube_url, 30
        )

        if speech_ratio is None:
            # VAD failed — fall-open, trust the heuristic score
            print("[PodcastValidator] VAD failed, falling open with heuristic score.")
            return {
                "is_valid":         True,
                "reason":           "Could not analyse audio sample; proceeding based on metadata.",
                "confidence":       score,
                "duration_seconds": duration,
            }

        print(f"[PodcastValidator] VAD speech_ratio={speech_ratio:.2f}")

        SPEECH_THRESHOLD = 0.35   # at least 35 % of sampled audio must be speech

        if speech_ratio < SPEECH_THRESHOLD:
            return {
                "is_valid":         False,
                "reason":           (
                    f"Only {speech_ratio * 100:.0f}% of the audio sample contained "
                    "detectable speech. Prismora needs content where someone is "
                    "actively speaking (podcast, interview, lecture, etc.)."
                ),
                "confidence":       1.0 - speech_ratio,
                "duration_seconds": duration,
            }

        # Passed all checks
        final_confidence = (score + speech_ratio) / 2
        return {
            "is_valid":         True,
            "reason":           "Video contains sufficient spoken content.",
            "confidence":       round(final_confidence, 2),
            "duration_seconds": duration,
        }

    except Exception as e:
        # Fail-open — never block the user due to an infra error
        print(f"[PodcastValidator] Unexpected error, failing open: {e}")
        return {
            "is_valid":         True,
            "reason":           "Validation could not be completed; proceeding.",
            "confidence":       0.5,
            "duration_seconds": None,
        }
