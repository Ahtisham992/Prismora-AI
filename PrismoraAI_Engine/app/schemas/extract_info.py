from pydantic import BaseModel, HttpUrl
from typing import List, Optional

class ExtractInfoRequest(BaseModel):
    youtube_url: HttpUrl

class ExtractInfoResponse(BaseModel):
    thumbnailSrc: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None