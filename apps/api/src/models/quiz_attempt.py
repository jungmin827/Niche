from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class QuizAttemptRecord:
    id: str
    quiz_id: str
    profile_id: str
    answers: list[str]  # [answer_q1, answer_q2, answer_q3]
    total_score: int
    overall_feedback: str
    question_grades: list  # list[QuizAnswerGrade] from ai/base
    created_at: datetime
