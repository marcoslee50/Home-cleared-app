"""
Tribute router — orchestrates the full pipeline with Supabase persistence.
Falls back to in-memory dict in development when SUPABASE_URL is not set.
"""
import asyncio
import logging
import os
import uuid

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException

from models import CreateTributeRequest, JobStage, JobStatusResponse, StartTributeRequest
from services.claude_service import build_narrative_prompt
from services.did_service import create_talking_video, poll_did_job
from services.elevenlabs_service import clone_voice

router = APIRouter()
logger = logging.getLogger("lifetold.tribute")

_JOBS_MEMORY: dict[str, dict] = {}

# Video must be > 50MB as a proxy for the 5-minute minimum required for voice modelling.
MIN_VIDEO_BYTES = 50 * 1024 * 1024


def _get_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return None
    try:
        from supabase import create_client

        return create_client(url, key)
    except ImportError:
        return None


def _create_job(job_id: str, data: dict):
    sb = _get_supabase()
    if sb:
        sb.table("tribute_jobs").insert({"id": job_id, **data}).execute()
    else:
        _JOBS_MEMORY[job_id] = data


def _get_job(job_id: str) -> dict:
    sb = _get_supabase()
    if sb:
        res = sb.table("tribute_jobs").select("*").eq("id", job_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Job not found")
        return res.data
    if job_id not in _JOBS_MEMORY:
        raise HTTPException(status_code=404, detail="Job not found")
    return _JOBS_MEMORY[job_id]


def _update_job(job_id: str, **kwargs):
    sb = _get_supabase()
    if sb:
        sb.table("tribute_jobs").update(kwargs).eq("id", job_id).execute()
    else:
        if job_id in _JOBS_MEMORY:
            _JOBS_MEMORY[job_id].update(kwargs)


async def _validate_video_size(video_urls: list[str]) -> None:
    """At least one supplied video must be >= MIN_VIDEO_BYTES — proxy for 5+ min duration.

    Skipped in non-production environments and for mock URLs so dev flows still work.
    """
    if not video_urls:
        raise HTTPException(status_code=400, detail="At least one video recording is required.")

    if os.environ.get("ENVIRONMENT", "development") != "production":
        return

    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        for url in video_urls:
            try:
                res = await client.head(url)
            except httpx.HTTPError as e:
                logger.warning("HEAD failed for %s: %s", url, e)
                continue
            length = int(res.headers.get("content-length", "0") or 0)
            if length >= MIN_VIDEO_BYTES:
                return

    raise HTTPException(
        status_code=400,
        detail=(
            "Voice modelling needs at least ~5 minutes of video "
            "(roughly 50MB or more). Please upload a longer recording."
        ),
    )


@router.post("/create")
async def create_tribute(req: CreateTributeRequest):
    job_id = uuid.uuid4().hex
    _create_job(
        job_id,
        {
            "stage": JobStage.created,
            "stage_progress": 0,
            "meta": req.model_dump(),
            "video_url": None,
            "narrative": None,
            "voice_id": None,
            "did_job_id": None,
            "message": None,
        },
    )
    logger.info("Job created: %s for '%s'", job_id, req.name)
    return {"job_id": job_id}


@router.post("/{job_id}/start")
async def start_tribute(job_id: str, req: StartTributeRequest, bg: BackgroundTasks):
    job = _get_job(job_id)
    await _validate_video_size(req.video_urls)
    _update_job(job_id, stage=JobStage.uploading, stage_progress=10)
    bg.add_task(_run_pipeline, job_id, req, job["meta"])
    return {"ok": True, "message": "Pipeline started"}


async def _run_pipeline(job_id: str, req: StartTributeRequest, meta: dict):
    try:
        _update_job(job_id, stage=JobStage.voice_analysis, stage_progress=10)
        _update_job(
            job_id,
            photo_urls=req.photo_urls,
            video_urls=req.video_urls,
            voice_urls=req.voice_urls,
        )
        _update_job(job_id, stage_progress=100)

        _update_job(job_id, stage=JobStage.narrative, stage_progress=10)
        narrative = await build_narrative_prompt(
            name=meta["name"],
            birth_year=meta.get("birth_year", ""),
            passed_year=meta.get("passed_year", ""),
            relationship=meta["relationship"],
            interview=meta.get("interview", {}),
            style=meta["style"],
            tone=meta["tone"],
        )
        _update_job(job_id, narrative=narrative, stage_progress=100)

        _update_job(job_id, stage=JobStage.portrait, stage_progress=20)
        voice_id = await clone_voice(
            job_id=job_id,
            name=meta["name"],
            video_urls=req.video_urls,
            voice_urls=req.voice_urls,
        )
        _update_job(job_id, voice_id=voice_id, stage_progress=100)

        _update_job(job_id, stage=JobStage.video, stage_progress=10)
        source_image = req.photo_urls[0] if req.photo_urls else None
        did_job_id = await create_talking_video(
            source_url=source_image,
            script=narrative,
            voice_id=voice_id,
            style=meta["style"],
            music=meta["music"],
        )
        _update_job(job_id, did_job_id=did_job_id, stage_progress=40)
        video_url = await poll_did_job(did_job_id, job_id=job_id, update_fn=_update_job)

        _update_job(job_id, stage=JobStage.finalising, stage_progress=90)
        await asyncio.sleep(1)
        _update_job(job_id, stage=JobStage.done, stage_progress=100, video_url=video_url)
        logger.info("[%s] Complete: %s", job_id, video_url)

    except Exception as e:
        logger.exception("[%s] Pipeline error: %s", job_id, e)
        _update_job(job_id, stage=JobStage.error, message=str(e))


@router.get("/{job_id}/status", response_model=JobStatusResponse)
async def get_status(job_id: str):
    job = _get_job(job_id)
    return JobStatusResponse(
        job_id=job_id,
        stage=job["stage"],
        stage_progress=job["stage_progress"],
        video_url=job.get("video_url"),
        narrative=job.get("narrative"),
        message=job.get("message"),
    )


@router.post("/{job_id}/share")
async def share_tribute(job_id: str):
    job = _get_job(job_id)
    if job["stage"] != JobStage.done:
        raise HTTPException(status_code=400, detail="Tribute not yet complete")
    app_url = os.environ.get("APP_URL", "http://localhost:3000")
    share_token = job.get("share_token", job_id)
    return {"share_url": f"{app_url}/tribute/{share_token}"}


@router.delete("/{job_id}")
async def delete_tribute(job_id: str):
    _get_job(job_id)
    sb = _get_supabase()
    if sb:
        sb.table("tribute_jobs").delete().eq("id", job_id).execute()
    else:
        _JOBS_MEMORY.pop(job_id, None)
    logger.info("[%s] Deleted", job_id)
    return {"ok": True, "deleted": job_id}
