"""
Lifetold Backend — FastAPI
Handles: upload presigning, tribute job creation, Claude narrative generation,
         ElevenLabs voice cloning, D-ID video generation, job polling.
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import tribute, upload, video, voice

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("lifetold")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Lifetold backend starting…")
    yield
    logger.info("Lifetold backend shutting down.")


app = FastAPI(
    title="Lifetold API",
    version="2.0.0",
    description="Backend for the Lifetold digital tribute platform.",
    lifespan=lifespan,
)


def _allowed_origins() -> list[str]:
    env = os.environ.get("ENVIRONMENT", "development").lower()
    raw = os.environ.get("ALLOWED_ORIGINS", "").strip()
    configured = [o.strip() for o in raw.split(",") if o.strip()]

    if env == "production":
        # Production: only what the operator explicitly allows.
        return configured

    # Development/test: localhost defaults plus anything configured.
    return configured + [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api/v1/upload", tags=["upload"])
app.include_router(tribute.router, prefix="/api/v1/tribute", tags=["tribute"])
app.include_router(voice.router, prefix="/api/v1/voice", tags=["voice"])
app.include_router(video.router, prefix="/api/v1/video", tags=["video"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "lifetold-api", "version": "2.0.0"}
