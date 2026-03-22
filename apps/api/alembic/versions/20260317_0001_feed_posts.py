"""create feed_posts and feed_post_comments tables

Revision ID: 20260317_0001
Revises: 20260313_0001
Create Date: 2026-03-17 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260317_0001"
down_revision = "20260322_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "feed_posts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=False),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("author_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("content", sa.String(50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["profiles.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_feed_posts_expires_at", "feed_posts", ["expires_at"])
    op.create_index(
        "ix_feed_posts_created_at",
        "feed_posts",
        [sa.text("created_at DESC")],
    )

    op.create_table(
        "feed_post_comments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=False),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "post_id",
            postgresql.UUID(as_uuid=False),
            nullable=False,
        ),
        sa.Column("author_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("content", sa.String(20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["post_id"], ["feed_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["profiles.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_feed_post_comments_post_id", "feed_post_comments", ["post_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_feed_post_comments_post_id", table_name="feed_post_comments")
    op.drop_table("feed_post_comments")

    op.drop_index("ix_feed_posts_created_at", table_name="feed_posts")
    op.drop_index("ix_feed_posts_expires_at", table_name="feed_posts")
    op.drop_table("feed_posts")
