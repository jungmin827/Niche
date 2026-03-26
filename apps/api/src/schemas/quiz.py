from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field

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


class QuizQuestionDTO(CamelModel):
    sequence_no: int
    question_type: str
    intent_label: str
    prompt_text: str


class QuizDTO(CamelModel):
    id: str
    session_id: str
    questions: list[QuizQuestionDTO]
    created_at: datetime


class QuizResponse(CamelModel):
    quiz: QuizDTO


class QuizAttemptCreateRequest(CamelModel):
    answers: Annotated[list[str], Field(min_length=1, max_length=1)]


class QuizAnswerGradeDTO(CamelModel):
    sequence_no: int
    score: int
    max_score: int
    comment: str


class QuizAttemptDTO(CamelModel):
    id: str
    quiz_id: str
    answers: list[str]
    total_score: int
    overall_feedback: str
    question_grades: list[QuizAnswerGradeDTO]
    created_at: datetime


class QuizAttemptResponse(CamelModel):
    attempt: QuizAttemptDTO


class QuizAttemptGradeDetailDTO(CamelModel):
    question_id: str
    order: int
    score: int
    max_score: int
    feedback: str


class QuizAttemptDetailDTO(CamelModel):
    attempt_id: str
    quiz_id: str
    total_score: int
    overall_feedback: str
    question_grades: list[QuizAttemptGradeDetailDTO]


class SessionQuizResultResponse(CamelModel):
    total_score: int | None = None
