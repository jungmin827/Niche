from __future__ import annotations

from datetime import datetime

from src.schemas.common import CamelModel, PageResponse


class FeedAuthorDTO(CamelModel):
    id: str
    handle: str
    display_name: str
    avatar_url: str | None = None
    current_rank_code: str


class FeedItemDTO(CamelModel):
    id: str
    author: FeedAuthorDTO
    published_at: datetime
    content: str | None = None
    rendered_image_url: str | None = None
    tag: str | None = None
    likes: int = 0
    bookmarks: int = 0
    source_type: str
    session_id: str | None = None


class FeedResponse(PageResponse[FeedItemDTO]):
    pass
