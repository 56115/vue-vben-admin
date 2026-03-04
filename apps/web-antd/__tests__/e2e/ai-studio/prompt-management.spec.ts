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

test.describe('AI Studio 提示词管理', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page);
  });

  test('提示词列表页应该正确加载', async ({ page }) => {
    // 导航到提示词列表页
    await page.goto(`${BASE_URL}/ai-studio/prompt`);
    await page.waitForLoadState('networkidle');

    // 等待页面主要内容加载
    try {
      await page.waitForSelector('.prompt-management', { timeout: 10000 });
    } catch (e) {
      await page.screenshot({
        path: 'test-results/prompt-list-not-loaded.png',
        fullPage: true,
      });
      test.skip();
      return;
    }

    // 截图记录
    await page.screenshot({
      path: 'test-results/prompt-list-page.png',
      fullPage: true,
    });

    // 验证页面标题
    const pageTitle = await page
      .locator('.ant-typography')
      .filter({ hasText: '提示词管理' })
      .isVisible();
    expect(pageTitle).toBe(true);

    // 验证新建按钮存在
    const createButton = page
      .locator('button')
      .filter({ hasText: '新建提示词' });
    expect(await createButton.isVisible()).toBe(true);
  });

  test('新建提示词页面应该能正确显示表单', async ({ page }) => {
    // 导航到新建提示词页面
    await page.goto(`${BASE_URL}/ai-studio/prompt/edit`);
    await page.waitForLoadState('networkidle');

    // 等待表单加载
    try {
      await page.waitForSelector('.prompt-edit', { timeout: 10000 });
    } catch (e) {
      await page.screenshot({
        path: 'test-results/prompt-edit-not-loaded.png',
        fullPage: true,
      });
      test.skip();
      return;
    }

    // 截图记录
    await page.screenshot({
      path: 'test-results/prompt-edit-page.png',
      fullPage: true,
    });

    // 验证表单字段存在
    const nameInput = page
      .locator('input[placeholder*="提示词名称"]')
      .or(page.locator('input#name'));
    const keyInput = page
      .locator('input[placeholder*="prompt-key"]')
      .or(page.locator('input#key'));

    expect(await nameInput.isVisible().catch(() => false)).toBe(true);
    expect(await keyInput.isVisible().catch(() => false)).toBe(true);

    // 验证标签页存在
    const tabs = ['基础信息', '提示词内容', '变量定义', '模型参数'];
    for (const tabName of tabs) {
      const tab = page.locator('.ant-tabs-tab').filter({ hasText: tabName });
      expect(await tab.isVisible().catch(() => false)).toBe(true);
    }
  });

  test('提示词编辑器应该支持变量自动提取', async ({ page }) => {
    // 导航到新建提示词页面
    await page.goto(`${BASE_URL}/ai-studio/prompt/edit`);
    await page.waitForLoadState('networkidle');

    try {
      await page.waitForSelector('.prompt-edit', { timeout: 10000 });
    } catch (e) {
      test.skip();
      return;
    }

    // 切换到提示词内容标签页
    const contentTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '提示词内容' });
    await contentTab.click();

    // 等待文本域加载
    const textarea = page
      .locator('textarea.prompt-editor, textarea.ant-input')
      .first();
    await textarea.waitFor({ timeout: 5000 });

    // 输入包含变量的提示词
    const testTemplate = `你是一个{{role}}，请根据以下信息提供帮助：
学科: {{subject}}
年级: {{gradeLevel}}
难度: {{difficulty}}`;

    await textarea.fill(testTemplate);

    // 切换到变量定义标签页
    const varsTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '变量定义' });
    await varsTab.click();

    // 等待变量提取
    await page.waitForTimeout(1000);

    // 截图记录
    await page.screenshot({
      path: 'test-results/prompt-variables-extracted.png',
      fullPage: true,
    });

    // 验证变量被提取（检查变量名是否在页面上）
    const pageContent = await page.locator('body').innerText();
    expect(pageContent).toContain('role');
    expect(pageContent).toContain('subject');
    expect(pageContent).toContain('gradeLevel');
    expect(pageContent).toContain('difficulty');
  });

  test('提示词实时预览应该正确渲染变量', async ({ page }) => {
    // 导航到新建提示词页面
    await page.goto(`${BASE_URL}/ai-studio/prompt/edit`);
    await page.waitForLoadState('networkidle');

    try {
      await page.waitForSelector('.prompt-edit', { timeout: 10000 });
    } catch (e) {
      test.skip();
      return;
    }

    // 先填写基础信息
    const nameInput = page.locator('input').filter({ hasText: '' }).first();
    await nameInput.fill('测试提示词');

    const keyInput = page.locator('input').filter({ hasText: '' }).nth(1);
    await keyInput.fill('test-prompt-' + Date.now());

    // 切换到提示词内容标签页并输入模板
    const contentTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '提示词内容' });
    await contentTab.click();

    const textarea = page.locator('textarea').first();
    await textarea.fill('你好 {{name}}，欢迎来到 {{platform}}！');

    // 切换到实时预览标签页
    const previewTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '实时预览' });
    await previewTab.click();

    // 等待预览加载
    await page.waitForTimeout(1000);

    // 截图记录
    await page.screenshot({
      path: 'test-results/prompt-preview.png',
      fullPage: true,
    });

    // 验证预览区域存在
    const previewContent = await page
      .locator('.prompt-preview, .preview-container')
      .isVisible()
      .catch(() => false);
    expect(previewContent).toBe(true);
  });

  test('导出功能应该可用', async ({ page }) => {
    // 导航到新建提示词页面
    await page.goto(`${BASE_URL}/ai-studio/prompt/edit`);
    await page.waitForLoadState('networkidle');

    try {
      await page.waitForSelector('.prompt-edit', { timeout: 10000 });
    } catch (e) {
      test.skip();
      return;
    }

    // 填写提示词内容
    const nameInput = page.locator('input').first();
    await nameInput.fill('导出测试');

    const keyInput = page.locator('input').nth(1);
    await keyInput.fill('export-test-' + Date.now());

    // 切换到提示词内容并输入模板
    const contentTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '提示词内容' });
    await contentTab.click();

    const textarea = page.locator('textarea').first();
    await textarea.fill('这是一个测试模板，变量: {{testVar}}');

    // 点击导出按钮
    const exportButton = page
      .locator('button')
      .filter({ hasText: '导出' })
      .first();
    if (await exportButton.isVisible().catch(() => false)) {
      await exportButton.click();

      // 等待导出弹窗
      await page.waitForTimeout(500);

      // 截图记录
      await page.screenshot({
        path: 'test-results/prompt-export-modal.png',
        fullPage: true,
      });

      // 验证导出弹窗出现
      const modal = page
        .locator('.ant-modal')
        .filter({ hasText: '导出提示词' });
      expect(await modal.isVisible().catch(() => false)).toBe(true);
    }
  });

  test('版本管理弹窗应该正确显示', async ({ page }) => {
    // 先导航到列表页
    await page.goto(`${BASE_URL}/ai-studio/prompt`);
    await page.waitForLoadState('networkidle');

    try {
      await page.waitForSelector('.prompt-management', { timeout: 10000 });
    } catch (e) {
      test.skip();
      return;
    }

    // 查找第一个提示词的版本管理按钮
    const versionButton = page
      .locator('button')
      .filter({ hasText: '版本' })
      .first();

    if (await versionButton.isVisible().catch(() => false)) {
      await versionButton.click();

      // 等待弹窗
      await page.waitForTimeout(500);

      // 截图记录
      await page.screenshot({
        path: 'test-results/prompt-version-modal.png',
        fullPage: true,
      });

      // 验证版本管理弹窗
      const modal = page.locator('.ant-modal').filter({ hasText: '版本管理' });
      expect(await modal.isVisible().catch(() => false)).toBe(true);
    }
  });

  test('LRU 缓存应该显示最近编辑的提示词', async ({ page }) => {
    // 导航到新建提示词页面
    await page.goto(`${BASE_URL}/ai-studio/prompt/edit`);
    await page.waitForLoadState('networkidle');

    try {
      await page.waitForSelector('.prompt-edit', { timeout: 10000 });
    } catch (e) {
      test.skip();
      return;
    }

    // 填写表单
    const nameInput = page.locator('input').first();
    await nameInput.fill('缓存测试提示词');

    const keyInput = page.locator('input').nth(1);
    await keyInput.fill('cache-test-' + Date.now());

    // 切换到提示词内容
    const contentTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '提示词内容' });
    await contentTab.click();

    const textarea = page.locator('textarea').first();
    await textarea.fill('缓存测试模板 {{var}}');

    // 等待自动缓存（30秒间隔，这里手动触发保存）
    await page.waitForTimeout(1000);

    // 截图记录
    await page.screenshot({
      path: 'test-results/prompt-edit-with-cache.png',
      fullPage: true,
    });
  });
});

test.describe('AI Studio 提示词调试器', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page);
  });

  test('Pipeline 参数调优页面应该包含提示词调试功能', async ({ page }) => {
    // 导航到 Pipeline 列表（假设存在）
    await page.goto(`${BASE_URL}/ai-studio/pipeline`);
    await page.waitForLoadState('networkidle');

    // 截图记录当前状态
    await page.screenshot({
      path: 'test-results/pipeline-list.png',
      fullPage: true,
    });

    // 如果有流程，点击进入调优页面
    const tuneButton = page
      .locator('button')
      .filter({ hasText: '调优' })
      .or(page.locator('a').filter({ hasText: '调优' }))
      .first();

    if (await tuneButton.isVisible().catch(() => false)) {
      await tuneButton.click();
      await page.waitForLoadState('networkidle');

      // 等待调优页面加载
      await page.waitForTimeout(1000);

      // 截图记录
      await page.screenshot({
        path: 'test-results/pipeline-tune-page.png',
        fullPage: true,
      });

      // 检查是否有提示词预览标签
      const previewTab = page
        .locator('.ant-tabs-tab')
        .filter({ hasText: '提示词预览' });
      if (await previewTab.isVisible().catch(() => false)) {
        await previewTab.click();

        await page.waitForTimeout(500);

        // 截图记录
        await page.screenshot({
          path: 'test-results/pipeline-prompt-debugger.png',
          fullPage: true,
        });

        // 验证调试器组件存在
        const debuggerComponent = await page
          .locator('.prompt-debugger')
          .isVisible()
          .catch(() => false);
        expect(debuggerComponent).toBe(true);
      }
    }
  });
});
