from __future__ import annotations

import asyncio
import json
import logging

from google import genai
from google.genai import types

from src.ai.base import AIProvider, GeneratedQuiz, GradingResult, QuizQuestion
from src.ai.mappers.quiz_mapper import parse_generated_quiz, parse_grading_result

logger = logging.getLogger("niche.ai.gemini")

_GENERATION_SYSTEM = (
    "You are a reflective assessment generator for NichE, a deep-focus session app.\n"
    "Your job is to create exactly 3 open-ended reflection questions based on a user's session notes.\n"
    "Questions must invite genuine personal reflection — not factual recall or multiple choice.\n"
    "Respond with valid JSON only. No markdown. No explanation outside the JSON."
)

_GRADING_SYSTEM = (
    "You are a thoughtful evaluator for NichE, a deep-focus session app.\n"
    "Grade the user's written answers to reflection questions.\n"
    "Reward genuine thought, specificity, and personal insight — not length or grammar.\n"
    "Respond with valid JSON only. No markdown. No explanation outside the JSON."
)


class GeminiAdapter:
    def __init__(self, *, api_key: str, model: str, timeout_seconds: int) -> None:
        self._client = genai.Client(api_key=api_key)
        self._model_name = model
        self._timeout_seconds = timeout_seconds

    async def _call(self, *, system: str, user: str) -> str:
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=system,
        )
        try:
            response = await asyncio.wait_for(
                self._client.aio.models.generate_content(
                    model=self._model_name,
                    contents=user,
                    config=config,
                ),
                timeout=self._timeout_seconds,
            )
        except asyncio.TimeoutError as exc:
            raise RuntimeError(f"AI call timed out after {self._timeout_seconds}s") from exc
        except Exception as exc:
            raise RuntimeError(f"AI call failed: {exc}") from exc
        return response.text

    async def generate_quiz(
        self,
        *,
        session_topic: str | None,
        session_subject: str | None,
        session_summary: str,
        session_insight: str | None,
        session_mood: str | None,
        session_tags: list[str],
    ) -> GeneratedQuiz:
        tags_str = ", ".join(session_tags) if session_tags else "none"
        user_prompt = (
            f"Session topic: {session_topic or 'unspecified'}\n"
            f"Session subject: {session_subject or 'unspecified'}\n"
            f"What the user explored (summary): {session_summary}\n"
            f"Key insight noted: {session_insight or 'none'}\n"
            f"Mood: {session_mood or 'unspecified'}\n"
            f"Tags: {tags_str}\n\n"
            "Generate exactly 3 questions in this JSON format:\n"
            '{\n'
            '  "questions": [\n'
            '    {\n'
            '      "sequence_no": 1,\n'
            '      "question_type": "recall",\n'
            '      "intent_label": "recall_summary",\n'
            '      "prompt_text": "<question text in Korean, 1\u20132 sentences, open-ended>"\n'
            '    },\n'
            '    {\n'
            '      "sequence_no": 2,\n'
            '      "question_type": "interpretation",\n'
            '      "intent_label": "meaning_interpretation",\n'
            '      "prompt_text": "<question text in Korean, 1\u20132 sentences, open-ended>"\n'
            '    },\n'
            '    {\n'
            '      "sequence_no": 3,\n'
            '      "question_type": "reflection",\n'
            '      "intent_label": "personal_reflection",\n'
            '      "prompt_text": "<question text in Korean, 1\u20132 sentences, open-ended>"\n'
            '    }\n'
            '  ]\n'
            '}\n\n'
            "Rules:\n"
            "- All prompt_text must be in Korean\n"
            "- No yes/no questions\n"
            "- No multiple choice\n"
            "- No school-exam tone (\"\ub2e4\uc74c \uc911 \uc62c\ubc14\ub978 \uac83\uc740?\" style is forbidden)\n"
            "- Questions must be grounded in the actual session content"
        )

        text = await self._call(system=_GENERATION_SYSTEM, user=user_prompt)

        try:
            raw = json.loads(text)
        except (json.JSONDecodeError, ValueError) as exc:
            raise RuntimeError("AI response was not valid JSON") from exc

        result = parse_generated_quiz(raw)
        logger.info("event=ai.generate_quiz questions=%s", len(result.questions))
        return result

    async def grade_quiz(
        self,
        *,
        session_summary: str,
        session_insight: str | None,
        questions: list[QuizQuestion],
        answers: list[str],
    ) -> GradingResult:
        q1, q2, q3 = questions[0], questions[1], questions[2]
        context = session_summary
        if session_insight:
            context += f". {session_insight}"

        user_prompt = (
            f"Session context: {context}\n\n"
            f"Questions and answers:\n"
            f"Q1 (recall, max 30 pts): {q1.prompt_text}\n"
            f"A1: {answers[0]}\n\n"
            f"Q2 (interpretation, max 30 pts): {q2.prompt_text}\n"
            f"A2: {answers[1]}\n\n"
            f"Q3 (personal reflection, max 40 pts): {q3.prompt_text}\n"
            f"A3: {answers[2]}\n\n"
            "Grade each answer using these criteria: relevance to session content, specificity, depth of reflection.\n"
            "An answer under 10 characters must receive a score of 0.\n"
            "An answer under 30 characters should receive at most 30% of the max score.\n\n"
            "Respond in this exact JSON format:\n"
            '{\n'
            '  "total_score": <integer 0-100>,\n'
            '  "max_score": 100,\n'
            '  "overall_comment": "<2\u20133 sentences in Korean, warm but honest>",\n'
            '  "question_grades": [\n'
            '    {"sequence_no": 1, "score": <int>, "max_score": 30, "comment": "<1 sentence in Korean>"},\n'
            '    {"sequence_no": 2, "score": <int>, "max_score": 30, "comment": "<1 sentence in Korean>"},\n'
            '    {"sequence_no": 3, "score": <int>, "max_score": 40, "comment": "<1 sentence in Korean>"}\n'
            '  ]\n'
            '}'
        )

        text = await self._call(system=_GRADING_SYSTEM, user=user_prompt)

        try:
            raw = json.loads(text)
        except (json.JSONDecodeError, ValueError) as exc:
            raise RuntimeError("AI response was not valid JSON") from exc

        result = parse_grading_result(raw)
        logger.info(
            "event=ai.grade_quiz total_score=%s max_score=%s",
            result.total_score,
            result.max_score,
        )
        return result
