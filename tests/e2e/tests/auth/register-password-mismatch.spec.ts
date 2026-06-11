// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

test.describe('Authentication - 用户认证', () => {
  test('TC-1.3: Register - Password mismatch', async ({ page }) => {
    // 1. Navigate to /register page
    await page.goto('http://localhost:3000/register');

    // 2. Fill Username, Email, and required fields
    await page.getByTestId('register-username').fill('testpwmismatch');
    await page.getByTestId('register-email').fill('testpwmismatch@demo.com');

    // 3. Fill Password with 'Copilot2026!'
    await page.getByTestId('register-password').fill('Copilot2026!');

    // 4. Fill Confirm Password with 'Different123!'
    await page.getByTestId('register-confirm').fill('Different123!');

    // Fill remaining fields
    await page.getByTestId('register-age').fill('30');

    // 5. Click 'Register' button
    await page.getByTestId('register-submit').click();

    // Verify: Error message about password mismatch appears
    await expect(page.getByText('Passwords do not match!')).toBeVisible();

    // Verify: Form submission is blocked, page stays on /register
    await expect(page).toHaveURL(/\/register/);
  });
});
