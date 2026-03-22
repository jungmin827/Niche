from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime


@dataclass(slots=True)
class SessionBundleRecord:
    id: str
    profile_id: str
    title: str
    session_ids: list[str]
    created_at: datetime
    updated_at: datetime
