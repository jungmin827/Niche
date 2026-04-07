from datetime import datetime
import sqlalchemy as sa
from sqlalchemy import Boolean, DateTime, Enum, Text, func, text as sa_text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base, LogTagDBEnum

class LogTable(Base):
    __tablename__ = "logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    interest_id: Mapped[str] = mapped_column(UUID(as_uuid=False), sa.ForeignKey("interests.id", ondelete="CASCADE"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    tag: Mapped[LogTagDBEnum] = mapped_column(Enum(LogTagDBEnum, name="log_tag_enum", native_enum=False), nullable=False)
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=sa_text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
