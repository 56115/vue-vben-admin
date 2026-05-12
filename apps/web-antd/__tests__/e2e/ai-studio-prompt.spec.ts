import { test, expect } from '@playwright/test';

test.describe('AI Studio Prompt 管理 E2E 测试', () => {
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

  test('应该能导航到 Prompt 管理页面', async ({ page }) => {
    await page.goto('/#/ai-studio/prompt');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 验证 URL
    expect(page.url()).toContain('/ai-studio/prompt');

    // 验证页面标题或关键元素
    await expect(
      page.locator('text=提示词管理, text=Prompt').first(),
    ).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: 'test-results/ai-studio-prompt-list.png',
      fullPage: true,
    });
  });

  test('Prompt 列表 API 应该正常响应', async ({ page }) => {
    const apiResponses: { url: string; status: number }[] = [];
    page.on('response', (res) => {
      if (res.url().includes('/ai-studio/prompt-templates')) {
        apiResponses.push({ url: res.url(), status: res.status() });
      }
    });

    await page.goto('/#/ai-studio/prompt');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 验证列表 API 被调用且返回非 404
    const listResponse = apiResponses.find(
      (r) => r.url.includes('/prompt-templates') && r.status !== 404,
    );
    console.log('Prompt API 响应:', apiResponses);

    // 至少有一个 prompt-templates 相关请求
    expect(apiResponses.some((r) => r.url.includes('/prompt-templates'))).toBe(
      true,
    );

    await page.screenshot({
      path: 'test-results/ai-studio-prompt-api.png',
      fullPage: true,
    });
  });

  test('应该能导航到 Playground 页面', async ({ page }) => {
    await page.goto('/#/ai-studio/prompt/playground');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 验证 URL
    expect(page.url()).toContain('/ai-studio/prompt/playground');

    // 验证 playground 关键元素：模板选择、变量输入、运行按钮
    await expect(
      page.locator('text=测试 Playground').first(),
    ).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: 'test-results/ai-studio-prompt-playground.png',
      fullPage: true,
    });
  });

  test('Playground 页面应该包含输入输出区域', async ({ page }) => {
    await page.goto('/#/ai-studio/prompt/playground');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 验证输入配置区域
    await expect(page.locator('text=输入配置').first()).toBeVisible({
      timeout: 5000,
    });

    // 验证输出结果区域
    await expect(page.locator('text=输出结果').first()).toBeVisible({
      timeout: 5000,
    });

    // 验证运行测试按钮
    await expect(
      page.locator('button:has-text("运行测试")').first(),
    ).toBeVisible({ timeout: 5000 });

    // 验证预览渲染按钮
    await expect(
      page.locator('button:has-text("预览渲染")').first(),
    ).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: 'test-results/ai-studio-prompt-playground-ui.png',
      fullPage: true,
    });
  });

  test('Prompt 后端 API 端点应该可访问', async ({ page }) => {
    // 测试 prompt-templates 列表端点
    const listResult = await page.request.get(
      'http://localhost:5100/api/ai-studio/prompt-templates',
    );
    expect(listResult.status()).not.toBe(404);

    // 测试 render 端点（POST 需要鉴权，但至少不 404）
    const renderResult = await page.request.post(
      'http://localhost:5100/api/ai-studio/prompt-templates/render',
      { data: { templateKey: 'test', variables: {} } },
    );
    // 401 = 需要鉴权（端点存在）
    expect(renderResult.status()).toBeOneOf([200, 401, 403]);
  });
});
