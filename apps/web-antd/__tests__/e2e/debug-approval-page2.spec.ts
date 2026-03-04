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

test('调试审批页面 - 捕获错误', async ({ page }) => {
  // 收集所有日志
  const consoleLogs: string[] = [];
  const errors: string[] = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    consoleLogs.push(`[${type}] ${text}`);
  });

  page.on('pageerror', (error) => {
    const errorMsg = error.message;
    errors.push(errorMsg);
  });

  page.on('requestfailed', (request) => {
  });

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
  try {
    await page.goto(`${BASE_URL}/approval/paper-grading`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
  } catch (e: any) {
  }

  // 等待一下让页面完全加载
  await page.waitForTimeout(5000);

  // 检查路由是否正确
  const currentUrl = page.url();

  // 检查是否有错误信息显示
  const errorMessages = await page.locator('.ant-message-error, .ant-alert-error').allTextContents();
  if (errorMessages.length > 0) {
  }

  // 检查页面主体内容
  const bodyText = await page.locator('body').textContent();

  // 检查是否有 404 或其他错误页面
  const pageText = bodyText || '';
  if (pageText.includes('404') || pageText.includes('Not Found') || pageText.includes('找不到')) {
  }

  // 打印所有收集的错误
  if (errors.length > 0) {
  }

  // 检查 localStorage 是否设置成功
  const storedData = await page.evaluate((prefix) => {
    const access = localStorage.getItem(`${prefix}__access-store__`);
    const user = localStorage.getItem(`${prefix}__user-store__`);
    return { access: access ? JSON.parse(access) : null, user: user ? JSON.parse(user) : null };
  }, STORAGE_PREFIX);

});
