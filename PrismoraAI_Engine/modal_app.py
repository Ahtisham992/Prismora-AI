# modal_app.py
"""
PrismoraAI Engine — Modal Cloud Deployment  v2
===============================================
Deploys the full highlight generation pipeline on Modal's serverless GPU cloud.

Usage:
  1. pip install modal
  2. modal token set          # authenticate with Modal
  3. modal secret create prismora-secrets \
       GEMINI_API_KEY=<your-key> \
       GROQ_API_KEY=<your-groq-key> \
       CLOUDINARY_CLOUD_NAME=diyrq6fsb \
       CLOUDINARY_UPLOAD_PRESET=unsigned_uploads \
       YOUTUBE_PROXY=http://user:pass@ip:port   # (Optional) Residential proxy for yt-dlp
  4. modal deploy modal_app.py               # deploy to production
     modal serve modal_app.py                # dev mode (hot reload)

Your API will be live at:
  https://<your-modal-username>--prismoraai-engine-fastapi-app.modal.run

GPU: NVIDIA T4 (16 GB VRAM) — cheapest option, more than enough for this pipeline.
Cost: ~$0.000164/s ($0.59/hr) — only charged while processing requests.

v2 changes:
  ✅ Added groq dependency for LLM quality gate
  ✅ Cookie-free YouTube auth (no cookies.txt required)
  ✅ Updated Cloudinary account (diyrq6fsb)
  ✅ Static file mount for local fallback videos
"""

import modal

# ─── Modal App ────────────────────────────────────────────────────────────────
app = modal.App("prismoraai-engine")

# ─── Persistent Volume for Model Cache ────────────────────────────────────────
# Models (Whisper ~3GB, BART ~1.6GB, embeddings ~90MB) are downloaded once
# and cached on these volumes so subsequent cold starts are fast (~5s vs ~60s).
hf_cache = modal.Volume.from_name("prismoraai-hf-cache", create_if_missing=True)
whisper_cache = modal.Volume.from_name("prismoraai-whisper-cache", create_if_missing=True)

# ─── Container Image ─────────────────────────────────────────────────────────
# Build the full environment: Python 3.11 + CUDA + FFmpeg + all deps
prismoraai_image = (
    modal.Image.debian_slim(python_version="3.11")
    # System dependencies
    .apt_install(
        "ffmpeg",            # Video/audio processing (includes ffprobe)
        "libsndfile1",       # Required by soundfile/librosa
        "git",               # Some pip packages need git
        "curl",              # Needed for Deno install
        "unzip",             # Needed for Deno install
    )
    # Install Deno (JavaScript runtime required for YouTube challenge solving)
    .run_commands("curl -fsSL https://deno.land/install.sh | sh")
    .env({"DENO_DIR": "/root/.deno", "PATH": "/root/.deno/bin:$PATH"})
    # PyTorch with CUDA (must be installed first)
    .pip_install(
        "torch==2.5.1",
        "torchaudio==2.5.1",
        extra_index_url="https://download.pytorch.org/whl/cu121",
    )
    # All other dependencies
    .pip_install(
        # Core framework
        "fastapi==0.115.5",
        "uvicorn[standard]==0.32.1",
        "pydantic==2.10.3",
        "pydantic-settings==2.6.1",
        "python-multipart==0.0.20",
        "python-dotenv==1.0.1",
        "aiofiles==24.1.0",
        # Transcription
        "faster-whisper==1.1.0",
        "ctranslate2==4.7.1",
        # ML models
        "transformers==4.46.0",
        "sentencepiece==0.2.1",
        "accelerate==1.2.1",
        "sentence-transformers==3.3.1",
        # Audio
        "librosa==0.10.2",
        "soundfile==0.12.1",
        "numpy==1.26.0",
        "scipy==1.14.1",
        # Video
        "yt-dlp[default]>=2025.01.15",
        "ffmpeg-python==0.2.0",
        "opencv-python>=4.10.0",
        # NLP / Scoring
        "vaderSentiment==3.3.2",
        "google-genai>=1.0.0",
        "scikit-learn==1.6.0",
        # LLM Quality Gate
        "groq>=0.4.0",
        # Cloud
        "requests==2.32.3",
        "httpx>=0.27.0",          # YouTube Data API v3 calls (cookie-free metadata)
        "cloudinary==1.41.0",
    )
    # Set env vars for FFmpeg and cookie-free YouTube
    .env({
        "FFMPEG_BIN_DIR": "/usr/bin",
        "DOWNLOADS_DIR": "/tmp/downloads",
        # Cookie-free: yt-dlp uses player client rotation, no cookies.txt needed
        # (Set USE_YOUTUBE_COOKIES=true in prismora-secrets if you add cookies.txt)
        "USE_YOUTUBE_COOKIES": "false",
        # Enable LLM quality gate
        "HIGHLIGHT_LLM_QUALITY_GATE": "true",
    })
    # Copy the entire app/ directory into the container (MUST be last)
    .add_local_dir("app", remote_path="/root/app", copy=True)
)

# ── Optional: bake cookies.txt into image if present locally ─────────────────
# Export cookies from your browser and save as cookies.txt in the project root.
# Then run: modal deploy modal_app.py
# The cookies will be baked into the container and YouTube will not block downloads.
import os as _os
if _os.path.exists("cookies.txt"):
    prismoraai_image = (
        prismoraai_image
        .add_local_file("cookies.txt", remote_path="/root/cookies.txt", copy=True)
        .env({"USE_YOUTUBE_COOKIES": "true"})
    )
    print("[Modal] cookies.txt found -- baking into Modal image for YouTube auth")
else:
    print("[Modal] No cookies.txt found -- using player client rotation (may fail on some videos)")

# ─── FastAPI ASGI App ────────────────────────────────────────────────────────
@app.function(
    image=prismoraai_image,
    gpu="T4",                             # NVIDIA T4 16GB — cheapest GPU
    timeout=1800,                          # 30 min max per request
    scaledown_window=300,                  # Keep warm 5 min after last request (allows retry on gateway drop)
    volumes={
        "/root/.cache/huggingface": hf_cache,       # Cache HF models (BART, embeddings)
        "/root/models": whisper_cache,              # Cache Whisper models
    },
    secrets=[
        modal.Secret.from_name("prismora-secrets"),  # GEMINI_API_KEY, GROQ_API_KEY, CLOUDINARY_*, YOUTUBE_API_KEY
    ],
)
@modal.concurrent(max_inputs=4)           # Handle 4 requests simultaneously
@modal.asgi_app()
def fastapi_app():
    """Serve the PrismoraAI FastAPI application."""
    import sys
    import os
    import shutil

    # Add project root to Python path so `app.*` imports work
    sys.path.insert(0, "/root")

    # Override config for cloud environment
    os.environ.setdefault("FFMPEG_BIN_DIR", "/usr/bin")
    os.environ.setdefault("DOWNLOADS_DIR", "/tmp/downloads")

    # Ensure directories exist
    os.makedirs("/tmp/downloads", exist_ok=True)
    os.makedirs("/tmp/highlights", exist_ok=True)
    os.makedirs("/root/highlights", exist_ok=True)

    # ── Cookie diagnostic ───────────────────────────────────────────
    # Confirm cookies.txt is present and readable in the container
    cookie_candidates = ["/root/cookies.txt", "/cookies.txt"]
    cookie_found = False
    for cpath in cookie_candidates:
        try:
            size = os.path.getsize(cpath)
            print(f"[Modal] 🍪 cookies.txt found at {cpath} ({size} bytes)")
            # Also copy to /tmp for broad path detection
            shutil.copy2(cpath, "/tmp/cookies.txt")
            cookie_found = True
            break
        except FileNotFoundError:
            continue

    if not cookie_found:
        print("[Modal] ⚠️  cookies.txt NOT FOUND — YouTube may block downloads")
    # ────────────────────────────────────────────────────────────────

    # Import and return the FastAPI app
    from app.main import app as web_app

    return web_app