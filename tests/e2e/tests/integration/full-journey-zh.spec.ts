// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

test.describe('Integration - 端到端综合场景', () => {
  test('TC-8.2: Complete user journey - Chinese UI', async ({ page }) => {
    const ts = Date.now();
    const username = `journey_zh_${ts}`;
    const email = `journey_zh_${ts}@demo.com`;
    const password = 'Copilot2026!';
    const memberName = `成员_${ts}`;

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

    // 3. Switch language to Chinese via Settings
    await page.getByRole('menuitem', { name: /Settings|系统设置/ }).click();
    await page.locator('.ant-select').first().click();
    await page.locator('.ant-select-dropdown:visible').getByText('中文（简体）').click();
    await page.getByRole('button', { name: /Save|保\s*存/ }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // 4. Verify all menus display in Chinese
    await expect(page.getByRole('menuitem', { name: '仪表板' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('menuitem', { name: '健康记录' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: '成员管理' })).toBeVisible();

    // 5. Create health record for 自己 (120/80)
    await page.getByRole('menuitem', { name: '健康记录' }).click();
    await expect(page).toHaveURL(/\/health-records/);

    await page.getByRole('button', { name: '添加记录' }).click();
    let modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await page.getByTestId('systolic-pressure').locator('input').fill('120');
    await page.getByTestId('diastolic-pressure').locator('input').fill('80');
    await modal.getByRole('button', { name: '保存' }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('table').locator('text=120/80')).toBeVisible();

    // 6. Attempt invalid input (systolic 300) - verify blocked
    await page.getByRole('button', { name: '添加记录' }).click();
    modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await page.getByTestId('systolic-pressure').locator('input').fill('300');
    await page.getByTestId('diastolic-pressure').locator('input').fill('80');
    await page.getByTestId('diastolic-pressure').locator('input').blur();
    await expect(modal.locator('.ant-form-item-explain-error')).toBeVisible({ timeout: 5000 });
    // Close modal
    await modal.locator('.ant-modal-close').click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // 7. Edit record to 125/85
    await page.locator('table tbody tr').first().getByRole('button', { name: '编辑' }).click();
    modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    const systolicInput = page.getByTestId('systolic-pressure').locator('input');
    await systolicInput.clear();
    await systolicInput.fill('125');
    const diastolicInput = page.getByTestId('diastolic-pressure').locator('input');
    await diastolicInput.clear();
    await diastolicInput.fill('85');
    await modal.getByRole('button', { name: '更新' }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('table').locator('text=125/85')).toBeVisible({ timeout: 5000 });

    // 8. Navigate to 成员管理, create family member
    await page.getByRole('menuitem', { name: '成员管理' }).click();
    await expect(page).toHaveURL(/\/members/);
    await page.getByRole('button', { name: '新增成员' }).click();
    const memberModal = page.locator('.ant-modal');
    await expect(memberModal).toBeVisible({ timeout: 5000 });
    await memberModal.locator('input[id*="name"], input[id*="full_name"]').first().fill(memberName);
    await memberModal.locator('input[id*="age"]').fill('25');
    await memberModal.getByRole('button', { name: '保存' }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });

    // 9. Switch to new member via header selector
    const headerSelect = page.locator('header .ant-select, [class*="header"] .ant-select').first();
    await headerSelect.click();
    await page.locator('.ant-select-dropdown:visible').getByText(memberName).click();

    // 10. Create health record for new member (130/85)
    await page.getByRole('menuitem', { name: '健康记录' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: '添加记录' }).click();
    modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await page.getByTestId('systolic-pressure').locator('input').fill('130');
    await page.getByTestId('diastolic-pressure').locator('input').fill('85');
    await modal.getByRole('button', { name: '保存' }).click();
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('table').locator('text=130/85')).toBeVisible();
  });
});
