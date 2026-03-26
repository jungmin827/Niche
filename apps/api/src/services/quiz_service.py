from __future__ import annotations

import logging
from dataclasses import replace
from datetime import datetime, timezone
from uuid import uuid4

from src import error_codes
from src.ai.base import AIProvider, QuizQuestion, SessionMode
from src.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ServiceUnavailableAppError,
    ValidationAppError,
)
from src.middleware.request_id import get_request_id
from src.models.quiz import QuizRecord
from src.models.quiz_attempt import QuizAttemptRecord
from src.models.quiz_job import QuizJobRecord
from src.repositories.quiz_job_repo import QuizRepository
from src.repositories.session_repo import SessionRepository
from src.services.rank_service import RankService
from src.schemas.quiz import (
    QuizAnswerGradeDTO,
    QuizAttemptCreateRequest,
    QuizAttemptDetailDTO,
    QuizAttemptDTO,
    QuizAttemptGradeDetailDTO,
    QuizAttemptResponse,
    QuizDTO,
    QuizJobCreateRequest,
    QuizJobDTO,
    QuizJobResponse,
    QuizQuestionDTO,
    QuizResponse,
)
from src.security import AuthenticatedUser

logger = logging.getLogger("niche.quiz")

_LITERARY_SOURCES = {"book", "article", "essay", "prose"}
_TECHNICAL_SOURCES = {"tech", "code", "engineering", "paper", "research"}


def _detect_session_mode(source: str | None) -> SessionMode:
    if source and source.lower() in _LITERARY_SOURCES:
        return "literary"
    if source and source.lower() in _TECHNICAL_SOURCES:
        return "technical"
    return "interest"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _quiz_questions_to_dto(questions: list) -> list[QuizQuestionDTO]:
    return [
        QuizQuestionDTO(
            sequence_no=q.sequence_no,
            question_type=q.question_type,
            intent_label=q.intent_label,
            prompt_text=q.prompt_text,
        )
        for q in questions
    ]


def _grade_dtos(question_grades: list) -> list[QuizAnswerGradeDTO]:
    return [
        QuizAnswerGradeDTO(
            sequence_no=g.sequence_no,
            score=g.score,
            max_score=g.max_score,
            comment=g.comment,
        )
        for g in question_grades
    ]


class QuizService:
    def __init__(
        self,
        *,
        quiz_repository: QuizRepository,
        session_repository: SessionRepository,
        ai_provider: AIProvider,
        rank_service: RankService,
    ) -> None:
        self._quiz_repository = quiz_repository
        self._session_repository = session_repository
        self._ai_provider = ai_provider
        self._rank_service = rank_service

    async def create_job(
        self,
        *,
        current_user: AuthenticatedUser,
        payload: QuizJobCreateRequest,
    ) -> QuizJobResponse:
        session = await self._session_repository.get_session(
            session_id=payload.session_id
        )
        if session is None:
            raise NotFoundError(
                code=error_codes.SESSION_NOT_FOUND,
                message="Session not found.",
            )
        if session.profile_id != current_user.profile_id:
            raise ForbiddenError()

        existing_quiz = await self._quiz_repository.get_quiz_by_session(
            session_id=payload.session_id
        )
        if existing_quiz is not None:
            existing_job = await self._quiz_repository.get_job_by_session_id(
                session_id=payload.session_id
            )
            if existing_job is not None:
                if existing_job.status == "done":
                    return QuizJobResponse(
                        job=QuizJobDTO(
                            id=existing_job.id,
                            status=existing_job.status,
                            quiz_id=existing_job.quiz_id,
                        )
                    )
                # Job is in failed/processing state but quiz exists — heal the inconsistency
                logger.info(
                    "request_id=%s event=quiz.job.heal job_id=%s status=%s quiz_id=%s",
                    get_request_id(),
                    existing_job.id,
                    existing_job.status,
                    existing_quiz.id,
                )
                healed_job = replace(
                    existing_job,
                    status="done",
                    quiz_id=existing_quiz.id,
                    updated_at=_utc_now(),
                )
                healed_job = await self._quiz_repository.update_job(job=healed_job)
                return QuizJobResponse(
                    job=QuizJobDTO(
                        id=healed_job.id,
                        status=healed_job.status,
                        quiz_id=healed_job.quiz_id,
                    )
                )
            raise ConflictError(
                code=error_codes.QUIZ_ALREADY_EXISTS,
                message="A quiz already exists for this session.",
            )

        note = await self._session_repository.get_note(session_id=payload.session_id)
        session_summary = (
            note.summary if note else (session.topic or session.subject or "unspecified")
        )
        session_insight = note.insight if note else None
        session_mood = note.mood if note else None
        session_tags = note.tags if note else []

        now = _utc_now()
        job = await self._quiz_repository.create_job(
            job=QuizJobRecord(
                id=str(uuid4()),
                session_id=payload.session_id,
                profile_id=current_user.profile_id,
                status="processing",
                quiz_id=None,
                created_at=now,
                updated_at=now,
            )
        )
        logger.info(
            "request_id=%s event=quiz.job.start job_id=%s session_id=%s has_note=%s",
            get_request_id(),
            job.id,
            payload.session_id,
            note is not None,
        )

        session_mode = _detect_session_mode(session.source)
        logger.info(
            "request_id=%s event=quiz.mode.detected mode=%s source=%s",
            get_request_id(),
            session_mode,
            session.source,
        )

        try:
            generated = await self._ai_provider.generate_quiz(
                session_mode=session_mode,
                session_topic=session.topic,
                session_subject=session.subject,
                session_summary=session_summary,
                session_insight=session_insight,
                session_mood=session_mood,
                session_tags=session_tags,
            )
        except RuntimeError as exc:
            logger.exception(
                "request_id=%s event=quiz.generation.failed job_id=%s reason=%s",
                get_request_id(),
                job.id,
                exc,
            )
            failed_job = replace(job, status="failed", updated_at=_utc_now())
            await self._quiz_repository.update_job(job=failed_job)
            raise ServiceUnavailableAppError(
                "Quiz generation failed. Please try again later.",
                details={"jobId": job.id},
            ) from exc

        quiz = await self._quiz_repository.create_quiz(
            quiz=QuizRecord(
                id=str(uuid4()),
                session_id=payload.session_id,
                profile_id=current_user.profile_id,
                questions=generated.questions,
                created_at=_utc_now(),
            )
        )

        done_job = replace(job, status="done", quiz_id=quiz.id, updated_at=_utc_now())
        done_job = await self._quiz_repository.update_job(job=done_job)

        logger.info(
            "request_id=%s event=quiz.job.done job_id=%s quiz_id=%s session_id=%s",
            get_request_id(),
            done_job.id,
            quiz.id,
            payload.session_id,
        )
        return QuizJobResponse(
            job=QuizJobDTO(
                id=done_job.id, status=done_job.status, quiz_id=done_job.quiz_id
            )
        )

    async def get_job(
        self,
        *,
        current_user: AuthenticatedUser,
        job_id: str,
    ) -> QuizJobResponse:
        job = await self._quiz_repository.get_job(job_id=job_id)
        if job is None:
            raise NotFoundError(
                code=error_codes.QUIZ_JOB_NOT_FOUND,
                message="Quiz job not found.",
            )
        if job.profile_id != current_user.profile_id:
            raise ForbiddenError()
        return QuizJobResponse(
            job=QuizJobDTO(id=job.id, status=job.status, quiz_id=job.quiz_id)
        )

    async def get_quiz(
        self,
        *,
        current_user: AuthenticatedUser,
        quiz_id: str,
    ) -> QuizResponse:
        quiz = await self._quiz_repository.get_quiz(quiz_id=quiz_id)
        if quiz is None:
            raise NotFoundError(
                code=error_codes.QUIZ_NOT_FOUND,
                message="Quiz not found.",
            )
        if quiz.profile_id != current_user.profile_id:
            raise ForbiddenError()
        return QuizResponse(
            quiz=QuizDTO(
                id=quiz.id,
                session_id=quiz.session_id,
                questions=_quiz_questions_to_dto(quiz.questions),
                created_at=quiz.created_at,
            )
        )

    async def submit_attempt(
        self,
        *,
        current_user: AuthenticatedUser,
        quiz_id: str,
        payload: QuizAttemptCreateRequest,
    ) -> QuizAttemptResponse:
        quiz = await self._quiz_repository.get_quiz(quiz_id=quiz_id)
        if quiz is None:
            raise NotFoundError(
                code=error_codes.QUIZ_NOT_FOUND,
                message="Quiz not found.",
            )
        if quiz.profile_id != current_user.profile_id:
            raise ForbiddenError()

        existing = await self._quiz_repository.get_attempt_by_quiz(quiz_id=quiz_id)
        if existing is not None:
            raise ConflictError(
                code=error_codes.QUIZ_ALREADY_ATTEMPTED,
                message="This quiz has already been submitted.",
            )

        if len(payload.answers) != 1:
            raise ValidationAppError(
                "Expected exactly 1 answer.",
                details={"expected": 1, "actual": len(payload.answers)},
            )

        session = await self._session_repository.get_session(session_id=quiz.session_id)
        note = await self._session_repository.get_note(session_id=quiz.session_id)
        session_summary = note.summary if note else (session.topic if session else "")
        session_insight = note.insight if note else None
        grading_mode = _detect_session_mode(session.source if session else None)

        questions: list[QuizQuestion] = quiz.questions

        try:
            grading = await self._ai_provider.grade_quiz(
                session_mode=grading_mode,
                session_summary=session_summary,
                session_insight=session_insight,
                questions=questions,
                answers=payload.answers,
            )
        except RuntimeError as exc:
            logger.exception(
                "request_id=%s event=quiz.grading.failed quiz_id=%s reason=%s",
                get_request_id(),
                quiz_id,
                exc,
            )
            raise ServiceUnavailableAppError(
                "Quiz grading failed. Please try again later.",
                details={"quizId": quiz_id},
            ) from exc

        attempt = await self._quiz_repository.create_attempt(
            attempt=QuizAttemptRecord(
                id=str(uuid4()),
                quiz_id=quiz_id,
                profile_id=current_user.profile_id,
                answers=payload.answers,
                total_score=grading.total_score,
                overall_feedback=grading.overall_comment,
                question_grades=grading.question_grades,
                created_at=_utc_now(),
            )
        )
        await self._rank_service.add_score(
            profile_id=current_user.profile_id,
            points=attempt.total_score,
        )
        logger.info(
            "request_id=%s event=quiz.attempt.submit attempt_id=%s quiz_id=%s total_score=%s",
            get_request_id(),
            attempt.id,
            quiz_id,
            attempt.total_score,
        )
        return QuizAttemptResponse(
            attempt=QuizAttemptDTO(
                id=attempt.id,
                quiz_id=attempt.quiz_id,
                answers=attempt.answers,
                total_score=attempt.total_score,
                overall_feedback=attempt.overall_feedback,
                question_grades=_grade_dtos(attempt.question_grades),
                created_at=attempt.created_at,
            )
        )

    async def get_session_quiz_score(self, session_id: str) -> int | None:
        job = await self._quiz_repository.get_job_by_session_id(session_id=session_id)
        if job is None or job.quiz_id is None:
            return None
        attempt = await self._quiz_repository.get_attempt_by_quiz(quiz_id=job.quiz_id)
        if attempt is None:
            return None
        return attempt.total_score

    async def get_attempt(
        self,
        *,
        current_user: AuthenticatedUser,
        quiz_id: str,
        attempt_id: str,
    ) -> QuizAttemptDetailDTO:
        quiz = await self._quiz_repository.get_quiz(quiz_id=quiz_id)
        if quiz is None:
            raise NotFoundError(
                code=error_codes.QUIZ_NOT_FOUND,
                message="Quiz not found.",
            )
        if quiz.profile_id != current_user.profile_id:
            raise ForbiddenError()

        attempt = await self._quiz_repository.get_attempt(attempt_id=attempt_id)
        if attempt is None or attempt.quiz_id != quiz_id:
            raise NotFoundError(
                code=error_codes.QUIZ_ATTEMPT_NOT_FOUND,
                message="Attempt not found.",
            )

        return QuizAttemptDetailDTO(
            attempt_id=attempt.id,
            quiz_id=attempt.quiz_id,
            total_score=attempt.total_score,
            overall_feedback=attempt.overall_feedback,
            question_grades=[
                QuizAttemptGradeDetailDTO(
                    question_id=str(g.sequence_no),
                    order=g.sequence_no,
                    score=g.score,
                    max_score=g.max_score,
                    feedback=g.comment,
                )
                for g in attempt.question_grades
            ],
        )
