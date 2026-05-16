# app/schemas/fuse_clips.py

from pydantic import BaseModel
from typing import List, Optional


class FuseClipsRequest(BaseModel):
    """
    Input to the fusion endpoint.
    Pass the clips list directly from the highlight-generate response.
    """
    clip_urls: List[str]                # Cloudinary URLs of individual clips (in order)
    transition: Optional[str] = "fade" # "fade" | "cut"  (fade = 0.3s audio fade between clips)


class FusedVideoInfo(BaseModel):
    url: str                            # Cloudinary URL of the final merged video
    total_duration: float               # Duration of merged video in seconds
    clip_count: int                     # How many clips were merged


class FuseClipsResponse(BaseModel):
    """
    Fusion result — single merged video uploaded to Cloudinary.
    """
    video: FusedVideoInfo