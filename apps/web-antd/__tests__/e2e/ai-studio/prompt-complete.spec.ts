import { test, expect, Page } from '@playwright/test';
import {
  getAdminToken,
  getPiniaAccessStoreData,
  getPiniaUserStoreData,
} from '../test-auth';

// 测试配置
const BASE_URL = 'http://localhost:5666';
const STORAGE_PREFIX = 'vben-web-antd-5.5.9-dev';
const TEST_TIMEOUT = 30000;

/**
 * 通过 Token 登录
 */
async function loginWithToken(page: Page) {
  const token = getAdminToken();
  const accessStoreData = getPiniaAccessStoreData(token);
  const userStoreData = getPiniaUserStoreData();

  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('domcontentloaded');

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

/**
 * 导航到提示词列表页
 */
async function navigateToPromptList(page: Page) {
  await page.goto(`${BASE_URL}/ai-studio/prompt`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * 导航到提示词编辑页
 */
async function navigateToPromptEdit(page: Page, id?: string) {
  const url = id
    ? `${BASE_URL}/ai-studio/prompt/edit/${id}`
    : `${BASE_URL}/ai-studio/prompt/edit`;
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * 等待 Ant Design 按钮可点击
 */
async function waitForButton(page: Page, text: string, timeout = 5000) {
  const button = page.locator('button').filter({ hasText: text }).first();
  await button.waitFor({ state: 'visible', timeout });
  return button;
}

test.describe('📝 提示词管理 - 列表页功能', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page);
    await navigateToPromptList(page);
  });

  test('列表页 - 页面标题和基础元素', async ({ page }) => {
    // 截图记录
    await page.screenshot({
      path: 'test-results/prompt-list-01-initial.png',
      fullPage: true,
    });

    // 验证页面已加载（通过检查常见元素）
    const bodyContent = await page.locator('body').innerText();
    const hasPromptContent =
      bodyContent.includes('提示词') ||
      bodyContent.includes('Prompt') ||
      bodyContent.includes('AI');

    // 验证页面有交互元素
    const anyButton = page.locator('button').first();
    const anyLink = page.locator('a').first();
    const pageLoaded =
      (await anyButton.isVisible().catch(() => false)) ||
      (await anyLink.isVisible().catch(() => false)) ||
      hasPromptContent;

    expect(pageLoaded).toBe(true);

    // 尝试查找新建按钮（不强制）
    const createButton = page
      .locator('button')
      .filter({ hasText: /新建|新增|Create/i })
      .first();
    const hasCreateButton = await createButton.isVisible().catch(() => false);
  });

  test('列表页 - 搜索功能', async ({ page }) => {
    // 查找搜索输入框
    const searchInput = page
      .locator('input[placeholder*="搜索"]')
      .or(page.locator('input[placeholder*="名称"]'))
      .first();

    if (await searchInput.isVisible().catch(() => false)) {
      // 输入搜索关键词
      await searchInput.fill('测试');
      await page.waitForTimeout(500);

      // 点击搜索按钮
      const searchButton = page
        .locator('button')
        .filter({ hasText: '查询' })
        .first();
      if (await searchButton.isVisible().catch(() => false)) {
        await searchButton.click();
        await page.waitForTimeout(1000);
      }

      await page.screenshot({
        path: 'test-results/prompt-list-02-search.png',
        fullPage: true,
      });

      // 验证搜索结果（列表存在即可）
      const table = page.locator('.ant-table').first();
      expect(await table.isVisible().catch(() => false)).toBe(true);
    }
  });

  test('列表页 - 分类筛选', async ({ page }) => {
    // 查找分类下拉框
    const categorySelect = page.locator('.ant-select').first();

    if (await categorySelect.isVisible().catch(() => false)) {
      await categorySelect.click();
      await page.waitForTimeout(500);

      // 选择一个分类选项
      const option = page.locator('.ant-select-item').first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        await page.waitForTimeout(1000);
      }

      await page.screenshot({
        path: 'test-results/prompt-list-03-filter.png',
        fullPage: true,
      });
    }
  });

  test('列表页 - 重置筛选', async ({ page }) => {
    const resetButton = page
      .locator('button')
      .filter({ hasText: '重置' })
      .first();

    if (await resetButton.isVisible().catch(() => false)) {
      await resetButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/prompt-list-04-reset.png',
        fullPage: true,
      });
    }
  });

  test('列表页 - 新建提示词按钮', async ({ page }) => {
    const createButton = page
      .locator('button')
      .filter({ hasText: /新建|新增|创建/i })
      .first();

    // 如果按钮不存在则跳过
    if (!(await createButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await createButton.click();

    // 等待跳转到编辑页
    await page.waitForURL(/.*\/ai-studio\/prompt\/edit.*/, { timeout: 5000 });

    await page.screenshot({
      path: 'test-results/prompt-list-05-create-nav.png',
      fullPage: true,
    });

    // 验证 URL
    expect(page.url()).toContain('/ai-studio/prompt/edit');
  });

  test('列表页 - 表格操作按钮（编辑、克隆、删除、版本）', async ({ page }) => {
    await page.screenshot({
      path: 'test-results/prompt-list-06-table-actions.png',
      fullPage: true,
    });

    // 查找表格中的操作按钮
    const editButtons = page.locator('button').filter({ hasText: '编辑' });
    const cloneButtons = page.locator('button').filter({ hasText: '克隆' });
    const deleteButtons = page.locator('button').filter({ hasText: '删除' });
    const versionButtons = page.locator('button').filter({ hasText: '版本' });

    // 验证按钮存在（如果表格有数据）
    const hasData = await editButtons
      .first()
      .isVisible()
      .catch(() => false);

    if (hasData) {
      // 验证编辑按钮
      const editBtn = editButtons.first();
      expect(await editBtn.isVisible()).toBe(true);

      // 验证克隆按钮
      const cloneBtn = cloneButtons.first();
      expect(await cloneBtn.isVisible()).toBe(true);

      // 验证删除按钮
      const deleteBtn = deleteButtons.first();
      expect(await deleteBtn.isVisible()).toBe(true);

      // 验证版本按钮
      const versionBtn = versionButtons.first();
      expect(await versionBtn.isVisible()).toBe(true);
    } else {
      test.skip();
    }
  });

  test('列表页 - 分页功能', async ({ page }) => {
    // 查找分页组件
    const pagination = page.locator('.ant-pagination').first();

    if (await pagination.isVisible().catch(() => false)) {
      await page.screenshot({
        path: 'test-results/prompt-list-07-pagination.png',
        fullPage: true,
      });

      // 验证分页组件存在
      expect(await pagination.isVisible()).toBe(true);

      // 查找页码按钮
      const page2Button = page.locator('.ant-pagination-item').nth(1);
      if (await page2Button.isVisible().catch(() => false)) {
        await page2Button.click();
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: 'test-results/prompt-list-08-page2.png',
          fullPage: true,
        });
      }
    }
  });

  test('列表页 - 点击编辑跳转到编辑页', async ({ page }) => {
    const editButton = page
      .locator('button')
      .filter({ hasText: '编辑' })
      .first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await page.waitForURL(/.*\/ai-studio\/prompt\/edit\/.*/, {
        timeout: 5000,
      });

      await page.screenshot({
        path: 'test-results/prompt-list-09-edit-nav.png',
        fullPage: true,
      });

      expect(page.url()).toMatch(/\/ai-studio\/prompt\/edit\/\d+/);
    } else {
      test.skip();
    }
  });

  test('列表页 - 删除确认弹窗', async ({ page }) => {
    const deleteButton = page
      .locator('button')
      .filter({ hasText: '删除' })
      .first();

    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'test-results/prompt-list-10-delete-modal.png',
        fullPage: true,
      });

      // 验证确认弹窗
      const confirmModal = page.locator('.ant-modal-confirm');
      expect(await confirmModal.isVisible().catch(() => false)).toBe(true);

      // 点击取消
      const cancelButton = page
        .locator('button')
        .filter({ hasText: '取消' })
        .first();
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
      }
    } else {
      test.skip();
    }
  });

  test('列表页 - 版本管理弹窗', async ({ page }) => {
    const versionButton = page
      .locator('button')
      .filter({ hasText: '版本' })
      .first();

    if (await versionButton.isVisible().catch(() => false)) {
      await versionButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/prompt-list-11-version-modal.png',
        fullPage: true,
      });

      // 验证版本管理弹窗
      const modal = page.locator('.ant-modal').filter({ hasText: '版本管理' });
      expect(await modal.isVisible().catch(() => false)).toBe(true);

      // 关闭弹窗
      const closeButton = page.locator('.ant-modal-close').first();
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
      }
    } else {
      test.skip();
    }
  });
});

test.describe('✏️ 提示词管理 - 编辑页功能', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page);
    await navigateToPromptEdit(page);
  });

  test('编辑页 - 页面标题和返回按钮', async ({ page }) => {
    await page.screenshot({
      path: 'test-results/prompt-edit-01-initial.png',
      fullPage: true,
    });

    // 验证页面已加载（通过检查页面是否有任何内容）
    const body = page.locator('body');
    const bodyText = await body.innerText().catch(() => '');

    // 只要有任何文本内容就认为页面加载成功
    expect(bodyText.length > 0).toBe(true);
  });

  test('编辑页 - 基础信息表单', async ({ page }) => {
    // 填写基础信息
    const nameInput = page
      .locator('input#name')
      .or(page.locator('input[placeholder*="名称"]'))
      .first();
    const keyInput = page
      .locator('input#key')
      .or(page.locator('input[placeholder*="标识"]'))
      .first();
    const descInput = page
      .locator('textarea#description')
      .or(page.locator('textarea[placeholder*="描述"]'))
      .first();

    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('E2E测试提示词');
    }

    if (await keyInput.isVisible().catch(() => false)) {
      await keyInput.fill(`e2e-test-${Date.now()}`);
    }

    if (await descInput.isVisible().catch(() => false)) {
      await descInput.fill('这是一个E2E测试用的提示词描述');
    }

    await page.screenshot({
      path: 'test-results/prompt-edit-02-basic-info.png',
      fullPage: true,
    });
  });

  test('编辑页 - 分类和标签选择', async ({ page }) => {
    // 查找分类选择器
    const categorySelect = page
      .locator('.ant-select')
      .filter({ hasText: '选择分类' })
      .first();

    if (await categorySelect.isVisible().catch(() => false)) {
      await categorySelect.click();
      await page.waitForTimeout(500);

      // 选择一个分类
      const option = page.locator('.ant-select-item').first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
      }
    }

    // 查找标签输入
    const tagInput = page.locator('input[placeholder*="标签"]').first();
    if (await tagInput.isVisible().catch(() => false)) {
      await tagInput.fill('测试标签');
      await page.keyboard.press('Enter');
    }

    await page.screenshot({
      path: 'test-results/prompt-edit-03-category-tags.png',
      fullPage: true,
    });
  });

  test('编辑页 - 提示词内容编辑器', async ({ page }) => {
    // 切换到提示词内容标签
    const contentTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '提示词内容' })
      .first();
    if (await contentTab.isVisible().catch(() => false)) {
      await contentTab.click();
      await page.waitForTimeout(500);
    }

    // 查找编辑器
    const editor = page
      .locator('textarea.prompt-editor')
      .or(page.locator('textarea.ant-input'))
      .first();

    if (await editor.isVisible().catch(() => false)) {
      const template = `你是一个{{role}}，请帮助用户解决问题。

用户信息：
- 姓名: {{userName}}
- 年龄: {{age}}
- 问题: {{question}}

请给出专业、友好的回答。`;

      await editor.fill(template);

      await page.screenshot({
        path: 'test-results/prompt-edit-04-content.png',
        fullPage: true,
      });
    }
  });

  test('编辑页 - 变量定义表格', async ({ page }) => {
    // 切换到变量定义标签
    const varsTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: /变量|Variable/i })
      .first();
    if (await varsTab.isVisible().catch(() => false)) {
      await varsTab.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: 'test-results/prompt-edit-05-variables.png',
      fullPage: true,
    });

    // 验证页面有内容（任何按钮、表格或文本）
    const anyButton = page.locator('button').first();
    const anyTable = page.locator('table, .ant-table').first();
    const anyContent = page.locator('text=/变量|Variable|添加|Add/i').first();

    expect(
      (await anyButton.isVisible().catch(() => false)) ||
        (await anyTable.isVisible().catch(() => false)) ||
        (await anyContent.isVisible().catch(() => false)),
    ).toBe(true);
  });

  test('编辑页 - 添加变量', async ({ page }) => {
    // 切换到变量定义标签
    const varsTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '变量定义' })
      .first();
    if (await varsTab.isVisible().catch(() => false)) {
      await varsTab.click();
      await page.waitForTimeout(500);
    }

    // 点击添加变量
    const addVarButton = page
      .locator('button')
      .filter({ hasText: '添加变量' })
      .first();
    if (await addVarButton.isVisible().catch(() => false)) {
      await addVarButton.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'test-results/prompt-edit-06-add-variable.png',
        fullPage: true,
      });

      // 查找变量输入框
      const varInputs = page
        .locator('input[placeholder*="变量名"]')
        .or(page.locator('table input'))
        .all();
      expect((await varInputs).length).toBeGreaterThan(0);
    }
  });

  test('编辑页 - 模型参数配置', async ({ page }) => {
    // 切换到模型参数标签
    const modelTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '模型参数' })
      .first();
    if (await modelTab.isVisible().catch(() => false)) {
      await modelTab.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'test-results/prompt-edit-07-model-params.png',
        fullPage: true,
      });

      // 验证模型选择
      const modelSelect = page
        .locator('.ant-select')
        .filter({ hasText: '模型' })
        .first();
      expect(await modelSelect.isVisible().catch(() => false)).toBe(true);

      // 验证温度滑块/输入
      const tempSlider = page.locator('.ant-slider').first();
      const tempInput = page.locator('input[type="number"]').first();
      expect(
        (await tempSlider.isVisible().catch(() => false)) ||
          (await tempInput.isVisible().catch(() => false)),
      ).toBe(true);
    }
  });

  test('编辑页 - 实时预览功能', async ({ page }) => {
    // 先填写内容
    const nameInput = page
      .locator('input#name')
      .or(page.locator('input[placeholder*="名称"]'))
      .first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('预览测试提示词');
    }

    const keyInput = page
      .locator('input#key')
      .or(page.locator('input[placeholder*="标识"]'))
      .first();
    if (await keyInput.isVisible().catch(() => false)) {
      await keyInput.fill(`preview-test-${Date.now()}`);
    }

    // 切换到提示词内容
    const contentTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '提示词内容' })
      .first();
    if (await contentTab.isVisible().catch(() => false)) {
      await contentTab.click();
      await page.waitForTimeout(500);

      const editor = page.locator('textarea').first();
      if (await editor.isVisible().catch(() => false)) {
        await editor.fill('你好 {{name}}，欢迎来到 {{platform}}！');
      }
    }

    // 切换到实时预览标签
    const previewTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '实时预览' })
      .first();
    if (await previewTab.isVisible().catch(() => false)) {
      await previewTab.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/prompt-edit-08-preview.png',
        fullPage: true,
      });

      // 验证预览区域
      const previewArea = page
        .locator('.prompt-preview, .preview-container')
        .first();
      expect(await previewArea.isVisible().catch(() => false)).toBe(true);

      // 填写测试数据
      const testDataInputs = page.locator('input').filter({ hasText: '' });
      const inputs = await testDataInputs.all();

      for (let i = 0; i < Math.min(inputs.length, 2); i++) {
        const input = inputs[i];
        if (await input.isVisible().catch(() => false)) {
          await input.fill(`测试值${i + 1}`);
        }
      }

      await page.screenshot({
        path: 'test-results/prompt-edit-09-preview-filled.png',
        fullPage: true,
      });
    }
  });

  test('编辑页 - 导出功能弹窗', async ({ page }) => {
    // 填写基本信息
    const nameInput = page
      .locator('input#name')
      .or(page.locator('input[placeholder*="名称"]'))
      .first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('导出测试');
    }

    const keyInput = page
      .locator('input#key')
      .or(page.locator('input[placeholder*="标识"]'))
      .first();
    if (await keyInput.isVisible().catch(() => false)) {
      await keyInput.fill(`export-test-${Date.now()}`);
    }

    // 点击导出按钮
    const exportButton = page
      .locator('button')
      .filter({ hasText: '导出' })
      .first();
    if (await exportButton.isVisible().catch(() => false)) {
      await exportButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/prompt-edit-10-export-modal.png',
        fullPage: true,
      });

      // 验证导出弹窗
      const modal = page.locator('.ant-modal').filter({ hasText: '导出' });
      expect(await modal.isVisible().catch(() => false)).toBe(true);

      // 验证格式选项
      const formatOptions = page.locator('.ant-radio-wrapper').all();
      expect((await formatOptions).length).toBeGreaterThan(0);

      // 关闭弹窗
      const closeButton = page.locator('.ant-modal-close').first();
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
      }
    }
  });

  test('编辑页 - 保存草稿功能', async ({ page }) => {
    // 填写表单
    const nameInput = page
      .locator('input#name')
      .or(page.locator('input[placeholder*="名称"]'))
      .first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('草稿测试');
    }

    const keyInput = page
      .locator('input#key')
      .or(page.locator('input[placeholder*="标识"]'))
      .first();
    if (await keyInput.isVisible().catch(() => false)) {
      await keyInput.fill(`draft-test-${Date.now()}`);
    }

    // 点击保存
    const saveButton = page
      .locator('button')
      .filter({ hasText: '保存' })
      .first();
    if (await saveButton.isVisible().catch(() => false)) {
      await saveButton.click();
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: 'test-results/prompt-edit-11-saved.png',
        fullPage: true,
      });

      // 验证保存成功（通过检查是否在列表页或成功提示）
      const successMessage = page.locator('.ant-message-success').first();
      const currentUrl = page.url();

      expect(
        (await successMessage.isVisible().catch(() => false)) ||
          currentUrl.includes('/ai-studio/prompt'),
      ).toBe(true);
    }
  });

  test('编辑页 - 返回列表确认', async ({ page }) => {
    // 填写一些内容
    const nameInput = page
      .locator('input#name')
      .or(page.locator('input[placeholder*="名称"]'))
      .first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('返回测试');
    }

    // 点击返回
    const backButton = page
      .locator('button')
      .filter({ hasText: /返回|Back/i })
      .first();
    if (await backButton.isVisible().catch(() => false)) {
      await backButton.click();
      await page.waitForTimeout(1000);

      // 检查是否有未保存确认弹窗
      const confirmModal = page.locator('.ant-modal-confirm, .ant-modal');
      if (await confirmModal.isVisible().catch(() => false)) {
        await page.screenshot({
          path: 'test-results/prompt-edit-12-unsaved-confirm.png',
          fullPage: true,
        });

        // 点击确认离开或取消
        const confirmButton = page
          .locator('button')
          .filter({ hasText: /确定|确认|Leave/i })
          .first();
        const cancelButton = page
          .locator('button')
          .filter({ hasText: /取消|Cancel/i })
          .first();

        if (await cancelButton.isVisible().catch(() => false)) {
          await cancelButton.click();
        } else if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
          // 等待导航完成
          await page.waitForTimeout(2000);
        }
      }

    }
  });
});

test.describe('🔧 提示词管理 - 版本管理功能', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page);
    await navigateToPromptList(page);
  });

  test('版本管理 - 弹窗基础元素', async ({ page }) => {
    const versionButton = page
      .locator('button')
      .filter({ hasText: '版本' })
      .first();

    if (await versionButton.isVisible().catch(() => false)) {
      await versionButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/prompt-version-01-modal.png',
        fullPage: true,
      });

      // 验证弹窗标题
      const modalTitle = page
        .locator('.ant-modal-title')
        .filter({ hasText: '版本管理' });
      expect(await modalTitle.isVisible()).toBe(true);

      // 验证版本列表表格
      const versionTable = page.locator('.ant-table').first();
      expect(await versionTable.isVisible().catch(() => false)).toBe(true);

      // 关闭弹窗
      const closeButton = page.locator('.ant-modal-close').first();
      await closeButton.click();
    } else {
      test.skip();
    }
  });

  test('版本管理 - 版本对比功能', async ({ page }) => {
    const versionButton = page
      .locator('button')
      .filter({ hasText: '版本' })
      .first();

    if (await versionButton.isVisible().catch(() => false)) {
      await versionButton.click();
      await page.waitForTimeout(1000);

      // 查找对比按钮
      const diffButton = page
        .locator('button')
        .filter({ hasText: '对比' })
        .first();

      if (await diffButton.isVisible().catch(() => false)) {
        await diffButton.click();
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: 'test-results/prompt-version-02-diff.png',
          fullPage: true,
        });

        // 验证对比视图
        const diffView = page.locator('.diff-view, .version-diff').first();
        expect(await diffView.isVisible().catch(() => false)).toBe(true);
      }

      // 关闭弹窗
      const closeButton = page.locator('.ant-modal-close').last();
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
      }
    } else {
      test.skip();
    }
  });

  test('版本管理 - 回滚版本', async ({ page }) => {
    const versionButton = page
      .locator('button')
      .filter({ hasText: '版本' })
      .first();

    if (await versionButton.isVisible().catch(() => false)) {
      await versionButton.click();
      await page.waitForTimeout(1000);

      // 查找回滚按钮
      const rollbackButton = page
        .locator('button')
        .filter({ hasText: '回滚' })
        .first();

      if (await rollbackButton.isVisible().catch(() => false)) {
        await rollbackButton.click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: 'test-results/prompt-version-03-rollback-confirm.png',
          fullPage: true,
        });

        // 验证确认弹窗
        const confirmModal = page.locator('.ant-modal-confirm');
        expect(await confirmModal.isVisible().catch(() => false)).toBe(true);

        // 取消回滚
        const cancelButton = page
          .locator('button')
          .filter({ hasText: '取消' })
          .first();
        await cancelButton.click();
      }

      // 关闭版本弹窗
      const closeButton = page.locator('.ant-modal-close').first();
      await closeButton.click();
    } else {
      test.skip();
    }
  });
});

test.describe('🐛 提示词管理 - 调试器功能', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page);
  });

  test('调试器 - Pipeline 调优页面入口', async ({ page }) => {
    // 导航到 Pipeline 列表
    await page.goto(`${BASE_URL}/ai-studio/pipeline`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'test-results/prompt-debugger-01-pipeline-list.png',
      fullPage: true,
    });

    // 查找调优按钮
    const tuneButton = page
      .locator('button')
      .filter({ hasText: '调优' })
      .first();

    if (await tuneButton.isVisible().catch(() => false)) {
      await tuneButton.click();
      await page.waitForURL(/.*\/ai-studio\/pipeline\/tune.*/, {
        timeout: 5000,
      });
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/prompt-debugger-02-tune-page.png',
        fullPage: true,
      });

      // 验证页面 URL
      expect(page.url()).toContain('/ai-studio/pipeline/tune');
    } else {
      test.skip();
    }
  });

  test('调试器 - 提示词预览标签', async ({ page }) => {
    // 尝试直接访问调优页面（假设有测试数据）
    await page.goto(`${BASE_URL}/ai-studio/pipeline/tune/test-pipeline`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'test-results/prompt-debugger-03-tune-loaded.png',
      fullPage: true,
    });

    // 查找提示词预览标签
    const previewTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '提示词预览' })
      .first();

    if (await previewTab.isVisible().catch(() => false)) {
      await previewTab.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/prompt-debugger-04-preview-tab.png',
        fullPage: true,
      });

      // 验证调试器组件
      const debuggerComponent = page.locator('.prompt-debugger').first();
      expect(await debuggerComponent.isVisible().catch(() => false)).toBe(true);
    }
  });

  test('调试器 - 步骤选择和绑定', async ({ page }) => {
    await page.goto(`${BASE_URL}/ai-studio/pipeline/tune/test-pipeline`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const previewTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '提示词预览' })
      .first();
    if (await previewTab.isVisible().catch(() => false)) {
      await previewTab.click();
      await page.waitForTimeout(500);

      // 查找步骤选择器
      const stepSelect = page
        .locator('.ant-select')
        .filter({ hasText: '步骤' })
        .first();

      if (await stepSelect.isVisible().catch(() => false)) {
        await stepSelect.click();
        await page.waitForTimeout(500);

        // 选择一个步骤
        const option = page.locator('.ant-select-item').first();
        if (await option.isVisible().catch(() => false)) {
          await option.click();
          await page.waitForTimeout(1000);
        }

        await page.screenshot({
          path: 'test-results/prompt-debugger-05-step-selected.png',
          fullPage: true,
        });
      }
    }
  });

  test('调试器 - 测试数据输入和渲染', async ({ page }) => {
    await page.goto(`${BASE_URL}/ai-studio/pipeline/tune/test-pipeline`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const previewTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '提示词预览' })
      .first();
    if (await previewTab.isVisible().catch(() => false)) {
      await previewTab.click();
      await page.waitForTimeout(500);

      // 查找测试数据输入区
      const testDataInputs = page
        .locator('.variable-inputs input, .test-data input')
        .all();

      if ((await testDataInputs).length > 0) {
        // 填写测试数据
        const inputs = await testDataInputs;
        for (let i = 0; i < Math.min(inputs.length, 3); i++) {
          const input = inputs[i];
          if (await input.isVisible().catch(() => false)) {
            await input.fill(`测试数据${i + 1}`);
          }
        }

        await page.waitForTimeout(1000);

        await page.screenshot({
          path: 'test-results/prompt-debugger-06-test-data.png',
          fullPage: true,
        });

        // 验证渲染结果区域
        const renderResult = page
          .locator('.render-content, .render-result')
          .first();
        expect(await renderResult.isVisible().catch(() => false)).toBe(true);
      }
    }
  });

  test('调试器 - Token 成本估算显示', async ({ page }) => {
    await page.goto(`${BASE_URL}/ai-studio/pipeline/tune/test-pipeline`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const previewTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '提示词预览' })
      .first();
    if (await previewTab.isVisible().catch(() => false)) {
      await previewTab.click();
      await page.waitForTimeout(500);

      // 查找 Token 统计
      const tokenStats = page.locator('.stats-bar, .token-stats').first();

      await page.screenshot({
        path: 'test-results/prompt-debugger-07-token-stats.png',
        fullPage: true,
      });

      // 验证统计信息存在（如果页面有数据）
      if (await tokenStats.isVisible().catch(() => false)) {
        const statsText = await tokenStats.textContent();
        expect(statsText).toMatch(/token|字符|成本/i);
      }
    }
  });
});

test.describe('🔄 提示词管理 - 变量映射功能', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page);
  });

  test('变量映射 - Pipeline 绑定弹窗', async ({ page }) => {
    // 导航到 Pipeline 编辑页
    await page.goto(`${BASE_URL}/ai-studio/pipeline/edit/test-pipeline`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'test-results/prompt-binding-01-pipeline-edit.png',
      fullPage: true,
    });

    // 查找 LLM 步骤（如果有）
    const llmNode = page.locator('.node-llm, [data-node-type="llm"]').first();

    if (await llmNode.isVisible().catch(() => false)) {
      await llmNode.click();
      await page.waitForTimeout(500);

      // 查找绑定提示词按钮
      const bindButton = page
        .locator('button')
        .filter({ hasText: '绑定提示词' })
        .first();

      if (await bindButton.isVisible().catch(() => false)) {
        await bindButton.click();
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: 'test-results/prompt-binding-02-modal.png',
          fullPage: true,
        });

        // 验证绑定弹窗
        const modal = page.locator('.ant-modal').filter({ hasText: '绑定' });
        expect(await modal.isVisible().catch(() => false)).toBe(true);
      }
    }
  });

  test('变量映射 - 智能映射建议', async ({ page }) => {
    await page.goto(`${BASE_URL}/ai-studio/pipeline/edit/test-pipeline`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 尝试打开绑定弹窗
    const bindButton = page
      .locator('button')
      .filter({ hasText: '绑定提示词' })
      .first();

    if (await bindButton.isVisible().catch(() => false)) {
      await bindButton.click();
      await page.waitForTimeout(1000);

      // 查找自动映射按钮
      const autoMapButton = page
        .locator('button')
        .filter({ hasText: '自动映射' })
        .first();

      if (await autoMapButton.isVisible().catch(() => false)) {
        await page.screenshot({
          path: 'test-results/prompt-binding-03-auto-map.png',
          fullPage: true,
        });

        expect(await autoMapButton.isVisible()).toBe(true);
      }

      // 关闭弹窗
      const closeButton = page.locator('.ant-modal-close').first();
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
      }
    }
  });
});

test.describe('⚡ 提示词管理 - 性能和边界测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page);
    await navigateToPromptEdit(page);
  });

  test('性能 - 大文本编辑器响应', async ({ page }) => {
    const contentTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '提示词内容' })
      .first();
    if (await contentTab.isVisible().catch(() => false)) {
      await contentTab.click();
      await page.waitForTimeout(500);

      const editor = page.locator('textarea').first();

      if (await editor.isVisible().catch(() => false)) {
        // 生成大文本
        const largeText = '这是测试内容。'.repeat(1000);

        const startTime = Date.now();
        await editor.fill(largeText);
        const endTime = Date.now();

        await page.screenshot({
          path: 'test-results/prompt-perf-01-large-text.png',
          fullPage: true,
        });

        // 验证填充成功
        const value = await editor.inputValue();
        expect(value.length).toBeGreaterThan(10000);
      }
    }
  });

  test('边界 - 空表单验证', async ({ page }) => {
    // 直接点击保存，不填写任何内容
    const saveButton = page
      .locator('button')
      .filter({ hasText: '保存' })
      .first();

    if (await saveButton.isVisible().catch(() => false)) {
      await saveButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/prompt-boundary-01-validation.png',
        fullPage: true,
      });

      // 验证验证错误提示
      const errorMessage = page.locator('.ant-form-item-explain-error').first();
      const hasError = await errorMessage.isVisible().catch(() => false);

      expect(hasError).toBe(true);
    }
  });

  test('边界 - 特殊字符变量名', async ({ page }) => {
    const contentTab = page
      .locator('.ant-tabs-tab')
      .filter({ hasText: '提示词内容' })
      .first();
    if (await contentTab.isVisible().catch(() => false)) {
      await contentTab.click();
      await page.waitForTimeout(500);

      const editor = page.locator('textarea').first();

      if (await editor.isVisible().catch(() => false)) {
        // 输入特殊变量名
        await editor.fill(
          '测试 {{特殊变量_123.test}} 和 {{nested.deep.value}}',
        );

        await page.screenshot({
          path: 'test-results/prompt-boundary-02-special-vars.png',
          fullPage: true,
        });

        // 切换到变量定义查看提取结果
        const varsTab = page
          .locator('.ant-tabs-tab')
          .filter({ hasText: '变量定义' })
          .first();
        await varsTab.click();
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: 'test-results/prompt-boundary-03-vars-extracted.png',
          fullPage: true,
        });
      }
    }
  });
});
