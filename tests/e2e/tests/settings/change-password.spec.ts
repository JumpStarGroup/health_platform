// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page, prefix: string) {
  const ts = Date.now();
  const username = `${prefix}_${ts}`;
  const email = `${prefix}_${ts}@demo.com`;
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

  return { username, email, password };
}

test.describe('Settings - 系统设置', () => {
  test('TC-5.2: Change password', async ({ page }) => {
    const { email, password } = await registerAndLogin(page, 'chg_pwd');
    const newPassword = 'NewPass2026!';

    // 1. Navigate to /settings
    await page.getByRole('menuitem', { name: /Settings|系统设置/ }).click();
    await expect(page).toHaveURL(/\/settings/);

    // 2. Fill Current Password
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill(password);

    // 3. Fill New Password
    await passwordFields.nth(1).fill(newPassword);

    // 4. Fill Confirm New Password
    await passwordFields.nth(2).fill(newPassword);

    // 5. Click 'Submit' button
    await page.getByRole('button', { name: /Submit|提交/ }).click();

    // Verify: Success message
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // 6. Logout
    await page.getByRole('button', { name: /Logout|退出登录/ }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // 7. Login with new password succeeds
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(newPassword);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});
