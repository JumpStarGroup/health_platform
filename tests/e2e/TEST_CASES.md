# E2E 测试用例清单

本文档列出了健康平台所有端到端（E2E）测试用例的详细说明。

## 测试配置

- **测试框架**: Playwright
- **浏览器**: Chromium (Chrome/Edge)
- **运行方式**: 
  - 默认无头模式: `npm run test`
  - 有头模式（可看到界面）: `.\run-tests.bat --headed` 或设置 `HEADLESS=false`
  - 调试模式: `.\run-tests.bat --debug`
  - UI交互模式: `.\run-tests.bat --ui`
  - 查看报告: `.\run-tests.bat --report`

## 测试用例分类

### 1. 认证与授权测试 (Authentication & Authorization)

#### 1.1 simple-login.spec.js
**测试文件**: `tests/e2e/tests/simple-login.spec.js`

| 测试用例 | 场景描述 | 验证点 |
|---------|---------|--------|
| `should be able to access login page` | 验证登录页面可访问性 | - 页面标题显示<br>- 邮箱输入框存在<br>- 密码输入框存在<br>- 登录按钮存在 |
| `should be able to access register page` | 验证注册页面可访问性 | - 页面标题显示<br>- 所有表单字段可见<br>- 提交按钮可用 |
| `should attempt login with existing user` | 尝试使用测试账号登录 | - 输入凭据<br>- 提交表单<br>- 检查跳转 |

#### 1.2 user-registration.spec.js
**测试文件**: `tests/e2e/tests/user-registration.spec.js`

| 测试用例 | 场景描述 | 验证点 |
|---------|---------|--------|
| `should register a new test user` | 完整的用户注册流程 | - 填写所有必填字段<br>- 选择性别<br>- 提交表单<br>- 验证注册成功消息或错误 |

---

### 2. 健康记录管理测试 (Health Records Management)

#### 2.1 health-records.spec.js
**测试文件**: `tests/e2e/tests/health-records.spec.js`

| 测试用例 | 场景描述 | 验证点 |
|---------|---------|--------|
| `should display health records page` | 验证健康记录页面显示 | - 页面标题<br>- 添加按钮<br>- 表格列标题（时间、血压、心率、操作） |
| `should create new health record` | 创建新的健康记录 | - 打开添加表单<br>- 填写收缩压/舒张压/心率<br>- 提交成功<br>- 记录显示在列表中 |
| `should filter by Chinese tag using exact-match OR semantics` | 使用中文标签过滤记录（OR语义） | - 创建带有"餐后"标签的记录<br>- 创建带有"运动后"标签的记录<br>- 使用标签过滤<br>- 验证两条记录都显示 |
| `should edit existing health record` | 编辑已有健康记录 | - 创建记录<br>- 点击编辑按钮<br>- 修改数值<br>- 保存<br>- 验证更新后的数值 |
| `should delete health record` | 删除健康记录 | - 创建记录<br>- 点击删除按钮<br>- 确认删除<br>- 验证记录被移除 |
| `should filter records by date range (inline)` | 按日期范围过滤记录 | - 选择日期范围<br>- 验证符合条件的记录显示 |
| `should validate form inputs` | 表单输入验证 | - 尝试提交空表单<br>- 验证错误消息<br>- 输入超范围值<br>- 验证范围错误提示 |

---

### 3. 批量导入测试 (Import Functionality)

#### 3.1 health-import.spec.js
**测试文件**: `tests/e2e/tests/health-import.spec.js`

| 测试用例 | 场景描述 | 验证点 |
|---------|---------|--------|
| `should open import modal and download template` | 打开导入对话框并验证模板下载选项 | - 导入按钮可点击<br>- 对话框显示<br>- Excel/CSV模板下载按钮存在<br>- 上传区域显示 |
| `should show field mapping UI` | 验证字段映射界面显示 | - 成员名称字段<br>- 测量时间字段<br>- 血压字段<br>- 心率字段 |
| `should handle duplicate records detection` | 重复记录检测 | - 创建记录<br>- 尝试在同一分钟创建另一条<br>- 验证友好错误提示："同时间（精确到分钟）已经存在相同记录" |
| `should show unknown members section in import preview` | 未知成员处理区域显示 | - 导入包含未知成员的文件<br>- 验证处理选项显示 |
| `should update record with different timestamp` | 更新记录时间戳（无重复） | - 创建记录<br>- 编辑记录修改时间<br>- 验证更新成功 |
| `should validate member mapping options` | 成员映射选项验证 | - 创建新成员"张三"<br>- 打开导入<br>- 验证映射UI元素存在 |

---

### 4. 成员管理测试 (Members Management)

#### 4.1 members-self-protection.spec.js
**测试文件**: `tests/e2e/tests/members-self-protection.spec.js`

| 测试用例 | 场景描述 | 验证点 |
|---------|---------|--------|
| `Self member is present and cannot be deleted` | Self成员保护机制 | - Self成员存在<br>- 删除按钮禁用状态 |

---

### 5. 管理员功能测试 (Admin Features)

#### 5.1 admin-versioning.spec.js
**测试文件**: `tests/e2e/tests/admin-versioning.spec.js`

| 测试用例 | 场景描述 | 验证点 |
|---------|---------|--------|
| *(待补充)* | 管理员版本管理功能 | - 版本信息显示<br>- 管理员权限验证 |

---

### 6. 综合集成测试 (Complete Integration Tests)

#### 6.1 complete-e2e.spec.js
**测试文件**: `tests/e2e/tests/complete-e2e.spec.js`

完整的端到端用户旅程测试，覆盖从注册到使用所有功能的完整流程。

#### 6.2 complete-final.spec.js / complete-redesigned.spec.js
**测试文件**: `tests/e2e/tests/complete-final.spec.js` 等

不同版本的综合测试，覆盖多个功能模块的交互。

---

## 测试覆盖率分析

### 已覆盖功能
✅ 用户注册和登录  
✅ 健康记录的增删改查  
✅ 中文标签过滤（OR语义）  
✅ 日期范围过滤  
✅ 表单验证  
✅ 批量导入界面  
✅ 重复记录检测  
✅ Self成员保护  

### 待增强覆盖
⚠️ 批量导入完整流程（文件上传+预览+提交）  
⚠️ 成员映射功能（映射到已有成员 vs 创建新成员）  
⚠️ 成员管理的完整CRUD  
⚠️ CSV导出功能  
⚠️ 多成员场景下的记录管理  
⚠️ 管理员功能（用户管理、角色提升/降级、密码重置）  
⚠️ 首次登录强制改密流程  
⚠️ 国际化切换（中文/英文）  
⚠️ 响应式布局（移动端）  
⚠️ 图表数据展示（Dashboard）  

---

## 如何添加新测试用例

### 方式一：基于现有模板创建
1. 复制相似的测试文件作为模板
2. 修改测试描述和断言
3. 运行 `npm run test` 验证

### 方式二：告诉我业务场景，我来实现
**格式示例**：
```
场景：用户切换语言从中文到英文
步骤：
1. 登录系统
2. 进入系统设置
3. 选择English
4. 验证界面文本变为英文
```

### 方式三：使用Playwright Codegen录制
```bash
cd tests/e2e
npx playwright codegen http://localhost:3000
```
录制操作后，生成的代码可作为测试用例基础。

---

## 测试最佳实践

1. **测试独立性**: 每个测试用例应独立运行，不依赖其他测试
2. **数据隔离**: 使用唯一的测试数据（如时间戳）避免冲突
3. **清晰的描述**: 测试名称应清楚描述测试场景
4. **合理的等待**: 使用 `waitFor` 而非固定的 `waitForTimeout`
5. **截图和视频**: 失败时自动保存，便于调试
6. **可维护性**: 提取公共函数到帮助文件

---

## 运行指南

### 本地运行
```bash
# 1. 确保前端和后端都在运行
# 2. 进入E2E测试目录
cd tests/e2e

# 3. 安装依赖（首次）
npm install
npx playwright install --with-deps

# 4. 运行测试
npm run test              # 无头模式
.\run-tests.bat --headed  # 有头模式（可看到浏览器）
.\run-tests.bat --debug   # 调试模式
.\run-tests.bat --ui      # UI模式（交互式）

# 5. 查看报告
.\run-tests.bat --report
```

### CI/CD运行
在GitHub Actions中，测试会自动在PR时运行（配置在 `.github/workflows/` 中）。

---

## 维护记录

| 日期 | 修改内容 | 修改人 |
|-----|---------|--------|
| 2026-01-12 | 初始创建测试用例清单 | Copilot |
| 2026-01-12 | 添加健康记录导入测试 | Copilot |
| 2026-01-12 | 添加重复记录检测测试 | Copilot |

---

**最后更新**: 2026年1月12日
