"""
D-ID service — creates a talking-head video from:
  - source_url: a portrait photo of the person
  - script: the Claude-generated narrative (D-ID uses its own TTS or our voice_id)
  - voice_id: ElevenLabs voice id (passed to D-ID's voice provider integration)

D-ID async flow:
  1. POST /talks → returns talk_id
  2. Poll GET /talks/{talk_id} until status == "done"
  3. Return result_url (CDN video URL)
"""
import asyncio
import logging
import os

import httpx

logger = logging.getLogger("lifetold.did")

DID_BASE = "https://api.d-id.com"
MOCK_VIDEO_URL = "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4"

DEFAULT_PRESENTER = "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/thumbnail.jpeg"

STYLE_DRIVER = {
    "cinematic": {"config": {"fluent": True, "pad_audio": 0.0}},
    "documentary": {"config": {"fluent": True, "pad_audio": 0.3}},
    "intimate": {"config": {"fluent": False, "pad_audio": 0.5}},
    "celebratory": {"config": {"fluent": True, "pad_audio": 0.0}},
}


async def create_talking_video(
    source_url: str | None,
    script: str,
    voice_id: str,
    style: str = "cinematic",
    music: str = "orchestral",
) -> str:
    """
    Submits a D-ID talk job.
    Returns the D-ID talk_id for polling.
    """
    api_key = os.environ.get("DID_API_KEY")
    if not api_key:
        logger.warning("DID_API_KEY not set — returning mock job id")
        return "mock_did_job"

    image_url = source_url or DEFAULT_PRESENTER
    driver_cfg = STYLE_DRIVER.get(style, STYLE_DRIVER["cinematic"])

    voice_provider = (
        {"type": "elevenlabs", "voice_id": voice_id}
        if voice_id and not voice_id.startswith("mock")
        else {"type": "microsoft", "voice_id": "en-GB-SoniaNeural"}
    )

    payload = {
        "source_url": image_url,
        "script": {
            "type": "text",
            "input": script,
            "provider": voice_provider,
            "ssml": False,
        },
        **driver_cfg,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            f"{DID_BASE}/talks",
            json=payload,
            headers={
                "Authorization": api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        if res.status_code not in (200, 201):
            logger.error("D-ID create failed: %s", res.text)
            return "mock_did_job"

        data = res.json()
        talk_id = data.get("id", "mock_did_job")
        logger.info("D-ID talk created: %s", talk_id)
        return talk_id


async def poll_did_job(
    talk_id: str,
    job_id: str,
    update_fn,
    max_attempts: int = 60,
    interval_s: float = 10.0,
) -> str:
    """
    Polls D-ID until status is 'done'. Returns CDN video URL.
    Updates the Lifetold job progress as it goes.
    """
    if talk_id == "mock_did_job":
        for pct in range(40, 101, 10):
            await asyncio.sleep(2)
            update_fn(job_id, stage_progress=pct)
        return MOCK_VIDEO_URL

    api_key = os.environ.get("DID_API_KEY")

    async with httpx.AsyncClient(timeout=30) as client:
        for attempt in range(max_attempts):
            await asyncio.sleep(interval_s)

            res = await client.get(
                f"{DID_BASE}/talks/{talk_id}",
                headers={"Authorization": api_key, "Accept": "application/json"},
            )
            if res.status_code != 200:
                logger.warning("[%s] D-ID poll failed attempt %d: %s", job_id, attempt, res.text)
                continue

            data = res.json()
            status = data.get("status", "")
            logger.info("[%s] D-ID status: %s (attempt %d)", job_id, status, attempt)

            if status == "done":
                video_url = data.get("result_url") or data.get("video_url", "")
                update_fn(job_id, stage_progress=100)
                return video_url

            if status == "error":
                raise RuntimeError(
                    f"D-ID error: {data.get('error', {}).get('description', 'Unknown')}"
                )

            pct = min(40 + attempt * 2, 95)
            update_fn(job_id, stage_progress=pct)

    raise RuntimeError("D-ID job timed out after max polling attempts")
