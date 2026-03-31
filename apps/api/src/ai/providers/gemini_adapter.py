from __future__ import annotations

import asyncio
import json
import logging

from google import genai
from google.genai import types

from src.ai.base import (
    GeneratedQuiz,
    GradingResult,
    JitterChatTurn,
    QuizQuestion,
    SessionMode,
)
from src.ai.mappers.quiz_mapper import parse_generated_quiz, parse_grading_result

logger = logging.getLogger("niche.ai.gemini")


# ---------------------------------------------------------------------------
# System prompts — one per generation mode
# ---------------------------------------------------------------------------

_GENERATION_SYSTEM_TECHNICAL = (
    "You are a technical depth evaluator for NichE, a deep-focus session app.\n"
    "The user just completed a technical study session. Your job is to generate exactly 1 question\n"
    "that tests whether they can *apply* what they learned — not just recall it.\n"
    "The question should probe real-world application.\n"
    "Avoid trivia or yes/no questions. Reward depth of understanding over memorisation.\n"
    "Respond with valid JSON only. No markdown. No explanation outside the JSON."
)

_GENERATION_SYSTEM_INTEREST = (
    "You are a curiosity depth assessor for NichE, a deep-focus session app.\n"
    "The user just completed a niche-interest exploration session. Your job is to generate exactly 1 question\n"
    "that surfaces the quality of their discoveries and insights.\n"
    "The question should ask what they found most interesting or surprising.\n"
    "Avoid generic questions. The question must be grounded in the actual session content.\n"
    "Respond with valid JSON only. No markdown. No explanation outside the JSON."
)

_GENERATION_SYSTEM_LITERARY = (
    "You are a reflective reading companion for NichE, a deep-focus session app.\n"
    "The user just completed a reading session — a book, essay, or prose work.\n"
    "Your job is to generate exactly 1 question that invites them to share what resonated most.\n"
    "The question must explicitly invite quoting or naming a specific passage or scene.\n"
    "Avoid analytical or academic framing. The tone should feel like a quiet, genuine conversation.\n"
    "Respond with valid JSON only. No markdown. No explanation outside the JSON."
)

_GRADING_SYSTEM = (
    "You are a thoughtful evaluator for NichE, a deep-focus session app.\n"
    "Grade the user's written answers to reflection questions.\n"
    "Respond with valid JSON only. No markdown. No explanation outside the JSON."
)

_JITTER_SYSTEM = (
    "You are Jitter, the in-app companion for NichE — a quiet app for deep taste, reading, and reflection.\n"
    "You are not a generic chatbot. You speak with a calm, editorial tone: precise, restrained, and respectful.\n"
    "Help the user think about their interests, sessions, reading, and inner life — without productivity jargon,\n"
    "without hype, and without judging them. Prefer Korean for all replies unless the user writes only in another language.\n"
    "Keep answers concise. Do not use emojis. Do not claim to have seen private server data; optional local context\n"
    "may be appended below if the client provides it."
)


# ---------------------------------------------------------------------------
# Question schemas per mode
# ---------------------------------------------------------------------------

_TECHNICAL_QUESTIONS_SCHEMA = (
    "{\n"
    '  "questions": [\n'
    "    {\n"
    '      "sequence_no": 1,\n'
    '      "question_type": "concept_application",\n'
    '      "intent_label": "apply_in_context",\n'
    '      "prompt_text": "<Korean: ask how they would apply the core concept in a real situation>"\n'
    "    }\n"
    "  ]\n"
    "}"
)

_INTEREST_QUESTIONS_SCHEMA = (
    "{\n"
    '  "questions": [\n'
    "    {\n"
    '      "sequence_no": 1,\n'
    '      "question_type": "key_discovery",\n'
    '      "intent_label": "what_you_found",\n'
    '      "prompt_text": "<Korean: ask what was the most new or interesting thing they discovered>"\n'
    "    }\n"
    "  ]\n"
    "}"
)

_LITERARY_QUESTIONS_SCHEMA = (
    "{\n"
    '  "questions": [\n'
    "    {\n"
    '      "sequence_no": 1,\n'
    '      "question_type": "lasting_impression",\n'
    '      "intent_label": "memorable_passage",\n'
    '      "prompt_text": "<Korean: ask which specific sentence, scene, or moment stayed with them most — invite direct quoting>"\n'
    "    }\n"
    "  ]\n"
    "}"
)

_QUESTION_SCHEMAS: dict[SessionMode, str] = {
    "technical": _TECHNICAL_QUESTIONS_SCHEMA,
    "interest": _INTEREST_QUESTIONS_SCHEMA,
    "literary": _LITERARY_QUESTIONS_SCHEMA,
}

_GENERATION_SYSTEMS: dict[SessionMode, str] = {
    "technical": _GENERATION_SYSTEM_TECHNICAL,
    "interest": _GENERATION_SYSTEM_INTEREST,
    "literary": _GENERATION_SYSTEM_LITERARY,
}


# ---------------------------------------------------------------------------
# Grading criteria per mode
# ---------------------------------------------------------------------------

_GRADING_CRITERIA: dict[SessionMode, str] = {
    "technical": (
        "Grading criteria:\n"
        "- Reward answers that demonstrate real understanding of *how* to apply the concept.\n"
        "- Reward concrete, specific examples over abstract descriptions.\n"
        "- Penalise vague or generic answers that could apply to any topic.\n"
        "- An answer under 10 characters must receive a score of 0.\n"
        "- An answer under 30 characters should receive at most 20% of the max score."
    ),
    "interest": (
        "Grading criteria:\n"
        "- Reward answers that show genuine personal insight — not just a summary of facts.\n"
        "- Reward specificity: named examples, personal anecdotes, or unexpected observations.\n"
        "- Reward answers that make a real connection to the user's own life or other interests.\n"
        "- Penalise generic or surface-level observations.\n"
        "- An answer under 10 characters must receive a score of 0.\n"
        "- An answer under 30 characters should receive at most 20% of the max score."
    ),
    "literary": (
        "Grading criteria:\n"
        "- Reward personal authenticity above all — does the answer feel true to the reader's own experience?\n"
        "- Reward sensory or emotional specificity: named feelings, physical sensations, vivid descriptions.\n"
        "- Award a bonus when the answer includes a direct quote or names a specific passage.\n"
        "- Penalise analytical or academic framing (e.g. 'the author uses X technique to achieve Y').\n"
        "- An answer under 10 characters must receive a score of 0.\n"
        "- An answer under 30 characters should receive at most 20% of the max score."
    ),
}


# ---------------------------------------------------------------------------
# GeminiAdapter
# ---------------------------------------------------------------------------


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
            raise RuntimeError(
                f"AI call timed out after {self._timeout_seconds}s"
            ) from exc
        except Exception as exc:
            raise RuntimeError(f"AI call failed: {exc}") from exc
        if not response.text:
            raise RuntimeError("AI returned an empty response (possible safety filter)")
        return response.text

    async def _call_jitter(
        self,
        *,
        system: str,
        contents: list[types.Content],
    ) -> str:
        config = types.GenerateContentConfig(system_instruction=system)
        try:
            response = await asyncio.wait_for(
                self._client.aio.models.generate_content(
                    model=self._model_name,
                    contents=contents,
                    config=config,
                ),
                timeout=self._timeout_seconds,
            )
        except asyncio.TimeoutError as exc:
            raise RuntimeError(
                f"AI call timed out after {self._timeout_seconds}s"
            ) from exc
        except Exception as exc:
            raise RuntimeError(f"AI call failed: {exc}") from exc
        if not response.text:
            raise RuntimeError("AI returned an empty response (possible safety filter)")
        return response.text

    async def jitter_chat(
        self,
        *,
        messages: list[JitterChatTurn],
        context_summary: str | None,
    ) -> str:
        system = _JITTER_SYSTEM
        if context_summary and context_summary.strip():
            system = (
                f"{_JITTER_SYSTEM}\n\n"
                "---\n"
                "Optional context from the user's app (may be incomplete):\n"
                f"{context_summary.strip()}"
            )

        contents: list[types.Content] = []
        for turn in messages:
            gemini_role = "user" if turn.role == "user" else "model"
            contents.append(
                types.Content(
                    role=gemini_role,
                    parts=[types.Part(text=turn.content)],
                )
            )

        text = await self._call_jitter(system=system, contents=contents)
        logger.info("event=ai.jitter_chat turns=%s", len(messages))
        return text

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
    ) -> GeneratedQuiz:
        tags_str = ", ".join(session_tags) if session_tags else "none"
        schema = _QUESTION_SCHEMAS[session_mode]
        system = _GENERATION_SYSTEMS[session_mode]

        user_prompt = (
            f"Session topic: {session_topic or 'unspecified'}\n"
            f"Session subject: {session_subject or 'unspecified'}\n"
            f"What the user explored (summary): {session_summary}\n"
            f"Key insight noted: {session_insight or 'none'}\n"
            f"Mood: {session_mood or 'unspecified'}\n"
            f"Tags: {tags_str}\n\n"
            f"Generate exactly 1 question in this JSON format:\n"
            f"{schema}\n\n"
            "Rules:\n"
            "- All prompt_text must be in Korean\n"
            "- No yes/no questions\n"
            "- No multiple choice\n"
            '- No school-exam tone ("다음 중 올바른 것은?" style is forbidden)\n'
            "- The question must be grounded in the actual session content above"
        )

        text = await self._call(system=system, user=user_prompt)

        try:
            raw = json.loads(text)
        except (json.JSONDecodeError, ValueError) as exc:
            raise RuntimeError("AI response was not valid JSON") from exc

        try:
            result = parse_generated_quiz(raw)
        except ValueError as exc:
            raise RuntimeError(f"AI response had unexpected structure: {exc}") from exc
        logger.info(
            "event=ai.generate_quiz mode=%s questions=%s",
            session_mode,
            len(result.questions),
        )
        return result

    async def grade_quiz(
        self,
        *,
        session_mode: SessionMode,
        session_summary: str,
        session_insight: str | None,
        questions: list[QuizQuestion],
        answers: list[str],
    ) -> GradingResult:
        if len(questions) != 1:
            raise RuntimeError(
                f"Expected 1 question for grading, got {len(questions)}"
            )

        q1 = questions[0]
        context = session_summary
        if session_insight:
            context += f". {session_insight}"

        criteria = _GRADING_CRITERIA[session_mode]

        user_prompt = (
            f"Session context: {context}\n\n"
            f"Question and answer:\n"
            f"Q1 (max 100 pts): {q1.prompt_text}\n"
            f"A1: {answers[0]}\n\n"
            f"{criteria}\n\n"
            "Respond in this exact JSON format:\n"
            "{\n"
            '  "total_score": <integer 0-100>,\n'
            '  "max_score": 100,\n'
            '  "overall_comment": "<2-3 sentences in Korean, warm but honest>",\n'
            '  "question_grades": [\n'
            '    {"sequence_no": 1, "score": <int>, "max_score": 100, "comment": "<1 sentence in Korean>"}\n'
            "  ]\n"
            "}"
        )

        text = await self._call(system=_GRADING_SYSTEM, user=user_prompt)

        try:
            raw = json.loads(text)
        except (json.JSONDecodeError, ValueError) as exc:
            raise RuntimeError("AI response was not valid JSON") from exc

        try:
            result = parse_grading_result(raw)
        except ValueError as exc:
            raise RuntimeError(f"AI response had unexpected structure: {exc}") from exc
        logger.info(
            "event=ai.grade_quiz mode=%s total_score=%s max_score=%s",
            session_mode,
            result.total_score,
            result.max_score,
        )
        return result
