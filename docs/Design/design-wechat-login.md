# Design: WeChat Mini App Login

## 1. Overview
- **Reference**: [docs/requirements/req-wechat-miniapp-login.md](../requirements/req-wechat-miniapp-login.md)
- **Goal**: Enable users to log in to the Web Portal by scanning a QR code with the WeChat Mini App. This improves user experience and supports automatic account creation.
- **Phases**:
    - **Phase 1 (Current)**: Web Scan Login (MVP).
    - **Phase 2 (Future)**: Full Mini App features (Health data entry).

## 2. Architecture Changes

### Backend (Flask)
- **New Service**: `WeChatAuthService` to handle code generation, WeChat API communication, and user binding.
- **New Manager**: `AuthIdentityManager` to manage third-party identities.
- **API Extension**: New endpoints under `/api/v1/auth/wechat/`.
- **Infrastructure**: Redis (preferred) or Memory/Database for storing ephemeral "login scenes" (QR code sessions). *For MVP without introducing Redis, we will use a database table `LoginSession` with short expiry.*

### Frontend (React)
- **Login Page**: Add "Login with WeChat" button.
- **Modal Component**: Displays QR Code and polls for status.
- **State Management**: Handle new JWT reception and auto-redirect.

## 3. Data Model

### 3.1. New Table: `AuthIdentity` (Mapping Table)
Instead of adding columns to `User`, we utilize a separate table for extensibility.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | PK | |
| `user_id` | Integer | FK(`users.id`) | Linked local user |
| `provider` | String(20) | Not Null | e.g., 'wechat_miniapp' |
| `identifier` | String(64) | Not Null, Index | The unique ID (UnionID is preferred for cross-app; OpenID for single app) |
| `credential` | String(255) | Nullable | e.g., session_key (if needed) |
| `data` | JSON/Text | Nullable | Extra info (nickname, avatar) |
| `last_login_at` | DateTime | | |

*Constraint*: Unique constraint on `(provider, identifier)`.

### 3.2. Modifications to `User` Table
To support "WeChat-only" users (no email/password initially):
- **Email**: Change from `NOT NULL` to `NULLABLE`. (Application logic: `email` OR `auth_identity` must exist).
- **Password**: Change from `NOT NULL` to `NULLABLE`.

### 3.3. New Table: `LoginSession` (For QR Code flow)
Stores the temporary "scene" state (Polled by Web, Updated by MiniApp).

| Column | Type | Description |
|---|---|---|
| `scene_id` | String(32) | PK, Random UUID (The value encoded in QR/Scene) |
| `status` | String(16) | `created`, `scanned`, `confirmed`, `expired` |
| `user_id` | Integer | Nullable. Filled after confirmation by MiniApp. |
| `created_at` | DateTime | Automatic expiry check (e.g. > 5 mins invalid) |

## 4. API Specification

### 4.1. Web Client (Frontend)
#### `POST /api/v1/auth/wechat/login-code`
- **Response**: `{ "scene_id": "uuid", "mp_app_id": "...", "expire_seconds": 300 }`
- **Action**: Web displays QR code (using `mp_app_id` + `scene_id` path).

#### `GET /api/v1/auth/wechat/scan-status?scene_id=uuid`
- **Response**:
    - `{"status": "created"}` (Wait)
    - `{"status": "scanned"}` (User scanned, waiting for confirm)
    - `{"status": "confirmed", "access_token": "jwt...", "user": {...}}` (Login success)
    - `{"status": "expired"}` (Show refresh button)

### 4.2. WeChat Mini App
#### `POST /api/v1/auth/wechat/mini/login` (Silent Login)
- **Input**: `{ "code": "wx_code_..." }`
- **Action**: Backend calls `jscode2session`.
- **Response**: `{ "temp_token": "jwt_with_openid" }` (Short-lived token for next step)

#### `POST /api/v1/auth/wechat/mini/confirm` (User Button Click)
- **Input**: `{ "scene_id": "uuid", "temp_token": "..." }`
- **Action**:
    1. Verify `temp_token` to get OpenID/UnionID.
    2. Find or Create `User` + `AuthIdentity`.
    3. Update `LoginSession` status to `confirmed` and set `user_id`.
- **Response**: `{ "success": true }`

## 5. Security & Environment
- **Secrets**: `WECHAT_MINI_APP_ID`, `WECHAT_MINI_APP_SECRET` in environment variables.
- **Scene Safety**: `scene_id` should be a high-entropy UUID V4.
- **Temp Token**: Use a separate JWT secret or specific audience to prevent it from being used as a login token.
| `expires_at` | DateTime | 5 minutes TTL |
| `created_at` | DateTime | |

## 4. API Interface

### 4.1. Web: Get Login Code
- **Endpoint**: `POST /api/v1/auth/wechat/login-code`
- **Response**:
  ```json
  {
    "scene_str": "uuid-1234-...",
    "expires_in": 300,
    "qr_img_base64": "data:image/png;base64,..." // Optional: Frontend can generate QR from scene_str too
  }
  ```
- **Logic**: Generates a unique `scene_str`, saves to `auth_login_sessions` with status `created`. Call generic WeChat token API (if needed) to get WXA Code, or just let frontend generate QR for a deep link `pages/auth?scene=...`. **Decision**: Frontend generates QR code image from `scene_str` to save backend bandwidth, or Backend proxies WeChat's `getUnlimitedQRCode`. Let's stick to **Backend proxies WeChat API** to ensure the code is valid for the Mini App (AC1).

### 4.2. Web: Check Status (Polling)
- **Endpoint**: `GET /api/v1/auth/wechat/status?scene_str=...`
- **Response**:
  ```json
  {
      "status": "created" | "scanned" | "confirmed" | "expired",
      "access_token": "jwt..." // Only present if status == confirmed
  }
  ```

### 4.3. Mini App: Update Status (Scan & Confirm)
- **Endpoint**: `POST /api/v1/auth/wechat/callback`
- **Request**:
  ```json
  {
      "code": "wx_login_code", // From wx.login()
      "scene_str": "uuid-1234-...", // From QR code param
      "user_info": { ... } // Optional: Raw data + signature for verification
  }
  ```
- **Logic**:
  1. Validate `scene_str` exists and not expired.
  2. Exchange `code` with WeChat API for `openid` and `unionid`.
  3. **Auto-Register/Login**:
     - Check `auth_identities` for `unionid`.
     - **If exists**: Get `user_id`.
     - **If new**: Create `User` (username=WeChat Nickname or Random), create `AuthIdentity`.
  4. Update `auth_login_sessions`: set `status`='confirmed', `user_id`=Found/Created User ID.

## 5. Security & Configuration
- **Env Variables**:
  - `WECHAT_APP_ID`: Mini App ID
  - `WECHAT_APP_SECRET`: Mini App Secret
- **Token Security**:
  - The JWT issued via Polling must be the same standard as standard login.
  - Rate limit the `login-code` and `status` endpoints.
- **Session Cleanup**:
  - A background job (or lazy check) to clean up expired `auth_login_sessions`.

## 6. High-Level Task Blocks

### Block 1: Database & Models (Backend)
- [ ] Create `AuthIdentity` model.
- [ ] Create `AuthLoginSession` model.
- [ ] Run migrations.

### Block 2: Service Logic (Backend)
- [ ] Implement `WeChatClient` helper (requests to `api.weixin.qq.com`).
- [ ] Implement `WeChatAuthService`: logic for `login`, `register_via_wechat`, `handle_callback`.
- [ ] Implement API endpoints in `src/service/auth_wechat_service.py` (new blueprint).

### Block 3: Frontend Implementation
- [ ] Add "WeChat Login" button to Login Page.
- [ ] Create `WeChatLoginModal`.
- [ ] Implement Polling logic.

### Block 4: Testing
- [ ] Integration tests mocking WeChat API responses.
- [ ] E2E test (requires mocking the "Mini App callback" part since we can't automate real phone scan).
