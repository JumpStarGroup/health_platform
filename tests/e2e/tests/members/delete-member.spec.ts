// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `del_member_${ts}`;
  const email = `del_member_${ts}@demo.com`;
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
  test('TC-2.4: Delete non-Self member', async ({ page }) => {
    const { ts } = await registerAndLogin(page);
    const memberName = `DelTarget_${ts}`;

    // Navigate to members and create a member
    await page.getByRole('menuitem', { name: /Members|成员管理/ }).click();
    await expect(page).toHaveURL(/\/members/);
    await createMember(page, memberName);

    // Verify member exists
    await expect(page.locator('table').locator(`text=${memberName}`)).toBeVisible();

    // 1. Click 'Delete' button on the non-Self member row
    const memberRow = page.locator('table tr').filter({ hasText: memberName });
    await memberRow.getByRole('button', { name: /Delete|删除/ }).click();

    // 2. If confirmation dialog appears, confirm the deletion
    const confirmBtn = page.locator('.ant-popconfirm-buttons .ant-btn-primary, .ant-modal-confirm-btns .ant-btn-primary');
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Verify: Success message appears
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify: The member disappears from the table
    await expect(page.locator('table').locator(`text=${memberName}`)).not.toBeVisible({ timeout: 5000 });

    // Verify: Self member is still present
    await expect(page.locator('table').locator('text=/Self|自己/')).toBeVisible();
  });
});
