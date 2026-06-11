// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

/** Helper: register and login a fresh user, return user info */
async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `view_members_${ts}`;
  const email = `view_members_${ts}@demo.com`;
  const password = 'Copilot2026!';

  await page.goto('http://localhost:3000/register');
  await page.getByTestId('register-username').fill(username);
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill(password);
  await page.getByTestId('register-confirm').fill(password);
  await page.getByTestId('register-age').fill('30');
  await page.getByTestId('register-gender').click();
  await page.getByTitle('Male', { exact: true }).click();
  await page.getByTestId('register-height').fill('175');
  await page.getByTestId('register-weight').fill('70');
  await page.getByTestId('register-submit').click();
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

  return { username, email, password };
}

test.describe('Members Management - 家庭成员管理', () => {
  test('TC-2.1: View members list with Self member', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Navigate to /members page
    await page.getByRole('menuitem', { name: /Members|成员管理/ }).click();
    await expect(page).toHaveURL(/\/members/);

    // 2. Verify table headers
    const table = page.locator('table');
    await expect(table.locator('th').filter({ hasText: /Name|姓名/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /Gender|性别/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /Age|年龄/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /Height|身高/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /Weight|体重/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /Status|状态/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /Actions|操作/ })).toBeVisible();

    // 3. Check Self member exists with correct data
    const selfRow = table.locator('tr').filter({ hasText: /Self|自己/ });
    await expect(selfRow).toBeVisible();
    await expect(selfRow.locator('td').nth(1)).toContainText(/Male|男/);
    await expect(selfRow.locator('td').nth(2)).toContainText('30');

    // Verify: Self member status is 'Active'
    await expect(selfRow.locator('td').filter({ hasText: /Active|启用/ })).toBeVisible();

    // Verify: Self member Edit button is disabled
    await expect(selfRow.getByRole('button', { name: /Edit|编辑/ })).toBeDisabled();

    // Verify: Self member Delete button is disabled
    await expect(selfRow.getByRole('button', { name: /Delete|删除/ })).toBeDisabled();
  });
});
