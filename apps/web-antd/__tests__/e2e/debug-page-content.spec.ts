import { test } from '@playwright/test';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:5666';

test('调试页面内容', async ({ page }) => {
  // 访问首页
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const homeUrl = page.url();

  const homeHtml = await page.content();
  fs.writeFileSync('/root/member/test-screenshots/home-page.html', homeHtml);

  const homeText = await page.locator('body').textContent();

  // 访问审批页
  await page.goto(`${BASE_URL}/education/paper/approval-tasks`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const approvalUrl = page.url();

  const approvalHtml = await page.content();
  fs.writeFileSync('/root/member/test-screenshots/approval-page.html', approvalHtml);

  const approvalText = await page.locator('body').textContent();

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

  await page.reload();
  await page.waitForTimeout(2000);

  if (errors.length > 0) {
  }

  // 检查页面中是否包含特定文本
  const bodyText = await page.locator('body').textContent() || '';

  // 检查所有可见的表格
  const tables = page.locator('table');
  const tableCount = await tables.count();

  // 检查所有按钮
  const buttons = page.locator('button');
  const buttonCount = await buttons.count();

  // 截图
  await page.screenshot({
    path: '/root/member/test-screenshots/debug-full-page.png',
    fullPage: true,
  });
});
