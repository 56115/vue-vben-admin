/**
 * 素材库 (Material Library) E2E 测试
 *
 * 测试页面: /messaging/material
 *
 * 验证要点：
 * - 页面正常加载
 * - 素材列表正确显示
 * - 网格/列表视图切换
 * - 批量选择功能
 * - 筛选面板工作正常
 * - 素材详情抽屉打开
 * - 分类树加载
 */

import { expect, test } from '@playwright/test';
import {
  getAdminToken,
  getPiniaAccessStoreData,
  getPiniaUserStoreData,
} from './test-auth';

// 测试配置
const BASE_URL = 'http://localhost:5666';
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * 设置测试认证
 */
async function setupAuth(page: any) {
  const token = getAdminToken();

  await page.addInitScript(
    (data: any) => {
      localStorage.setItem(
        'VBEN_ACCESS_STORE',
        JSON.stringify(data.accessStore),
      );
      localStorage.setItem('VBEN_USER_STORE', JSON.stringify(data.userStore));
    },
    {
      accessStore: getPiniaAccessStoreData(token),
      userStore: getPiniaUserStoreData(),
    },
  );
}

/**
 * Mock 素材库 API 响应
 */
async function mockMaterialApi(page: any) {
  // Mock 素材列表
  await page.route(
    `${API_BASE_URL}/messaging/material*`,
    async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              name: '测试文本素材',
              description: '这是一个测试素材',
              type: 'TEXT',
              content: '测试内容文本',
              categoryId: null,
              categoryName: null,
              tags: ['测试', '产品'],
              viewCount: 10,
              usageCount: 5,
              likeCount: 3,
              status: 'ACTIVE',
              isPublic: true,
              createdBy: 1,
              createdAt: '2025-01-15T10:00:00Z',
              updatedAt: '2025-01-15T10:00:00Z',
            },
            {
              id: 2,
              name: '图片素材示例',
              description: '图片测试',
              type: 'IMAGE',
              content: null,
              mediaUrls: ['https://example.com/test.jpg'],
              categoryId: 1,
              categoryName: '产品图片',
              tags: ['图片', '展示'],
              viewCount: 25,
              usageCount: 12,
              likeCount: 8,
              status: 'ACTIVE',
              isPublic: true,
              createdBy: 1,
              createdAt: '2025-01-14T09:00:00Z',
              updatedAt: '2025-01-14T09:00:00Z',
            },
          ],
          total: 2,
        }),
      });
    },
  );

  // Mock 分类树
  await page.route(
    `${API_BASE_URL}/messaging/material/categories/tree`,
    async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            name: '产品图片',
            parentId: null,
            sort: 1,
            materialCount: 5,
            children: [],
          },
          {
            id: 2,
            name: '营销文案',
            parentId: null,
            sort: 2,
            materialCount: 3,
            children: [],
          },
        ]),
      });
    },
  );
}

test.describe('素材库页面', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockMaterialApi(page);
    await page.goto(`${BASE_URL}/messaging/material`);
    await page.waitForLoadState('networkidle');
  });

  test('页面正常加载并显示标题', async ({ page }) => {
    // 验证页面标题
    await expect(page.locator('.sidebar-title')).toContainText('素材分类');

    // 验证工具栏按钮存在
    await expect(page.locator('text=新建素材')).toBeVisible();
    await expect(page.locator('text=导入/导出')).toBeVisible();
    await expect(page.locator('text=数据统计')).toBeVisible();
  });

  test('素材列表正确显示', async ({ page }) => {
    // 等待素材卡片加载
    await page.waitForSelector('.material-card', { timeout: 5000 });

    // 验证素材卡片数量
    const cards = page.locator('.material-card');
    await expect(cards).toHaveCount(2);

    // 验证第一个素材的名称
    await expect(page.locator('.material-name').first()).toContainText(
      '测试文本素材',
    );

    // 验证素材类型标签
    await expect(page.locator('.material-card').first()).toContainText(
      '测试内容文本',
    );
  });

  test('网格/列表视图切换', async ({ page }) => {
    // 默认应该是网格视图
    await expect(page.locator('.material-grid')).toBeVisible();

    // 点击列表视图按钮
    await page.click('text=列表');

    // 验证列表视图显示
    await expect(page.locator('.material-list')).toBeVisible();
    await expect(page.locator('.material-list-item')).toHaveCount(2);

    // 切换回网格视图
    await page.click('text=卡片');
    await expect(page.locator('.material-grid')).toBeVisible();
  });

  test('批量选择功能', async ({ page }) => {
    // 点击批量选择按钮
    await page.click('text=批量选择');

    // 验证选择框出现
    await expect(
      page.locator('.material-card__checkbox').first(),
    ).toBeVisible();

    // 选择第一个素材
    await page.locator('.material-card__checkbox').first().click();

    // 验证批量工具栏出现
    await expect(page.locator('.batch-toolbar')).toBeVisible();
    await expect(page.locator('.batch-toolbar')).toContainText('已选择 1 项');
  });

  test('筛选面板工作正常', async ({ page }) => {
    // 验证筛选面板存在
    await expect(page.locator('.filter-panel')).toBeVisible();

    // 验证搜索框
    await expect(
      page.locator('input[placeholder="搜索素材名称/内容"]'),
    ).toBeVisible();

    // 验证类型筛选
    await expect(page.locator('.filter-row .ant-select').first()).toBeVisible();

    // 输入搜索关键词
    await page.fill('input[placeholder="搜索素材名称/内容"]', '测试');
    await page.click('text=筛选');

    // 等待筛选结果
    await page.waitForTimeout(500);
  });

  test('分类树加载和选择', async ({ page }) => {
    // 验证分类树存在
    await expect(page.locator('.ant-tree')).toBeVisible();

    // 验证分类名称显示
    await expect(page.locator('.ant-tree')).toContainText('产品图片');
    await expect(page.locator('.ant-tree')).toContainText('营销文案');

    // 点击分类
    await page.click('text=产品图片');

    // 等待筛选应用
    await page.waitForTimeout(500);
  });

  test('素材详情抽屉打开', async ({ page }) => {
    // 等待素材卡片加载
    await page.waitForSelector('.material-card', { timeout: 5000 });

    // 点击第一个素材
    await page.locator('.material-card').first().click();

    // 验证抽屉打开
    await expect(page.locator('.ant-drawer')).toBeVisible();
    await expect(page.locator('.ant-drawer-title')).toContainText('素材详情');

    // 验证素材信息显示
    await expect(page.locator('.material-title')).toContainText('测试文本素材');

    // 关闭抽屉
    await page.click('.ant-drawer-close');
    await expect(page.locator('.ant-drawer')).not.toBeVisible();
  });

  test('新建素材弹窗', async ({ page }) => {
    // 点击新建素材按钮
    await page.click('text=新建素材');

    // 验证弹窗打开
    await expect(page.locator('.ant-modal')).toBeVisible();
    await expect(page.locator('.ant-modal-title')).toContainText('新建素材');

    // 验证表单字段
    await expect(
      page.locator('input[placeholder="输入素材名称"]'),
    ).toBeVisible();

    // 关闭弹窗
    await page.click('.ant-modal-close');
  });

  test('导入/导出弹窗', async ({ page }) => {
    // 点击导入/导出按钮
    await page.click('text=导入/导出');

    // 验证弹窗打开
    await expect(page.locator('.ant-modal')).toBeVisible();

    // 验证 Tab 存在
    await expect(page.locator('text=导入素材')).toBeVisible();
    await expect(page.locator('text=导出素材')).toBeVisible();

    // 关闭弹窗
    await page.click('.ant-modal-close');
  });
});
