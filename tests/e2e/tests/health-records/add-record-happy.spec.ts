// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `add_rec_${ts}`;
  const email = `add_rec_${ts}@demo.com`;
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
  test('TC-3.2: Add health record - Happy path', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Navigate to /health-records
    await page.getByRole('menuitem', { name: /Health Records|健康记录/ }).click();
    await expect(page).toHaveURL(/\/health-records/);

    // 2. Click 'Add Record' button
    await page.getByRole('button', { name: /Add Record|添加记录/ }).click();

    // 3. Verify modal opens
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 4. Fill Systolic with '120'
    await page.getByTestId('systolic-pressure').locator('input').fill('120');

    // 5. Fill Diastolic with '80'
    await page.getByTestId('diastolic-pressure').locator('input').fill('80');

    // 6. Fill Heart Rate with '72'
    await page.getByTestId('heart-rate').locator('input').fill('72');

    // 7. Click 'Save' button
    await modal.getByRole('button', { name: /Save|保\s*存/ }).click();

    // Verify: Success message appears
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify: Modal closes
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Verify: New record shows in table with blood pressure '120/80'
    await expect(page.locator('table').locator('text=120/80')).toBeVisible({ timeout: 5000 });
  });
});
