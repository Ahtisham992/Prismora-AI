# app/api/v1/endpoints/summarize.py

import asyncio
from fastapi import APIRouter, HTTPException
from app.schemas.summarize import SummarizeRequest, SummarizeResponse
from app.services.summarization_service import summarizer

router = APIRouter()


@router.post("/", response_model=SummarizeResponse)
async def summarize_transcript(req: SummarizeRequest):
    """
    Summarizes a podcast transcript.

    IMPORTANT: Pass only req.text — segments are for highlight generation
    and contain zero extra signal for summarization. The service internally
    handles chunking and map-reduce for transcripts of any length.

    Pipeline:
      1. BART (local GPU) → ~600-word intermediate summary from full transcript
      2. Gemini Flash → refines intermediate into structured keyPoints/topics
      3. Fallback (Gemini quota exhausted) → local structuring of intermediate
    """
    try:
        if not req.text or len(req.text.strip()) < 10:
            raise HTTPException(status_code=400, detail="Text too short to summarize")

        # Single call — text only, not segments
        result = await asyncio.to_thread(
            summarizer.summarize,
            req.text,                    # ← text only
            req.duration_seconds,        # ← optional, for display
        )

        return SummarizeResponse(
            keyPoints = result["keyPoints"],
            fullText  = result["fullText"],
            topics    = result["topics"],
            duration  = result["duration"],
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Summarization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Summarization error: {str(e)}")