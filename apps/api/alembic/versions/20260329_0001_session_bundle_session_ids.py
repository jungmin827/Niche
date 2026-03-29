"""add session_ids to session_bundles and relax legacy columns

Revision ID: 20260329_0001
Revises: 20260322_0003
Create Date: 2026-03-29 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260329_0001"
down_revision = "20260322_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add session_ids as UUID array — default empty for any pre-existing rows
    op.add_column(
        "session_bundles",
        sa.Column(
            "session_ids",
            postgresql.ARRAY(postgresql.UUID(as_uuid=False)),
            nullable=False,
            server_default="{}",
        ),
    )

    # The original schema required started_at / ended_at / total_minutes but
    # the current domain model does not use them.  Make them nullable so the
    # Postgres repository can omit these fields without errors.
    op.alter_column("session_bundles", "started_at", nullable=True)
    op.alter_column("session_bundles", "ended_at", nullable=True)
    op.alter_column("session_bundles", "total_minutes", nullable=True)


def downgrade() -> None:
    op.alter_column("session_bundles", "total_minutes", nullable=False)
    op.alter_column("session_bundles", "ended_at", nullable=False)
    op.alter_column("session_bundles", "started_at", nullable=False)
    op.drop_column("session_bundles", "session_ids")
