// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

test.describe('Authentication - 用户认证', () => {
  test('TC-1.5: Login - Happy Path', async ({ page }) => {
    const ts = Date.now();
    const username = `login_happy_${ts}`;
    const email = `login_happy_${ts}@demo.com`;
    const password = 'Copilot2026!';

    // Pre-condition: Register a new user first
    await page.goto('http://localhost:3000/register');
    await page.getByTestId('register-username').fill(username);
    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-password').fill(password);
    await page.getByTestId('register-confirm').fill(password);
    await page.getByTestId('register-age').fill('30');
    await page.getByTestId('register-gender').click();
    await page.getByTitle('Male', { exact: true }).click();
    await page.getByTestId('register-weight').fill('70');
    await page.getByTestId('register-submit').click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // 1. Navigate to /login page
    await page.goto('http://localhost:3000/login');

    // 2. Verify page title shows 'Health Records Platform'
    await expect(page.getByRole('heading', { name: 'Health Records Platform' })).toBeVisible();

    // Verify Version number is visible
    await expect(page.locator('text=/Version:\\s*\\d+\\.\\d+\\.\\d+/')).toBeVisible();

    // 3. Fill Email with registered user's email
    await page.getByTestId('login-email').fill(email);

    // 4. Fill Password with correct password
    await page.getByTestId('login-password').fill(password);

    // 5. Click 'Sign In' button
    await page.getByTestId('login-submit').click();

    // Verify: Success message 'Signed in successfully!' appears
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify: Page redirects to /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Verify: Header shows username and email
    await expect(page.getByTestId('current-user')).toContainText(username);
    await expect(page.getByTestId('current-user')).toContainText(email);

    // Verify: Left navigation menu shows key items
    await expect(page.getByRole('menuitem', { name: /Dashboard|仪表板/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Health Records|健康记录/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Members|成员管理/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Profile|个人信息/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Settings|系统设置/ })).toBeVisible();

    // Verify: Default member selector shows 'Self'
    await expect(page.locator('.ant-select-selection-item').filter({ hasText: /Self|自己/ })).toBeVisible();
  });
});
