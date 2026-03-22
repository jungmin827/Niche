from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import uuid4

from src import error_codes
from src.exceptions import ForbiddenError, NotFoundError
from src.models.session_bundle import SessionBundleRecord
from src.repositories.session_bundle_repo import SessionBundleRepository
from src.schemas.session_bundle import (
    CreateSessionBundleRequest,
    SessionBundleDTO,
    SessionBundleResponse,
)
from src.middleware.request_id import get_request_id
from src.security import AuthenticatedUser

logger = logging.getLogger("niche.session_bundle")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_dto(record: SessionBundleRecord) -> SessionBundleDTO:
    return SessionBundleDTO(
        id=record.id,
        profile_id=record.profile_id,
        title=record.title,
        session_ids=record.session_ids,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


class SessionBundleService:
    def __init__(self, *, repository: SessionBundleRepository) -> None:
        self._repository = repository

    async def create(
        self,
        *,
        current_user: AuthenticatedUser,
        payload: CreateSessionBundleRequest,
    ) -> SessionBundleResponse:
        now = _utc_now()
        record = SessionBundleRecord(
            id=str(uuid4()),
            profile_id=current_user.profile_id,
            title=payload.title,
            session_ids=list(payload.session_ids),
            created_at=now,
            updated_at=now,
        )
        saved = await self._repository.create(record)
        logger.info(
            "request_id=%s event=session_bundle.create bundle_id=%s profile_id=%s",
            get_request_id(),
            saved.id,
            current_user.profile_id,
        )
        return SessionBundleResponse(bundle=_to_dto(saved))

    async def get(
        self,
        *,
        current_user: AuthenticatedUser,
        bundle_id: str,
    ) -> SessionBundleResponse:
        record = await self._repository.get_by_id(bundle_id)
        if record is None:
            raise NotFoundError(
                code=error_codes.SESSION_BUNDLE_NOT_FOUND,
                message="Session bundle not found.",
            )
        if record.profile_id != current_user.profile_id:
            raise ForbiddenError()
        return SessionBundleResponse(bundle=_to_dto(record))
