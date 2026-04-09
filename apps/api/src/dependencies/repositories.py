from functools import lru_cache
import logging

from fastapi import Depends

from src.ai.base import AIProvider
from src.ai.providers.gemini_adapter import GeminiAdapter
from src.config import Settings, get_settings
from src.db import get_async_session_factory
from src.exceptions import ServiceUnavailableAppError
from src.repositories.profile_repo import (
    InMemoryProfileRepository,
    PostgresProfileRepository,
    ProfileRepository,
)
from src.repositories.quiz_job_repo import (
    InMemoryQuizRepository,
    PostgresQuizRepository,
    QuizRepository,
)
from src.repositories.session_repo import (
    SessionRepository,
    InMemorySessionRepository,
    PostgresSessionRepository,
)
from src.repositories.interest_repo import (
    InterestRepository,
    InMemoryInterestRepository,
)
from src.services.interest_service import InterestService
from src.services.profile_service import ProfileService
from src.services.upload_service import UploadService

# NICHE_DATABASE_URL 미설정 시 graceful fallback으로 사용되는 인메모리 싱글톤.
# 서버 재시작 시 데이터가 사라지므로 개발·테스트 환경 전용이다.
_memory_session_repository = InMemorySessionRepository()
_memory_quiz_repository = InMemoryQuizRepository()
_memory_profile_repository = InMemoryProfileRepository()
_memory_interest_repository = InMemoryInterestRepository()
logger = logging.getLogger("niche.repositories")


def _warn_no_db(repository: str) -> None:
    logger.warning(
        "repository=%s backend=postgres requested but NICHE_DATABASE_URL not set"
        " — falling back to memory (set NICHE_DATABASE_URL for persistence)",
        repository,
    )


@lru_cache
def _get_postgres_session_repository(database_url: str) -> PostgresSessionRepository:
    settings = Settings(database_url=database_url, session_repository_backend="postgres")
    return PostgresSessionRepository(get_async_session_factory(settings))


@lru_cache
def _get_postgres_quiz_repository(database_url: str) -> PostgresQuizRepository:
    settings = Settings(database_url=database_url, session_repository_backend="postgres")
    return PostgresQuizRepository(get_async_session_factory(settings))


@lru_cache
def _get_postgres_profile_repository(database_url: str) -> PostgresProfileRepository:
    settings = Settings(database_url=database_url, session_repository_backend="postgres")
    return PostgresProfileRepository(get_async_session_factory(settings))


@lru_cache
def _get_postgres_interest_repository(database_url: str) -> InterestRepository:
    settings = Settings(database_url=database_url, session_repository_backend="postgres")
    return InterestRepository(get_async_session_factory(settings))


def get_session_repository(
    settings: Settings = Depends(get_settings),
) -> SessionRepository:
    if settings.session_repository_backend == "postgres":
        if not settings.database_url:
            _warn_no_db("session")
            return _memory_session_repository
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


def get_quiz_repository(settings: Settings = Depends(get_settings)) -> QuizRepository:
    if settings.session_repository_backend == "postgres":
        if not settings.database_url:
            _warn_no_db("quiz")
            return _memory_quiz_repository
        try:
            repository = _get_postgres_quiz_repository(settings.database_url)
        except Exception as exc:
            raise ServiceUnavailableAppError(
                "Persistence backend is unavailable.",
                details={"backend": "postgres", "reason": str(exc)},
            ) from exc
        logger.info("repository=quiz backend=postgres")
        return repository
    logger.info("repository=quiz backend=memory")
    return _memory_quiz_repository


def get_ai_provider(settings: Settings = Depends(get_settings)) -> AIProvider:
    if not settings.gemini_api_key:
        raise ServiceUnavailableAppError(
            "AI provider is not configured.",
            details={"reason": "NICHE_GEMINI_API_KEY is not set."},
        )
    return GeminiAdapter(
        api_key=settings.gemini_api_key,
        model=settings.gemini_model,
        timeout_seconds=settings.ai_request_timeout_seconds,
    )


def get_profile_repo(
    settings: Settings = Depends(get_settings),
) -> ProfileRepository:
    if settings.session_repository_backend == "postgres":
        if not settings.database_url:
            _warn_no_db("profile")
            return _memory_profile_repository
        try:
            return _get_postgres_profile_repository(settings.database_url)
        except Exception as exc:
            raise ServiceUnavailableAppError(
                "Persistence backend is unavailable.",
                details={"backend": "postgres", "reason": str(exc)},
            ) from exc
    return _memory_profile_repository


def get_profile_service(
    repo: ProfileRepository = Depends(get_profile_repo),
    settings: Settings = Depends(get_settings),
) -> ProfileService:
    return ProfileService(repo=repo, settings=settings)


def get_interest_repo(
    settings: Settings = Depends(get_settings),
) -> InterestRepository | InMemoryInterestRepository:
    if settings.session_repository_backend == "postgres":
        if not settings.database_url:
            _warn_no_db("interest")
            return _memory_interest_repository
        try:
            return _get_postgres_interest_repository(settings.database_url)
        except Exception as exc:
            raise ServiceUnavailableAppError(
                "Persistence backend is unavailable.",
                details={"backend": "postgres", "reason": str(exc)},
            ) from exc
    return _memory_interest_repository


def get_interest_service(
    repo: InterestRepository | InMemoryInterestRepository = Depends(get_interest_repo),
) -> InterestService:
    return InterestService(repo=repo)


def get_upload_service(settings: Settings = Depends(get_settings)) -> UploadService:
    return UploadService(settings=settings)


def reset_repository_backends() -> None:
    _get_postgres_session_repository.cache_clear()
    _get_postgres_quiz_repository.cache_clear()
    _get_postgres_profile_repository.cache_clear()
    _get_postgres_interest_repository.cache_clear()
