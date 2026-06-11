// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

test.describe('Authentication - 用户认证', () => {
  test('TC-1.4: Register - Duplicate email', async ({ page }) => {
    const ts = Date.now();
    const username = `dup_email_${ts}`;
    const email = `dup_email_${ts}@demo.com`;

    // Step 1: Register a new user with a unique email (first registration)
    await page.goto('http://localhost:3000/register');
    await page.getByTestId('register-username').fill(username);
    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-password').fill('Copilot2026!');
    await page.getByTestId('register-confirm').fill('Copilot2026!');
    await page.getByTestId('register-age').fill('30');
    await page.getByTestId('register-gender').click();
    await page.getByTitle('Male', { exact: true }).click();
    await page.getByTestId('register-weight').fill('70');
    await page.getByTestId('register-submit').click();

    // Wait for first registration to succeed
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
    await expect(page).toHaveURL(/\/login/);

    // Step 2: Navigate to /register again
    await page.goto('http://localhost:3000/register');

    // Step 3: Fill all required fields using the SAME email
    await page.getByTestId('register-username').fill(`${username}_2`);
    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-password').fill('Copilot2026!');
    await page.getByTestId('register-confirm').fill('Copilot2026!');
    await page.getByTestId('register-age').fill('25');
    await page.getByTestId('register-weight').fill('65');

    // Step 4: Click 'Register' button
    await page.getByTestId('register-submit').click();

    // Verify: Error message about email already being used appears
    await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 8000 });
  });
});
