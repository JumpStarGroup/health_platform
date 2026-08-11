# GitHub 环境配置指南

> 本指南配合 [分支管理与自动化部署](BRANCHING-AND-DEPLOYMENT.md) 使用。当前项目采用 `feature/*` / `fix/*` → `main` 的轻量 trunk 流。

## 🎯 快速设置指南

本指南帮助您在 GitHub 中配置安全的环境变量和密钥。

## 🔧 GitHub Environment 设置

### 1. 创建环境

1. 进入仓库 → **Settings** → **Environments**
2. 点击 **New environment**
3. 创建以下环境：
   - `staging`
   - `production`

### 2. 配置分支保护规则

#### Staging 环境
- **Environment name**: `staging`
- **Deployment branches**: Selected branches
- **Branch name pattern**: `main`
- **Required reviewers**: 0 (合并到 main 后自动部署测试环境)

#### Production 环境
- **Environment name**: `production`
- **Deployment branches**: Selected branches  
- **Tag pattern**: `v*.*.*` (仅 release tag 触发生产发布)
- **Required reviewers**: 1+ (生产环境需要审批)
- **Wait timer**: 0 minutes
- **Prevent self-review**: ✅ 启用

## 🔐 配置环境密钥 (Secrets)

### 参数分类

| 名称 | 类型 | Staging | 用途 |
|---|---|---|---|
| `KUBE_CONFIG` | Secret | 必需 | GitHub Actions 访问目标 Kubernetes 集群的原始 kubeconfig YAML |
| `GHCR_READ_TOKEN` | Secret | 必需 | Kubernetes 长期拉取私有 GHCR 镜像的只读凭据 |
| `GHCR_USERNAME` | Variable | 必需 | `GHCR_READ_TOKEN` 所属的 GitHub 用户名，不是组织名 |
| `DATABASE_URL` | Secret | 建议 | 后端数据库连接；缺失时 staging 使用非持久单副本 SQLite |
| `JWT_SECRET` | Secret | 建议 | JWT 签名密钥；缺失时每次部署自动轮换，已有登录令牌会失效 |
| `CORS_ORIGINS` | Variable | 按访问方式配置 | 允许访问 API 的浏览器 Origin，多个值使用逗号分隔 |

`KUBE_CONTEXT` 不需要单独配置。项目使用 `kubectl config view --minify --raw` 生成仅包含当前上下文的 kubeconfig，工作流直接使用其中的 `current-context`。

目标 Namespace 必须由集群管理员预先创建。部署身份只需要目标 Namespace 内对 Deployment、Service、ConfigMap、Secret 和 Pod 日志等部署资源的必要权限；工作流不会创建或修改 Namespace，从而避免使用集群管理员 kubeconfig。

### GitHub Container Registry 凭据

构建阶段使用工作流自动生成的 `GITHUB_TOKEN` 推送镜像，不需要人工配置写权限。Kubernetes 在工作流结束后仍需拉取私有镜像，不能依赖短期 `GITHUB_TOKEN`，因此需要长期只读凭据。

`GHCR_USERNAME` 是 Docker registry 认证结构中的用户名，必须与 `GHCR_READ_TOKEN` 的所有者一致。例如 token 由 `DevOps-zhuang` 创建，则变量值为 `DevOps-zhuang`。`JumpStarGroup` 是组织名，不能作为个人 PAT 的认证用户名。

创建只读 token：

在配置 GHCR 访问之前，需要创建个人访问令牌：

1. 进入 **GitHub Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. 点击 **Generate new token** → **Generate new token (classic)**
3. 设置：
   - **Note**: `Health Platform GHCR Access`
   - **Expiration**: 建议 90 天
   - **Scopes**: 仅选择 `read:packages`
4. 如组织启用了 SAML SSO，为 token 授权 `JumpStarGroup`。
5. 将 token 保存为 Environment Secret `GHCR_READ_TOKEN`。
6. 将 token 所属用户名保存为 Environment Variable `GHCR_USERNAME`。

不要授予 `write:packages` 或 `delete:packages`；镜像构建推送由 Actions 的 `GITHUB_TOKEN` 完成。更稳妥的长期方案是使用专用机器账号创建 token，避免个人离职或权限变化导致集群无法拉取镜像。

### Production 环境密钥
进入 `production` 环境，添加以下 Secrets：

```bash
# 数据库连接（生产）
DATABASE_URL=mysql+pymysql://username:password@your-server.mysql.database.azure.com:3306/health_platform?charset=utf8mb4

# JWT 密钥（生产）- 使用强随机字符串
JWT_SECRET=your-super-secure-random-jwt-secret-key-here

# Kubernetes 配置（原始 YAML，不要再次 Base64 编码）
KUBE_CONFIG=<output-of-kubectl-config-view-minify-raw>

# GitHub Container Registry 认证
GHCR_READ_TOKEN=your-personal-access-token-with-read:packages
```

Production Environment Variables：

```bash
GHCR_USERNAME=token-owner-github-login
CORS_ORIGINS=https://your-domain.example
```

### Staging 环境密钥
进入 `staging` 环境，添加以下 Secrets：

```bash
# 数据库连接（测试）
DATABASE_URL=sqlite:///instance/health_platform.db

# JWT 密钥（测试）
JWT_SECRET=your-staging-jwt-secret-key-here

# Kubernetes 配置（原始 YAML，不要再次 Base64 编码）
KUBE_CONFIG=<output-of-kubectl-config-view-minify-raw>

# GitHub Container Registry 认证
GHCR_READ_TOKEN=your-personal-access-token-with-read:packages
```

Staging Environment Variables：

```bash
GHCR_USERNAME=token-owner-github-login
CORS_ORIGINS=https://staging-domain.example
```

**密钥获取方法：**

```bash
# 快速获取所有配置 (推荐)
# Windows:
scripts\get-kube-config.bat

# Linux/Mac:
chmod +x scripts/get-kube-config.sh
./scripts/get-kube-config.sh

# 或手动获取各个配置:
# 获取仅含当前上下文的原始 kubeconfig（直接保存为 KUBE_CONFIG）
kubectl config view --minify --raw

# 生成强随机 JWT 密钥
python -c "import secrets; print(secrets.token_urlsafe(32))"

# 或使用 OpenSSL
openssl rand -base64 32
```

## 🔧 配置环境变量 (Variables)

> 如果未设置 `CORS_ORIGINS`，staging 会使用以下开发/集群内默认值：
> - `http://localhost:3000,http://127.0.0.1:3000,http://frontend-svc.{NAMESPACE}.svc.cluster.local:80`  
> 该默认值通常不包含实际 staging 公网域名。通过公网域名访问前后端时，应显式设置该变量。

### Production 环境变量
进入 `production` 环境，添加以下 Variables（**可选**）：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `CORS_ORIGINS` | `https://your-domain.com,https://www.your-domain.com` | 生产前端域名（不设置时使用默认生成） |
| `BACKEND_REPLICAS` | `3` | 后端副本数（生产） |
| `FRONTEND_REPLICAS` | `2` | 前端副本数（生产） |

## 🚀 部署流程

### Staging 部署
1. 创建 PR 到 `main`，等待后端测试、前端构建和代码审查通过。
2. 合并后自动构建 commit SHA 镜像并部署到 `staging` Environment。
3. Kubernetes rollout 成功后自动运行 Playwright 回归。

### Production 部署
1. staging 验证通过后，按发布流程更新版本文件并合并 release PR。
2. 在 `main` 发布提交创建并推送 `vMAJOR.MINOR.PATCH` 标签。
3. `release-production.yml` 校验标签和发布文件，随后等待 `production` Environment 审批。
4. 审批通过后部署并自动运行生产 Playwright 回归。

## ⚠️ 安全注意事项

### ✅ 最佳实践
- 定期轮换 JWT 密钥和数据库密码
- 使用强随机密钥（至少 32 字符）
- 限制环境访问权限
- 使用分支保护规则
- 定期审计环境配置

### ❌ 避免的做法
- 不要在代码中硬编码敏感信息
- 不要在 PR 描述中包含密钥
- 不要与他人共享环境访问权限
- 不要在日志中输出敏感信息

## 🔍 验证配置

### 检查环境配置
1. 进入 Actions 页面
2. 查看最新的部署日志
3. 确认环境变量正确加载
4. 检查遮蔽的敏感信息显示

### 常见问题排查
- **配置未生效**: 检查环境名称和分支匹配规则
- **权限错误**: 确认用户有环境访问权限
- **密钥为空**: 确认在正确环境中设置了 Secrets

---

**需要帮助？**
- 查看 [SECURITY-CONFIG.md](./SECURITY-CONFIG.md) 了解配置层次
- 联系团队管理员获取环境访问权限
- 参考 GitHub Actions 日志排查问题

*Last updated: 2025-09-07*
