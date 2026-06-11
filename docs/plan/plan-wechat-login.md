# Implementation Plan: WeChat Mini App Login

## References
- Requirement: [docs/requirements/req-wechat-miniapp-login.md](../requirements/req-wechat-miniapp-login.md)
- Design: [docs/Design/design-wechat-login.md](../Design/design-wechat-login.md)

## Phase 1: Database Migration
- [ ] **Task 1.1**: Create `AuthIdentity` model in `src/models.py`.
    - Fields: `id`, `user_id`, `provider`, `identifier`, `credential`, `data`, `last_login_at`.
    - Constraint: Unique `(provider, identifier)`.
- [ ] **Task 1.2**: Create `LoginSession` model in `src/models.py`.
    - Fields: `scene_id` (PK, String), `status`, `user_id`, `created_at`, `expires_at`.
- [ ] **Task 1.3**: Update `User` model in `src/models.py`.
    - Change `email` to `nullable=True`.
    - Change `password_hash` to `nullable=True`.
- [ ] **Task 1.4**: Generate and apply DB migration.
    - Run `flask db migrate -m "Add WeChat Auth tables"`
    - Run `flask db upgrade`
    - Verify schema changes.

## Phase 2: Backend Core
- [ ] **Task 2.1**: Implement `AuthIdentityManager` in `src/manager/auth_identity_manager.py`.
    - Methods: `create_identity`, `get_by_provider_and_identifier`, `update_last_login`.
- [ ] **Task 2.2**: Implement `WeChatAuthService` in `src/service/wechat_auth_service.py`.
    - Method `create_login_session()`: Generate UUID, save to `LoginSession`.
    - Method `get_session_status(scene_id)`: Return status/token.
    - Method `wechat_login(code)`: Call WeChat `jscode2session` (mock for now, or real if creds avail).
    - Method `confirm_login(scene_id, openid, user_info)`: Link session to user, create user if needed.
- [ ] **Task 2.3**: Update `AuthService` (or new) to issue JWT for WeChat users.
    - Ensure `create_access_token` works for users without password/email.

## Phase 3: Public API
- [ ] **Task 3.1**: Create `src/api/auth_wechat.py` Blueprint.
- [ ] **Task 3.2**: Implement `POST /api/v1/auth/wechat/login-code` (Web).
    - Calls `WeChatAuthService.create_login_session`.
- [ ] **Task 3.3**: Implement `GET /api/v1/auth/wechat/scan-status` (Web).
    - Calls `WeChatAuthService.get_session_status`.
- [ ] **Task 3.4**: Implement `POST /api/v1/auth/wechat/mini/login` (MiniApp).
    - Handles silent login, returns temp token (or session key).
- [ ] **Task 3.5**: Implement `POST /api/v1/auth/wechat/mini/confirm` (MiniApp).
    - User confirms login on phone.
- [ ] **Task 3.6**: Register Blueprint in `src/app.py`.

## Phase 4: Frontend
- [ ] **Task 4.1**: Create `WeChatLoginButton` component.
    - Only show if `ENABLE_WECHAT_LOGIN` config is true.
- [ ] **Task 4.2**: Create `WeChatQRCodeModal` component.
    - Fetch QR code (or scene ID and render QR).
    - Implement polling logic (every 2s).
- [ ] **Task 4.3**: Handle "Confirmed" state.
    - Store JWT from response.
    - Redirect to Dashboard.
- [ ] **Task 4.4**: Update `Login` page to include the new button.

## Phase 5: Verification
- [ ] **Task 5.1**: Add Unit Tests for `WeChatAuthService`.
    - Mock external WeChat API calls.
    - Test user creation flow.
    - Test binding flow.
- [ ] **Task 5.2**: Add Unit Tests for `LoginSession` expiry logic.
- [ ] **Task 5.3**: Manual/E2E Test.
    - Simulate "Scan" flow using Postman/Script (since we might not have real Mini App yet).
    - Verify `User` creates with random username.
    - Verify `AuthIdentity` links correctly.
