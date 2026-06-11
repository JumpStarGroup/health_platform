"""Regression flow test helpers.

Code and comments must be in English.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from src.timeutil import UTC


@dataclass(frozen=True)
class TestIdentity:
    username: str
    email: str
    password: str


def make_minute_stamp(now: datetime | None = None) -> str:
    """Return a minute-level UTC stamp: YYYYMMDDHHmm."""
    dt = now or datetime.now(UTC)
    dt = dt.astimezone(UTC)
    return dt.strftime("%Y%m%d%H%M")


def make_unique_identity(prefix: str = "reg", now: datetime | None = None) -> TestIdentity:
    """Create a unique username/email embedding YYYYMMDDHHmm.

    Uses `.example.test` to avoid real email delivery.
    """
    stamp = make_minute_stamp(now)
    username = f"{prefix}_{stamp}"
    email = f"{prefix}_{stamp}@example.test"
    password = "password123"  # meets backend strength rule
    return TestIdentity(username=username, email=email, password=password)


def register_user(client, identity: TestIdentity, *, english_profile: bool = True):
    payload = {
        "username": identity.username,
        "email": identity.email,
        "password": identity.password,
    }
    if english_profile:
        payload.update({"age": 25, "gender": "male", "weight": 70})

    resp = client.post("/api/v1/auth/register", json=payload)
    return resp


def login_user(client, identity: TestIdentity):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": identity.email, "password": identity.password},
    )
    return resp


def make_access_headers(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


def create_member(client, access_headers: dict, *, full_name: str = "Dad"):
    resp = client.post(
        "/api/v1/members",
        json={"full_name": full_name, "gender": "male", "age": 62, "height": 170, "weight": 68},
        headers=access_headers,
    )
    return resp


def create_health_record(client, access_headers: dict, payload: dict):
    resp = client.post("/api/v1/health", json=payload, headers=access_headers)
    return resp


def update_health_record(client, access_headers: dict, record_id: int, payload: dict):
    resp = client.put(f"/api/v1/health/{record_id}", json=payload, headers=access_headers)
    return resp
