// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `dash_trend_${ts}`;
  const email = `dash_trend_${ts}@demo.com`;
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

test.describe('Dashboard - 仪表板', () => {
  test('TC-7.2: Dashboard health trends chart', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Navigate to /dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Verify 'Health Trends' section is visible
    await expect(page.locator('text=/Health Trends|健康趋势/')).toBeVisible({ timeout: 5000 });

    // 3. Verify time range selector is available
    const timeRangeSelector = page.locator('.ant-select, .ant-radio-group').filter({ hasText: /7|30|90|Week|Month/ }).first();
    await expect(timeRangeSelector).toBeVisible({ timeout: 5000 });

    // Click to verify it opens/works
    await timeRangeSelector.click();
    await page.waitForTimeout(500);
  });
});
