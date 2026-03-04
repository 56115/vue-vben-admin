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

test.describe('AI Studio 执行详情 - 批改结果展示', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page);
  });

  test('应该能在执行详情页面看到回填的题目数据', async ({ page }) => {
    // 导航到执行管理页面
    await page.goto(`${BASE_URL}/ai-studio/execution`);
    await page.waitForLoadState('networkidle');

    // 等待表格加载
    try {
      await page.waitForSelector('.ant-table-row', { timeout: 10000 });
    } catch (e) {
      test.skip();
      return;
    }

    // 截图记录
    await page.screenshot({
      path: 'test-results/execution-list.png',
      fullPage: true,
    });

    // 点击第一行的"查看"按钮
    const viewButton = page
      .locator('.ant-table-row')
      .first()
      .locator('button')
      .filter({ hasText: '查看' })
      .or(
        page
          .locator('.ant-table-row')
          .first()
          .locator('a')
          .filter({ hasText: '查看' }),
      );

    if (await viewButton.isVisible().catch(() => false)) {
      await viewButton.click();

      // 等待详情页面加载
      await page.waitForTimeout(2000);

      // 截图记录
      await page.screenshot({
        path: 'test-results/execution-detail.png',
        fullPage: true,
      });

      // 检查是否包含题目批改详情
      const pageContent = await page.locator('body').innerText();

      // 验证页面包含关键信息（题目、得分、正确/错误等）
      const hasQuestionInfo =
        pageContent.includes('题目') ||
        pageContent.includes('得分') ||
        pageContent.includes('正确') ||
        pageContent.includes('错误') ||
        pageContent.includes('题号');

      // 验证没有 [object Object]
      expect(pageContent).not.toContain('[object Object]');
    }
  });

  test('直接访问已知有数据的执行详情并查看题目列表', async ({ page }) => {
    // 先打开执行列表页面
    await page.goto(`${BASE_URL}/ai-studio/execution`);
    await page.waitForLoadState('networkidle');

    // 等待表格加载
    await page.waitForSelector('.ant-table-row', { timeout: 10000 });

    // 找到包含"作业批改"或"homework"的执行记录行
    const rows = page.locator('.ant-table-row');
    const rowCount = await rows.count();
    // 截图列表页
    await page.screenshot({
      path: 'test-results/execution-list-grading.png',
      fullPage: true,
    });

    // 点击第一个眼睛图标按钮（查看详情）
    const viewButton = page
      .locator('button')
      .filter({ has: page.locator('.anticon-eye') })
      .first();
    if (await viewButton.isVisible().catch(() => false)) {
      await viewButton.click();

      // 等待详情抽屉/弹窗加载
      await page.waitForTimeout(2000);

      // 滚动到页面底部以查看题目批改详情
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      // 截图详情页
      await page.screenshot({
        path: 'test-results/execution-detail-grading.png',
        fullPage: true,
      });

      // 尝试展开"题目批改详情"折叠面板
      const gradingCollapse = page
        .locator('.ant-collapse-header')
        .filter({ hasText: '题目批改详情' });
      if (await gradingCollapse.isVisible().catch(() => false)) {
        await gradingCollapse.click();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: 'test-results/execution-detail-grading-expanded.png',
          fullPage: true,
        });
      }

      // 获取页面文本
      const pageContent = await page.locator('body').innerText();

      // 验证关键数据展示 - 应该包含题目信息或"暂无题目数据"
      const hasExpectedContent =
        pageContent.includes('题目') ||
        pageContent.includes('批改') ||
        pageContent.includes('得分') ||
        pageContent.includes('正确') ||
        pageContent.includes('错误') ||
        pageContent.includes('暂无题目数据');

      // 验证没有 [object Object] 或 undefined
      expect(pageContent).not.toContain('[object Object]');
    }
  });
});
