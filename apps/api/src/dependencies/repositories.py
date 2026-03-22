from functools import lru_cache
import logging

from fastapi import Depends

from src.config import Settings, get_settings
from src.db import get_async_session_factory
from src.exceptions import ServiceUnavailableAppError
from src.repositories.highlight_repo import HighlightRepository, InMemoryHighlightRepository, PostgresHighlightRepository
from src.repositories.quiz_job_repo import InMemoryQuizRepository, QuizRepository
from src.repositories.session_repo import SessionRepository, InMemorySessionRepository, PostgresSessionRepository

_memory_session_repository = InMemorySessionRepository()
_memory_highlight_repository = InMemoryHighlightRepository()
_memory_quiz_repository = InMemoryQuizRepository()
logger = logging.getLogger("niche.repositories")


@lru_cache
def _get_postgres_session_repository(database_url: str) -> PostgresSessionRepository:
    settings = Settings(database_url=database_url, session_repository_backend="postgres")
    return PostgresSessionRepository(get_async_session_factory(settings))


@lru_cache
def _get_postgres_highlight_repository(database_url: str) -> PostgresHighlightRepository:
    settings = Settings(database_url=database_url, session_repository_backend="postgres")
    return PostgresHighlightRepository(get_async_session_factory(settings))


def get_session_repository(settings: Settings = Depends(get_settings)) -> SessionRepository:
    if settings.session_repository_backend == "postgres":
        if not settings.database_url:
            raise ServiceUnavailableAppError(
                "Persistence backend is unavailable.",
                details={"backend": "postgres", "reason": "NICHE_DATABASE_URL is not configured."},
            )
        try:
            repository = _get_postgres_session_repository(settings.database_url)
        except Exception as exc:
            raise ServiceUnavailableAppError(
                "Persistence backend is unavailable.",
                details={"backend": "postgres", "reason": str(exc)},
            ) from exc
        logger.info("repository=session backend=postgres")
        return repository
    logger.info("repository=session backend=memory")
    return _memory_session_repository


def get_highlight_repository(settings: Settings = Depends(get_settings)) -> HighlightRepository:
    if settings.session_repository_backend == "postgres":
        if not settings.database_url:
            raise ServiceUnavailableAppError(
                "Persistence backend is unavailable.",
                details={"backend": "postgres", "reason": "NICHE_DATABASE_URL is not configured."},
            )
        try:
            repository = _get_postgres_highlight_repository(settings.database_url)
        except Exception as exc:
            raise ServiceUnavailableAppError(
                "Persistence backend is unavailable.",
                details={"backend": "postgres", "reason": str(exc)},
            ) from exc
        logger.info("repository=highlight backend=postgres")
        return repository
    logger.info("repository=highlight backend=memory")
    return _memory_highlight_repository


def get_quiz_repository(settings: Settings = Depends(get_settings)) -> QuizRepository:
    # TODO: add PostgresQuizRepository when quiz persistence is needed
    return _memory_quiz_repository


def reset_repository_backends() -> None:
    _get_postgres_session_repository.cache_clear()
    _get_postgres_highlight_repository.cache_clear()
