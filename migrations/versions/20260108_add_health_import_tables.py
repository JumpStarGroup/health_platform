"""add health import tables

Revision ID: 20260108_add_import
Revises: 
Create Date: 2026-01-08
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '20260108_add_import'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'health_import_sessions',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('original_filename', sa.String(length=255)),
        sa.Column('file_size_bytes', sa.Integer()),
        sa.Column('file_sha256', sa.String(length=128)),
        sa.Column('mapping_json', sa.Text()),
        sa.Column('normalized_rows_json', sa.Text()),
        sa.Column('preview_errors_json', sa.Text()),
        sa.Column('preview_skipped_json', sa.Text()),
        sa.Column('unknown_members_json', sa.Text()),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='previewed'),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column('expires_at', sa.DateTime()),
    )
    op.create_index('ix_health_import_sessions_user_id', 'health_import_sessions', ['user_id'])
    op.create_index('ix_health_import_sessions_expires_at', 'health_import_sessions', ['expires_at'])

    op.create_table(
        'health_import_audits',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('session_id', sa.String(length=64)),
        sa.Column('original_filename', sa.String(length=255)),
        sa.Column('file_size_bytes', sa.Integer()),
        sa.Column('file_sha256', sa.String(length=128)),
        sa.Column('total_rows', sa.Integer()),
        sa.Column('success_count', sa.Integer()),
        sa.Column('error_count', sa.Integer()),
        sa.Column('skipped_count', sa.Integer()),
        sa.Column('created_members_count', sa.Integer()),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=datetime.utcnow),
    )
    op.create_index('ix_health_import_audits_user_id', 'health_import_audits', ['user_id'])
    op.create_index('ix_health_import_audits_created_at', 'health_import_audits', ['created_at'])


def downgrade():
    op.drop_index('ix_health_import_audits_created_at', table_name='health_import_audits')
    op.drop_index('ix_health_import_audits_user_id', table_name='health_import_audits')
    op.drop_table('health_import_audits')

    op.drop_index('ix_health_import_sessions_expires_at', table_name='health_import_sessions')
    op.drop_index('ix_health_import_sessions_user_id', table_name='health_import_sessions')
    op.drop_table('health_import_sessions')
