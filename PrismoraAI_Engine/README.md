<p align="center">
  <h1 align="center">🎙️ PrismoraAI Engine</h1>
  <p align="center">
    <strong>GPU-Accelerated Podcast Intelligence & Highlight Generation Engine</strong>
  </p>
  <p align="center">
    <em>Automatically extract the best moments from any podcast — transcribe, analyze, score, and produce broadcast-ready highlight reels in minutes.</em>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.11-blue?style=flat-square" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/PyTorch-CUDA_12.1-EE4C2C?style=flat-square&logo=pytorch" alt="PyTorch">
  <img src="https://img.shields.io/badge/Whisper-large--v3--turbo-orange?style=flat-square" alt="Whisper">
  <img src="https://img.shields.io/badge/GPU-NVENC_Encoding-76B900?style=flat-square&logo=nvidia" alt="NVENC">
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Pipeline](#pipeline)
- [Tech Stack](#tech-stack)
- [API Reference](#api-reference)
- [Quick Setup](#quick-setup)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Performance](#performance)

---

## Overview

**PrismoraAI Engine** is a FastAPI microservice that powers end-to-end podcast processing. Given a YouTube URL, it:

1. **Transcribes** the full podcast using Whisper `large-v3-turbo` with `int8_float16` quantization
2. **Analyzes** audio (pitch, energy, speaking rate), video (motion, faces, scenes), and transcript (semantics, sentiment)
3. **Scores** every segment using a 23-feature multi-modal fusion model on GPU
4. **Selects** the best moments using podcast-specific intelligence (Q&A detection, story arcs, viral moments)
5. **Produces** a merged highlight reel with frame-accurate cuts and audio fades
6. **Summarizes** the podcast using Gemini Flash API (with BART local fallback)

The engine runs at **~3× realtime** — a 40-minute podcast produces highlights in under 2 minutes on an RTX 4050 Laptop GPU.

---

## Architecture

### System Diagram

```
                         ┌─────────────────────────────┐
                         │      FastAPI Application     │
                         │        (app/main.py)         │
                         └──────────┬──────────────────-┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              ┌─────▼──────┐ ┌─────▼──────┐ ┌──────▼─────┐
              │ /transcribe │ │ /summarize │ │ /highlight │
              │             │ │            │ │ -generate  │
              └─────┬───────┘ └─────┬──────┘ └──────┬─────┘
                    │               │               │
              ┌─────▼──────┐ ┌─────▼──────┐ ┌──────▼──────────────────┐
              │ Transcribe  │ │Summarize   │ │Highlight Generation    │
              │ Service     │ │Service     │ │Service                  │
              │             │ │            │ │                         │
              │ Whisper     │ │ Gemini API │ │ 9-Step Pipeline:       │
              │ large-v3    │ │ (primary)  │ │ ① Sentence Map         │
              │ -turbo      │ │            │ │ ② Conversation Bounds  │
              │             │ │ BART       │ │ ③ Transcript Analysis  │
              │ int8_float16│ │ (fallback) │ │ ④ Audio+Video (‖)      │
              └─────────────┘ └────────────┘ │ ⑤ Podcast Intelligence │
                                              │ ⑥ Multi-Modal Fusion   │
                                              │ ⑦ Diversity Selection  │
                                              │ ⑧ Clip Windowing       │
                                              │ ⑨ NVENC Extract+Merge  │
                                              └──────────────────────-─┘
                                                        │
                                    ┌───────────────────┼──────────────────┐
                                    │                   │                  │
                              ┌─────▼──────┐  ┌────────▼───────┐  ┌──────▼────────┐
                              │ Audio      │  │ Video          │  │ Podcast       │
                              │ Analyzer   │  │ Analyzer       │  │ Intelligence  │
                              │            │  │                │  │               │
                              │ librosa    │  │ OpenCV         │  │ Q&A Detection │
                              │ Pitch/RMS  │  │ Haar Cascade   │  │ Story Arcs    │
                              │ Spectral   │  │ Motion/Scene   │  │ Viral Moments │
                              └────────────┘  └────────────────┘  │ Momentum      │
                                                                  │ Intro/Outro   │
                                                                  └───────────────┘
```

### Scoring Architecture

The highlight quality score for each segment is computed through a 3-layer fusion:

| Layer | Weight | Source | Features |
|-------|--------|--------|----------|
| **Multi-Modal** | 65% | `multi_modal_scorer.py` | 23 features: semantic (12%), suggestion (8%), VADER sentiment (6%), question (4%), 10 audio features (40%), 9 video features (30%) |
| **Podcast Intel** | 35% | `podcast_intelligence.py` | Content types (insight 22%, story 18%, disagreement 14%, humor 13%, advice 13%, question 10%, viral 10%), Q&A bonuses, story arcs, momentum |
| **Post-Processing** | - | Masking layer | Intro/outro suppression (→0.0), golden moment boost (1.2×), viral boost (+0.1), sentence completeness (1.15×) |

---

## Pipeline

The highlight generation runs a **9-step pipeline** with full GPU acceleration:

| Step | Name | Time* | Description |
|------|------|-------|-------------|
| ① | Sentence Map | ~0.01s | Build sentence boundaries from Whisper segments |
| ② | Conversation Boundaries | ~0.01s | Detect topic shifts via pause analysis (>2.5s gap or >1.2s + sentence-end) |
| ③ | Transcript Analysis | ~0.80s | GPU embeddings (all-MiniLM-L6-v2) for semantic coherence + suggestion relevance |
| ④ | Audio + Video (parallel) | ~15s | Parallel: librosa audio features + OpenCV video analysis on 360p |
| ⑤ | Podcast Intelligence | ~0.20s | Q&A pairs, story arcs, viral moments, momentum windows, intro/outro detection |
| ⑥ | Multi-Modal Fusion | ~0.01s | GPU tensor weighted sum of 23 features + podcast blend (35%) + masking |
| ⑥b | Dynamic Clip Count | ~0.01s | Quality-based clip count: scores > 25th percentile threshold |
| ⑦ | Diversity Selection | ~0.01s | Topic-diversity-aware greedy selection via PodcastIntelligence re-ranking |
| ⑧ | Clip Windowing | ~0.01s | Sentence-snapped windows with Q&A pair protection and question-end avoidance |
| ⑨ | Clip Extract + Merge | ~10s | NVENC GPU encoding with audio fades + Cloudinary upload |

*\*Approximate times for a 40-minute podcast on RTX 4050 Laptop GPU*

**Total pipeline time: ~30-90 seconds** (excluding download and transcription)

---

## Tech Stack

### Core Framework
| Component | Technology | Version |
|-----------|-----------|---------|
| Web Framework | FastAPI | 0.115.5 |
| ASGI Server | Uvicorn | 0.32.1 |
| Validation | Pydantic | 2.10.3 |
| Config | pydantic-settings + `.env` | 2.6.1 |

### AI / ML Models
| Model | Purpose | Hardware |
|-------|---------|----------|
| **Whisper large-v3-turbo** | Speech-to-text transcription | CUDA (int8_float16) |
| **all-MiniLM-L6-v2** | Semantic similarity embeddings | CUDA |
| **BART (bart-large-cnn-samsum)** | Abstractive summarization (fallback) | CUDA (fp16) |
| **Gemini 2.0 Flash** | Summarization + key points + topics (primary) | API |
| **VADER** | Sentiment intensity scoring | CPU |
| **Haar Cascade** | Face detection | CPU |

### Media Processing
| Tool | Purpose |
|------|---------|
| **FFmpeg + NVENC** | GPU-accelerated video encoding, clip extraction, merging |
| **yt-dlp** | YouTube audio/video download |
| **librosa** | Audio feature extraction (pitch, energy, spectral) |
| **OpenCV** | Video frame analysis (motion, complexity, faces) |
| **Cloudinary** | CDN upload for final highlight videos |

---

## API Reference

### Base URL
```
http://127.0.0.1:8000/api/v1
```

### Authentication
Optional API key authentication via `X-API-Key` header. Set `API_KEY` in `.env` to enable.

### Endpoints

#### `GET /health/`
Health check endpoint.

---

#### `POST /transcribe/`
Transcribe audio from a YouTube URL.

**Request:**
```json
{
  "youtube_url": "https://youtu.be/example"
}
```

**Response:**
```json
{
  "segments": [
    { "start": 0.0, "end": 3.5, "text": "Hello everyone..." }
  ],
  "full_text": "Hello everyone...",
  "duration": 2417.08
}
```

---

#### `POST /summarize/`
Generate summary, key points, and topics from transcript text.

**Request:**
```json
{
  "text": "Full transcript text...",
  "segments": [{ "start": 0.0, "end": 3.5, "text": "..." }],
  "duration_seconds": 2417.08
}
```

**Response:**
```json
{
  "keyPoints": "1. Key takeaway one\n2. Key takeaway two...",
  "fullText": "Comprehensive summary of the podcast...",
  "topics": "AI Infrastructure, French-Indian Relations, Quantum Computing",
  "duration": "2417.08 seconds"
}
```

**Engine:** Uses Gemini Flash API (primary) with automatic retry on rate limits. Falls back to local BART model if Gemini is unavailable.

---

#### `POST /highlight-generate/`
Generate highlight reel from pre-transcribed segments.

**Request:**
```json
{
  "youtube_url": "https://youtu.be/example",
  "segments": [
    { "start": 0.0, "end": 3.5, "text": "Hello everyone..." }
  ],
  "duration": "3m",
  "suggestion": "Focus on AI and technology topics",
  "demo_mode": false
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `youtube_url` | string | ✅ | YouTube video URL |
| `segments` | array | ✅ | Pre-transcribed segments with start/end/text |
| `duration` | string | ✅ | Target duration: `"1m"`, `"3m"`, `"5m"`, `"10m"` |
| `suggestion` | string | ❌ | Topic focus hint for scoring |
| `demo_mode` | boolean | ❌ | Skip video analysis for faster results |

**Response:**
```json
{
  "url": "https://res.cloudinary.com/.../highlight.mp4",
  "total_duration": 232.03,
  "clip_count": 2,
  "clips": [
    { "start_time": 251.45, "end_time": 361.89, "duration": 110.44 },
    { "start_time": 1962.73, "end_time": 2084.32, "duration": 121.59 }
  ]
}
```

---

#### `POST /extract-info/`
Extract metadata from a YouTube URL (thumbnail, title, description, tags).

---

## Quick Setup

### Prerequisites

- **Python** 3.11+
- **NVIDIA GPU** with CUDA 12.1+ support (tested on RTX 4050 Laptop GPU)
- **FFmpeg** with NVENC support installed and on PATH
- **16 GB+ RAM** recommended
- **~15 GB disk** for models and dependencies

### FFmpeg Setup

FFmpeg is required for video/audio processing and NVENC GPU encoding.

**Windows (via winget — recommended):**
```bash
winget install Gyan.FFmpeg.Essentials
```
After install, FFmpeg binaries will be at:
```
C:\Users\<you>\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_...\ffmpeg-x.x.x-essentials_build\bin
```
Set `FFMPEG_BIN_DIR` in your `.env` file to this path, or add it to your system `PATH`.

**Verify:**
```bash
ffmpeg -version
# Should show "ffmpeg version ..." with --enable-nvenc
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Usmaniac2003/PrismoraAI_Engine.git
cd PrismoraAI_Engine

# 2. Create & activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# 3. Install all dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 4. Create .env file
copy .env.example .env
# Edit .env with your API keys (see Configuration below)
pip install playwright
playwright install chromium
python auto_cookies.py

# 5. Verify GPU
python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}, GPU: {torch.cuda.get_device_name(0)}')"

# 6. Run the server
uvicorn app.main:app --reload

# 7. Open Swagger UI
# http://127.0.0.1:8000/docs
```

### First Run
On first launch, the engine will automatically download:
- Whisper `large-v3-turbo` model (~3 GB)
- BART `bart-large-cnn-samsum` model (~1.6 GB)
- `all-MiniLM-L6-v2` embedding model (~90 MB)

These are cached in `~/.cache/huggingface/` and only downloaded once.

---

## Configuration

All configuration is managed via environment variables in `.env`:

```env
# ── API Authentication (optional) ──────────────────────
API_KEY=                          # Leave empty to disable auth

# ── Gemini API (for AI summarization) ──────────────────
GEMINI_API_KEY=your_gemini_api_key_here

# ── Cloudinary (for video hosting) ─────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_UPLOAD_PRESET=unsigned_uploads

# ── FFmpeg Path ────────────────────────────────────────
FFMPEG_BIN_DIR=C:\path\to\ffmpeg\bin

# ── Debug ──────────────────────────────────────────────
DEBUG=false
```

### Getting API Keys

| Service | Free Tier | Get Key |
|---------|-----------|---------|
| **Gemini API** | 15 RPM / 1500 req/day | [Google AI Studio](https://aistudio.google.com/apikey) |
| **Cloudinary** | 25 GB storage / 25 GB bandwidth | [Cloudinary Console](https://console.cloudinary.com/) |

---

## Project Structure

```
PrismoraAI_Engine/
├── requirements.txt                         # All dependencies (pinned)
├── modal_app.py                             # Modal Cloud deployment
├── app/
│   ├── main.py                              # FastAPI app + middleware
│   ├── core/
│   │   └── config.py                        # Settings (pydantic-settings)
│   ├── api/v1/
│   │   ├── router.py                        # Route registration
│   │   └── endpoints/
│   │       ├── health.py                    # Health check
│   │       ├── transcribe.py               # Transcription endpoint
│   │       ├── summarize.py                # Summarization endpoint
│   │       ├── highlight_generate.py       # Highlight generation endpoint
│   │       └── extract_info.py             # Metadata extraction
│   ├── schemas/
│   │   ├── transcribe.py                    # Transcription I/O models
│   │   ├── summarize.py                     # Summarization I/O models
│   │   ├── highlight_generate.py            # Highlight gen I/O models
│   │   └── extract_info.py                  # Metadata models
│   ├── services/
│   │   ├── transcribe_service.py            # Whisper large-v3-turbo
│   │   ├── summarization_service.py         # Gemini + BART dual engine
│   │   ├── highlight_generation_service.py  # 9-step pipeline orchestrator
│   │   ├── multi_modal_scorer.py            # 23-feature GPU scorer
│   │   ├── podcast_intelligence.py          # Q&A, stories, viral, momentum
│   │   ├── audio_analyzer.py                # librosa audio features
│   │   ├── video_analyzer.py                # OpenCV video features
│   │   └── sentence_boundary_service.py     # Sentence snapping + QA protect
│   └── utils/
│       ├── file_utils.py                    # Download helpers
│       ├── audio_utils.py                   # Audio processing
│       ├── cloudinary_utils.py              # CDN upload
│       └── cleanup_utils.py                 # Temp file cleanup
├── .env                                     # Environment variables
├── .gitignore
└── README.md                                # This file
```

---

## Performance

### Benchmarks (RTX 4050 Laptop GPU, 6 GB VRAM, 16 GB RAM)

| Podcast Length | Download | Transcription | Highlight Pipeline | Total |
|----------------|----------|---------------|--------------------|-------|
| 10 min | ~10s | ~15s | ~15s | ~40s |
| 40 min | ~30s | ~50s | ~30s | ~1.5 min |
| 90 min | ~60s | ~2 min | ~60s | ~4 min |
| 2 hours | ~90s | ~3 min | ~90s | ~6 min |

### GPU Memory Usage
| Phase | VRAM |
|-------|------|
| Idle (models loaded) | ~2.5 GB |
| Transcription (Whisper) | ~3.5 GB |
| Audio + Video Analysis | ~1.5 GB |
| Clip Encoding (NVENC) | ~0.5 GB |
| **Peak** | **~4 GB** |

### Models Loaded at Startup
| Model | Size | Load Time |
|-------|------|-----------|
| Whisper large-v3-turbo | ~3 GB | ~5s |
| BART bart-large-cnn-samsum | ~1.6 GB | ~3s |
| all-MiniLM-L6-v2 | ~90 MB | ~1s |
| VADER Lexicon | ~1 MB | <1s |
| Haar Cascade | <1 MB | <1s |

---

## License

This project is part of a Final Year Project (FYP).

---

<p align="center">
  Built with ❤️ by the Prismora team
</p>
