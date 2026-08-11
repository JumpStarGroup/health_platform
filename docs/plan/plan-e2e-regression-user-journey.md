# Implementation Plan: E2E Regression (CN-first) – Register/Login/Health CRUD/Member

## References
- Requirement: docs/requirements/req-e2e-regression-user-journey.md
- Design: docs/design/design-e2e-regression-user-journey.md
- Tracking Issue: https://github.com/JumpStarGroup/health_platform/issues/1

## Phase 0: Baseline & Conventions (Prep)
- [ ] **Task 0.1**: Confirm existing Playwright setup works locally.
  - Command: `cd tests/e2e && npm install && npx playwright install --with-deps && npm run test -- tests/simple-login.spec.js`
  - Done when: a baseline spec passes against local frontend+backend.
- [ ] **Task 0.2**: Define deterministic test naming helpers.
  - Output: a helper that generates a minute-stamped prefix `YYYYMMDD-HHmm-demo` plus a short suffix to avoid same-minute collisions.
  - Done when: helper produces username, email, and member name strings.

## Phase 1: E2E Helper Layer (Utilities)
- [ ] **Task 1.1**: Add a shared “test data factory” helper.
  - Location: `tests/e2e/utils/` (e.g., `testData.js`).
  - Functions:
    - `makeRunId()` → `{ prefix, suffix, runId }`
    - `makeUser(runId)` → `{ username, email, password, age, gender, weight }`
    - `makeMemberName(runId)` → `Member-{runId}`
  - Done when: all E2E tests can import and reuse it.

- [ ] **Task 1.2**: Harden language switching helper for CN-first execution.
  - Update: `tests/e2e/utils/auth.js`.
  - Behavior:
    - After login, navigate to `/settings`.
    - Detect current language selection (prefer reading form value; fallback to visible language marker).
    - If not `zh`, switch to Chinese and save.
    - Verify a Chinese UI marker exists (e.g., nav/menu item contains `健康记录`).
  - Done when: helper is idempotent (running twice does not break) and avoids brittle text assertions.

- [ ] **Task 1.3**: Add shared “register + login” helper that uses stable `data-testid` selectors.
  - Update: `tests/e2e/utils/auth.js` or new `flows.js`.
  - Must:
    - Use `register-*` and `login-*` test ids.
    - Return the created user data for subsequent steps.
  - Done when: flow can be called from a spec with no duplication.

- [ ] **Task 1.4**: Add shared “member management” helpers.
  - Location: `tests/e2e/utils/`.
  - Functions:
    - `createMember(page, { full_name, gender, age, height, weight })`
    - `switchMemberInHeader(page, memberDisplayName)`
  - Done when: member creation and switching are stable across runs.

## Phase 2: Core Regression Spec (CN-first)
- [ ] **Task 2.1**: Create the regression spec file.
  - File: `tests/e2e/tests/regression-user-journey-cn.spec.js`
  - One cohesive test case (single scenario) that:
    1) registers a new user with minute-stamped username/email
    2) logs in
    3) ensures Chinese language via Settings
    4) creates 1 valid Self health record (e.g., 120/80)
    5) attempts invalid out-of-range values (e.g., 300/30) and verifies submit is blocked / error state exists
    6) edits the valid record to new valid BP (e.g., 125/85) and verifies persistence
    7) creates a new family member with timestamped name
    8) switches member via header selector
    9) creates 1 valid record under that member and verifies it appears
  - Done when: spec is green locally and does not depend on pre-seeded users.

- [ ] **Task 2.2**: Make assertions resilient.
  - Rules:
    - Prefer state verification (table contains `systolic/diastolic`) over toast-only checks.
    - Avoid `waitForTimeout` unless there is no deterministic condition.
  - Done when: repeated runs show low flakiness.

## Phase 3: (Minimal) Frontend Testability Improvements (If Needed)
These are only required if member switching proves flaky.

- [ ] **Task 3.1 (Optional)**: Add a stable selector for the header member dropdown.
  - File: `frontend/src/components/MemberSelector.js` and/or `frontend/src/components/Layout.js`.
  - Add: `data-testid="member-selector"`.
  - Done when: Playwright can select member reliably without relying on brittle DOM structure.

- [ ] **Task 3.2 (Optional)**: Add stable selectors on Settings language select.
  - File: `frontend/src/pages/Settings.js`.
  - Add: `data-testid="settings-language"` on Select and `data-testid="settings-save"` on Save button.
  - Done when: E2E can read/change language via `getByTestId`.

## Phase 4: Manual Trigger CI Workflow
- [ ] **Task 4.1**: Add a new GitHub Actions workflow for manual E2E regression runs.
  - File: `.github/workflows/e2e-regression.yml`
  - Trigger: `workflow_dispatch`
  - Inputs:
    - `headless` (boolean)
    - `base_url` (string; default `http://localhost:3000`)
  - Steps:
    - Setup Python + install backend deps
    - Start backend on port 5000 (background)
    - Setup Node 18
    - Install frontend deps (`frontend/`) and E2E deps (`tests/e2e/`)
    - Install Playwright browsers
    - Run: `cd tests/e2e && npx playwright test tests/regression-user-journey-cn.spec.js`
  - Done when: workflow can be triggered manually and produces Playwright HTML report artifacts.

## Phase 5: Verification & Documentation
- [ ] **Task 5.1**: Local verification checklist.
  - Start backend + frontend.
  - Run: `cd tests/e2e && npm run test -- tests/regression-user-journey-cn.spec.js`
  - Done when: green result and report generated.

- [ ] **Task 5.2**: Update E2E test documentation.
  - File: `tests/e2e/TEST_CASES.md` (add the new regression test entry).
  - Done when: the new regression scenario is listed with purpose and how to run.

## Phase 6: Follow-ups (V2)
- [ ] **Task 6.1 (V2)**: Add EN full-flow run (either separate spec or parameterized run).
- [ ] **Task 6.2 (V2)**: Strengthen error validation (verify specific CN/EN validation messages) once V1 is stable.

## Definition of Done
- [ ] Requirement AC1–AC8 are covered by the new CN-first regression spec.
- [ ] Manual CI workflow exists and is runnable on demand.
- [ ] Docs updated to show how to run the regression locally and via Actions.
