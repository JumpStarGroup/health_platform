// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `zh2en_${ts}`;
  const email = `zh2en_${ts}@demo.com`;
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

async function switchToChinese(page: import('@playwright/test').Page) {
  await page.getByRole('menuitem', { name: /Settings|系统设置/ }).click();
  await page.locator('.ant-select').first().click();
  await page.locator('.ant-select-dropdown:visible').getByText('中文（简体）').click();
  await page.getByRole('button', { name: /Save|保\s*存/ }).click();
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
}

test.describe('i18n - Language Switching 中英文切换', () => {
  test('TC-6.2: Switch from Chinese to English', async ({ page }) => {
    await registerAndLogin(page);

    // 1. First switch to Chinese
    await switchToChinese(page);

    // Verify Chinese UI is active
    await expect(page.getByRole('menuitem', { name: '系统设置' })).toBeVisible({ timeout: 5000 });

    // 2. Open language dropdown and select 'English'
    await page.locator('.ant-select').first().click();
    await page.locator('.ant-select-dropdown:visible').getByText('English').click();

    // 3. Click '保存' button
    await page.getByRole('button', { name: /保\s*存/ }).click();

    // Verify: Success message appears
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify: Navigation menu changes to English
    await expect(page.getByRole('menuitem', { name: 'Dashboard' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('menuitem', { name: 'Health Records' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Members' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();

    // Verify: Logout button shows 'Logout'
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });
});
