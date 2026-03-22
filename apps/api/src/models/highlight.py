from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

HighlightSourceType = Literal["session", "sessionBundle"]
Visibility = Literal["public", "private"]


@dataclass(slots=True)
class HighlightRecord:
    id: str
    profile_id: str
    source_type: HighlightSourceType
    session_id: str | None
    bundle_id: str | None
    title: str
    caption: str | None
    template_code: str | None
    rendered_image_path: str
    source_photo_path: str | None
    visibility: Visibility
    published_at: datetime
    created_at: datetime
    updated_at: datetime
