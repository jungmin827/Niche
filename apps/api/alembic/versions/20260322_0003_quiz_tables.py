"""create quiz_jobs, quizzes, quiz_attempts tables

Revision ID: 20260322_0003
Revises: 20260322_0002
Create Date: 2026-03-22 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260322_0003"
down_revision = "20260322_0002"
branch_labels = None
depends_on = None

# Used for explicit CREATE TYPE (checkfirst guard)
_quiz_job_status = postgresql.ENUM(
    "pending", "processing", "done", "failed",
    name="quiz_job_status_enum",
)
# Used inside op.create_table — create_type=False prevents duplicate CREATE TYPE
_status_col = postgresql.ENUM(
    "pending", "processing", "done", "failed",
    name="quiz_job_status_enum",
    create_type=False,
)


def upgrade() -> None:
    _quiz_job_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "quiz_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("profile_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("status", _status_col, nullable=False, server_default="pending"),
        sa.Column("quiz_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_quiz_jobs_session_id", "quiz_jobs", ["session_id"])
    op.create_index("ix_quiz_jobs_profile_id", "quiz_jobs", ["profile_id"])

    op.create_table(
        "quizzes",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("profile_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("questions", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_quizzes_session_id", "quizzes", ["session_id"])
    op.create_index("ix_quizzes_profile_id", "quizzes", ["profile_id"])

    op.create_table(
        "quiz_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column(
            "quiz_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("quizzes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("profile_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("answers", postgresql.JSONB(), nullable=False),
        sa.Column("total_score", sa.Integer(), nullable=False),
        sa.Column("overall_feedback", sa.Text(), nullable=False),
        sa.Column("question_grades", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_quiz_attempts_quiz_id", "quiz_attempts", ["quiz_id"])
    op.create_index("ix_quiz_attempts_profile_id", "quiz_attempts", ["profile_id"])


def downgrade() -> None:
    op.drop_index("ix_quiz_attempts_profile_id", table_name="quiz_attempts")
    op.drop_index("ix_quiz_attempts_quiz_id", table_name="quiz_attempts")
    op.drop_table("quiz_attempts")

    op.drop_index("ix_quizzes_profile_id", table_name="quizzes")
    op.drop_index("ix_quizzes_session_id", table_name="quizzes")
    op.drop_table("quizzes")

    op.drop_index("ix_quiz_jobs_profile_id", table_name="quiz_jobs")
    op.drop_index("ix_quiz_jobs_session_id", table_name="quiz_jobs")
    op.drop_table("quiz_jobs")

    _quiz_job_status.drop(op.get_bind(), checkfirst=True)
