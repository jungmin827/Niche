from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Protocol

try:
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    from src.models.profile_table import ProfileStatsTable, ProfileTable
except ModuleNotFoundError:  # pragma: no cover
    select = None
    AsyncSession = Any
    async_sessionmaker = Any
    ProfileTable = None
    ProfileStatsTable = None

from src.models.profile import ProfileRecord


def _normalize_timestamp(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class ProfileRepository(Protocol):
    async def get_by_id(self, profile_id: str) -> ProfileRecord | None: ...

    async def get_by_handle(self, handle: str) -> ProfileRecord | None: ...

    async def get_or_create(self, profile_id: str) -> ProfileRecord: ...

    async def update(self, profile_id: str, **fields: object) -> ProfileRecord: ...


class PostgresProfileRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def get_by_id(self, profile_id: str) -> ProfileRecord | None:
        statement = select(ProfileTable).where(
            ProfileTable.id == profile_id,
            ProfileTable.deleted_at.is_(None),
        )
        async with self._session_factory() as db:
            row = (await db.execute(statement)).scalar_one_or_none()
            return self._to_record(row) if row else None

    async def get_by_handle(self, handle: str) -> ProfileRecord | None:
        statement = select(ProfileTable).where(
            ProfileTable.handle == handle,
            ProfileTable.deleted_at.is_(None),
        )
        async with self._session_factory() as db:
            row = (await db.execute(statement)).scalar_one_or_none()
            return self._to_record(row) if row else None

    async def get_or_create(self, profile_id: str) -> ProfileRecord:
        # profile_id == auth_user_id (security.py 계약)
        statement = select(ProfileTable).where(
            ProfileTable.auth_user_id == profile_id,
            ProfileTable.deleted_at.is_(None),
        )
        async with self._session_factory() as db:
            row = (await db.execute(statement)).scalar_one_or_none()
            if row:
                return self._to_record(row)

            now = datetime.now(timezone.utc)
            new_profile = ProfileTable(
                id=profile_id,
                auth_user_id=profile_id,
                handle=profile_id[:8],
                display_name="NichE User",
                is_public=True,
                current_rank_code="eveil",
                rank_score=0,
                onboarding_completed=False,
                created_at=now,
                updated_at=now,
            )
            db.add(new_profile)
            await db.flush()  # profiles INSERT 먼저 확정 (profile_stats FK 제약 충족)
            db.add(ProfileStatsTable(profile_id=profile_id))
            await db.commit()
            await db.refresh(new_profile)
            return self._to_record(new_profile)

    async def update(self, profile_id: str, **fields: object) -> ProfileRecord:
        _allowed = {
            "handle",
            "display_name",
            "bio",
            "avatar_path",
            "is_public",
            "current_rank_code",
            "rank_score",
            "onboarding_completed",
        }
        async with self._session_factory() as db:
            row = await db.get(ProfileTable, profile_id)
            if row is None or row.deleted_at is not None:
                return await self.get_or_create(profile_id)
            for key, value in fields.items():
                if key in _allowed and value is not None:
                    setattr(row, key, value)
            row.updated_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(row)
            return self._to_record(row)

    def _to_record(self, row: ProfileTable) -> ProfileRecord:
        return ProfileRecord(
            id=row.id,
            handle=row.handle,
            display_name=row.display_name,
            bio=row.bio,
            avatar_path=row.avatar_path,
            is_public=row.is_public,
            current_rank_code=row.current_rank_code,
            rank_score=row.rank_score,
            onboarding_completed=row.onboarding_completed,
            created_at=_normalize_timestamp(row.created_at),
            updated_at=_normalize_timestamp(row.updated_at),
        )


class InMemoryProfileRepository:
    def __init__(self) -> None:
        self._profiles: dict[str, ProfileRecord] = {}

    async def get_by_id(self, profile_id: str) -> ProfileRecord | None:
        return self._profiles.get(profile_id)

    async def get_by_handle(self, handle: str) -> ProfileRecord | None:
        for record in self._profiles.values():
            if record.handle == handle:
                return record
        return None

    async def get_or_create(self, profile_id: str) -> ProfileRecord:
        if profile_id not in self._profiles:
            record = ProfileRecord(
                id=profile_id,
                handle=profile_id[:8],
                display_name="NichE User",
            )
            self._profiles[profile_id] = record
        return self._profiles[profile_id]

    async def update(self, profile_id: str, **fields: object) -> ProfileRecord:
        record = self._profiles.get(profile_id)
        if record is None:
            record = await self.get_or_create(profile_id)
        for key, value in fields.items():
            if value is not None and hasattr(record, key):
                setattr(record, key, value)
        record.updated_at = datetime.now(timezone.utc)
        return record
