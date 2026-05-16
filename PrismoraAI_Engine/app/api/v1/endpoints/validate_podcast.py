# app/api/v1/endpoints/validate_podcast.py
"""
POST /api/v1/validate-podcast
Validates whether a YouTube URL points to podcast/talk-based content
before the expensive AI pipeline is invoked.
"""

from fastapi import APIRouter, HTTPException
from app.schemas.validate_podcast import ValidatePodcastRequest, ValidatePodcastResponse
from app.services.podcast_validator import validate_podcast as _validate

router = APIRouter()


@router.post("/", response_model=ValidatePodcastResponse)
async def validate_podcast_endpoint(req: ValidatePodcastRequest):
    """
    Validates a YouTube URL for podcast/talk-based suitability.

    Returns:
      - is_valid=True  → content is suitable, proceed with the pipeline
      - is_valid=False → content is music/irrelevant; client should alert the user

    HTTP 200 is always returned (even for rejected content) so the client
    can read the reason field and display it gracefully.
    """
    url = str(req.youtube_url)
    print(f"[validate-podcast] Validating: {url}")

    result = await _validate(url)

    return ValidatePodcastResponse(
        is_valid=result["is_valid"],
        reason=result["reason"],
        confidence=result["confidence"],
        duration_seconds=result.get("duration_seconds"),
    )
