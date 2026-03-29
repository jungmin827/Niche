from __future__ import annotations

from typing import Any, Protocol

from src.models.session_bundle import SessionBundleRecord

try:
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    from src.models.session_tables import SessionBundleTable
except ModuleNotFoundError:  # pragma: no cover
    select = Any
    AsyncSession = Any
    async_sessionmaker = Any
    SessionBundleTable = None


class SessionBundleRepository(Protocol):
    async def create(self, record: SessionBundleRecord) -> SessionBundleRecord: ...

    async def get_by_id(self, bundle_id: str) -> SessionBundleRecord | None: ...

    async def list_by_profile(self, profile_id: str) -> list[SessionBundleRecord]: ...


class InMemorySessionBundleRepository:
    def __init__(self) -> None:
        self._bundles: dict[str, SessionBundleRecord] = {}

    async def create(self, record: SessionBundleRecord) -> SessionBundleRecord:
        self._bundles[record.id] = record
        return record

    async def get_by_id(self, bundle_id: str) -> SessionBundleRecord | None:
        return self._bundles.get(bundle_id)

    async def list_by_profile(self, profile_id: str) -> list[SessionBundleRecord]:
        return [r for r in self._bundles.values() if r.profile_id == profile_id]


class PostgresSessionBundleRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def create(self, record: SessionBundleRecord) -> SessionBundleRecord:
        table = SessionBundleTable(
            id=record.id,
            profile_id=record.profile_id,
            title=record.title,
            session_ids=list(record.session_ids),
            created_at=record.created_at,
            updated_at=record.updated_at,
            deleted_at=None,
        )
        async with self._session_factory() as db:
            db.add(table)
            await db.commit()
            await db.refresh(table)
            return self._to_record(table)

    async def get_by_id(self, bundle_id: str) -> SessionBundleRecord | None:
        statement = select(SessionBundleTable).where(
            SessionBundleTable.id == bundle_id,
            SessionBundleTable.deleted_at.is_(None),
        )
        async with self._session_factory() as db:
            row = (await db.execute(statement)).scalar_one_or_none()
            return self._to_record(row) if row else None

    async def list_by_profile(self, profile_id: str) -> list[SessionBundleRecord]:
        statement = (
            select(SessionBundleTable)
            .where(
                SessionBundleTable.profile_id == profile_id,
                SessionBundleTable.deleted_at.is_(None),
            )
            .order_by(SessionBundleTable.created_at.desc())
        )
        async with self._session_factory() as db:
            rows = (await db.execute(statement)).scalars().all()
            return [self._to_record(row) for row in rows]

    @staticmethod
    def _to_record(table: SessionBundleTable) -> SessionBundleRecord:
        return SessionBundleRecord(
            id=table.id,
            profile_id=table.profile_id,
            title=table.title,
            session_ids=list(table.session_ids or []),
            created_at=table.created_at,
            updated_at=table.updated_at,
        )
