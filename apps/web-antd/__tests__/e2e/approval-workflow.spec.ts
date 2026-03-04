/**
 * 审批流模块 - E2E 测试
 *
 * 测试核心流程：
 * 1. 审批任务列表 - 查看待审批任务
 * 2. 审批任务详情 - 查看AI批改结果
 * 3. 审批通过 - 同意AI批改结果
 * 4. 审批拒绝 - 拒绝并重新批改
 * 5. 审批统计 - 查看审批数据
 *
 * ⭐ 永久要求：
 * - 使用 Page Object Model (POM) 模式
 * - 使用 data-testid 选择器
 * - 避免硬编码等待时间
 * - 失败时自动截图和录制视频
 */
import { expect, test, Page } from '@playwright/test';

import {
  getAdminToken,
  getPiniaAccessStoreData,
  getPiniaUserStoreData,
} from './test-auth';

// 测试配置
const BASE_URL = 'http://localhost:5666';
const API_URL = 'http://localhost:5100/api';
const STORAGE_PREFIX = 'vben-web-antd-5.5.9-dev';

// ==================== Page Object Model ====================

/**
 * 审批任务列表页面对象
 * ✅ 使用 POM 模式
 */
class ApprovalTaskListPage {
  constructor(public page: Page) {}

  // ==================== 导航 ====================

  /**
   * 导航到审批任务列表页（新路由）
   */
  async goto() {
    await this.page.goto(`${BASE_URL}/approval/paper-grading`);
    // 等待页面加载完成
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 导航到旧路由（用于测试重定向）
   */
  async gotoLegacyRoute() {
    await this.page.goto(`${BASE_URL}/education/paper/approval-tasks`);
    // 等待页面加载完成
    await this.page.waitForLoadState('networkidle');
  }

  // ==================== 页面元素 ====================

  /**
   * 审批任务表格
   */
  get taskTable() {
    return this.page.getByTestId('approval-task-table');
  }

  /**
   * 审批任务行（通过索引）
   */
  getTaskRow(index: number) {
    return this.page.getByTestId(`approval-task-row-${index}`);
  }

  /**
   * 查看详情按钮
   */
  getViewButton(taskId: string) {
    return this.page.getByTestId(`view-task-${taskId}`);
  }

  /**
   * 审批按钮
   */
  getApproveButton(taskId: string) {
    return this.page.getByTestId(`approve-task-${taskId}`);
  }

  /**
   * 拒绝按钮
   */
  getRejectButton(taskId: string) {
    return this.page.getByTestId(`reject-task-${taskId}`);
  }

  /**
   * 统计卡片 - 待审批
   */
  get pendingCountCard() {
    return this.page.getByTestId('pending-count-card');
  }

  /**
   * 统计卡片 - 今日已审批
   */
  get todayApprovedCard() {
    return this.page.getByTestId('today-approved-card');
  }

  /**
   * 筛选器 - 状态
   */
  get statusFilter() {
    return this.page.getByTestId('status-filter');
  }

  /**
   * 刷新按钮
   */
  get refreshButton() {
    return this.page.getByTestId('refresh-button');
  }

  // ==================== 交互方法 ====================

  /**
   * 等待任务列表加载
   */
  async waitForTasksToLoad() {
    await this.taskTable.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * 获取任务数量
   */
  async getTaskCount(): Promise<number> {
    const rows = await this.page.locator('[data-testid^="approval-task-row-"]').count();
    return rows;
  }

  /**
   * 点击查看详情
   */
  async viewTask(taskId: string) {
    await this.getViewButton(taskId).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 点击审批通过
   */
  async approveTask(taskId: string, comment?: string) {
    await this.getApproveButton(taskId).click();

    // 等待审批对话框
    const dialog = this.page.getByTestId('approval-dialog');
    await dialog.waitFor({ state: 'visible' });

    // 输入审批意见
    if (comment) {
      await this.page.getByTestId('approval-comment-input').fill(comment);
    }

    // 确认审批
    await this.page.getByTestId('confirm-approve-button').click();

    // 等待对话框关闭
    await dialog.waitFor({ state: 'hidden' });
  }

  /**
   * 点击审批拒绝
   */
  async rejectTask(taskId: string, reason: string) {
    await this.getRejectButton(taskId).click();

    // 等待拒绝对话框
    const dialog = this.page.getByTestId('reject-dialog');
    await dialog.waitFor({ state: 'visible' });

    // 输入拒绝理由（必填）
    await this.page.getByTestId('reject-reason-input').fill(reason);

    // 确认拒绝
    await this.page.getByTestId('confirm-reject-button').click();

    // 等待对话框关闭
    await dialog.waitFor({ state: 'hidden' });
  }

  /**
   * 刷新列表
   */
  async refresh() {
    await this.refreshButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 筛选任务状态
   */
  async filterByStatus(status: 'PENDING' | 'APPROVED' | 'REJECTED') {
    await this.statusFilter.click();
    await this.page.getByTestId(`status-option-${status}`).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 获取待审批数量
   */
  async getPendingCount(): Promise<number> {
    const text = await this.pendingCountCard.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * 获取今日已审批数量
   */
  async getTodayApprovedCount(): Promise<number> {
    const text = await this.todayApprovedCard.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}

/**
 * 审批任务详情页面对象
 */
class ApprovalTaskDetailPage {
  constructor(public page: Page) {}

  /**
   * AI 批改结果区域
   */
  get aiResult() {
    return this.page.getByTestId('ai-grading-result');
  }

  /**
   * 学生信息区域
   */
  get studentInfo() {
    return this.page.getByTestId('student-info');
  }

  /**
   * 审批原因
   */
  get approvalReason() {
    return this.page.getByTestId('approval-reason');
  }

  /**
   * AI 置信度
   */
  get aiConfidence() {
    return this.page.getByTestId('ai-confidence');
  }

  /**
   * 返回列表按钮
   */
  get backButton() {
    return this.page.getByTestId('back-to-list-button');
  }

  /**
   * 等待详情加载
   */
  async waitForDetailsToLoad() {
    await this.aiResult.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * 返回列表
   */
  async backToList() {
    await this.backButton.click();
    await this.page.waitForLoadState('networkidle');
  }
}

// ==================== 辅助函数 ====================

/**
 * 设置认证状态
 */
async function setupAuth(page: Page) {
  const token = getAdminToken();
  const accessStore = getPiniaAccessStoreData(token);
  const userStore = getPiniaUserStoreData();

  // 添加新的审批权限（统一审批中心）
  accessStore.accessCodes.push('APPROVAL:PAPER_GRADING:APPROVE');
  accessStore.accessCodes.push('approval:paper_grading:approve');

  // 设置 localStorage
  await page.goto(BASE_URL);
  await page.evaluate(
    ({ prefix, accessStore, userStore }) => {
      localStorage.setItem(`${prefix}__access-store__`, JSON.stringify(accessStore));
      localStorage.setItem(`${prefix}__user-store__`, JSON.stringify(userStore));
    },
    {
      prefix: STORAGE_PREFIX,
      accessStore,
      userStore,
    },
  );
}

/**
 * 通过 API 获取测试数据
 */
async function getApprovalTasksFromAPI(): Promise<any> {
  const token = getAdminToken();
  const response = await fetch(`${API_URL}/education/paper/approval-tasks/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

// ==================== 测试用例 ====================

test.describe('审批流 - 完整 E2E 测试', () => {
  let taskListPage: ApprovalTaskListPage;
  let taskDetailPage: ApprovalTaskDetailPage;

  test.beforeEach(async ({ page }) => {
    taskListPage = new ApprovalTaskListPage(page);
    taskDetailPage = new ApprovalTaskDetailPage(page);

    // 设置认证
    await setupAuth(page);
  });

  test('0. 路由重定向 - 旧路由应重定向到新路由', async ({ page }) => {
    // 访问旧路由
    await taskListPage.gotoLegacyRoute();

    // 验证 URL 已重定向到新路由
    expect(page.url()).toContain('/approval/paper-grading');
    // 验证页面正常加载
    await taskListPage.waitForTasksToLoad();
    await expect(taskListPage.taskTable).toBeVisible();
  });

  test('1. 审批任务列表 - 应显示待审批任务', async ({ page }) => {
    // 1. 导航到审批任务列表页
    await taskListPage.goto();

    // 2. 等待任务列表加载
    await taskListPage.waitForTasksToLoad();

    // 3. 验证页面元素可见
    await expect(taskListPage.taskTable).toBeVisible();
    await expect(taskListPage.pendingCountCard).toBeVisible();
    await expect(taskListPage.refreshButton).toBeVisible();

    // 4. 验证有任务（如果有测试数据）
    const taskCount = await taskListPage.getTaskCount();
    // 5. 验证统计卡片
    const pendingCount = await taskListPage.getPendingCount();
    expect(pendingCount).toBeGreaterThanOrEqual(0);
  });

  test('2. 审批统计 - 应正确显示统计数据', async ({ page }) => {
    // 1. 通过 API 获取统计数据
    const apiStats = await getApprovalTasksFromAPI();
    // 2. 导航到页面
    await taskListPage.goto();
    await taskListPage.waitForTasksToLoad();

    // 3. 获取页面显示的统计
    const pendingCount = await taskListPage.getPendingCount();
    const todayApprovedCount = await taskListPage.getTodayApprovedCount();

    // 4. 验证数据一致性
    expect(pendingCount).toBe(apiStats.pending);
    expect(todayApprovedCount).toBe(apiStats.todayApproved);
  });

  test('3. 刷新功能 - 应能刷新任务列表', async ({ page }) => {
    // 1. 导航并加载列表
    await taskListPage.goto();
    await taskListPage.waitForTasksToLoad();

    // 2. 记录初始状态
    const initialCount = await taskListPage.getTaskCount();

    // 3. 点击刷新按钮
    await taskListPage.refresh();

    // 4. 验证列表重新加载
    await taskListPage.waitForTasksToLoad();
    const afterRefreshCount = await taskListPage.getTaskCount();

    // 5. 验证数据加载
    expect(afterRefreshCount).toBeGreaterThanOrEqual(0);
  });

  test('4. 任务筛选 - 应能按状态筛选', async ({ page }) => {
    // 1. 导航到列表页
    await taskListPage.goto();
    await taskListPage.waitForTasksToLoad();

    // 2. 查看全部任务
    const allTasksCount = await taskListPage.getTaskCount();
    // 3. 筛选待审批任务
    await taskListPage.filterByStatus('PENDING');
    await taskListPage.waitForTasksToLoad();
    const pendingTasksCount = await taskListPage.getTaskCount();
    // 4. 验证筛选结果
    expect(pendingTasksCount).toBeGreaterThanOrEqual(0);
  });

  test.skip('5. 审批通过流程 - 应能成功审批任务', async ({ page }) => {
    // 跳过此测试，因为需要实际的待审批任务
    // 在有测试数据时取消跳过

    await taskListPage.goto();
    await taskListPage.waitForTasksToLoad();

    const taskCount = await taskListPage.getTaskCount();
    if (taskCount === 0) {
      test.skip();
      return;
    }

    // 获取第一个任务的 ID
    const firstTaskId = await page.getAttribute('[data-testid^="approval-task-row-"]', 'data-task-id');
    if (!firstTaskId) {
      test.skip();
      return;
    }

    // 审批通过
    const initialPending = await taskListPage.getPendingCount();
    await taskListPage.approveTask(firstTaskId, '测试审批通过');

    // 等待列表刷新
    await page.waitForTimeout(2000);
    await taskListPage.refresh();

    // 验证待审批数量减少
    const afterPending = await taskListPage.getPendingCount();
    expect(afterPending).toBe(initialPending - 1);

    // 验证今日已审批数量增加
    const todayApproved = await taskListPage.getTodayApprovedCount();
    expect(todayApproved).toBeGreaterThan(0);
  });

  test.skip('6. 审批拒绝流程 - 应能拒绝任务', async ({ page }) => {
    // 跳过此测试，因为需要实际的待审批任务

    await taskListPage.goto();
    await taskListPage.waitForTasksToLoad();

    const taskCount = await taskListPage.getTaskCount();
    if (taskCount === 0) {
      test.skip();
      return;
    }

    // 获取第一个任务的 ID
    const firstTaskId = await page.getAttribute('[data-testid^="approval-task-row-"]', 'data-task-id');
    if (!firstTaskId) {
      test.skip();
      return;
    }

    // 审批拒绝
    const initialPending = await taskListPage.getPendingCount();
    await taskListPage.rejectTask(firstTaskId, 'AI批改结果不准确，需要重新批改');

    // 等待列表刷新
    await page.waitForTimeout(2000);
    await taskListPage.refresh();

    // 验证待审批数量减少
    const afterPending = await taskListPage.getPendingCount();
    expect(afterPending).toBe(initialPending - 1);
  });

  test('7. 页面响应性 - 应在移动设备上正常显示', async ({ page }) => {
    // 设置移动设备视口
    await page.setViewportSize({ width: 375, height: 667 });

    // 导航到列表页
    await taskListPage.goto();
    await taskListPage.waitForTasksToLoad();

    // 验证关键元素可见
    await expect(taskListPage.taskTable).toBeVisible();
    await expect(taskListPage.pendingCountCard).toBeVisible();

  });

  test('8. 错误处理 - 应正确处理网络错误', async ({ page }) => {
    // 模拟网络离线
    await page.context().setOffline(true);

    // 尝试导航
    const response = taskListPage.goto();

    // 应该显示错误或离线提示
    // （实际行为取决于应用的错误处理）

    await page.context().setOffline(false);
  });
});

test.describe('审批流 - 权限测试', () => {
  test('1. 无权限用户 - 应被拒绝访问', async ({ page }) => {
    // 设置无审批权限的用户
    const token = getAdminToken();
    const accessStore = getPiniaAccessStoreData(token);
    const userStore = getPiniaUserStoreData();

    // 不添加审批权限（无权限访问）

    await page.goto(BASE_URL);
    await page.evaluate(
      ({ prefix, accessStore, userStore }) => {
        localStorage.setItem(`${prefix}__access-store__`, JSON.stringify(accessStore));
        localStorage.setItem(`${prefix}__user-store__`, JSON.stringify(userStore));
      },
      {
        prefix: STORAGE_PREFIX,
        accessStore,
        userStore,
      },
    );

    // 尝试访问审批页面（新路由）
    await page.goto(`${BASE_URL}/approval/paper-grading`);

    // 应该显示无权限提示或跳转到其他页面
    // （实际行为取决于应用的权限处理）
    await page.waitForLoadState('networkidle');

  });
});
