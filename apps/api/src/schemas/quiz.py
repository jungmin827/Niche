from __future__ import annotations

from datetime import datetime
from typing import Literal

from src.schemas.common import CamelModel

QuizJobStatus = Literal["pending", "processing", "done", "failed"]


class QuizJobCreateRequest(CamelModel):
    session_id: str


class QuizJobDTO(CamelModel):
    id: str
    status: QuizJobStatus
    quiz_id: str | None = None


class QuizJobResponse(CamelModel):
    job: QuizJobDTO


class QuizDTO(CamelModel):
    id: str
    session_id: str
    question: str
    created_at: datetime


class QuizResponse(CamelModel):
    quiz: QuizDTO


class QuizAttemptCreateRequest(CamelModel):
    answer: str


class QuizAttemptDTO(CamelModel):
    id: str
    quiz_id: str
    answer: str
    score: int
    feedback: str
    created_at: datetime


class QuizAttemptResponse(CamelModel):
    attempt: QuizAttemptDTO
