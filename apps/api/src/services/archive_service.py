from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

from src.config import Settings
from src.exceptions import ValidationAppError
from src.repositories.blog_post_repo import BlogPostRepository
from src.repositories.highlight_repo import HighlightRepository
from src.repositories.profile_repo import ProfileRepository
from src.repositories.session_repo import SessionRepository
from src.schemas.archive import (
    ArchiveBlogPostItemDTO,
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
        blog_post_repository: BlogPostRepository,
        profile_repository: ProfileRepository,
        settings: Settings,
    ) -> None:
        self._highlight_repository = highlight_repository
        self._session_repository = session_repository
        self._blog_post_repository = blog_post_repository
        self._profile_repository = profile_repository
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
        del blog_cursor  # TODO: implement blog cursor pagination when BlogPostRepository supports it

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

        blog_posts = await self._blog_post_repository.list_by_author(current_user.profile_id)
        blog_post_items = [
            ArchiveBlogPostItemDTO(
                id=post.id,
                title=post.title,
                excerpt=post.excerpt,
                cover_image_url=(
                    f"{self._settings.storage_public_base_url}/{post.cover_image_path}"
                    if post.cover_image_path
                    else None
                ),
                visibility=post.visibility,
                published_at=post.published_at.isoformat() if post.published_at else None,
            )
            for post in sorted(blog_posts, key=lambda p: p.published_at, reverse=True)
        ]
        blog_page = blog_post_items[:blog_limit] if blog_limit else blog_post_items
        blog_has_next = len(blog_post_items) > blog_limit if blog_limit else False

        highlight_items = [
            build_highlight_summary(highlight=item, settings=self._settings) for item in items
        ]

        response = MyArchiveResponse(
            profile=await self._get_profile(current_user.profile_id),
            stats=ArchiveStatsDTO(
                totalSessions=total_sessions,
                totalFocusMinutes=total_minutes,
                totalBlogPosts=len(blog_post_items),
                totalHighlights=total_highlights,
                currentStreakDays=_compute_streak(completed_dates),
            ),
            blogPosts=ArchiveBlogPostsResponse(items=blog_page, nextCursor=None, hasNext=blog_has_next),
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

    async def _get_profile(self, profile_id: str) -> ArchiveProfileDTO:
        record = await self._profile_repository.get_or_create(profile_id)
        return ArchiveProfileDTO(
            id=record.id,
            handle=record.handle,
            displayName=record.display_name,
            bio=record.bio,
            avatarUrl=(
                f"{self._settings.storage_public_base_url}/{record.avatar_path}"
                if record.avatar_path else None
            ),
            currentRankCode=record.current_rank_code,
            rankScore=record.rank_score,
            isPublic=record.is_public,
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
