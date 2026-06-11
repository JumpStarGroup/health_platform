// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `clr_flt_${ts}`;
  const email = `clr_flt_${ts}@demo.com`;
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

async function addRecord(page: import('@playwright/test').Page, systolic: string, diastolic: string) {
  await page.getByRole('button', { name: /Add Record|添加记录/ }).click();
  const modal = page.locator('.ant-modal');
  await expect(modal).toBeVisible({ timeout: 5000 });
  await page.getByTestId('systolic-pressure').locator('input').fill(systolic);
  await page.getByTestId('diastolic-pressure').locator('input').fill(diastolic);
  await modal.getByRole('button', { name: /Save|保\s*存/ }).click();
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
  await expect(modal).not.toBeVisible({ timeout: 5000 });
}

test.describe('Health Records CRUD - 健康记录增删改查', () => {
  test('TC-3.9: Clear filters', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Navigate to /health-records and create a record
    await page.getByRole('menuitem', { name: /Health Records|健康记录/ }).click();
    await expect(page).toHaveURL(/\/health-records/);
    await addRecord(page, '120', '80');

    // Verify record visible
    await expect(page.locator('table').locator('text=120/80')).toBeVisible();

    // 2. Apply a date range filter that hides the record
    const rangePicker = page.locator('.ant-picker-range').first();
    await rangePicker.click();
    const inputs = rangePicker.locator('input');
    await inputs.nth(0).fill('2020-01-01');
    await inputs.nth(0).press('Enter');
    await inputs.nth(1).fill('2020-01-31');
    await inputs.nth(1).press('Enter');
    await page.waitForTimeout(1000);

    // Verify record is now hidden
    await expect(page.locator('text=/No data|暂无数据/')).toBeVisible({ timeout: 5000 });

    // 3. Click 'Clear Filters' button
    await page.getByRole('button', { name: /Clear Filters|清除筛选/ }).click();

    // Verify: All records are shown again
    await expect(page.locator('table').locator('text=120/80')).toBeVisible({ timeout: 5000 });
  });
});
