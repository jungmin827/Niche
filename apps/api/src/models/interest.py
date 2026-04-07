from dataclasses import dataclass, field
from datetime import date, datetime, timezone
import uuid

@dataclass
class InterestRecord:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    profile_id: str = ""
    name: str = ""
    started_at: date = field(default_factory=date.today)
    is_public: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: datetime | None = None
