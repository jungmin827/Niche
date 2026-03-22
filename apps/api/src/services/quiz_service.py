from __future__ import annotations

import logging
from dataclasses import replace
from datetime import datetime, timezone
from uuid import uuid4

from src import error_codes
from src.exceptions import ConflictError, ForbiddenError, NotFoundError
from src.models.quiz import QuizRecord
from src.models.quiz_attempt import QuizAttemptRecord
from src.models.quiz_job import QuizJobRecord
from src.repositories.quiz_job_repo import QuizRepository
from src.repositories.session_repo import SessionRepository
from src.schemas.quiz import (
    QuizAttemptCreateRequest,
    QuizAttemptDTO,
    QuizAttemptResponse,
    QuizDTO,
    QuizJobCreateRequest,
    QuizJobDTO,
    QuizJobResponse,
    QuizResponse,
)
from src.middleware.request_id import get_request_id
from src.security import AuthenticatedUser

logger = logging.getLogger("niche.quiz")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class QuizService:
    def __init__(
        self,
        *,
        quiz_repository: QuizRepository,
        session_repository: SessionRepository,
    ) -> None:
        self._quiz_repository = quiz_repository
        self._session_repository = session_repository

    async def create_job(
        self,
        *,
        current_user: AuthenticatedUser,
        payload: QuizJobCreateRequest,
    ) -> QuizJobResponse:
        session = await self._session_repository.get_session(session_id=payload.session_id)
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
            raise ConflictError(
                code=error_codes.QUIZ_ALREADY_EXISTS,
                message="A quiz already exists for this session.",
            )

        now = _utc_now()
        # TODO: replace with real AI call — currently creates a stub quiz synchronously
        quiz = await self._quiz_repository.create_quiz(
            quiz=QuizRecord(
                id=str(uuid4()),
                session_id=payload.session_id,
                profile_id=current_user.profile_id,
                question=_build_stub_question(topic=session.topic, subject=session.subject),
                created_at=now,
            )
        )

        job = await self._quiz_repository.create_job(
            job=QuizJobRecord(
                id=str(uuid4()),
                session_id=payload.session_id,
                profile_id=current_user.profile_id,
                status="done",
                quiz_id=quiz.id,
                created_at=now,
                updated_at=now,
            )
        )
        logger.info(
            "request_id=%s event=quiz.job.create job_id=%s quiz_id=%s session_id=%s",
            get_request_id(),
            job.id,
            quiz.id,
            payload.session_id,
        )
        return QuizJobResponse(job=QuizJobDTO(id=job.id, status=job.status, quizId=job.quiz_id))

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
        return QuizJobResponse(job=QuizJobDTO(id=job.id, status=job.status, quizId=job.quiz_id))

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
        return QuizResponse(quiz=QuizDTO(
            id=quiz.id,
            sessionId=quiz.session_id,
            question=quiz.question,
            createdAt=quiz.created_at,
        ))

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

        now = _utc_now()
        # TODO: replace with real AI scoring — currently returns a fixed stub score
        attempt = await self._quiz_repository.create_attempt(
            attempt=QuizAttemptRecord(
                id=str(uuid4()),
                quiz_id=quiz_id,
                profile_id=current_user.profile_id,
                answer=payload.answer,
                score=70,
                feedback="잘 정리된 답변입니다. 핵심 개념을 잘 파악하셨어요.",
                created_at=now,
            )
        )
        logger.info(
            "request_id=%s event=quiz.attempt.submit attempt_id=%s quiz_id=%s score=%s",
            get_request_id(),
            attempt.id,
            quiz_id,
            attempt.score,
        )
        return QuizAttemptResponse(
            attempt=QuizAttemptDTO(
                id=attempt.id,
                quizId=attempt.quiz_id,
                answer=attempt.answer,
                score=attempt.score,
                feedback=attempt.feedback,
                createdAt=attempt.created_at,
            )
        )


def _build_stub_question(*, topic: str | None, subject: str | None) -> str:
    # TODO: replace with AI-generated question from session note content
    label = subject or topic or "이번 세션"
    return f"{label}에서 가장 중요하게 느낀 점을 한 문장으로 설명해보세요."
