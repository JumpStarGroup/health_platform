# Implementation Plan: Guest Trial Entry Phase 1

## References
- Requirement: [docs/requirements/req-guest-trial-entry.md](../requirements/req-guest-trial-entry.md)
- Design: [docs/design/design-guest-trial-entry-phase1.md](../design/design-guest-trial-entry-phase1.md)
- Issue: #17

## Phase 0: Design Alignment and Guardrails
- [ ] **Task 0.1**: Confirm one canonical design document path and use it consistently.
  - Use [docs/design/design-guest-trial-entry-phase1.md](../design/design-guest-trial-entry-phase1.md) as the implementation source of truth.
  - Treat any duplicate draft under `docs/Design/` as reference only; do not split implementation between two design files.

- [ ] **Task 0.2**: Define Phase 1 defaults before coding.
  - Confirm Guest session inactivity timeout.
  - Confirm absolute Guest session TTL.
  - Confirm the seeded demo dataset size and shape.
  - Confirm Guest UI label for the login button and in-product prompts.
  - Output: fixed values recorded in the implementation PR or follow-up design note.

## Phase 1: Backend Schema and Persistence
- [ ] **Task 1.1**: Add `GuestTrialSession` model in [src/models.py](../../src/models.py).
  - Fields:
    - `id`
    - `status`
    - `seed_version`
    - `created_at`
    - `last_activity_at`
    - `expires_at`
    - `cleanup_requested_at`
    - `cleaned_at`
  - Time fields must use `datetime.now(UTC)`.

- [ ] **Task 1.2**: Extend guest-owned domain tables in [src/models.py](../../src/models.py) with nullable `guest_trial_session_id`.
  - Tables in scope:
    - `HealthRecord`
    - `Household`
    - `Member`
    - `RecordSubject`
  - Preserve existing registered-user fields to avoid breaking current users.

- [ ] **Task 1.3**: Create database migration for Guest session support.
  - Add new table: `guest_trial_sessions`.
  - Add new nullable columns and indexes for `guest_trial_session_id` on trial-relevant tables.
  - Verify migration is safe on existing development DBs.

- [ ] **Task 1.4**: Document ownership invariants in code comments or model-adjacent notes.
  - Registered-user rows remain user-owned.
  - Guest rows remain session-owned.
  - No row should be shared across Guest sessions.

## Phase 2: Backend Auth Context and Guest Session Lifecycle
- [ ] **Task 2.1**: Add a principal/auth context helper module.
  - Suggested file: `src/security_context.py` or `src/principal_scope.py`.
  - Responsibilities:
    - normalize JWT claims
    - expose `principal_type`
    - expose `user_id`
    - expose `guest_session_id`
    - expose `is_guest`

- [ ] **Task 2.2**: Extend token issuance in [src/security.py](../../src/security.py) and [src/service/auth_service.py](../../src/service/auth_service.py).
  - Guest tokens must carry explicit claims:
    - `principal_type=guest`
    - `guest_session_id`
  - Registered-user tokens must remain backward compatible.

- [ ] **Task 2.3**: Implement Guest session manager.
  - Suggested file: `src/manager/guest_trial_manager.py`.
  - Responsibilities:
    - create session
    - seed demo data
    - update last activity
    - mark expired
    - mark cleanup requested
    - cleanup guest data

- [ ] **Task 2.4**: Add `POST /api/v1/auth/guest-login` in [src/service/auth_service.py](../../src/service/auth_service.py).
  - Creates one Guest trial session.
  - Seeds demo data.
  - Returns access token and refresh token.

- [ ] **Task 2.5**: Update `POST /api/v1/auth/refresh` for Guest sessions.
  - Allow refresh only for active, non-expired Guest sessions.
  - Reject refresh for expired or cleaned sessions.

- [ ] **Task 2.6**: Update `POST /api/v1/auth/logout` for Guest sessions.
  - Detect Guest principal from claims.
  - Trigger Guest cleanup flow.
  - Invalidate the session token path consistently.

- [ ] **Task 2.7**: Implement request-driven cleanup fallback.
  - On Guest login, refresh, or protected request, detect stale expired sessions and clean them opportunistically.
  - Keep this Phase 1 compatible with the current deployment model without requiring a scheduler.

## Phase 3: Backend Authorization and Capability Restrictions
- [ ] **Task 3.1**: Add centralized Guest policy helpers.
  - Suggested helpers:
    - `is_guest_principal()`
    - `require_registered_user()`
    - `require_trial_safe_access()`

- [ ] **Task 3.2**: Restrict member APIs in [src/service/member_service.py](../../src/service/member_service.py).
  - All Guest access returns `403`.
  - Do not rely only on hiding the frontend route.

- [ ] **Task 3.3**: Restrict import/export APIs.
  - Reject Guest access in [src/service/health_import_service.py](../../src/service/health_import_service.py).
  - Reject Guest access to export behavior in [src/service/health_service.py](../../src/service/health_service.py).

- [ ] **Task 3.4**: Restrict admin APIs in [src/service/admin_service.py](../../src/service/admin_service.py).
  - Guest access returns `403` before role checks proceed.

- [ ] **Task 3.5**: Review user/profile endpoints for Guest safety.
  - Confirm Guest cannot access or mutate persistent registered-user profile state through [src/service/user_service.py](../../src/service/user_service.py).
  - If needed, add `403` or read-only behavior explicitly.

## Phase 4: Backend Health Record Scope Refactor
- [ ] **Task 4.1**: Refactor [src/service/health_service.py](../../src/service/health_service.py) to stop assuming `get_jwt_identity()` is always a registered user id.
  - Replace direct user-id resolution with normalized principal scope.

- [ ] **Task 4.2**: Update health record create/list/get/update/delete flows to support dual scope.
  - Registered user: resolve by `user_id`.
  - Guest user: resolve by `guest_trial_session_id`.

- [ ] **Task 4.3**: Keep external health API contracts stable.
  - Do not require new frontend request shapes for create/list/update/delete.
  - Scope must be derived from auth context, not client input.

- [ ] **Task 4.4**: Simplify Guest subject behavior for Phase 1.
  - Ensure Guest session seeds exactly one default self-like subject.
  - Prevent any dependency on member management flows.

- [ ] **Task 4.5**: Ensure cleanup removes all Guest-scoped records.
  - Health records
  - RecordSubject mappings
  - seeded household/member data
  - any future Guest-owned support rows added during implementation

## Phase 5: Frontend Login and Guest UX
- [ ] **Task 5.1**: Extend auth API client in [frontend/src/services/api.js](../../frontend/src/services/api.js).
  - Add `authAPI.guestLogin()`.
  - Ensure refresh/logout flows remain compatible with Guest tokens.

- [ ] **Task 5.2**: Extend auth utilities in [frontend/src/utils/auth.js](../../frontend/src/utils/auth.js).
  - Add helpers to parse Guest claims.
  - Suggested helpers:
    - `isGuestUser()`
    - `getGuestSessionId()`
    - optional `getPrincipalType()`

- [ ] **Task 5.3**: Update [frontend/src/pages/Login.js](../../frontend/src/pages/Login.js).
  - Add a visible Guest trial button.
  - Call `authAPI.guestLogin()` on click.
  - Store tokens using the existing token flow.
  - Redirect Guest users to dashboard on success.

- [ ] **Task 5.4**: Add Guest-aware route and navigation behavior.
  - Update [frontend/src/App.js](../../frontend/src/App.js) and layout/navigation components.
  - Hide or disable:
    - members entry
    - import/export actions
    - admin entry

- [ ] **Task 5.5**: Add Guest registration guidance in-product.
  - Show clear prompts on dashboard and/or health record pages.
  - Message should explain that Guest data is temporary and registration is needed for long-term use.

- [ ] **Task 5.6**: Handle Guest session expiry UX.
  - On refresh failure for Guest, clear tokens.
  - Redirect to login.
  - Show a specific Guest-session-ended message.

## Phase 6: Demo Data and Product Behavior
- [ ] **Task 6.1**: Implement the seeded Guest demo dataset.
  - Create a minimal but realistic record set for first-time experience.
  - Ensure the dataset is complete enough to make dashboard and health record pages non-empty.

- [ ] **Task 6.2**: Verify seeded data is fully isolated per Guest session.
  - Session A edits must never appear in Session B.
  - A fresh Guest session must always return to the initialized demo state.

- [ ] **Task 6.3**: Verify Guest-created data lifecycle matches requirements.
  - New Guest records exist only during the active session.
  - Logout and expiry remove Guest-created data.

## Phase 7: Testing
- [ ] **Task 7.1**: Add backend tests for Guest login and token behavior.
  - New Guest login returns tokens and Guest claims.
  - Refresh works only while the session is active.
  - Logout triggers cleanup.

- [ ] **Task 7.2**: Add backend tests for Guest data isolation.
  - Two Guest sessions cannot see each other's records.
  - A registered user cannot see Guest records.
  - Guest cannot see registered-user records.

- [ ] **Task 7.3**: Add backend tests for restricted APIs.
  - Members APIs return `403` for Guest.
  - Import/export APIs return `403` for Guest.
  - Admin APIs return `403` for Guest.
  - Profile endpoints behave according to the finalized policy.

- [ ] **Task 7.4**: Add frontend or component-level tests for login UX.
  - Guest trial button renders.
  - Guest login success transitions into authenticated UI.

- [ ] **Task 7.5**: Add end-to-end regression coverage.
  - Guest enters from login page.
  - Guest sees seeded data.
  - Guest creates and edits a health record.
  - Guest logs out.
  - A new Guest session starts clean with only seeded demo data.

## Phase 8: Verification and Release Readiness
- [ ] **Task 8.1**: Run focused backend tests.
  - `python -m pytest tests/test_health.py -q`
  - Add dedicated Guest-focused test targets once implemented.

- [ ] **Task 8.2**: Run full fast test suite.
  - `python -m pytest -q`

- [ ] **Task 8.3**: Run end-to-end regression covering Guest flow.
  - Reuse existing Playwright setup and add the new Guest scenario.

- [ ] **Task 8.4**: Manual verification checklist.
  - Login page shows Guest entry.
  - Guest can enter without password.
  - Guest can browse seeded data.
  - Guest can create and edit records.
  - Members/import/export/admin are unavailable.
  - Logout clears Guest data.
  - New Guest session starts clean.

## Suggested Delivery Sequence
- Slice 1: schema + Guest session model + Guest login endpoint
- Slice 2: health record dual-scope support + cleanup flow
- Slice 3: restricted endpoint enforcement
- Slice 4: frontend Guest entry + navigation gating + guidance
- Slice 5: tests + manual verification + regression

## Notes
- The implementation should preserve the current service-manager layering: service handles HTTP and policy gates; manager handles DB operations and lifecycle logic.
- Do not implement Guest as one shared persistent `User` row only; that would violate the isolation requirement.
- Keep Phase 1 intentionally narrow: full health-record trial only, without members/import/export/admin or Guest-to-user migration.