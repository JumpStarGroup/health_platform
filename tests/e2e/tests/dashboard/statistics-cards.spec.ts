// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `dash_stat_${ts}`;
  const email = `dash_stat_${ts}@demo.com`;
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

test.describe('Dashboard - 仪表板', () => {
  test('TC-7.1: Dashboard statistics cards', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Create at least one health record
    await page.getByRole('menuitem', { name: /Health Records|健康记录/ }).click();
    await expect(page).toHaveURL(/\/health-records/);
    await addRecord(page, '120', '80', '72');

    // 2. Navigate to /dashboard
    await page.getByRole('menuitem', { name: /Dashboard|仪表板/ }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 3. Verify statistics cards are visible
    const cards = page.locator('.ant-card-body, .ant-statistic');

    // Verify: Total Records card shows non-zero count
    await expect(page.locator('text=/Total Records|总记录数/')).toBeVisible({ timeout: 5000 });

    // Verify: This Week card is visible
    await expect(page.locator('text=/This Week|本周/')).toBeVisible();

    // Verify: Average values section is visible
    await expect(page.locator('text=/Avg|平均|mmHg|bpm/')).toBeVisible();
  });
});
