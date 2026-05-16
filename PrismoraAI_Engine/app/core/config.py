from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "PrismoraAI"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    MODEL_NAME: str = "base"

    # ── FFmpeg ────────────────────────────────────────────────────────────
    FFMPEG_BIN_DIR: str = (
        r"C:\Users\shami\AppData\Local\Microsoft\WinGet\Packages"
        r"\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe"
        r"\ffmpeg-8.0.1-essentials_build\bin"
    )

    # ── Cloudinary ────────────────────────────────────────────────────────
    CLOUDINARY_CLOUD_NAME: str = "diyrq6fsb"
    CLOUDINARY_UPLOAD_PRESET: str = "unsigned_uploads"

    # ── Auth (optional – leave empty to disable) ──────────────────────────
    API_KEY: Optional[str] = None

    # ── Paths ─────────────────────────────────────────────────────────────
    DOWNLOADS_DIR: str = "downloads"

    # ── Gemini API ────────────────────────────────────────────────────────
    GEMINI_API_KEY: Optional[str] = None 
    # ── Groq API ────────────────────────────────────────────────────────
    GROQ_API_KEY: Optional[str] = None

    # ── Zyla YouTube Download and Info API ────────────────────────────────
    ZYLA_API_KEY: Optional[str] = None

    # ── Highlight Generation v5 ──────────────────────────────────────
    HIGHLIGHT_MIN_CLIP_SECS: int = 20
    HIGHLIGHT_MAX_SINGLE_CLIP_RATIO: float = 0.60
    HIGHLIGHT_QUALITY_THRESHOLD_SIGMA: float = 0.3
    HIGHLIGHT_LLM_QUALITY_GATE: bool = True


    class Config:
        env_file = ".env"


settings = Settings()
