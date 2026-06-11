// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `create_member_${ts}`;
  const email = `create_member_${ts}@demo.com`;
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

test.describe('Members Management - 家庭成员管理', () => {
  test('TC-2.2: Create new family member', async ({ page }) => {
    const { ts } = await registerAndLogin(page);
    const memberName = `FamilyMember_${ts}`;

    // 1. Navigate to /members page
    await page.getByRole('menuitem', { name: /Members|成员管理/ }).click();
    await expect(page).toHaveURL(/\/members/);

    // 2. Click 'New Member' button
    await page.getByRole('button', { name: /New Member|新增成员/ }).click();

    // 3. Verify modal opens with title
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 4. Fill Name
    await modal.locator('input').first().fill(memberName);

    // 5. Select Gender 'Male'
    await modal.locator('.ant-select').click();
    await page.locator('.ant-select-dropdown').locator('text=/Male|男/').first().click();

    // 6. Fill Age with '35'
    await modal.getByRole('spinbutton', { name: /Age|年龄/ }).fill('35');

    // 7. Fill Height with '170'
    await modal.getByRole('spinbutton', { name: /Height|身高/ }).fill('170');

    // 8. Fill Weight with '75'
    await modal.getByRole('spinbutton', { name: /Weight|体重/ }).fill('75');

    // 9. Click 'Save' button
    await modal.getByRole('button', { name: /Save|保\s*存/ }).click();

    // Verify: Success message appears
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify: Modal closes
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Verify: New member appears in the table
    await expect(page.locator('table').locator(`text=${memberName}`)).toBeVisible();

    // Verify: New member's Edit and Delete buttons are enabled
    const memberRow = page.locator('table tr').filter({ hasText: memberName });
    await expect(memberRow.getByRole('button', { name: /Edit|编辑/ })).toBeEnabled();
    await expect(memberRow.getByRole('button', { name: /Delete|删除/ })).toBeEnabled();
  });
});
