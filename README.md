<p align="center">
  <img src="Prismora Landing Page/logo.png" alt="Prismora AI Logo" width="120" />
</p>

<h1 align="center">Prismora AI</h1>

<p align="center">
  <strong>From Hours of Podcast to Seconds of Reels</strong><br/>
  An AI-powered platform that transforms long-form podcast content into bite-sized, shareable highlight reels — automatically.
</p>

<p align="center">
  <a href="https://prismora-ai.netlify.app/"><img src="https://img.shields.io/badge/🌐_Live_Demo-prismora--ai.netlify.app-8B5CF6?style=for-the-badge" alt="Live Demo"/></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android"/>
  <img src="https://img.shields.io/badge/AI_Engine-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Backend-NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS"/>
  <img src="https://img.shields.io/badge/Mobile-React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native"/>
  <img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/GPU-CUDA_12.1-76B900?style=for-the-badge&logo=nvidia&logoColor=white" alt="CUDA"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License"/>
  <img src="https://img.shields.io/badge/Python-3.11-yellow?style=flat-square&logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/Node.js-≥20-green?style=flat-square&logo=node.js" alt="Node"/>
  <img src="https://img.shields.io/badge/React_Native-0.82-blue?style=flat-square&logo=react" alt="RN"/>
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. AI Engine Setup](#1-prismoraai-engine-ai-engine)
  - [2. Backend Server Setup](#2-prismaai-server-backend)
  - [3. Mobile Client Setup](#3-prismoraclient-mobile-app)
  - [4. One-Command Launch](#4-one-command-launch)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Cloud Deployment](#-cloud-deployment)
- [AI Pipeline Details](#-ai-pipeline-details)
- [Landing Page](#-landing-page)
- [Environment Variables](#-environment-variables)
- [Team](#-team)
- [License](#-license)

---

## 🌟 Overview

**Prismora AI** is a Final Year Project built at **FAST NUCES, Islamabad** (Software Engineering, Session 2022–2026). It addresses the challenge of consuming long-form podcast content by providing an end-to-end AI pipeline that:

1. **Downloads** podcast/video content from a URL (YouTube, etc.)
2. **Transcribes** speech to text using OpenAI's Whisper ASR
3. **Summarizes** content using Google Gemini + transformer models (PEGASUS/BART)
4. **Detects highlights** using multi-modal NLP + Computer Vision fusion
5. **Generates short-form reels** with FFmpeg GPU-accelerated encoding
6. **Serves** highlight reels on a social-media-style mobile feed

The platform consists of **four components**: an AI Engine, a Backend Server, a Mobile App, and a Landing Page.

### 🎥 Demo

https://github.com/user-attachments/assets/bc8fd6f7-a854-4b55-8f1a-bd95a813a93a

---

## ✨ Key Features

| Category | Feature | Description |
|----------|---------|-------------|
| 🎙️ **Transcription** | Whisper ASR | Real-time speech-to-text with precise word-level timestamps |
| 🧠 **Summarization** | Gemini + BART/PEGASUS | Multi-model AI summarization with key-point extraction |
| 🎬 **Highlights** | Multi-Modal Fusion | NLP sentiment + audio energy + video scene detection combined |
| ✂️ **Clip Generation** | FFmpeg + NVENC | GPU-accelerated video clipping with quality gating |
| 📱 **Mobile App** | React Native | Full social platform with feed, profiles, search, notifications |
| 🔐 **Authentication** | JWT + Google OAuth | Secure login with local and Google sign-in support |
| 💬 **Social Features** | Full Suite | Likes, comments, bookmarks, follows, notifications, reports |
| 🔍 **Smart Search** | Full-Text Search | Search across posts, users, and transcripts |
| ☁️ **Cloud Storage** | Cloudinary | Automatic video/image hosting with CDN delivery |
| 🚀 **Serverless GPU** | Modal.com | One-command cloud deployment with NVIDIA T4 GPU |
| 📊 **Content Validation** | Podcast Filter | AI-powered content validation ensuring only podcast content is processed |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRISMORA AI                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    REST API    ┌──────────────────────────┐   │
│  │   Prismora   │◄─────────────►│    PrismaAI Server       │   │
│  │   Client     │               │    (NestJS + Prisma)     │   │
│  │              │               │                          │   │
│  │  React Native│               │  ● Auth (JWT/Google)     │   │
│  │  Android App │               │  ● Posts CRUD            │   │
│  │              │               │  ● Social (likes,        │   │
│  │  ● Feed      │               │    comments, follows)    │   │
│  │  ● Profile   │               │  ● Notifications         │   │
│  │  ● Search    │               │  ● File Uploads          │   │
│  │  ● Upload    │               │  ● AI Proxy              │   │
│  │  ● Editor    │               │                          │   │
│  └──────────────┘               └────────┬─────────────────┘   │
│                                          │                      │
│                                    HTTP / REST                  │
│                                          │                      │
│                                 ┌────────▼─────────────────┐   │
│                                 │   PrismoraAI Engine      │   │
│                                 │   (FastAPI + PyTorch)    │   │
│                                 │                          │   │
│                                 │  ● Whisper Transcription │   │
│                                 │  ● Gemini Summarization  │   │
│                                 │  ● Highlight Detection   │   │
│                                 │  ● Video Generation      │   │
│                                 │  ● Content Validation    │   │
│                                 │  ● Clip Fusion           │   │
│                                 └──────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Infrastructure: PostgreSQL │ Cloudinary │ Modal.com │ ngrok   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### AI Engine (`PrismoraAI_Engine/`)
| Technology | Purpose |
|-----------|---------|
| **Python 3.11** | Core language |
| **FastAPI** | Async REST API framework |
| **PyTorch + CUDA 12.1** | GPU-accelerated ML inference |
| **Faster-Whisper** | Speech-to-text transcription (CTranslate2 backend) |
| **Google Gemini API** | Primary AI summarization engine |
| **Transformers (HuggingFace)** | BART/PEGASUS fallback summarization |
| **Sentence-Transformers** | Semantic similarity & embeddings |
| **VADER Sentiment** | Sentiment analysis for highlight scoring |
| **OpenCV** | Scene detection & keyframe analysis |
| **FFmpeg (NVENC)** | GPU-accelerated video encoding & clipping |
| **yt-dlp** | YouTube/podcast media downloading |
| **Cloudinary** | Cloud video/image hosting |
| **Modal.com** | Serverless GPU cloud deployment |

### Backend Server (`PrismaAI_Server/`)
| Technology | Purpose |
|-----------|---------|
| **NestJS 11** | TypeScript server framework |
| **Prisma ORM** | Database access & migrations |
| **PostgreSQL** | Relational database |
| **Passport.js** | Authentication (JWT + Google OAuth) |
| **Cloudinary SDK** | Media file management |
| **Multer** | File upload handling |
| **Joi** | Request validation |

### Mobile Client (`PrismoraClient/`)
| Technology | Purpose |
|-----------|---------|
| **React Native 0.82** | Cross-platform mobile framework |
| **TypeScript** | Type-safe development |
| **React Navigation 7** | Screen navigation & deep linking |
| **Zustand** | Lightweight state management |
| **Axios** | HTTP client for API calls |
| **React Native Video** | Video playback |
| **Google Sign-In** | OAuth authentication |
| **React Native Vector Icons** | Icon library |
| **IMG.LY Editor** | In-app video editing |

### Landing Page (`Prismora Landing Page/`)
| Technology | Purpose |
|-----------|---------|
| **HTML5 + CSS3 + JS** | Static landing page |
| **Poppins (Google Fonts)** | Typography |
| **Canvas API** | Animated particle background |

---

## 📁 Repository Structure

```
Prismora-AI/
│
├── 📄 README.md                    # This file
├── 📄 .gitignore                   # Root gitignore
├── 🐍 start_all.py                 # One-command launcher (Engine + Server + ngrok)
│
├── 🤖 PrismoraAI_Engine/           # AI & ML Microservice (FastAPI)
│   ├── app/
│   │   ├── api/v1/endpoints/       # REST API endpoints
│   │   │   ├── health.py           #   Health check
│   │   │   ├── transcribe.py       #   Speech-to-text
│   │   │   ├── summarize.py        #   AI summarization
│   │   │   ├── highlight_generate.py   # Full highlight pipeline
│   │   │   ├── fuse_clips.py       #   Clip merging/fusion
│   │   │   ├── extract_info.py     #   Video metadata extraction
│   │   │   └── validate_podcast.py #   Content validation filter
│   │   ├── services/               # Core AI services
│   │   │   ├── transcribe_service.py       # Whisper ASR engine
│   │   │   ├── summarization_service.py    # Gemini + BART summarization
│   │   │   ├── highlight_generation_service.py  # Main highlight pipeline
│   │   │   ├── audio_analyzer.py           # Audio energy & feature analysis
│   │   │   ├── video_analyzer.py           # Scene detection & keyframes
│   │   │   ├── multi_modal_scorer.py       # NLP + CV fusion scoring
│   │   │   ├── fusion_service.py           # Clip fusion & merging
│   │   │   ├── sentence_boundary_service.py # Smart sentence segmentation
│   │   │   ├── clip_quality_gate.py        # Quality filtering
│   │   │   ├── podcast_intelligence.py     # Podcast content analysis
│   │   │   └── podcast_validator.py        # Content type validation
│   │   ├── core/                   # Configuration & settings
│   │   ├── schemas/                # Pydantic request/response models
│   │   └── utils/                  # Helper utilities
│   ├── .env.example                # Environment template
│   ├── requirements.txt            # Python dependencies
│   ├── modal_app.py                # Modal.com cloud deployment
│   └── start_local.py              # Local development launcher
│
├── 🖥️ PrismaAI_Server/             # Backend API Server (NestJS)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/               # JWT + Google OAuth authentication
│   │   │   ├── user/               # User profiles & management
│   │   │   ├── post/               # Post (highlight) CRUD operations
│   │   │   ├── comment/            # Commenting system
│   │   │   ├── like/               # Like/dislike system
│   │   │   ├── bookmark/           # Bookmarking system
│   │   │   ├── follow/             # Follow/unfollow system
│   │   │   ├── search/             # Full-text search
│   │   │   ├── notifications/      # Real-time notifications
│   │   │   ├── report/             # Content reporting
│   │   │   ├── summary/            # AI summary caching
│   │   │   ├── ai/                 # AI Engine proxy
│   │   │   └── utility/            # Utility endpoints
│   │   ├── prisma/                 # Prisma service
│   │   ├── config/                 # App configuration
│   │   ├── middlewares/            # Custom middleware
│   │   └── common/                 # Shared utilities
│   ├── prisma/
│   │   └── schema.prisma           # Database schema (12 models)
│   ├── .env.example                # Environment template
│   └── package.json                # Node.js dependencies
│
├── 📱 PrismoraClient/              # Mobile Application (React Native)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── Auth/               # Login, Register, Forgot Password
│   │   │   ├── Onboarding/         # First-time user onboarding
│   │   │   ├── Home/               # Main feed screen
│   │   │   ├── Discover/           # Explore & discover content
│   │   │   ├── Search/             # Search users & posts
│   │   │   ├── Add/                # Full highlight creation flow
│   │   │   │   ├── CreatePostURL       # Paste podcast URL
│   │   │   │   ├── CreatePostFile      # Upload local file
│   │   │   │   ├── ProcessingScreen    # AI processing progress
│   │   │   │   ├── GeneratingScreen    # Highlight generation
│   │   │   │   ├── ReviewScreen        # Preview & select clips
│   │   │   │   ├── EditPostScreen      # Edit metadata & thumbnail
│   │   │   │   ├── VideoEditorScreen   # In-app video editor (IMG.LY)
│   │   │   │   └── PostDetailsScreen   # Final post view
│   │   │   ├── Profile/            # User profile & settings
│   │   │   ├── Notifications/      # Activity notifications
│   │   │   ├── PlayGround/         # Experimental features
│   │   │   └── Splash/             # App splash screen
│   │   ├── components/
│   │   │   ├── atoms/              # Basic UI elements
│   │   │   ├── molecules/          # Composed components
│   │   │   ├── organisms/          # Complex UI sections
│   │   │   └── layout/             # Layout wrappers
│   │   ├── navigation/             # React Navigation config
│   │   ├── api/                    # API client & interceptors
│   │   ├── store/                  # Zustand state stores
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── services/               # Business logic services
│   │   ├── styles/                 # Theme & styling
│   │   ├── types/                  # TypeScript type definitions
│   │   ├── config/                 # App configuration
│   │   ├── data/                   # Static data & constants
│   │   ├── utils/                  # Utility functions
│   │   └── assets/                 # Images, fonts, icons
│   ├── .env.example                # Environment template
│   └── package.json                # Node.js dependencies
│
└── 🌐 Prismora Landing Page/       # Marketing Website
    ├── index.html                  # Main HTML page
    ├── style.css                   # Styles with glassmorphism & animations
    ├── script.js                   # Canvas animations & interactions
    ├── logo.png                    # Prismora AI logo
    └── prismora_final.mp4          # Demo video
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Notes |
|------------|---------|-------|
| **Python** | 3.11+ | For AI Engine |
| **Node.js** | ≥ 20 | For Backend & Client |
| **PostgreSQL** | 14+ | Database |
| **NVIDIA GPU** | CUDA 12.1 | For Whisper/PyTorch (CPU fallback available) |
| **FFmpeg** | 6.0+ | With NVENC support for GPU encoding |
| **Android Studio** | Latest | For building the mobile app |
| **ngrok** | Latest | For tunneling backend to mobile app |

### 1. PrismoraAI Engine (AI Engine)

```bash
# Navigate to the AI Engine directory
cd PrismoraAI_Engine

# Create and activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys (Gemini, Cloudinary, etc.)

# Verify CUDA (optional, for GPU acceleration)
python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}')"

# Start the AI Engine
python start_local.py
# or
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The AI Engine will be available at: `http://localhost:8000`
API docs (Swagger): `http://localhost:8000/docs`

### 2. PrismaAI Server (Backend)

```bash
# Navigate to the Backend directory
cd PrismaAI_Server

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env.development
# Edit .env.development with your database URL, JWT secret, Google OAuth keys

# Run Prisma migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start the development server
npm run start:dev
```

The Backend will be available at: `http://localhost:3000`

### 3. PrismoraClient (Mobile App)

```bash
# Navigate to the Client directory
cd PrismoraClient

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your backend API URLs

# Start Metro bundler
npm start

# Run on Android (in a separate terminal)
npm run android
```

### 4. One-Command Launch

Use the root `start_all.py` to launch everything simultaneously:

```bash
# From the root directory
python start_all.py
```

This will:
1. Start the **AI Engine** (FastAPI) on port `8000`
2. Start the **Backend Server** (NestJS) on port `3000`
3. Open an **ngrok tunnel** to expose the backend publicly
4. Display the public URL to use in the mobile app

---

## 📡 API Reference

### AI Engine Endpoints (`localhost:8000/api/v1`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health/` | Health check |
| `POST` | `/transcribe/` | Transcribe audio/video to text |
| `POST` | `/summarize/` | Generate AI summary from transcript |
| `POST` | `/highlight-generate/` | Full highlight generation pipeline |
| `POST` | `/fuse-clips/` | Merge multiple clips into one |
| `POST` | `/extract-info/` | Extract video metadata |
| `POST` | `/validate-podcast/` | Validate content is a podcast |

### Backend Server Endpoints (`localhost:3000`)

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Auth** | `POST /auth/login`, `POST /auth/register`, `GET /auth/google` | Authentication |
| **Users** | `GET /users/:id`, `PATCH /users/:id` | User management |
| **Posts** | `GET /posts`, `POST /posts`, `PATCH /posts/:id` | Highlight posts CRUD |
| **Comments** | `POST /comments`, `GET /comments/:postId` | Commenting |
| **Likes** | `POST /likes`, `DELETE /likes` | Like/dislike system |
| **Bookmarks** | `POST /bookmarks`, `GET /bookmarks` | Saved posts |
| **Follow** | `POST /follow`, `DELETE /follow` | Follow system |
| **Search** | `GET /search?q=` | Full-text search |
| **Notifications** | `GET /notifications` | Activity feed |

> Full interactive API docs are available at `http://localhost:8000/docs` (AI Engine) after starting the server.

---

## 🗄 Database Schema

The PostgreSQL database managed by Prisma ORM contains **12 models**:

```
User ──┬── Post ──┬── Comment ──── CommentLike
       │          ├── PostLike
       │          ├── Bookmark
       │          ├── Report
       │          └── PostSummary
       │
       ├── Follow (self-referential)
       └── Notification
```

**Key Models:**
- **User** — Profile, auth (local + Google OAuth), relations
- **Post** — Highlight video with metadata, categories, counters
- **Comment / CommentLike** — Nested commenting with likes
- **PostLike** — Like/dislike system with unique constraints
- **Bookmark** — Save posts for later
- **Follow** — Follower/following relationships
- **Report** — Content reporting system
- **PostSummary** — Cached AI-generated summaries
- **Notification** — Activity notifications (like, comment, follow)

**Enums:** `AuthProvider` (LOCAL, GOOGLE), `NotificationType` (LIKE, COMMENT, FOLLOW, COMMENT_LIKE)

---

## ☁️ Cloud Deployment

### AI Engine on Modal.com

The AI Engine can be deployed to [Modal.com](https://modal.com) for serverless GPU inference:

```bash
# Install Modal
pip install modal

# Authenticate
modal token set

# Create secrets
modal secret create prismora-secrets \
  GEMINI_API_KEY=<your-key> \
  CLOUDINARY_CLOUD_NAME=<your-cloud> \
  CLOUDINARY_UPLOAD_PRESET=unsigned_uploads

# Deploy to production
modal deploy modal_app.py

# Or dev mode with hot reload
modal serve modal_app.py
```

**Deployment specs:**
- **GPU:** NVIDIA T4 (16 GB VRAM)
- **Cost:** ~$0.59/hr (only charged during processing)
- **Timeout:** 30 min per request
- **Concurrency:** 4 simultaneous requests
- **Model Caching:** Persistent volumes for HuggingFace + Whisper models

### Backend + Mobile

- **Backend:** Deploy NestJS to any Node.js host (Render, Railway, AWS, etc.)
- **Mobile:** Build APK with `cd PrismoraClient/android && ./gradlew assembleRelease`
- **Local Dev:** Use `ngrok` to expose the backend for the mobile app

---

## 🧠 AI Pipeline Details

The highlight generation pipeline processes content through **7 stages**:

```
URL Input
    │
    ▼
┌──────────────────┐
│ 1. DOWNLOAD      │  yt-dlp fetches audio/video from URL
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 2. VALIDATE      │  AI checks if content is actually a podcast
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 3. TRANSCRIBE    │  Faster-Whisper (CTranslate2) → timestamped text
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 4. SUMMARIZE     │  Google Gemini + BART/PEGASUS → key points
└────────┬─────────┘
         ▼
┌──────────────────────────────────────────────┐
│ 5. MULTI-MODAL SCORING                       │
│                                              │
│  ┌─────────────┐  ┌──────────────┐           │
│  │ NLP Scoring  │  │ Audio Energy │           │
│  │ • Sentiment  │  │ • RMS Power  │           │
│  │ • Keywords   │  │ • Spectral   │ ──► Fusion│
│  │ • Embeddings │  │ • Zero-cross │           │
│  └─────────────┘  └──────────────┘           │
│                                              │
│  ┌──────────────┐                            │
│  │ Video Scene  │                            │
│  │ • PySceneDetect                           │
│  │ • Keyframes  │ ──────────────────► Fusion │
│  └──────────────┘                            │
└────────────────────┬─────────────────────────┘
                     ▼
┌──────────────────┐
│ 6. QUALITY GATE  │  Filter low-quality clips, enforce min/max duration
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 7. RENDER        │  FFmpeg + NVENC GPU encoding → MP4 highlight reels
└────────┬─────────┘
         ▼
    Upload to Cloudinary → Return URLs
```

---

## 🌐 Landing Page

The `Prismora Landing Page/` directory contains a standalone marketing website featuring:

- Animated canvas particle background
- Interactive phone mockups showing the app
- Feature comparison table (vs SimonSays, Otter, Vimeo)
- Tech stack showcase
- Team section
- APK download link
- Embedded demo video

Open `Prismora Landing Page/index.html` in any browser to view.

---

## 🔐 Environment Variables

Each sub-project requires its own `.env` file. Template `.env.example` files are provided:

### AI Engine (`PrismoraAI_Engine/.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for summarization |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name for video hosting |
| `CLOUDINARY_UPLOAD_PRESET` | Yes | Cloudinary unsigned upload preset |
| `FFMPEG_BIN_DIR` | Yes | Path to FFmpeg binaries |
| `API_KEY` | No | Optional API key for engine authentication |
| `DEBUG` | No | Enable debug logging (`true`/`false`) |

### Backend Server (`PrismaAI_Server/.env.development`)
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT token signing |
| `JWT_EXPIRES_IN` | Yes | Token expiry in seconds |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Yes | OAuth callback URL |
| `ANDROID_CLIENT_ID` | Yes | Google client ID for Android app |
| `AI_API` | Yes | AI Engine URL |

### Mobile Client (`PrismoraClient/.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `ENVIRONMENT` | Yes | `development` or `production` |
| `API_BASE_URL_DEV` | Yes | Backend URL for development |
| `API_BASE_URL_PROD` | Yes | Backend URL for production |

---

## 👥 Team

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Ahtisham992">
        <img src="https://github.com/Ahtisham992.png" width="120" style="border-radius:50%" alt="Muhammad Ahtisham"/><br/>
        <strong>Muhammad Ahtisham</strong>
      </a><br/>
      22I-2690<br/>
      <em>AI Engine · Frontend Development</em><br/>
      <a href="https://github.com/Ahtisham992"><img src="https://img.shields.io/badge/-Ahtisham992-181717?style=flat-square&logo=github" alt="GitHub"/></a>
    </td>
    <td align="center">
      <a href="https://github.com/Usmaniac2003">
        <img src="https://github.com/Usmaniac2003.png" width="120" style="border-radius:50%" alt="Usman Ghani"/><br/>
        <strong>Usman Ghani</strong>
      </a><br/>
      22I-8796<br/>
      <em>Routing Server · Backend Architecture</em><br/>
      <a href="https://github.com/Usmaniac2003"><img src="https://img.shields.io/badge/-Usmaniac2003-181717?style=flat-square&logo=github" alt="GitHub"/></a>
    </td>
    <td align="center">
      <a href="https://github.com/i222627-ui">
        <img src="https://github.com/i222627-ui.png" width="120" style="border-radius:50%" alt="Abdullah Tariq"/><br/>
        <strong>Abdullah Tariq</strong>
      </a><br/>
      22I-2627<br/>
      <em>Mobile App · System Integration</em><br/>
      <a href="https://github.com/i222627-ui"><img src="https://img.shields.io/badge/-i222627--ui-181717?style=flat-square&logo=github" alt="GitHub"/></a>
    </td>
  </tr>
</table>

**Institution:** FAST National University of Computer and Emerging Sciences (NUCES), Islamabad
**Program:** Bachelor of Science in Software Engineering (Session 2022–2026)
**Project Type:** Final Year Project (FYP)

---

## 📄 License

This project is developed as an academic Final Year Project. See `LICENSE` file for details.

---

<p align="center">
  <strong>Prismora AI</strong> — Learn in minutes, not hours.<br/>
  <em>© 2026 Prismora AI · FAST NUCES, Islamabad</em>
</p>
