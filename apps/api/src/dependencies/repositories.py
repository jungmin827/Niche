from functools import lru_cache
import logging

from fastapi import Depends

from src.ai.base import AIProvider
from src.ai.providers.gemini_adapter import GeminiAdapter
from src.config import Settings, get_settings
from src.db import get_async_session_factory
from src.exceptions import ServiceUnavailableAppError
from src.repositories.blog_post_repo import (
    BlogPostRepository,
    InMemoryBlogPostRepository,
    PostgresBlogPostRepository,
)
from src.repositories.highlight_repo import (
    HighlightRepository,
    InMemoryHighlightRepository,
    PostgresHighlightRepository,
)
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
from src.repositories.session_bundle_repo import (
    InMemorySessionBundleRepository,
    SessionBundleRepository,
)
from src.repositories.session_repo import (
    SessionRepository,
    InMemorySessionRepository,
    PostgresSessionRepository,
)
from src.services.blog_post_service import BlogPostService
from src.services.profile_service import ProfileService
from src.services.upload_service import UploadService

_memory_session_repository = InMemorySessionRepository()
_memory_highlight_repository = InMemoryHighlightRepository()
_memory_quiz_repository = InMemoryQuizRepository()
_memory_blog_post_repository = InMemoryBlogPostRepository()
_memory_session_bundle_repository = InMemorySessionBundleRepository()
_memory_profile_repository = InMemoryProfileRepository()
logger = logging.getLogger("niche.repositories")


@lru_cache
def _get_postgres_session_repository(database_url: str) -> PostgresSessionRepository:
    settings = Settings(
        database_url=database_url, session_repository_backend="postgres"
    )
    return PostgresSessionRepository(get_async_session_factory(settings))


@lru_cache
def _get_postgres_highlight_repository(
    database_url: str,
) -> PostgresHighlightRepository:
    settings = Settings(
        database_url=database_url, session_repository_backend="postgres"
    )
    return PostgresHighlightRepository(get_async_session_factory(settings))


@lru_cache
def _get_postgres_quiz_repository(database_url: str) -> PostgresQuizRepository:
    settings = Settings(
        database_url=database_url, session_repository_backend="postgres"
    )
    return PostgresQuizRepository(get_async_session_factory(settings))


@lru_cache
def _get_postgres_profile_repository(database_url: str) -> PostgresProfileRepository:
    settings = Settings(
        database_url=database_url, session_repository_backend="postgres"
    )
    return PostgresProfileRepository(get_async_session_factory(settings))


@lru_cache
def _get_postgres_blog_post_repository(
    database_url: str,
) -> PostgresBlogPostRepository:
    settings = Settings(
        database_url=database_url, session_repository_backend="postgres"
    )
    return PostgresBlogPostRepository(get_async_session_factory(settings))


def get_session_repository(
    settings: Settings = Depends(get_settings),
) -> SessionRepository:
    if settings.session_repository_backend == "postgres":
        if not settings.database_url:
            raise ServiceUnavailableAppError(
                "Persistence backend is unavailable.",
                details={
                    "backend": "postgres",
                    "reason": "NICHE_DATABASE_URL is not configured.",
                },
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


def get_highlight_repository(
    settings: Settings = Depends(get_settings),
) -> HighlightRepository:
    if settings.session_repository_backend == "postgres":
        if not settings.database_url:
            raise ServiceUnavailableAppError(
                "Persistence backend is unavailable.",
                details={
                    "backend": "postgres",
                    "reason": "NICHE_DATABASE_URL is not configured.",
                },
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
    if settings.session_repository_backend == "postgres":
        if not settings.database_url:
            raise ServiceUnavailableAppError(
                "Persistence backend is unavailable.",
                details={
                    "backend": "postgres",
                    "reason": "NICHE_DATABASE_URL is not configured.",
                },
            )
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


def get_blog_post_repo(
    settings: Settings = Depends(get_settings),
) -> BlogPostRepository:
    if settings.session_repository_backend == "postgres":
        if not settings.database_url:
            raise ServiceUnavailableAppError(
                "Persistence backend is unavailable.",
                details={
                    "backend": "postgres",
                    "reason": "NICHE_DATABASE_URL is not configured.",
                },
            )
        try:
            return _get_postgres_blog_post_repository(settings.database_url)
        except Exception as exc:
            raise ServiceUnavailableAppError(
                "Persistence backend is unavailable.",
                details={"backend": "postgres", "reason": str(exc)},
            ) from exc
    return _memory_blog_post_repository


def get_blog_post_service(
    repo: BlogPostRepository = Depends(get_blog_post_repo),
    settings: Settings = Depends(get_settings),
) -> BlogPostService:
    return BlogPostService(repo=repo, settings=settings)


def get_session_bundle_repository(
    settings: Settings = Depends(get_settings),
) -> SessionBundleRepository:
    # TODO: add PostgresSessionBundleRepository when session bundle persistence is needed
    return _memory_session_bundle_repository


def get_profile_repo(
    settings: Settings = Depends(get_settings),
) -> ProfileRepository:
    if settings.session_repository_backend == "postgres":
        if not settings.database_url:
            raise ServiceUnavailableAppError(
                "Persistence backend is unavailable.",
                details={
                    "backend": "postgres",
                    "reason": "NICHE_DATABASE_URL is not configured.",
                },
            )
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


def get_upload_service(settings: Settings = Depends(get_settings)) -> UploadService:
    return UploadService(settings=settings)


def reset_repository_backends() -> None:
    _get_postgres_session_repository.cache_clear()
    _get_postgres_highlight_repository.cache_clear()
    _get_postgres_quiz_repository.cache_clear()
    _get_postgres_profile_repository.cache_clear()
    _get_postgres_blog_post_repository.cache_clear()
