/**
 * 批改详情页面数据诊断 E2E 测试（完整认证版）
 *
 * 目的：诊断批改详情页面数据显示为0的问题
 */
import { expect, test } from '@playwright/test';

import {
  getAdminToken,
  getPiniaAccessStoreData,
  getPiniaUserStoreData,
} from './test-auth';

const BASE_URL = 'http://172.20.3.190:5666';
const STORAGE_PREFIX = 'vben-web-antd-5.5.9-dev';

test.use({ headless: true });

test('诊断批改详情页面数据问题', async ({ page }) => {
  // 1. 捕获 API 响应
  let apiData: any = null;

  page.on('response', async (response) => {
    if (response.url().includes('/education/paper/grade/296')) {
      try {
        apiData = await response.json();
        console.log('\n✅ API Response captured:');
        console.log('  Status:', response.status());
        console.log('  Data:', JSON.stringify(apiData, null, 2));
      } catch (error) {
        console.error('❌ Failed to parse API response:', error);
      }
    }
  });

  // 2. 登录并设置完整的认证信息
  const adminToken = getAdminToken();
  const accessStoreData = getPiniaAccessStoreData(adminToken);
  const userStoreData = getPiniaUserStoreData();

  await page.goto(BASE_URL);

  // 设置 localStorage（完整的认证信息）
  await page.evaluate(
    ({ token, prefix, accessData, userData }) => {
      localStorage.setItem(`${prefix}-access-token`, token);
      localStorage.setItem('pinia-store-access', JSON.stringify(accessData));
      localStorage.setItem('pinia-store-user', JSON.stringify(userData));
    },
    {
      token: adminToken,
      prefix: STORAGE_PREFIX,
      accessData: accessStoreData,
      userData: userStoreData,
    },
  );

  console.log('✅ Authentication data set');

  // 3. 访问详情页
  await page.goto(`${BASE_URL}/ai-tutor/grading/296`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // 4. 输出诊断结果
  console.log('\n📋 诊断结果:');
  console.log('='.repeat(60));

  if (!apiData) {
    console.log('❌ 未捕获到 API 响应');
    console.log('   可能原因:');
    console.log('   - 认证失败，页面跳转到了登录页');
    console.log('   - API 路径错误');
    console.log('   - 网络请求被拦截');
  } else {
    console.log('✅ API 返回数据:');
    console.log('  recordId:', apiData.recordId);
    console.log('  totalQuestions:', apiData.totalQuestions);
    console.log('  correctCount:', apiData.correctCount);
    console.log('  totalScore:', apiData.totalScore);
    console.log('  maxScore:', apiData.maxScore);
    console.log('  accuracy:', apiData.accuracy);
    console.log('  status:', apiData.status);

    if (apiData.totalQuestions === 0 && apiData.correctCount === 0) {
      console.log('\n⚠️  API 返回的数据确实是0');
      console.log('   可能原因:');
      console.log('   - 数据库中该记录的数据就是0');
      console.log('   - 批改任务未完成或失败');
      console.log('   - 批改流程中断');
    } else {
      console.log('\n✅ API 返回的数据正常');
      console.log('   问题可能在前端显示层');
    }
  }

  console.log('='.repeat(60));

  // 5. 截图
  await page.screenshot({
    path: 'test-results/grading-296.png',
    fullPage: true,
  });
  console.log('\n📸 截图: test-results/grading-296.png');

  // 6. 断言
  expect(apiData).toBeTruthy();
});
