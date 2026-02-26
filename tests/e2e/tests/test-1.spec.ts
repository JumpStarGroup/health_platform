import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.getByTestId('login-email').click();
  // Keep credentials valid; the previous value wasn't a valid email address.
  await page
    .getByTestId('login-email')
    .fill('e2e.20260126-1341-demo-2699@example.com');
  await page.getByTestId('login-password').click();
  await page.getByTestId('login-password').fill('TestPassword123!');
  
  await page.getByText('Version:').click();
  // Avoid pinning the test to a specific build version.
  await expect(page.locator('#root')).toContainText(/Version:\s*\d+\.\d+\.\d+/);
  await page.getByTestId('login-submit').click();
  await page.getByRole('heading', { name: 'Health Dashboard' }).waitFor();
  
  await page.getByRole('heading', { name: 'Health Dashboard' }).click();
  await expect(page.locator('h2')).toContainText('Health Dashboard');
  await page.getByText('2').nth(1).click();
  await page.getByText('Self').click();
  await page.getByText('Member-20260126-1341-demo-').click();
  await page.getByText('Health Records').click();
  await page.getByRole('button', { name: 'edit Edit' }).click();
  // Use a less brittle selector for the tag selector.
  await page.locator('.tag-selector .ant-select-selector').click();
  await page.getByRole('option', { name: 'After Meal' }).click();
  await page.getByRole('button', { name: 'Update' }).click();
});