from __future__ import annotations

import logging

from src.config import Settings
from src.exceptions import ValidationAppError
from src.repositories.highlight_repo import HighlightRepository
from src.models.highlight import HighlightRecord
from src.schemas.feed import FeedAuthorDTO, FeedItemDTO, FeedResponse
from src.middleware.request_id import get_request_id
from src.services.highlight_serialization import build_storage_url

logger = logging.getLogger("niche.feed")


class FeedService:
    def __init__(self, *, highlight_repository: HighlightRepository, settings: Settings) -> None:
        self._highlight_repository = highlight_repository
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

        feed_items = [self._to_feed_item(highlight=h) for h in items]
        logger.info(
            "request_id=%s event=feed.list returned=%s has_next=%s",
            get_request_id(),
            len(feed_items),
            has_next,
        )
        return FeedResponse(items=feed_items, nextCursor=next_cursor, hasNext=has_next)

    def _to_feed_item(self, *, highlight: HighlightRecord) -> FeedItemDTO:
        return FeedItemDTO(
            id=highlight.id,
            author=self._build_placeholder_author(profile_id=highlight.profile_id),
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

    def _build_placeholder_author(self, *, profile_id: str) -> FeedAuthorDTO:
        # TODO: Replace with real profile lookup when profile domain is implemented.
        return FeedAuthorDTO(
            id=profile_id,
            handle=profile_id,
            displayName="NichE User",
            avatarUrl=None,
            currentRankCode="surface",
        )
