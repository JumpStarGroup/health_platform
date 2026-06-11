# Design: Automated Regression Flow Tests (Register/Login → Member → Self Health Record)

## 1. Overview
- Reference requirement: [docs/requirements/req-regression-health-flow.md](../requirements/req-regression-health-flow.md)
- Goal: provide a single, repeatable automated regression flow that validates the core user journey (English register → login → create member → create/update Self health record) with both positive and negative validation coverage.
- Test level: **API-level regression via Pytest + Flask test client** (not UI E2E).

## 2. Architecture Changes
### Backend
- No functional backend changes required for v1 if current APIs remain stable.
- Ensure regression tests interact only through public HTTP endpoints (via Flask test client) and do not bypass Service/Manager layering.

### Frontend
- No frontend changes required for v1 (scope is backend API regression).
- i18n note: UI language support does not affect backend regression assertions; we will avoid asserting language-specific message text.

### CI / Pipeline
- Add a dedicated regression test entry point in CI (still executed by pytest):
  - Option A (preferred): `pytest -q -m regression` (marker-based selection)
  - Option B: run a dedicated file `tests/test_regression_flow.py`
- Keep regression as part of a “full run” job or nightly; optionally run “fast unit tests” on every PR.

## 3. Data Model
No schema changes.

Relevant existing entities (for test expectations only):
- **User**: created via `POST /api/v1/auth/register`
- **Household** and **Member**:
  - `MemberManager.ensure_default_household()` auto-creates default Household and a default **Self** Member.
  - Family member creation uses `POST /api/v1/members`.
- **HealthRecord** + **RecordSubject mapping**:
  - `POST /api/v1/health` creates HealthRecord and creates RecordSubject mapping to `subject_member_id` (defaults to Self).

## 4. API Interface (Contracts Used by Regression)
### Auth
- `POST /api/v1/auth/register`
  - Request JSON: `{ username, email, password, age?, gender?, weight?, height? }`
  - Success: `201` with `{ id, username, email, created_at }`

- `POST /api/v1/auth/login`
  - Request JSON: `{ email|username, password }`
  - Success: `200` with `{ access_token, refresh_token, must_change_password, ... }`

### Members
- `POST /api/v1/members`
  - Request JSON: `{ full_name, gender?, age?, height?, weight? }`
  - Success: `201` with created member `{ id, full_name, ... }`

### Health
- `POST /api/v1/health`
  - Request JSON (v1 regression uses Self):
    - Valid create must include: `{ systolic, diastolic, heart_rate, timestamp }`
    - Optional: `{ tags: [], note }`
  - Timestamp parsing:
    - Accepts ISO8601-like strings; `"2025-08-22T10:00:00Z"` accepted.
    - Rejects invalid formats with `400` and error code `400`.
  - Validation:
    - `systolic` and `diastolic` must be integers in `[30, 250]`.
    - `heart_rate` must be an integer in `[30, 150]`.
    - Relationship: `systolic > diastolic`.

- `PUT /api/v1/health/{id}`
  - Request JSON: partial update (regression updates at least one numeric field and/or note).
  - Same validation rules apply for updated fields.

## 5. Test Design
### 5.1 File & Naming
- New test module: `tests/test_regression_flow.py`
- New reusable helpers module (optional): `tests/helpers/regression_flow.py` (or similar) to reduce duplication.

### 5.2 Reusable Building Blocks
Create a reusable set of helper functions/fixtures to compose flows:
- `make_unique_user_identity(now_utc) -> {username, email, password}`
  - Username and email embed `YYYYMMDDHHmm`.
  - Example username: `reg_202601131205`.
  - Example email: `reg_202601131205@example.test`.
- `register_user(client, identity) -> user_json`
- `login_user(client, identity) -> access_headers`
- `create_member(client, access_headers, full_name) -> member_json`
- `create_self_record(client, access_headers, payload) -> record_json`
- `update_record(client, access_headers, record_id, patch) -> response_json`

### 5.3 Positive Path (Single Regression Run)
One test should cover the “happy path” end-to-end:
1. Register (English): `POST /auth/register`.
2. Login: `POST /auth/login`.
3. Create family member: `POST /members`.
4. Create Self health record: `POST /health`.
   - Must include `systolic`, `diastolic`, `heart_rate`, and a valid `timestamp`.
5. Update Self record: `PUT /health/{id}`.

Assertions (language-safe):
- Status codes: `201/200`.
- Presence and correctness of key fields (`id`, numeric fields).
- Avoid asserting exact `message` strings.

### 5.4 Negative Coverage (Must-Fail Cases)
Implement as separate tests (or parametrized cases) to keep failures pinpointed:
- BP relation invalid: `systolic <= diastolic` → `400` and `details._schema` exists.
- BP range invalid:
  - `systolic=29` or `systolic=251` → `400` and `details.systolic` exists.
  - `diastolic=29` or `diastolic=251` → `400` and `details.diastolic` exists.
- Heart rate range invalid:
  - `heart_rate=29` or `heart_rate=151` → `400` and `details.heart_rate` exists.
- Timestamp invalid format:
  - Example: `"not-a-date"` → `400` and `code == "400"`.
  - Do not assert exact message because future localization may change it.

### 5.5 i18n Considerations
- v1 uses English registration inputs.
- Assertions should be invariant to language:
  - Prefer `status_code`, `code`, and `details` keys.
  - Do not assert translated human-readable error strings.

### 5.6 Determinism & Isolation
- Preferred: use the existing `tests/conftest.py` in-memory SQLite per test.
- Even with in-memory DB, keep unique username/email generation per requirement to support later migration to shared DB test environments.
- Timestamp selection:
  - Use UTC timestamps.
  - Avoid “duplicate record same minute” unless explicitly testing duplicate behavior.

## 6. High-Level Task Blocks
- [ ] Add `tests/test_regression_flow.py` that composes the full journey (happy path).
- [ ] Add parametrized negative validation tests for BP/HR/time.
- [ ] Add helper utilities for unique username/email and shared API calls.
- [ ] Add pytest marker `regression` (optional) and CI job wiring.
- [ ] Update documentation/README for running regression locally (optional).

## 7. Risks & Mitigations
- **Risk**: brittle assertions if backend error messages get localized.
  - Mitigation: assert structural fields (`code`, `details` keys) and status codes.
- **Risk**: duplicate record constraint (same member, same minute) causing flaky failures.
  - Mitigation: ensure timestamps differ by at least one minute for sequential creates, or only create one record in the regression happy path.
