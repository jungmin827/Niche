from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class SessionNoteRecord:
    session_id: str
    profile_id: str
    summary: str
    insight: str | None
    mood: str | None
    tags: list[str]
    created_at: datetime
    updated_at: datetime
