# E2E 测试指南 (End-to-End Testing Guide)

本目录包含使用 Playwright 编写的端到端测试。

## 快速开始

### 安装依赖

```bash
cd tests/e2e
npm install
npx playwright install --with-deps
```

### 运行测试

#### Windows
```bash
# 无头模式（默认）
npm run test

# 有头模式（可看到浏览器界面）
.\run-tests.bat --headed

# 调试模式（逐步执行）
.\run-tests.bat --debug

# UI模式（交互式）
.\run-tests.bat --ui

# 查看测试报告
.\run-tests.bat --report

# 运行特定测试文件
.\run-tests.bat --headed tests/simple-login.spec.js
```

#### Linux/Mac
```bash
# 无头模式
npm run test

# 有头模式
./run-tests.sh --headed

# 调试模式
./run-tests.sh --debug

# UI模式
./run-tests.sh --ui

# 查看报告
./run-tests.sh --report
```

### 环境变量控制

```bash
# 显示浏览器UI
set HEADLESS=false
npm run test

# 减慢执行速度（毫秒）
set SLOW_MO=500
npm run test

# 组合使用
set HEADLESS=false
set SLOW_MO=1000
npm run test
```

## Session 重用机制（性能优化）

为了提升测试执行效率（5-10倍速度提升），大部分测试共用一个普通用户账号，避免每次都重新注册登录。

### 工作原理

1. **Global Setup**：首次运行测试时，自动创建一个共享测试用户并保存认证状态
   - 用户数据：`tests/e2e/.auth/shared-user.json`
   - 认证状态：`tests/e2e/.auth/user.json`

2. **自动登录**：后续测试自动使用保存的认证状态，无需重新登录

3. **按需禁用**：特殊测试（如注册流程、管理员测试）可禁用共享认证

### 重新创建共享用户

如果数据库被清空或需要重新创建用户：

```bash
# Windows
rmdir /s /q .auth
npm run test

# Linux/Mac  
rm -rf .auth/
npm run test
```

### 测试分类

#### ✅ 使用共享认证（大部分测试）
- `health-records.spec.js` - 健康记录 CRUD
- `health-import.spec.js` - 批量导入
- `members-self-protection.spec.js` - Self 成员保护

这些测试启动速度快（~5-10倍），因为跳过了注册登录步骤。

#### ⚠️ 禁用共享认证（特殊场景）
- `regression-user-journey-cn.spec.js` - 完整用户旅程（测试注册流程）
- `admin-versioning.spec.js` - 管理员权限测试
- `user-registration.spec.js` - 用户注册测试

这些测试使用 `test.use({ storageState: undefined })` 禁用共享认证。

### 性能对比

| 测试方式 | 每个测试耗时 | 10 个测试总耗时 |
|---------|------------|--------------|
| 每次注册登录 | ~8-12 秒 | ~100 秒 |
| Session 重用 | ~1-2 秒 | ~15 秒 |
| **提升** | **5-10倍** | **6-7倍** |

### 编写新测试

#### 使用共享认证（推荐）

```javascript
import { test, expect } from '@playwright/test';
import { getSharedUser } from '../utils/session.js';
import { ensureChinese } from '../utils/auth.js';

test.describe('My Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 已通过 storageState 登录，直接导航
    await page.goto('/');
    await ensureChinese(page);
  });

  test('should do something', async ({ page }) => {
    // 测试代码...
  });
});
```

#### 需要独立用户

```javascript
import { test, expect } from '@playwright/test';
import { makeUser } from '../utils/testData.js';
import { registerAndLoginWithTestId } from '../utils/auth.js';

// 禁用共享认证
test.use({ storageState: undefined });

test('should test unique scenario', async ({ page }) => {
  const uniqueUser = makeUser();
  await registerAndLoginWithTestId(page, uniqueUser);
  // 测试代码...
});
```

## 测试配置

配置文件: `playwright.config.js`

关键配置项：
- **headless**: 是否无头模式运行（可通过 `HEADLESS=false` 覆盖）
- **slowMo**: 操作延迟毫秒数（可通过 `SLOW_MO=N` 设置）
- **baseURL**: 前端地址 `http://localhost:3000`
- **webServer**: 自动启动前端服务器（如未运行）
- **trace**: 失败时记录 trace 文件
- **screenshot**: 失败时截图

## 测试用例清单

详细的测试用例说明请查看 **[TEST_CASES.md](./TEST_CASES.md)**

### 当前覆盖模块
- ✅ 用户认证（注册、登录）
- ✅ 健康记录CRUD
- ✅ 批量导入UI
- ✅ 成员管理（Self保护）
- ✅ 标签过滤
- ✅ 重复记录检测

### 待增强模块
- ⚠️ 完整的批量导入流程（上传→预览→提交）
- ⚠️ 成员映射功能
- ⚠️ CSV导出验证
- ⚠️ 管理员功能（角色管理、密码重置）
- ⚠️ 国际化切换
- ⚠️ Dashboard图表

## 如何添加新测试

### 方法一：手写测试文件

1. 在 `tests/` 目录创建新文件（如 `my-feature.spec.js`）
2. 使用模板结构：

```javascript
const { test, expect } = require('@playwright/test');

test.describe('我的功能模块', () => {
  test.beforeEach(async ({ page }) => {
    // 前置操作：如登录
    await page.goto('/login');
    // ... 登录逻辑
  });

  test('应该能够完成XX操作', async ({ page }) => {
    // 1. 导航到页面
    await page.goto('/my-page');
    
    // 2. 执行操作
    await page.click('button:has-text("操作按钮")');
    
    // 3. 验证结果
    await expect(page.locator('.result')).toHaveText('预期结果');
  });
});
```

3. 运行测试验证：
```bash
.\run-tests.bat --headed tests/my-feature.spec.js
```

### 方法二：使用 Codegen 录制

Playwright 提供交互式录制工具：

```bash
cd tests/e2e
npx playwright codegen http://localhost:3000

## E2E 运行与执行说明

为方便在不同环境（本地 / 测试环境 / CI）运行 Playwright E2E，仓库提供了 `scripts\dev_run_e2e_regression.cmd` 辅助脚本，并通过环境变量控制运行行为。下面是常用运行方式与参数说明：

- 默认行为
  - Playwright `playwright.config.js` 使用 `use.baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000'`。
  - 配置中启用了 `webServer`（会在本地尝试运行 `npm start` 启动前端），除非设置 `E2E_DISABLE_WEBSERVER=1`。

- 推荐脚本调用（仓库根目录下运行）
  - 快速示例（预置演示测试环境快捷参数）：
    ```bat
    scripts\dev_run_e2e_regression.cmd testenv
    ```
    说明：`testenv` 模式会自动设置 `E2E_BASE_URL=https://test-env.example.com` 并禁用 webServer 自动启动（脚本内可修改默认 URL）。

  - 指定目标环境并禁用本地启动：
    ```bat
    scripts\dev_run_e2e_regression.cmd https://your-test-env.example.com disable
    ```

  - 或用环境变量方式（PowerShell / cmd）：
    ```bat
    set E2E_BASE_URL=https://your-test-env.example.com
    set E2E_DISABLE_WEBSERVER=1
    call scripts\dev_run_e2e_regression.cmd
    ```

- 关于是否需要手动先启动前端
  - 不需要：在默认（本地）场景下，Playwright 会尝试通过 `webServer` 配置自动启动前端（`npm start`）。
  - 如果你手动启动了前端服务，Playwright 会检测到并复用（`reuseExistingServer: true`），不会重复启动。
  - 在针对远端部署环境执行时，应设置 `E2E_DISABLE_WEBSERVER=1` 并提供 `E2E_BASE_URL`，以避免尝试在本机启动前端。

- 注意：硬编码 URL
  - 仓库中仍有部分测试文件包含硬编码 `http://localhost:3000` 的 `page.goto(...)` 调用，这类调用会忽略 `baseURL`。建议将这些改为相对路径（例如 `page.goto('/register')`）或改为使用配置变量以实现跨环境复用。

如需，我可以：
- 列出所有含 `http://localhost:3000` 的测试文件（供你人工决策），或
- 在你同意后，替换为相对路径并提交变更。

```

步骤：
1. 浏览器打开，同时显示录制器窗口
2. 在浏览器中执行操作
3. 录制器自动生成代码
4. 复制代码到测试文件，添加断言

### 方法三：描述场景，AI实现

直接向 Copilot 描述业务场景，格式示例：

```
场景：用户导出健康记录为CSV文件
前提：用户已登录并有至少2条健康记录
步骤：
1. 进入健康记录页面
2. 点击"导出"按钮
3. 选择CSV格式
4. 点击确认
验证：
- 下载的文件名包含日期
- CSV文件包含所有记录
- 中文字段不乱码（UTF-8 BOM）
```

AI会自动生成对应的Playwright测试代码。

## 测试最佳实践

### 1. 使用数据测试属性

推荐使用 `data-testid` 而非脆弱的CSS选择器：

```javascript
// ❌ 不好：依赖class名
await page.click('.ant-btn-primary');

// ✅ 好：使用语义化属性
await page.click('[data-testid="submit-button"]');
```

### 2. 等待策略

```javascript
// ❌ 不好：固定等待
await page.waitForTimeout(2000);

// ✅ 好：等待元素出现
await page.waitForSelector('.success-message');

// ✅ 更好：使用内置断言（自动等待）
await expect(page.locator('.success-message')).toBeVisible();
```

### 3. 数据隔离

使用唯一标识避免测试间冲突：

```javascript
const timestamp = Date.now();
const testUser = `user_${timestamp}@test.com`;
```

### 4. 页面对象模式 (Page Object Model)

对于复杂页面，提取页面对象：

```javascript
// pages/LoginPage.js
class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.locator('[data-testid="email"]');
    this.passwordInput = page.locator('[data-testid="password"]');
    this.submitButton = page.locator('button:has-text("登录")');
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

// 在测试中使用
const loginPage = new LoginPage(page);
await loginPage.login('test@example.com', 'password');
```

### 5. 清理测试数据

```javascript
test.afterEach(async ({ page }) => {
  // 清理测试数据
  await page.evaluate(() => localStorage.clear());
});
```

## 调试技巧

### 1. 使用调试模式

```bash
.\run-tests.bat --debug
```

调试器会在每个操作前暂停，可以：
- 查看当前页面状态
- 检查元素
- 手动在控制台执行命令

### 2. 添加断点

```javascript
test('我的测试', async ({ page }) => {
  await page.goto('/');
  
  // 在此处暂停
  await page.pause();
  
  await page.click('button');
});
```

### 3. 查看 Trace

测试失败时会自动生成 trace 文件：

```bash
npx playwright show-trace playwright-report/trace.zip
```

Trace 包含：
- 每个操作的截图
- 网络请求
- 控制台日志
- 完整的操作时间线

### 4. 截图和视频

```javascript
// 手动截图
await page.screenshot({ path: 'screenshot.png' });

// 视频录制（配置文件启用）
video: 'on' // 在 playwright.config.js 中
```

## CI/CD 集成

### GitHub Actions

测试会自动在PR时运行（配置在 `.github/workflows/test.yml`）：

```yaml
- name: Run E2E tests
  run: |
    cd tests/e2e
    npm install
    npx playwright install --with-deps
    npm run test
```

### 本地模拟CI环境

```bash
# 使用相同的命令
set CI=true
npm run test
```

## 常见问题

### Q: 测试运行很慢怎么办？
A: 
- 使用 `test.describe.parallel` 启用并行执行
- 减少不必要的 `waitForTimeout`
- 使用更快的浏览器引擎（Chromium）

### Q: 测试不稳定（flaky）怎么办？
A:
- 使用 Playwright 的自动等待机制
- 避免固定的 `waitForTimeout`
- 增加默认超时时间
- 检查网络请求是否完成

### Q: 如何测试移动端？
A: 在配置中添加移动设备模拟：

```javascript
use: {
  ...devices['iPhone 13'],
}
```

### Q: 如何测试不同语言？
A: 设置浏览器语言：

```javascript
use: {
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
}
```

## 参考资源

- [Playwright官方文档](https://playwright.dev/)
- [Playwright中文文档](https://playwright.bootcss.com/)
- [测试用例清单](./TEST_CASES.md)
- [项目开发指南](../../docs/DEVELOPMENT.md)

---

**维护人**: 开发团队  
**最后更新**: 2026年1月12日
