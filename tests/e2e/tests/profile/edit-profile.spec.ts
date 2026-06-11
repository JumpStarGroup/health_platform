// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `edit_prof_${ts}`;
  const email = `edit_prof_${ts}@demo.com`;
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
  test('TC-4.2: Edit profile information', async ({ page }) => {
    const { username } = await registerAndLogin(page);
    const newUsername = `edited_${Date.now()}`;

    // 1. Navigate to /profile
    await page.getByRole('menuitem', { name: /Profile|个人信息/ }).click();
    await expect(page).toHaveURL(/\/profile/);

    // 2. In edit form, change Username
    const editCard = page.locator('.ant-card').nth(1);
    const usernameInput = editCard.locator('input').first();
    await usernameInput.clear();
    await usernameInput.fill(newUsername);

    // 3. Change Age to '35'
    const ageInput = editCard.locator('.ant-input-number input').first();
    await ageInput.clear();
    await ageInput.fill('35');

    // 4. Click 'Save changes' button
    await editCard.getByRole('button', { name: /Save|保\s*存/ }).click();

    // Verify: Success message
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // Verify: Basic Info card updates to show new values
    const basicCard = page.locator('.ant-card').first();
    await expect(basicCard).toContainText(newUsername, { timeout: 5000 });
    await expect(basicCard).toContainText('35');
  });
});
