from __future__ import annotations

from datetime import datetime, timezone
from typing import Protocol

from src.models.profile import ProfileRecord


class ProfileRepository(Protocol):
    async def get_by_id(self, profile_id: str) -> ProfileRecord | None: ...

    async def get_or_create(self, profile_id: str) -> ProfileRecord: ...

    async def update(self, profile_id: str, **fields: object) -> ProfileRecord: ...


class InMemoryProfileRepository:
    def __init__(self) -> None:
        self._profiles: dict[str, ProfileRecord] = {}

    async def get_by_id(self, profile_id: str) -> ProfileRecord | None:
        return self._profiles.get(profile_id)

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
