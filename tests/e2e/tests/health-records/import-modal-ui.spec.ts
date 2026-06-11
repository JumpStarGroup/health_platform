// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `imp_ui_${ts}`;
  const email = `imp_ui_${ts}@demo.com`;
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
  test('TC-3.11: Import modal - UI verification', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Navigate to /health-records
    await page.getByRole('menuitem', { name: /Health Records|健康记录/ }).click();
    await expect(page).toHaveURL(/\/health-records/);

    // 2. Click 'Import' button
    await page.getByRole('button', { name: /Import|批量导入/ }).click();

    // 3. Verify the import dialog opens
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify: Dialog title
    await expect(modal.locator('.ant-modal-title')).toContainText(/Batch Import|批量导入/);

    // Verify: File upload area
    await expect(modal.locator('.ant-upload, [class*="upload"]')).toBeVisible();

    // Verify: Template download buttons are visible
    await expect(modal.getByRole('button', { name: /Excel|excel/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /CSV|csv/i })).toBeVisible();

    // Verify: Preview button is visible
    await expect(modal.getByRole('button', { name: /Preview|预览/ })).toBeVisible();

    // Verify: Confirm Import button is initially disabled
    await expect(modal.getByRole('button', { name: /Confirm Import|确认导入/ })).toBeDisabled();
  });
});
