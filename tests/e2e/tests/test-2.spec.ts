import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.getByRole('link', { name: 'Register now' }).click();
  await page.getByTestId('register-username').click();
  await page.getByTestId('register-username').fill('demo0331');
  await page.getByTestId('register-username').press('Tab');
  await page.getByTestId('register-email').fill('demo0331@demo.com');
  await page.getByTestId('register-email').press('Tab');
  await page.getByTestId('register-password').fill('Copilot2026!');
  await page.getByTestId('register-password').press('Tab');
  await page.getByTestId('register-confirm').fill('Copilot2026!');
  await page.getByTestId('register-age').click();
  await page.getByTestId('register-age').fill('30');
  await page.getByTestId('register-age').press('Tab');
  await page.getByTestId('register-gender').locator('div span').nth(1).click();
  await page.getByText('Male', { exact: true }).click();
  await page.getByTestId('register-height').click();
  await page.getByTestId('register-height').fill('175');
  await page.getByTestId('register-weight').click();
  await page.getByTestId('register-weight').fill('77');
  await page.getByTestId('register-submit').click();
});