// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `view_prof_${ts}`;
  const email = `view_prof_${ts}@demo.com`;
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

  return { username, email };
}

test.describe('Profile - 个人信息', () => {
  test('TC-4.1: View profile page', async ({ page }) => {
    const { username, email } = await registerAndLogin(page);

    // 1. Navigate to /profile
    await page.getByRole('menuitem', { name: /Profile|个人信息/ }).click();
    await expect(page).toHaveURL(/\/profile/);

    // 2. Verify 'Basic Info' card shows user data
    const basicCard = page.locator('.ant-card').first();
    await expect(basicCard).toContainText(username);
    await expect(basicCard).toContainText(email);
    await expect(basicCard).toContainText('30'); // Age
    await expect(basicCard).toContainText('70'); // Weight

    // 3. Verify 'Edit Info' card shows editable form
    const editCard = page.locator('.ant-card').nth(1);
    await expect(editCard).toBeVisible();

    // Verify email field is disabled in edit form
    const emailInput = editCard.locator('input[disabled]').first();
    await expect(emailInput).toBeVisible();
  });
});
