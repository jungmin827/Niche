from __future__ import annotations

from typing import Protocol

from src.models.quiz import QuizRecord
from src.models.quiz_attempt import QuizAttemptRecord
from src.models.quiz_job import QuizJobRecord


class QuizRepository(Protocol):
    async def create_job(self, *, job: QuizJobRecord) -> QuizJobRecord: ...

    async def get_job(self, *, job_id: str) -> QuizJobRecord | None: ...

    async def update_job(self, *, job: QuizJobRecord) -> QuizJobRecord: ...

    async def create_quiz(self, *, quiz: QuizRecord) -> QuizRecord: ...

    async def get_quiz(self, *, quiz_id: str) -> QuizRecord | None: ...

    async def get_quiz_by_session(self, *, session_id: str) -> QuizRecord | None: ...

    async def create_attempt(self, *, attempt: QuizAttemptRecord) -> QuizAttemptRecord: ...

    async def get_attempt_by_quiz(self, *, quiz_id: str) -> QuizAttemptRecord | None: ...

    async def get_attempt(self, *, attempt_id: str) -> QuizAttemptRecord | None: ...

    async def get_job_by_session_id(self, *, session_id: str) -> QuizJobRecord | None: ...


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
            if job.session_id == session_id and job.status == "done":
                return job
        return None
