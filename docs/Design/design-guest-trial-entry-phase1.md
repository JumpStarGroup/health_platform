# Design: Guest Trial Entry Phase 1

## 1. Overview
- Reference Requirement: [req-guest-trial-entry.md](../requirements/req-guest-trial-entry.md)
- GitHub Issue: #17
- Goal: add a password-free Guest trial entry on the login page while preserving data isolation between Guest sessions and blocking sensitive capabilities.
- Phase 1 explicitly excludes member management, import/export, administrator capabilities, and Guest-to-registered data migration.

## 2. Existing System Analysis

### 2.1 Authentication Flow Today
- Backend authentication is centered on persistent users through [src/service/auth_service.py](../../src/service/auth_service.py).
- Access and refresh tokens are issued from [src/security.py](../../src/security.py) with the JWT identity set to the real `user.id`.
- Frontend login is implemented in [frontend/src/pages/Login.js](../../frontend/src/pages/Login.js) and only supports email/username plus password.
- Route protection in [frontend/src/App.js](../../frontend/src/App.js) only distinguishes authenticated vs unauthenticated and password-change enforcement.

### 2.2 Data Ownership Today
- Core data tables in [src/models.py](../../src/models.py) are anchored to persistent user ownership:
  - `User`
  - `HealthRecord.user_id`
  - `Household.owner_user_id`
  - `RecordSubject.created_by_user_id`
- Service endpoints such as [src/service/health_service.py](../../src/service/health_service.py), [src/service/member_service.py](../../src/service/member_service.py), [src/service/health_import_service.py](../../src/service/health_import_service.py), and [src/service/admin_service.py](../../src/service/admin_service.py) resolve scope from `get_jwt_identity()` and assume it is a real user id.

### 2.3 Architectural Consequence
- The requirement says Guest is a shared experience entry for all visitors, but also requires session-level demo isolation and cleanup.
- A single reusable shared Guest account would violate that requirement because all requests would resolve to the same `user_id`, causing cross-session read/write contamination.
- Therefore Phase 1 must introduce a separate Guest session scope and capability policy instead of modeling Guest as only one persistent shared user row.

## 3. Design Principles
- Preserve the existing Flask + JWT + React flow rather than introducing a second authentication stack.
- Add Guest support as a new authenticated principal type, not as a weakened variant of the password login endpoint.
- Keep the external health-record API mostly stable where possible and move complexity into backend scope resolution.
- Enforce Guest restrictions on the backend first; frontend visibility changes are only UX improvements.
- Model cleanup explicitly so logout and expiry behave consistently.

## 4. Target Architecture

### 4.1 Principal Model
- Introduce a new authenticated principal type: `guest`.
- Registered users continue to authenticate as `principal_type=user`.
- Guest logins authenticate as `principal_type=guest` and carry a unique `guest_session_id` claim.
- JWT claims should be sufficient for downstream services to determine:
  - principal type
  - real user id if present
  - guest session id if present
  - role
  - capability profile

### 4.2 Scope Resolution Layer
- Add a backend auth/scope helper that converts JWT claims into one normalized request context.
- Example normalized context:
  - `principal_type`
  - `user_id`
  - `guest_session_id`
  - `role`
  - `is_guest`
- Service and manager layers should stop directly assuming `get_jwt_identity()` equals a persistent user boundary.
- Instead, service endpoints should resolve an effective access scope through this helper and pass that scope to business logic.

### 4.3 Guest Session Lifecycle
- Entry:
  - Visitor clicks Guest trial button on login page.
  - Backend creates one Guest trial session row.
  - Backend seeds session-specific demo data.
  - Backend returns access token and refresh token carrying Guest claims.
- Active:
  - Requests operate only inside the created Guest session scope.
  - Restricted endpoints reject Guest access with `403`.
- Logout:
  - Guest logout invalidates tokens and marks the Guest session for cleanup.
  - Guest session data is deleted or hard-cleaned.
- Expiry:
  - On inactivity timeout or token expiry, refresh is rejected.
  - Session is marked expired and scheduled for cleanup.
- Cleanup failure:
  - Session enters `cleanup_failed` and remains non-reusable.
  - Retryable cleanup is allowed, but stale data can never be attached to a later Guest login.

## 5. Data Model

### 5.1 New Entity
- Add entity: `GuestTrialSession`

### 5.2 Proposed Schema
- `GuestTrialSession`
  - `id`: string UUID or comparable opaque identifier
  - `status`: `active`, `expired`, `cleanup_pending`, `cleaned`, `cleanup_failed`
  - `seed_version`: string or integer, identifies which demo dataset version was used
  - `created_at`
  - `last_activity_at`
  - `expires_at`
  - `cleanup_requested_at`
  - `cleaned_at`

### 5.3 Ownership Extension
- Extend core trial-relevant tables with nullable `guest_trial_session_id`:
  - `health_records`
  - `households`
  - `members`
  - `record_subjects`
- Existing registered-user ownership fields remain in place.
- Ownership invariant:
  - Registered-user rows: `user_id` or equivalent persistent owner is populated and `guest_trial_session_id` is null.
  - Guest rows: `guest_trial_session_id` is populated and persistent owner fields are null or set only where strictly required for backward compatibility.

### 5.4 Why This Direction
- Reusing primary tables is lower-risk for Phase 1 than creating parallel shadow tables because current service/manager logic already depends on these domain tables.
- Adding `guest_trial_session_id` allows current endpoints to be adapted without duplicating all health record logic.
- This does require strict query hardening so no path accidentally falls back to registered-user ownership semantics for Guest requests.

## 6. Demo Data Strategy

### 6.1 Seed Model
- Each new Guest session receives a fresh seeded dataset.
- Seeded dataset should include only the minimum complete experience required for dashboard and health-record browsing.
- Recommended Phase 1 seed contents:
  - one implicit self subject
  - a small set of health records spanning different timestamps and tags

### 6.2 Seeding Mechanics
- Seed on Guest login after the session row is created.
- Associate all seeded rows with `guest_trial_session_id`.
- Avoid sharing mutable demo rows across sessions.

### 6.3 Recommended Scope Simplification
- Because Phase 1 excludes member management, Guest mode should operate with exactly one default subject equivalent to Self.
- Do not seed editable extra members in Phase 1.
- This keeps AC3 satisfied for the health-record journey while respecting the explicit Phase 1 boundary.

## 7. API Contract

### 7.1 New Endpoint
- `POST /api/v1/auth/guest-login`
  - Purpose: create Guest trial session, seed demo data, issue tokens
  - Request body: empty
  - Success response:
    - `access_token`
    - `refresh_token`
    - `token_type`
    - `expires_in`
    - `refresh_expires_in`
    - `principal_type: guest`
    - `guest_session_id`

### 7.2 Existing Endpoint Adjustments
- `POST /api/v1/auth/refresh`
  - Must support refreshing Guest tokens while the Guest session remains active and not expired.
- `POST /api/v1/auth/logout`
  - Must recognize Guest refresh tokens and trigger Guest session cleanup.
- Optional `GET /api/v1/auth/session`
  - Returns normalized session metadata for frontend display and capability gating.
  - Not strictly required for Phase 1 if claims parsing is sufficient.

### 7.3 Unchanged External Health APIs, Changed Internal Semantics
- Keep these APIs externally stable for Phase 1:
  - `POST /api/v1/health`
  - `GET /api/v1/health`
  - `GET /api/v1/health/{id}`
  - `PUT /api/v1/health/{id}`
  - `DELETE /api/v1/health/{id}`
- Internal behavior changes:
  - registered users resolve by user ownership
  - Guest users resolve by `guest_trial_session_id`

### 7.4 Explicitly Restricted APIs for Guest
- Reject Guest access with `403 Forbidden` for:
  - all `members` endpoints
  - all `health/import` endpoints
  - `health/export`
  - all `admin` endpoints
  - any future sensitive endpoint not marked trial-safe

## 8. Backend Component Design

### 8.1 New or Updated Backend Components
- [src/service/auth_service.py](../../src/service/auth_service.py)
  - add `guest-login`
  - extend `refresh` and `logout`
- New manager: `guest_trial_manager.py`
  - create session
  - seed data
  - mark active/expired/cleanup states
  - cleanup trial data
- New helper module, for example `auth_context.py` or `principal_scope.py`
  - normalize JWT claims into runtime access scope
- [src/service/health_service.py](../../src/service/health_service.py)
  - replace direct `user_id` assumptions with resolved scope
- [src/service/member_service.py](../../src/service/member_service.py)
  - hard reject Guest access
- [src/service/health_import_service.py](../../src/service/health_import_service.py)
  - hard reject Guest access
- [src/service/admin_service.py](../../src/service/admin_service.py)
  - hard reject Guest access
- [src/models.py](../../src/models.py)
  - add `GuestTrialSession`
  - extend trial-owned tables with `guest_trial_session_id`

### 8.2 Authorization Policy
- Add one central policy helper instead of duplicating Guest checks in every endpoint.
- Policy methods should express intent, for example:
  - `require_registered_user()`
  - `require_trial_safe_access()`
  - `is_guest_principal()`

### 8.3 Cleanup Strategy
- Phase 1 recommended approach:
  - synchronous cleanup on explicit logout
  - lazy cleanup on subsequent Guest login and on any request that detects expired sessions
- This avoids introducing external scheduler infrastructure in the first slice.
- If later needed, background sweep can be added without breaking the data model.

## 9. Frontend Component Design

### 9.1 Login Experience
- Update [frontend/src/pages/Login.js](../../frontend/src/pages/Login.js) to add a visible Guest trial button.
- Clicking the button calls `authAPI.guestLogin()`.
- On success, frontend stores tokens exactly as it does today, plus Guest session metadata if needed.

### 9.2 Auth Utilities
- Extend [frontend/src/utils/auth.js](../../frontend/src/utils/auth.js) to parse:
  - `principal_type`
  - `guest_session_id`
  - Guest capability flags if included
- Add helpers such as:
  - `isGuestUser()`
  - `getGuestSessionId()`

### 9.3 Route and Navigation Behavior
- [frontend/src/App.js](../../frontend/src/App.js) remains the protected-route shell, but guest-aware UI behavior is added above route rendering.
- Layout and navigation should hide or disable:
  - members entry
  - import/export actions
  - admin entry
- Guest mode should show clear upgrade prompts in dashboard, health records, or settings-adjacent surfaces.

### 9.4 Session Expiry UX
- If a Guest refresh fails because the session expired, clear tokens and redirect to login.
- Show a specific message that the Guest trial session has ended and data was not preserved.

## 10. Security and Permission Model
- Backend remains authoritative for Guest restrictions.
- JWT claims for Guest must not reuse admin or registered-user semantics accidentally.
- Guest session ids must be opaque and non-guessable.
- Guest demo data should never be promoted to real-user data silently.
- Any endpoint that mutates profile, members, import sessions, or admin roles must refuse Guest access regardless of frontend visibility.

## 11. Failure Modes and Mitigations
- Query leakage risk:
  - Mitigation: central scope resolver and targeted regression tests for Guest isolation.
- Cleanup gap when browser closes directly:
  - Mitigation: expiry state plus request-driven lazy cleanup.
- Seed amplification and table growth:
  - Mitigation: keep seed dataset intentionally small and clean expired sessions aggressively.
- Claim ambiguity:
  - Mitigation: explicit `principal_type` claim and Guest-specific policy checks.
- Frontend-only restriction drift:
  - Mitigation: backend `403` enforcement for all restricted APIs.

## 12. Testing Strategy
- Backend unit/integration tests:
  - Guest login creates a session and returns Guest claims.
  - Guest list/create/update/delete health record stays within session scope.
  - Two Guest sessions cannot read or mutate each other's data.
  - Guest logout removes session data.
  - Expired Guest session is rejected on refresh.
  - Members/import/export/admin APIs return `403` for Guest.
- Frontend tests:
  - login page shows Guest button
  - Guest login navigates to dashboard
  - restricted navigation items are hidden or disabled
- E2E tests:
  - Guest can browse seeded data
  - Guest can add and edit records
  - logout ends trial and data is reset for the next Guest session

## 13. High-Level Task Blocks
- [ ] Database migration for Guest trial session and session-scoped ownership fields
- [ ] Backend auth contract and JWT claim extension
- [ ] Backend Guest session lifecycle manager and cleanup flow
- [ ] Health service scope resolution refactor
- [ ] Guest restriction enforcement for members/import/export/admin
- [ ] Frontend login, auth utility, and navigation updates
- [ ] Backend and E2E verification for isolation and cleanup

## 14. Open Questions
- What exact Guest TTL should Phase 1 use for inactivity and absolute session lifetime?
- Should seeded demo data be fully editable, or should some baseline rows remain fixed and only copied-on-write?
- Is request-driven cleanup sufficient for the expected trial volume, or should a scheduled sweeper be added early?
- Should the frontend show Guest mode in the header consistently, or only through page-level prompts?# Design: Guest Trial Entry Phase 1

## 1. Overview
- Reference: [docs/requirements/req-guest-trial-entry.md](../requirements/req-guest-trial-entry.md)
- Goal: introduce a password-free guest trial entry on the login page while preserving strict isolation between guest sessions and preventing access to sensitive capabilities.
- Phase 1 excludes member management, import/export, administrator capabilities, and guest-to-registered data migration.

## 2. Architecture Judgment
- The current system is centered on a persistent authenticated user identity. Health records, households, members, and record-to-member mappings are all anchored to a real user identifier in the backend model and JWT flow.
- Because the requirement asks for a shared guest identity with per-session isolated demo data, the correct design boundary is not a single reusable guest account. Phase 1 should introduce a separate guest session context that is authenticated through JWT but isolated through a session-scoped trial namespace.
- In practice, this means the system should keep the existing Flask + React request flow and authorization stack, but add a guest session layer that sits between authentication and domain data access.

## 3. Architecture Changes

### Backend
- Add a dedicated guest trial sign-in endpoint under the auth service.
- Extend JWT claims to distinguish guest sessions from registered users.
- Introduce a guest trial session aggregate responsible for lifecycle state, demo seed ownership, expiry, and cleanup coordination.
- Route health record queries and mutations through a scope resolver that derives the effective data boundary from the authenticated context.
- Enforce capability restrictions at service-layer entry points, not only in the frontend.

### Frontend
- Add a guest trial entry on the login page and persist a minimal guest session descriptor alongside tokens.
- Surface guest-mode messaging throughout the dashboard flow, especially around restricted features and registration guidance.
- Hide or disable member management, import/export, and admin entry points when the authenticated context is guest.
- Handle guest session expiry as a first-class state transition and return the user to login with an explanation.

## 4. System Boundary
- Authentication boundary: guest access is created only by a dedicated guest-login flow, not by weakening the existing username/password login contract.
- Session boundary: each guest login produces a unique guest trial session identifier and a bounded JWT claim set.
- Data boundary: all Phase 1 guest-visible health data must be resolved by guest session scope, not by the shared logical guest user alone.
- Capability boundary: guest access is limited to the core health record experience only.
- Persistence boundary: guest trial data is temporary and must be treated as disposable system-owned data.

## 5. Data Isolation Strategy
- Recommendation: use a guest trial session entity plus session-scoped ownership fields on trial data or on a dedicated mapping table.
- Do not rely on a single shared guest user_id as the only isolation key. The current data model uses user_id as the primary ownership boundary for HealthRecord, Household, Member, and RecordSubject, so a shared guest user alone would cause cross-session contamination.
- Preferred Phase 1 model:
  - Keep one logical guest principal type for authentication semantics.
  - Create one guest trial session row per entry.
  - Seed demo data per guest trial session.
  - Resolve reads and writes by guest_trial_session_id.
- Data visibility rule:
  - Registered users continue to read and write by real user_id.
  - Guest users read and write only data attached to their current guest_trial_session_id.
- Cleanup rule:
  - Logout triggers immediate cleanup for that guest session.
  - Expired sessions are marked expired and cleaned by a background sweeper or deferred cleanup hook.
  - Cleanup must remove both seeded demo copies and guest-created mutations for that session.

## 6. Session Lifecycle
- Entry:
  - Visitor clicks Guest Trial on login page.
  - Backend creates a guest trial session with status active, issued_at, expires_at, and cleanup_status.
  - Backend seeds session-specific demo data.
  - Backend returns access token and refresh token with guest claims.
- Active use:
  - Every request resolves auth context into either registered mode or guest mode.
  - Guest mode applies restricted navigation and server-side capability checks.
- Logout:
  - Refresh-token logout invalidates the session token version and marks the guest session as logout_requested or cleaned.
  - Cleanup job deletes guest-scoped data and finalizes the session state.
- Expiry:
  - On inactivity timeout or absolute TTL, tokens expire and the backend refuses refresh.
  - Session is marked expired and scheduled for cleanup.
- Failure recovery:
  - If cleanup fails, the session remains terminal but flagged for retry so stale trial data cannot be reassigned to a future visitor.

## 7. Permission Boundary
- Guest claims should include an explicit subject type such as principal_type=guest and capability flags or a derived policy profile.
- Service-layer protection should block guest access to:
  - member APIs
  - import/export APIs
  - admin APIs
  - any future endpoint marked as non-trial-safe
- Frontend should mirror the same policy for UX clarity, but the backend remains authoritative.
- Guest users should be allowed only to:
  - access dashboard and health record views
  - create, list, edit, and optionally delete health records within their guest session scope
  - see upgrade or register calls to action

## 8. Data Model Direction
- Add entity: GuestTrialSession
  - id
  - guest_key or public_session_id
  - status: active, expired, cleaned, cleanup_failed
  - created_at
  - last_activity_at
  - expires_at
  - cleanup_requested_at
  - cleaned_at
  - seed_version
- Add guest scoping to trial-owned data using one of two options:
  - Option A: add nullable guest_trial_session_id to HealthRecord, Household, Member, RecordSubject and enforce either user_id or guest_trial_session_id ownership.
  - Option B: introduce guest-owned shadow tables for Phase 1 trial data.
- Recommendation: Option A is lower integration cost for Phase 1 because the existing service and manager layers already operate on the primary domain tables, but it requires careful ownership constraints and query hardening.

## 9. API Interface Direction
- Add guest sign-in endpoint:
  - POST /api/v1/auth/guest-login
- Keep existing login, refresh, logout endpoints, but extend their behavior to understand guest session claims.
- Optional support endpoint for registration guidance or session introspection:
  - GET /api/v1/auth/session
- Existing health APIs should remain stable externally, but their authorization and scope resolution must become context-aware.

## 10. High-Level Task Blocks
- [ ] Introduce guest auth contract and JWT claim model.
- [ ] Add guest trial session persistence and lifecycle states.
- [ ] Define demo-data seeding strategy for each new guest session.
- [ ] Refactor service-layer authorization to use capability policies.
- [ ] Refactor data access paths to resolve user scope versus guest session scope.
- [ ] Add logout and expiry cleanup orchestration.
- [ ] Update login UX and restricted-feature UX.
- [ ] Add backend and E2E coverage for session isolation and restricted access.

## 11. Key Risks
- Query leakage risk: current managers and services assume user_id ownership; any missed query path could expose or mix guest data.
- Cleanup reliability risk: if cleanup depends only on synchronous logout, abandoned sessions will accumulate stale data.
- Seed amplification risk: copying full demo datasets per session may create rapid table growth under repeated guest traffic.
- JWT ambiguity risk: if guest and registered sessions share the same identity semantics, downstream code may grant incorrect access.
- UX inconsistency risk: hiding restricted functions in React without backend enforcement will create security gaps.
- Future migration risk: a Phase 1 design that hard-deletes trial data without stable session metadata may complicate a later guest-to-user conversion feature.

## 12. Open Questions
- Should Phase 1 support editing and deleting seeded demo records, or only creating new records on top of a baseline dataset?
- What is the target guest session TTL and inactivity timeout?
- Is background cleanup infrastructure acceptable in the current deployment model, or must cleanup be request-driven only?
- What is the acceptable upper bound for concurrent guest sessions and demo data volume?
- Should guest mode expose exactly one demo subject, or a fixed read-only household plus record editing capability without member management?