from __future__ import annotations

from enum import Enum

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class VisibilityDBEnum(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class SessionStatusDBEnum(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class HighlightSourceTypeDBEnum(str, Enum):
    SESSION = "session"
    SESSION_BUNDLE = "session_bundle"


class QuizJobStatusDBEnum(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"
