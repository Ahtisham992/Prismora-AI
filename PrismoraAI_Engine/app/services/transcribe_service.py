# app/services/transcribe_service.py
"""
PHASE 1 UPGRADE: Faster Whisper with CTranslate2 backend
- 4-5x faster than original Whisper
- Better accuracy with Large V3 Turbo
- GPU optimized with INT8 quantization
"""

from pathlib import Path
from typing import Dict, List
import torch
from faster_whisper import WhisperModel
from app.utils.file_utils import download_audio


class TranscribeService:
    def __init__(self):
        """
        Initialize Faster Whisper model
        Recommended for RTX 4050: large-v3-turbo with int8 quantization
        """
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Model selection based on hardware
        # large-v3-turbo: Best balance of speed/accuracy for RTX 4050
        # Options: tiny, base, small, medium, large-v2, large-v3, large-v3-turbo
        model_size = "large-v3-turbo"
        
        # Compute type: int8_float16 for RTX 4050 (good speed + accuracy)
        # Options: float16, int8, int8_float16, int8_float32
        compute_type = "int8_float16" if self.device == "cuda" else "int8"
        
        print(f"[Transcribe] Loading {model_size} on {self.device} with {compute_type}")
        
        self.model = WhisperModel(
            model_size,
            device=self.device,
            compute_type=compute_type,
            num_workers=4,  # Parallel processing
            download_root="models"  # Cache models locally
        )
        
        print(f"[Transcribe] Model loaded successfully")
    
    def _segments_from_whisper_result(self, segments_generator) -> List[Dict]:
        """
        Convert faster-whisper segments into standard format
        """
        segments = []
        for seg in segments_generator:
            segments.append({
                "start": float(seg.start),
                "end": float(seg.end),
                "text": seg.text.strip(),
                "confidence": float(seg.avg_logprob),  # Additional: confidence score
                "no_speech_prob": float(seg.no_speech_prob)  # Detect silence
            })
        return segments
    
    def transcribe_youtube_audio(self, youtube_url: str) -> Dict:
        """
        Downloads YouTube audio and transcribes it using Faster Whisper.
        """
        try:
            file_path = download_audio(youtube_url, output_dir="downloads")
            if not file_path:
                raise RuntimeError("download_audio returned empty path")
            return self.transcribe_audio_file(file_path)
        except Exception as e:
            raise RuntimeError(f"Transcription failed: {str(e)}")

    def transcribe_audio_file(self, file_path: str) -> Dict:
        """
        Transcribes a local audio file using Faster Whisper.
        """
        try:
            print(f"[Transcribe] Transcribing: {file_path}")
            
            # Transcribe with optimized settings
            segments_generator, info = self.model.transcribe(
                file_path,
                language="en",  # Force English for podcasts
                beam_size=5,  # Balance between speed and accuracy
                best_of=5,  # Number of candidates
                temperature=0.0,  # Deterministic output
                vad_filter=True,  # Voice Activity Detection - removes silence
                vad_parameters=dict(
                    min_silence_duration_ms=500,  # Minimum silence duration to trigger boundary
                    min_speech_duration_ms=250,  # Minimum speech to be considered a segment
                    speech_pad_ms=30  # Padding around speech boundaries
                ),
                word_timestamps=True,  # Enable word-level timestamps
                condition_on_previous_text=True,  # Better context handling
            )
            
            # Convert segments
            segments = self._segments_from_whisper_result(segments_generator)
            
            # Join all text
            full_text = " ".join([s["text"] for s in segments])
            
            # Calculate duration
            if segments:
                duration = float(segments[-1]["end"])
            else:
                duration = 0.0
            
            return {
                "text": full_text.strip(),
                "duration": duration,
                "segments": segments,
                "language": info.language,
                "language_probability": info.language_probability,
                "transcription_options": {
                    "beam_size": 5,
                    "vad_enabled": True,
                    "word_timestamps": True
                }
            }
        
        except Exception as e:
            raise RuntimeError(f"Transcription failed: {str(e)}")


# Singleton instance
transcriber = TranscribeService()