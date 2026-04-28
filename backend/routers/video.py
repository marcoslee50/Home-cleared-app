"""
Video router — direct D-ID endpoints for status checks and video management.
The main pipeline calls D-ID internally; these endpoints are for debugging
and for the frontend to re-check individual video job states.
"""
import logging
import os

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()
logger = logging.getLogger("lifetold.video")

DID_BASE = "https://api.d-id.com"


def _did_headers():
    api_key = os.environ.get("DID_API_KEY")
    if not api_key:
        return None
    return {"Authorization": api_key, "Accept": "application/json"}


@router.get("/status/{talk_id}")
async def get_video_status(talk_id: str):
    """
    Direct poll of a D-ID talk job.
    Returns status, result_url, and progress if available.
    """
    if talk_id == "mock_did_job":
        return {
            "id": talk_id,
            "status": "done",
            "result_url": "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
        }

    headers = _did_headers()
    if not headers:
        raise HTTPException(status_code=503, detail="D-ID API key not configured")

    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(f"{DID_BASE}/talks/{talk_id}", headers=headers)
        if res.status_code == 404:
            raise HTTPException(status_code=404, detail="Talk not found")
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=res.text)
        return res.json()


@router.get("/presenters")
async def list_presenters():
    """
    Returns D-ID's built-in presenter avatars.
    Used as fallback when no portrait photo is provided.
    """
    headers = _did_headers()
    if not headers:
        return {"presenters": [], "note": "D-ID not configured"}

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(f"{DID_BASE}/presenters", headers=headers)
        if res.status_code != 200:
            return {"presenters": [], "error": res.text}
        data = res.json()

    return {
        "presenters": [
            {"id": p["presenter_id"], "name": p.get("name"), "thumbnail": p.get("thumbnail")}
            for p in data.get("presenters", [])
        ]
    }


@router.delete("/talks/{talk_id}")
async def delete_talk(talk_id: str):
    """
    Deletes a D-ID talk — called when a user permanently deletes their tribute.
    """
    if talk_id == "mock_did_job":
        return {"ok": True}

    headers = _did_headers()
    if not headers:
        return {"ok": True, "note": "dev mode"}

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.delete(f"{DID_BASE}/talks/{talk_id}", headers=headers)
    return {"ok": res.status_code in (200, 204), "talk_id": talk_id}
