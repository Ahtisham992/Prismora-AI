# app/api/v1/router.py

from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    summarize,
    transcribe,
    highlight_generate,
    extract_info,
    fuse_clips,
    validate_podcast,    # ← Content validation filter
)

router = APIRouter()

router.include_router(health.router,            prefix="/health",            tags=["Health"])
router.include_router(transcribe.router,        prefix="/transcribe",        tags=["Transcription"])
router.include_router(summarize.router,         prefix="/summarize",         tags=["Summarization"])
router.include_router(highlight_generate.router,prefix="/highlight-generate",tags=["Highlight Generation"])
router.include_router(fuse_clips.router,        prefix="/fuse-clips",        tags=["Fusion"])  # ← NEW
router.include_router(extract_info.router,      prefix="/extract-info",      tags=["Extract MetaData"])
router.include_router(validate_podcast.router,  prefix="/validate-podcast",  tags=["Content Validation"])  # ← Content validation filter