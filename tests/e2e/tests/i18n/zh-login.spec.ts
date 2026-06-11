// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

test.describe('i18n - Language Switching 中英文切换', () => {
  test('TC-6.4: Chinese UI - Login', async ({ page }) => {
    const ts = Date.now();
    const username = `zh_login_${ts}`;
    const email = `zh_login_${ts}@demo.com`;
    const password = 'Copilot2026!';

    // Register first
    await page.goto('http://localhost:3000/register');
    await page.getByTestId('register-username').fill(username);
    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-password').fill(password);
    await page.getByTestId('register-confirm').fill(password);
    await page.getByTestId('register-age').fill('30');
    await page.getByTestId('register-weight').fill('70');
    await page.getByTestId('register-submit').click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Login
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Switch to Chinese
    await page.getByRole('menuitem', { name: /Settings|系统设置/ }).click();
    await page.locator('.ant-select').first().click();
    await page.locator('.ant-select-dropdown:visible').getByText('中文（简体）').click();
    await page.getByRole('button', { name: /Save|保\s*存/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify: Dashboard heading shows '健康仪表板' after navigating there
    await page.getByRole('menuitem', { name: '仪表板' }).click();
    await expect(page.locator('h2').filter({ hasText: /健康仪表板/ })).toBeVisible({ timeout: 5000 });
  });
});
