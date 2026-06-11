// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerLoginAndSwitchToChinese(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `zh_edit_${ts}`;
  const email = `zh_edit_${ts}@demo.com`;
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

async function addRecordChinese(page: import('@playwright/test').Page, systolic: string, diastolic: string) {
  await page.getByRole('button', { name: '添加记录' }).click();
  const modal = page.locator('.ant-modal');
  await expect(modal).toBeVisible({ timeout: 5000 });
  await page.getByTestId('systolic-pressure').locator('input').fill(systolic);
  await page.getByTestId('diastolic-pressure').locator('input').fill(diastolic);
  await modal.getByRole('button', { name: '保存' }).click();
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
  await expect(modal).not.toBeVisible({ timeout: 5000 });
}

test.describe('i18n - Language Switching 中英文切换', () => {
  test('TC-6.7: Chinese UI - Edit health record', async ({ page }) => {
    await registerLoginAndSwitchToChinese(page);

    // 1. Navigate to 健康记录 and create a record
    await page.getByRole('menuitem', { name: '健康记录' }).click();
    await expect(page).toHaveURL(/\/health-records/);
    await addRecordChinese(page, '120', '80');

    // Verify original record
    await expect(page.locator('table').locator('text=120/80')).toBeVisible();

    // 2. Click '编辑' button
    await page.locator('table tbody tr').first().getByRole('button', { name: '编辑' }).click();

    // 3. Verify dialog title '编辑健康记录'
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('.ant-modal-title')).toContainText('编辑健康记录');

    // 4. Modify values
    const systolicInput = page.getByTestId('systolic-pressure').locator('input');
    await systolicInput.clear();
    await systolicInput.fill('125');

    const diastolicInput = page.getByTestId('diastolic-pressure').locator('input');
    await diastolicInput.clear();
    await diastolicInput.fill('85');

    // 5. Click '更新'
    await modal.getByRole('button', { name: '更新' }).click();

    // Verify: Success message in Chinese
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify: Table shows updated values
    await expect(page.locator('table').locator('text=125/85')).toBeVisible({ timeout: 5000 });
  });
});
