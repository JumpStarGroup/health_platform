// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `view_set_${ts}`;
  const email = `view_set_${ts}@demo.com`;
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

test.describe('Settings - 系统设置', () => {
  test('TC-5.1: View settings page', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Navigate to /settings
    await page.getByRole('menuitem', { name: /Settings|系统设置/ }).click();
    await expect(page).toHaveURL(/\/settings/);

    // 2. Verify Language selector
    await expect(page.locator('.ant-select').first()).toBeVisible();

    // 3. Verify Change Password section
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    // Verify there are 3 password fields: current, new, confirm
    const passwordFields = page.locator('input[type="password"]');
    await expect(passwordFields).toHaveCount(3);

    // 4. Verify password rules list
    await expect(page.locator('li').filter({ hasText: /8|位/ })).toBeVisible();
    await expect(page.locator('li').filter({ hasText: /letters|字母|数字/ })).toBeVisible();

    // 5. Verify password strength progress bar
    await expect(page.locator('.ant-progress')).toBeVisible();
  });
});
