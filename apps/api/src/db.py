from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

try:
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import (
        AsyncEngine,
        AsyncSession,
        async_sessionmaker,
        create_async_engine,
    )
except ModuleNotFoundError:  # pragma: no cover - exercised only in minimal local envs
    AsyncEngine = Any
    AsyncSession = Any
    async_sessionmaker = Any
    create_async_engine = None
    text = None

from src.config import Settings

_engine_cache: dict[str, AsyncEngine] = {}
_session_factory_cache: dict[str, async_sessionmaker[AsyncSession]] = {}


def get_async_engine(settings: Settings) -> AsyncEngine:
    _require_sqlalchemy()
    if not settings.database_url:
        raise RuntimeError("NICHE_DATABASE_URL must be set for postgres persistence.")

    engine = _engine_cache.get(settings.database_url)
    if engine is None:
        engine = create_async_engine(settings.database_url, future=True)
        _engine_cache[settings.database_url] = engine
    return engine


def get_async_session_factory(settings: Settings) -> async_sessionmaker[AsyncSession]:
    _require_sqlalchemy()
    if not settings.database_url:
        raise RuntimeError("NICHE_DATABASE_URL must be set for postgres persistence.")

    factory = _session_factory_cache.get(settings.database_url)
    if factory is None:
        factory = async_sessionmaker(get_async_engine(settings), expire_on_commit=False)
        _session_factory_cache[settings.database_url] = factory
    return factory


async def get_async_session(settings: Settings) -> AsyncIterator[AsyncSession]:
    session_factory = get_async_session_factory(settings)
    async with session_factory() as session:
        yield session


async def check_readiness(settings: Settings) -> bool:
    if settings.session_repository_backend == "memory":
        return True
    if settings.session_repository_backend != "postgres" or not settings.database_url:
        return False

    try:
        _require_sqlalchemy()
        async with get_async_engine(settings).connect() as connection:
            await connection.execute(text("select 1"))
        return True
    except Exception:
        return False


def _require_sqlalchemy() -> None:
    if create_async_engine is None or text is None:
        raise RuntimeError("SQLAlchemy is required for postgres persistence.")
