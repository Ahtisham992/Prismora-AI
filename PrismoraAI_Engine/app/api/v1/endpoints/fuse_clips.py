# app/api/v1/endpoints/fuse_clips.py
"""
FUSE CLIPS ENDPOINT
Step 2 of the 2-step highlight workflow.

Takes the clips list from /highlight-generate response,
downloads them, merges into a single video, uploads to Cloudinary,
and returns the final merged video URL.
"""

import asyncio
from fastapi import APIRouter, HTTPException

from app.schemas.fuse_clips import FuseClipsRequest, FuseClipsResponse, FusedVideoInfo
from app.services.fusion_service import fusion_service

router = APIRouter()


@router.post("/", response_model=FuseClipsResponse)
async def fuse_clips(req: FuseClipsRequest):
    """
    Step 2 of 2-step highlight workflow.

    Input:  List of Cloudinary clip URLs (from /highlight-generate response)
    Output: Single merged video uploaded to Cloudinary

    Example request body:
    {
        "clip_urls": [
            "https://res.cloudinary.com/.../clip_1.mp4",
            "https://res.cloudinary.com/.../clip_2.mp4",
            "https://res.cloudinary.com/.../clip_3.mp4"
        ],
        "transition": "fade"
    }
    """
    if not req.clip_urls:
        raise HTTPException(status_code=400, detail="clip_urls cannot be empty")

    if len(req.clip_urls) > 20:
        raise HTTPException(
            status_code=400,
            detail="Too many clips (max 20). Split into batches if needed."
        )

    valid_transitions = ("fade", "cut")
    if req.transition not in valid_transitions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition '{req.transition}'. "
                   f"Allowed: {valid_transitions}"
        )

    try:
        result = await asyncio.to_thread(
            fusion_service.fuse,
            req.clip_urls,
            req.transition,
        )

        return FuseClipsResponse(
            video=FusedVideoInfo(
                url            = result["url"],
                total_duration = result["total_duration"],
                clip_count     = result["clip_count"],
            )
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))