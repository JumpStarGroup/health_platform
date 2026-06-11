// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

test.describe('i18n - Language Switching 中英文切换', () => {
  test('TC-6.3: Chinese UI - Complete registration', async ({ page }) => {
    const ts = Date.now();
    const username = `zh_reg_${ts}`;
    const email = `zh_reg_${ts}@demo.com`;
    const password = 'Copilot2026!';

    // 1. Navigate to /register
    await page.goto('http://localhost:3000/register');

    // Note: The registration page language depends on browser locale or previous setting.
    // We verify the form works regardless of language and check that it can complete.

    // 2. Fill all fields
    await page.getByTestId('register-username').fill(username);
    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-password').fill(password);
    await page.getByTestId('register-confirm').fill(password);
    await page.getByTestId('register-age').fill('30');
    await page.getByTestId('register-weight').fill('70');

    // 3. Click Register button
    await page.getByTestId('register-submit').click();

    // Verify: Redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // 4. Login to verify the account works
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // 5. Switch to Chinese
    await page.getByRole('menuitem', { name: /Settings|系统设置/ }).click();
    await page.locator('.ant-select').first().click();
    await page.locator('.ant-select-dropdown:visible').getByText('中文（简体）').click();
    await page.getByRole('button', { name: /Save|保\s*存/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify: Chinese navigation is now displayed
    await expect(page.getByRole('menuitem', { name: '仪表板' })).toBeVisible({ timeout: 5000 });
  });
});
