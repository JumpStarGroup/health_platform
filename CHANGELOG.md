# Changelog

All notable changes to this project will be documented in this file.

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
