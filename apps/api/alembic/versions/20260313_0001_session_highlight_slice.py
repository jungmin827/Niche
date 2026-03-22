"""create session and highlight persistence slice

Revision ID: 20260313_0001
Revises: None
Create Date: 2026-03-13 14:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260313_0001"
down_revision = None
branch_labels = None
depends_on = None


visibility_enum = postgresql.ENUM("public", "private", name="visibility_enum")
session_status_enum = postgresql.ENUM(
    "active",
    "completed",
    "cancelled",
    name="session_status_enum",
)
highlight_source_type_enum = postgresql.ENUM(
    "session",
    "session_bundle",
    name="highlight_source_type_enum",
)


def upgrade() -> None:
    bind = op.get_bind()
    visibility_enum.create(bind, checkfirst=True)
    session_status_enum.create(bind, checkfirst=True)
    highlight_source_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "session_bundles",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("profile_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("total_minutes", sa.Integer(), nullable=False),
        sa.Column("visibility", visibility_enum, nullable=False, server_default="public"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_session_bundles_profile_id_created_at",
        "session_bundles",
        ["profile_id", "created_at"],
    )
    op.create_index(
        "ix_session_bundles_visibility_created_at",
        "session_bundles",
        ["visibility", "created_at"],
    )

    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("profile_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("topic", sa.Text(), nullable=True),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("planned_minutes", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("actual_minutes", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", session_status_enum, nullable=False),
        sa.Column("visibility", visibility_enum, nullable=False, server_default="public"),
        sa.Column("is_highlight_eligible", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("planned_minutes > 0", name="ck_sessions_planned_minutes_positive"),
        sa.CheckConstraint(
            "actual_minutes IS NULL OR actual_minutes > 0",
            name="ck_sessions_actual_minutes_positive",
        ),
    )
    op.create_index("ix_sessions_profile_id_started_at", "sessions", ["profile_id", "started_at"])
    op.create_index("ix_sessions_status_created_at", "sessions", ["status", "created_at"])
    op.create_index("ix_sessions_visibility_created_at", "sessions", ["visibility", "created_at"])
    op.create_index(
        "uq_sessions_one_active_per_profile",
        "sessions",
        ["profile_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active' AND deleted_at IS NULL"),
    )

    op.create_table(
        "session_notes",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("profile_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("insight", sa.Text(), nullable=True),
        sa.Column("mood", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("session_id", name="uq_session_notes_session_id"),
    )
    op.create_index("ix_session_notes_profile_id_created_at", "session_notes", ["profile_id", "created_at"])
    op.create_index(
        "ix_session_notes_tags_gin",
        "session_notes",
        ["tags"],
        postgresql_using="gin",
    )

    op.create_table(
        "highlights",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("profile_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("source_type", highlight_source_type_enum, nullable=False),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("sessions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "bundle_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("session_bundles.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("rendered_image_path", sa.Text(), nullable=False),
        sa.Column("source_photo_path", sa.Text(), nullable=True),
        sa.Column("template_code", sa.Text(), nullable=True),
        sa.Column("visibility", visibility_enum, nullable=False, server_default="public"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "(source_type = 'session' AND session_id IS NOT NULL AND bundle_id IS NULL) "
            "OR (source_type = 'session_bundle' AND bundle_id IS NOT NULL AND session_id IS NULL)",
            name="ck_highlights_source_consistency",
        ),
    )
    op.create_index("ix_highlights_profile_id_published_at", "highlights", ["profile_id", "published_at"])
    op.create_index("ix_highlights_visibility_published_at", "highlights", ["visibility", "published_at"])
    op.create_index(
        "uq_highlights_session_id",
        "highlights",
        ["session_id"],
        unique=True,
        postgresql_where=sa.text("session_id IS NOT NULL AND deleted_at IS NULL"),
    )
    op.create_index(
        "uq_highlights_bundle_id",
        "highlights",
        ["bundle_id"],
        unique=True,
        postgresql_where=sa.text("bundle_id IS NOT NULL AND deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_highlights_bundle_id", table_name="highlights")
    op.drop_index("uq_highlights_session_id", table_name="highlights")
    op.drop_index("ix_highlights_visibility_published_at", table_name="highlights")
    op.drop_index("ix_highlights_profile_id_published_at", table_name="highlights")
    op.drop_table("highlights")

    op.drop_index("ix_session_notes_tags_gin", table_name="session_notes")
    op.drop_index("ix_session_notes_profile_id_created_at", table_name="session_notes")
    op.drop_table("session_notes")

    op.drop_index("uq_sessions_one_active_per_profile", table_name="sessions")
    op.drop_index("ix_sessions_visibility_created_at", table_name="sessions")
    op.drop_index("ix_sessions_status_created_at", table_name="sessions")
    op.drop_index("ix_sessions_profile_id_started_at", table_name="sessions")
    op.drop_table("sessions")

    op.drop_index("ix_session_bundles_visibility_created_at", table_name="session_bundles")
    op.drop_index("ix_session_bundles_profile_id_created_at", table_name="session_bundles")
    op.drop_table("session_bundles")

    bind = op.get_bind()
    highlight_source_type_enum.drop(bind, checkfirst=True)
    session_status_enum.drop(bind, checkfirst=True)
    visibility_enum.drop(bind, checkfirst=True)
