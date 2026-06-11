// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `bp_rel_${ts}`;
  const email = `bp_rel_${ts}@demo.com`;
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
  test('TC-3.4: Add record - Systolic must be greater than Diastolic', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Navigate to /health-records
    await page.getByRole('menuitem', { name: /Health Records|健康记录/ }).click();
    await expect(page).toHaveURL(/\/health-records/);

    // 2. Click 'Add Record' button
    await page.getByRole('button', { name: /Add Record|添加记录/ }).click();
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 3. Fill Systolic with '80'
    await page.getByTestId('systolic-pressure').locator('input').fill('80');

    // 4. Fill Diastolic with '120' (diastolic > systolic)
    await page.getByTestId('diastolic-pressure').locator('input').fill('120');

    // 5. Blur to trigger cross-field validation
    await page.getByTestId('diastolic-pressure').locator('input').blur();

    // Verify: Error about systolic > diastolic
    await expect(modal.locator('.ant-form-item-explain-error')).toBeVisible({ timeout: 5000 });

    // Verify: Save button is disabled
    const saveBtn = modal.getByRole('button', { name: /Save|保\s*存/ });
    await expect(saveBtn).toBeDisabled();
  });
});
