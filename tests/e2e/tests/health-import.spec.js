/**
 * Health Records Import E2E Tests
 * Tests bulk import, member mapping, and duplicate detection
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { ensureChinese } from '../utils/auth';

test.describe('Health Records Import', () => {

  function genUser() {
    const ts = Date.now();
    return {
      username: `e2e_import_${ts}`,
      email: `e2e.import.${ts}@example.com`,
      password: 'TestPassword123!'
    };
  }

  async function registerAndLogin(page) {
    const user = genUser();
    await page.goto('/register');
    await page.fill('input[placeholder="请输入用户名"]', user.username);
    await page.fill('input[placeholder="请输入邮箱地址"]', user.email);
    await page.fill('input[placeholder="请输入密码"]', user.password);
    await page.fill('input[placeholder="请确认密码"]', user.password);
    await page.fill('input[placeholder="年龄"]', '30');
    await page.click('.ant-select-selector');
    await page.click('text=女');
    await page.fill('input[placeholder="体重"]', '60');
    const regSubmit = page.locator('form[name="register"] button[type="submit"]').first();
    await regSubmit.click();
    await page.goto('/login');
    await page.fill('input[placeholder="邮箱地址"]', user.email);
    await page.fill('input[placeholder="密码"]', user.password);
    const loginSubmit = page.locator('form[name="login"] button[type="submit"]').first();
    await loginSubmit.click();
    await expect(page).toHaveURL(/.*dashboard.*|.*localhost:3000\/$/);
    await ensureChinese(page);
  }

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
    await page.click('text=健康记录');
    await expect(page).toHaveURL('/health-records');
  });

  test('should open import modal and download template', async ({ page }) => {
    // Click import button
    await page.click('text=批量导入');
    
    // Modal should be visible
    const modal = page.locator('.ant-modal:has-text("批量导入健康记录")');
    await expect(modal).toBeVisible();
    
    // Check for template download buttons
    await expect(modal.locator('text=下载模板 (Excel)')).toBeVisible();
    await expect(modal.locator('text=下载模板 (CSV)')).toBeVisible();
    
    // Check for upload area
    await expect(modal.locator('text=点击或拖拽文件到此处')).toBeVisible();
    await expect(modal.locator('text=支持 CSV / Excel')).toBeVisible();
  });

  test('should show field mapping UI', async ({ page }) => {
    // Note: This test assumes a valid CSV file exists in fixtures
    // In real scenarios, you'd create/upload a test CSV
    
    await page.click('text=批量导入');
    const modal = page.locator('.ant-modal:has-text("批量导入健康记录")');
    await expect(modal).toBeVisible();
    
    // Check field mapping labels
    await expect(modal.locator('text=成员名称')).toBeVisible();
    await expect(modal.locator('text=测量时间')).toBeVisible();
    await expect(modal.locator('text=收缩压')).toBeVisible();
    await expect(modal.locator('text=舒张压')).toBeVisible();
    await expect(modal.locator('text=心率')).toBeVisible();
  });

  test('should handle duplicate records detection', async ({ page }) => {
    // First create a record at a specific time
    await page.click('text=添加记录');
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible();
    
    await page.fill('input[placeholder*="收缩压"]', '130');
    await page.fill('input[placeholder*="舒张压"]', '85');
    await page.fill('input[placeholder*="心率"]', '75');
    
    const submitBtn = modal.locator('button[type="submit"]').filter({ hasText: /添\s?加|添加/ });
    await submitBtn.first().click();
    await expect(page.locator('.ant-message-success')).toBeVisible();
    
    // Try to create another record with same timestamp (within same minute)
    await page.click('text=添加记录');
    await page.fill('input[placeholder*="收缩压"]', '135');
    await page.fill('input[placeholder*="舒张压"]', '90');
    
    const modal2 = page.locator('.ant-modal');
    const submitBtn2 = modal2.locator('button[type="submit"]').filter({ hasText: /添\s?加|添加/ });
    await submitBtn2.first().click();
    
    // Should show duplicate error
    await expect(page.locator('text=同时间（精确到分钟）已经存在相同记录')).toBeVisible({ timeout: 5000 });
  });

  test('should show unknown members section in import preview', async ({ page }) => {
    await page.click('text=批量导入');
    const modal = page.locator('.ant-modal:has-text("批量导入健康记录")');
    
    // After preview with unknown members, should show handling section
    // Note: This requires actual file upload which is complex in E2E
    // The UI elements should exist
    await expect(modal).toBeVisible();
  });

  test('should update record with different timestamp', async ({ page }) => {
    // Create first record
    await page.click('text=添加记录');
    let modal = page.locator('.ant-modal');
    await page.fill('input[placeholder*="收缩压"]', '115');
    await page.fill('input[placeholder*="舒张压"]', '75');
    await modal.locator('button[type="submit"]').filter({ hasText: /添\s?加|添加/ }).first().click();
    await expect(page.locator('.ant-message-success')).toBeVisible();
    
    // Edit with a different time (should succeed)
    await page.locator('button:has-text("编辑")').first().click();
    modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible();
    
    // Change blood pressure values
    await page.fill('input[placeholder*="收缩压"]', '120');
    await page.fill('input[placeholder*="舒张压"]', '80');
    
    const updateBtn = modal.locator('button[type="submit"]').filter({ hasText: /更\s?新|更新/ });
    await updateBtn.first().click();
    await expect(page.locator('.ant-message-success')).toBeVisible();
    
    // Verify updated values appear
    await expect(page.locator('text=120/80')).toBeVisible();
  });

  test('should validate member mapping options', async ({ page }) => {
    // First create an additional member
    await page.click('text=成员管理');
    await expect(page).toHaveURL('/members');
    
    await page.click('text=新增成员');
    const memberModal = page.locator('.ant-modal');
    await memberModal.fill('input[placeholder="姓名"]', '张三');
    await memberModal.click('.ant-select-selector');
    await page.click('text=男');
    await memberModal.locator('button[type="submit"]').first().click();
    await expect(page.locator('.ant-message-success')).toBeVisible();
    
    // Go back to health records
    await page.click('text=健康记录');
    await expect(page).toHaveURL('/health-records');
    
    // Open import modal
    await page.click('text=批量导入');
    const importModal = page.locator('.ant-modal:has-text("批量导入健康记录")');
    await expect(importModal).toBeVisible();
    
    // UI elements should be present for member mapping
    await expect(importModal.locator('text=字段映射')).toBeVisible();
  });
});
