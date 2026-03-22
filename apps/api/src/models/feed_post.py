from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4


@dataclass
class FeedPostRecord:
    author_id: str
    content: str
    expires_at: datetime
    id: str = field(default_factory=lambda: str(uuid4()))
    created_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))


@dataclass
class FeedPostCommentRecord:
    post_id: str
    author_id: str
    content: str
    id: str = field(default_factory=lambda: str(uuid4()))
    created_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))
