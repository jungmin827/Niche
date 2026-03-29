"""enable RLS on all domain tables

Revision ID: 20260329_0002
Revises: 20260329_0001
Create Date: 2026-03-29 01:00:00.000000

All data access goes through the FastAPI backend which connects via the
postgres superuser role (DATABASE_URL).  That role bypasses RLS, so these
changes do not affect backend behaviour.

Enabling RLS without explicit permissive policies blocks any direct
Supabase-client (anon / authenticated JWT) access to the tables, which is the
desired posture for this architecture.
"""

from __future__ import annotations

from alembic import op

revision = "20260329_0002"
down_revision = "20260329_0001"
branch_labels = None
depends_on = None

_TABLES = [
    "sessions",
    "session_notes",
    "session_bundles",
    "highlights",
    "profiles",
    "profile_stats",
    "blog_posts",
    "quiz_jobs",
    "quizzes",
    "quiz_attempts",
    "feed_posts",
    "feed_post_comments",
]


def upgrade() -> None:
    for table in _TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        # FORCE RLS so that even the table owner (postgres role inside
        # a SET ROLE context) is subject to policies when policies exist.
        # This does NOT affect the superuser connection used by FastAPI.
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in reversed(_TABLES):
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
