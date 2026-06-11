# Implementation Plan: 健康记录批量导入（CSV/Excel）v1

## References
- Requirement: [docs/requirements/req-health-record-import-v1.md](../requirements/req-health-record-import-v1.md)
- Design: [docs/design/design-health-record-import-v1.md](../design/design-health-record-import-v1.md)

## Phase 0: Repo Reality Check（对齐现状）
- [ ] **Task 0.1**: 盘点现有批量导入实现是否已落地（代码/依赖/测试）。
  - 验证点：
    - `src/service/` 是否已有 import/batch-import 路由
    - `src/manager/` 是否已有 bulk/batch 逻辑
    - `requirements.txt` 是否已有 `openpyxl`（及是否真的需要 `pandas`）
    - `tests/` 是否已有导入相关测试
  - 输出：结论记录到本计划“Notes”段落（若已有能力则以“改造/补齐”为主，避免重复造轮子）。

## Phase 1: Backend Schema（导入会话 + 审计）
- [ ] **Task 1.1**: 在 [src/models.py](../../src/models.py) 新增模型
  - `HealthImportSession`：保存 session 元数据、映射、归一化行、预览结果（最多 500 行）；含 `expires_at` TTL
  - `HealthImportAudit`：保存审计信息（user/time/file name/hash/统计）
  - 约束：时间字段使用 `datetime.now(UTC)`；JSON 字段使用 `Text` 存 JSON 字符串（保持与 tags 类似策略）。

- [ ] **Task 1.2**: 创建迁移脚本（Flask-Migrate）
  - 位置：`migrations/versions/*.py`
  - 表：`health_import_sessions`、`health_import_audits`
  - 索引建议：`health_import_sessions.user_id`、`health_import_sessions.expires_at`、`health_import_audits.user_id`、`health_import_audits.created_at`

- [ ] **Task 1.3**: 清理策略（v1 最小实现）
  - 添加简单的“过期 session 不可 commit”校验。
  - 可选：提供管理命令/定时清理（不强制；仅写 TODO）。

## Phase 2: Backend Manager（解析、校验、去重、批量写入）
- [ ] **Task 2.1**: 新增 Manager：`HealthImportManager`
  - 文件：`src/manager/health_import_manager.py`
  - 职责：解析文件→字段映射→归一化→逐行校验→成员解析→重复识别→生成 preview 结果→commit 批量写入
  - 注意：Service 层不得直接查 DB；所有 DB 操作在 Manager。

- [ ] **Task 2.2**: 文件解析与字段映射
  - CSV：支持 UTF-8 BOM
  - Excel：`.xlsx`（首个 worksheet，首行为表头）
  - 映射规则：
    - 后端支持“自动预填”：识别常见中/英文表头到平台字段
    - 前端可提交 mapping（源列名 → 平台字段）以覆盖自动识别
  - 行限制：最多 500 行（超过直接拒绝并返回错误信息）
  - 大小限制：5MB（Service 层先挡）

- [ ] **Task 2.3**: 归一化与校验
  - 时间：无时区按北京时间（UTC+8）解释；转换为 UTC naive
  - 精度：归一化到分钟（复用或对齐 `HealthManager._normalize_to_minute`）
  - 血压/心率校验：30–250；收缩压>舒张压；心率可选 30–150
  - tags：支持分号/逗号分隔为 list
  - note：长度限制 500

- [ ] **Task 2.4**: 成员解析与“待新建成员”收集
  - Self alias：`Self/self/SELF/自己/本人` → Self 成员（注意现有 Self 保护规则）
  - 文件多成员：按行解析 member_name
  - unknown member：仅在 preview 阶段收集去重列表，commit 阶段仅对用户批准的名单创建

- [ ] **Task 2.5**: 去重跳过策略
  - 规则：同一成员 + 同一分钟
  - 行级状态：`valid` / `error` / `unknown_member` / `skipped_duplicate`
  - 预览与提交都必须做重复识别（避免 preview→commit 间并发新增导致误插入）

- [ ] **Task 2.6**: 批量写入
  - 写入：`HealthRecord` + `RecordSubject`
  - 事务：单次 commit 单事务（部分成功：只写 valid 且非 duplicate 的行）
  - 审计：commit 后写 `HealthImportAudit`

## Phase 3: Backend Service（Preview/Commit/Template/Report API）
- [ ] **Task 3.1**: API: `POST /api/v1/health/import/preview`
  - 文件：建议新增 `src/service/health_import_service.py` 并在 [src/app.py](../../src/app.py) 注册（或复用现有 `health_bp`，但保持代码清晰）
  - 输入：multipart 文件 + optional mapping
  - 输出：session_id、columns、mapping、missing_required_fields、unknown_members、rows（含行状态与错误信息）

- [ ] **Task 3.2**: API: `POST /api/v1/health/import/commit`
  - 输入：session_id + approved_new_members
  - 行为：校验 session 归属/过期/状态；创建批准的成员；再次去重；批量写入；写审计
  - 输出：summary（total/success/error/skipped）+ report payload（errors/skipped）

- [ ] **Task 3.3**: API: `GET /api/v1/health/import/template?format=csv|excel`
  - 输出：标准模板下载
  - CSV：UTF-8 BOM；Header 使用 RFC5987 `filename*`

- [ ] **Task 3.4**: API: `POST /api/v1/health/import/report`
  - 输入：errors/skipped JSON
  - 输出：CSV 报告下载（UTF-8 BOM + filename*）

- [ ] **Task 3.5**: 错误码与消息规范
  - 400：文件/参数/映射不完整
  - 401：未登录
  - 413：文件过大（或 400 + 明确 message）
  - 404：session 不存在/不属于当前用户

## Phase 4: Frontend UI（上传→映射+预览→确认导入→下载报告）
- [ ] **Task 4.1**: API 封装
  - 文件：`frontend/src/services/api.js`
  - 新增：`previewImport(file, mapping)`, `commitImport(sessionId, approvedMembers)`, `downloadTemplate(format)`, `downloadImportReport(payload)`

- [ ] **Task 4.2**: 新增导入弹窗组件
  - 文件：`frontend/src/components/HealthImportModal.js`
  - 使用 Ant Design：`Upload`, `Modal`, `Table`, `Select`, `Checkbox`, `Steps`（或 `Tabs`）
  - 支持：
    - 上传文件（前置校验扩展名 + 5MB）
    - 字段映射（必填字段必须映射才允许“继续/重新预览”）
    - 预览表格（行状态、错误原因、跳过原因）
    - 未知成员清单（默认不勾选；勾选后才会创建）

- [ ] **Task 4.3**: 在健康记录页接入入口
  - 文件：`frontend/src/pages/HealthRecords.js`
  - 新增“批量导入”按钮，打开 `HealthImportModal`
  - commit 成功后触发刷新列表

- [ ] **Task 4.4**: 报告下载体验
  - 对 commit 返回的 errors/skipped 提供“下载报告”按钮（调用 report API 生成 CSV）

## Phase 5: Testing（Pytest 单元测试为主）
- [ ] **Task 5.1**: 后端单测：preview
  - 新增：`tests/test_health_import.py`
  - 覆盖：
    - CSV/Excel 基本解析
    - 缺失必填映射阻塞
    - 血压/心率范围与关系校验
    - 时区：无 tz 按 UTC+8
    - unknown member 列表生成
    - 500 行限制、5MB 限制（可构造大 payload）

- [ ] **Task 5.2**: 后端单测：commit
  - 覆盖：
    - approved_new_members 才创建成员
    - 未批准成员对应行失败
    - duplicate 行跳过并计数
    - 审计表写入（统计正确）

- [ ] **Task 5.3**: 报告下载测试
  - 覆盖：CSV BOM、`Content-Disposition` filename*、内容列

- [ ] **Task 5.4 (Optional)**: Playwright E2E
  - 前提：前端导入 UI 完成后
  - 覆盖：上传模板→预览→确认→列表出现新增记录

## Phase 6: Documentation & Ops
- [ ] **Task 6.1**: 更新 API 文档索引
  - 将 import endpoints 写入 `docs/api/API_DOCUMENTATION.md`（或项目主 API 文档）

- [ ] **Task 6.2**: 更新/对齐导入文档
  - 若 `docs/batch_import/*` 与真实实现不一致：更新为当前 v1 方案（Preview/Commit/Session/Audit 等）

## Phase 7: Verification Checklist
- [ ] Run backend tests: `python -m pytest -q`
- [ ] Run focused tests: `python -m pytest tests/test_health_import.py -q`
- [ ] Manual smoke:
  - 下载模板→填 3 行（含重复、含未知成员）→预览→勾选新成员→导入→下载报告

## Notes
- 当前 repo 中 `docs/batch_import/*` 描述的“batch-import”实现与实际代码可能存在偏差；以 Phase 0 盘点结论为准，优先复用现有实现并补齐 v1 需求（预览/映射/审计/跳过统计）。
