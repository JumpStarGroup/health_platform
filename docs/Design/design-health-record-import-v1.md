# Design: 健康记录批量导入（CSV/Excel）v1

## 1. Overview
- Reference: [docs/requirements/req-health-record-import-v1.md](../requirements/req-health-record-import-v1.md)
- Goal: 在现有“健康记录”模块上新增可产品化的批量导入能力，满足：
  - CSV/Excel 上传
  - 字段映射（列名对应，本次有效）
  - 预览（逐行校验、重复跳过识别、未知成员识别）
  - 确认导入（勾选确认后新建成员）
  - 结果摘要 + 错误/跳过报告下载
  - 审计追溯（谁/何时/哪个文件/统计）

## 2. Architecture Changes

### Backend
- 新增 Import 模块能力（遵循 Client → Service → Manager → Models 分层）：
  - Service：新增导入相关 API（Preview/Commit/Template/Report）
  - Manager：新增批量校验/归一化/批量写入逻辑（含去重跳过）
  - Models：新增导入会话与审计表（仅存元数据与归一化行，避免长期保存原文件）

### Frontend
- 在健康记录页面新增“批量导入”入口（建议放在导出按钮旁）：
  - 上传文件
  - 字段映射 UI（可自动预填）
  - 预览表格（行状态、错误原因、重复跳过原因）
  - 未知成员清单（勾选确认创建）
  - 导入结果摘要与报告下载

## 3. Data Model

> 说明：当前系统已有 `HealthRecord`、`Member`、`RecordSubject`。导入 v1 需要在 DB 增加“会话”和“审计”。

### 3.1 Entity: `HealthImportSession`
用途：支持“预览后确认导入”而不需要用户重复上传文件；Session 仅短期存活。

- Table: `health_import_sessions`
- Fields:
  - `id` (UUID string / CHAR(36) / TEXT) — session_id
  - `user_id` (FK users.id) — 发起导入用户
  - `original_filename` (string)
  - `file_size_bytes` (int)
  - `file_sha256` (string, optional) — 用于审计/幂等提示（不用于强幂等）
  - `created_at` (datetime UTC)
  - `expires_at` (datetime UTC) — TTL（建议 24h）
  - `mapping_json` (text) — 本次映射规则（源列名 → 平台字段）
  - `normalized_rows_json` (text) — 归一化后的行列表（最多 500 行；不含原始二进制文件）
  - `preview_errors_json` (text) — 行级错误（含行号、原因、关键字段快照）
  - `preview_skipped_json` (text) — 预览阶段识别出的重复跳过行（同成员同分钟）
  - `unknown_members_json` (text) — 预览阶段识别出的“需新建成员”候选列表
  - `status` (string) — `previewed` / `committed` / `expired`

### 3.2 Entity: `HealthImportAudit`
用途：满足“谁/何时/哪个文件/统计”的追溯，不保存文件内容。

- Table: `health_import_audits`
- Fields:
  - `id` (int pk)
  - `user_id` (FK users.id)
  - `session_id` (string, nullable) — 关联会话，便于追溯
  - `original_filename` (string)
  - `file_size_bytes` (int)
  - `file_sha256` (string, optional)
  - `total_rows` (int)
  - `success_count` (int)
  - `error_count` (int)
  - `skipped_count` (int)
  - `created_members_count` (int)
  - `created_at` (datetime UTC)

### 3.3 Migration
- 使用现有 Flask-Migrate 机制在 `migrations/versions/` 增加迁移脚本。

## 4. API Interface

统一前缀沿用：`/api/v1/health`。

### 4.1 `POST /api/v1/health/import/preview`
用途：上传文件并生成预览（含字段映射、校验、重复识别、未知成员识别），返回 `session_id`。

- Auth: JWT Required
- Content-Type: `multipart/form-data`
- Form fields:
  - `file` (required): `.csv` or `.xlsx`
  - `mapping` (optional, JSON string):
    - Example:
      ```json
      {
        "member_name": "成员名称",
        "timestamp": "测量时间",
        "systolic": "收缩压",
        "diastolic": "舒张压",
        "heart_rate": "心率",
        "tags": "标签",
        "note": "备注"
      }
      ```
- Behavior:
  - 若 `mapping` 不传：服务端根据已知中英文表头进行“自动匹配预填”；若仍缺必填映射，则返回缺失字段并提供文件列清单。
  - 时间解析：无时区 → 按北京时间（UTC+8）解释；存储/比较使用 UTC naive（与现有 DB 一致）。
  - 成员匹配：大小写不敏感、trim；`Self/自己/本人` → Self 成员。
  - 去重：同成员同分钟若系统已有记录 → 标记为 `skipped_duplicate`。
  - 行限制：最大 500 行；文件大小 ≤ 5MB。

- Response 200:
  ```json
  {
    "session_id": "uuid",
    "columns": ["成员名称", "测量时间", "收缩压", "舒张压", "心率", "标签", "备注"],
    "mapping": {"member_name": "成员名称", "timestamp": "测量时间", "systolic": "收缩压", "diastolic": "舒张压"},
    "missing_required_fields": ["systolic"],
    "preview": {
      "total_rows": 120,
      "valid_count": 100,
      "error_count": 10,
      "skipped_count": 10
    },
    "unknown_members": ["张三", "李四"],
    "rows": [
      {
        "row": 2,
        "data": {"member_name": "Self", "timestamp": "2025-12-19 08:30:00", "systolic": 120, "diastolic": 80},
        "status": "valid",
        "messages": []
      },
      {
        "row": 3,
        "data": {"member_name": "张三", "timestamp": "..."},
        "status": "unknown_member",
        "messages": ["member not found"]
      }
    ]
  }
  ```

### 4.2 `POST /api/v1/health/import/commit`
用途：用户确认导入。可携带“允许新建成员名单”。

- Auth: JWT Required
- Content-Type: `application/json`
- Request:
  ```json
  {
    "session_id": "uuid",
    "approved_new_members": ["张三", "李四"]
  }
  ```

- Behavior:
  - 校验 session 属于当前用户且未过期、未提交。
  - 创建被批准的新成员（仅创建 active 成员；遵循现有 Self 保护规则）。
  - 将 `valid` 行写入 `HealthRecord` + `RecordSubject`。
  - 对于重复（同成员同分钟）再次检测：仍然按“跳过”处理（避免预览与提交间并发写入导致的冲突）。
  - 写入完成后：生成审计记录 `HealthImportAudit`。

- Response 200:
  ```json
  {
    "success": true,
    "summary": {"total_rows": 120, "success_count": 98, "error_count": 10, "skipped_count": 12},
    "report": {
      "errors": [ ... ],
      "skipped": [ ... ]
    }
  }
  ```

### 4.3 `GET /api/v1/health/import/template?format=csv|excel`
用途：下载标准导入模板。

- Auth: JWT Required
- Response:
  - CSV：UTF-8 BOM，便于 Excel 识别中文
  - Excel：`.xlsx`
  - Header：`Content-Disposition` 建议使用 RFC5987 `filename*`（与现有 export 实现一致）

### 4.4 `POST /api/v1/health/import/report`
用途：将 `errors/skipped` JSON 生成可下载 CSV 报告（UTF-8 BOM + filename*）。

- Auth: JWT Required
- Content-Type: `application/json`
- Request:
  ```json
  {"errors": [...], "skipped": [...]}
  ```
- Response: CSV 文件下载

## 5. Core Algorithms / Manager Design

### 5.1 Parsing & Normalization
- CSV：使用 `csv` 标准库读取，处理 UTF-8 BOM。
- Excel：使用 `openpyxl`（读取首个工作表，首行为表头）。
- 将每行映射成统一结构：
  - `member_name` (string)
  - `timestamp_utc_naive` (datetime)
  - `systolic`/`diastolic` (int)
  - `heart_rate` (int | null)
  - `tags` (list[str])
  - `note` (string | null)
- 时间处理：
  - 若无时区：按北京时间（UTC+8）解释
  - 转为 UTC 后存 DB（naive UTC）
  - 归一化到分钟精度（与 `HealthManager._normalize_to_minute` 一致）

### 5.2 Member Resolution
- 预加载当前用户 household 的 active members（`MemberManager.list_members`）。
- name normalize：trim + lower 用于匹配（显示名仍保留原始/trim 版本）。
- Self alias：`self` / `自己` / `本人` → Self Member。
- unknown members：收集去重后的候选列表返回给前端。

### 5.3 Duplicate Skip
- 规则：同成员同一分钟。
- 预览与提交都需要做重复检测（提交时必须再做一次）。
- 实现建议（500 行规模）：
  - 将导入行按 `(member_id, minute_timestamp)` 生成集合
  - 一次性查询 DB 中已存在的 `(member_id, minute_timestamp)`：
    - `HealthRecord` JOIN `RecordSubject` 过滤 `member_id IN (...)` 且 `timestamp IN (...)`
  - 标记为 `skipped_duplicate`

### 5.4 Bulk Insert
- 需要同时写入：`HealthRecord` 与 `RecordSubject`。
- 建议在 Manager 中提供 `bulk_import(...)`：
  - 使用单事务（session begin）
  - 批量 `db.session.add_all(records)` + `flush()` 拿到 record_id
  - 构造 `RecordSubject` 列表 `add_all()`
  - `commit()`

## 6. Frontend Component Design

### 6.1 UI Flow (3-step)
1) 上传文件
- 文件格式/大小前置校验（扩展名 + 5MB）
- 上传后立即调用 preview（首次 mapping 为空，后端自动预填）

2) 字段映射 + 预览
- 显示后端返回的 `columns` 与 `mapping`
- 必填字段缺失时高亮，用户调整后点击“重新预览”
- 预览表格显示：行号、成员、时间、血压、心率、标签、状态（valid/error/skipped/unknown_member）

3) 确认导入 + 结果
- 未知成员区域：checkbox 列表（默认不勾选），提示“仅勾选后才会创建成员并导入相关行”
- 点击“确认导入”调用 commit
- 结果页展示摘要，提供“下载错误/跳过报告”按钮（调用 report API）

### 6.2 React Modules
- `frontend/src/pages/HealthRecords.js`：增加入口按钮与弹窗
- 新增组件建议：
  - `frontend/src/components/HealthImportModal.js`
  - `frontend/src/services/api.js`：增加 import APIs

## 7. Security & Compliance
- 所有接口 JWT 保护。
- 成员创建遵循“Self/自己”保护规则（现有 `MemberManager.create_member` 已做部分规范化，需扩展识别“本人”）。
- 审计：仅保存元数据与统计；不保存原始文件二进制。

## 8. Observability
- 在提交导入时记录结构化日志：session_id、user_id、counts、duration。
- 可在后续引入“导入历史查询 API”，但 v1 不强制。

## 9. High-Level Task Blocks
- [ ] Database Migration: add `health_import_sessions`, `health_import_audits`
- [ ] Backend Manager: parsing/normalization, member resolution, dedupe skip, bulk import
- [ ] Backend Service: preview/commit/template/report endpoints
- [ ] Frontend UI: modal + mapping + preview + confirm + report download
- [ ] Tests: pytest unit tests for preview/commit; (optional) Playwright E2E once UI done
- [ ] Docs: update API documentation index to include import endpoints
