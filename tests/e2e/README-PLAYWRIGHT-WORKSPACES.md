# Playwright Workspaces 使用指南

## 前提条件
- 已在 Azure Portal 创建 Playwright Workspace
- 已安装 Azure CLI 并登录（推荐方式）

## 配置步骤

### 1. 安装依赖
依赖已通过 `npm init @azure/playwright@latest` 自动安装：
- `@azure/playwright`
- `@azure/identity`
- `dotenv`

### 2. 配置环境变量
编辑 `tests/e2e/.env` 文件，填入你的 Workspace 端点：

```env
PLAYWRIGHT_SERVICE_URL=https://<region>.playwright.microsoft.com/accounts/<workspace-id>
```

**获取端点 URL**：
1. 登录 [Azure Portal](https://portal.azure.com/)
2. 进入你的 Playwright Workspace
3. 选择 "Get Started" 页面
4. 复制 "Browser endpoint" URL

### 3. 认证配置

#### 推荐：使用 Microsoft Entra ID（Azure CLI）
```cmd
az login
```

如果你属于多个租户，需要指定租户 ID：
```cmd
az login --tenant <TENANT_ID>
```

#### 备选：使用 Access Token
需要在 Azure Portal 启用 Access Token 认证，然后在 `.env` 添加：
```env
PLAYWRIGHT_SERVICE_ACCESS_TOKEN=<your-token>
```

## 运行测试

### 运行单个测试（推荐新手）
避免消耗过多免费额度：
```cmd
npx playwright test tests/regression-user-journey-cn.spec.js --config=playwright.service.config.js
```

### 运行完整测试套件
指定并发数（最多 50）：
```cmd
npx playwright test --config=playwright.service.config.js --workers=20
```

### 本地运行（不使用云端浏览器）
继续使用原配置文件：
```cmd
npx playwright test --config=playwright.config.js
```

## 文件说明

| 文件 | 说明 |
|------|------|
| `playwright.config.js` | 本地测试配置（默认） |
| `playwright.service.config.js` | Azure Playwright Workspaces 配置 |
| `.env` | 环境变量（endpoint、token等） |
| `.env.example` | 环境变量示例模板 |

## 常见问题

### Q: 必须用 TypeScript 吗？
A: 不必须。虽然官方文档示例用 `.ts`，但 `.js` 完全可以。已修复为 ESM 语法（`import` 替代 `require`），兼容 `"type": "module"`。

### Q: 测试用例需要改动吗？
A: 不需要。测试用例保持原样，只是换个配置文件运行（从本地浏览器切换到云端浏览器）。

### Q: 如何看测试报告？
A: 本地依然生成 HTML 报告：
```cmd
npx playwright show-report
```
Azure Portal 也会保存结果，可在 Workspace 里查看历史记录。

### Q: 如何优化并发数？
A: 逐步调整 `--workers` 参数（推荐从 10 开始），观察完成时间。因素包括：
- 客户端网络/CPU
- 目标应用负载能力
- 测试用例复杂度

## 参考文档
- [Playwright Workspaces 快速入门](https://learn.microsoft.com/en-us/azure/app-testing/playwright-workspaces/quickstart-run-end-to-end-tests)
- [认证管理](https://learn.microsoft.com/en-us/azure/app-testing/playwright-workspaces/how-to-manage-authentication)
