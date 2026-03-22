from __future__ import annotations

from typing import Protocol

from src.models.session_bundle import SessionBundleRecord


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
