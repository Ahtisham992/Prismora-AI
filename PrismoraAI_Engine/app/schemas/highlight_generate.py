# app/schemas/highlight_generate.py

from pydantic import BaseModel, HttpUrl
from typing import List, Optional


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class HighlightGenerateRequest(BaseModel):
    youtube_url: HttpUrl
    segments: List[TranscriptSegment]
    duration: str                       # "1m", "3m", "5m", "10m"
    suggestion: Optional[str] = None
    demo_mode: Optional[bool] = False


class ClipInfo(BaseModel):
    """Single highlight clip with Cloudinary URL and quality metadata."""
    start_time: float
    end_time: float
    duration: float
    url: str                                        # individual Cloudinary URL per clip
    clip_index: int                                 # 1-based clip number
    transcript_preview: Optional[str] = None        # first ~120 chars of clip transcript
    quality_score: Optional[float] = None           # fusion score that selected this clip
    conversation_type: Optional[str] = None         # dominant type: insight/story/humor/etc


class HighlightGenerateResponse(BaseModel):
    """
    Highlight generation result.
    Returns ALL individual clips uploaded to Cloudinary.
    No merging happens here — use /fuse-clips to combine them.
    """
    clips: List[ClipInfo]               # Each clip has its own URL
    clip_count: int
    total_duration: float               # Sum of all clip durations