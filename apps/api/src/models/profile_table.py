from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import Boolean, DateTime, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class ProfileTable(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    auth_user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), nullable=False, unique=True
    )
    handle: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    current_rank_code: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'surface'")
    )
    rank_score: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class ProfileStatsTable(Base):
    __tablename__ = "profile_stats"

    profile_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        sa.ForeignKey("profiles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    total_sessions: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    total_focus_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    total_blog_posts: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    total_highlights: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    current_streak_days: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
