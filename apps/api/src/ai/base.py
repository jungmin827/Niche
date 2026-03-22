from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass
class QuizQuestion:
    sequence_no: int           # 1, 2, or 3
    question_type: str         # "recall", "interpretation", "reflection"
    intent_label: str          # "recall_summary", "meaning_interpretation", "personal_reflection"
    prompt_text: str


@dataclass
class GeneratedQuiz:
    questions: list[QuizQuestion]


@dataclass
class QuizAnswerGrade:
    sequence_no: int
    score: int
    max_score: int
    comment: str


@dataclass
class GradingResult:
    total_score: int
    max_score: int             # always 100
    overall_comment: str
    question_grades: list[QuizAnswerGrade]


class AIProvider(Protocol):
    async def generate_quiz(
        self,
        *,
        session_topic: str | None,
        session_subject: str | None,
        session_summary: str,
        session_insight: str | None,
        session_mood: str | None,
        session_tags: list[str],
    ) -> GeneratedQuiz: ...

    async def grade_quiz(
        self,
        *,
        session_summary: str,
        session_insight: str | None,
        questions: list[QuizQuestion],
        answers: list[str],         # index 0 = Q1, 1 = Q2, 2 = Q3
    ) -> GradingResult: ...
