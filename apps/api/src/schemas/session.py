from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from src.schemas.common import CamelModel, PageResponse

SessionStatus = Literal["active", "completed", "cancelled"]
Visibility = Literal["public", "private"]


class SessionCreateRequest(CamelModel):
    topic: str | None = None
    subject: str | None = None
    planned_minutes: int | None = Field(default=None, ge=1)
    source: str | None = None


class SessionCompleteRequest(CamelModel):
    ended_at: datetime | None = None


class SessionSummary(CamelModel):
    id: str
    topic: str | None = None
    subject: str | None = None
    planned_minutes: int
    actual_minutes: int | None = None
    status: SessionStatus
    started_at: datetime
    ended_at: datetime | None = None
    visibility: Visibility
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SessionCreateDTO(CamelModel):
    id: str
    topic: str | None = None
    subject: str | None = None
    planned_minutes: int
    actual_minutes: int | None = None
    status: SessionStatus
    started_at: datetime
    ended_at: datetime | None = None
    visibility: Visibility
    created_at: datetime


class SessionDetailDTO(SessionCreateDTO):
    updated_at: datetime


class SessionCompleteDTO(CamelModel):
    id: str
    status: SessionStatus
    planned_minutes: int
    actual_minutes: int | None = None
    started_at: datetime
    ended_at: datetime | None = None
    visibility: Visibility


class SessionCancelDTO(CamelModel):
    id: str
    status: SessionStatus


class SessionListItemDTO(CamelModel):
    id: str
    topic: str | None = None
    subject: str | None = None
    planned_minutes: int
    actual_minutes: int | None = None
    status: SessionStatus
    started_at: datetime
    ended_at: datetime | None = None
    visibility: Visibility


class SessionNotePayload(CamelModel):
    summary: str = Field(min_length=1)
    insight: str | None = None
    mood: str | None = None
    tags: list[str] = Field(default_factory=list)


class SessionEmbeddedNoteDTO(CamelModel):
    summary: str
    insight: str | None = None
    mood: str | None = None
    tags: list[str] = Field(default_factory=list)


class SessionNoteReadDTO(SessionEmbeddedNoteDTO):
    session_id: str


class SessionNoteDTO(SessionNotePayload):
    session_id: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SessionResponse(CamelModel):
    session: SessionCreateDTO | SessionCompleteDTO | SessionCancelDTO


class SessionDetailResponse(CamelModel):
    session: SessionDetailDTO
    note: SessionEmbeddedNoteDTO | None = None


class SessionNoteResponse(CamelModel):
    note: SessionNoteDTO | SessionNoteReadDTO


class SessionListResponse(PageResponse[SessionListItemDTO]):
    pass
