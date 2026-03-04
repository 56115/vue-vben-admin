import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5666';
const STORAGE_PREFIX = 'vben-web-antd-5.5.9-dev';

function getAdminToken(): string {
  return jwt.sign(
    {
      sub: 1,
      username: 'boss',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    },
    'test-secret',
  );
}

test('调试审批页面', async ({ page }) => {
  // 设置认证
  const token = getAdminToken();
  const accessStore = {
    accessCodes: ['APPROVAL:PAPER_GRADING:APPROVE', 'approval:paper_grading:approve'],
    accessToken: token,
  };
  const userStore = {
    userId: 1,
    username: 'boss',
  };

  await page.goto(BASE_URL);
  await page.evaluate(
    ({ prefix, accessStore, userStore }) => {
      localStorage.setItem(`${prefix}__access-store__`, JSON.stringify(accessStore));
      localStorage.setItem(`${prefix}__user-store__`, JSON.stringify(userStore));
    },
    { prefix: STORAGE_PREFIX, accessStore, userStore },
  );

  // 导航到审批页面（新路由）
  await page.goto(`${BASE_URL}/approval/paper-grading`);
  await page.waitForLoadState('networkidle');

  // 等待一下让页面完全加载
  await page.waitForTimeout(3000);

  // 截图
  await page.screenshot({ path: '/root/member/debug-approval-page.png', fullPage: true });

  // 打印页面 HTML
  const html = await page.content();

  // 打印页面标题
  const title = await page.title();

  // 检查是否有错误
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  // 等待一下收集错误
  await page.waitForTimeout(2000);

  if (errors.length > 0) {
  }

  // 检查是否有审批相关的元素
  const bodyText = await page.locator('body').textContent();

  // 尝试查找表格
  const tableCount = await page.locator('table').count();

  // 尝试查找特定的 data-testid
  const taskTable = page.getByTestId('approval-task-table');
  const isVisible = await taskTable.isVisible().catch(() => false);

  // 如果不可见，打印当前 URL
  const currentUrl = page.url();

  // 检查 API 调用
  const apiCalls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) {
      apiCalls.push(`${request.method()} ${request.url()}`);
    }
  });
  page.on('response', async (response) => {
  });

  // 重新加载页面触发 API 调用
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

});
