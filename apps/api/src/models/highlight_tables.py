from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base, HighlightSourceTypeDBEnum, VisibilityDBEnum


class HighlightTable(Base):
    __tablename__ = "highlights"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    profile_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    source_type: Mapped[HighlightSourceTypeDBEnum] = mapped_column(nullable=False)
    session_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), nullable=True)
    bundle_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    rendered_image_path: Mapped[str] = mapped_column(Text, nullable=False)
    source_photo_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    visibility: Mapped[VisibilityDBEnum] = mapped_column(nullable=False, server_default="public")
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
