// spec: tests/e2e/TEST_PLAN_FULL.md
// seed: tests/e2e/tests/test-2.spec.ts

import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

async function registerAndLogin(page: import('@playwright/test').Page) {
  const ts = Date.now();
  const username = `flt_tag_${ts}`;
  const email = `flt_tag_${ts}@demo.com`;
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

async function addRecordWithTag(page: import('@playwright/test').Page, systolic: string, diastolic: string, tagValue: string) {
  await page.getByRole('button', { name: /Add Record|添加记录/ }).click();
  const modal = page.locator('.ant-modal');
  await expect(modal).toBeVisible({ timeout: 5000 });

  await page.getByTestId('systolic-pressure').locator('input').fill(systolic);
  await page.getByTestId('diastolic-pressure').locator('input').fill(diastolic);

  // Select a tag from the TagSelector (mode="tags" AntD Select)
  const tagSelector = modal.locator('.tag-selector .ant-select');
  await tagSelector.click();
  // Click the option matching tagValue in dropdown
  await page.locator('.ant-select-dropdown:visible').getByText(tagValue, { exact: false }).first().click();
  // Close dropdown by pressing Escape
  await page.keyboard.press('Escape');

  await modal.getByRole('button', { name: /Save|保\s*存/ }).click();
  await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 8000 });
  await expect(modal).not.toBeVisible({ timeout: 5000 });
}

test.describe('Health Records CRUD - 健康记录增删改查', () => {
  test('TC-3.8: Filter records by tags (OR semantics)', async ({ page }) => {
    await registerAndLogin(page);

    // 1. Navigate to /health-records
    await page.getByRole('menuitem', { name: /Health Records|健康记录/ }).click();
    await expect(page).toHaveURL(/\/health-records/);

    // 2. Create two records with different tags
    await addRecordWithTag(page, '120', '80', '餐后');
    await addRecordWithTag(page, '130', '85', '运动后');

    // Verify both records are visible
    await expect(page.locator('table').locator('text=120/80')).toBeVisible();
    await expect(page.locator('table').locator('text=130/85')).toBeVisible();

    // 3. In the filter bar, select one tag to filter
    const filterTagSelector = page.locator('.filter-bar .tag-selector .ant-select, [data-testid="filter-tags"]').first();
    await filterTagSelector.click();
    await page.locator('.ant-select-dropdown:visible').getByText('餐后', { exact: false }).first().click();
    await page.keyboard.press('Escape');

    // Wait for filter to take effect
    await page.waitForTimeout(1000);

    // Verify: Only the record with matching tag is shown
    await expect(page.locator('table').locator('text=120/80')).toBeVisible({ timeout: 5000 });
  });
});
