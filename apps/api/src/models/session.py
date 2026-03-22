from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

SessionStatus = Literal["active", "completed", "cancelled"]
Visibility = Literal["public", "private"]


@dataclass(slots=True)
class SessionRecord:
    id: str
    profile_id: str
    topic: str | None
    subject: str | None
    planned_minutes: int
    actual_minutes: int | None
    started_at: datetime
    ended_at: datetime | None
    status: SessionStatus
    visibility: Visibility
    source: str | None
    is_highlight_eligible: bool
    created_at: datetime
    updated_at: datetime
