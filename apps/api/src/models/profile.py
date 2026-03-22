from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class ProfileRecord:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    handle: str = ""
    display_name: str = "NichE User"
    bio: str | None = None
    avatar_path: str | None = None
    is_public: bool = True
    current_rank_code: str = "eveil"
    rank_score: int = 0
    onboarding_completed: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
