import { test } from '@playwright/test';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:5666';

test('诊断 Vue 应用挂载问题', async ({ page }) => {
  const diagnostics: any = {
    console: { logs: [], warnings: [], errors: [] },
    network: { requests: [], failed: [] },
    localStorage: {},
    errors: [],
  };

  // 捕获所有控制台消息
  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();

    if (type === 'error') {
      diagnostics.console.errors.push(text);
    } else if (type === 'warning') {
      diagnostics.console.warnings.push(text);
    } else if (type === 'log' || type === 'info') {
      diagnostics.console.logs.push(text);
    }
  });

  // 捕获页面错误
  page.on('pageerror', (error) => {
    diagnostics.errors.push({
      message: error.message,
      stack: error.stack,
    });
  });

  // 捕获网络请求
  page.on('request', (request) => {
    diagnostics.network.requests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
    });
  });

  page.on('requestfailed', (request) => {
    diagnostics.network.failed.push({
      url: request.url(),
      error: request.failure()?.errorText || 'Unknown error',
    });
  });

  // 访问首页
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 检查 Vue 应用是否挂载
  const appMounted = await page.evaluate(() => {
    const app = document.getElementById('app');
    return {
      exists: !!app,
      hasChildren: app ? app.children.length > 0 : false,
      innerHTML: app ? app.innerHTML.substring(0, 200) : '',
      classList: app ? Array.from(app.classList) : [],
    };
  });

  diagnostics.appMounted = appMounted;

  // 检查 localStorage
  const localStorageData = await page.evaluate(() => {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            // 尝试解析 JSON
            try {
              data[key] = JSON.parse(value);
            } catch {
              data[key] = value.substring(0, 100);
            }
          }
        } catch (e: any) {
          data[key] = `Error: ${e.message}`;
        }
      }
    }
    return data;
  });

  diagnostics.localStorage = localStorageData;

  // 检查是否有 Vue 实例
  const vueInfo = await page.evaluate(() => {
    return {
      hasVue: typeof (window as any).__VUE__ !== 'undefined',
      hasVueDevtools: typeof (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined',
      hasApp: typeof (window as any).__APP__ !== 'undefined',
      windowKeys: Object.keys(window).filter((k) => k.includes('VUE') || k.includes('vue') || k.includes('APP')),
    };
  });

  diagnostics.vueInfo = vueInfo;

  // 检查路由
  const routerInfo = await page.evaluate(() => {
    return {
      currentUrl: window.location.href,
      pathname: window.location.pathname,
      hash: window.location.hash,
      search: window.location.search,
    };
  });

  diagnostics.routerInfo = routerInfo;

  // 等待更长时间，看是否有延迟加载
  await page.waitForTimeout(5000);

  const appMountedAfterWait = await page.evaluate(() => {
    const app = document.getElementById('app');
    return app ? app.children.length > 0 : false;
  });

  // 访问审批页面
  await page.goto(`${BASE_URL}/education/paper/approval-tasks`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const approvalPageMounted = await page.evaluate(() => {
    const app = document.getElementById('app');
    return {
      hasChildren: app ? app.children.length > 0 : false,
      innerHTML: app ? app.innerHTML.substring(0, 200) : '',
    };
  });

  diagnostics.approvalPageMounted = approvalPageMounted;

  // 检查是否有任何 Vue 组件实例
  const componentCheck = await page.evaluate(() => {
    const elements = document.querySelectorAll('[data-v-*], [class*="v-"], .vue-component');
    return {
      vueElementsCount: elements.length,
      sampleElements: Array.from(elements).slice(0, 5).map((el) => ({
        tagName: el.tagName,
        classList: Array.from(el.classList).slice(0, 3),
      })),
    };
  });

  diagnostics.componentCheck = componentCheck;

  // 保存完整诊断报告
  fs.writeFileSync(
    '/root/member/test-screenshots/vue-diagnostics.json',
    JSON.stringify(diagnostics, null, 2)
  );

});
