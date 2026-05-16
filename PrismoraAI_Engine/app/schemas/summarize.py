# app/schemas/summarize.py

from pydantic import BaseModel
from typing import List, Optional

class Segment(BaseModel):
    start: float
    end: float
    text: str

class SummarizeRequest(BaseModel):
    text: str
    segments: Optional[List[Segment]] = None
    duration_seconds: Optional[float] = None

class SummarizeResponse(BaseModel):
    keyPoints: Optional[str] = None
    fullText: Optional[str] = None
    topics: Optional[str] = None
    duration: Optional[str] = None