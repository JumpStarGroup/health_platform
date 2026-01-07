# 技术设计：Workshop 共享 AKS 集群 + 分支=Namespace 自动部署（GHCR + LoadBalancer + Namespace Guardrails）

- Date: 2026-01-07
- Status: Draft
- Audience: Platform Admin / Repo Maintainers / Workshop Facilitators

---

## 1) Overview

本文档基于需求文档：`docs/requirements/req-workshop-aks-shared-cluster.md`。

### 1.1 目标回顾（来自需求文档）
- 以“分支”为单位创建独立环境：`branch -> namespace`，同分支重复部署落到同一 namespace。
- 学员仅通过 GitHub（push/PR/Actions）触发从构建到部署的全流程。
- 前端对外访问通过 `Service type=LoadBalancer` 暴露（本阶段不要求 Ingress/HTTPS/域名）。
- 共享集群需具备最基本的资源公平机制：对每个学员 namespace 启用 `ResourceQuota + LimitRange`。
- 镜像仓库使用 GHCR。

### 1.2 约束与现状对齐
- 前端暴露方式：`Service type=LoadBalancer`（后续可迁移 Ingress，但本阶段不要求）。
- CI 具备创建 namespace 的权限（RBAC 模式 A）。
- 镜像：GHCR；构建/推送见 `.github/workflows/Build-Deploy-K8S.yml`；部署模板 `deploy/k8s-template.yaml`。
- 必须改进：集群拉取镜像不能使用短生命周期 `GITHUB_TOKEN`，改为长期 `read:packages` 凭据；并在 namespace 层应用 `ResourceQuota + LimitRange`。

---

## 2) Architecture Changes

本节描述需要在 workflow、registry、cluster、namespace 隔离、前端访问方式上的变化。

### 2.1 Workflow（GitHub Actions）

当前现状（概览）：
- `.github/workflows/Build-Deploy-K8S.yml` 负责：检测变更 → build & push → 设置 kubectl context → 创建 `ghcr-secret` → `envsubst` 渲染 `deploy/k8s-template.yaml` → `kubectl apply` → `rollout status`。

需要的架构调整：
1. **Namespace 由分支名派生（branch → namespace）**
   - 不再依赖固定环境文件中的静态 `NAMESPACE`（或将其作为“前缀/默认”而非最终值）。
   - 在 `deploy` job 中生成稳定、合法、可复用的 namespace 名称（见第 4 节）。

2. **Namespace Guardrails（ResourceQuota + LimitRange）在 namespace 初始化阶段应用**
   - 在部署工作负载（Deployments/Services）之前，先 apply：
     - `Namespace`（若不存在）
     - `ResourceQuota`
     - `LimitRange`
   - 目的是让超额资源请求在创建 Pod/Deployment 阶段就以可理解的方式失败。

3. **镜像拉取凭据：改为长期 `read:packages`**
   - workflow 不再使用 `${{ secrets.GITHUB_TOKEN }}` 生成 `imagePullSecret`。
   - 使用长期 GHCR 读取凭据（建议：GitHub PAT，权限最小化 `read:packages`，必要时加 `repo` 取决于镜像可见性和组织策略；详见第 3 节）。

4. **输出可复制的前端访问地址（验收 C2/C3）**
   - 部署完成后，通过 `kubectl get svc frontend-svc -n <ns> -o jsonpath=...` 获取 `EXTERNAL-IP` 并输出。
   - 若 `EXTERNAL-IP` 为 pending，输出建议排查信号（见第 5 节）。

> 备注：PR 场景需注意 Secrets 暴露风险。当前 workflow 已限制仅同仓库 PR 才允许 deploy，这是正确方向；设计上仍需明确“fork PR 不部署”。

### 2.2 Registry（GHCR）

- 构建推送：可以继续使用 GitHub Actions 的 `GITHUB_TOKEN`（短生命周期）完成 push，因为 push 只发生在 CI 执行窗口内。
- 集群拉取：必须使用长期有效凭据（PAT 或等价机制）。原因：Kubernetes 节点在后续拉取镜像时需要有效的 registry token；短生命周期 token 会导致节点重拉取（扩容/漂移/重启）失败。

推荐策略（简化、可落地）：
- 保留 build/push 使用 `GITHUB_TOKEN`。
- 新增一个仅用于**拉取**的 secret：例如 `GHCR_READ_TOKEN`（PAT，`read:packages`），并由 workflow 写入 namespace 内的 `imagePullSecret`（例如 `ghcr-secret`）。

### 2.3 Cluster（共享 AKS）

共享集群视角的关键点：
- **集群访问凭据**：通过 GitHub Environments/Secrets 提供 `KUBE_CONFIG`、`KUBE_CONTEXT`，workflow 通过 `azure/k8s-set-context@v1` 配置 kubectl。
- **RBAC 模式 A**：CI 身份拥有创建 namespace 的权限，同时也必须能在目标 namespace 内创建/更新以下资源：
  - `Secret`（用于 imagePullSecret）
  - `ResourceQuota` / `LimitRange`
  - `ConfigMap` / `Deployment` / `Service`

边界声明（本阶段不做）：
- 不引入 Ingress Controller、WAF、证书管理、DNS 自动化。
- 不引入 NetworkPolicy / PodSecurity / OPA/Gatekeeper 等强策略治理（可作为后续增强）。

### 2.4 Namespace 隔离（branch=namespace）

隔离边界：
- 每个分支一个 namespace，资源互不覆盖。
- 所有命名空间级别资源（ConfigMap/Deployment/Service/Secret/Quota/LimitRange）都必须显式声明 `metadata.namespace` 或由 `kubectl -n` 指定。

Guardrails：
- 每个 namespace 统一应用：
  - `ResourceQuota`：限制 CPU/Memory/Pods/Services/LoadBalancers 等（具体数值由管理员确定）。
  - `LimitRange`：设置默认 requests/limits，避免 Pod 无限制消耗。

### 2.5 前端访问方式（LoadBalancer）

- 继续使用 `frontend-svc` 的 `Service type=LoadBalancer` 对外暴露。
- workflow 负责输出访问地址：
  - `http://<EXTERNAL-IP>/`
- 注意：由于未引入 Ingress，本阶段只保证“可访问”，不承诺固定域名、TLS、路径路由等能力。

---

## 3) Security Boundaries

### 3.1 Secrets 管理

GitHub 侧：
- `KUBE_CONFIG`、`KUBE_CONTEXT`：放在 GitHub Environments/Secrets（按 development/staging/production 或 workshop 环境划分）。
- `DATABASE_URL`、`JWT_SECRET`：同样通过 Secrets 注入；日志中必须 mask。
- 新增 `GHCR_READ_TOKEN`（或同等命名）：
  - 类型：GitHub PAT
  - 权限：最小化为 `read:packages`（如果镜像为 private 且组织策略需要，可能还需 `repo`；以管理员实际策略为准）
  - 用途：仅用于集群拉取镜像（创建/更新 `imagePullSecret`）

Kubernetes 侧：
- `imagePullSecret`（如 `ghcr-secret`）存在于每个学员 namespace 内。
- 建议在 Secret metadata 上加 label（如 `managed-by=github-actions`）便于审计与清理。

日志与泄露防护：
- workflow 中不得 `kubectl get secret -o yaml` 打印 secret 内容。
- 对 docker-registry secret 创建命令避免 echo token；使用环境变量传递即可。

### 3.2 最小权限（Least Privilege）

GitHub Actions permissions：
- `contents: read`（保持）
- `packages: write`（build/push 需要）
- 额外权限不建议开启。

Kubernetes RBAC（模式 A 下的建议形态）：
- CI 使用单一“部署身份”（如 `ci-deployer`）连接集群。
- 集群级权限仅包含：
  - 创建 namespace（cluster-scoped）
  - 在允许的 namespace 前缀范围内管理资源（通常是 namespace-scoped）

> 说明：纯 RBAC 很难做到“只能创建特定前缀的 namespace”。若需要强约束，后续可引入准入控制（OPA/Gatekeeper）或 Azure Policy for AKS。本阶段可通过流程约束 + 命名规范 + 审计降低风险。

### 3.3 Token 轮换（Rotation）

- `GHCR_READ_TOKEN` 轮换策略：建议 30/60/90 天轮换一次（由管理员制定）。
- 轮换方式：
  1) 更新 GitHub Secrets 中的 `GHCR_READ_TOKEN`
  2) 触发一次部署（或批量重部署）以更新所有 namespace 中的 `imagePullSecret`
- 回滚/应急：若 token 误吊销导致镜像拉取失败，可临时恢复旧 token 或快速签发新 token 并重跑部署。

---

## 4) Namespace Naming（branch -> namespace 规范）

Kubernetes namespace 命名约束（核心）：
- DNS label 风格：小写字母、数字、`-`
- 最大长度通常为 63 字符
- 不能以 `-` 开头/结尾

### 4.1 规范化原则

输入：`github.ref_name`（分支名，如 `feature/Add-Validation#1`）

规范化算法（建议）：
1. `lowercase`：全转小写
2. `replace`：将非 `[a-z0-9-]` 的字符替换为 `-`
3. `collapse`：连续 `-` 合并为单个 `-`
4. `trim`：去除首尾 `-`
5. `prefix`：统一前缀，例如 `ws-` 或 `hp-ws-`，便于与其他命名空间区分
6. `hash`：追加短哈希避免冲突并控制长度，例如 `-<sha7>` 或 `-<crc32>`
7. `truncate`：整体截断到 63 字符内，优先保留前缀 + 业务名 + hash

输出示例：
- `feature/Add-Validation#1` → `ws-feature-add-validation-1-1a2b3c4`
- `dev` → `ws-dev-5d8e2aa`

### 4.2 冲突处理

- 不同分支在规范化后可能同名（例如仅大小写不同、符号不同）。
- 通过追加稳定 hash（基于原始分支名或分支名+repo）确保唯一。

### 4.3 生命周期与清理

本阶段不要求自动回收（需求 out of scope）。
- 建议管理员按 workshop 批次手动清理：按 namespace label 前缀选择性删除。

---

## 5) Rollout / Failure Modes（高层但可执行）

本节聚焦常见失败类型与“可观测信号”，便于学员与助教快速定位。

### 5.1 镜像拉取失败（最关键）

症状：
- `kubectl get pods -n <ns>` 显示 `ImagePullBackOff` / `ErrImagePull`

信号与定位：
- `kubectl describe pod <pod> -n <ns>`：Events 中出现 `Failed to pull image`、`unauthorized`、`denied`
- `kubectl get secret ghcr-secret -n <ns>`：确认 secret 存在（不要打印内容）

处置：
- 检查 GitHub Secrets 中的 `GHCR_READ_TOKEN` 是否有效且权限足够。
- 检查镜像地址是否为 `ghcr.io/<owner>/...` 且 tag 存在。

### 5.2 配额/限制导致的创建失败（ResourceQuota / LimitRange）

症状：
- Deployment 一直无法创建 Pod，或 Pod 直接被拒

信号与定位：
- `kubectl describe deployment backend -n <ns>`：出现 `FailedCreate`
- `kubectl get events -n <ns> --sort-by=.lastTimestamp`：出现 `exceeded quota`、`must specify limits/requests` 等

处置：
- 调整工作负载 requests/limits 或提高 quota（管理员动作）。

### 5.3 LoadBalancer 分配失败 / Pending

症状：
- `kubectl get svc frontend-svc -n <ns>` 的 `EXTERNAL-IP` 长时间为 `<pending>`

信号与定位：
- `kubectl describe svc frontend-svc -n <ns>`：Events 显示配额不足、LB 创建失败、云 provider 错误

处置：
- 管理员检查 AKS 公网 LB 配额/资源组权限。
- 降低并发（分批 workshop）或限制每个 namespace 的 LB 数量（可通过 quota）。

### 5.4 应用健康探针失败（Readiness/Liveness）

症状：
- Pod 反复重启（CrashLoopBackOff）或一直 NotReady

信号与定位：
- `kubectl logs <pod> -n <ns> --tail=200`
- `kubectl describe pod <pod> -n <ns>`：readiness/liveness 失败原因

处置：
- 后端：检查 `/api/healthz` 是否可用、环境变量注入是否正确。
- 前端：检查 `/nginx-health` 是否可用、容器权限/文件系统是否可写。

### 5.5 Workflow 层面的失败

症状：
- `kubectl apply` 失败、`rollout status` 超时

信号与定位：
- GitHub Actions 日志中已包含：deployments/pods/events/describe/logs 采集（当前 workflow 已有较完整诊断输出）。

处置：
- 优先查看 `Events`（通常最直接）。
- 区分“镜像/权限问题”和“应用自身启动问题”。

---

## 6) High-Level Task Blocks（清晰任务块，不给实现代码）

> 本节给出可执行的任务切分，便于落地实施与验收。

### 6.1 Repo & Workflow 变更

1) 更新镜像拉取凭据策略（必须）
- 目标：集群拉取镜像使用长期 `read:packages` 凭据。
- 需要修改：
  - `.github/workflows/Build-Deploy-K8S.yml`
- 需要新增/调整的 GitHub Secrets：
  - `GHCR_READ_TOKEN`（PAT，`read:packages`）

2) 分支到命名空间的规范化（必须）
- 目标：从 `github.ref_name` 计算 namespace，稳定且合规。
- 需要修改：
  - `.github/workflows/Build-Deploy-K8S.yml`
- 输出：Actions 日志明确展示：`branch`、`namespace`、`commit SHA`、`image tag/digest`。

3) Namespace guardrails（必须）
- 目标：在 namespace 初始化阶段 apply `ResourceQuota + LimitRange`。
- 需要修改或新增（两种方案二选一）：
  - 方案 A：在 `deploy/k8s-template.yaml` 中新增 quota/limitrange 资源块（通过 `envsubst` 参数化）。
  - 方案 B（推荐）：新增独立 manifest，例如 `deploy/k8s-namespace-guardrails.yaml`，workflow 在 apply workload 前先 apply guardrails。

4) 输出 LoadBalancer 访问地址（必须）
- 目标：部署完成后输出可复制 URL。
- 需要修改：
  - `.github/workflows/Build-Deploy-K8S.yml`

### 6.2 Kubernetes 模板与配置

5) 部署模板保持前端 LoadBalancer（已满足，需维持）
- 目标：`frontend-svc` 继续 `type=LoadBalancer`。
- 需要检查：
  - `deploy/k8s-template.yaml` 中 `frontend-svc` 的 `spec.type` 变量化逻辑与环境文件默认值。

6) 环境配置文件对齐（可选但建议）
- 目标：减少静态 `NAMESPACE` 配置，避免与 branch=namespace 冲突。
- 可能涉及文件：
  - `deploy/config/development.env`
  - `deploy/config/staging.env`
  - `deploy/config/production.env`
- 方向：将 `NAMESPACE` 改为 `NAMESPACE_PREFIX` 或仅在非 workshop 环境使用静态值。

### 6.3 平台侧（管理员）准备与运行手册

7) AKS 前置核对（需求文档第 7 节对应）
- 集群已具备：公网 LB 配额、网络出站到 GHCR、CI kubeconfig 权限、基础监控可用（至少 events/logs 可查）。

8) 凭据与权限治理
- PAT 签发、权限最小化、轮换周期、应急流程。

---

## 附：建议涉及的文件清单（不含代码）

- `.github/workflows/Build-Deploy-K8S.yml`
- `deploy/k8s-template.yaml`
- （新增，推荐）`deploy/k8s-namespace-guardrails.yaml`
- `deploy/config/development.env`
- `deploy/config/staging.env`
- `deploy/config/production.env`

---

Generated by Copilot.
