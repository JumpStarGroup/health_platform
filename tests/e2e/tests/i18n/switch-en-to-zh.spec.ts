// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `en2zh_${ts}`;
  const email = `en2zh_${ts}@demo.com`;
  const password = 'Copilot2026!';

  await page.goto('http://localhost:3000/register');
  await page.getByTestId('register-username').fill(username);
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill(password);
  await page.getByTestId('register-confirm').fill(password);
  await page.getByTestId('register-age').fill('30');
  await page.getByTestId('register-weight').fill('70');
  await page.getByTestId('register-submit').click();
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
}

test.describe('i18n - Language Switching 中英文切换', () => {
  test('TC-6.1: Switch from English to Chinese', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Navigate to /settings (default English UI)
    await page.getByRole('menuitem', { name: /Settings/ }).click();
    await expect(page).toHaveURL(/\/settings/);

    // 2. Open Language dropdown and select '中文（简体）'
    await page.locator('.ant-select').first().click();
    await page.locator('.ant-select-dropdown:visible').getByText('中文（简体）').click();

    // 3. Click 'Save' button
    await page.getByRole('button', { name: /Save/ }).click();

    // Verify: Success message '设置已保存' appears
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify: Navigation menu changes to Chinese
    await expect(page.getByRole('menuitem', { name: '仪表板' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('menuitem', { name: '健康记录' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: '成员管理' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: '个人信息' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: '系统设置' })).toBeVisible();

    // Verify: Logout button shows '退出登录'
    await expect(page.getByRole('button', { name: '退出登录' })).toBeVisible();

    // Verify: Page title changes to '系统设置'
    await expect(page.locator('h2').filter({ hasText: '系统设置' })).toBeVisible();
  });
});
