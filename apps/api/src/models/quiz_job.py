from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

QuizJobStatus = Literal["pending", "processing", "done", "failed"]


@dataclass(slots=True)
class QuizJobRecord:
    id: str
    session_id: str
    profile_id: str
    status: QuizJobStatus
    quiz_id: str | None
    created_at: datetime
    updated_at: datetime
