# 开发前审核职责与 Issue Stage 转换设计

## 目标

将“负责阶段内工作”和“有权修改 stage”明确区分，并把需求评审与开发前就绪审核拆为两个独立职责。保持 Issue stage 数量不变，避免把设计、计划等文档活动扩展成额外状态。

## 状态模型

仅使用以下 stage：

| Stage | 含义 |
|---|---|
| `stage:draft` | 需求正在提出或澄清 |
| `stage:requirements-review` | 需求处于开发前准备和评审过程 |
| `stage:ready-for-development` | 已通过开发前门禁，可以开始实现 |
| `stage:in-development` | 已实际开始编码 |

复杂度独立于 stage：

- `complexity:simple`：GitHub Issue 是权威需求来源。
- `complexity:complex`：合入 `main` 的 requirement/design/plan 文档是权威详细来源，Issue 是跟踪记录和摘要。

## 角色与转换权

“拥有转换权”表示该角色负责作出转换决定。Label 可以由确定性脚本或客户端命令代为更新，不要求大模型直接执行底层 GitHub 操作。

| 转换或决定 | 决策角色 | 通过条件 |
|---|---|---|
| 创建或保持 `stage:draft` | Product_Manager | 需求尚未准备好接受正式评审 |
| `stage:draft` → `stage:requirements-review` | Product_Manager | 需求已提交正式评审 |
| 需求评审通过或退回 | Requirement_Reviewer | 需求本身清晰、完整、可验收 |
| `stage:requirements-review` → `stage:ready-for-development` | Development_Readiness_Reviewer | 开发前门禁全部通过 |
| `stage:ready-for-development` → `stage:in-development` | Developer | 已开始实现，而不是仅完成分配或排期 |

Requirement_Reviewer 不负责把复杂需求直接改为 `stage:ready-for-development`。Architect 和 Planner 负责形成设计与计划，但不修改 stage。

## 两类审核

### 需求评审

Requirement_Reviewer 只审核需求本身：

- 用户问题、业务价值和范围是否明确；
- 验收标准是否可验证；
- 依赖、风险和约束是否充分；
- 是否需要从 `complexity:simple` 调整为 `complexity:complex`。

复杂需求通过需求评审后进入设计和计划工作，但 Issue 仍保持 `stage:requirements-review`，直到开发前门禁通过。

### 开发前就绪审核

Development_Readiness_Reviewer 是进入开发的唯一门禁：

- 简单需求：确认需求评审已经通过、没有未解决的阻塞项，并审核 Issue 是否范围稳定、可测试且可以直接交给 Developer；
- 复杂需求：审核 Issue 与 requirement/design/plan 是否齐备、互相一致、无矛盾，并确认相关文档已经按仓库流程批准；
- 不通过：保持 `stage:requirements-review`，列出阻塞项和责任人；
- 通过：更新为 `stage:ready-for-development`。

该角色只审核是否可以开始开发，不替代产品需求定义、架构设计、任务规划或代码评审。

## 工作流

### 简单需求

1. Product_Manager 创建或更新 Issue，设置 complexity 和 `stage:draft`。
2. Product_Manager 提交评审，更新为 `stage:requirements-review`。
3. Requirement_Reviewer 审核需求本身。
4. Development_Readiness_Reviewer 审核开发就绪条件。
5. 审核通过后更新为 `stage:ready-for-development`。
6. Developer 从最新 `main` 创建实现分支，实际开始编码时更新为 `stage:in-development`。

### 复杂需求

1. Product_Manager 创建 Issue，设置 `complexity:complex` 和 `stage:draft`。
2. Product_Manager 提交评审，更新为 `stage:requirements-review`。
3. Requirement_Reviewer 审核需求本身。
4. Product_Manager、Architect 和 Planner 在 `docs/<issue>-<slug>` 中完成人员参与的多轮 requirement/design/plan 协作。
5. 文档经 docs-only PR 批准并合入 `main`。
6. Development_Readiness_Reviewer 对 Issue 和全部文档执行一致性审核。
7. 审核通过后更新为 `stage:ready-for-development`。
8. Developer 从最新 `main` 创建实现分支，实际开始编码时更新为 `stage:in-development`。

## 失败处理与审计

- 审核不通过不得产生成功形态的状态更新。
- 审核评论必须列出阻塞项、证据位置、责任人和下一步。
- 如果已就绪的需求发生实质变化，应退回 `stage:requirements-review` 并重新执行适用的审核。
- 自动化只能执行角色已经作出的确定性转换决定，不能绕过审核结论。

## 验收标准

- Agent 文档对 Requirement_Reviewer 和 Development_Readiness_Reviewer 的职责无重叠歧义。
- 每个 stage 转换都有且只有一个决策角色。
- 简单需求与复杂需求均必须经过 Development_Readiness_Reviewer。
- 复杂需求在 requirement/design/plan 不齐备、不一致或存在矛盾时无法进入 `stage:ready-for-development`。
- Developer 只能从 `stage:ready-for-development` 开始实现，并在实际编码开始时设置 `stage:in-development`。
