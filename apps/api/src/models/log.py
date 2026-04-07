from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid
from src.models.base import LogTagDBEnum

@dataclass
class LogRecord:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    interest_id: str = ""
    text: str = ""
    tag: LogTagDBEnum = LogTagDBEnum.OTHER
    logged_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    is_public: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: datetime | None = None
