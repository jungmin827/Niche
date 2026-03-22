from __future__ import annotations

import logging

from src.config import Settings
from src.exceptions import ValidationAppError
from src.repositories.highlight_repo import HighlightRepository
from src.repositories.profile_repo import ProfileRepository
from src.models.highlight import HighlightRecord
from src.schemas.feed import FeedAuthorDTO, FeedItemDTO, FeedResponse
from src.middleware.request_id import get_request_id
from src.services.highlight_serialization import build_storage_url

logger = logging.getLogger("niche.feed")


class FeedService:
    def __init__(
        self,
        *,
        highlight_repository: HighlightRepository,
        profile_repository: ProfileRepository,
        settings: Settings,
    ) -> None:
        self._highlight_repository = highlight_repository
        self._profile_repository = profile_repository
        self._settings = settings

    async def list_feed(
        self,
        *,
        cursor: str | None,
        limit: int,
    ) -> FeedResponse:
        bounded_limit = min(limit, self._settings.highlight_list_max_limit)
        try:
            items, next_cursor, has_next = await self._highlight_repository.list_public_highlights(
                cursor=cursor,
                limit=bounded_limit,
            )
        except ValueError as exc:
            raise ValidationAppError(
                "Request validation failed.",
                details={"cursor": str(exc)},
            ) from exc

        feed_items = [await self._to_feed_item(highlight=h) for h in items]
        logger.info(
            "request_id=%s event=feed.list returned=%s has_next=%s",
            get_request_id(),
            len(feed_items),
            has_next,
        )
        return FeedResponse(items=feed_items, nextCursor=next_cursor, hasNext=has_next)

    async def _to_feed_item(self, *, highlight: HighlightRecord) -> FeedItemDTO:
        return FeedItemDTO(
            id=highlight.id,
            author=await self._get_author(profile_id=highlight.profile_id),
            publishedAt=highlight.published_at,
            content=highlight.caption,
            renderedImageUrl=build_storage_url(
                path=highlight.rendered_image_path, settings=self._settings
            ),
            tag=None,  # TODO: derive from session subject once session join is available
            likes=0,
            bookmarks=0,
            sourceType=highlight.source_type,
            sessionId=highlight.session_id,
        )

    async def _get_author(self, *, profile_id: str) -> FeedAuthorDTO:
        record = await self._profile_repository.get_or_create(profile_id)
        return FeedAuthorDTO(
            id=record.id,
            handle=record.handle,
            displayName=record.display_name,
            avatarUrl=(
                f"{self._settings.storage_public_base_url}/{record.avatar_path}"
                if record.avatar_path else None
            ),
            currentRankCode=record.current_rank_code,
        )
