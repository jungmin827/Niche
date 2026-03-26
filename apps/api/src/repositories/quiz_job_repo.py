from __future__ import annotations

from dataclasses import asdict
from datetime import timezone
from typing import Any, Protocol

try:
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    from src.models.base import QuizJobStatusDBEnum
    from src.models.quiz_tables import QuizAttemptTable, QuizJobTable, QuizTable
except ModuleNotFoundError:  # pragma: no cover
    select = None
    AsyncSession = Any
    async_sessionmaker = Any
    QuizJobStatusDBEnum = None
    QuizAttemptTable = None
    QuizJobTable = None
    QuizTable = None

from src.ai.base import QuizAnswerGrade, QuizQuestion
from src.models.quiz import QuizRecord
from src.models.quiz_attempt import QuizAttemptRecord
from src.models.quiz_job import QuizJobRecord


def _normalize_dt(value: Any) -> Any:
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


class QuizRepository(Protocol):
    async def create_job(self, *, job: QuizJobRecord) -> QuizJobRecord: ...

    async def get_job(self, *, job_id: str) -> QuizJobRecord | None: ...

    async def update_job(self, *, job: QuizJobRecord) -> QuizJobRecord: ...

    async def create_quiz(self, *, quiz: QuizRecord) -> QuizRecord: ...

    async def get_quiz(self, *, quiz_id: str) -> QuizRecord | None: ...

    async def get_quiz_by_session(self, *, session_id: str) -> QuizRecord | None: ...

    async def create_attempt(
        self, *, attempt: QuizAttemptRecord
    ) -> QuizAttemptRecord: ...

    async def get_attempt_by_quiz(
        self, *, quiz_id: str
    ) -> QuizAttemptRecord | None: ...

    async def get_attempt(self, *, attempt_id: str) -> QuizAttemptRecord | None: ...

    async def get_job_by_session_id(
        self, *, session_id: str
    ) -> QuizJobRecord | None: ...


class InMemoryQuizRepository:
    def __init__(self) -> None:
        self._jobs: dict[str, QuizJobRecord] = {}
        self._quizzes: dict[str, QuizRecord] = {}
        self._attempts: dict[str, QuizAttemptRecord] = {}

    async def create_job(self, *, job: QuizJobRecord) -> QuizJobRecord:
        self._jobs[job.id] = job
        return job

    async def get_job(self, *, job_id: str) -> QuizJobRecord | None:
        return self._jobs.get(job_id)

    async def update_job(self, *, job: QuizJobRecord) -> QuizJobRecord:
        self._jobs[job.id] = job
        return job

    async def create_quiz(self, *, quiz: QuizRecord) -> QuizRecord:
        self._quizzes[quiz.id] = quiz
        return quiz

    async def get_quiz(self, *, quiz_id: str) -> QuizRecord | None:
        return self._quizzes.get(quiz_id)

    async def get_quiz_by_session(self, *, session_id: str) -> QuizRecord | None:
        for quiz in self._quizzes.values():
            if quiz.session_id == session_id:
                return quiz
        return None

    async def create_attempt(self, *, attempt: QuizAttemptRecord) -> QuizAttemptRecord:
        self._attempts[attempt.id] = attempt
        return attempt

    async def get_attempt_by_quiz(self, *, quiz_id: str) -> QuizAttemptRecord | None:
        for attempt in self._attempts.values():
            if attempt.quiz_id == quiz_id:
                return attempt
        return None

    async def get_attempt(self, *, attempt_id: str) -> QuizAttemptRecord | None:
        return self._attempts.get(attempt_id)

    async def get_job_by_session_id(self, *, session_id: str) -> QuizJobRecord | None:
        for job in self._jobs.values():
            if job.session_id == session_id:
                return job
        return None


class PostgresQuizRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    # --- helpers ---

    @staticmethod
    def _to_job_record(row: QuizJobTable) -> QuizJobRecord:
        return QuizJobRecord(
            id=row.id,
            session_id=row.session_id,
            profile_id=row.profile_id,
            status=row.status.value,
            quiz_id=row.quiz_id,
            created_at=_normalize_dt(row.created_at),
            updated_at=_normalize_dt(row.updated_at),
        )

    @staticmethod
    def _to_quiz_record(row: QuizTable) -> QuizRecord:
        return QuizRecord(
            id=row.id,
            session_id=row.session_id,
            profile_id=row.profile_id,
            questions=[QuizQuestion(**d) for d in row.questions],
            created_at=_normalize_dt(row.created_at),
        )

    @staticmethod
    def _to_attempt_record(row: QuizAttemptTable) -> QuizAttemptRecord:
        return QuizAttemptRecord(
            id=row.id,
            quiz_id=row.quiz_id,
            profile_id=row.profile_id,
            answers=row.answers,
            total_score=row.total_score,
            overall_feedback=row.overall_feedback,
            question_grades=[QuizAnswerGrade(**d) for d in row.question_grades],
            created_at=_normalize_dt(row.created_at),
        )

    # --- QuizJob ---

    async def create_job(self, *, job: QuizJobRecord) -> QuizJobRecord:
        table = QuizJobTable(
            id=job.id,
            session_id=job.session_id,
            profile_id=job.profile_id,
            status=QuizJobStatusDBEnum(job.status),
            quiz_id=job.quiz_id,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )
        async with self._session_factory() as db:
            db.add(table)
            await db.commit()
            await db.refresh(table)
            return self._to_job_record(table)

    async def get_job(self, *, job_id: str) -> QuizJobRecord | None:
        async with self._session_factory() as db:
            row = await db.get(QuizJobTable, job_id)
            return self._to_job_record(row) if row else None

    async def update_job(self, *, job: QuizJobRecord) -> QuizJobRecord:
        async with self._session_factory() as db:
            row = await db.get(QuizJobTable, job.id)
            if row is None:
                raise ValueError("QuizJob not found.")
            row.status = QuizJobStatusDBEnum(job.status)
            row.quiz_id = job.quiz_id
            row.updated_at = job.updated_at
            await db.commit()
            await db.refresh(row)
            return self._to_job_record(row)

    async def get_job_by_session_id(self, *, session_id: str) -> QuizJobRecord | None:
        stmt = (
            select(QuizJobTable)
            .where(QuizJobTable.session_id == session_id)
            .order_by(QuizJobTable.created_at.desc())
            .limit(1)
        )
        async with self._session_factory() as db:
            row = (await db.execute(stmt)).scalar_one_or_none()
            return self._to_job_record(row) if row else None

    # --- Quiz ---

    async def create_quiz(self, *, quiz: QuizRecord) -> QuizRecord:
        table = QuizTable(
            id=quiz.id,
            session_id=quiz.session_id,
            profile_id=quiz.profile_id,
            questions=[asdict(q) for q in quiz.questions],
            created_at=quiz.created_at,
        )
        async with self._session_factory() as db:
            db.add(table)
            await db.commit()
            await db.refresh(table)
            return self._to_quiz_record(table)

    async def get_quiz(self, *, quiz_id: str) -> QuizRecord | None:
        async with self._session_factory() as db:
            row = await db.get(QuizTable, quiz_id)
            return self._to_quiz_record(row) if row else None

    async def get_quiz_by_session(self, *, session_id: str) -> QuizRecord | None:
        stmt = select(QuizTable).where(QuizTable.session_id == session_id).limit(1)
        async with self._session_factory() as db:
            row = (await db.execute(stmt)).scalar_one_or_none()
            return self._to_quiz_record(row) if row else None

    # --- QuizAttempt ---

    async def create_attempt(self, *, attempt: QuizAttemptRecord) -> QuizAttemptRecord:
        table = QuizAttemptTable(
            id=attempt.id,
            quiz_id=attempt.quiz_id,
            profile_id=attempt.profile_id,
            answers=attempt.answers,
            total_score=attempt.total_score,
            overall_feedback=attempt.overall_feedback,
            question_grades=[asdict(g) for g in attempt.question_grades],
            created_at=attempt.created_at,
        )
        async with self._session_factory() as db:
            db.add(table)
            await db.commit()
            await db.refresh(table)
            return self._to_attempt_record(table)

    async def get_attempt_by_quiz(self, *, quiz_id: str) -> QuizAttemptRecord | None:
        stmt = (
            select(QuizAttemptTable).where(QuizAttemptTable.quiz_id == quiz_id).limit(1)
        )
        async with self._session_factory() as db:
            row = (await db.execute(stmt)).scalar_one_or_none()
            return self._to_attempt_record(row) if row else None

    async def get_attempt(self, *, attempt_id: str) -> QuizAttemptRecord | None:
        async with self._session_factory() as db:
            row = await db.get(QuizAttemptTable, attempt_id)
            return self._to_attempt_record(row) if row else None
