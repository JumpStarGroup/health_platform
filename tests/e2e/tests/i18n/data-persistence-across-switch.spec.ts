// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `persist_${ts}`;
  const email = `persist_${ts}@demo.com`;
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

async function switchLanguage(page: import('@playwright/test').Page, targetLabel: string) {
  await page.getByRole('menuitem', { name: /Settings|系统设置/ }).click();
  await page.locator('.ant-select').first().click();
  await page.locator('.ant-select-dropdown:visible').getByText(targetLabel).click();
  await page.getByRole('button', { name: /Save|保\s*存/ }).click();
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
}

test.describe('i18n - Language Switching 中英文切换', () => {
  test('TC-6.11: Data persistence across language switch', async ({ page }) => {
    await registerAndLogin(page);
    const memberName = `Persist_${Date.now()}`;

    // 1. In English UI, create a health record
    await page.getByRole('menuitem', { name: /Health Records/ }).click();
    await expect(page).toHaveURL(/\/health-records/);

    await page.getByRole('button', { name: /Add Record/ }).click();
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await page.getByTestId('systolic-pressure').locator('input').fill('120');
    await page.getByTestId('diastolic-pressure').locator('input').fill('80');
    await modal.getByRole('button', { name: /Save/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('table').locator('text=120/80')).toBeVisible();

    // Create a family member
    await page.getByRole('menuitem', { name: /Members/ }).click();
    await page.getByRole('button', { name: /New Member/ }).click();
    const memberModal = page.locator('.ant-modal');
    await expect(memberModal).toBeVisible({ timeout: 5000 });
    await memberModal.locator('input[id*="name"], input[id*="full_name"]').first().fill(memberName);
    await memberModal.locator('input[id*="age"]').fill('25');
    await memberModal.getByRole('button', { name: /Save/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // 2. Switch to Chinese
    await switchLanguage(page, '中文（简体）');

    // 3. Verify health record persists in Chinese UI
    await page.getByRole('menuitem', { name: '健康记录' }).click();
    await expect(page.locator('table').locator('text=120/80')).toBeVisible({ timeout: 5000 });

    // 4. Verify member persists in Chinese UI
    await page.getByRole('menuitem', { name: '成员管理' }).click();
    await expect(page.locator('table').getByText(memberName)).toBeVisible({ timeout: 5000 });

    // 5. Switch back to English
    await switchLanguage(page, 'English');

    // 6. Verify records still present in English UI
    await page.getByRole('menuitem', { name: 'Health Records' }).click();
    await expect(page.locator('table').locator('text=120/80')).toBeVisible({ timeout: 5000 });

    await page.getByRole('menuitem', { name: 'Members' }).click();
    await expect(page.locator('table').getByText(memberName)).toBeVisible({ timeout: 5000 });
  });
});
