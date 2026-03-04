import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5666';

/**
 * 完整的审批流程测试 - 从登录开始
 */
test.describe('审批流完整流程测试', () => {
  test('从登录到审批的完整流程', async ({ page }) => {
    const testReport: any[] = [];

    function log(step: string, status: 'success' | 'error' | 'warning', detail: string) {
      testReport.push({ step, status, detail, timestamp: new Date().toISOString() });
    }

    try {
      // ==================== 步骤 1: 访问登录页 ====================
      log('访问登录页', 'success', '开始访问登录页面');
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // 截图记录
      await page.screenshot({ path: '/root/member/test-screenshots/01-login-page.png' });

      const currentUrl = page.url();
      log('访问登录页', 'success', `当前 URL: ${currentUrl}`);

      // 检查是否在登录页
      const isLoginPage = currentUrl.includes('/login') ||
                          await page.locator('input[type="text"], input[type="password"]').count() > 0;

      if (!isLoginPage) {
        log('访问登录页', 'warning', '未跳转到登录页，可能已登录');
      }

      // ==================== 步骤 2: 登录 ====================
      log('用户登录', 'success', '开始登录流程');

      // 查找用户名和密码输入框
      const usernameInput = page.locator('input[placeholder*="用户名"], input[name="username"], input[type="text"]').first();
      const passwordInput = page.locator('input[placeholder*="密码"], input[name="password"], input[type="password"]').first();

      const usernameCount = await usernameInput.count();
      const passwordCount = await passwordInput.count();

      log('查找登录元素', 'success', `找到 ${usernameCount} 个用户名输入框，${passwordCount} 个密码输入框`);

      if (usernameCount > 0 && passwordCount > 0) {
        await usernameInput.fill('boss');
        await passwordInput.fill('123456');

        await page.screenshot({ path: '/root/member/test-screenshots/02-login-filled.png' });

        // 查找登录按钮
        const loginButton = page.locator('button:has-text("登录"), button[type="submit"]').first();
        const loginButtonCount = await loginButton.count();

        log('查找登录按钮', 'success', `找到 ${loginButtonCount} 个登录按钮`);

        if (loginButtonCount > 0) {
          await loginButton.click();
          log('点击登录按钮', 'success', '登录按钮已点击');

          // 等待登录完成
          await page.waitForTimeout(3000);
          await page.waitForLoadState('networkidle');

          await page.screenshot({ path: '/root/member/test-screenshots/03-after-login.png' });

          const afterLoginUrl = page.url();
          log('登录后跳转', 'success', `登录后 URL: ${afterLoginUrl}`);
        } else {
          log('查找登录按钮', 'error', '未找到登录按钮');
        }
      } else {
        log('查找登录元素', 'warning', '可能已经登录，跳过登录步骤');
      }

      // ==================== 步骤 3: 导航到审批任务页面 ====================
      log('导航到审批页', 'success', '开始导航到审批任务页面');

      await page.goto(`${BASE_URL}/education/paper/approval-tasks`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.screenshot({ path: '/root/member/test-screenshots/04-approval-tasks-page.png' });

      const approvalUrl = page.url();
      log('导航到审批页', 'success', `审批页 URL: ${approvalUrl}`);

      // ==================== 步骤 4: 检查页面元素 ====================
      log('检查页面元素', 'success', '开始检查审批页面元素');

      // 检查统计卡片
      const pendingCard = page.getByTestId('pending-count-card');
      const pendingCardVisible = await pendingCard.isVisible().catch(() => false);
      log('统计卡片-待审批', pendingCardVisible ? 'success' : 'error',
          pendingCardVisible ? '待审批卡片可见' : '待审批卡片不可见');

      const approvedCard = page.getByTestId('today-approved-card');
      const approvedCardVisible = await approvedCard.isVisible().catch(() => false);
      log('统计卡片-已审批', approvedCardVisible ? 'success' : 'error',
          approvedCardVisible ? '已审批卡片可见' : '已审批卡片不可见');

      // 检查筛选器
      const statusFilter = page.getByTestId('status-filter');
      const statusFilterVisible = await statusFilter.isVisible().catch(() => false);
      log('筛选器', statusFilterVisible ? 'success' : 'error',
          statusFilterVisible ? '状态筛选器可见' : '状态筛选器不可见');

      // 检查刷新按钮
      const refreshButton = page.getByTestId('refresh-button');
      const refreshButtonVisible = await refreshButton.isVisible().catch(() => false);
      log('刷新按钮', refreshButtonVisible ? 'success' : 'error',
          refreshButtonVisible ? '刷新按钮可见' : '刷新按钮不可见');

      // 检查任务表格
      const taskTable = page.getByTestId('approval-task-table');
      const taskTableVisible = await taskTable.isVisible().catch(() => false);
      log('任务表格', taskTableVisible ? 'success' : 'error',
          taskTableVisible ? '任务表格可见' : '任务表格不可见');

      await page.screenshot({ path: '/root/member/test-screenshots/05-elements-check.png' });

      // ==================== 步骤 5: 测试统计数据 ====================
      if (pendingCardVisible) {
        log('读取统计数据', 'success', '开始读取统计数据');

        const pendingText = await pendingCard.textContent();
        log('统计数据-待审批', 'success', `待审批内容: ${pendingText}`);

        const approvedText = await approvedCard.textContent();
        log('统计数据-已审批', 'success', `已审批内容: ${approvedText}`);
      }

      // ==================== 步骤 6: 测试筛选功能 ====================
      if (statusFilterVisible) {
        log('测试筛选功能', 'success', '开始测试状态筛选');

        await statusFilter.click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: '/root/member/test-screenshots/06-filter-dropdown.png' });

        // 选择"待审批"选项
        const pendingOption = page.getByTestId('status-option-PENDING');
        const pendingOptionVisible = await pendingOption.isVisible().catch(() => false);

        if (pendingOptionVisible) {
          await pendingOption.click();
          await page.waitForTimeout(1000);
          log('筛选功能-待审批', 'success', '已筛选待审批任务');

          await page.screenshot({ path: '/root/member/test-screenshots/07-filtered-pending.png' });
        } else {
          log('筛选功能-待审批', 'error', '未找到待审批选项');
        }
      }

      // ==================== 步骤 7: 测试刷新功能 ====================
      if (refreshButtonVisible) {
        log('测试刷新功能', 'success', '开始测试刷新按钮');

        await refreshButton.click();
        await page.waitForTimeout(1000);

        log('刷新功能', 'success', '刷新按钮已点击');
        await page.screenshot({ path: '/root/member/test-screenshots/08-after-refresh.png' });
      }

      // ==================== 步骤 8: 检查任务列表 ====================
      if (taskTableVisible) {
        log('检查任务列表', 'success', '开始检查任务列表');

        // 查找任务行
        const taskRows = page.locator('[data-testid^="approval-task-row-"]');
        const taskRowCount = await taskRows.count();

        log('任务列表', 'success', `找到 ${taskRowCount} 个任务`);

        if (taskRowCount > 0) {
          // 检查第一个任务的操作按钮
          const firstTaskId = await taskRows.first().getAttribute('data-testid');
          log('任务详情', 'success', `第一个任务 ID: ${firstTaskId}`);

          // 查找查看按钮
          const viewButton = page.locator(`[data-testid^="view-task-"]`).first();
          const viewButtonVisible = await viewButton.isVisible().catch(() => false);
          log('操作按钮-查看', viewButtonVisible ? 'success' : 'warning',
              viewButtonVisible ? '查看按钮可见' : '查看按钮不可见');

          // 查找审批按钮
          const approveButton = page.locator(`[data-testid^="approve-task-"]`).first();
          const approveButtonVisible = await approveButton.isVisible().catch(() => false);
          log('操作按钮-审批', approveButtonVisible ? 'success' : 'warning',
              approveButtonVisible ? '审批按钮可见' : '审批按钮不可见');

          // 查找拒绝按钮
          const rejectButton = page.locator(`[data-testid^="reject-task-"]`).first();
          const rejectButtonVisible = await rejectButton.isVisible().catch(() => false);
          log('操作按钮-拒绝', rejectButtonVisible ? 'success' : 'warning',
              rejectButtonVisible ? '拒绝按钮可见' : '拒绝按钮不可见');

          await page.screenshot({ path: '/root/member/test-screenshots/09-task-list.png' });

          // ==================== 步骤 9: 测试审批通过流程 ====================
          if (approveButtonVisible) {
            log('测试审批通过', 'success', '开始测试审批通过流程');

            await approveButton.click();
            await page.waitForTimeout(1000);

            await page.screenshot({ path: '/root/member/test-screenshots/10-approve-dialog.png' });

            // 检查审批对话框
            const approvalDialog = page.getByTestId('approval-dialog');
            const dialogVisible = await approvalDialog.isVisible().catch(() => false);

            if (dialogVisible) {
              log('审批对话框', 'success', '审批对话框已打开');

              // 填写审批意见
              const commentInput = page.getByTestId('approval-comment-input');
              const commentInputVisible = await commentInput.isVisible().catch(() => false);

              if (commentInputVisible) {
                await commentInput.fill('E2E 测试审批通过');
                log('填写审批意见', 'success', '审批意见已填写');
              }

              await page.screenshot({ path: '/root/member/test-screenshots/11-approve-filled.png' });

              // 查找确认按钮
              const confirmButton = approvalDialog.locator('button:has-text("确定"), button.ant-btn-primary').first();
              const confirmButtonVisible = await confirmButton.isVisible().catch(() => false);

              if (confirmButtonVisible) {
                await confirmButton.click();
                await page.waitForTimeout(2000);

                log('确认审批', 'success', '审批确认按钮已点击');
                await page.screenshot({ path: '/root/member/test-screenshots/12-after-approve.png' });

                // 检查是否有成功提示
                const successMessage = page.locator('.ant-message-success');
                const successVisible = await successMessage.isVisible().catch(() => false);
                log('审批结果', successVisible ? 'success' : 'warning',
                    successVisible ? '显示成功提示' : '未显示成功提示');
              } else {
                log('确认审批', 'error', '未找到确认按钮');
              }
            } else {
              log('审批对话框', 'error', '审批对话框未打开');
            }
          }
        } else {
          log('任务列表', 'warning', '任务列表为空');
        }
      }

      // ==================== 步骤 10: 检查其他菜单 ====================
      log('检查菜单导航', 'success', '开始检查其他菜单');

      // 检查是否有菜单栏
      const menuItems = page.locator('[role="menuitem"], .ant-menu-item');
      const menuCount = await menuItems.count();
      log('菜单导航', 'success', `找到 ${menuCount} 个菜单项`);

      await page.screenshot({ path: '/root/member/test-screenshots/13-menu-items.png' });

      // ==================== 保存测试报告 ====================
      const reportPath = '/root/member/test-screenshots/test-report.json';
      await page.evaluate((report) => {
        return report;
      }, testReport).then((report) => {
        require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
      });

      log('保存测试报告', 'success', `测试报告已保存到: ${reportPath}`);

    } catch (error: any) {
      log('测试执行', 'error', `测试执行出错: ${error.message}`);
      await page.screenshot({ path: '/root/member/test-screenshots/99-error.png' });
      throw error;
    }
  });
});
