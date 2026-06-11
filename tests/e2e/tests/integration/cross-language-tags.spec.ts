// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `tag_lang_${ts}`;
  const email = `tag_lang_${ts}@demo.com`;
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

test.describe('Integration - 端到端综合场景', () => {
  test('TC-8.3: Cross-language tag display consistency', async ({ page }) => {
    await registerAndLogin(page);

    // 1. In English UI, create a health record with a tag
    await page.getByRole('menuitem', { name: /Health Records/ }).click();
    await expect(page).toHaveURL(/\/health-records/);

    await page.getByRole('button', { name: /Add Record/ }).click();
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    await page.getByTestId('systolic-pressure').locator('input').fill('120');
    await page.getByTestId('diastolic-pressure').locator('input').fill('80');

    // Select a tag from the form's TagSelector
    const tagSelector = modal.locator('.tag-selector .ant-select');
    await tagSelector.click();
    // Select first available tag
    const firstOption = page.locator('.ant-select-dropdown:visible .ant-select-item').first();
    const tagText = await firstOption.textContent();
    await firstOption.click();
    await page.keyboard.press('Escape');

    await modal.getByRole('button', { name: /Save/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Verify record with tag is visible
    await expect(page.locator('table').locator('text=120/80')).toBeVisible();

    // 2. Switch language to Chinese
    await switchLanguage(page, '中文（简体）');

    // 3. Navigate to 健康记录, verify tag displays
    await page.getByRole('menuitem', { name: '健康记录' }).click();

    // Verify the record is still there
    await expect(page.locator('table').locator('text=120/80')).toBeVisible({ timeout: 5000 });

    // Verify tags column shows a tag (translated)
    const tagCell = page.locator('table tbody tr').first().locator('.ant-tag');
    await expect(tagCell.first()).toBeVisible({ timeout: 5000 });

    // 4. Switch back to English
    await switchLanguage(page, 'English');

    // 5. Verify tag still displays correctly
    await page.getByRole('menuitem', { name: 'Health Records' }).click();
    await expect(page.locator('table').locator('text=120/80')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('table tbody tr').first().locator('.ant-tag').first()).toBeVisible();
  });
});
