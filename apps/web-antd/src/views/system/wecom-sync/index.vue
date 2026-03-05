<template>
  <Page title="数据同步" description="从企业微信同步员工和客户数据">
    <!-- 顶部统计卡片 -->
    <Row :gutter="16" class="mb-6">
      <Col :span="8">
        <div class="stats-card">
          <div class="stats-icon">
            <UserOutlined class="text-blue-500" />
          </div>
          <div class="stats-info">
            <div class="stats-label">已同步员工</div>
            <div class="stats-value">
              {{ syncStats.users.total }}
              <span class="text-sm text-gray-400">人</span>
            </div>
            <div class="stats-time" v-if="syncStats.users.lastSyncAt">
              最后同步: {{ formatTime(syncStats.users.lastSyncAt) }}
            </div>
          </div>
        </div>
      </Col>
      <Col :span="8">
        <div class="stats-card">
          <div class="stats-icon">
            <TeamOutlined class="text-purple-500" />
          </div>
          <div class="stats-info">
            <div class="stats-label">已同步客户</div>
            <div class="stats-value">
              {{ syncStats.customers.total }}
              <span class="text-sm text-gray-400">人</span>
            </div>
            <div class="stats-time" v-if="syncStats.customers.lastSyncAt">
              最后同步: {{ formatTime(syncStats.customers.lastSyncAt) }}
            </div>
          </div>
        </div>
      </Col>
      <Col :span="8">
        <div class="stats-card">
          <div class="stats-icon">
            <LinkOutlined class="text-cyan-500" />
          </div>
          <div class="stats-info">
            <div class="stats-label">跟进关系</div>
            <div class="stats-value">
              {{ syncStats.customers.relations }}
              <span class="text-sm text-gray-400">条</span>
            </div>
            <div class="stats-time" v-if="syncStats.customers.lastSyncAt">
              更新时间: {{ formatTime(syncStats.customers.lastSyncAt) }}
            </div>
          </div>
        </div>
      </Col>
    </Row>

    <!-- 同步操作卡片 -->
    <Card class="sync-card">
      <template #title>
        <div class="card-header">
          <div class="card-title">
            <SyncOutlined class="mr-2" />
            同步操作
          </div>
        </div>
      </template>

      <Alert
        v-if="!syncStats.isConfigured"
        type="warning"
        message="企业微信未配置"
        description="请先在企业微信配置页面完成配置"
        show-icon
        class="mb-4"
      />

      <Alert
        v-else-if="!syncStats.isEnabled"
        type="warning"
        message="企业微信未启用"
        description="请在企业微信配置页面启用集成"
        show-icon
        class="mb-4"
      />

      <div class="sync-actions">
        <div class="sync-action-item">
          <div class="action-info">
            <UserOutlined class="action-icon text-blue-500" />
            <div>
              <div class="action-title">同步员工</div>
              <div class="action-desc">从企微拉取通讯录中的员工和部门信息</div>
            </div>
          </div>
          <Button
            size="large"
            :loading="syncingUsers"
            :disabled="!syncStats.isConfigured || !syncStats.isEnabled"
            @click="handleSyncUsers"
          >
            <template #icon><SyncOutlined /></template>
            立即同步
          </Button>
        </div>

        <Divider class="my-4" />

        <div class="sync-action-item">
          <div class="action-info">
            <TeamOutlined class="action-icon text-purple-500" />
            <div>
              <div class="action-title">同步客户</div>
              <div class="action-desc">
                从企微拉取外部联系人（客户）及跟进关系
              </div>
            </div>
          </div>
          <Button
            size="large"
            :loading="syncingCustomers"
            :disabled="!syncStats.isConfigured || !syncStats.isEnabled"
            @click="handleSyncCustomers"
          >
            <template #icon><SyncOutlined /></template>
            立即同步
          </Button>
        </div>

        <Divider class="my-4" />

        <div class="sync-action-item">
          <div class="action-info">
            <CloudSyncOutlined class="action-icon text-green-500" />
            <div>
              <div class="action-title">全量同步</div>
              <div class="action-desc">
                一键同步所有员工和客户数据（推荐首次使用）
              </div>
            </div>
          </div>
          <Button
            type="primary"
            size="large"
            :loading="syncingAll"
            :disabled="!syncStats.isConfigured || !syncStats.isEnabled"
            @click="handleSyncAll"
          >
            <template #icon><SyncOutlined /></template>
            全量同步
          </Button>
        </div>
      </div>

      <!-- 同步进度显示 -->
      <div v-if="syncProgress" class="sync-progress mt-4">
        <div class="progress-header">
          <span class="progress-title">{{ syncProgress.title }}</span>
          <span class="progress-percent">{{ syncProgress.percent }}%</span>
        </div>
        <Progress
          :percent="syncProgress.percent"
          :status="
            syncProgress.status === 'failed'
              ? 'exception'
              : syncProgress.status === 'completed'
                ? 'success'
                : 'active'
          "
          :stroke-color="{ from: '#108ee9', to: '#87d068' }"
        />
        <div class="progress-info">
          <span v-if="syncProgress.total">
            已处理: {{ syncProgress.processed || 0 }} / {{ syncProgress.total }}
          </span>
          <span v-else>正在准备...</span>
        </div>
      </div>

      <Alert
        v-if="lastSyncResult"
        :type="lastSyncResult.success ? 'success' : 'error'"
        :message="lastSyncResult.message"
        show-icon
        closable
        class="mt-4"
        @close="lastSyncResult = null"
      />
    </Card>

    <!-- 同步说明 -->
    <Card class="help-card mt-6">
      <template #title>
        <div class="help-title">
          <InfoCircleOutlined class="mr-2" />
          同步说明
        </div>
      </template>

      <div class="notice-list">
        <div class="notice-item">
          <ClockCircleOutlined class="notice-icon" />
          <span>首次同步可能需要较长时间，请耐心等待</span>
        </div>
        <div class="notice-item">
          <SafetyCertificateOutlined class="notice-icon" />
          <span>同步操作是安全的，不会删除任何数据</span>
        </div>
        <div class="notice-item">
          <ReloadOutlined class="notice-icon" />
          <span>增量同步只会更新变化的数据，推荐定期执行</span>
        </div>
        <div class="notice-item">
          <ThunderboltOutlined class="notice-icon" />
          <span>配置回调后，客户数据可自动实时同步</span>
        </div>
      </div>
    </Card>
  </Page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  message,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Divider,
  Progress,
} from 'ant-design-vue';
import {
  UserOutlined,
  TeamOutlined,
  LinkOutlined,
  SyncOutlined,
  CloudSyncOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue';
import { Page } from '@vben/common-ui';
import { requestClient } from '#/api/request';
import dayjs from 'dayjs';

interface SyncStatsItem {
  total: number;
  synced: number;
  lastSyncAt: string | null;
}

interface CustomerSyncStatsItem extends SyncStatsItem {
  relations: number;
}

interface SyncStats {
  users: SyncStatsItem;
  customers: CustomerSyncStatsItem;
  isConfigured: boolean;
  isEnabled: boolean;
}

interface SyncResult {
  success: boolean;
  message: string;
}

interface SyncProgress {
  title: string;
  percent: number;
  status: 'active' | 'completed' | 'failed';
  total?: number;
  processed?: number;
}

interface AsyncSyncResponse {
  async: boolean;
  jobId?: string;
  syncType?: string;
  message?: string;
  // 同步模式下的直接结果
  success?: boolean;
  total?: number;
  totalUsers?: number;
  totalCustomers?: number;
  created?: number;
  updated?: number;
  failed?: number;
  relationsCreated?: number;
  errors?: string[];
}

interface JobStatusResponse {
  status: string;
  progress?: number;
  total?: number;
  processed?: number;
  result?: {
    success: boolean;
    totalUsers?: number;
    totalCustomers?: number;
    created: number;
    updated: number;
    failed: number;
    relationsCreated?: number;
    errors?: string[];
  };
  error?: string;
}

const syncStats = ref<SyncStats>({
  users: { total: 0, synced: 0, lastSyncAt: null },
  customers: { total: 0, synced: 0, lastSyncAt: null, relations: 0 },
  isConfigured: false,
  isEnabled: false,
});

const syncingUsers = ref(false);
const syncingCustomers = ref(false);
const syncingAll = ref(false);
const lastSyncResult = ref<SyncResult | null>(null);
const syncProgress = ref<SyncProgress | null>(null);
let pollingTimer: ReturnType<typeof setTimeout> | null = null;

const formatTime = (time: string | null | undefined) => {
  if (!time || time === 'Invalid Date') {
    return '-';
  }
  const date = dayjs(time);
  if (!date.isValid()) {
    return '-';
  }
  return date.format('YYYY-MM-DD HH:mm');
};

const fetchSyncStats = async () => {
  try {
    const res = await requestClient.get<SyncStats>('/operations/wecom-sync/stats');
    syncStats.value = res;
  } catch (error: any) {
    console.error('获取同步统计失败', error);
  }
};

// 轮询任务状态
const pollJobStatus = async (
  syncType: 'users' | 'customers',
  jobId: string,
  title: string,
  onComplete: (result: JobStatusResponse['result']) => void,
  onError: (error: string) => void,
) => {
  const statusUrl = `/operations/wecom-sync/${syncType}/status/${jobId}`;

  const poll = async () => {
    try {
      const status = await requestClient.get<JobStatusResponse>(statusUrl);

      if (status.status === 'completed') {
        // 完成
        syncProgress.value = {
          title,
          percent: 100,
          status: 'completed',
          total:
            status.total ||
            status.result?.totalUsers ||
            status.result?.totalCustomers,
          processed: status.processed || status.total,
        };

        // 延迟清除进度条，让用户看到100%
        setTimeout(() => {
          syncProgress.value = null;
        }, 2000);

        onComplete(status.result);
        return;
      } else if (status.status === 'failed') {
        // 失败
        syncProgress.value = {
          title,
          percent: syncProgress.value?.percent || 0,
          status: 'failed',
        };

        setTimeout(() => {
          syncProgress.value = null;
        }, 2000);

        onError(status.error || '同步失败');
        return;
      } else {
        // 进行中，更新进度
        syncProgress.value = {
          title,
          percent: status.progress || 0,
          status: 'active',
          total: status.total,
          processed: status.processed,
        };

        // 继续轮询
        pollingTimer = setTimeout(poll, 1000);
      }
    } catch (error: any) {
      console.error('轮询任务状态失败', error);
      // 网络错误时继续重试
      pollingTimer = setTimeout(poll, 2000);
    }
  };

  // 开始轮询
  poll();
};

// 停止轮询
const stopPolling = () => {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }
};

const handleSyncUsers = async () => {
  syncingUsers.value = true;
  lastSyncResult.value = null;
  stopPolling();

  try {
    const res = await requestClient.post<AsyncSyncResponse>(
      '/operations/wecom-sync/users',
      {},
    );

    if (res.async && res.jobId) {
      // 异步模式：显示初始进度并开始轮询
      syncProgress.value = {
        title: '正在同步员工数据...',
        percent: 0,
        status: 'active',
      };

      pollJobStatus(
        'users',
        res.jobId,
        '正在同步员工数据...',
        (result) => {
          // 完成回调
          syncingUsers.value = false;
          if (result) {
            lastSyncResult.value = {
              success: result.success ?? true,
              message: `员工同步完成：新增 ${result.created ?? 0} 人，更新 ${result.updated ?? 0} 人${(result.failed ?? 0) > 0 ? `，失败 ${result.failed} 人` : ''}`,
            };
          } else {
            lastSyncResult.value = {
              success: true,
              message: '员工同步完成',
            };
          }
          fetchSyncStats();
        },
        (error) => {
          // 错误回调
          syncingUsers.value = false;
          lastSyncResult.value = {
            success: false,
            message: error,
          };
        },
      );
    } else {
      // 同步模式：直接处理结果
      lastSyncResult.value = {
        success: res.success ?? true,
        message: `员工同步完成：新增 ${res.created ?? 0} 人，更新 ${res.updated ?? 0} 人${(res.failed ?? 0) > 0 ? `，失败 ${res.failed} 人` : ''}`,
      };
      await fetchSyncStats();
      syncingUsers.value = false;
    }
  } catch (error: any) {
    lastSyncResult.value = {
      success: false,
      message: error.message || '员工同步失败',
    };
    syncingUsers.value = false;
  }
};

const handleSyncCustomers = async () => {
  syncingCustomers.value = true;
  lastSyncResult.value = null;
  stopPolling();

  try {
    const res = await requestClient.post<AsyncSyncResponse>(
      '/operations/wecom-sync/customers',
      {},
    );

    if (res.async && res.jobId) {
      // 异步模式：显示初始进度并开始轮询
      syncProgress.value = {
        title: '正在同步客户数据...',
        percent: 0,
        status: 'active',
      };

      pollJobStatus(
        'customers',
        res.jobId,
        '正在同步客户数据...',
        (result) => {
          // 完成回调
          syncingCustomers.value = false;
          if (result) {
            lastSyncResult.value = {
              success: result.success ?? true,
              message: `客户同步完成：新增 ${result.created ?? 0} 人，更新 ${result.updated ?? 0} 人，关系 ${result.relationsCreated ?? 0} 条${(result.failed ?? 0) > 0 ? `，失败 ${result.failed} 人` : ''}`,
            };
          } else {
            lastSyncResult.value = {
              success: true,
              message: '客户同步完成',
            };
          }
          fetchSyncStats();
        },
        (error) => {
          // 错误回调
          syncingCustomers.value = false;
          lastSyncResult.value = {
            success: false,
            message: error,
          };
        },
      );
    } else {
      // 同步模式：直接处理结果
      lastSyncResult.value = {
        success: res.success ?? true,
        message: `客户同步完成：新增 ${res.created ?? 0} 人，更新 ${res.updated ?? 0} 人，关系 ${res.relationsCreated ?? 0} 条${(res.failed ?? 0) > 0 ? `，失败 ${res.failed} 人` : ''}`,
      };
      await fetchSyncStats();
      syncingCustomers.value = false;
    }
  } catch (error: any) {
    lastSyncResult.value = {
      success: false,
      message: error.message || '客户同步失败',
    };
    syncingCustomers.value = false;
  }
};

const handleSyncAll = async () => {
  syncingAll.value = true;
  lastSyncResult.value = null;

  // 显示同步进行中的提示
  message.loading('正在同步数据，这可能需要几分钟时间...', 0);

  try {
    // 增加超时时间到 10 分钟（大量数据同步需要更长时间）
    const res = await requestClient.post<{
      success: boolean;
      users: { created: number; updated: number; failed: number };
      customers: {
        created: number;
        updated: number;
        failed: number;
        relationsCreated: number;
      };
    }>('/operations/wecom-sync/all', {}, { timeout: 600000 });

    message.destroy();

    lastSyncResult.value = {
      success: res.success,
      message: `全量同步完成：员工 ${res.users.created}/${res.users.updated}，客户 ${res.customers.created}/${res.customers.updated}，关系 ${res.customers.relationsCreated} 条`,
    };

    message.success('同步完成！');
    await fetchSyncStats();
  } catch (error: any) {
    message.destroy();

    // 如果是超时错误，给出友好提示
    if (error.message && error.message.includes('timeout')) {
      lastSyncResult.value = {
        success: false,
        message:
          '同步请求超时，但后台仍在继续同步。请稍后刷新页面查看同步结果。',
      };
      message.warning('请求超时，但同步仍在后台进行，请稍后查看结果');

      // 30秒后自动刷新统计
      setTimeout(() => {
        fetchSyncStats();
      }, 30000);
    } else {
      lastSyncResult.value = {
        success: false,
        message: error.message || '全量同步失败',
      };
      message.error('同步失败');
    }
  } finally {
    syncingAll.value = false;
  }
};

onMounted(() => {
  fetchSyncStats();
});
</script>

<style scoped>
/* 统计卡片 */
.stats-card {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 24px;
  background: var(--component-background, #fff);
  border: 1px solid var(--border-color, #f0f0f0);
  border-radius: 12px;
  transition: all 0.3s;
}

.stats-card:hover {
  border-color: #1890ff;
  box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
}

.stats-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
}

.stats-info {
  flex: 1;
}

.stats-label {
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text-color-secondary, #666);
}

.stats-value {
  margin-bottom: 4px;
  font-size: 32px;
  font-weight: 600;
  color: var(--text-color, #333);
}

.stats-time {
  font-size: 12px;
  color: var(--text-color-secondary, #999);
}

/* 同步卡片 */
.sync-card {
  border-radius: 12px;
}

.sync-card :deep(.ant-card-head) {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
}

.sync-card :deep(.ant-card-body) {
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
}

/* 同步操作 */
.sync-actions {
  padding: 8px 0;
}

.sync-action-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
}

.action-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.action-icon {
  font-size: 32px;
}

.action-title {
  margin-bottom: 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color, #333);
}

.action-desc {
  font-size: 13px;
  color: var(--text-color-secondary, #999);
}

/* 帮助卡片 */
.help-card {
  border-radius: 12px;
}

.help-card :deep(.ant-card-head) {
  min-height: auto;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
}

.help-card :deep(.ant-card-body) {
  padding: 20px;
}

.help-title {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
}

/* 注意事项 */
.notice-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notice-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-color, #333);
}

.notice-icon {
  flex-shrink: 0;
  margin-top: 3px;
  color: var(--text-color-secondary, #999);
}

/* 同步进度 */
.sync-progress {
  padding: 16px;
  background: var(--component-background-light, #fafafa);
  border: 1px solid var(--border-color, #f0f0f0);
  border-radius: 8px;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color, #333);
}

.progress-percent {
  font-size: 14px;
  font-weight: 600;
  color: #1890ff;
}

.progress-info {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-color-secondary, #999);
}

/* 暗色模式适配 */
:deep(.dark) {
  .stats-card {
    background: #1f1f1f;
    border-color: #303030;
  }

  .stats-card:hover {
    border-color: #177ddc;
  }
}
</style>
