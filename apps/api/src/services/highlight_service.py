from __future__ import annotations

import logging
from dataclasses import replace
from datetime import datetime, timezone
from uuid import uuid4

from src import error_codes
from src.config import Settings
from src.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationAppError
from src.models.highlight import HighlightRecord
from src.repositories.highlight_repo import HighlightRepository
from src.repositories.session_repo import SessionRepository
from src.schemas.highlight import (
    HighlightAuthor,
    HighlightCreateRequest,
    HighlightDetailDTO,
    HighlightListResponse,
    HighlightResponse,
    HighlightSummaryDTO,
    HighlightUpdateRequest,
)
from src.middleware.request_id import get_request_id
from src.security import AuthenticatedUser
from src.services.highlight_serialization import build_highlight_detail, build_highlight_summary

logger = logging.getLogger("niche.highlight")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class HighlightService:
    def __init__(
        self,
        *,
        highlight_repository: HighlightRepository,
        session_repository: SessionRepository,
        settings: Settings,
    ) -> None:
        self._highlight_repository = highlight_repository
        self._session_repository = session_repository
        self._settings = settings

    async def create_highlight(
        self, *, current_user: AuthenticatedUser, payload: HighlightCreateRequest
    ) -> HighlightResponse:
        await self._validate_source_ownership(current_user=current_user, payload=payload)

        existing = await self._highlight_repository.find_by_source(
            source_type=payload.source_type,
            session_id=payload.session_id,
            bundle_id=payload.bundle_id,
        )
        if existing is not None:
            raise ConflictError(
                code=error_codes.HIGHLIGHT_ALREADY_EXISTS,
                message="A highlight already exists for this source.",
            )

        now = _utc_now()
        highlight = HighlightRecord(
            id=str(uuid4()),
            profile_id=current_user.profile_id,
            source_type=payload.source_type,
            session_id=payload.session_id,
            bundle_id=payload.bundle_id,
            title=payload.title,
            caption=payload.caption,
            template_code=payload.template_code,
            rendered_image_path=payload.rendered_image_path,
            source_photo_path=payload.source_photo_path,
            visibility=payload.visibility or self._settings.default_highlight_visibility,
            published_at=now,
            created_at=now,
            updated_at=now,
        )
        saved = await self._highlight_repository.create_highlight(highlight=highlight)
        logger.info(
            "request_id=%s event=highlight.create backend=%s highlight_id=%s session_id=%s bundle_id=%s profile_id=%s",
            get_request_id(),
            self._settings.session_repository_backend,
            saved.id,
            saved.session_id,
            saved.bundle_id,
            current_user.profile_id,
        )
        return HighlightResponse(highlight=self._to_summary_dto(saved))

    async def get_highlight(
        self, *, current_user: AuthenticatedUser, highlight_id: str
    ) -> HighlightResponse:
        highlight = await self._require_highlight(highlight_id=highlight_id)
        if highlight.visibility == "private" and highlight.profile_id != current_user.profile_id:
            raise ForbiddenError()
        logger.info(
            "request_id=%s event=highlight.detail backend=%s highlight_id=%s session_id=%s bundle_id=%s profile_id=%s",
            get_request_id(),
            self._settings.session_repository_backend,
            highlight.id,
            highlight.session_id,
            highlight.bundle_id,
            current_user.profile_id,
        )
        return HighlightResponse(highlight=self._to_detail_dto(highlight))

    async def update_highlight(
        self,
        *,
        current_user: AuthenticatedUser,
        highlight_id: str,
        payload: HighlightUpdateRequest,
    ) -> HighlightResponse:
        highlight = await self._require_owned_highlight(
            current_user=current_user,
            highlight_id=highlight_id,
        )
        updated = replace(
            highlight,
            title=payload.title if payload.title is not None else highlight.title,
            caption=payload.caption if payload.caption is not None else highlight.caption,
            visibility=payload.visibility if payload.visibility is not None else highlight.visibility,
            updated_at=_utc_now(),
        )
        saved = await self._highlight_repository.update_highlight(highlight=updated)
        logger.info(
            "request_id=%s event=highlight.update backend=%s highlight_id=%s session_id=%s bundle_id=%s profile_id=%s",
            get_request_id(),
            self._settings.session_repository_backend,
            saved.id,
            saved.session_id,
            saved.bundle_id,
            current_user.profile_id,
        )
        return HighlightResponse(highlight=self._to_summary_dto(saved))

    async def delete_highlight(
        self,
        *,
        current_user: AuthenticatedUser,
        highlight_id: str,
    ) -> None:
        highlight = await self._require_owned_highlight(
            current_user=current_user,
            highlight_id=highlight_id,
        )
        await self._highlight_repository.delete_highlight(highlight_id=highlight.id)
        logger.info(
            "request_id=%s event=highlight.delete backend=%s highlight_id=%s profile_id=%s",
            get_request_id(),
            self._settings.session_repository_backend,
            highlight.id,
            current_user.profile_id,
        )

    async def list_my_highlights(
        self,
        *,
        current_user: AuthenticatedUser,
        cursor: str | None,
        limit: int,
    ) -> HighlightListResponse:
        return await self._list_highlights(
            profile_id=current_user.profile_id,
            visibility=None,
            cursor=cursor,
            limit=limit,
        )

    async def list_user_highlights(
        self,
        *,
        current_user: AuthenticatedUser,
        profile_id: str,
        cursor: str | None,
        limit: int,
    ) -> HighlightListResponse:
        visibility = None if profile_id == current_user.profile_id else "public"
        return await self._list_highlights(
            profile_id=profile_id,
            visibility=visibility,
            cursor=cursor,
            limit=limit,
        )

    async def _list_highlights(
        self,
        *,
        profile_id: str,
        visibility: str | None,
        cursor: str | None,
        limit: int,
    ) -> HighlightListResponse:
        bounded_limit = min(limit, self._settings.highlight_list_max_limit)
        try:
            items, next_cursor, has_next = await self._highlight_repository.list_highlights(
                profile_id=profile_id,
                visibility=visibility,
                cursor=cursor,
                limit=bounded_limit,
            )
        except ValueError as exc:
            raise ValidationAppError(
                "Request validation failed.",
                details={"cursor": str(exc)},
            ) from exc
        return HighlightListResponse(
            items=[self._to_summary_dto(item) for item in items],
            next_cursor=next_cursor,
            has_next=has_next,
        )

    async def _validate_source_ownership(
        self, *, current_user: AuthenticatedUser, payload: HighlightCreateRequest
    ) -> None:
        if payload.source_type == "session":
            session = await self._session_repository.get_session(session_id=payload.session_id)
            if session is None:
                raise NotFoundError(
                    code=error_codes.SESSION_NOT_FOUND,
                    message="Session not found.",
                )
            if session.profile_id != current_user.profile_id:
                raise ForbiddenError()
            return

        # TODO: Validate session bundle ownership when the session bundle domain exists.

    async def _require_highlight(self, *, highlight_id: str) -> HighlightRecord:
        highlight = await self._highlight_repository.get_highlight(highlight_id=highlight_id)
        if highlight is None:
            raise NotFoundError(
                code=error_codes.HIGHLIGHT_NOT_FOUND,
                message="Highlight not found.",
            )
        return highlight

    async def _require_owned_highlight(
        self,
        *,
        current_user: AuthenticatedUser,
        highlight_id: str,
    ) -> HighlightRecord:
        highlight = await self._require_highlight(highlight_id=highlight_id)
        if highlight.profile_id != current_user.profile_id:
            raise ForbiddenError()
        return highlight

    def _to_summary_dto(self, highlight: HighlightRecord) -> HighlightSummaryDTO:
        return build_highlight_summary(highlight=highlight, settings=self._settings)

    def _to_detail_dto(self, highlight: HighlightRecord) -> HighlightDetailDTO:
        return build_highlight_detail(
            highlight=highlight,
            settings=self._settings,
            author=self._build_author(highlight.profile_id),
        )

    def _build_author(self, profile_id: str) -> HighlightAuthor:
        # TODO: Replace this stub with real profile lookup once the profile domain is implemented.
        return HighlightAuthor(
            id=profile_id,
            handle=profile_id,
            displayName="NichE User",
            avatarUrl=None,
            currentRankCode="surface",
        )
