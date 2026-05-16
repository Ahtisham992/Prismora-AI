from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.api.v1.router import router as api_router
from app.core.config import settings
import os

app = FastAPI(
    title=settings.APP_NAME,
    description="Prismora AI - FastAPI microservice for transcription",
    version="1.0.0",
)

# Enable CORS for all origins (required for test UI)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# ── Static file mount for local fallback videos ──────────────────────────────
# When Cloudinary upload fails, videos are saved to highlights/ and served here.
os.makedirs("highlights", exist_ok=True)
app.mount(
    "/api/v1/static/highlights",
    StaticFiles(directory="highlights"),
    name="highlight_static",
)


# ── API Key Auth Middleware ───────────────────────────────────────────────────
# If API_KEY is set in .env, all endpoints (except public ones) require
# the header:  X-API-Key: <your_key>
# If API_KEY is not set, auth is disabled entirely (dev-friendly).
# ─────────────────────────────────────────────────────────────────────────────

_PUBLIC_PATHS = {"/", "/docs", "/redoc", "/openapi.json", "/api/v1/health/", "/api/v1/health"}


@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    if settings.API_KEY:
        path = request.url.path
        if path not in _PUBLIC_PATHS:
            api_key = request.headers.get("X-API-Key")
            if api_key != settings.API_KEY:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Invalid or missing API key"},
                )
    return await call_next(request)


app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
def root():
    return {"message": f"{settings.APP_NAME} Engine is running"}

