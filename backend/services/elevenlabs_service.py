"""
ElevenLabs voice cloning service.
Creates an Instant Voice Clone from video/audio URLs,
returns the ElevenLabs voice_id for use in D-ID.
"""
import logging
import os

import httpx

logger = logging.getLogger("lifetold.elevenlabs")

EL_BASE = "https://api.elevenlabs.io/v1"
MOCK_VOICE_ID = "mock_voice_lifetold_dev"


async def clone_voice(
    job_id: str,
    name: str,
    video_urls: list[str],
    voice_urls: list[str],
) -> str:
    """
    Clone voice from video/audio samples.
    Returns ElevenLabs voice_id string.
    """
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        logger.warning("[%s] ELEVENLABS_API_KEY not set — using mock voice id", job_id)
        return MOCK_VOICE_ID

    samples = [*video_urls[:3], *voice_urls[:5]]
    if not samples:
        logger.warning("[%s] No samples provided — using mock voice", job_id)
        return MOCK_VOICE_ID

    payload = {
        "name": f"{name} – Lifetold {job_id[:8]}",
        "description": f"Voice clone for Lifetold tribute: {name}",
        "labels": {"service": "lifetold", "job": job_id},
        "files_urls": samples,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(
            f"{EL_BASE}/voices/add-sharing",
            json=payload,
            headers={"xi-api-key": api_key, "Content-Type": "application/json"},
        )
        if res.status_code not in (200, 201):
            logger.error("[%s] ElevenLabs clone failed: %s", job_id, res.text)
            return MOCK_VOICE_ID

        data = res.json()
        voice_id = data.get("voice_id", MOCK_VOICE_ID)
        logger.info("[%s] Voice cloned: %s", job_id, voice_id)
        return voice_id


async def synthesise_audio(voice_id: str, text: str) -> bytes:
    """
    Synthesise speech from cloned voice (used if D-ID needs a pre-rendered audio file).
    Returns raw MP3 bytes.
    """
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key or voice_id == MOCK_VOICE_ID:
        return b""

    async with httpx.AsyncClient(timeout=120) as client:
        res = await client.post(
            f"{EL_BASE}/text-to-speech/{voice_id}",
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {"stability": 0.45, "similarity_boost": 0.82},
            },
            headers={"xi-api-key": api_key, "Accept": "audio/mpeg"},
        )
        if res.status_code != 200:
            logger.error("ElevenLabs TTS failed: %s", res.text)
            return b""
        return res.content
