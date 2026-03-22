from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class QuizAttemptRecord:
    id: str
    quiz_id: str
    profile_id: str
    answer: str
    score: int
    feedback: str
    created_at: datetime
