"""Schema tests for Guest trial Phase 1."""

from sqlalchemy import inspect
from src.extensions import db


def test_guest_trial_session_table_exists(app):
    with app.app_context():
        inspector = inspect(db.engine)
        tables = set(inspector.get_table_names())
        assert "guest_trial_sessions" in tables


def test_guest_trial_session_columns_exist(app):
    with app.app_context():
        inspector = inspect(db.engine)
        cols = {c["name"] for c in inspector.get_columns("guest_trial_sessions")}
        assert "id" in cols
        assert "status" in cols
        assert "seed_version" in cols
        assert "created_at" in cols
        assert "last_activity_at" in cols
        assert "expires_at" in cols
        assert "cleanup_requested_at" in cols
        assert "cleaned_at" in cols


def test_guest_scope_columns_exist_on_core_tables(app):
    with app.app_context():
        inspector = inspect(db.engine)

        health_cols = {c["name"] for c in inspector.get_columns("health_records")}
        assert "guest_trial_session_id" in health_cols

        household_cols = {c["name"] for c in inspector.get_columns("households")}
        assert "guest_trial_session_id" in household_cols

        member_cols = {c["name"] for c in inspector.get_columns("members")}
        assert "guest_trial_session_id" in member_cols

        subject_cols = {c["name"] for c in inspector.get_columns("record_subjects")}
        assert "guest_trial_session_id" in subject_cols
