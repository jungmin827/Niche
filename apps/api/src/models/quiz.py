from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class QuizRecord:
    id: str
    session_id: str
    profile_id: str
    questions: list        # list[QuizQuestion] at runtime — typed loosely to avoid circular import
    created_at: datetime
