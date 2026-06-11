// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerLoginAndSwitchToChinese(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `zh_add_${ts}`;
  const email = `zh_add_${ts}@demo.com`;
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
  test('TC-6.5: Chinese UI - Add health record', async ({ page }) => {
    await registerLoginAndSwitchToChinese(page);

    // 1. Navigate to 健康记录 page
    await page.getByRole('menuitem', { name: '健康记录' }).click();
    await expect(page).toHaveURL(/\/health-records/);

    // 2. Click '添加记录' button
    await page.getByRole('button', { name: '添加记录' }).click();

    // 3. Verify dialog title '添加健康记录'
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('.ant-modal-title')).toContainText('添加健康记录');

    // 4. Fill systolic '120', diastolic '80', heart rate '72'
    await page.getByTestId('systolic-pressure').locator('input').fill('120');
    await page.getByTestId('diastolic-pressure').locator('input').fill('80');
    await page.getByTestId('heart-rate').locator('input').fill('72');

    // 5. Click '保存' button
    await modal.getByRole('button', { name: '保存' }).click();

    // Verify: Success message in Chinese
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify: Table shows Chinese headers and the record
    const table = page.locator('table');
    await expect(table.locator('th').filter({ hasText: '时间' })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: '血压' })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: '心率' })).toBeVisible();
    await expect(table.locator('text=120/80')).toBeVisible();
  });
});
