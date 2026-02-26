# Requirement: Web 端微信扫码登录（Phase 1） & 无缝小程序体验（Phase 2）

## 1. Background & Value
- **User Story**:
  - Phase 1: 作为一个 Web 用户，无需输入账号密码，通过微信扫一扫（小程序码）直接登录 Web 端。这样既方便快捷，又能自动注册/绑定账号。
  - Phase 2: 作为手机用户，通过同一个小程序，随时随地录入健康数据，数据与 Web 端实时互通。
- **Business Value**:
  - **降本增效**：利用小程序作为“验证器”，避免高昂的短信验证码成本；
  - **统一身份**：通过 UnionID 机制，确保 Web 扫码登录与未来小程序独立使用时的身份完全一致；
  - **引流**：Web 端引导扫码，自然地将用户沉淀到小程序中，为 Phase 2 铺路。

## 2. Scope & Boundaries
**Phase 1: Web 端微信扫码登录（MVP）**
- **核心流程**：Web 端展示小程序码 -> 用户微信扫码打开小程序 -> 小程序授权确认 -> Web 端收到 Signal 自动跳转登录。
- **账号策略**：
  - **自动注册/登录**：扫码后，若 UnionID 不存在则创建新账号；若存在则直接登录。
  - **账号绑定**：
    - 已登录 Web 的用户，扫码绑定微信（关联 UnionID）。
    - 扫码登录的新用户，后续可设置邮箱密码（为了传统登录方式兜底）。
- **前端工作**：Web 增加“微信登录”按钮 & 二维码弹窗（轮询/WebSocket）；小程序端开发“扫码授权页”。
- **i18n**：Web 端界面支持中/英；小程序端授权页暂只支持中文（英文后续）。

**Phase 2: 微信小程序全功能（Next Step）**
- 小程序端独立功能：健康数据录入、列表查看、成员管理（Self 保护）。
- 离线/弱网支持。
- 微信服务通知（测量提醒等）。

**Out-of-Scope (Phase 1)**
- 小程序端的健康管理功能（Phase 1 小程序仅作为“扫码登录器”）。
- **Web 端 AdminUI 的敏感参数配置**：AppID/Secret 等敏感信息不通过前端界面录入，而是通过环境变量或安全密钥库注入（符合 12-factor App 原则）。
- Web 端直接跳转微信 OAuth（那是公众号/开放平台的逻辑，我们采用更灵活的“小程序码”方案）。

## 3. Acceptance Criteria (AC) - Phase 1
- [ ] **AC1 (Web扫码)**: Web 登录页展示动态二维码（小程序码），用户扫码后，小程序端弹出“确认登录”；确认后 Web 端 2s 内自动登录。
- [ ] **AC2 (统一身份)**: 系统基于 UnionID 识别用户。无论扫码还是未来小程序直接使用，均为同一账号。
- [ ] **AC3 (自动注册)**: 新用户扫码 -> 授权 -> 系统自动创建账号（无需输入邮箱/密码），默认用户名为微信昵称（如无则随机）。
- [ ] **AC4 (账号绑定)**: 
  - 场景A：老用户 (Email: `old@test.com`) 登录 Web 后，在设置页扫码绑定微信。下次可扫码登录 `old@test.com`。
  - 场景B：冲突处理 —— 若该微信已绑定其他账号，提示“该微信已被绑定”（MVP 暂不自动合并，需人工解绑）。
- [ ] **AC5 (安全)**: 二维码有效期 5 分钟；Token 只能使用一次；防止 CSRF。
- [ ] **AC6 (管理)**: 若未配置 AppID/Secret 环境变量，Web 端自动隐藏“微信登录”按钮（Feature toggle by config）。

## 4. Technical Approach (Draft)
- **Why 小程序码登录?**
  - 不用申请昂贵的微信开放平台（Open Platform）Web 资质。
  - 直接复用小程序的 appId/appSecret，完全免费且流程可控。
  - 用户体验极其流畅（扫码 -> 小程序点一下 -> Web 进去了）。
- **流程**:
  1. Web 请求后端 -> 生成带 SessionID 的小程序码 (scene=SessionID)。
  2. 用户扫码 -> 打开小程序（带 scene 参数） -> 调用 `wx.login` + `后端 API: /auth/wechat/scan-confirm`。
  3. Web 端轮询 `/auth/wechat/check-status?session_id=...` -> 发现已确认 -> 返回 JWT -> 登录成功。

## 5. Non-Functional Requirements
- **性能**: 扫码登录全流程 P99 < 3s。
- **兼容性**: 小程序端需兼容 iOS/Android 主流版本微信。
- **环境**: 需配置 HTTPS（微信强制要求）。
