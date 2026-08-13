---
agent: agent
---

# Health Platform 新功能开发与分支策略（Prompt 模板）

> 本文件用于指导 GitHub Copilot / Agent 在本仓库中进行**新版本 / 新功能开发**时，统一遵守分支策略与开发流程。后续有新功能时，可直接引用本 prompt。

## 一、分支与环境策略

1. **主分支 (`main`)**：
   - 始终保持可部署状态。
   - 生产部署仅从 `main`（通常配合 Tag，例如 `v1.1.0`）。

2. **功能分支 (`feature/*`)**：
   - 用于新增功能或较大改动的开发。
   - 命名建议：`feature/<short-kebab-or-snake-name>`，例如：
     - `feature/health-trend-dashboard`
     - `feature/member-tag-filtering`

3. **修复分支 (`fix/*`)**：
   - 用于 Bug 修复。
   - 命名建议：`fix/<issue-or-bug-desc>`，例如：
     - `fix/bp-validation-limits`

4. （可选增强）环境分支：
   - 当团队/CI 需要时，可启用：
     - `develop`：集成开发分支
     - `staging`：预发布分支
   - 推荐拓扑：

     ```text
     main (production-ready)
       ↑
     staging (pre-production)
       ↑
     develop (integration)
       ↑
     feature/* (feature development)
     ```
默认模式下，按轻量主干模式：`feature/*` → `main`。除非明确要求使用环境分支，否则均假定无环境分支存在。

## 二、新功能开发统一流程

> 当 Agent 收到“开发新功能”相关指令时，应自动对照以下步骤，并在需要时提示用户确认当前所处分支与目标策略。

0. **确认开发前门禁**
   - 读取关联 GitHub Issue。
   - 如果需求尚未完成 Requirement_Reviewer 审核，停止分支创建并先提交需求评审。
   - 只有 Development_Readiness_Reviewer 可以把 Issue 设置为 `stage:ready-for-development`。
   - Issue 未达到 `stage:ready-for-development` 时，不得创建功能分支或开始编码。
   - Developer 实际开始实现时，才把 Issue 更新为 `stage:in-development`。

1. **确认当前分支与同步主干**
   - 命令示例（由人类在 Terminal 3 执行）：

     ```cmd
     git checkout main
     git pull origin main
     ```

2. **创建功能分支**
   - 与用户一起根据功能简要描述生成分支名，例如：`feature/health-trend-dashboard`。
   - 命令示例：

     ```cmd
     git checkout -b feature/<short-feature-name>
     git push -u origin feature/<short-feature-name>
     ```

3. **设计实现方案（最少包含以下内容）**
   - 后端：
     - `src/manager/` 中的 Manager 层改动：数据模型与业务逻辑。
     - `src/service/` 中的 Service/API 层改动：HTTP 路由、参数校验。
   - 前端：
     - 在 `frontend/src/` 下新增或修改页面 / 组件（React 18 + Ant Design + ECharts + i18next）。
   - 测试：
     - 后端单元测试：`tests/` 目录下新增或更新 Pytest 用例。
     - 如涉及 UI 行为，必要时更新 `tests/e2e/` 下的 Playwright 测试。

4. **实现与本地验证**
   - 按 `AGENTS.md` / `docs/DEVELOPMENT.md` 指南启动应用：
     - 使用 `invoke_app_with_different_Terminals.prompt.md` 所述的 **三个独立终端** 模型：
       - Terminal 1：仅后端（Flask）
       - Terminal 2：仅前端（React `npm start`）
       - Terminal 3：仅用于测试与所有交互命令
   - 在 Terminal 3 中执行快速测试命令，例如：

     ```cmd
     python -m pytest -q
     ```

   - 如需前后端联调，仅通过浏览器访问 `http://localhost:3000`，检查功能行为是否符合预期。

5. **提交规范与 PR**
   - Git 提交信息必须遵循 Conventional Commits：

     ```text
     <type>(<scope>): <description>
     ```

     - `type` 示例：`feat` / `fix` / `docs` / `refactor` / `test` / `chore`
     - `scope` 推荐使用模块名或领域名，例如：`health` / `admin` / `members` / `frontend`
     - 示例：

       ```text
       feat(health): add trend dashboard for blood pressure
       fix(members): prevent duplicate self member creation
       ```

   - 推送功能分支并创建 PR：
     - 目标分支：默认 `main`（或在启用环境分支策略时指向 `develop` / `staging`，由仓库当前实践决定）。
     - PR 描述中需说明：
       - 需求背景 / 问题场景
       - 主要变更点（后端 / 前端 / DB / 配置）
       - 覆盖的测试（Pytest / Playwright）

6. **合并与清理**
   - 在 CI 通过、代码评审完成后合并 PR。
   - 合并后删除远程功能分支：

     ```cmd
     git branch -d feature/<short-feature-name>
     git push origin --delete feature/<short-feature-name>
     ```

## 三、新版本发布策略（与功能开发配套）

> 当多个功能合入 `main` 且需要发布新版本时，遵循 `CONTRIBUTING.md` 中的语义化版本与发布流程。

1. **确定版本号**：`MAJOR.MINOR.PATCH`
2. **创建发布分支并更新发布文件**：
   - 从最新 `main` 创建 `<release-type>/<version>`，其中 `<release-type>` 是常规发布的 `release` 或紧急修复的 `hotfix`。
   - `VERSION`：写入新的版本号，例如 `1.2.0`；
   - `CHANGELOG.md`：新增版本条目，列出本次发布的新增 / 修复项。
   - 创建 `docs/releases/RELEASE_NOTES_v<version>.md`。
3. **提交并创建 Release PR**：

   ```bash
   git checkout main
   git pull origin main
   git checkout -b <release-type>/<version>
   git add VERSION CHANGELOG.md docs/releases/RELEASE_NOTES_v<version>.md
   git commit -m "chore: release vX.Y.Z"
   git push -u origin <release-type>/<version>
   gh pr create --base main --head <release-type>/<version>
   ```

   等待 `backend-tests`、`frontend-build`、`release-pr-guard`、至少一名非提交者人工 approval 和所有 Review conversation 解决后，合并 Release PR。

4. **合并后在最新 `main` 上打 Tag**：

   ```bash
   git checkout main
   git pull origin main
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```

5. **CI/CD 根据 Tag 构建并部署到生产环境**。

## 四、Agent 在本 Prompt 下的行为要求

1. 当用户请求“开发一个新功能 / 模块 / API / 页面”时：
   - 先确认 Issue 已由 Development_Readiness_Reviewer 设置为 `stage:ready-for-development`。
   - 只有 Developer 可以在门禁通过后，从最新 `main` 创建 `feature/*` 或 `fix/*` 分支。
   - 如果门禁尚未通过，停止开发流程并交回对应审核角色；不得提示绕过门禁创建分支。
   - 基于本文件的策略，给出**分支命名建议**和**最小实现计划**（后端/前端/测试）。

2. 当需要执行 Git 操作时：
   - **不要在后端或前端专用终端中执行 Git 命令**，统一假定在“操作终端（Terminal 3）”执行。
   - 给出命令时使用独立行、可直接复制粘贴的 `cmd` 格式。

3. 当涉及运行应用或测试时：
   - 必须引用 `invoke_app_with_different_Terminals.prompt.md`，并提醒保持三个终端职责分离。

4. 本 Prompt 仅定义**开发与分支层面的策略**，不覆盖业务规则（如血压/心率校验、Self 成员保护等）——业务规则以 `copilot-instructions.md`、`CONTRIBUTING.md` 与相关需求文档为准。