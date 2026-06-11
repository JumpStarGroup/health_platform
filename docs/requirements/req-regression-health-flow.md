# Requirement: Automated Regression Flow for Health Records

## 1. Background & Value
- **User Story**: As a QA/Release owner, I want an automated regression flow that covers the core user journey (register → login → create member → create/update Self health record), so that we can detect functional regressions quickly and repeatedly.
- **Business Value**:
  - Protect the most important user journey from breaking changes.
  - Provide a repeatable, end-to-end regression signal for every change and before releases.
  - Enable multiple runs per day via unique test identities.

## 2. Scope & Boundaries
- **In-Scope**:
  - One complete automated regression run that simulates:
    - English registration
    - Login
    - Create one family member
    - Create one health record for **Self** (must include blood pressure + heart rate)
    - Update that **Self** health record
  - Coverage includes **both**:
    - Valid inputs (expected success)
    - Invalid inputs (expected failure)
  - Test identity strategy: username must embed timestamp to **minute-level** (e.g., `YYYYMMDDHHmm`) so the suite can run multiple times per day without collisions.
  - i18n-ready structure: keep the suite easy to extend with a Chinese-language variant later.

- **Out-of-Scope (for v1)**:
  - Creating or updating health records for the family member (member creation only).
  - Testing member protection behaviors (e.g., Self/自己 non-editable/deletable).
  - Visual/UI layout validation.
  - Performance/load testing.

## 3. Acceptance Criteria (AC)
- [ ] **AC1: English Registration + Login**
  - The regression run registers a new user using **English** input fields/values and then logs in successfully.

- [ ] **AC2: Unique Test Identity**
  - Each run generates a unique username containing `YYYYMMDDHHmm`.
  - Running the suite multiple times per day does not fail due to username collisions.

- [ ] **AC3: Family Member Creation**
  - After login, the user can create one family member successfully.

- [ ] **AC4: Self Health Record (Valid Create)**
  - The user can create a Self health record successfully with:
    - Blood pressure (systolic + diastolic)
    - Heart rate
    - A valid timestamp

- [ ] **AC5: Self Health Record (Update)**
  - The user can update the previously created Self health record successfully (e.g., adjust one numeric field or note).

- [ ] **AC6: Invalid Input Coverage (Expected Failures)**
  - The suite includes negative cases that must fail and be asserted as failures:
    - Blood pressure: systolic **≤** diastolic
    - Blood pressure: out-of-range values (boundary/overflow cases)
    - Heart rate: out-of-range values (boundary/overflow cases)
    - Timestamp: invalid time format

- [ ] **AC7: Assertion Granularity (Language-Safe)**
  - For negative cases, the suite asserts failure outcomes in a way that remains stable across languages (e.g., validates “failure + field-level reason/category” rather than exact translated sentence).

## 4. Non-Functional Requirements
- **Reliability**: Regression run should be deterministic and repeatable; failures should be actionable.
- **Maintainability**: Steps should be reusable so new cases (including Chinese i18n scenarios) can be added with minimal duplication.
- **i18n**: v1 uses English registration; architecture should allow adding Chinese-language scenarios later.
- **CI Fit**: Must be runnable as part of an automated pipeline trigger (e.g., PR/merge/nightly).
