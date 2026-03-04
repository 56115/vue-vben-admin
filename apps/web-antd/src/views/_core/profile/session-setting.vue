<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Button, message, Modal } from 'ant-design-vue';
import { useI18n } from '@vben/locales';
import {
  getSessionsApi,
  revokeSessionApi,
  revokeOtherSessionsApi,
  type AuthApi,
} from '#/api/core/auth';
import {
  DesktopOutlined,
  MobileOutlined,
  TabletOutlined,
  LaptopOutlined,
  SafetyOutlined,
} from '@ant-design/icons-vue';

const { $t } = useI18n();

const sessions = ref<AuthApi.UserSession[]>([]);
const loading = ref(false);

// 加载会话列表
async function loadSessions() {
  loading.value = true;
  try {
    const result = await getSessionsApi();
    sessions.value = result.sessions;
  } catch (error) {
    message.error($t('authentication.loadSessionsFailed'));
    console.error('Failed to load sessions:', error);
  } finally {
    loading.value = false;
  }
}

// 撤销指定会话
async function handleRevokeSession(session: AuthApi.UserSession) {
  if (session.isCurrent) {
    message.warning($t('authentication.cannotRevokeCurrentSession'));
    return;
  }

  Modal.confirm({
    title: $t('authentication.revokeSessionConfirmTitle'),
    content: $t('authentication.revokeSessionConfirmContent', {
      device: session.deviceInfo,
    }),
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    onOk: async () => {
      try {
        await revokeSessionApi(session.id);
        message.success($t('authentication.revokeSessionSuccess'));
        await loadSessions();
      } catch (error) {
        message.error($t('authentication.revokeSessionFailed'));
        console.error('Failed to revoke session:', error);
      }
    },
  });
}

// 撤销所有其他会话
async function handleRevokeAllOthers() {
  const otherSessionsCount = sessions.value.filter((s) => !s.isCurrent).length;

  if (otherSessionsCount === 0) {
    message.info($t('authentication.noOtherSessions'));
    return;
  }

  Modal.confirm({
    title: $t('authentication.revokeAllOthersConfirmTitle'),
    content: $t('authentication.revokeAllOthersConfirmContent', {
      count: otherSessionsCount,
    }),
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    onOk: async () => {
      try {
        const result = await revokeOtherSessionsApi();
        message.success(result.message);
        await loadSessions();
      } catch (error) {
        message.error($t('authentication.revokeAllOthersFailed'));
        console.error('Failed to revoke other sessions:', error);
      }
    },
  });
}

// 根据设备信息返回图标
function getDeviceIcon(deviceInfo: string) {
  const lowerDevice = deviceInfo.toLowerCase();
  if (lowerDevice.includes('ios') || lowerDevice.includes('iphone')) {
    return MobileOutlined;
  }
  if (lowerDevice.includes('android')) {
    return MobileOutlined;
  }
  if (lowerDevice.includes('ipad') || lowerDevice.includes('tablet')) {
    return TabletOutlined;
  }
  if (lowerDevice.includes('windows') || lowerDevice.includes('mac')) {
    return LaptopOutlined;
  }
  return DesktopOutlined;
}

// 格式化时间
function formatDate(date: Date): string {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 计算当前会话和其他会话
const currentSession = computed(() =>
  sessions.value.find((s) => s.isCurrent),
);
const otherSessions = computed(() =>
  sessions.value.filter((s) => !s.isCurrent),
);

onMounted(() => {
  loadSessions();
});
</script>

<template>
  <div class="session-setting">
    <div class="session-header">
      <h3 class="session-title">
        <SafetyOutlined class="title-icon" />
        {{ $t('authentication.sessionManagement') }}
      </h3>
      <p class="session-description">
        {{ $t('authentication.sessionManagementDesc') }}
      </p>
    </div>

    <a-spin :spinning="loading">
      <!-- 当前会话 -->
      <div v-if="currentSession" class="session-section">
        <h4 class="section-title">
          {{ $t('authentication.currentSession') }}
        </h4>
        <div class="session-card current-session-card">
          <div class="session-icon">
            <component
              :is="getDeviceIcon(currentSession.deviceInfo)"
              :style="{ fontSize: '24px' }"
            />
          </div>
          <div class="session-info">
            <div class="session-device">
              {{ currentSession.deviceInfo }}
              <a-tag color="green" class="current-tag">
                {{ $t('authentication.currentDevice') }}
              </a-tag>
            </div>
            <div class="session-detail">
              <span class="detail-item">
                <span class="detail-label">IP:</span>
                {{ currentSession.ipAddress }}
              </span>
              <span class="detail-item">
                <span class="detail-label">{{
                  $t('authentication.loginTime')
                }}:</span>
                {{ formatDate(currentSession.loginAt) }}
              </span>
              <span class="detail-item">
                <span class="detail-label">{{
                  $t('authentication.lastActiveTime')
                }}:</span>
                {{ formatDate(currentSession.lastActiveAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 其他会话 -->
      <div v-if="otherSessions.length > 0" class="session-section">
        <div class="section-header">
          <h4 class="section-title">
            {{ $t('authentication.otherSessions') }}
            <span class="session-count">({{ otherSessions.length }})</span>
          </h4>
          <Button
            danger
            size="small"
            @click="handleRevokeAllOthers"
          >
            {{ $t('authentication.revokeAllOthers') }}
          </Button>
        </div>

        <div class="session-list">
          <div
            v-for="session in otherSessions"
            :key="session.id"
            class="session-card"
          >
            <div class="session-icon">
              <component
                :is="getDeviceIcon(session.deviceInfo)"
                :style="{ fontSize: '24px', color: '#999' }"
              />
            </div>
            <div class="session-info">
              <div class="session-device">{{ session.deviceInfo }}</div>
              <div class="session-detail">
                <span class="detail-item">
                  <span class="detail-label">IP:</span>
                  {{ session.ipAddress }}
                </span>
                <span class="detail-item">
                  <span class="detail-label">{{
                    $t('authentication.loginTime')
                  }}:</span>
                  {{ formatDate(session.loginAt) }}
                </span>
                <span class="detail-item">
                  <span class="detail-label">{{
                    $t('authentication.lastActiveTime')
                  }}:</span>
                  {{ formatDate(session.lastActiveAt) }}
                </span>
              </div>
            </div>
            <div class="session-action">
              <Button
                danger
                size="small"
                @click="handleRevokeSession(session)"
              >
                {{ $t('authentication.logout') }}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- 无其他会话 -->
      <div v-if="otherSessions.length === 0 && !loading" class="empty-state">
        <a-empty :description="$t('authentication.noOtherSessionsDesc')" />
      </div>
    </a-spin>
  </div>
</template>

<style scoped lang="less">
.session-setting {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.session-header {
  margin-bottom: 32px;

  .session-title {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;

    .title-icon {
      color: #1890ff;
    }
  }

  .session-description {
    color: #666;
    font-size: 14px;
    margin: 0;
  }
}

.session-section {
  margin-bottom: 32px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 16px;

    .session-count {
      color: #999;
      font-size: 14px;
      font-weight: normal;
    }
  }
}

.session-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  &.current-session-card {
    border-color: #1890ff;
    background: #f0f7ff;
  }

  .session-icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
    border-radius: 8px;
  }

  .session-info {
    flex: 1;
    min-width: 0;

    .session-device {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;

      .current-tag {
        margin: 0;
      }
    }

    .session-detail {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 13px;
      color: #666;

      .detail-item {
        display: flex;
        gap: 4px;

        .detail-label {
          color: #999;
        }
      }
    }
  }

  .session-action {
    flex-shrink: 0;
  }
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .session-setting {
    padding: 16px;
  }

  .session-card {
    flex-direction: column;
    align-items: stretch;

    .session-icon {
      align-self: flex-start;
    }

    .session-action {
      align-self: flex-end;
    }
  }

  .session-detail {
    flex-direction: column !important;
    gap: 8px !important;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 12px;
  }
}
</style>
