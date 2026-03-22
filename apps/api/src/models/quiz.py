from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class QuizRecord:
    id: str
    session_id: str
    profile_id: str
    question: str
    created_at: datetime
