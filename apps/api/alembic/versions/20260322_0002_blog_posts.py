"""create blog_posts table

Revision ID: 20260322_0002
Revises: 20260317_0001
Create Date: 2026-03-22 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260322_0002"
down_revision = "20260317_0001"
branch_labels = None
depends_on = None

# visibility_enum already created in 20260313_0001 — do not re-create
_vis = postgresql.ENUM("public", "private", name="visibility_enum", create_type=False)


def upgrade() -> None:
    op.create_table(
        "blog_posts",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column(
            "profile_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=True),
        sa.Column("excerpt", sa.Text(), nullable=True),
        sa.Column("body_md", sa.Text(), nullable=False),
        sa.Column("cover_image_path", sa.Text(), nullable=True),
        sa.Column("visibility", _vis, nullable=False, server_default="public"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_blog_posts_profile_id_published_at", "blog_posts", ["profile_id", "published_at"])
    op.create_index("ix_blog_posts_visibility_published_at", "blog_posts", ["visibility", "published_at"])
    op.create_index(
        "uq_blog_posts_profile_id_slug",
        "blog_posts",
        ["profile_id", "slug"],
        unique=True,
        postgresql_where=sa.text("slug IS NOT NULL AND deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_blog_posts_profile_id_slug", table_name="blog_posts")
    op.drop_index("ix_blog_posts_visibility_published_at", table_name="blog_posts")
    op.drop_index("ix_blog_posts_profile_id_published_at", table_name="blog_posts")
    op.drop_table("blog_posts")
