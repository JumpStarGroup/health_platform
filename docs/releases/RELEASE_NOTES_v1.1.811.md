# Release Notes - v1.1.811

发布日期：2026-08-11

## 概述

本版本采用日期 Patch 编码 `811`，聚焦于仓库迁移、三环境 Kubernetes 隔离和可审计的自动化发布流程。应用功能与 API 保持向后兼容。

## 变更摘要

### 部署与环境

- 建立 `health-platform-dev`、`health-platform-staging` 和 `health-platform-prod` Namespace。
- 增加 `Deploy Development` 手动工作流。
- 启用 `Deploy Staging`，从 `main` 构建并部署不可变 commit SHA 镜像。
- 保留 `Release Production`，仅接受可从 `main` 到达的 `vMAJOR.MINOR.PATCH` 标签。

### 安全与权限

- 每个环境使用独立的 `github-deployer` ServiceAccount 和 namespace-scoped RBAC。
- 部署身份不能创建 Namespace，也不能跨 Namespace 操作。
- `KUBE_CONFIG` 和 `JWT_SECRET` 按 Environment 隔离。
- `GHCR_READ_TOKEN` 作为只读 Repository Secret 在三个环境间复用。
- production 部署需要 `AppDev_Team` 审批并禁止触发者自审。

### 数据库策略

- development 和 staging 不配置 `DATABASE_URL`，使用 backend Pod `emptyDir` 中的临时 SQLite。
- development 和 staging 强制单 backend 副本。
- Pod 被替换、重新调度或 rollout 后，临时 SQLite 数据会清空。
- production 必须配置外部持久数据库 `DATABASE_URL`。

## 兼容性

- 无 Breaking Changes。
- 无数据库 schema 迁移。
- staging 与 production 使用不同 Namespace、JWT 和 kubeconfig。

## Staging 验证清单

- backend/frontend 镜像以同一 commit SHA 构建。
- `health-platform-staging` 中 backend/frontend rollout 成功。
- 登录、成员管理和健康记录核心用户旅程通过。
- Playwright staging 回归通过并上传测试报告。
- `GET /api/v1/version` 返回 `1.1.811`。

## Production 发布前置条件

- production Environment 已配置外部 `DATABASE_URL`。
- production `CORS_ORIGINS` 已设置为实际 HTTPS Origin。
- staging 对 `1.1.811` 发布提交的部署和 E2E 全部成功。
- Tag、`VERSION`、`CHANGELOG.md` 和本发布说明均为 `1.1.811`。

## 回滚

重新运行 `Release Production` 并输入上一个已验证的版本 Tag。不要移动或覆盖已有 Tag；回滚后创建修复 PR，使 `main` 与生产状态重新收敛。