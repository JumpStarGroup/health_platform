// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerLoginAndSwitchToChinese(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `zh_mem_${ts}`;
  const email = `zh_mem_${ts}@demo.com`;
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

  // Switch to Chinese
  await page.getByRole('menuitem', { name: /Settings|系统设置/ }).click();
  await page.locator('.ant-select').first().click();
  await page.locator('.ant-select-dropdown:visible').getByText('中文（简体）').click();
  await page.getByRole('button', { name: /Save|保\s*存/ }).click();
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
}

test.describe('i18n - Language Switching 中英文切换', () => {
  test('TC-6.6: Chinese UI - Create member', async ({ page }) => {
    await registerLoginAndSwitchToChinese(page);
    const memberName = `成员_${Date.now()}`;

    // 1. Navigate to 成员管理
    await page.getByRole('menuitem', { name: '成员管理' }).click();
    await expect(page).toHaveURL(/\/members/);

    // 2. Verify Chinese table headers
    const table = page.locator('table');
    await expect(table.locator('th').filter({ hasText: '姓名' })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: '性别' })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: '年龄' })).toBeVisible();

    // 3. Verify Self member shows Chinese hint
    await expect(page.locator('text=/自己/')).toBeVisible();

    // 4. Click '新增成员' button
    await page.getByRole('button', { name: '新增成员' }).click();

    // 5. Verify dialog opens
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 6. Fill member form
    await modal.locator('input[id*="name"], input[id*="full_name"]').first().fill(memberName);
    await modal.locator('input[id*="age"]').fill('25');

    // 7. Click 保存
    await modal.getByRole('button', { name: '保存' }).click();

    // Verify: Success message in Chinese
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify: New member appears in the table
    await expect(page.locator('table').getByText(memberName)).toBeVisible({ timeout: 5000 });
  });
});
