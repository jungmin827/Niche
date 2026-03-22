from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class BlogPostResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    title: str
    excerpt: str | None
    body_md: str
    cover_image_url: str | None
    visibility: str
    published_at: datetime
    created_at: datetime
    updated_at: datetime


class BlogPostListItemResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    author_id: str
    title: str
    excerpt: str | None
    cover_image_url: str | None
    visibility: str
    published_at: datetime


class BlogPostListResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: list[BlogPostListItemResponse]
    next_cursor: str | None = Field(None, alias="nextCursor")
    has_next: bool = Field(False, alias="hasNext")


class BlogPostEnvelope(BaseModel):
    post: BlogPostResponse


class CreateBlogPostRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    title: str
    excerpt: str | None = None
    body_md: str
    cover_image_path: str | None = None
    visibility: str = "public"


class UpdateBlogPostRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    title: str | None = None
    excerpt: str | None = None
    body_md: str | None = None
    cover_image_path: str | None = None
    visibility: str | None = None
