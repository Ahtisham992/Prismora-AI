# app/api/v1/endpoints/transcribe.py
import asyncio
from fastapi import APIRouter, HTTPException
from app.schemas.transcribe import TranscribeRequest, TranscribeResponse
from app.services.transcribe_service import transcriber

router = APIRouter()

@router.post("/", response_model=TranscribeResponse)
async def transcribe_endpoint(req: TranscribeRequest):
    """Transcribes YouTube audio using faster-whisper"""
    try:
        result = await asyncio.to_thread(
            transcriber.transcribe_youtube_audio, 
            str(req.youtube_url)
        )
        
        text = result.get("text", "")
        duration = float(result.get("duration", 0.0))
        
        if req.include_timestamps:
            return TranscribeResponse(
                text=text, 
                duration_seconds=duration, 
                segments=result.get("segments", [])
            )
        else:
            return TranscribeResponse(
                text=text, 
                duration_seconds=duration, 
                segments=None
            )
    
    except Exception as exc:
        raise HTTPException(
            status_code=500, 
            detail=f"Transcription failed: {str(exc)}"
        )