# Design: 健康管理入口重构与检查报告统一管理

## 1. Overview
- Reference: [docs/requirements/req-health-management-navigation-and-report.md](../requirements/req-health-management-navigation-and-report.md)
- GitHub Issue: #2 https://github.com/JumpStarGroup/health_platform/issues/2
- Goal:
  - 将左侧导航从单一“健康记录”入口升级为“健康管理”二级菜单。
  - 将“健康记录”“既往病史”“检查报告”拆分为三个独立页面。
  - 将检查报告建模为独立领域对象，支持后续搜索、筛选、附件和病史关联分析。
- Non-Goal:
  - 不做 AI 诊断、OCR 自动识别、复杂影像阅片器。
  - 不引入成员间复杂授权模型，继续沿用当前 household/member 权限边界。
  - 不把检查报告作为既往病史的内部字段或单一子表单。

## 2. Architecture Changes

### Backend
- 新增检查报告领域模型：`ExaminationReport`。
- 新增基础附件元数据模型：`ExaminationReportAttachment`。
- 新增报告与既往病史的关联模型：`ExaminationReportMedicalHistoryLink`。
- 新增 `ExaminationReportManager`，负责：
  - CRUD
  - 分页查询
  - 结构化筛选
  - 关键词搜索
  - 报告与病史关联维护
- 新增 `examination_report_service.py`，负责：
  - 请求解析
  - 字段校验
  - `subject_member_id` 解析与访问控制
  - 附件上传和下载入口
  - API 响应组装
- 在 `src/app.py` 注册 blueprint：`/api/v1/examination-reports`。

### Frontend
- 将当前 [frontend/src/pages/HealthRecords.js](../../frontend/src/pages/HealthRecords.js) 中混合的健康记录与既往病史拆开。
- 新增健康管理页面目录：`frontend/src/pages/HealthManagement/`。
- 建议页面组件：
  - `HealthRecordPage.js`
  - `MedicalHistoryPage.js`
  - `ExaminationReportPage.js`
- 更新 [frontend/src/components/Layout.js](../../frontend/src/components/Layout.js)：
  - 一级菜单：健康管理
  - 二级菜单：健康记录、既往病史、检查报告
  - 桌面侧边栏和移动抽屉使用同一套嵌套菜单配置
- 更新 [frontend/src/App.js](../../frontend/src/App.js)：
  - 新增 `/health-management/records`
  - 新增 `/health-management/history`
  - 新增 `/health-management/reports`
  - 保留旧 `/health-records`，重定向到 `/health-management/records`
- 更新 [frontend/src/services/api.js](../../frontend/src/services/api.js)：
  - 新增 `examinationReportAPI`
- 补齐中英文 i18n 文案。

### Navigation Diagram
```mermaid
flowchart TD
    A[Layout 左侧菜单] --> B[Dashboard]
    A --> C[健康管理]
    A --> D[成员管理]
    A --> E[个人信息]
    A --> F[系统设置]

    C --> C1[健康记录]
    C --> C2[既往病史]
    C --> C3[检查报告]

    C1 --> R1[/health-management/records]
    C2 --> R2[/health-management/history]
    C3 --> R3[/health-management/reports]
```

## 3. Data Model

### 3.1 Entity: `ExaminationReport`
- Table: `examination_reports`
- Fields:
  - `id` (int pk)
  - `user_id` (FK `users.id`, not null)
  - `member_id` (FK `members.id`, not null)
  - `report_title` (string 160, not null)
  - `report_type` (string 40, not null)
  - `examined_at` (datetime, nullable)
  - `hospital_name` (string 255, nullable)
  - `department` (string 120, nullable)
  - `conclusion` (text, nullable)
  - `abnormal_items_json` (text, nullable)
  - `has_abnormal` (bool, not null, default false)
  - `keywords_json` (text, nullable)
  - `source` (string 120, nullable)
  - `note` (text, nullable)
  - `created_at` (datetime UTC, not null)
  - `updated_at` (datetime UTC, not null)

### 3.2 Entity: `ExaminationReportAttachment`
- Table: `examination_report_attachments`
- Fields:
  - `id` (int pk)
  - `report_id` (FK `examination_reports.id`, not null)
  - `user_id` (FK `users.id`, not null)
  - `member_id` (FK `members.id`, not null)
  - `storage_key` (string 512, not null)
  - `original_filename` (string 255, not null)
  - `content_type` (string 120, not null)
  - `file_size_bytes` (int, not null)
  - `sha256` (string 128, nullable)
  - `created_at` (datetime UTC, not null)

说明：
- 本模型只定义基础附件保存能力，不定义复杂影像阅片器。
- 本地开发可先使用受保护的服务器文件目录，生产环境建议切换为对象存储或 Azure Blob Storage。
- 下载接口必须经过 JWT 与成员归属校验，不暴露静态公开路径。

### 3.3 Entity: `ExaminationReportMedicalHistoryLink`
- Table: `examination_report_medical_history_links`
- Fields:
  - `id` (int pk)
  - `report_id` (FK `examination_reports.id`, not null)
  - `medical_history_id` (FK `medical_histories.id`, not null)
  - `user_id` (FK `users.id`, not null)
  - `member_id` (FK `members.id`, not null)
  - `created_at` (datetime UTC, not null)

Rules:
- 一个检查报告可以关联多个既往病史。
- 一个既往病史可以关联多个检查报告。
- 关联双方必须属于同一 `user_id` 和同一 `member_id`。
- 通过唯一约束避免重复关联：`(report_id, medical_history_id)`。

### 3.4 Enum Strategy
- `report_type` 使用稳定英文枚举值，前端通过 i18n 展示中文：
  - `LAB_TEST`
  - `IMAGING`
  - `ULTRASOUND`
  - `ENDOSCOPY`
  - `PATHOLOGY`
  - `PHYSICAL_EXAM`
  - `OTHER`

### 3.5 Constraints And Indexes
- 必填约束：`user_id`、`member_id`、`report_title`、`report_type`。
- 长度约束建议：
  - `report_title <= 160`
  - `report_type <= 40`
  - `hospital_name <= 255`
  - `department <= 120`
  - `source <= 120`
- JSON 文本字段使用 `json.dumps(..., ensure_ascii=False)` 保存中文内容。
- 索引建议：
  - `idx_examination_reports_user_member_examined_at` on `(user_id, member_id, examined_at)`
  - `idx_examination_reports_user_type_examined_at` on `(user_id, report_type, examined_at)`
  - `idx_examination_reports_user_member_abnormal` on `(user_id, member_id, has_abnormal)`
  - `idx_examination_report_links_report` on `(report_id)`
  - `idx_examination_report_links_history` on `(medical_history_id)`

### 3.6 Migration Strategy
- 新增迁移脚本创建三张表与索引。
- 不修改 `health_records` 和 `record_subjects`。
- 不修改既有 `medical_histories` 字段，只新增关联表。
- 旧 `/health-records` 前端路径只做路由重定向，无数据迁移。

## 4. API Interface

统一前缀：`/api/v1/examination-reports`

通用规则：
- Auth: JWT Required
- 分页参数继续使用 `page + size`。
- 成员过滤参数继续使用 `subject_member_id`。
- 未传 `subject_member_id` 时，默认按当前用户 Self 成员创建；列表可返回当前用户可访问成员范围内的报告，具体行为与健康记录和既往病史保持一致。

### 4.1 POST `/api/v1/examination-reports`
- Request Body:
  ```json
  {
    "subject_member_id": 1,
    "report_title": "2026 Annual Physical Exam",
    "report_type": "PHYSICAL_EXAM",
    "examined_at": "2026-06-01T09:30:00Z",
    "hospital_name": "City Hospital",
    "department": "General Medicine",
    "conclusion": "Mild fatty liver. Blood pressure requires follow-up.",
    "abnormal_items": ["ALT high", "Fatty liver"],
    "has_abnormal": true,
    "keywords": ["liver", "blood pressure"],
    "source": "Hospital portal",
    "note": "Review in 3 months.",
    "linked_medical_history_ids": [12, 15]
  }
  ```
- Validation:
  - `subject_member_id` 如传入，必须属于当前用户 household 且状态为 active。
  - `report_title` 必填，长度 1..160。
  - `report_type` 必填，必须是预设枚举之一。
  - `examined_at` 如传入，必须是 ISO8601 时间或可解析日期时间。
  - `abnormal_items` 和 `keywords` 如传入，必须是字符串数组。
  - `linked_medical_history_ids` 如传入，所有病史必须属于同一用户与同一成员。
- Response 201: 返回完整检查报告对象。

### 4.2 GET `/api/v1/examination-reports`
- Query Params:
  - `page`
  - `size`
  - `subject_member_id` optional
  - `date_from` optional
  - `date_to` optional
  - `report_type` optional
  - `hospital_name` optional
  - `department` optional
  - `has_abnormal` optional
  - `keyword` optional
  - `medical_history_id` optional
- Behavior:
  - `keyword` MVP 阶段可用 `LIKE` 匹配 `report_title`、`hospital_name`、`department`、`conclusion`、`abnormal_items_json`、`keywords_json`、`note`。
  - 未来如数据量增长，可升级为全文索引或外部搜索服务。
- Response 200:
  ```json
  {
    "records": [...],
    "pagination": {
      "page": 1,
      "size": 10,
      "total": 25,
      "pages": 3
    }
  }
  ```

### 4.3 GET `/api/v1/examination-reports/<id>`
- 仅返回当前用户可访问范围内的报告。
- Response:
  - `200` 成功
  - `404` 报告不存在或无权限

### 4.4 PUT `/api/v1/examination-reports/<id>`
- 支持部分更新。
- 若更新 `subject_member_id`，必须重新校验成员归属，并同步校验既往病史关联是否仍属于同一成员。
- Response:
  - `200` 更新后对象
  - `400` 校验失败
  - `404` 报告不存在或无权限

### 4.5 DELETE `/api/v1/examination-reports/<id>`
- 删除报告时同步删除：
  - 报告与病史关联记录
  - 附件元数据
  - 附件实际文件或存储对象
- Response:
  - `200` 删除成功
  - `404` 报告不存在或无权限

### 4.6 PUT `/api/v1/examination-reports/<id>/medical-histories`
- Request Body:
  ```json
  {
    "medical_history_ids": [12, 15]
  }
  ```
- Behavior:
  - 用传入集合替换当前报告的病史关联集合。
  - 所有病史必须属于同一用户与同一成员。

### 4.7 POST `/api/v1/examination-reports/<id>/attachments`
- Content-Type: `multipart/form-data`
- Form Field:
  - `file`
- Validation:
  - 报告必须属于当前用户可访问范围。
  - 文件大小应有上限，建议默认 10MB。
  - 允许类型建议：PDF、JPEG、PNG。
- Response 201: 返回附件元数据。

### 4.8 GET `/api/v1/examination-reports/<id>/attachments/<attachment_id>/download`
- Behavior:
  - 校验报告与附件均属于当前用户可访问范围。
  - 使用 `Content-Disposition` 返回原始文件名。

### 4.9 DELETE `/api/v1/examination-reports/<id>/attachments/<attachment_id>`
- 删除附件元数据和实际文件。

## 5. Backend Component Design

### 5.1 Model Layer
- File: [src/models.py](../../src/models.py)
- 新增：
  - `ExaminationReport`
  - `ExaminationReportAttachment`
  - `ExaminationReportMedicalHistoryLink`

### 5.2 Manager Layer
- New File: `src/manager/examination_report_manager.py`
- 主要方法：
  - `create(...)`
  - `list(user_id, page, size, filters)`
  - `get(user_id, report_id)`
  - `update(report, **fields)`
  - `delete(report)`
  - `replace_medical_history_links(report, medical_history_ids)`
  - `add_attachment(report, file_metadata)`
  - `delete_attachment(report, attachment_id)`

设计约束：
- 所有查询必须以 `user_id` 作为第一层隔离条件。
- 成员过滤必须使用 `member_id`，不能只按 `medical_history_id` 或附件 ID 反查。
- 病史关联校验必须保证 `MedicalHistory.user_id == report.user_id` 且 `MedicalHistory.member_id == report.member_id`。

### 5.3 Service Layer
- New File: `src/service/examination_report_service.py`
- 职责：
  - 参数校验
  - 日期、布尔、枚举、数组字段解析
  - 通过 `MemberManager.get_member(user_id, member_id)` 校验记录对象是否可访问
  - 通过 `MedicalHistoryManager.get(...)` 校验关联病史可访问性
  - 附件文件类型和大小校验
  - 返回统一错误格式

### 5.4 Shared Access Pattern
- 当前 [src/service/health_service.py](../../src/service/health_service.py) 与 [src/service/medical_history_service.py](../../src/service/medical_history_service.py) 已分别处理 `subject_member_id`。
- 建议在新增报告服务时抽出共享帮助方法：`src/service/subject_member.py`。
- 建议方法：
  - `resolve_subject_member(user_id, subject_member_id, default_to_self=True)`
  - `validate_active_member(user_id, member_id)`

这样可以避免健康记录、既往病史、检查报告三处访问规则分叉。

### 5.5 Attachment Storage
- MVP 可在实例目录下保存私有文件，例如 `instance/uploads/examination_reports/`。
- `storage_key` 不应等于用户上传文件名，应使用 UUID 或哈希路径。
- 下载必须走受保护 API，不通过静态目录直接暴露。
- 后续迁移到 Azure Blob Storage 时，模型可保持不变，只替换 storage adapter。

## 6. Frontend Component Design

### 6.1 Routing
- File: [frontend/src/App.js](../../frontend/src/App.js)
- 路由建议：
  - `/health-management` 重定向到 `/health-management/records`
  - `/health-management/records` 渲染健康记录页面
  - `/health-management/history` 渲染既往病史页面
  - `/health-management/reports` 渲染检查报告页面
  - `/health-records` 重定向到 `/health-management/records`

### 6.2 Layout Menu
- File: [frontend/src/components/Layout.js](../../frontend/src/components/Layout.js)
- `menuItems` 改为支持 children：
  - key: `/health-management`
  - label: `t('nav.healthManagement')`
  - children:
    - `/health-management/records`
    - `/health-management/history`
    - `/health-management/reports`
- `selectedKeys` 应使用当前 pathname。
- `openKeys` 默认包含 `/health-management`，当 pathname 以 `/health-management` 开头时自动展开。
- Header 标题当前只查顶层 `menuItems.find(...)`，需要改为支持查找嵌套 children 的 label。

### 6.3 Page Split
- Current File: [frontend/src/pages/HealthRecords.js](../../frontend/src/pages/HealthRecords.js)
- 当前页面同时包含健康记录状态和既往病史状态，新增报告后会变成三类状态混合。
- 建议拆分：
  - `frontend/src/pages/HealthManagement/HealthRecordPage.js`
  - `frontend/src/pages/HealthManagement/MedicalHistoryPage.js`
  - `frontend/src/pages/HealthManagement/ExaminationReportPage.js`
- 可将共用筛选、表格、弹窗逻辑进一步拆成组件，但第一版不强制抽象过度。

### 6.4 Examination Report Page
- 页面能力：
  - 报告列表
  - 新增报告
  - 编辑报告
  - 删除报告
  - 关键词搜索
  - 时间范围筛选
  - 报告类型筛选
  - 医院/科室筛选
  - 异常标记筛选
  - 关联既往病史选择
  - 附件上传、下载、删除
- 表单字段：
  - `report_title`
  - `report_type`
  - `examined_at`
  - `hospital_name`
  - `department`
  - `conclusion`
  - `abnormal_items`
  - `has_abnormal`
  - `keywords`
  - `source`
  - `note`
  - `linked_medical_history_ids`

### 6.5 Frontend API
- File: [frontend/src/services/api.js](../../frontend/src/services/api.js)
- 新增：
  - `examinationReportAPI.create(data)`
  - `examinationReportAPI.list(params)`
  - `examinationReportAPI.get(id)`
  - `examinationReportAPI.update(id, data)`
  - `examinationReportAPI.remove(id)`
  - `examinationReportAPI.updateMedicalHistoryLinks(id, medicalHistoryIds)`
  - `examinationReportAPI.uploadAttachment(id, file)`
  - `examinationReportAPI.downloadAttachment(id, attachmentId)`
  - `examinationReportAPI.removeAttachment(id, attachmentId)`

### 6.6 i18n Keys
- Files:
  - [frontend/src/i18n/locales/zh/translation.json](../../frontend/src/i18n/locales/zh/translation.json)
  - [frontend/src/i18n/locales/en/translation.json](../../frontend/src/i18n/locales/en/translation.json)
- 新增 key 建议：
  - `nav.healthManagement`
  - `nav.healthManagement.records`
  - `nav.healthManagement.history`
  - `nav.healthManagement.reports`
  - `examinationReport.title`
  - `examinationReport.add`
  - `examinationReport.filters.*`
  - `examinationReport.columns.*`
  - `examinationReport.form.*`
  - `examinationReport.messages.*`
  - `examinationReport.type.*`

## 7. Search And Analysis Strategy

### MVP Search
- 使用结构化字段筛选：成员、时间、报告类型、医院、科室、异常标记。
- 使用 `keyword` 对标题、结论、异常项、关键词、备注做模糊匹配。
- 列表默认按 `examined_at desc, created_at desc` 排序。

### Future Analysis
- 基于 `report_type` 统计报告数量和异常比例。
- 基于 `has_abnormal` 和 `abnormal_items_json` 展示异常报告趋势。
- 基于 `medical_history_id` 查看某个病史关联的报告时间线。
- 如后续需要提取指标值，可新增 `ExaminationReportMetric` 表，不建议把指标硬塞入报告主表。

## 8. Security And Privacy
- 所有报告、附件、关联记录必须受 JWT 保护。
- 所有查询必须带 `user_id` 隔离。
- 附件下载不得使用公开静态 URL。
- 文件上传需限制大小和 MIME 类型。
- 删除报告时应清理附件，避免孤立隐私文件。
- 错误响应不能泄露其他用户或成员是否存在。

## 9. Compatibility And Migration
- 保留 `/health-records` 重定向，避免旧入口失效。
- 现有健康记录 API 不改动。
- 现有既往病史 API 不改动。
- 既往病史页面从混合页面拆出后，前端 API 调用保持 `medicalHistoryAPI` 不变。
- E2E 中如有中文菜单断言，需要从 `健康记录` 更新为 `健康管理` 或检查二级菜单。

## 10. High-Level Task Blocks
- [ ] Database Migration
- [ ] Backend Model And Manager
- [ ] Backend Service And API
- [ ] Attachment Storage Adapter
- [ ] Frontend Nested Navigation And Routes
- [ ] Split Health Record And Medical History Pages
- [ ] Examination Report Page
- [ ] i18n Updates
- [ ] Pytest Coverage
- [ ] Playwright E2E Coverage

## 11. Testing Plan
- Pytest:
  - 创建检查报告成功。
  - 按成员、时间、类型、异常标记、关键词筛选。
  - 无权限成员不可访问。
  - 报告与病史关联必须同用户、同成员。
  - 附件上传、下载、删除权限校验。
- Frontend unit or integration checks:
  - 嵌套菜单选中态和展开态。
  - 旧 `/health-records` 路由重定向。
  - 检查报告表单校验。
- Playwright:
  - 登录后左侧显示“健康管理”一级菜单。
  - 展开后可进入三类二级页面。
  - 可为当前成员新增检查报告并在列表中检索。
