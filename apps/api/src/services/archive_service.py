from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

from src.config import Settings
from src.exceptions import ValidationAppError
from src.repositories.highlight_repo import HighlightRepository
from src.repositories.session_repo import SessionRepository
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


def _compute_streak(completed_dates: list[date]) -> int:
    """Count consecutive calendar days with at least one completed session, back from today."""
    if not completed_dates:
        return 0
    date_set = set(completed_dates)
    today = datetime.now(timezone.utc).date()
    streak = 0
    current = today
    while current in date_set:
        streak += 1
        current -= timedelta(days=1)
    return streak


class ArchiveService:
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

        total_highlights, total_sessions, total_minutes, completed_dates = await _gather_stats(
            highlight_repository=self._highlight_repository,
            session_repository=self._session_repository,
            profile_id=current_user.profile_id,
        )

        highlight_items = [
            build_highlight_summary(highlight=item, settings=self._settings) for item in items
        ]

        response = MyArchiveResponse(
            profile=self._build_placeholder_profile(profile_id=current_user.profile_id),
            stats=ArchiveStatsDTO(
                totalSessions=total_sessions,
                totalFocusMinutes=total_minutes,
                totalBlogPosts=0,
                totalHighlights=total_highlights,
                currentStreakDays=_compute_streak(completed_dates),
            ),
            blogPosts=ArchiveBlogPostsResponse(items=[], nextCursor=None, hasNext=False),
            highlights=ArchiveHighlightsResponse(
                items=highlight_items,
                nextCursor=next_cursor,
                hasNext=has_next,
            ),
        )
        logger.info(
            "request_id=%s event=archive.list backend=%s profile_id=%s "
            "total_highlights=%s total_sessions=%s total_minutes=%s streak_days=%s",
            get_request_id(),
            self._settings.session_repository_backend,
            current_user.profile_id,
            total_highlights,
            total_sessions,
            total_minutes,
            response.stats.current_streak_days,
        )
        return response

    def _build_placeholder_profile(self, *, profile_id: str) -> ArchiveProfileDTO:
        # TODO: Replace with real profile domain data when /v1/me is implemented.
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


async def _gather_stats(
    *,
    highlight_repository: HighlightRepository,
    session_repository: SessionRepository,
    profile_id: str,
) -> tuple[int, int, int, list[date]]:
    """Return (total_highlights, total_sessions, total_minutes, completed_dates)."""
    total_highlights = await highlight_repository.count_highlights(
        profile_id=profile_id,
        visibility=None,
    )
    total_sessions = await session_repository.count_completed_sessions(profile_id=profile_id)
    total_minutes = await session_repository.sum_completed_minutes(profile_id=profile_id)
    completed_dates = await session_repository.get_completed_session_dates(profile_id=profile_id)
    return total_highlights, total_sessions, total_minutes, completed_dates
