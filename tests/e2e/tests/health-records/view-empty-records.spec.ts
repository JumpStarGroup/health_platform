// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `empty_rec_${ts}`;
  const email = `empty_rec_${ts}@demo.com`;
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

test.describe('Health Records CRUD - 健康记录增删改查', () => {
  test('TC-3.1: View health records page (empty state)', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Navigate to /health-records page
    await page.getByRole('menuitem', { name: /Health Records|健康记录/ }).click();
    await expect(page).toHaveURL(/\/health-records/);

    // 2. Verify page title
    await expect(page.getByRole('heading', { level: 2, name: /Health Records|健康记录/ })).toBeVisible();

    // 3. Verify action buttons
    await expect(page.getByRole('button', { name: /Export CSV|导出 CSV/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Import|批量导入/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Record|添加记录/ })).toBeVisible();

    // 4. Verify filter controls
    await expect(page.getByPlaceholder(/Start date|开始日期/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Clear Filters|清除筛选/ })).toBeVisible();

    // 5. Verify table columns
    const table = page.locator('table');
    await expect(table.locator('th').filter({ hasText: /Time|时间/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /Blood Pressure|血压/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /Heart Rate|心率/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /Tags|标签/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /Notes|备注/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /Actions|操作/ })).toBeVisible();

    // Verify: Empty state message
    await expect(page.locator('text=/No data|暂无数据/')).toBeVisible();
  });
});
