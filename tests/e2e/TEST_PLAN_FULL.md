# Health Platform Complete E2E Test Plan

## Application Overview

健康记录平台（Health Platform）是为家庭成员追踪血压、心率等健康指标的综合系统。支持用户注册登录、家庭成员管理、健康记录增删改查、中英文双语切换、CSV 导入导出等功能。基于 React 18 + Ant Design 5 前端，Flask 3.0 后端。测试 URL: http://localhost:3000

## Test Scenarios

### 1. Authentication - 用户认证

**Seed:** `tests/e2e/tests/test-2.spec.ts`

#### 1.1. TC-1.1: Register new user - Happy Path

**File:** `tests/e2e/tests/auth/register-happy-path.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/login
  2. Click 'Register now' link, verify redirect to /register
  3. Verify registration form shows fields: Username, Email, Password, Confirm Password, Age, Gender, Height, Weight
  4. Fill Username with unique timestamp-based username (e.g. testuser_20260331-2049-demo-1234)
  5. Fill Email with matching unique email
  6. Fill Password with 'Copilot2026!'
  7. Fill Confirm Password with 'Copilot2026!'
  8. Fill Age with '30'
  9. Select Gender as 'Male'
  10. Fill Height with '175'
  11. Fill Weight with '70'
  12. Click 'Register' button

**Expected Results:**
  - Success message 'Registered successfully! Please sign in' appears
  - Page redirects to /login

#### 1.2. TC-1.2: Register - Missing required fields

**File:** `tests/e2e/tests/auth/register-missing-fields.spec.ts`

**Steps:**
  1. Navigate to /register page
  2. Do not fill in any fields
  3. Click 'Register' button

**Expected Results:**
  - Red error messages appear for Username, Email, Password, Confirm Password fields
  - Form submission is blocked, page stays on /register

#### 1.3. TC-1.3: Register - Password mismatch

**File:** `tests/e2e/tests/auth/register-password-mismatch.spec.ts`

**Steps:**
  1. Navigate to /register page
  2. Fill Username, Email, and all required fields
  3. Fill Password with 'Copilot2026!'
  4. Fill Confirm Password with 'Different123!'
  5. Click 'Register' button

**Expected Results:**
  - Error message about password mismatch appears
  - Form submission is blocked

#### 1.4. TC-1.4: Register - Duplicate email

**File:** `tests/e2e/tests/auth/register-duplicate-email.spec.ts`

**Steps:**
  1. Register a new user with a unique email (first registration)
  2. Navigate to /register again
  3. Fill all required fields using the SAME email as the first registration
  4. Click 'Register' button

**Expected Results:**
  - Error message about email already being used appears
  - Form submission fails, page stays on /register

#### 1.5. TC-1.5: Login - Happy Path

**File:** `tests/e2e/tests/auth/login-happy-path.spec.ts`

**Steps:**
  1. Navigate to /login page
  2. Verify page title shows 'Health Records Platform'
  3. Fill Email with a registered user's email
  4. Fill Password with correct password
  5. Click 'Sign In' button

**Expected Results:**
  - Success message 'Signed in successfully!' appears
  - Page redirects to /dashboard
  - Header shows username and email
  - Left navigation menu shows: Dashboard, Health Records, Members, Profile, Settings
  - Default member selector shows 'Self'
  - Version number is visible on login page before signing in

#### 1.6. TC-1.6: Login - Wrong credentials

**File:** `tests/e2e/tests/auth/login-wrong-credentials.spec.ts`

**Steps:**
  1. Navigate to /login page
  2. Fill Email with a registered user's email
  3. Fill Password with an incorrect password
  4. Click 'Sign In' button

**Expected Results:**
  - Error message about login failure appears
  - Page stays on /login, no redirect

#### 1.7. TC-1.7: Logout

**File:** `tests/e2e/tests/auth/logout.spec.ts`

**Steps:**
  1. Login with valid credentials
  2. Verify we are on /dashboard
  3. Click 'Logout' button in the top-right corner

**Expected Results:**
  - Page redirects to /login
  - Navigating to /dashboard or any protected page should redirect back to /login

### 2. Members Management - 家庭成员管理

**Seed:** `tests/e2e/tests/test-2.spec.ts`

#### 2.1. TC-2.1: View members list with Self member

**File:** `tests/e2e/tests/members/view-members-list.spec.ts`

**Steps:**
  1. Login and navigate to /members page
  2. Verify table headers: Name, Gender, Age, Height(cm), Weight(kg), Status, Actions
  3. Check that 'Self' member exists in the table

**Expected Results:**
  - Table shows Self member with correct registration data (Age, Gender, Height, Weight)
  - Self member status is 'Active'
  - Self member Edit button is disabled
  - Self member Delete button is disabled
  - Self member row shows hint text '(Default/undeletable; edit in Profile)'

#### 2.2. TC-2.2: Create new family member

**File:** `tests/e2e/tests/members/create-member.spec.ts`

**Steps:**
  1. Login and navigate to /members page
  2. Click 'New Member' button
  3. Verify modal opens with title and fields: Name (required), Gender, Age, Height, Weight
  4. Fill Name with 'FamilyMember_<timestamp>'
  5. Select Gender 'Male'
  6. Fill Age with '35'
  7. Fill Height with '170'
  8. Fill Weight with '75'
  9. Click 'Save' button

**Expected Results:**
  - Success message appears
  - Modal closes
  - New member appears in the table with correct data
  - New member's Edit and Delete buttons are enabled (not disabled)

#### 2.3. TC-2.3: Edit non-Self member

**File:** `tests/e2e/tests/members/edit-member.spec.ts`

**Steps:**
  1. Login, create a new member (if not exists), navigate to /members
  2. Click 'Edit' button on the non-Self member row
  3. Verify edit modal opens with pre-filled values
  4. Change Age to '40' and Weight to '80'
  5. Click 'Save' button

**Expected Results:**
  - Success message appears
  - Modal closes
  - Table shows updated Age (40) and Weight (80) for that member

#### 2.4. TC-2.4: Delete non-Self member

**File:** `tests/e2e/tests/members/delete-member.spec.ts`

**Steps:**
  1. Login, create a new member, navigate to /members
  2. Click 'Delete' button on the non-Self member row
  3. If confirmation dialog appears, confirm the deletion

**Expected Results:**
  - Success message appears
  - The member disappears from the table
  - Self member is still present

#### 2.5. TC-2.5: Switch current member via header selector

**File:** `tests/e2e/tests/members/switch-member.spec.ts`

**Steps:**
  1. Login, create a new family member named 'TestMember_<timestamp>'
  2. Click the member selector in the page header (initially shows 'Self')
  3. Select the newly created member from the dropdown

**Expected Results:**
  - Member selector updates to show the selected member name
  - Navigating to Health Records shows records for the selected member (initially empty)

#### 2.6. TC-2.6: Self member protection - cannot edit or delete

**File:** `tests/e2e/tests/members/self-protection.spec.ts`

**Steps:**
  1. Login and navigate to /members page
  2. Inspect the Self member row's action buttons

**Expected Results:**
  - Self member Edit button has 'disabled' attribute
  - Self member Delete button has 'disabled' attribute
  - Clicking disabled buttons does not open any dialog

### 3. Health Records CRUD - 健康记录增删改查

**Seed:** `tests/e2e/tests/test-2.spec.ts`

#### 3.1. TC-3.1: View health records page (empty state)

**File:** `tests/e2e/tests/health-records/view-empty-records.spec.ts`

**Steps:**
  1. Login and navigate to /health-records page
  2. Verify page title 'Health Records'
  3. Verify action buttons: Export CSV, Import, Add Record
  4. Verify filter controls: Date range picker, Tags dropdown, Clear Filters button
  5. Verify table columns: Time, Blood Pressure, Heart Rate, Tags, Notes, Actions

**Expected Results:**
  - Page displays correctly at /health-records
  - Empty state message 'No data' is shown in the table
  - All UI elements (buttons, filters, table headers) are visible

#### 3.2. TC-3.2: Add health record - Happy path

**File:** `tests/e2e/tests/health-records/add-record-happy.spec.ts`

**Steps:**
  1. Login and navigate to /health-records
  2. Click 'Add Record' button
  3. Verify modal opens with title containing 'Add Health Record'
  4. Verify 'Record Time' field is pre-filled with current datetime
  5. Fill Systolic (mmHg) with '120'
  6. Fill Diastolic (mmHg) with '80'
  7. Fill Heart Rate (bpm) with '72'
  8. Optionally select a Tag from dropdown
  9. Optionally fill Notes field
  10. Click 'Save' button

**Expected Results:**
  - Success message appears
  - Modal closes
  - New record shows in table with blood pressure '120/80' and heart rate '72'
  - Tags and notes display correctly if provided

#### 3.3. TC-3.3: Add record - Blood pressure out of range validation

**File:** `tests/e2e/tests/health-records/add-record-bp-out-of-range.spec.ts`

**Steps:**
  1. Login and navigate to /health-records
  2. Click 'Add Record' button
  3. Fill Systolic with '300' (exceeds max 250)
  4. Fill Diastolic with '30'
  5. Observe form validation state

**Expected Results:**
  - Red error message appears on the systolic pressure field
  - Save button remains disabled
  - Modal stays open, no record is created

#### 3.4. TC-3.4: Add record - Systolic must be greater than Diastolic

**File:** `tests/e2e/tests/health-records/add-record-systolic-less-than-diastolic.spec.ts`

**Steps:**
  1. Click 'Add Record' button
  2. Fill Systolic with '80'
  3. Fill Diastolic with '120' (diastolic > systolic)
  4. Attempt to save the record

**Expected Results:**
  - Error message about systolic pressure needing to be greater than diastolic appears
  - Save button is disabled or submission is blocked

#### 3.5. TC-3.5: Edit health record

**File:** `tests/e2e/tests/health-records/edit-record.spec.ts`

**Steps:**
  1. Login, create a health record (120/80), navigate to /health-records
  2. Click 'Edit' button on the record row
  3. Verify edit modal opens with pre-filled values (120, 80)
  4. Clear and change Systolic to '125'
  5. Clear and change Diastolic to '85'
  6. Click 'Update' button

**Expected Results:**
  - Success message appears
  - Modal closes
  - Table shows updated blood pressure '125/85'

#### 3.6. TC-3.6: Delete health record

**File:** `tests/e2e/tests/health-records/delete-record.spec.ts`

**Steps:**
  1. Login, create a health record, navigate to /health-records
  2. Click 'Delete' button on the record row
  3. If confirmation dialog appears, confirm the deletion

**Expected Results:**
  - Success message appears
  - The record disappears from the table

#### 3.7. TC-3.7: Filter records by date range

**File:** `tests/e2e/tests/health-records/filter-by-date.spec.ts`

**Steps:**
  1. Login, create multiple records with different timestamps
  2. In the filter bar, click the date range picker
  3. Select a start date and end date covering only some records
  4. Observe the table content

**Expected Results:**
  - Only records within the selected date range are shown
  - Records outside the date range are hidden

#### 3.8. TC-3.8: Filter records by tags (OR semantics)

**File:** `tests/e2e/tests/health-records/filter-by-tags.spec.ts`

**Steps:**
  1. Login, create records with different tags (e.g. 'After Meal' and 'After Exercise')
  2. In the Tags filter dropdown, select one or multiple tags
  3. Observe the table content

**Expected Results:**
  - Table shows records matching ANY of the selected tags (OR logic)
  - Records with none of the selected tags are hidden

#### 3.9. TC-3.9: Clear filters

**File:** `tests/e2e/tests/health-records/clear-filters.spec.ts`

**Steps:**
  1. Apply date range and/or tag filters
  2. Click 'Clear Filters' button

**Expected Results:**
  - Date range and tag selections are cleared
  - Table shows all records again

#### 3.10. TC-3.10: Export CSV

**File:** `tests/e2e/tests/health-records/export-csv.spec.ts`

**Steps:**
  1. Login, create at least one health record
  2. Click 'Export CSV' button
  3. Wait for file download

**Expected Results:**
  - Browser triggers a file download
  - Downloaded file is in CSV format with UTF-8 BOM encoding
  - CSV content includes headers and all visible records

#### 3.11. TC-3.11: Import modal - UI verification

**File:** `tests/e2e/tests/health-records/import-modal-ui.spec.ts`

**Steps:**
  1. Login and navigate to /health-records
  2. Click 'Import' button
  3. Verify the import dialog opens

**Expected Results:**
  - Dialog title shows 'Batch Import Health Records' or Chinese equivalent
  - File upload area shows 'Click or drag file here'
  - Excel template download button and CSV template download button are visible
  - 'Preview/Re-preview' button is visible
  - 'Confirm Import' button is initially disabled

#### 3.12. TC-3.12: Records are isolated by member

**File:** `tests/e2e/tests/health-records/records-per-member.spec.ts`

**Steps:**
  1. Login, create a health record for Self (120/80)
  2. Create a family member named 'TestMember'
  3. Switch to 'TestMember' via header selector
  4. Navigate to health records page
  5. Verify the table is empty (no records for TestMember yet)
  6. Create a record for TestMember (130/85)
  7. Switch back to Self via header selector

**Expected Results:**
  - After switching to TestMember, Self's record (120/80) is NOT shown
  - TestMember's record (130/85) IS shown while TestMember is selected
  - After switching back to Self, only Self's record (120/80) is shown
  - TestMember's record (130/85) is NOT shown for Self

### 4. Profile - 个人信息

**Seed:** `tests/e2e/tests/test-2.spec.ts`

#### 4.1. TC-4.1: View profile page

**File:** `tests/e2e/tests/profile/view-profile.spec.ts`

**Steps:**
  1. Login and navigate to /profile
  2. Verify the 'Basic Info' card shows: Username, Email, Age, Gender, Height, Weight, Registered
  3. Verify the 'Edit Info' card shows an editable form

**Expected Results:**
  - Profile data matches registration data (username, email, age, gender, height, weight)
  - Email field in the edit form is disabled (not editable)

#### 4.2. TC-4.2: Edit profile information

**File:** `tests/e2e/tests/profile/edit-profile.spec.ts`

**Steps:**
  1. Login and navigate to /profile
  2. In the 'Edit Info' section, change Username to a new value
  3. Change Age to '35'
  4. Change Weight to '75'
  5. Click 'Save changes' button

**Expected Results:**
  - Success message appears
  - Basic Info card updates to show the new values
  - Header displays updated username

### 5. Settings - 系统设置

**Seed:** `tests/e2e/tests/test-2.spec.ts`

#### 5.1. TC-5.1: View settings page

**File:** `tests/e2e/tests/settings/view-settings.spec.ts`

**Steps:**
  1. Login and navigate to /settings
  2. Verify Language selector with current value
  3. Verify Change Password section shows: Current Password, New Password, Confirm New Password fields
  4. Verify password strength indicator and rules list

**Expected Results:**
  - Language dropdown shows 'English' or '中文（简体）'
  - Password rules list shows: at least 8 characters, include letters and numbers, security suggestion
  - Password strength progress bar is visible

#### 5.2. TC-5.2: Change password

**File:** `tests/e2e/tests/settings/change-password.spec.ts`

**Steps:**
  1. Login and navigate to /settings
  2. Fill Current Password with the correct current password
  3. Fill New Password with a strong new password (e.g. 'NewPass2026!')
  4. Fill Confirm New Password with the same new password
  5. Click 'Submit' button
  6. Logout and login again with the new password

**Expected Results:**
  - Success message appears after password change
  - Login with old password fails
  - Login with new password succeeds

### 6. i18n - Language Switching 中英文切换

**Seed:** `tests/e2e/tests/test-2.spec.ts`

#### 6.1. TC-6.1: Switch from English to Chinese

**File:** `tests/e2e/tests/i18n/switch-en-to-zh.spec.ts`

**Steps:**
  1. Login (default English UI), navigate to /settings
  2. Open Language dropdown, select '中文（简体）'
  3. Click 'Save' button

**Expected Results:**
  - Success message '设置已保存' appears
  - Navigation menu changes to: 仪表板, 健康记录, 成员管理, 个人信息, 系统设置
  - Member selector shows '自己' instead of 'Self'
  - Logout button shows '退出登录'
  - Page title changes to '系统设置'
  - Browser title changes to '健康平台'

#### 6.2. TC-6.2: Switch from Chinese to English

**File:** `tests/e2e/tests/i18n/switch-zh-to-en.spec.ts`

**Steps:**
  1. Login with Chinese UI, navigate to 系统设置
  2. Open 界面语言 dropdown, select 'English'
  3. Click '保存' button

**Expected Results:**
  - Success message appears
  - Navigation menu changes to: Dashboard, Health Records, Members, Profile, Settings
  - Member selector shows 'Self' instead of '自己'
  - Logout button shows 'Logout'
  - Browser title changes to 'Health Platform'

#### 6.3. TC-6.3: Chinese UI - Complete registration

**File:** `tests/e2e/tests/i18n/zh-registration.spec.ts`

**Steps:**
  1. Navigate to /register (with browser locale zh-CN or after switching to Chinese)
  2. Verify page shows: title '健康记录平台', subtitle '创建您的健康账户', button '注册'
  3. Fill all fields and complete registration
  4. Verify success message is in Chinese

**Expected Results:**
  - Registration page is fully in Chinese
  - Button text shows '注册' instead of 'Register'
  - Success message is in Chinese
  - Redirect to login page with Chinese text

#### 6.4. TC-6.4: Chinese UI - Login

**File:** `tests/e2e/tests/i18n/zh-login.spec.ts`

**Steps:**
  1. Navigate to /login (Chinese UI)
  2. Verify Chinese labels on the login page
  3. Fill credentials and click login button

**Expected Results:**
  - Success message is in Chinese
  - Dashboard heading shows '健康仪表板'

#### 6.5. TC-6.5: Chinese UI - Add health record

**File:** `tests/e2e/tests/i18n/zh-add-health-record.spec.ts`

**Steps:**
  1. Login with Chinese UI
  2. Navigate to 健康记录 page
  3. Click '添加记录' button
  4. Verify dialog title '添加健康记录'
  5. Verify field labels: 记录时间, 收缩压 (mmHg), 舒张压 (mmHg), 心率 (bpm), 标签, 备注
  6. Fill systolic '120', diastolic '80', heart rate '72'
  7. Click '保存' button

**Expected Results:**
  - Success message is in Chinese
  - Table columns show Chinese headers: 时间, 血压, 心率, 标签, 备注, 操作
  - Record displays correctly in the table

#### 6.6. TC-6.6: Chinese UI - Create member

**File:** `tests/e2e/tests/i18n/zh-create-member.spec.ts`

**Steps:**
  1. Login with Chinese UI
  2. Navigate to 成员管理
  3. Click '新增成员' button
  4. Verify dialog title '新增成员'
  5. Verify fields: 姓名, 性别, 年龄, 身高(cm), 体重(kg)
  6. Verify gender options: 男, 女, 其他
  7. Fill and submit the form

**Expected Results:**
  - Success message in Chinese
  - Table columns in Chinese: 姓名, 性别, 年龄, 身高(cm), 体重(kg), 状态, 操作
  - Self member shows '自己（默认/不可删除，信息请到"个人信息"修改）'
  - New member appears in the table

#### 6.7. TC-6.7: Chinese UI - Edit health record

**File:** `tests/e2e/tests/i18n/zh-edit-health-record.spec.ts`

**Steps:**
  1. Login with Chinese UI, create a health record
  2. Click '编辑' button on the record
  3. Verify dialog title '编辑健康记录'
  4. Modify values and click '更新'

**Expected Results:**
  - Success message in Chinese
  - Table shows updated values

#### 6.8. TC-6.8: Chinese UI - Delete health record

**File:** `tests/e2e/tests/i18n/zh-delete-health-record.spec.ts`

**Steps:**
  1. Login with Chinese UI, have at least one health record
  2. Click '删除' button on a record
  3. Confirm deletion if dialog appears

**Expected Results:**
  - Success message in Chinese
  - Record removed from table

#### 6.9. TC-6.9: English UI - Full CRUD health records

**File:** `tests/e2e/tests/i18n/en-crud-health-records.spec.ts`

**Steps:**
  1. Login with English UI
  2. Navigate to Health Records
  3. Add Record: fill systolic 120, diastolic 80, heart rate 72, save
  4. Verify '120/80' appears in table
  5. Edit Record: change to 125/85, update
  6. Verify '125/85' appears in table
  7. Delete Record: delete the record
  8. Verify table is empty or record disappears

**Expected Results:**
  - All CRUD operations succeed in English UI
  - All success/error messages are in English
  - Table headers and button labels are in English throughout

#### 6.10. TC-6.10: English UI - Full CRUD members

**File:** `tests/e2e/tests/i18n/en-crud-members.spec.ts`

**Steps:**
  1. Login with English UI
  2. Navigate to Members page
  3. Verify table headers: Name, Gender, Age, Height(cm), Weight(kg), Status, Actions
  4. Click 'New Member', create a new member, verify in table
  5. Edit the new member, verify updated
  6. Delete the new member, verify removed
  7. Verify Self member protection still works in English UI

**Expected Results:**
  - All CRUD operations succeed in English UI
  - Self member Edit/Delete buttons remain disabled
  - All messages are in English

#### 6.11. TC-6.11: Data persistence across language switch

**File:** `tests/e2e/tests/i18n/data-persistence-across-switch.spec.ts`

**Steps:**
  1. Login in English UI, create a health record and a family member
  2. Switch language to Chinese via Settings
  3. Navigate to 健康记录 page, verify previous records still exist
  4. Navigate to 成员管理 page, verify previous member still exists
  5. Switch back to English
  6. Verify records and members still present with correct data

**Expected Results:**
  - Health records persist through language switching (values unchanged)
  - Family members persist through language switching (info unchanged)
  - No data loss occurs when switching languages back and forth

### 7. Dashboard - 仪表板

**Seed:** `tests/e2e/tests/test-2.spec.ts`

#### 7.1. TC-7.1: Dashboard statistics cards

**File:** `tests/e2e/tests/dashboard/statistics-cards.spec.ts`

**Steps:**
  1. Login, create at least one health record (120/80, heart rate 72)
  2. Navigate to /dashboard
  3. Verify statistics cards are visible

**Expected Results:**
  - Total Records card shows non-zero count
  - This Week card shows count of records from current week
  - Avg Systolic card shows value with 'mmHg' unit
  - Avg Diastolic card shows value with 'mmHg' unit
  - Avg Heart Rate card shows value with 'bpm' unit

#### 7.2. TC-7.2: Dashboard health trends chart

**File:** `tests/e2e/tests/dashboard/health-trends.spec.ts`

**Steps:**
  1. Login and navigate to /dashboard
  2. Locate 'Health Trends' section
  3. Verify time range dropdown is available

**Expected Results:**
  - Health Trends section is visible
  - Time range selector works (dropdown opens and options are selectable)
  - With records: chart displays trends; Without records: 'No data' placeholder shown

### 8. Integration - 端到端综合场景

**Seed:** `tests/e2e/tests/test-2.spec.ts`

#### 8.1. TC-8.1: Complete user journey - English UI

**File:** `tests/e2e/tests/integration/full-journey-en.spec.ts`

**Steps:**
  1. Register a new user with unique timestamp-based credentials
  2. Login with the new user credentials
  3. Verify Dashboard shows with user info in header
  4. Navigate to Health Records, create a record for Self (120/80, HR 72)
  5. Edit the record to 125/85
  6. Navigate to Members, create a family member 'TestMember_<ts>'
  7. Switch to 'TestMember_<ts>' via header selector
  8. Navigate to Health Records, create a record for this member (130/85, HR 75)
  9. Switch back to Self
  10. Verify Self's record shows 125/85 (not 130/85)
  11. Logout

**Expected Results:**
  - Every step succeeds without errors
  - Records are correctly isolated between members
  - After logout, accessing /dashboard redirects to /login

#### 8.2. TC-8.2: Complete user journey - Chinese UI

**File:** `tests/e2e/tests/integration/full-journey-zh.spec.ts`

**Steps:**
  1. Register a new user
  2. Login
  3. Switch language to Chinese via Settings
  4. Verify all menus/titles/buttons display in Chinese
  5. Create health record for 自己 (120/80)
  6. Attempt invalid input (systolic 300) - verify blocked with Chinese error
  7. Edit record to 125/85 - verify Chinese success message
  8. Navigate to 成员管理, create family member
  9. Switch to new member via header selector
  10. Create health record for new member (130/85)

**Expected Results:**
  - All operations succeed in Chinese UI
  - All messages, labels, and hints are in Chinese
  - Chinese UI behavior is identical to English UI in functionality
  - Form validation works correctly in Chinese (error messages in Chinese)

#### 8.3. TC-8.3: Cross-language tag display consistency

**File:** `tests/e2e/tests/integration/cross-language-tags.spec.ts`

**Steps:**
  1. Login in English UI
  2. Create a health record with tag 'After Meal'
  3. Switch language to Chinese via Settings
  4. Navigate to health records, check the tag display
  5. Create another record with a Chinese tag
  6. Switch back to English
  7. Check tag display for both records

**Expected Results:**
  - Tags display correctly in both languages
  - Tag values are preserved and translated appropriately when language switches
  - Filtering by tags works correctly regardless of the language used during creation
