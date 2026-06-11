"""add guest trial phase1 schema

Revision ID: 20260408_guest_phase1
Revises: 20260108_add_import
Create Date: 2026-04-08
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260408_guest_phase1"
down_revision = "20260108_add_import"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "guest_trial_sessions",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("seed_version", sa.String(length=32), nullable=False, server_default="v1"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("cleanup_requested_at", sa.DateTime()),
        sa.Column("cleaned_at", sa.DateTime()),
    )
    op.create_index("ix_guest_trial_sessions_status", "guest_trial_sessions", ["status"])
    op.create_index("ix_guest_trial_sessions_expires_at", "guest_trial_sessions", ["expires_at"])

    op.add_column("health_records", sa.Column("guest_trial_session_id", sa.String(length=64), nullable=True))
    op.create_index("ix_health_records_guest_trial_session_id", "health_records", ["guest_trial_session_id"])

    op.add_column("households", sa.Column("guest_trial_session_id", sa.String(length=64), nullable=True))
    op.create_index("ix_households_guest_trial_session_id", "households", ["guest_trial_session_id"])

    op.add_column("members", sa.Column("guest_trial_session_id", sa.String(length=64), nullable=True))
    op.create_index("ix_members_guest_trial_session_id", "members", ["guest_trial_session_id"])

    op.add_column("record_subjects", sa.Column("guest_trial_session_id", sa.String(length=64), nullable=True))
    op.create_index("ix_record_subjects_guest_trial_session_id", "record_subjects", ["guest_trial_session_id"])


def downgrade():
    op.drop_index("ix_record_subjects_guest_trial_session_id", table_name="record_subjects")
    op.drop_column("record_subjects", "guest_trial_session_id")

    op.drop_index("ix_members_guest_trial_session_id", table_name="members")
    op.drop_column("members", "guest_trial_session_id")

    op.drop_index("ix_households_guest_trial_session_id", table_name="households")
    op.drop_column("households", "guest_trial_session_id")

    op.drop_index("ix_health_records_guest_trial_session_id", table_name="health_records")
    op.drop_column("health_records", "guest_trial_session_id")

    op.drop_index("ix_guest_trial_sessions_expires_at", table_name="guest_trial_sessions")
    op.drop_index("ix_guest_trial_sessions_status", table_name="guest_trial_sessions")
    op.drop_table("guest_trial_sessions")
