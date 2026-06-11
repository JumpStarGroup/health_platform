// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

test.describe('Authentication - 用户认证', () => {
  test('TC-1.6: Login - Wrong credentials', async ({ page }) => {
    const ts = Date.now();
    const email = `wrong_cred_${ts}@demo.com`;

    // Pre-condition: Register a user first
    await page.goto('http://localhost:3000/register');
    await page.getByTestId('register-username').fill(`wrong_cred_${ts}`);
    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-password').fill('Copilot2026!');
    await page.getByTestId('register-confirm').fill('Copilot2026!');
    await page.getByTestId('register-age').fill('30');
    await page.getByTestId('register-weight').fill('70');
    await page.getByTestId('register-submit').click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // 1. Navigate to /login page
    await page.goto('http://localhost:3000/login');

    // 2. Fill Email with registered user's email
    await page.getByTestId('login-email').fill(email);

    // 3. Fill Password with an incorrect password
    await page.getByTestId('login-password').fill('WrongPassword999!');

    // 4. Click 'Sign In' button
    await page.getByTestId('login-submit').click();

    // Verify: Error message about login failure appears
    await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 8000 });

    // Verify: Page stays on /login, no redirect
    await expect(page).toHaveURL(/\/login/);
  });
});
