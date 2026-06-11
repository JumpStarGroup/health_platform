// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

test.describe('Authentication - 用户认证', () => {
  test('TC-1.7: Logout', async ({ page }) => {
    const ts = Date.now();
    const username = `logout_${ts}`;
    const email = `logout_${ts}@demo.com`;
    const password = 'Copilot2026!';

    // Pre-condition: Register and login
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

    // 1. Verify we are on /dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Click 'Logout' button in the top-right corner
    await page.getByRole('button', { name: /Logout|退出登录/ }).click();

    // Verify: Page redirects to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Verify: Navigating to /dashboard should redirect back to /login
    await page.goto('http://localhost:3000/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
