# Implementation Plan: Optional User and Household Demographics

Status: Submitted for independent plan review; not approved for implementation.

## 1. Approved Inputs and Publication

- Tracking issue: https://github.com/JumpStarGroup/health_platform/issues/12 (Refs #12); complexity:complex.
- Existing Draft docs PR: https://github.com/JumpStarGroup/health_platform/pull/13, targeting main.
- Shared branch: `docs/12-optional-user-demographics`. Author, validate, commit and push from the current local worktree; preserve unrelated user changes.
- Requirement: `docs/requirements/req-optional-user-demographics.md` at `6feaf1fde417f2ff387ecfb71a8b20270c640048`.
- Requirement approval: https://github.com/JumpStarGroup/health_platform/pull/13#issuecomment-5793333195, signed Admin; independent-human clarification: https://github.com/JumpStarGroup/health_platform/pull/13#issuecomment-5793502137.
- Design: `docs/design/design-optional-user-demographics.md` at `5d0f94cf33e25503e4273da9c952a0ce0b291c4c`.
- Design approval: https://github.com/JumpStarGroup/health_platform/pull/13#issuecomment-5793847626, signed Admin, explicitly allowing implementation planning. The user confirmed Admin's independence. This is DESIGN-APPROVED, not PLAN-APPROVED.
- Both artifacts were read at their approved remote commits and checked unchanged against the publication baseline `5d0f94cf33e25503e4273da9c952a0ce0b291c4c`. The historical draft wording inside the design is superseded only by the linked human approval; this plan does not edit that approved artifact.
- Submitting this plan for review advances only stage:drafted to stage:analyzed. It does not set stage:reviewed or stage:developed.

The requirement's conditional performance item remains open. Do not invent a threshold, claim closure, or begin implementation before Gate 1. Any change to an approved artifact must return to its owning reviewer for approval of the new full remote commit SHA.

## 2. Execution Gates and Conventions

Gate G1: before any implementation task P01-P27, independently approve this plan, close the pre-development condition P00, obtain all three current document approvals with no blocking findings, pass required docs-PR checks, resolve conversations and obtain non-author natural-person PR approval. The approving reviewer performs the squash merge. Only after the docs PR is merged into main and Issue remains stage:analyzed may the Development Readiness Reviewer evaluate Gate 1 and set stage:reviewed. No feature branch or implementation is created by this planning activity.

Every task below identifies its direct prerequisites and direct consumers. All P01-P27 also require G1, even where omitted in the compact dependency column. Start from the approved, merged baseline; do not bypass dependencies to fit estimates. Size is active effort for one responsible person, including task-scoped tests, not elapsed approval/CI waiting time. One day means at most eight hours. If a task exceeds its estimate or approved scope, split it and seek plan review before expanding the work. Estimates are not execution evidence.

All tasks are pending. Suggested future helper/test files are explicitly marked NEW; no feature files are created by this plan. Reuse current fixtures and suites, never remove unrelated regression coverage. Developer owns Pytest and focused component-level Playwright; QA owns cross-module journey Playwright and independent operational verification. DevOps owns deployment operations; production execution requires its existing approvals, not this plan alone.

## 3. Ordered Tasks

### 3.1 Pre-development Condition

| ID and objective | Files/modules and result | Prerequisites -> consumers | Validation / acceptance | Responsible role | Size |
|---|---|---|---|---|---|
| P00 Define performance acceptance | Requirement approval thread and requirement NFR section: name profile/member scenarios, fixture sizes, concurrency, baseline environment and acceptable latency regression; or explicitly approved applicability decision. Route requirement/design amendments for renewed SHA-bound review. | Existing conditional REQ-APPROVED -> G1, P22 | Independent requirement reviewer confirms a reproducible criterion in the remote record; DRR checks closure. Do not treat a plan placeholder as closure. | Product Manager / requirement owner DevOps-zhuang | 0.5 day |

### 3.2 Models and Migration

| ID and objective | Files/modules and result | Prerequisites -> consumers | Validation / acceptance | Responsible role | Size |
|---|---|---|---|---|---|
| P01 Add nullable month fields and model tests | `src/models.py`, `tests/test_user.py`, `tests/test_members.py`: nullable String(7) birth_month on User and Member, no default/index; legacy age columns and unrelated data unchanged. | G1 -> P02, P05, P06 | V1; inspect model metadata and round-trip null/month while preserving stored legacy ages. | Backend Developer | 0.5 day |
| P02 Implement expand-only migration and guarded downgrade | NEW revision under `migrations/versions/`, NEW `tests/test_demographics_migration.py`: successor of the implementation-time head (approved baseline: 20260414_add_medical_histories); only add two nullable columns, no backfill. Downgrade refuses any non-null birth_month. No blanket Alembic stamping. | P01 -> P03, P23 | V2 on SQLite: upgrade from prior schema, inspect columns/nullability and unchanged data; downgrade succeeds only on empty new columns; populated downgrade leaves schema/data intact. | Backend Developer | 1 day |
| P03 Verify MySQL and interrupted migration behavior | Same migration suite, `tests/conftest.py` isolated-engine fixtures, `docs/DEVELOPMENT.md`: disposable MySQL and SQLite fixtures; record current revision/both columns after simulated partial DDL, safe retry/adoption procedure for create_all databases. | P02 -> P20, P23 | V2 with both engines executed, zero engine skips; snapshot users/members/records before and after. Offline procedure is reviewed, not run on production. | Backend Developer | 1 day |

### 3.3 Shared Domain Rules and Managers

| ID and objective | Files/modules and result | Prerequisites -> consumers | Validation / acceptance | Responsible role | Size |
|---|---|---|---|---|---|
| P04 Implement pure demographic rules | NEW `src/demographics.py`, existing `src/timeutil.py`, `tests/test_user.py`, `tests/test_members.py`: strict ASCII YYYY-MM, 1900-01/current UTC month inclusive, captured request clock, derived age, gender aliases and missing/null sentinel. No DB/HTTP dependency. | G1 -> P05, P06, P08 | V1: frozen UTC month boundaries, age 0/over 120, malformed values including newline and non-strings, invalid stored month -> null age; gender alias and unknown-value tests. | Backend Developer | 0.75 day |
| P05 Implement account creation and atomic profile mutation | `src/manager/user_manager.py`, `src/manager/member_manager.py`, `tests/test_user.py`: explicit allowlist, validate before writes, null clears, omitted fields unchanged; ignore age inputs and leave stored legacy age untouched. Add transaction-participating helpers only for this flow. | P01, P04 -> P07, P08, P09 | V1 direct Manager tests: no partial commit on mixed invalid/clear, registration blank demographics, no mass assignment; account changes do not alter unrelated fields. | Backend Developer | 1 day |
| P06 Implement ordinary member mutation and scoped lookup | `src/manager/member_manager.py`, `tests/test_members.py`: resolve ownership without implicitly creating a household on invalid/unowned targets; create/update optional demographics, ignore age; preserve reserved-Self creation behavior without account overwrite. | P01, P04 -> P07, P08, P10 | V1 direct tests with two owners and absent household; ordinary members stay independent, existing soft deletion and related record IDs unchanged. | Backend Developer | 0.75 day |
| P07 Implement authoritative Self projection and atomic duplicate clearing | User/Member Managers, `tests/test_user.py`, `tests/test_members.py`: read User demographics only; no Member/legacy-age fallback. Clear targeted field in User and all owned recognized Self duplicates in one transaction; enforce Self name/status/delete protections in Manager. Lock User before Self rows. | P05, P06 -> P09, P10, P11 | V1: both Self aliases and legacy duplicates, clear each field independently, preserve all identities and unrelated fields, injected failure rolls back every targeted row; no new Self record on invalid request. | Backend Developer | 1 day |
| P08 Preserve non-HTTP creation compatibility | `src/manager/health_import_manager.py`, existing seed/guest member-creation callers, `tests/test_health_import.py` and existing guest tests: adapt only changed signatures, leave birth_month null, remove manual-age processing, preserve scope/isolation and health-import schema. | P04, P05, P06 -> P19 | V5 and targeted existing caller tests; imported/seeded members need no demographics, import reports/records and guest ownership remain unchanged. No changes to Issue #11 scope. | Backend Developer | 0.5 day |

### 3.4 Service API

| ID and objective | Files/modules and result | Prerequisites -> consumers | Validation / acceptance | Responsible role | Size |
|---|---|---|---|---|---|
| P09 Update registration and account routes | `src/service/auth_service.py`, `src/service/user_service.py`, `src/utils.py` only if needed, `tests/test_auth.py`, `tests/test_user.py`: both registration aliases, GET/PUT projections, full object/type validation before writes, field codes, no-store header. Preserve JWT/password/rate limits and response envelopes. | P05, P07 -> P12, P18, P21, P27 | V1: 201/200, email conflict 409, invalid input 400, anonymous 401/other-user 403; null omission distinction and Self/profile read agreement. No Service DB queries. | Backend Developer | 1 day |
| P10 Update member routes | `src/service/member_service.py`, `tests/test_members.py`: GET/POST/PUT use Manager projections; Self PUT demographic-only (age ignored), reject identity/status/height/weight payload keys; DELETE protection retained; unowned 404, field errors and no-store. | P06, P07 -> P11, P12, P18, P21, P27 | V1: full route matrix including malicious mixed payload, duplicate-Self create and no fallback; list loads User once, not per member. | Backend Developer | 0.75 day |
| P11 Prove atomicity and concurrent update behavior | `tests/test_user.py`, `tests/test_members.py`, `tests/conftest.py`: isolated SQLite/MySQL sessions, injected commit/duplicate-cleanup failures, concurrent disjoint writes, idempotent clear, explicit same-field last-commit-wins and transient retry after rollback. Repair only related Manager defects. | P07, P10 -> P19, P22, P24 | V1 on both supported engines; compare before/after active values and untouched fields; never retry non-idempotent creation automatically. | Backend Developer | 1 day |

### 3.5 Frontend Integration and Developer-owned Component E2E

| ID and objective | Files/modules and result | Prerequisites -> consumers | Validation / acceptance | Responsible role | Size |
|---|---|---|---|---|---|
| P12 Implement transport and locale contracts | `frontend/src/services/api.js`, both existing en/zh `translation.json` locale files: existing routes retained; explicit null for clears, dirty-field payloads for updates, month/error translations and compatibility mapping. No persistent demographics or JWT changes. | P09, P10 -> P13, P14, P15 | V3 plus review request payload assertions in component specs; untouched fields absent, clear is null, no raw demographic logging. | Frontend Developer | 0.5 day |
| P13 Update registration and its focused tests | `frontend/src/pages/Register.js`, existing `tests/e2e/tests/auth/` and `user-registration.spec.js`: optional month picker and clearable gender, no age input, no defaults, UTC max/min, API field errors; unrelated registration behavior retained. | P12 -> P16, P17 | V4 registration selectors: omit both or one field, valid month and malformed keyboard input; successful/failed submission on both locales. | Frontend Developer | 0.75 day |
| P14 Update profile and its focused tests | `frontend/src/pages/Profile.js`, existing `tests/e2e/tests/profile/`: optional edits/clears, only dirty fields sent, server-derived read-only age, null hidden and zero displayed, error preserves form values, pending Save disabled. | P12 -> P16, P17 | V4 profile selectors: independent clears, invalid mixed changes retain original persisted values, no optimistic success, profile/Self agreement. | Frontend Developer | 0.75 day |
| P15 Update members and its focused tests | `frontend/src/pages/Members.js`, existing `tests/e2e/tests/members/`, `members-self-protection.spec.js`: ordinary member fields optional; Self demographic-only editor; name/delete stay protected; null gender not Other; no age input. | P12 -> P16, P17 | V4 member selectors: create/edit ordinary member and Self, forbidden identity mutation, no disabled identity fields submitted, clear values persist on reload. | Frontend Developer | 1 day |
| P16 Synchronize views and verify accessibility/layout | Profile/Members, existing MemberContext/MemberSelector only where necessary, existing focused E2E/i18n specs: refresh affected data on save/route entry/window focus, no new demographic cache, preserve selection IDs; keyboard month entry and desktop/mobile layouts. | P13, P14, P15 -> P17, P18 | V4 plus V6 at desktop 1280x800/mobile 390x844 using test-scoped viewport overrides; empty controls, age zero, both languages, cross-tab refocus and overlapping/text-overflow checks. No new global browser project required. | Frontend Developer | 0.75 day |

### 3.6 QA Verification, Integrity and Observability

| ID and objective | Files/modules and result | Prerequisites -> consumers | Validation / acceptance | Responsible role | Size |
|---|---|---|---|---|---|
| P17 Implement independent QA user journey | `tests/e2e/tests/regression-user-journey-cn.spec.js` and existing session/auth/member helpers: blank registration -> profile edit/clear -> ordinary/Self edit/clear -> logout/login -> health-record management without birth month. Extend tests without replacing unrelated journey steps. | P13, P14, P15, P16 -> P19, P26 | V7; QA-owned trace/report shows all three subject types, independent field clearing, existing-user no-backfill and post-login non-resurrection. | QA Engineer | 1 day |
| P18 Verify authorization, privacy and failure paths | Existing auth/user/member Pytest plus profile/member Playwright: second-user and expired JWT, mass assignment, mixed invalid clear, no-store, alias compatibility and no sensitive telemetry/browser persistence. | P09, P10, P16 -> P19, P22 | V1, V4; inspect test responses/storage/log capture for synthetic values, secrets and IDs; 401/403/404 behavior and protected Self identity remain correct. | QA Engineer | 0.75 day |
| P19 Verify unrelated data and legacy regressions | `tests/test_user.py`, `tests/test_members.py`, health/import/medical-history/guest suites; use existing fixtures: snapshot unrelated profile fields, identity/status, records, subjects and medical histories across create/edit/clear. | P08, P11, P17, P18 -> P25, P26 | V5 and V8; legacy ages retained in DB but never returned/processed; no record deletion/migration or CSV changes; no missing-demographic restriction. | QA Engineer | 1 day |
| P20 Document schema baseline and environment adoption | `docs/DEVELOPMENT.md`, `deploy/README.md`, existing deployment configuration: inventory SQLite/MySQL revision, key tables and both columns; document supported baseline adoption without blind stamping and interrupted-DDL recovery. Use synthetic copies only. | P03 -> P23 | V2 evidence plus operator walkthrough: create_all-only and Alembic-managed fixtures follow distinct reviewed procedures; no real credentials in commands/docs. | DevOps Engineer | 0.5 day |
| P21 Add privacy-safe observability | Existing auth/user/member logging and error handling, `docs/ops/` existing suitable runbook, existing Pytest suites: aggregate request errors, field reason codes, latency/query evidence and request correlation; no field values, IDs in labels, bodies, tokens or SQL binds. No new access-audit store. | P09, P10 -> P22, P23 | V1 log-capture assertions and synthetic failure drill; existing audit conventions maintained, invalid stored month yields value-free diagnostic. | Backend Developer | 0.5 day |
| P22 Measure query/latency regression | Existing user/member tests and existing reports home: run approved P00 scenarios against pinned baseline/new builds at fixed data sizes and concurrency; User loaded at most once per member-list projection. | P00, P11, P18, P21 -> P25, P26 | V9; report build SHAs, dataset/clock/concurrency, query counts and distributions against the human-approved criterion. Fail if missing criterion or N+1; no fabricated benchmark result. | QA Engineer | 0.75 day |

### 3.7 Configuration, Release Safety and Documentation

| ID and objective | Files/modules and result | Prerequisites -> consumers | Validation / acceptance | Responsible role | Size |
|---|---|---|---|---|---|
| P23 Implement migration/readiness ordering | `.github/workflows/deploy-staging.yml`, equivalent actual-target pipeline, existing deploy scripts/config and schema readiness surface: run approved migration once, verify revision/nullability, block new replicas on missing schema; set DB_AUTO_CREATE=0 and DB_CREATE_ON_MISSING=0 where applicable. Not an nginx entrypoint migration. | P02, P03, P20, P21 -> P24, P26 | V10: staging/sandbox failed-migration/missing-column case prevents new traffic; success migrates before backend rollout. Review rendered configuration without printing secrets. | DevOps Engineer | 1 day |
| P24 Build and drill privacy-compatible rollback | Existing deploy/runbook files, existing integration tests: pin compatible backend/frontend fallback artifacts; pre-activation downgrade only when new columns empty, post-activation retain expanded schema. Drain incompatible writers; no old image or backup restore as app rollback. | P11, P23 -> P25, P26 | V11: set/clear all subject fields, switch to compatible fallback, GET/relogin remains cleared, no mandatory age or unrelated data changes. Failed compatibility check blocks rollback/activation. | DevOps Engineer | 0.75 day |
| P25 Rehearse backup recovery without resurrection | Existing recovery runbook and QA report home: offline synthetic old backup plus documented existing recovery mechanism for subsequent clear operations; compare clear-state and unrelated records before opening access. Do not invent an audit system or new retention policy. | P19, P22, P24 -> P26 | V12: either prove cleared data stays absent after reconciliation or keep demographic access closed and report release blocker; never mark the drill passed without evidence. | DevOps Engineer with QA witness | 0.75 day |
| P26 Complete staging technical readiness and release checklist | Existing deployment/runbook, release evidence and QA reports: schema first -> all compatible backend replicas -> frontend/cache refresh -> scoped QA checks -> normal traffic. Baseline/fallback artifacts and P00 threshold must be recorded. No mixed incompatible writers after clears enabled. | P17, P19, P22, P23, P24, P25 -> P27 | V7-V12 and required CI; record image/revision IDs, traffic-switch outcome, failure/rollback triggers and sanitized evidence. This is QA technical readiness, not Issue Owner's business acceptance. | QA Engineer with DevOps execution | 0.75 day |
| P27 Update public contracts and hand over implementation evidence | `docs/API_Design.md`, `docs/DEVELOPMENT.md`, `deploy/README.md`, existing release documentation: optional fields, aliases, UTC age semantics, null/omission, ignored age, Self limits, staged compatibility, migration/rollback/recovery and test instructions. Link evidence without raw health data. | P09, P10, P26 -> Issue Owner business acceptance and normal release process | V13: reviewer follows both registration aliases, three subject edit/clear examples and documented rollback; links/commands match actual merged implementation. Owner signs AC acceptance separately. | Developer documentation owner | 0.5 day |

## 4. Executable Validation Catalog

These are future implementation checks, not results claimed by the planner. Unless specified otherwise run from repository root in the selected project environment. Reuse existing installed tools; prerequisites are backend dependencies, frontend dependencies and Playwright Chromium. Never point tests/migrations at production or a shared developer database. Use synthetic accounts and protected environment configuration for disposable MySQL; do not print connection secrets. SQLite and MySQL migration/concurrency cases must both execute, not silently skip.

New demographic cases in reused Pytest suites should include `demographics` in their test name so V1 is selective. Each command must collect and run the expected new cases; a no-tests-collected result or engine skip is not evidence. Use V8 for full regression coverage after the selected cases pass.

| ID | Command or reproducible acceptance procedure | Evidence |
|---|---|---|
| V1 | `python -m pytest tests/test_auth.py tests/test_user.py tests/test_members.py -k demographics -q` | Developer/QA report lists boundary, CRUD, projection, ownership, transaction and null cases; P11 includes isolated MySQL runs, not only SQLite. |
| V2 | `python -m pytest tests/test_demographics_migration.py -q`; use `python -m flask --app src.app db heads` / `db current` for inspection in the disposable environment. | NEW suite from P02/P03 exercises both engines, prior revision, partial-DDL state, preserved checksums and downgrade refusal. No migration command run here targets real data. |
| V3 | `npm --prefix frontend run build` | Production bundle succeeds with existing React/Ant Design/i18next; code review confirms payload/null and no-storage contracts. |
| V4 | From `tests/e2e`: `npx playwright test tests/auth tests/profile tests/members tests/user-registration.spec.js tests/members-self-protection.spec.js --project=chromium --workers=1` | Developer-owned focused UI tests. Backend is started via existing `scripts/dev_start_backend.cmd`; default Playwright config can start/reuse frontend. Use fresh synthetic data; existing global setup/session helpers remain intact. |
| V5 | `python -m pytest tests/test_health.py tests/test_health_import.py tests/test_members.py -q` plus the existing medical-history/guest suites selected by V8. | Unrelated health values, foreign keys, imports and filtering unchanged. |
| V6 | From `tests/e2e`: `npx playwright test tests/i18n tests/profile tests/members --project=chromium --workers=1` | P16 adds parameterized locale/viewport cases to existing specs; report both languages and viewport sizes, no hidden skipped branch. |
| V7 | From `tests/e2e`: `npx playwright test tests/regression-user-journey-cn.spec.js --project=chromium --workers=1` | QA-owned journey report with refresh/logout/login and cross-module evidence. |
| V8 | `python -m pytest tests/ -q`, V3, and required `.github/workflows/pr-validation.yml` checks including its release-PR guard. | Full regression/CI results; keep existing failures visible and triaged, do not disable gates. |
| V9 | On the two pinned builds, execute P00's recorded GET/profile PUT/member list/member PUT scenarios with the same synthetic data, request counts and concurrency; capture latency distributions and query counts. | Side-by-side report with actual acceptance threshold, no personal labels. Exact workload must be supplied by P00 before G1. |
| V10 | In an isolated staging/sandbox deployment, inject missing-column/migration failure, verify new replicas remain outside traffic, then perform schema-success/backend/frontend sequence and check readiness. | Ordered job/rollout logs with IDs and sanitized config. Never modify a production cluster as a test. |
| V11 | On isolated migrated data: populate then independently clear User/Self/ordinary-member fields; record checksums of untouched fields; switch to pinned compatible fallback; read each route and relogin. Attempt pre-activation downgrade on empty and populated fixtures. | No resurrection or manual-age display, no unrelated data mutation, populated downgrade refused and incompatible binary excluded. |
| V12 | Restore synthetic pre-clear backup offline, apply approved existing recovery/reconciliation mechanism, verify every later clear and unchanged unrelated record before access. If impossible, keep access closed and fail readiness. | QA-witnessed operator drill with artifact IDs and pass/fail, no invented restore capability. |
| V13 | Review actual API examples against implemented responses, both locales and runbooks; check every referenced script/path and complete new-user/existing-user rollback instructions. | Documentation review plus linked test/rollout evidence; no secrets or unredacted health data. |

For deployed E2E, use the existing `E2E_BASE_URL` and `E2E_DISABLE_WEBSERVER=1` in the test environment; preserve existing backend/auth fixture configuration. The Playwright configuration has one enabled `chromium` project and Asia/Shanghai timezone. Tests must distinguish that browser timezone from the approved server UTC month and cover a boundary where they differ. No dependency upgrade is required by the approved scope.

## 5. AC-to-task-and-test Matrix

| AC | Implementation tasks | Developer-owned Pytest / component E2E | QA-owned journey / integrity evidence |
|---|---|---|---|
| AC-01 Blank registration | P01, P04, P05, P09, P12, P13 | V1 registration + compatibility alias; V4 blank month/gender | P17 / V7 new account without demographics |
| AC-02 Optional member and Self | P01, P06, P07, P10, P15 | V1 ordinary/default/duplicate Self; V4 member create | P17 / V7 independent subjects |
| AC-03 No manual age entry/use | P04-P10, P13-P15 | V1 ignores age without rewriting legacy columns; V4 no editable age | P19 / V8 legacy record preservation and no effective age fallback |
| AC-04 Valid month and derived age | P01, P04, P07, P09, P10, P13-P16 | V1 1900/current month, age 0/over 120, UTC boundary; V4/V6 rendering | P17 / V7 month changes persist across views/login |
| AC-05 Edit User/member/Self | P05-P07, P09, P10, P14-P16 | V1 route projection parity; V4 demographics-only Self editor | P17 / V7 all three subjects, P18 access isolation |
| AC-06 Independent effective clear | P05, P07, P09-P16, P24, P25 | V1 SQL NULL in User/all Self copies/member, rollback/idempotency; V4 null payload and refresh | P17-P19 / V7-V8 persistence/integrity; P24-P25 / V11-V12 non-resurrection |
| AC-07 Existing users no backfill | P01-P03, P05-P10, P13-P16 | V1 existing-null profiles and ignored legacy ages; V2 no backfill | P17, P19 / V7-V8 continued health-record usage |
| AC-08 Preserve other data | P01-P03, P05-P11, P23-P25 | V1 unrelated field snapshots; V2 migration checksums; V5 imports/records | P19 / V8 health/medical-history/isolation; V11-V12 rollback/restore |
| AC-09 Reject invalid month atomically | P04-P07, P09, P10, P13-P15 | V1 malformed/equivalence/boundary/mixed clear; V4 field errors | P18 / V1,V4 rejected writes never overwrite valid data |

## 6. Design Obligation Coverage

| Approved design obligation | Tasks and verification |
|---|---|
| Sections 1-3: traceability, layering and ownership | P00, G1; P05-P10 enforce Manager-owned DB/transactions and projection, Services parse/serialize; plan publication records approval SHAs. |
| Section 4: nullable month, retained legacy age, authoritative Self, duplicate cleanup | P01-P03, P05-P07, P11, P19; V1,V2,V8 data/identity integrity. |
| Section 4: unchanged retention and offline restore | P21,P24,P25; V11,V12; no purge policy or new audit store. |
| Sections 5.1-5.2: month/gender aliases, UTC, null/omission, compatibility/status codes | P04,P09,P10,P12-P16; V1,V4,V6; endpoints/envelopes retained and age ignored. |
| Section 5.3: locks, retries, atomicity, dirty fields, ownership before mutation | P05-P07,P11,P12,P18; V1,V4 on supported engines. |
| Section 6: optional accessible controls, dual language, refresh, zero/null behavior | P12-P17; V3,V4,V6,V7; no persistent demographics. |
| Section 7: auth, mass assignment, Self boundary, import/guest isolation | P06-P10,P18,P19; V1,V5,V8. Issue #11 remains untouched. |
| Section 7: no-store, data minimization, safe logs/audit | P09,P10,P18,P21; response/storage/log assertions in V1,V4. |
| Section 8.1: expand-only schema and baseline adoption | P02,P03,P20,P23; V2,V10; never use create_all as upgrade. |
| Section 8.2: no incompatible mixed writers, backend before UI | P23,P24,P26; V10,V11, pinned artifacts and stale bundle invalidation. |
| Section 8.3: safe downgrade, compatible fallback and no resurrection | P02,P24,P25; V2,V11,V12; new data blocks destructive downgrade. |
| Section 9: fault matrix and no N+1/measured performance | P00,P11,P18,P21-P26; V1,V9-V12; threshold comes from approved P00. |
| Section 10: full AC and security/concurrency validation | P01-P19,P22,P26; matrices and V1-V12, Developer vs QA ownership explicit. |
| Sections 11-12: chosen alternatives and review boundaries | No new v2 API, new full birthday, stored derived age, historical-age deletion or scope changes; P27 docs; independent plan approval and merged-docs G1 handoff below. |

## 7. Category Applicability and Release Order

| Category | Applies? | Planned work |
|---|---|---|
| Database/models | Yes | P01-P03; nullable columns only; preserve existing rows/legacy age. |
| Manager/backend | Yes | P04-P11; authorize, derive, mutate/clear atomically and preserve callers. |
| Service API | Yes | P09-P10; same API version/routes, structured errors/null semantics. |
| Frontend | Yes | P12-P16; existing Ant Design controls and i18next, no redesign. |
| Tests | Yes | Developer unit/component tests and QA journeys/integrity P01-P19,P22,P26. |
| Configuration/deployment | Yes | P20,P23,P26; existing bootstrap switches, schema readiness and migration job; protected environment secrets. |
| Historical data backfill | Not applicable | Approved requirement forbids migration from manual age and unrelated historical changes. Schema expansion is separate and required. |
| New dependencies/infrastructure | Not applicable | Approved design reuses React/Flask/SQLAlchemy/Alembic/Playwright and current environments; no cloud resource creation or framework upgrade. |
| Retention-policy change/access-audit store | Not applicable | Existing retention and audit rules remain; P21/P25 verify data-minimizing observability/recovery. |
| Operations/rollback | Yes | P23-P26; pinned compatible fallback, no mixed old writers, backup recovery verification. |
| Documentation | Yes | P20,P27; public contracts, environment baseline and rollout/recovery instructions. |

Migration/release sequence is not task parallelism: rehearse isolated migration/restore -> schema expansion -> verify revision/columns -> replace/drain all incompatible backend writers -> compatible backend readiness -> new frontend and stale-bundle refresh -> QA acceptance checks -> normal traffic. Do not expose clearing on a mixed backend fleet. Preserve existing unrelated route availability when safe during a rollback/write suspension.

Backward compatibility is limited deliberately: old clients keep routes/envelopes and age input is ignored; old clients cannot exercise null clears until upgraded. Old code can temporarily coexist with the expanded schema before activation, but old demographic writer semantics cannot coexist after activation. Never present this as unrestricted backward compatibility.

Rollback before writes requires stopped new readers/writers and entirely null new columns. After activation retain the schema/data and use a pinned privacy-compatible fallback or forward fix; do not restore a database backup as app rollback. Offline backup recovery must demonstrate no resurrection before access reopens. If reconciliation support does not exist, report a release blocker and return to the design owner rather than inventing a new data collection system.

## 8. Risks, Owners and Review Conditions

| Risk / dependency | Owner | Closure point |
|---|---|---|
| Performance threshold still conditional | Requirement owner and independent requirement reviewer | P00 before G1; plan review is not a waiver. |
| Human plan approver/alternate not yet explicitly designated | Project owner; request Admin as independent reviewer only after confirmation of no plan-author involvement | Before PLAN-APPROVED; keep PR Draft meanwhile. Existing design approval cannot approve this new plan. |
| Existing design approval snapshot includes historical pending-review wording | Planner | Use linked signed approval as evidence, preserve artifact unchanged; do not infer missing plan approval. |
| MySQL credentials/environment unavailable for migration/concurrency rehearsal | DevOps owner | Provision disposable test access through existing secret handling before P03/P11; no skipped-engine pass. |
| Existing create_all databases lack Alembic baseline | DevOps owner | P20 before target deployment; never blind-stamp or apply table-creation migrations to unknown schemas. |
| Unsafe old fallback or recovery procedure | DevOps + QA | P24/P25 before activation; missing compatible artifact/reconciliation is blocking. |
| Fixture/session contamination across users/E2E | Developer + QA | Isolated identities and fixtures, existing serial Playwright workers, scoped cleanup of synthetic data only. |
| Plan tasks exceed one person-day or reveal scope ambiguity | Task owner + planner/design owner | Split/review the affected task or return the design conflict; no silent scope expansion. |

## 9. Plan Review and Gate 1 Handoff

The planner publishes only this plan change locally, verifies/stages it, commits with `Generated by Copilot` and `Refs #12`, pushes the existing docs branch, verifies local HEAD/upstream/remote equality and reports any intentionally retained user changes. Record the actual full remote plan commit SHA in the PR review-submission comment rather than embedding a self-referential SHA here.

Request the designated independent natural-person plan reviewer to review that exact commit. Required evidence begins with `PLAN-APPROVED: Document=docs/plan/plan-optional-user-demographics.md Commit=<full-remote-sha>`, includes the human decision/signature, and is not an Agent-produced approval. A subsequent plan change needs renewed SHA-bound approval. On submission, retain every Issue label except replace stage:drafted with stage:analyzed. Do not set stage:reviewed/stage:developed, and do not mark tasks complete merely because this document exists.

Only after current REQ-APPROVED, DESIGN-APPROVED and PLAN-APPROVED exist and blocking findings are closed may the docs PR become Ready. Required checks must pass and conversations resolve; the non-author human approver performs the squash merge under repository rules. The planner neither self-approves nor bypasses required review.

After merge, send `pilotRole_Development_Readiness_Reviewer` this evidence package: Issue #12 URL; merged PR #13 URL and actual squash merge SHA; approved requirement/design/plan paths and their approval SHAs; approval-comment URLs; this plan's AC/design matrices and task dependencies; V1-V13 and environment prerequisites; performance-condition closure; unresolved risks (if any); verification that Issue remains stage:analyzed. The merge SHA is unavailable until merge and must not be guessed. This handoff is evidence for Gate 1, not a readiness decision.

---

Generated by Copilot