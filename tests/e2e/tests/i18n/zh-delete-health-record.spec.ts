// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerLoginAndSwitchToChinese(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `zh_del_${ts}`;
  const email = `zh_del_${ts}@demo.com`;
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
  test('TC-6.8: Chinese UI - Delete health record', async ({ page }) => {
    await registerLoginAndSwitchToChinese(page);

    // 1. Navigate to 健康记录 and create a record
    await page.getByRole('menuitem', { name: '健康记录' }).click();
    await expect(page).toHaveURL(/\/health-records/);

    // Add a record
    await page.getByRole('button', { name: '添加记录' }).click();
    const addModal = page.locator('.ant-modal');
    await expect(addModal).toBeVisible({ timeout: 5000 });
    await page.getByTestId('systolic-pressure').locator('input').fill('120');
    await page.getByTestId('diastolic-pressure').locator('input').fill('80');
    await addModal.getByRole('button', { name: '保存' }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
    await expect(addModal).not.toBeVisible({ timeout: 5000 });

    // Verify record exists
    await expect(page.locator('table').locator('text=120/80')).toBeVisible();

    // 2. Click '删除' button
    await page.locator('table tbody tr').first().getByRole('button', { name: '删除' }).click();

    // 3. Confirm deletion if popconfirm appears
    const popconfirm = page.locator('.ant-popconfirm, .ant-popover');
    if (await popconfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
      await popconfirm.getByRole('button', { name: /确定|是/ }).click();
    }

    // Verify: Success message in Chinese
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify: Record removed
    await expect(page.locator('table').locator('text=120/80')).not.toBeVisible({ timeout: 5000 });
  });
});
