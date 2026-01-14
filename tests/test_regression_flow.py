"""Regression flow tests.

Covers: English register -> login -> create member -> create/update Self health record.
Includes both positive and negative validation cases.

Code and comments must be in English.
"""

from __future__ import annotations

import pytest

from tests.helpers.regression_flow import (
    create_health_record,
    create_member,
    make_access_headers,
    make_unique_identity,
    register_user,
    login_user,
    update_health_record,
)


pytestmark = pytest.mark.regression


class TestRegressionFlow:
    def test_regression_happy_path_self_record(self, client):
        identity = make_unique_identity(prefix="reg")

        r = register_user(client, identity, english_profile=True)
        assert r.status_code == 201

        r = login_user(client, identity)
        assert r.status_code == 200
        tokens = r.get_json()
        access_headers = make_access_headers(tokens["access_token"])

        r = create_member(client, access_headers, full_name="Dad")
        assert r.status_code == 201

        create_payload = {
            "systolic": 120,
            "diastolic": 80,
            "heart_rate": 72,
            "timestamp": "2026-01-13T08:10:00Z",
            "tags": ["regression"],
            "note": "Regression create",
        }
        r = create_health_record(client, access_headers, create_payload)
        assert r.status_code == 201
        rec = r.get_json()
        assert rec["systolic"] == 120
        assert rec["diastolic"] == 80
        assert rec["heart_rate"] == 72
        assert "id" in rec

        record_id = rec["id"]
        update_payload = {
            "systolic": 121,
            "note": "Regression update",
        }
        r = update_health_record(client, access_headers, record_id, update_payload)
        assert r.status_code == 200
        updated = r.get_json()
        assert updated["systolic"] == 121
        assert updated["note"] == "Regression update"

    @pytest.mark.parametrize(
        "payload, expected_detail_key",
        [
            ({"systolic": 80, "diastolic": 80, "heart_rate": 72}, "_schema"),
            ({"systolic": 79, "diastolic": 80, "heart_rate": 72}, "_schema"),
        ],
    )
    def test_invalid_bp_relation_must_fail(self, client, payload, expected_detail_key):
        identity = make_unique_identity(prefix="regrel")
        assert register_user(client, identity).status_code == 201
        tokens = login_user(client, identity).get_json()
        access_headers = make_access_headers(tokens["access_token"])

        payload = dict(payload)
        payload["timestamp"] = "2026-01-13T08:20:00Z"

        r = create_health_record(client, access_headers, payload)
        assert r.status_code == 400
        body = r.get_json()
        assert body["code"] == "400"
        assert "details" in body
        assert expected_detail_key in body["details"]

    @pytest.mark.parametrize(
        "payload, expected_field",
        [
            ({"systolic": 29, "diastolic": 80, "heart_rate": 72}, "systolic"),
            ({"systolic": 251, "diastolic": 80, "heart_rate": 72}, "systolic"),
            ({"systolic": 120, "diastolic": 29, "heart_rate": 72}, "diastolic"),
            ({"systolic": 120, "diastolic": 251, "heart_rate": 72}, "diastolic"),
            ({"systolic": 120, "diastolic": 80, "heart_rate": 29}, "heart_rate"),
            ({"systolic": 120, "diastolic": 80, "heart_rate": 151}, "heart_rate"),
        ],
    )
    def test_invalid_ranges_must_fail(self, client, payload, expected_field):
        identity = make_unique_identity(prefix="regrng")
        assert register_user(client, identity).status_code == 201
        tokens = login_user(client, identity).get_json()
        access_headers = make_access_headers(tokens["access_token"])

        payload = dict(payload)
        payload["timestamp"] = "2026-01-13T08:30:00Z"

        r = create_health_record(client, access_headers, payload)
        assert r.status_code == 400
        body = r.get_json()
        assert body["code"] == "400"
        assert "details" in body
        assert expected_field in body["details"]

    def test_invalid_timestamp_format_must_fail(self, client):
        identity = make_unique_identity(prefix="regts")
        assert register_user(client, identity).status_code == 201
        tokens = login_user(client, identity).get_json()
        access_headers = make_access_headers(tokens["access_token"])

        payload = {
            "systolic": 120,
            "diastolic": 80,
            "heart_rate": 72,
            "timestamp": "not-a-date",
        }
        r = create_health_record(client, access_headers, payload)
        assert r.status_code == 400
        body = r.get_json()
        assert body["code"] == "400"

    def test_update_with_invalid_values_must_fail(self, client):
        identity = make_unique_identity(prefix="regupd")
        assert register_user(client, identity).status_code == 201
        tokens = login_user(client, identity).get_json()
        access_headers = make_access_headers(tokens["access_token"])

        r = create_health_record(
            client,
            access_headers,
            {
                "systolic": 120,
                "diastolic": 80,
                "heart_rate": 72,
                "timestamp": "2026-01-13T08:40:00Z",
            },
        )
        assert r.status_code == 201
        record_id = r.get_json()["id"]

        # systolic <= diastolic (relation invalid)
        r = update_health_record(client, access_headers, record_id, {"systolic": 79})
        assert r.status_code == 400
        body = r.get_json()
        assert body["code"] == "400"
        assert "_schema" in body.get("details", {})

        # heart_rate out of range
        r = update_health_record(client, access_headers, record_id, {"heart_rate": 151})
        assert r.status_code == 400
        body = r.get_json()
        assert body["code"] == "400"
        assert "heart_rate" in body.get("details", {})
