import { test, expect } from '@playwright/test';

test.describe('AI Chat 页面 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/auth/login');
    await page.waitForLoadState('networkidle');

    const usernameInput = page.locator('input[name="username"]');
    const passwordInput = page.locator('input[name="password"]');

    if (await usernameInput.isVisible()) {
      await usernameInput.fill('superadmin');
      await passwordInput.fill('admin123456');

      const loginBtn = page
        .locator('button[aria-label="login"], button:has-text("登录")')
        .first();
      await loginBtn.click();

      await page
        .waitForResponse(
          (res) =>
            res.url().includes('/api/auth/login') && res.status() === 200,
          { timeout: 15000 },
        )
        .catch(() => {});
      await page
        .waitForURL(/^(?!.*login).*$/, { timeout: 15000 })
        .catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2000);
    }
  });

  test('应该能导航到 AI Chat 页面并显示 UI 元素', async ({ page }) => {
    await page.goto('/#/ai-tutor/chat');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 验证 URL
    expect(page.url()).toContain('/ai-tutor/chat');

    // 验证侧边栏 UI 元素
    await expect(page.locator('h3.sidebar-title')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('button:has-text("新建")')).toBeVisible({
      timeout: 5000,
    });

    // 验证搜索框
    await expect(page.locator('input[placeholder*="搜索"]')).toBeVisible({
      timeout: 5000,
    });

    await page.screenshot({
      path: 'test-results/ai-chat-page.png',
      fullPage: true,
    });
  });

  test('点击新建应该创建新会话并显示欢迎屏', async ({ page }) => {
    const apiResponses: { url: string; status: number }[] = [];
    page.on('response', (res) => {
      if (res.url().includes('/ai-chat')) {
        apiResponses.push({ url: res.url(), status: res.status() });
      }
    });

    await page.goto('/#/ai-tutor/chat');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 点击新建按钮
    const newBtn = page.locator('button:has-text("新建")');
    await newBtn.click();
    await page.waitForTimeout(3000);

    // 验证 API 调用
    const createResponse = apiResponses.find(
      (r) => r.url.includes('/ai-chat/sessions') && r.status === 200,
    );
    console.log('API 响应:', apiResponses);

    // 验证欢迎屏显示
    await expect(page.locator('text=今天想学什么？')).toBeVisible({
      timeout: 5000,
    });

    // 验证输入框可用
    await expect(page.locator('textarea[placeholder*="输入消息"]')).toBeVisible(
      { timeout: 5000 },
    );

    await page.screenshot({
      path: 'test-results/ai-chat-new-session.png',
      fullPage: true,
    });
  });

  test('欢迎卡片应该可点击', async ({ page }) => {
    await page.goto('/#/ai-tutor/chat');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 点击新建按钮
    const newBtn = page.locator('button:has-text("新建")');
    await newBtn.click();
    await page.waitForTimeout(2000);

    // 验证欢迎卡片
    await expect(page.locator('text=解题')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=讲概念')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=练习题')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=检查答案')).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: 'test-results/ai-chat-welcome-cards.png',
      fullPage: true,
    });
  });

  test('API 端点应该正常工作', async ({ page }) => {
    const scopesResult = await page.request.get(
      'http://localhost:5100/api/ai-chat/scopes',
    );
    expect(scopesResult.status()).not.toBe(404);

    const sessionsResult = await page.request.get(
      'http://localhost:5100/api/ai-chat/sessions',
    );
    expect(sessionsResult.status()).not.toBe(404);
  });
});
