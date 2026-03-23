from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

# Determined by session.source field at quiz generation time.
# technical : tech / code / engineering / paper → concept application questions
# interest  : niche hobby/curiosity (default)  → discovery & insight questions
# literary  : book / article / essay / prose   → resonance & feeling questions
SessionMode = Literal["technical", "interest", "literary"]


@dataclass
class QuizQuestion:
    sequence_no: int
    question_type: str  # varies by SessionMode (see gemini_adapter.py)
    intent_label: str
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
    max_score: int  # always 100
    overall_comment: str
    question_grades: list[QuizAnswerGrade]


class AIProvider(Protocol):
    async def generate_quiz(
        self,
        *,
        session_mode: SessionMode,
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
        session_mode: SessionMode,
        session_summary: str,
        session_insight: str | None,
        questions: list[QuizQuestion],
        answers: list[str],  # index 0 = Q1, 1 = Q2, 2 = Q3
    ) -> GradingResult: ...
