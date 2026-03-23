from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class BlogPostRecord:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str = ""
    title: str = ""
    excerpt: str | None = None
    body_md: str = ""
    cover_image_path: str | None = None
    visibility: str = "public"  # "public" | "private"
    published_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: datetime | None = None
