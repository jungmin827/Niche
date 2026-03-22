from __future__ import annotations

import logging
from dataclasses import replace
from datetime import datetime, timezone
from math import ceil
from uuid import uuid4

from src import error_codes
from src.config import Settings
from src.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationAppError
from src.models.session import SessionRecord
from src.models.session_note import SessionNoteRecord
from src.repositories.session_repo import SessionRepository
from src.schemas.session import (
    SessionCancelDTO,
    SessionCompleteRequest,
    SessionCompleteDTO,
    SessionCreateRequest,
    SessionCreateDTO,
    SessionDetailResponse,
    SessionDetailDTO,
    SessionEmbeddedNoteDTO,
    SessionListItemDTO,
    SessionListResponse,
    SessionNoteDTO,
    SessionNotePayload,
    SessionNoteReadDTO,
    SessionNoteResponse,
    SessionResponse,
)
from src.middleware.request_id import get_request_id
from src.security import AuthenticatedUser

logger = logging.getLogger("niche.session")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_datetime(value: datetime | None) -> datetime:
    if value is None:
        return _utc_now()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class SessionService:
    def __init__(self, *, repository: SessionRepository, settings: Settings) -> None:
        self._repository = repository
        self._settings = settings

    async def create_session(
        self, *, current_user: AuthenticatedUser, payload: SessionCreateRequest
    ) -> SessionResponse:
        active_session = await self._repository.get_active_session(profile_id=current_user.profile_id)
        if active_session is not None:
            raise ConflictError(
                code=error_codes.ACTIVE_SESSION_ALREADY_EXISTS,
                message="An active session already exists.",
            )

        planned_minutes = payload.planned_minutes or self._settings.default_planned_minutes
        if planned_minutes not in self._settings.allowed_planned_minutes:
            raise ConflictError(
                code=error_codes.CONFLICT,
                message="plannedMinutes is not allowed.",
                details={"allowedPlannedMinutes": list(self._settings.allowed_planned_minutes)},
            )

        now = _utc_now()
        session = SessionRecord(
            id=str(uuid4()),
            profile_id=current_user.profile_id,
            topic=payload.topic,
            subject=payload.subject,
            planned_minutes=planned_minutes,
            actual_minutes=None,
            started_at=now,
            ended_at=None,
            status="active",
            visibility=self._settings.default_session_visibility,
            source=payload.source,
            is_highlight_eligible=False,
            created_at=now,
            updated_at=now,
        )
        created = await self._repository.create_session(session=session)
        logger.info(
            "request_id=%s event=session.create backend=%s session_id=%s profile_id=%s",
            get_request_id(),
            self._settings.session_repository_backend,
            created.id,
            current_user.profile_id,
        )
        return SessionResponse(session=self._to_session_create_dto(created))

    async def get_session(
        self, *, current_user: AuthenticatedUser, session_id: str
    ) -> SessionDetailResponse:
        session = await self._get_owned_session(current_user=current_user, session_id=session_id)
        note = await self._repository.get_note(session_id=session_id)
        return SessionDetailResponse(
            session=self._to_session_detail_dto(session),
            note=self._to_embedded_note_dto(note) if note else None,
        )

    async def complete_session(
        self,
        *,
        current_user: AuthenticatedUser,
        session_id: str,
        payload: SessionCompleteRequest,
    ) -> SessionResponse:
        session = await self._get_owned_session(current_user=current_user, session_id=session_id)
        if session.status == "completed":
            raise ConflictError(
                code=error_codes.SESSION_ALREADY_FINISHED,
                message="Session is already completed.",
            )
        if session.status != "active":
            raise ConflictError(
                code=error_codes.SESSION_NOT_ACTIVE,
                message="Only active sessions can be completed.",
            )

        ended_at = _normalize_datetime(payload.ended_at)
        if ended_at < session.started_at:
            ended_at = session.started_at

        actual_minutes = max(
            1,
            ceil((ended_at - session.started_at).total_seconds() / 60),
        )
        updated = replace(
            session,
            status="completed",
            ended_at=ended_at,
            actual_minutes=actual_minutes,
            is_highlight_eligible=actual_minutes >= session.planned_minutes,
            updated_at=ended_at,
        )
        saved = await self._repository.update_session(session=updated)
        logger.info(
            "request_id=%s event=session.complete backend=%s session_id=%s profile_id=%s actual_minutes=%s",
            get_request_id(),
            self._settings.session_repository_backend,
            saved.id,
            current_user.profile_id,
            saved.actual_minutes,
        )
        return SessionResponse(session=self._to_session_complete_dto(saved))

    async def cancel_session(
        self, *, current_user: AuthenticatedUser, session_id: str
    ) -> SessionResponse:
        session = await self._get_owned_session(current_user=current_user, session_id=session_id)
        if session.status != "active":
            raise ConflictError(
                code=error_codes.SESSION_NOT_ACTIVE,
                message="Only active sessions can be cancelled.",
            )

        now = _utc_now()
        updated = replace(
            session,
            status="cancelled",
            ended_at=now,
            updated_at=now,
        )
        saved = await self._repository.update_session(session=updated)
        logger.info(
            "request_id=%s event=session.cancel backend=%s session_id=%s profile_id=%s",
            get_request_id(),
            self._settings.session_repository_backend,
            saved.id,
            current_user.profile_id,
        )
        return SessionResponse(session=self._to_session_cancel_dto(saved))

    async def list_sessions(
        self,
        *,
        current_user: AuthenticatedUser,
        status: str | None,
        cursor: str | None,
        limit: int,
    ) -> SessionListResponse:
        bounded_limit = min(limit, self._settings.session_list_max_limit)
        try:
            sessions, next_cursor, has_next = await self._repository.list_sessions(
                profile_id=current_user.profile_id,
                status=status,
                cursor=cursor,
                limit=bounded_limit,
            )
        except ValueError as exc:
            raise ValidationAppError(
                "Request validation failed.",
                details={"cursor": str(exc)},
            ) from exc
        return SessionListResponse(
            items=[self._to_session_list_item_dto(session) for session in sessions],
            next_cursor=next_cursor,
            has_next=has_next,
        )

    async def upsert_note(
        self,
        *,
        current_user: AuthenticatedUser,
        session_id: str,
        payload: SessionNotePayload,
    ) -> SessionNoteResponse:
        session = await self._get_owned_session(current_user=current_user, session_id=session_id)
        if session.status != "completed":
            raise ConflictError(
                code=error_codes.SESSION_NOT_COMPLETED,
                message="Notes can only be saved for completed sessions.",
            )

        existing = await self._repository.get_note(session_id=session_id)
        now = _utc_now()
        note = SessionNoteRecord(
            session_id=session_id,
            profile_id=current_user.profile_id,
            summary=payload.summary,
            insight=payload.insight,
            mood=payload.mood,
            tags=payload.tags,
            created_at=existing.created_at if existing else now,
            updated_at=now,
        )
        saved = await self._repository.upsert_note(note=note)
        logger.info(
            "request_id=%s event=session.note.upsert backend=%s session_id=%s profile_id=%s",
            get_request_id(),
            self._settings.session_repository_backend,
            saved.session_id,
            current_user.profile_id,
        )
        return SessionNoteResponse(note=self._to_note_dto(saved))

    async def get_note(
        self, *, current_user: AuthenticatedUser, session_id: str
    ) -> SessionNoteResponse:
        await self._get_owned_session(current_user=current_user, session_id=session_id)
        note = await self._repository.get_note(session_id=session_id)
        if note is None:
            raise NotFoundError(
                code=error_codes.SESSION_NOTE_NOT_FOUND,
                message="Session note not found.",
            )
        return SessionNoteResponse(note=self._to_note_read_dto(note))

    async def _get_owned_session(
        self, *, current_user: AuthenticatedUser, session_id: str
    ) -> SessionRecord:
        session = await self._repository.get_session(session_id=session_id)
        if session is None:
            raise NotFoundError(
                code=error_codes.SESSION_NOT_FOUND,
                message="Session not found.",
            )
        if session.profile_id != current_user.profile_id:
            raise ForbiddenError()
        return session

    def _to_session_create_dto(self, session: SessionRecord) -> SessionCreateDTO:
        return SessionCreateDTO.model_validate(session)

    def _to_session_detail_dto(self, session: SessionRecord) -> SessionDetailDTO:
        return SessionDetailDTO.model_validate(session)

    def _to_session_complete_dto(self, session: SessionRecord) -> SessionCompleteDTO:
        return SessionCompleteDTO.model_validate(session)

    def _to_session_cancel_dto(self, session: SessionRecord) -> SessionCancelDTO:
        return SessionCancelDTO.model_validate(session)

    def _to_session_list_item_dto(self, session: SessionRecord) -> SessionListItemDTO:
        return SessionListItemDTO.model_validate(session)

    def _to_note_dto(self, note: SessionNoteRecord) -> SessionNoteDTO:
        return SessionNoteDTO.model_validate(note)

    def _to_note_read_dto(self, note: SessionNoteRecord) -> SessionNoteReadDTO:
        return SessionNoteReadDTO.model_validate(note)

    def _to_embedded_note_dto(self, note: SessionNoteRecord) -> SessionEmbeddedNoteDTO:
        return SessionEmbeddedNoteDTO.model_validate(note)
