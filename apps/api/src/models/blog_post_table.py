from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base, VisibilityDBEnum

_use_values = lambda x: [e.value for e in x]  # noqa: E731
_visibility_col = sa.Enum(VisibilityDBEnum, name="visibility_enum", create_type=False, values_callable=_use_values)


class BlogPostTable(Base):
    __tablename__ = "blog_posts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    profile_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        sa.ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str | None] = mapped_column(Text, nullable=True)
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_md: Mapped[str] = mapped_column(Text, nullable=False)
    cover_image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    visibility: Mapped[VisibilityDBEnum] = mapped_column(_visibility_col, nullable=False, server_default="public")
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
