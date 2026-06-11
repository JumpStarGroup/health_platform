// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

// This test needs its own registration flow, disable shared auth
test.use({ storageState: undefined });

test.describe('Authentication - 用户认证', () => {
  test('TC-1.1: Register new user - Happy Path', async ({ page }) => {
    // Generate unique username/email with timestamp
    const ts = Date.now();
    const username = `reg_happy_${ts}`;
    const email = `reg_happy_${ts}@demo.com`;

    // 1. Navigate to http://localhost:3000/login
    await page.goto('http://localhost:3000/login');

    // 2. Click 'Register now' link, verify redirect to /register
    await page.getByRole('link', { name: 'Register now' }).click();
    await expect(page).toHaveURL(/\/register/);

    // 3. Verify registration form shows heading
    await expect(page.getByText('Health Records Platform')).toBeVisible();

    // 4. Fill Username with unique timestamp-based username
    await page.getByTestId('register-username').fill(username);

    // 5. Fill Email with matching unique email
    await page.getByTestId('register-email').fill(email);

    // 6. Fill Password with 'Copilot2026!'
    await page.getByTestId('register-password').fill('Copilot2026!');

    // 7. Fill Confirm Password with 'Copilot2026!'
    await page.getByTestId('register-confirm').fill('Copilot2026!');

    // 8. Fill Age with '30'
    await page.getByTestId('register-age').fill('30');

    // 9. Select Gender as 'Male'
    await page.getByTestId('register-gender').click();
    await page.getByTitle('Male', { exact: true }).click();

    // 10. Fill Height with '175'
    await page.getByTestId('register-height').fill('175');

    // 11. Fill Weight with '70'
    await page.getByTestId('register-weight').fill('70');

    // 12. Click 'Register' button
    await page.getByTestId('register-submit').click();

    // Verify: Success message appears and redirects to /login
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Please sign in to your account')).toBeVisible();
  });
});
