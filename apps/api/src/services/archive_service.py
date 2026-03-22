from __future__ import annotations

import logging

from src.config import Settings
from src.exceptions import ValidationAppError
from src.repositories.highlight_repo import HighlightRepository
from src.schemas.archive import (
    ArchiveBlogPostsResponse,
    ArchiveHighlightsResponse,
    ArchiveProfileDTO,
    ArchiveStatsDTO,
    MyArchiveResponse,
)
from src.middleware.request_id import get_request_id
from src.security import AuthenticatedUser
from src.services.highlight_serialization import build_highlight_summary

logger = logging.getLogger("niche.archive")


class ArchiveService:
    def __init__(
        self,
        *,
        highlight_repository: HighlightRepository,
        settings: Settings,
    ) -> None:
        self._highlight_repository = highlight_repository
        self._settings = settings

    async def get_my_archive(
        self,
        *,
        current_user: AuthenticatedUser,
        blog_cursor: str | None,
        highlight_cursor: str | None,
        blog_limit: int,
        highlight_limit: int,
    ) -> MyArchiveResponse:
        del blog_cursor
        del blog_limit

        bounded_highlight_limit = min(highlight_limit, self._settings.highlight_list_max_limit)
        try:
            items, next_cursor, has_next = await self._highlight_repository.list_highlights(
                profile_id=current_user.profile_id,
                visibility=None,
                cursor=highlight_cursor,
                limit=bounded_highlight_limit,
            )
        except ValueError as exc:
            raise ValidationAppError(
                "Request validation failed.",
                details={"highlightCursor": str(exc)},
            ) from exc
        total_highlights = await self._highlight_repository.count_highlights(
            profile_id=current_user.profile_id,
            visibility=None,
        )

        highlight_items = [
            build_highlight_summary(highlight=item, settings=self._settings) for item in items
        ]

        response = MyArchiveResponse(
            profile=self._build_placeholder_profile(profile_id=current_user.profile_id),
            stats=self._build_placeholder_stats(total_highlights=total_highlights),
            blogPosts=ArchiveBlogPostsResponse(items=[], nextCursor=None, hasNext=False),
            highlights=ArchiveHighlightsResponse(
                items=highlight_items,
                nextCursor=next_cursor,
                hasNext=has_next,
            ),
        )
        logger.info(
            "request_id=%s event=archive.list backend=%s profile_id=%s total_highlights=%s returned_highlights=%s",
            get_request_id(),
            self._settings.session_repository_backend,
            current_user.profile_id,
            total_highlights,
            len(highlight_items),
        )
        return response

    def _build_placeholder_profile(self, *, profile_id: str) -> ArchiveProfileDTO:
        # TODO: Replace this placeholder with real profile domain data when /v1/me is implemented.
        return ArchiveProfileDTO(
            id=profile_id,
            handle=profile_id,
            displayName="NichE User",
            bio=None,
            avatarUrl=None,
            currentRankCode="surface",
            rankScore=0,
            isPublic=True,
        )

    def _build_placeholder_stats(self, *, total_highlights: int) -> ArchiveStatsDTO:
        # TODO: Replace this placeholder with real aggregate stats when profile stats are implemented.
        return ArchiveStatsDTO(
            totalSessions=0,
            totalFocusMinutes=0,
            totalBlogPosts=0,
            totalHighlights=total_highlights,
            currentStreakDays=0,
        )
