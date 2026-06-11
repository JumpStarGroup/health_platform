// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

test.describe('Authentication - 用户认证', () => {
  test('TC-1.2: Register - Missing required fields', async ({ page }) => {
    // 1. Navigate to /register page
    await page.goto('http://localhost:3000/register');

    // 2. Do not fill in any fields, directly click Register
    await page.getByTestId('register-submit').click();

    // 3. Verify: Red error messages appear for required fields
    await expect(page.getByText('Username!')).toBeVisible();
    await expect(page.getByText('Email!')).toBeVisible();
    await expect(page.getByText('Password!')).toBeVisible();
    await expect(page.getByText('Confirm Password!')).toBeVisible();

    // Verify: Form submission is blocked, page stays on /register
    await expect(page).toHaveURL(/\/register/);
  });
});
