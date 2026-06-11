"""add medical_histories table

Revision ID: 20260414_add_medical_histories
Revises: 20260408_guest_phase1
Create Date: 2026-04-14
"""

from alembic import op
import sqlalchemy as sa


revision = "20260414_add_medical_histories"
down_revision = "20260408_guest_phase1"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "medical_histories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("member_id", sa.Integer(), sa.ForeignKey("members.id"), nullable=False),
        sa.Column("onset_date", sa.Date(), nullable=True),
        sa.Column("disease_name", sa.String(length=120), nullable=False),
        sa.Column("disease_status", sa.String(length=32), nullable=False),
        sa.Column("is_present", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_taking_medication", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("condition_note", sa.Text(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("medication_name", sa.String(length=255), nullable=True),
        sa.Column("medication_dosage", sa.String(length=120), nullable=True),
        sa.Column("medication_frequency", sa.String(length=120), nullable=True),
        sa.Column("diagnosed_hospital", sa.String(length=255), nullable=True),
        sa.Column("doctor_name", sa.String(length=120), nullable=True),
        sa.Column("information_source", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "idx_medical_histories_user_member_created_at",
        "medical_histories",
        ["user_id", "member_id", "created_at"],
    )
    op.create_index(
        "idx_medical_histories_user_member_status",
        "medical_histories",
        ["user_id", "member_id", "disease_status"],
    )


def downgrade():
    op.drop_index("idx_medical_histories_user_member_status", table_name="medical_histories")
    op.drop_index("idx_medical_histories_user_member_created_at", table_name="medical_histories")
    op.drop_table("medical_histories")
