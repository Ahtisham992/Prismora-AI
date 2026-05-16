# app/schemas/validate_podcast.py

from pydantic import BaseModel, HttpUrl
from typing import Optional


class ValidatePodcastRequest(BaseModel):
    youtube_url: HttpUrl


class ValidatePodcastResponse(BaseModel):
    is_valid: bool
    reason: str
    confidence: float          # 0.0 (definitely music) → 1.0 (definitely podcast)
    duration_seconds: Optional[int] = None
