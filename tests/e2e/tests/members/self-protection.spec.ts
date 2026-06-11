// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `self_protect_${ts}`;
  const email = `self_protect_${ts}@demo.com`;
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

test.describe('Members Management - 家庭成员管理', () => {
  test('TC-2.6: Self member protection - cannot edit or delete', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Navigate to /members page
    await page.getByRole('menuitem', { name: /Members|成员管理/ }).click();
    await expect(page).toHaveURL(/\/members/);

    // 2. Inspect the Self member row's action buttons
    const selfRow = page.locator('table tr').filter({ hasText: /Self|自己/ });
    await expect(selfRow).toBeVisible();

    // Verify: Self member Edit button has 'disabled' attribute
    const editBtn = selfRow.getByRole('button', { name: /Edit|编辑/ });
    await expect(editBtn).toBeDisabled();

    // Verify: Self member Delete button has 'disabled' attribute
    const deleteBtn = selfRow.getByRole('button', { name: /Delete|删除/ });
    await expect(deleteBtn).toBeDisabled();
  });
});
