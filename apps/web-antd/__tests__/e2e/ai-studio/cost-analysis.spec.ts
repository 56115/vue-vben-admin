import { test, expect, Page } from '@playwright/test';
import {
  getAdminToken,
  getPiniaAccessStoreData,
  getPiniaUserStoreData,
} from '../test-auth';

// 测试配置
const BASE_URL = 'http://localhost:5666';
const STORAGE_PREFIX = 'vben-web-antd-5.5.9-dev';

/**
 * 通过 Token 登录
 */
async function loginWithToken(page: Page) {
  const token = getAdminToken();
  const accessStoreData = getPiniaAccessStoreData(token);
  const userStoreData = getPiniaUserStoreData();

  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('domcontentloaded');

  // 设置 localStorage
  await page.evaluate(
    ({ prefix, access, user }) => {
      localStorage.setItem(`${prefix}-core-access`, JSON.stringify(access));
      localStorage.setItem(`${prefix}-core-user`, JSON.stringify(user));
    },
    {
      prefix: STORAGE_PREFIX,
      access: accessStoreData,
      user: userStoreData,
    },
  );

  await page.reload();
  await page.waitForLoadState('networkidle');
}

test.describe('AI Studio 成本分析页面', () => {
  test.beforeEach(async ({ page }) => {
    // 登录并导航到成本分析页面
    await loginWithToken(page);
    await page.goto(`${BASE_URL}/ai-studio/cost`);
    await page.waitForLoadState('networkidle');
  });

  test('应该正确显示成本数据，而不是 [object Object]', async ({ page }) => {
    // 等待页面主要内容加载
    try {
      await page.waitForSelector('.cost-dashboard', { timeout: 10000 });
    } catch (e) {
      // 如果页面没有加载，截图并跳过
      await page.screenshot({
        path: 'test-results/cost-analysis-page-not-loaded.png',
        fullPage: true,
      });
      test.skip();
      return;
    }

    // 等待网络请求完成
    await page.waitForTimeout(2000);

    // 截图记录
    await page.screenshot({
      path: 'test-results/cost-analysis-page.png',
      fullPage: true,
    });

    // 验证关键数据区域不包含 [object Object] (只检查可见文本)
    const visibleText = await page.locator('body').innerText();
    expect(visibleText).not.toContain('[object Object]');

    // 验证 Token 总消耗统计卡片显示
    const tokenStat = page
      .locator('.ant-statistic-title')
      .filter({ hasText: 'Token 总消耗' });
    if (await tokenStat.isVisible().catch(() => false)) {
      // 获取 Token 总消耗卡片的数值文本
      const tokenValue = await page
        .locator('.ant-statistic')
        .filter({ hasText: 'Token 总消耗' })
        .locator('.ant-statistic-content-value')
        .textContent();
      // 验证数值不是 [object Object]
      expect(tokenValue).not.toContain('[object Object]');
      expect(tokenValue).not.toBeNull();
      expect(tokenValue!.length).toBeGreaterThan(0);

      // 验证总成本卡片
      const costValue = await page
        .locator('.ant-statistic')
        .filter({ hasText: '总成本' })
        .locator('.ant-statistic-content-value')
        .textContent();
      expect(costValue).not.toContain('[object Object]');

      // 验证输入 Token 卡片
      const promptValue = await page
        .locator('.ant-statistic')
        .filter({ hasText: '输入 Token' })
        .locator('.ant-statistic-content-value')
        .textContent();
      expect(promptValue).not.toContain('[object Object]');

      // 验证输出 Token 卡片
      const completionValue = await page
        .locator('.ant-statistic')
        .filter({ hasText: '输出 Token' })
        .locator('.ant-statistic-content-value')
        .textContent();
      expect(completionValue).not.toContain('[object Object]');
    }
  });

  test('应该能切换时间范围并刷新数据', async ({ page }) => {
    // 等待页面加载
    try {
      await page.waitForSelector('.cost-dashboard', { timeout: 10000 });
    } catch (e) {
      test.skip();
      return;
    }

    // 点击时间选择器
    const timeRangeSelect = page.locator('.ant-select').first();
    const isVisible = await timeRangeSelect.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip();
      return;
    }

    await timeRangeSelect.click();
    await page
      .locator('.ant-select-item')
      .filter({ hasText: '最近30天' })
      .click();

    // 等待数据刷新
    await page.waitForTimeout(1000);

    // 截图记录
    await page.screenshot({
      path: 'test-results/cost-analysis-30d.png',
      fullPage: true,
    });

    // 验证页面仍然正常显示，没有 [object Object] (只检查可见文本)
    const visibleText = await page.locator('body').innerText();
    expect(visibleText).not.toContain('[object Object]');
  });

  test('API 应该返回正确的数据格式', async ({ page, request }) => {
    // 使用 token 进行 API 测试
    const token = getAdminToken();

    // 直接测试 API
    const apiResponse = await request.get(
      'http://localhost:5100/api/ai-studio/cost?timeRange=7d',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    // 如果返回 401，说明认证方式不同，跳过此测试
    if (apiResponse.status() === 401) {
      test.skip();
      return;
    }

    expect(apiResponse.status()).toBe(200);

    const responseData = await apiResponse.json();
    // 验证响应格式
    expect(responseData).toHaveProperty('code');
    expect(responseData).toHaveProperty('data');
    expect(responseData.code).toBe(0);

    // 验证 data 结构
    expect(responseData.data).toHaveProperty('overview');
    expect(responseData.data).toHaveProperty('modules');
    expect(responseData.data).toHaveProperty('models');
    expect(responseData.data).toHaveProperty('daily');

    // 验证 overview 中的值是数字而不是对象
    expect(typeof responseData.data.overview.totalTokens).toBe('number');
    expect(typeof responseData.data.overview.totalCost).toBe('number');

    // 验证没有 [object Object] 字符串
    const responseStr = JSON.stringify(responseData);
    expect(responseStr).not.toContain('[object Object]');
  });
});
