# Design: 家庭成员既往病史管理增强版

## 1. Overview
- Reference: [docs/requirements/req-family-member-medical-history.md](../requirements/req-family-member-medical-history.md)
- GitHub Issue: #20
- Goal:
  - 在现有家庭成员模型基础上新增“既往病史”能力。
  - 让当前登录用户可以为自己和有权限访问的家庭成员维护病史。
  - 统一病史与健康记录的“记录对象选择”交互与权限边界。
- Non-Goal:
  - 不做 AI 诊断、用药提醒、附件上传、ICD 编码。
  - 不引入成员间复杂授权模型；继续沿用当前“用户拥有 household，成员归属 household”的权限边界。

## 2. Architecture Changes

### Backend
- 新增病史领域模型 `MedicalHistory`，直接归属于：
  - `user_id`：租户隔离与快速过滤
  - `member_id`：记录对象
- 新增 `MedicalHistoryManager`，负责：
  - CRUD
  - 基础分页
  - 记录对象权限校验后的数据访问
- 新增 `medical_history_service.py`，负责：
  - 请求解析
  - 字段校验
  - `subject_member_id` 解析与访问控制
  - API 响应组装
- 在 `src/app.py` 注册病史 blueprint。

### Frontend
- 继续复用当前全局成员上下文 `MemberContext` 作为“当前记录对象”的单一来源。
- 在 [frontend/src/pages/HealthRecords.js](../../frontend/src/pages/HealthRecords.js) 中扩展病史管理区块，建议采用以下之一：
  - 同页双卡片布局：健康记录 + 既往病史
  - 同页 Tab 布局：Health Records / Medical History
- 新增 `medicalHistoryAPI`，接口风格与现有 `healthAPI` 保持一致。
- 新增病史表单、列表、编辑弹窗和删除确认交互。
- 补齐中英文 i18n 文案。

### Why Direct `member_id` Instead Of `RecordSubject`
- `RecordSubject` 的存在主要是为当前健康记录兼容 legacy “未映射记录视为 Self” 语义。
- 病史模块是新建能力，没有历史包袱，不需要再引入一层中间表。
- 对病史而言，一条记录只会归属于一个成员；直接持有 `member_id` 更简单，查询更稳定。
- 保留 `user_id + member_id` 双字段可以同时满足：
  - 账号级数据隔离
  - 成员级过滤
  - 后续索引优化

## 3. Data Model

### 3.1 Entity: `MedicalHistory`
- Table: `medical_histories`
- Fields:
  - `id` (int pk)
  - `user_id` (FK `users.id`, not null)
  - `member_id` (FK `members.id`, not null)
  - `onset_date` (date, nullable)
  - `disease_name` (string 120, not null)
  - `disease_status` (string 32, not null)
  - `is_present` (bool, not null)
  - `is_taking_medication` (bool, not null)
  - `condition_note` (text, nullable)
  - `note` (text, nullable)
  - `medication_name` (string 255, nullable)
  - `medication_dosage` (string 120, nullable)
  - `medication_frequency` (string 120, nullable)
  - `diagnosed_hospital` (string 255, nullable)
  - `doctor_name` (string 120, nullable)
  - `information_source` (string 120, nullable)
  - `created_at` (datetime UTC, not null)
  - `updated_at` (datetime UTC, not null)

### 3.2 Enum Strategy
- API 和 DB 中使用稳定英文枚举值，前端通过 i18n 展示中文：
  - `RECOVERED`
  - `STABLE`
  - `ONGOING`
  - `RECURRENT`
  - `PENDING_DIAGNOSIS`

原因：
- 避免把展示语言写入数据库
- 为未来报表、筛选和 API 扩展提供稳定语义值

### 3.3 Constraints And Indexes
- 必填约束：`user_id`、`member_id`、`disease_name`、`disease_status`、`is_present`、`is_taking_medication`
- 长度约束建议：
  - `disease_name <= 120`
  - `medication_name <= 255`
  - `medication_dosage <= 120`
  - `medication_frequency <= 120`
  - `diagnosed_hospital <= 255`
  - `doctor_name <= 120`
  - `information_source <= 120`
- 索引建议：
  - `idx_medical_histories_user_member_created_at` on `(user_id, member_id, created_at)`
  - `idx_medical_histories_user_member_status` on `(user_id, member_id, disease_status)`

### 3.4 Migration Strategy
- 新增迁移脚本创建 `medical_histories` 表与索引。
- 无历史数据迁移需求。
- 不修改现有 `health_records`、`record_subjects` 结构。

## 4. API Interface

统一前缀建议：`/api/v1/medical-history`

说明：
- 继续沿用历史 Issue #9 的前缀命名，避免未来若合并旧草案时发生 API 命名漂移。
- 列表分页继续使用项目统一规则 `page + size`。
- 成员过滤参数与健康记录保持一致，统一使用 `subject_member_id`。

### 4.1 POST `/api/v1/medical-history`
- Auth: JWT Required
- Request Body:
  ```json
  {
    "subject_member_id": 1,
    "onset_date": "2024-06-01",
    "disease_name": "Hypertension",
    "disease_status": "ONGOING",
    "is_present": true,
    "is_taking_medication": true,
    "condition_note": "Blood pressure is stable after treatment.",
    "note": "Regular follow-up every 3 months.",
    "medication_name": "Amlodipine",
    "medication_dosage": "5mg",
    "medication_frequency": "Once daily",
    "diagnosed_hospital": "City Hospital",
    "doctor_name": "Dr. Wang",
    "information_source": "Patient self-report"
  }
  ```
- Validation:
  - `subject_member_id` 必填，且必须属于当前用户 household
  - `disease_name` 必填，长度 1..120
  - `disease_status` 必填，必须是预设枚举之一
  - `onset_date` 如传入，格式必须为 `YYYY-MM-DD`
  - `is_present`、`is_taking_medication` 必须为布尔值
- Response 201:
  - 返回完整病史对象

### 4.2 GET `/api/v1/medical-history`
- Auth: JWT Required
- Query Params:
  - `page`
  - `size`
  - `subject_member_id` (optional)
  - `disease_status` (optional)
  - `is_present` (optional)
  - `is_taking_medication` (optional)
- Behavior:
  - 未传 `subject_member_id` 时，返回当前用户全部可访问成员病史
  - 传入 `subject_member_id` 时，仅返回该成员病史
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

### 4.3 GET `/api/v1/medical-history/<id>`
- Auth: JWT Required
- Behavior:
  - 仅返回当前用户可访问范围内的病史
- Response:
  - `200` 成功
  - `404` 病史不存在或无权限

### 4.4 PUT `/api/v1/medical-history/<id>`
- Auth: JWT Required
- Behavior:
  - 支持部分更新
  - 若变更 `subject_member_id`，需再次验证成员归属
- Response:
  - `200` 更新后对象
  - `400` 校验失败
  - `404` 病史不存在或无权限

### 4.5 DELETE `/api/v1/medical-history/<id>`
- Auth: JWT Required
- Behavior:
  - 物理删除即可；当前模块无审计/回收站要求
- Response:
  - `200` 删除成功
  - `404` 病史不存在或无权限

## 5. Backend Component Design

### 5.1 Model Layer
- File: [src/models.py](../../src/models.py)
- 新增 `MedicalHistory` 模型。

### 5.2 Manager Layer
- New File: `src/manager/medical_history_manager.py`
- 主要方法：
  - `create(...)`
  - `list(user_id, page, size, subject_member_id=None, disease_status=None, is_present=None, is_taking_medication=None)`
  - `get(user_id, history_id)`
  - `update(history, **fields)`
  - `delete(history)`

设计约束：
- 所有查询必须以 `user_id` 为第一层隔离条件。
- `member_id` 作为记录对象过滤条件，不允许只按 `member_id` 查询。

### 5.3 Service Layer
- New File: `src/service/medical_history_service.py`
- 职责：
  - 参数校验
  - 布尔值、日期、枚举解析
  - 通过 `MemberManager.get_member(user_id, member_id)` 校验记录对象是否可访问
  - 返回统一错误格式

### 5.4 Shared Access Pattern
- 健康记录和病史模块应共享同一条访问规则：
  - 记录对象始终来自“当前选中的成员”
  - 服务层负责校验该成员是否属于当前用户 household
- 建议在服务层引入一个轻量帮助方法，避免两处模块以后分叉：
  - 例如 `_resolve_subject_member(user_id, subject_member_id)`

## 6. Frontend Component Design

### 6.1 Page Integration
- Primary File: [frontend/src/pages/HealthRecords.js](../../frontend/src/pages/HealthRecords.js)
- 继续复用当前页面和成员上下文，不单独新建一级菜单。
- 原因：
  - 用户心智上，病史与健康记录都属于健康档案
  - 当前页面已具备 `selectedMemberId` 逻辑
  - 可以最小成本实现“记录对象切换后，两块内容同时更新”

### 6.2 UI Structure
- 推荐结构：
  - 页面顶部：沿用现有成员选择器
  - 中间：`Health Records` 卡片/Tab
  - 下方或相邻：`Medical History` 卡片/Tab
- 病史区块应包含：
  - 列表表格
  - 新增按钮
  - 编辑弹窗
  - 删除确认

### 6.3 Frontend API
- File: [frontend/src/services/api.js](../../frontend/src/services/api.js)
- 新增 `medicalHistoryAPI`：
  - `create(data)`
  - `list(params)`
  - `get(id)`
  - `update(id, data)`
  - `remove(id)`

### 6.4 Form Model
- 表单字段：
  - `subject_member_id` 不需要单独在病史弹窗内再次选择；默认使用当前全局成员选择
  - `onset_date`
  - `disease_name`
  - `disease_status`
  - `is_present`
  - `is_taking_medication`
  - `condition_note`
  - `note`
  - `medication_name`
  - `medication_dosage`
  - `medication_frequency`
  - `diagnosed_hospital`
  - `doctor_name`
  - `information_source`

关键交互：
- 若当前没有选中成员，则默认沿用现有健康记录语义，将 Self 作为默认对象。
- 顶部应显式展示当前操作对象，避免用户误以为自己正在编辑别的成员。

### 6.5 i18n
- Files:
  - `frontend/src/i18n/locales/zh/translation.json`
  - `frontend/src/i18n/locales/en/translation.json`
- 新增命名空间建议：`medicalHistory.*`

## 7. Validation And Error Semantics

### 7.1 Validation Rules
- `disease_name`: required, 1..120
- `disease_status`: required, enum
- `onset_date`: optional, valid date string `YYYY-MM-DD`
- `is_present`: required boolean
- `is_taking_medication`: required boolean
- optional text fields: respect max length when applicable

### 7.2 Error Semantics
- `400 Validation error`
  - 字段格式错误
  - 枚举值非法
  - 必填字段缺失
- `404 Member not found`
  - `subject_member_id` 不存在或不属于当前用户
- `404 Medical history not found`
  - 记录不存在或不属于当前用户

## 8. Security And Access Control
- 权限边界不新增新角色，继续使用当前 household 归属模式。
- 核心规则：
  - `Member` 必须属于当前用户 household
  - `MedicalHistory.user_id` 必须等于当前 JWT user id
- 即使攻击者伪造了其他 `member_id`，服务层也必须通过 `MemberManager.get_member(...)` 阻断。
- 列表、详情、更新、删除都不能仅通过主键命中，必须附带当前用户隔离条件。

## 9. Testing Strategy

### Backend Tests
- New File: `tests/test_medical_history.py`
- 覆盖：
  - 为 Self 创建病史
  - 为家庭成员创建病史
  - 非法成员访问返回 404
  - 必填/枚举/日期/布尔校验
  - 列表分页 `page + size`
  - 更新记录对象与内容
  - 删除病史

### Frontend Tests
- 如项目当前前端单测覆盖有限，可先保证以下高风险交互：
  - 切换成员后病史列表刷新
  - 新增病史提交带上当前成员
  - 编辑与删除操作回填正确

### E2E
- 在现有用户旅程中增加轻量回归：
  - 登录
  - 新增家庭成员
  - 切换成员
  - 新增病史
  - 验证列表展示

## 10. Risks And Mitigations
- 风险：病史与健康记录使用不同的成员参数命名，导致前后端漂移
  - 规避：统一使用 `subject_member_id`
- 风险：用户混淆“疾病状态”和“是否仍存在”
  - 规避：表单文案和布局分组展示；后端保留三个独立字段
- 风险：Self 成员在成员页不可编辑，但病史中可被选择，用户理解不一致
  - 规避：在 UI 明确提示 Self 是默认本人档案对象

## 11. High-Level Task Blocks
- [ ] Database Migration
  - 新增 `MedicalHistory` 模型与迁移
- [ ] Backend Service Logic
  - 实现 manager/service/routes
  - 在 `src/app.py` 注册 blueprint
- [ ] Frontend Integration
  - 新增 `medicalHistoryAPI`
  - 在健康档案页接入病史区块
  - 补充 i18n
- [ ] Testing
  - Pytest 覆盖 CRUD/校验/隔离/分页
  - 补一条面向成员切换的前端或 E2E 回归