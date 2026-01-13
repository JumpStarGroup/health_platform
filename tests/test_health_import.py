import json
from io import BytesIO

from src.extensions import db
from src.models import HealthRecord, Member


def _make_csv(rows):
    header = "成员名称,测量时间,收缩压,舒张压,心率,标签,备注"
    body = "\n".join(rows)
    return f"{header}\n{body}".encode("utf-8")


def test_preview_and_commit_creates_member(client, auth_headers):
    csv_bytes = _make_csv([
        "Self,2025-12-19 08:30:00,120,80,72,晨起;空腹,早晨测量",
        "张三,2025-12-19 08:35:00,130,85,70,,",
    ])
    resp = client.post(
        "/api/v1/health/import/preview",
        headers=auth_headers["access"],
        data={"file": (BytesIO(csv_bytes), "import.csv")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 200
    data = resp.get_json()
    session_id = data["session_id"]
    assert session_id
    # Unknown member should be detected
    assert "张三" in data["unknown_members"]

    commit_resp = client.post(
        "/api/v1/health/import/commit",
        headers=auth_headers["access"],
        json={"session_id": session_id, "approved_new_members": ["张三"]},
    )
    assert commit_resp.status_code == 200
    summary = commit_resp.get_json()["summary"]
    assert summary["success_count"] == 2
    assert summary["error_count"] == 0
    assert summary["skipped_count"] == 0

    with client.application.app_context():
        # Self + new member
        members = Member.query.all()
        assert any(m.full_name == "张三" for m in members)
        records = HealthRecord.query.all()
        assert len(records) == 2


def test_duplicate_rows_are_skipped(client, auth_headers):
    csv_bytes = _make_csv([
        "Self,2025-12-19 08:30:00,120,80,,,",
        "Self,2025-12-19 08:30:10,125,82,,,",
    ])
    resp = client.post(
        "/api/v1/health/import/preview",
        headers=auth_headers["access"],
        data={"file": (BytesIO(csv_bytes), "dup.csv")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 200
    data = resp.get_json()
    session_id = data["session_id"]
    rows = data["rows"]
    # one of the duplicate rows should be marked skipped_duplicate
    assert any(r["status"] == "skipped_duplicate" for r in rows)

    commit_resp = client.post(
        "/api/v1/health/import/commit",
        headers=auth_headers["access"],
        json={"session_id": session_id, "approved_new_members": []},
    )
    assert commit_resp.status_code == 200
    summary = commit_resp.get_json()["summary"]
    assert summary["success_count"] == 1
    assert summary["skipped_count"] == 1

    with client.application.app_context():
        assert HealthRecord.query.count() == 1


def test_row_limit_enforced(client, auth_headers):
    # build 501 data rows
    rows = [f"Self,2025-12-19 08:30:{i:02d},120,80,,," for i in range(501)]
    csv_bytes = _make_csv(rows)
    resp = client.post(
        "/api/v1/health/import/preview",
        headers=auth_headers["access"],
        data={"file": (BytesIO(csv_bytes), "too_many.csv")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 400
    assert "row limit" in resp.get_json().get("message", "")


def test_report_download(client, auth_headers):
    payload = {
        "errors": [
            {
                "row": 2,
                "data": {"member_name": "X", "timestamp": "2025-12-19 08:30:00", "systolic": 20, "diastolic": 30, "tags": [], "note": ""},
                "status": "error",
                "messages": ["systolic must be between 30-250"],
            }
        ],
        "skipped": [],
    }
    resp = client.post(
        "/api/v1/health/import/report",
        headers=auth_headers["access"],
        json=payload,
    )
    assert resp.status_code == 200
    assert resp.mimetype.startswith("text/csv")
    # BOM prefix
    assert resp.data.startswith("\ufeff".encode("utf-8"))
