// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `iso_mem_${ts}`;
  const email = `iso_mem_${ts}@demo.com`;
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

async function addRecord(page: import('@playwright/test').Page, systolic: string, diastolic: string) {
  await page.getByRole('button', { name: /Add Record|添加记录/ }).click();
  const modal = page.locator('.ant-modal');
  await expect(modal).toBeVisible({ timeout: 5000 });
  await page.getByTestId('systolic-pressure').locator('input').fill(systolic);
  await page.getByTestId('diastolic-pressure').locator('input').fill(diastolic);
  await modal.getByRole('button', { name: /Save|保\s*存/ }).click();
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
  await expect(modal).not.toBeVisible({ timeout: 5000 });
}

test.describe('Health Records CRUD - 健康记录增删改查', () => {
  test('TC-3.12: Records are isolated by member', async ({ page }) => {
    await registerAndLogin(page);
    const memberName = `TestMem_${Date.now()}`;

    // 1. Navigate to /health-records and create a record for Self (120/80)
    await page.getByRole('menuitem', { name: /Health Records|健康记录/ }).click();
    await expect(page).toHaveURL(/\/health-records/);
    await addRecord(page, '120', '80');
    await expect(page.locator('table').locator('text=120/80')).toBeVisible();

    // 2. Create a family member
    await page.getByRole('menuitem', { name: /Members|成员管理/ }).click();
    await expect(page).toHaveURL(/\/members/);
    await page.getByRole('button', { name: /New Member|新增成员/ }).click();
    const memberModal = page.locator('.ant-modal');
    await expect(memberModal).toBeVisible({ timeout: 5000 });
    await memberModal.locator('input[id*="name"], input[id*="full_name"]').first().fill(memberName);
    await memberModal.locator('input[id*="age"]').fill('25');
    await memberModal.getByRole('button', { name: /Save|保\s*存/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // 3. Switch to the new member via header selector
    const headerSelect = page.locator('header .ant-select, [class*="header"] .ant-select').first();
    await headerSelect.click();
    await page.locator('.ant-select-dropdown:visible').getByText(memberName).click();

    // 4. Navigate to health records page
    await page.getByRole('menuitem', { name: /Health Records|健康记录/ }).click();
    await page.waitForTimeout(1000);

    // Verify: Table is empty for the new member
    await expect(page.locator('text=/No data|暂无数据/')).toBeVisible({ timeout: 5000 });

    // 5. Create a record for the new member (130/85)
    await addRecord(page, '130', '85');
    await expect(page.locator('table').locator('text=130/85')).toBeVisible();

    // 6. Switch back to Self
    await headerSelect.click();
    await page.locator('.ant-select-dropdown:visible').getByText(/Self|自己/).click();
    await page.waitForTimeout(1000);

    // Verify: Self's record (120/80) is shown, not the member's record
    await expect(page.locator('table').locator('text=120/80')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('table').locator('text=130/85')).not.toBeVisible({ timeout: 3000 });
  });
});
