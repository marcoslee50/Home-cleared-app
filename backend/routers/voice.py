"""
Voice router — endpoints for voice analysis and status checks.
Heavy lifting is done by the ElevenLabs service in the pipeline.
"""
import logging
import os

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from services.elevenlabs_service import synthesise_audio

router = APIRouter()
logger = logging.getLogger("lifetold.voice")


class SynthRequest(BaseModel):
    voice_id: str
    text: str


@router.post("/synthesise")
async def synthesise(req: SynthRequest):
    """
    Synthesise a short audio sample from a cloned voice.
    Used for the preview player in the result step.
    Returns audio/mpeg bytes.
    """
    audio_bytes = await synthesise_audio(req.voice_id, req.text)
    if not audio_bytes:
        raise HTTPException(status_code=424, detail="Voice synthesis unavailable")
    return Response(content=audio_bytes, media_type="audio/mpeg")


@router.get("/voices")
async def list_voices():
    """
    Lists available ElevenLabs voices for the account.
    Used to verify API key is working and show available voices.
    """
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        return {"voices": [], "note": "ELEVENLABS_API_KEY not configured"}

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(
            "https://api.elevenlabs.io/v1/voices",
            headers={"xi-api-key": api_key},
        )
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=res.text)
        data = res.json()

    voices = [
        {"voice_id": v["voice_id"], "name": v["name"], "category": v.get("category")}
        for v in data.get("voices", [])
    ]
    return {"voices": voices, "count": len(voices)}


@router.delete("/voices/{voice_id}")
async def delete_voice(voice_id: str):
    """
    Deletes a cloned voice from ElevenLabs.
    Called when a user deletes their tribute to clean up.
    """
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        return {"ok": True, "note": "dev mode - no deletion performed"}

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.delete(
            f"https://api.elevenlabs.io/v1/voices/{voice_id}",
            headers={"xi-api-key": api_key},
        )
    return {"ok": res.status_code in (200, 204), "voice_id": voice_id}
