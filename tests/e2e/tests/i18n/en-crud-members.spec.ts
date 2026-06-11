// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `en_mem_${ts}`;
  const email = `en_mem_${ts}@demo.com`;
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

test.describe('i18n - Language Switching 中英文切换', () => {
  test('TC-6.10: English UI - Full CRUD members', async ({ page }) => {
    await registerAndLogin(page);
    const memberName = `Member_${Date.now()}`;

    // 1. Navigate to Members page
    await page.getByRole('menuitem', { name: /Members/ }).click();
    await expect(page).toHaveURL(/\/members/);

    // 2. Verify English table headers
    const table = page.locator('table');
    await expect(table.locator('th').filter({ hasText: 'Name' })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: 'Gender' })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: 'Age' })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: 'Status' })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: 'Actions' })).toBeVisible();

    // 3. Verify Self member protection
    const selfRow = table.locator('tbody tr').filter({ hasText: /Self/ }).first();
    await expect(selfRow.getByRole('button', { name: /Edit/ })).toBeDisabled();
    await expect(selfRow.getByRole('button', { name: /Delete/ })).toBeDisabled();

    // 4. Create new member
    await page.getByRole('button', { name: /New Member/ }).click();
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.locator('input[id*="name"], input[id*="full_name"]').first().fill(memberName);
    await modal.locator('input[id*="age"]').fill('35');
    await modal.getByRole('button', { name: /Save/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify new member in table
    await expect(page.locator('table').getByText(memberName)).toBeVisible({ timeout: 5000 });

    // 5. Edit the new member
    const memberRow = table.locator('tbody tr').filter({ hasText: memberName }).first();
    await memberRow.getByRole('button', { name: /Edit/ }).click();
    const editModal = page.locator('.ant-modal');
    await expect(editModal).toBeVisible({ timeout: 5000 });
    const ageInput = editModal.locator('input[id*="age"]');
    await ageInput.clear();
    await ageInput.fill('40');
    await editModal.getByRole('button', { name: /Save/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify updated age
    await expect(memberRow).toContainText('40', { timeout: 5000 });

    // 6. Delete the new member
    await memberRow.getByRole('button', { name: /Delete/ }).click();
    const popconfirm = page.locator('.ant-popconfirm, .ant-popover');
    if (await popconfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
      await popconfirm.getByRole('button', { name: /Yes|OK/ }).click();
    }
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify member is removed
    await expect(page.locator('table').getByText(memberName)).not.toBeVisible({ timeout: 5000 });

    // Verify Self member still present
    await expect(page.locator('table').getByText(/Self/)).toBeVisible();
  });
});
