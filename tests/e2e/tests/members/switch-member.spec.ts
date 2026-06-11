// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `switch_member_${ts}`;
  const email = `switch_member_${ts}@demo.com`;
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

  return { username, email, password, ts };
}

async function createMember(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: /New Member|新增成员/ }).click();
  const modal = page.locator('.ant-modal');
  await expect(modal).toBeVisible({ timeout: 5000 });
  await modal.locator('input').first().fill(name);
  await modal.getByRole('spinbutton', { name: /Age|年龄/ }).fill('35');
  await modal.getByRole('spinbutton', { name: /Weight|体重/ }).fill('75');
  await modal.getByRole('button', { name: /Save|保\s*存/ }).click();
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
  await expect(modal).not.toBeVisible({ timeout: 5000 });
}

test.describe('Members Management - 家庭成员管理', () => {
  test('TC-2.5: Switch current member via header selector', async ({ page }) => {
    const { ts } = await registerAndLogin(page);
    const memberName = `SwitchTo_${ts}`;

    // Create a new family member
    await page.getByRole('menuitem', { name: /Members|成员管理/ }).click();
    await expect(page).toHaveURL(/\/members/);
    await createMember(page, memberName);

    // 1. Click the member selector in the page header (initially shows 'Self')
    const headerSelector = page.locator('header .ant-select, [class*="header"] .ant-select').first();
    await headerSelector.click();

    // 2. Select the newly created member from the dropdown
    await page.locator('.ant-select-dropdown').locator(`text=${memberName}`).click();

    // Verify: Member selector updates to show the selected member name
    await expect(headerSelector.locator('.ant-select-selection-item')).toContainText(memberName);

    // Verify: Navigating to Health Records shows records for selected member
    await page.getByRole('menuitem', { name: /Health Records|健康记录/ }).click();
    await expect(page).toHaveURL(/\/health-records/);
    // New member should have no records
    await expect(page.locator('text=/No data|暂无数据/')).toBeVisible({ timeout: 5000 });
  });
});
