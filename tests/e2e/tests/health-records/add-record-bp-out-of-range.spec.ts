// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `bp_range_${ts}`;
  const email = `bp_range_${ts}@demo.com`;
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
  test('TC-3.3: Add record - Blood pressure out of range validation', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Navigate to /health-records
    await page.getByRole('menuitem', { name: /Health Records|健康记录/ }).click();
    await expect(page).toHaveURL(/\/health-records/);

    // 2. Click 'Add Record' button
    await page.getByRole('button', { name: /Add Record|添加记录/ }).click();
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 3. Fill Systolic with '300' (exceeds max 250)
    await page.getByTestId('systolic-pressure').locator('input').fill('300');

    // 4. Fill Diastolic with '30'
    await page.getByTestId('diastolic-pressure').locator('input').fill('30');

    // 5. Click outside to trigger validation
    await page.getByTestId('diastolic-pressure').locator('input').blur();

    // Verify: Error message appears on systolic field
    await expect(modal.locator('.ant-form-item-explain-error')).toBeVisible({ timeout: 5000 });

    // Verify: Save button is disabled
    const saveBtn = modal.getByRole('button', { name: /Save|保\s*存/ });
    await expect(saveBtn).toBeDisabled();
  });
});
