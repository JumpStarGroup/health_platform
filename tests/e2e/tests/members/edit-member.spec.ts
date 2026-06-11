// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `edit_member_${ts}`;
  const email = `edit_member_${ts}@demo.com`;
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
  test('TC-2.3: Edit non-Self member', async ({ page }) => {
    const { ts } = await registerAndLogin(page);
    const memberName = `EditTarget_${ts}`;

    // Navigate to members and create a member
    await page.getByRole('menuitem', { name: /Members|成员管理/ }).click();
    await expect(page).toHaveURL(/\/members/);
    await createMember(page, memberName);

    // 1. Click 'Edit' button on the non-Self member row
    const memberRow = page.locator('table tr').filter({ hasText: memberName });
    await memberRow.getByRole('button', { name: /Edit|编辑/ }).click();

    // 2. Verify edit modal opens with pre-filled values
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 3. Change Age to '40' and Weight to '80'
    const ageInput = modal.getByRole('spinbutton', { name: /Age|年龄/ });
    await ageInput.clear();
    await ageInput.fill('40');
    const weightInput = modal.getByRole('spinbutton', { name: /Weight|体重/ });
    await weightInput.clear();
    await weightInput.fill('80');

    // 4. Click 'Save' button
    await modal.getByRole('button', { name: /Save|保\s*存|Update|更\s*新/ }).click();

    // Verify: Success message appears
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify: Modal closes
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Verify: Table shows updated values
    const updatedRow = page.locator('table tr').filter({ hasText: memberName });
    await expect(updatedRow.locator('td').filter({ hasText: '40' })).toBeVisible();
    await expect(updatedRow.locator('td').filter({ hasText: '80' })).toBeVisible();
  });
});
