"""
Upload router — generates presigned PUT URLs for direct browser-to-R2 uploads.
The browser uploads directly to R2 (never through our server) for speed and cost.
"""
import os
import uuid

import boto3
from botocore.client import Config
from fastapi import APIRouter, HTTPException

from models import PresignRequest, PresignResponse

router = APIRouter()


def _s3_client():
    return boto3.client(
        "s3",
        endpoint_url=os.environ.get("R2_ENDPOINT"),
        aws_access_key_id=os.environ.get("R2_ACCESS_KEY"),
        aws_secret_access_key=os.environ.get("R2_SECRET_KEY"),
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


BUCKET = os.environ.get("R2_BUCKET", "lifetold-media")
PUBLIC_BASE = os.environ.get("R2_PUBLIC_URL", "https://media.lifetold.co.uk")
EXPIRES = 3600  # 1 hour


@router.post("/presign", response_model=PresignResponse)
async def presign(req: PresignRequest):
    """Return a presigned PUT URL. Browser uploads directly; no data touches our server."""
    ext = req.filename.rsplit(".", 1)[-1] if "." in req.filename else ""
    key = f"{req.folder}/{uuid.uuid4().hex}.{ext}" if ext else f"{req.folder}/{uuid.uuid4().hex}"

    try:
        s3 = _s3_client()
        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={"Bucket": BUCKET, "Key": key, "ContentType": req.content_type},
            ExpiresIn=EXPIRES,
        )
        public_url = f"{PUBLIC_BASE}/{key}"
        return PresignResponse(upload_url=upload_url, public_url=public_url)
    except Exception as e:
        # In dev without R2, return a mock response so the wizard still flows
        if os.environ.get("ENVIRONMENT", "development") != "production":
            return PresignResponse(
                upload_url=f"http://localhost:8000/api/v1/upload/mock-put/{key}",
                public_url=f"http://localhost:8000/api/v1/upload/mock/{key}",
            )
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/mock-put/{path:path}")
async def mock_put(path: str):
    """Dev-only mock upload endpoint — accepts anything."""
    return {"ok": True, "path": path}
