from __future__ import annotations

from src.config import Settings
from src.models.profile import ProfileRecord
from src.repositories.profile_repo import ProfileRepository


class ProfileService:
    def __init__(self, *, repo: ProfileRepository, settings: Settings) -> None:
        self._repo = repo
        self._settings = settings

    def _resolve_avatar_url(self, path: str | None) -> str | None:
        if path is None:
            return None
        return f"{self._settings.storage_public_base_url}/{path}"

    async def get_my_profile(self, profile_id: str) -> ProfileRecord:
        return await self._repo.get_or_create(profile_id)

    async def update_my_profile(self, profile_id: str, **fields: object) -> ProfileRecord:
        return await self._repo.update(profile_id, **fields)

    async def get_public_profile(self, profile_id: str) -> ProfileRecord | None:
        record = await self._repo.get_by_id(profile_id)
        if record is None or not record.is_public:
            return None
        return record

    async def get_author_info(self, profile_id: str) -> ProfileRecord:
        """Used by archive/feed services to look up author data.
        Always returns a record (creates stub if missing).
        """
        return await self._repo.get_or_create(profile_id)
