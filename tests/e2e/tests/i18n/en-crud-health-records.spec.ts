// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `en_crud_${ts}`;
  const email = `en_crud_${ts}@demo.com`;
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

test.describe('i18n - Language Switching 中英文切换', () => {
  test('TC-6.9: English UI - Full CRUD health records', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Navigate to Health Records
    await page.getByRole('menuitem', { name: /Health Records/ }).click();
    await expect(page).toHaveURL(/\/health-records/);

    // 2. Add Record
    await page.getByRole('button', { name: /Add Record/ }).click();
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await page.getByTestId('systolic-pressure').locator('input').fill('120');
    await page.getByTestId('diastolic-pressure').locator('input').fill('80');
    await page.getByTestId('heart-rate').locator('input').fill('72');
    await modal.getByRole('button', { name: /Save/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // 3. Verify '120/80' appears in table
    await expect(page.locator('table').locator('text=120/80')).toBeVisible({ timeout: 5000 });

    // 4. Edit Record
    await page.locator('table tbody tr').first().getByRole('button', { name: /Edit/ }).click();
    const editModal = page.locator('.ant-modal');
    await expect(editModal).toBeVisible({ timeout: 5000 });

    const systolicInput = page.getByTestId('systolic-pressure').locator('input');
    await systolicInput.clear();
    await systolicInput.fill('125');

    const diastolicInput = page.getByTestId('diastolic-pressure').locator('input');
    await diastolicInput.clear();
    await diastolicInput.fill('85');

    await editModal.getByRole('button', { name: /Update/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
    await expect(editModal).not.toBeVisible({ timeout: 5000 });

    // 5. Verify '125/85' appears in table
    await expect(page.locator('table').locator('text=125/85')).toBeVisible({ timeout: 5000 });

    // 6. Delete Record
    await page.locator('table tbody tr').first().getByRole('button', { name: /Delete/ }).click();
    const popconfirm = page.locator('.ant-popconfirm, .ant-popover');
    if (await popconfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
      await popconfirm.getByRole('button', { name: /Yes|OK/ }).click();
    }

    // 7. Verify table is empty
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('table').locator('text=125/85')).not.toBeVisible({ timeout: 5000 });
  });
});
