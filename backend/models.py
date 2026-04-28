from enum import Enum
from typing import Dict, Optional

from pydantic import BaseModel, Field


class TributeStyle(str, Enum):
    cinematic = "cinematic"
    documentary = "documentary"
    intimate = "intimate"
    celebratory = "celebratory"


class TributeTone(str, Enum):
    warm = "warm"
    reflective = "reflective"
    joyful = "joyful"
    reverent = "reverent"


class TributeMusic(str, Enum):
    orchestral = "orchestral"
    acoustic = "acoustic"
    ambient = "ambient"
    silence = "silence"


class JobStage(str, Enum):
    created = "created"
    uploading = "uploading"
    voice_analysis = "voice_analysis"
    narrative = "narrative"
    portrait = "portrait"
    video = "video"
    finalising = "finalising"
    done = "done"
    error = "error"


# ── Request bodies ─────────────────────────────────────────────────


class CreateTributeRequest(BaseModel):
    name: str
    birth_year: Optional[str] = None
    passed_year: Optional[str] = None
    relationship: str
    interview: Dict[str, str] = Field(default_factory=dict)
    style: TributeStyle = TributeStyle.cinematic
    tone: TributeTone = TributeTone.warm
    music: TributeMusic = TributeMusic.orchestral


class StartTributeRequest(BaseModel):
    photo_urls: list[str] = Field(default_factory=list)
    video_urls: list[str] = Field(default_factory=list)
    voice_urls: list[str] = Field(default_factory=list)


class PresignRequest(BaseModel):
    filename: str
    content_type: str
    folder: str


# ── Response bodies ────────────────────────────────────────────────


class JobStatusResponse(BaseModel):
    job_id: str
    stage: str
    stage_progress: int = 0
    video_url: Optional[str] = None
    narrative: Optional[str] = None
    message: Optional[str] = None


class PresignResponse(BaseModel):
    upload_url: str
    public_url: str
