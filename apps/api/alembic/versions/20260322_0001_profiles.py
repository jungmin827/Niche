"""create profiles and profile_stats tables

Revision ID: 20260322_0001
Revises: 20260313_0001
Create Date: 2026-03-22 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260322_0001"
down_revision = "20260313_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column(
            "id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False
        ),
        sa.Column("auth_user_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("handle", sa.Text(), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("avatar_path", sa.Text(), nullable=True),
        sa.Column(
            "is_public", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
        sa.Column(
            "current_rank_code",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'surface'"),
        ),
        sa.Column(
            "rank_score", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "onboarding_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("auth_user_id", name="uq_profiles_auth_user_id"),
        sa.UniqueConstraint("handle", name="uq_profiles_handle"),
    )
    op.create_index(
        "ix_profiles_auth_user_id", "profiles", ["auth_user_id"], unique=True
    )
    op.create_index("ix_profiles_handle", "profiles", ["handle"], unique=True)
    op.create_index("ix_profiles_created_at", "profiles", [sa.text("created_at DESC")])

    op.create_table(
        "profile_stats",
        sa.Column(
            "profile_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "total_sessions", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "total_focus_minutes",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "total_blog_posts",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "total_highlights",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "current_streak_days",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )


def downgrade() -> None:
    op.drop_table("profile_stats")
    op.drop_index("ix_profiles_created_at", table_name="profiles")
    op.drop_index("ix_profiles_handle", table_name="profiles")
    op.drop_index("ix_profiles_auth_user_id", table_name="profiles")
    op.drop_table("profiles")
