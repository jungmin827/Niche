from __future__ import annotations

from datetime import datetime

from pydantic import Field

from src.schemas.common import CamelModel


class CreateSessionBundleRequest(CamelModel):
    title: str
    session_ids: list[str] = Field(min_length=1)


class SessionBundleDTO(CamelModel):
    id: str
    profile_id: str
    title: str
    session_ids: list[str]
    created_at: datetime
    updated_at: datetime


class SessionBundleResponse(CamelModel):
    bundle: SessionBundleDTO
