// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

test.describe('Integration - 端到端综合场景', () => {
  test('TC-8.1: Complete user journey - English UI', async ({ page }) => {
    const ts = Date.now();
    const username = `journey_en_${ts}`;
    const email = `journey_en_${ts}@demo.com`;
    const password = 'Copilot2026!';
    const memberName = `TestMem_${ts}`;

    // 1. Register a new user
    await page.goto('http://localhost:3000/register');
    await page.getByTestId('register-username').fill(username);
    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-password').fill(password);
    await page.getByTestId('register-confirm').fill(password);
    await page.getByTestId('register-age').fill('30');
    await page.getByTestId('register-weight').fill('70');
    await page.getByTestId('register-submit').click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // 2. Login
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // 3. Verify Dashboard shows with user info
    await expect(page.locator('header')).toContainText(username);

    // 4. Navigate to Health Records, create a record for Self (120/80, HR 72)
    await page.getByRole('menuitem', { name: /Health Records/ }).click();
    await expect(page).toHaveURL(/\/health-records/);

    await page.getByRole('button', { name: /Add Record/ }).click();
    let modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await page.getByTestId('systolic-pressure').locator('input').fill('120');
    await page.getByTestId('diastolic-pressure').locator('input').fill('80');
    await page.getByTestId('heart-rate').locator('input').fill('72');
    await modal.getByRole('button', { name: /Save/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('table').locator('text=120/80')).toBeVisible();

    // 5. Edit the record to 125/85
    await page.locator('table tbody tr').first().getByRole('button', { name: /Edit/ }).click();
    modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    const systolicInput = page.getByTestId('systolic-pressure').locator('input');
    await systolicInput.clear();
    await systolicInput.fill('125');
    const diastolicInput = page.getByTestId('diastolic-pressure').locator('input');
    await diastolicInput.clear();
    await diastolicInput.fill('85');
    await modal.getByRole('button', { name: /Update/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('table').locator('text=125/85')).toBeVisible();

    // 6. Navigate to Members, create a family member
    await page.getByRole('menuitem', { name: /Members/ }).click();
    await expect(page).toHaveURL(/\/members/);
    await page.getByRole('button', { name: /New Member/ }).click();
    const memberModal = page.locator('.ant-modal');
    await expect(memberModal).toBeVisible({ timeout: 5000 });
    await memberModal.locator('input[id*="name"], input[id*="full_name"]').first().fill(memberName);
    await memberModal.locator('input[id*="age"]').fill('25');
    await memberModal.getByRole('button', { name: /Save/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // 7. Switch to new member via header selector
    const headerSelect = page.locator('header .ant-select, [class*="header"] .ant-select').first();
    await headerSelect.click();
    await page.locator('.ant-select-dropdown:visible').getByText(memberName).click();

    // 8. Navigate to Health Records, create a record for this member
    await page.getByRole('menuitem', { name: /Health Records/ }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /Add Record/ }).click();
    modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await page.getByTestId('systolic-pressure').locator('input').fill('130');
    await page.getByTestId('diastolic-pressure').locator('input').fill('85');
    await page.getByTestId('heart-rate').locator('input').fill('75');
    await modal.getByRole('button', { name: /Save/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('table').locator('text=130/85')).toBeVisible();

    // 9. Switch back to Self
    await headerSelect.click();
    await page.locator('.ant-select-dropdown:visible').getByText(/Self/).click();
    await page.waitForTimeout(1000);

    // 10. Verify Self's record shows 125/85 (not 130/85)
    await expect(page.locator('table').locator('text=125/85')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('table').locator('text=130/85')).not.toBeVisible({ timeout: 3000 });

    // 11. Logout
    await page.getByRole('button', { name: /Logout/ }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Verify: Accessing /dashboard redirects to /login
    await page.goto('http://localhost:3000/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
