from __future__ import annotations

from datetime import datetime

from src.schemas.common import CamelModel


class FeedAuthorDTO(CamelModel):
    id: str
    handle: str
    display_name: str


class FeedPostDTO(CamelModel):
    id: str
    author: FeedAuthorDTO
    content: str
    created_at: datetime
    expires_at: datetime
    comment_count: int = 0


class FeedPostListResponse(CamelModel):
    items: list[FeedPostDTO]


class CreateFeedPostRequest(CamelModel):
    content: str  # max 50 enforced in service


class FeedCommentDTO(CamelModel):
    id: str
    author: FeedAuthorDTO
    content: str
    created_at: datetime


class FeedCommentListResponse(CamelModel):
    items: list[FeedCommentDTO]


class CreateFeedCommentRequest(CamelModel):
    content: str  # max 20 enforced in service
