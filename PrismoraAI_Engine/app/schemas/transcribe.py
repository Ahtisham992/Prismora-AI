# app/schemas/transcribe.py
from pydantic import BaseModel, HttpUrl
from typing import List, Optional


class Segment(BaseModel):
    start: float   # seconds (float)
    end: float     # seconds (float)
    text: str


class TranscribeRequest(BaseModel):
    youtube_url: HttpUrl
    # default True -> timestamps (line by line) is the default behaviour
    include_timestamps: Optional[bool] = True


class TranscribeResponse(BaseModel):
    text: str
    duration_seconds: float
    # segments will be present when include_timestamps=True; otherwise null/omitted
    segments: Optional[List[Segment]] = None
