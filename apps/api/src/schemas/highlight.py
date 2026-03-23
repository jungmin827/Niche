from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field, model_validator

from src.schemas.common import CamelModel, PageResponse

HighlightSourceType = Literal["session", "sessionBundle"]
Visibility = Literal["public", "private"]


class HighlightAuthor(CamelModel):
    id: str
    handle: str
    display_name: str
    avatar_url: str | None = None
    current_rank_code: str


class HighlightCreateRequest(CamelModel):
    source_type: HighlightSourceType
    session_id: str | None = None
    bundle_id: str | None = None
    title: str = Field(min_length=1)
    caption: str | None = None
    template_code: str | None = None
    rendered_image_path: str = Field(min_length=1)
    source_photo_path: str | None = None
    visibility: Visibility = "public"

    @model_validator(mode="after")
    def validate_source(self) -> "HighlightCreateRequest":
        if self.source_type == "session":
            if not self.session_id or self.bundle_id is not None:
                raise ValueError(
                    "sourceType=session requires sessionId and null bundleId."
                )
        if self.source_type == "sessionBundle":
            if not self.bundle_id or self.session_id is not None:
                raise ValueError(
                    "sourceType=sessionBundle requires bundleId and null sessionId."
                )
        return self


class HighlightUpdateRequest(CamelModel):
    title: str | None = Field(default=None, min_length=1)
    caption: str | None = None
    visibility: Visibility | None = None


class HighlightSummaryDTO(CamelModel):
    id: str
    source_type: HighlightSourceType
    session_id: str | None = None
    bundle_id: str | None = None
    title: str
    caption: str | None = None
    template_code: str | None = None
    rendered_image_url: str
    source_photo_url: str | None = None
    visibility: Visibility
    published_at: datetime


class HighlightDetailDTO(CamelModel):
    id: str
    author: HighlightAuthor
    source_type: HighlightSourceType
    session_id: str | None = None
    bundle_id: str | None = None
    title: str
    caption: str | None = None
    template_code: str | None = None
    rendered_image_url: str
    source_photo_url: str | None = None
    visibility: Visibility
    published_at: datetime


class HighlightResponse(CamelModel):
    highlight: HighlightSummaryDTO | HighlightDetailDTO


class HighlightListResponse(PageResponse[HighlightSummaryDTO]):
    pass
