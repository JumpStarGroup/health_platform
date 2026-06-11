// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `flt_date_${ts}`;
  const email = `flt_date_${ts}@demo.com`;
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

async function addRecord(page: import('@playwright/test').Page, systolic: string, diastolic: string, hr?: string) {
  await page.getByRole('button', { name: /Add Record|添加记录/ }).click();
  const modal = page.locator('.ant-modal');
  await expect(modal).toBeVisible({ timeout: 5000 });
  await page.getByTestId('systolic-pressure').locator('input').fill(systolic);
  await page.getByTestId('diastolic-pressure').locator('input').fill(diastolic);
  if (hr) {
    await page.getByTestId('heart-rate').locator('input').fill(hr);
  }
  await modal.getByRole('button', { name: /Save|保\s*存/ }).click();
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
  await expect(modal).not.toBeVisible({ timeout: 5000 });
}

test.describe('Health Records CRUD - 健康记录增删改查', () => {
  test('TC-3.7: Filter records by date range', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Navigate to /health-records and create a record
    await page.getByRole('menuitem', { name: /Health Records|健康记录/ }).click();
    await expect(page).toHaveURL(/\/health-records/);
    await addRecord(page, '120', '80', '72');

    // Verify record is visible before filtering
    await expect(page.locator('table').locator('text=120/80')).toBeVisible();

    // 2. Click the date range picker
    const rangePicker = page.locator('.ant-picker-range').first();
    await rangePicker.click();

    // 3. Select a date range in the far past (so current records are excluded)
    // Type a past date range to filter out today's record
    const inputs = rangePicker.locator('input');
    await inputs.nth(0).fill('2020-01-01');
    await inputs.nth(0).press('Enter');
    await inputs.nth(1).fill('2020-01-31');
    await inputs.nth(1).press('Enter');

    // Wait for filter to take effect
    await page.waitForTimeout(1000);

    // Verify: No records shown for the past date range
    await expect(page.locator('text=/No data|暂无数据/')).toBeVisible({ timeout: 5000 });
  });
});
