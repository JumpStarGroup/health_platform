# Changelog

All notable changes to this project will be documented in this file.

## [1.1.811] - 2026-08-11

### 新增
- 增加 development、staging 和 production 三套 Kubernetes 部署环境。
- 增加 Development 手动部署、Staging 自动部署和 Tag 驱动的 Production 发布流程。

### 改进
- 将项目迁移到 `JumpStarGroup/health_platform`，恢复分支并启用主分支保护。
- 为各环境配置独立的 namespace-scoped ServiceAccount、RBAC 和 kubeconfig。
- 使用不可变 commit SHA 镜像部署 development 和 staging，提高审计与回滚能力。
- 使用 Repository Secret 共享 GHCR 只读凭据，并按 Environment 隔离 Kubernetes 与 JWT 凭据。
- development 和 staging 使用单副本临时 SQLite，production 强制要求外部持久数据库。

### 安全
- 禁止部署身份创建 Namespace 或跨环境访问资源。
- production 仅允许 `vMAJOR.MINOR.PATCH` 标签部署，并要求 Environment 审批。

## [1.1.615] - 2026-06-15

### 改进
- 更新 Playwright E2E 语言切换选择器，兼容 Ant Design 5。
- 增加 release/hotfix PR 自动校验，避免遗漏 `VERSION`、`CHANGELOG.md` 与 release note。
- 补充 release 分支与发布流程文档说明，便于管理员执行版本发布与回滚检查。
- 优化 CI 工作流，对 release/hotfix PR 提供版本发布前门禁。

## [1.1.0] - 2026-01-15

### 改进
- **E2E 回归测试稳定性**：注册/登录/中文语言切换/健康记录/成员/修改全流程可稳定跑通
- **选择器鲁棒性**：避免 Ant Design Select 下拉渲染/遮挡导致的 flaky
- **报告生成**：Playwright HTML 报告默认生成但不自动启动本地服务（需要时手动 `npx playwright show-report`）

## [1.0.0] - 2025-11-28

### 新增功能
- **超级管理员系统**：三级角色权限 (USER/ADMIN/SUPER_ADMIN)
- **用户管理**：管理员可查看用户列表、提升/降级角色、重置密码
- **图表优化**：统一 Y 轴、异常血压高亮（≥120/80 mmHg）、颜色对比优化
- **密码策略**：最少 8 位，包含字母和数字
- **首次登录引导**：强制修改初始/重置密码
- **版本管理**：`GET /api/v1/version` 接口，登录页显示版本号

### 改进
- 时区统一处理，跨时区显示一致
- 收缩压蓝色、舒张压绿色、心率紫色，视觉层次清晰
- 支持邮箱或用户名登录（用户名不区分大小写）

### 配置
- 默认超级管理员：通过 `SUPER_ADMIN_EMAIL/USERNAME/PASSWORD` 环境变量配置
- 应用版本：通过 `APP_VERSION` 环境变量配置

---

## [0.1.0] - 2025-09-17
- Add role-based access with USER/ADMIN/SUPER_ADMIN.
- Seed default SUPER_ADMIN account via env (SUPER_ADMIN_EMAIL/USERNAME/PASSWORD).
- Admin APIs: list users, promote/demote ADMIN, reset user password.
- Password policy: min 8 chars with letters and digits.
- Force password-change flow after admin reset and for default SUPER_ADMIN.
- Add last login tracking and include in admin user list.
- Support login by email or username (username case-insensitive).
- Add version endpoint GET /api/v1/version and frontend display on login.
