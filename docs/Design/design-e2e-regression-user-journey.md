# Design: E2E Regression – Register/Login/Health CRUD/Member (CN-first, Manual Trigger)

## 1. Overview
- Reference: [docs/requirements/req-e2e-regression-user-journey.md](../requirements/req-e2e-regression-user-journey.md)
- Tracking Issue: https://github.com/workshop-copilot/health_platform/issues/3
- Goal: Provide a stable Playwright-based UI E2E regression that validates the core user journey end-to-end, with Chinese UI as the primary locale and a manual trigger workflow.

## 2. Architecture Changes
- **Backend**: No functional change required for V1. E2E consumes existing APIs.
- **Frontend**: No functional change required for V1. E2E leverages existing routes and existing `data-testid` hooks already present on Login/Register and some Health Records controls.
- **Testing (E2E)**:
  - Add a dedicated Playwright spec for this regression journey.
  - Add/extend shared Playwright utilities for:
    - minute-stamped user/email generation
    - language verification + switch-to-Chinese via Settings page
    - member creation + member selection via header `MemberSelector`

## 3. Data Model
- No schema changes.

## 4. API Interface (Used by UI)
All endpoints already exist; the E2E will validate the full UI flow, which indirectly validates these APIs:
- Auth:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
- Health records:
  - `GET /api/v1/health` (with `page` + `size`, optional filters)
  - `POST /api/v1/health`
  - `PUT /api/v1/health/{id}`
- Members:
  - `GET /api/v1/members`
  - `POST /api/v1/members`

## 5. Test Design (Playwright)

### 5.1 Location & Naming
- Test suite location: `tests/e2e/tests/`
- New spec file (proposed): `tests/e2e/tests/regression-user-journey-cn.spec.js`
- Use single-worker, sequential execution (already configured): `workers: 1`, `fullyParallel: false` in `tests/e2e/playwright.config.js`.

### 5.2 Test Data Strategy (Minute Timestamp)
Requirement wants a human-readable minute-stamp to distinguish runs.

- **Primary format** (prefix): `YYYYMMDD-HHmm-demo`
  - Example (Asia/Shanghai): `20260113-0932-demo`
- **Collision avoidance** (recommended): append a short suffix while preserving the required prefix.
  - Example: `20260113-0932-demo-4821`
  - Rationale: minute-level alone can collide if multiple runs start within the same minute.

Email follows the same timestamp pattern:
- Example: `e2e.20260113-0932-demo-4821@example.com`

Implementation note: Playwright config already sets `timezoneId: 'Asia/Shanghai'` and `locale: 'zh-CN'`, which makes the “minute stamp” stable.

### 5.3 Locale / Language Handling
Constraints:
- App language is persisted in localStorage:
  - Global key: `app_language`
  - Per-user key: `lang_user_{uid}` (see `frontend/src/pages/Settings.js`)
- Default language in Settings is currently effectively English if no stored preference.

V1 strategy (matches requirement):
1) After login, navigate to `/settings`.
2) Read the current language selection.
3) If not Chinese (`zh`), switch to Chinese and Save.
4) Confirm Chinese UI by asserting a stable Chinese UI marker.

Recommended selector strategy:
- Prefer `data-testid` when available.
- When not available on Settings page, use robust Ant Design selectors:
  - `.ant-select` + option content that contains `中文`
  - Save button `button[type="submit"]` (already used in `tests/e2e/utils/auth.js`)

Stability note:
- Avoid strict assertions on translated strings beyond a minimal “Chinese marker” (e.g., menu item contains `健康记录`), to reduce flakiness.

### 5.4 User Journey Flow (Single Test)
Single “happy path + validation” test is preferred for regression (one cohesive scenario).

Steps and key assertions:

1) **Register new user**
- Page: `/register`
- Use stable selectors already present:
  - `register-username`, `register-email`, `register-password`, `register-confirm`, `register-age`, `register-gender`, `register-weight`, `register-submit`
- Assert: registration completes (success toast) or user redirected to `/login`.

2) **Login**
- Page: `/login`
- Use stable selectors:
  - `login-email`, `login-password`, `login-submit`
- Assert: redirect to dashboard/home; header shows current user via `data-testid="current-user"`.

3) **Ensure Chinese UI**
- Navigate: `/settings`
- If needed: select `中文` and save
- Assert: Chinese marker visible (e.g., menu has `健康记录` or page title uses Chinese).

4) **Create a valid health record for Self (default member)**
- Navigate: `/health-records`
- Click: `添加记录`
- Input valid BP within range (30–250) and systolic > diastolic:
  - Example: 120/80
- Submit and assert success toast; assert table contains `120/80`.

5) **Attempt invalid (out-of-range) BP and verify blocked**
- Open add record modal
- Input out-of-range value:
  - Example: systolic = 300, diastolic = 30
- Assert:
  - error state visible (e.g., `.ant-form-item-explain-error` exists) OR
  - submit does not produce success toast
  - modal remains open

6) **Edit an existing health record and verify changes persisted**
- Choose a deterministic target:
  - Prefer editing the record created in step 4 (most stable)
- Update BP to another valid value:
  - Example: 125/85
- Submit; assert success toast; assert table contains updated BP.

7) **Create a family member**
- Navigate: `/members` (route name may be in menu; verify by `frontend/src/pages/Members.js`)
- Click Add, fill `full_name` with timestamped name (e.g., `Member-20260113-0932-4821`)
- Save; assert success toast; assert new member appears in table.

8) **Create one health record for the new member (same day)**
- Switch active member using header `MemberSelector` (component `frontend/src/components/MemberSelector.js`)
- Navigate back to `/health-records`
- Create a valid BP record
- Assert record visible under that selected member context.

### 5.5 Selectors & Robustness
- Prefer `data-testid`:
  - Already present for login/register and some health record controls.
- For member selection:
  - Header `Select` currently has no `data-testid`; for V1 we can use a role-based locator or add a small non-functional `data-testid` in a follow-up if needed.
- Avoid `waitForTimeout` unless strictly necessary; prefer Playwright `expect(...).toBeVisible()` (auto-wait).

## 6. CI / Manual Trigger Design (GitHub Actions)
Requirement: manual trigger.

Proposed workflow (new): `.github/workflows/e2e-regression.yml`
- `on: workflow_dispatch`
- Inputs:
  - `base_url` (default `http://localhost:3000`)
  - `headless` (default `true`)
- Steps:
  1) Checkout
  2) Set up Node.js 18
  3) Set up Python 3.10+
  4) Install backend deps (`pip install -r requirements.txt`)
  5) Start backend (`flask --app src.app run --port 5000`) in background
  6) Install frontend deps (`npm ci`) and E2E deps (`cd tests/e2e && npm ci`)
  7) Install Playwright browsers (`npx playwright install --with-deps`)
  8) Run Playwright with grep/tag targeting this regression spec

Notes:
- Existing Playwright config auto-starts frontend dev server via `webServer` (cwd `../../frontend`). Backend must be started by the workflow.
- Use `workers: 1` to reduce race/flakiness.

## 7. Risks & Mitigations
- **Language default may be English**: always navigate to Settings after login; force `zh` if needed.
- **MemberSelector lacks stable test id**: V1 can use role-based selection; if flaky, add a non-functional `data-testid` to the header `MemberSelector` wrapper in a follow-up.
- **Minute-only uniqueness collision**: append short suffix while preserving the required minute-stamped prefix.
- **Toast-based assertions** can be flaky: prefer verifying persisted state in table/list after action.

## 8. High-Level Task Blocks
- [ ] Add regression E2E spec (CN-first) under `tests/e2e/tests/`
- [ ] Add shared E2E helper(s) for:
  - [ ] minute-stamped user/email generation
  - [ ] ensure Chinese via Settings (verify current selection first)
  - [ ] member creation + member switching
- [ ] Add GitHub Actions manual workflow to run this spec
- [ ] (Optional V2) English full-flow regression run
- [ ] (Optional V2) Stronger validation of error messages (CN/EN)
