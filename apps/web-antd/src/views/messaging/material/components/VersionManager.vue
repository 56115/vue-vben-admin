<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  Drawer,
  List,
  ListItem,
  ListItemMeta,
  Tag,
  Button,
  Tooltip,
  Popconfirm,
  Empty,
  Spin,
  message,
} from 'ant-design-vue';
import {
  HistoryOutlined,
  RollbackOutlined,
  EyeOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';
import type { VersionItem, MaterialItem } from '../types';

const props = defineProps<{
  visible: boolean;
  material: MaterialItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void;
  (e: 'restored'): void;
}>();

const versions = ref<VersionItem[]>([]);
const loading = ref(false);
const compareMode = ref(false);
const selectedVersions = ref<number[]>([]);
const versionDetail = ref<VersionItem | null>(null);
const detailVisible = ref(false);

// 监听显示状态
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.material) {
      fetchVersions();
    } else {
      compareMode.value = false;
      selectedVersions.value = [];
    }
  },
);

// 获取版本历史
async function fetchVersions() {
  if (!props.material) return;

  loading.value = true;
  try {
    const res = await requestClient.get<VersionItem[]>(
      `/messaging/material/${props.material.id}/versions`,
    );
    versions.value = res || [];
  } catch (e) {
    message.error('获取版本历史失败');
  } finally {
    loading.value = false;
  }
}

// 恢复版本
async function restoreVersion(version: number) {
  if (!props.material) return;

  try {
    await requestClient.post(
      `/messaging/material/${props.material.id}/versions/${version}/restore`,
      { reason: '从版本历史恢复' },
    );
    message.success('版本恢复成功');
    emit('restored');
    fetchVersions();
  } catch (e) {
    message.error('版本恢复失败');
  }
}

// 查看版本详情
function viewVersionDetail(version: VersionItem) {
  versionDetail.value = version;
  detailVisible.value = true;
}

// 切换版本选择（对比模式）
function toggleVersionSelection(version: number) {
  const index = selectedVersions.value.indexOf(version);
  if (index > -1) {
    selectedVersions.value.splice(index, 1);
  } else if (selectedVersions.value.length < 2) {
    selectedVersions.value.push(version);
  }
}

// 对比版本
function compareVersions() {
  if (selectedVersions.value.length !== 2) {
    message.warning('请选择两个版本进行对比');
    return;
  }
  // TODO: 实现版本对比
  message.info('版本对比功能开发中');
}

// 获取变更类型标签
function getChangeTypeConfig(type: string) {
  const config: Record<string, { label: string; color: string }> = {
    CREATE: { label: '创建', color: 'green' },
    UPDATE: { label: '更新', color: 'blue' },
    DELETE: { label: '删除', color: 'red' },
    RESTORE: { label: '恢复', color: 'orange' },
  };
  return config[type] || { label: type, color: 'default' };
}

function close() {
  emit('update:visible', false);
}

function closeDetail() {
  detailVisible.value = false;
  versionDetail.value = null;
}
</script>

<template>
  <Drawer :visible="visible" title="版本历史" width="480px" @close="close">
    <Spin :spinning="loading">
      <!-- 对比模式工具栏 -->
      <div v-if="compareMode" class="compare-toolbar">
        <span class="compare-hint">
          已选择 {{ selectedVersions.length }}/2 个版本
        </span>
        <Button
          type="primary"
          size="small"
          :disabled="selectedVersions.length !== 2"
          @click="compareVersions"
        >
          <SwapOutlined />
          对比
        </Button>
        <Button size="small" @click="compareMode = false">取消</Button>
      </div>

      <!-- 操作栏 -->
      <div v-else class="action-bar">
        <Button
          size="small"
          :type="compareMode ? 'primary' : 'default'"
          @click="compareMode = !compareMode"
        >
          <SwapOutlined />
          对比模式
        </Button>
      </div>

      <!-- 版本列表 -->
      <List
        v-if="versions.length"
        class="version-list"
        :data-source="versions"
        :split="false"
      >
        <template #renderItem="{ item, index }">
          <ListItem
            :class="{
              'version-item': true,
              'is-current': index === 0,
              'is-selected': selectedVersions.includes(item.version),
            }"
            @click="compareMode ? toggleVersionSelection(item.version) : null"
          >
            <ListItemMeta>
              <template #title>
                <div class="version-header">
                  <span class="version-number">v{{ item.version }}</span>
                  <Tag
                    size="small"
                    :color="getChangeTypeConfig(item.changeType).color"
                  >
                    {{ getChangeTypeConfig(item.changeType).label }}
                  </Tag>
                  <Tag v-if="index === 0" color="blue" size="small">当前</Tag>
                  <span class="version-time">{{
                    new Date(item.createdAt).toLocaleString()
                  }}</span>
                </div>
              </template>

              <template #description>
                <div class="version-info">
                  <p class="change-summary">
                    {{ item.changeSummary || '内容更新' }}
                  </p>
                  <p class="version-author">
                    <EditOutlined />
                    {{ item.createdByName || `用户${item.createdBy}` }}
                  </p>
                </div>
              </template>
            </ListItemMeta>

            <template #actions>
              <Tooltip title="查看详情">
                <Button
                  type="text"
                  size="small"
                  @click.stop="viewVersionDetail(item)"
                >
                  <EyeOutlined />
                </Button>
              </Tooltip>

              <Popconfirm
                v-if="index > 0"
                title="恢复到此版本？"
                description="恢复后将覆盖当前内容，此操作不可撤销。"
                okText="恢复"
                cancelText="取消"
                @confirm.stop="restoreVersion(item.version)"
              >
                <Tooltip title="恢复此版本">
                  <Button type="text" size="small" @click.stop>
                    <RollbackOutlined />
                  </Button>
                </Tooltip>
              </Popconfirm>
            </template>
          </ListItem>
        </template>
      </List>

      <Empty v-else description="暂无版本记录" />
    </Spin>

    <!-- 版本详情弹窗 -->
    <Drawer
      :visible="detailVisible"
      title="版本详情"
      width="480px"
      :closable="true"
      @close="closeDetail"
    >
      <div v-if="versionDetail" class="version-detail">
        <div class="detail-item">
          <span class="label">版本号：</span>
          <span class="value">v{{ versionDetail.version }}</span>
        </div>
        <div class="detail-item">
          <span class="label">变更类型：</span>
          <Tag :color="getChangeTypeConfig(versionDetail.changeType).color">
            {{ getChangeTypeConfig(versionDetail.changeType).label }}
          </Tag>
        </div>
        <div class="detail-item">
          <span class="label">创建时间：</span>
          <span class="value">{{
            new Date(versionDetail.createdAt).toLocaleString()
          }}</span>
        </div>
        <div class="detail-item">
          <span class="label">创建者：</span>
          <span class="value">{{
            versionDetail.createdByName || `用户${versionDetail.createdBy}`
          }}</span>
        </div>
        <div class="detail-item">
          <span class="label">变更说明：</span>
          <p class="change-desc">{{ versionDetail.changeSummary || '无' }}</p>
        </div>
        <div class="detail-item">
          <span class="label">内容预览：</span>
          <div class="content-preview">
            <h4>{{ versionDetail.name }}</h4>
            <p>{{ versionDetail.content || '无内容' }}</p>
          </div>
        </div>
      </div>
    </Drawer>
  </Drawer>
</template>

<style scoped>
.action-bar,
.compare-toolbar {
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
}

.compare-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.compare-hint {
  color: var(--text-color-secondary, rgb(0 0 0 / 65%));
}

.version-list :deep(.ant-list-item) {
  padding: 16px;
  margin-bottom: 8px;
  border: 1px solid var(--border-color, #f0f0f0);
  border-radius: 8px;
  transition: all 0.3s;
}

.version-list :deep(.ant-list-item):hover {
  background: var(--background-mute, #fafafa);
}

.version-list :deep(.ant-list-item).is-current {
  background: var(--primary-color-light, #e6f7ff);
  border-color: var(--primary-color-light-border, #91d5ff);
}

.version-list :deep(.ant-list-item).is-selected {
  border-color: var(--primary-color, #1890ff);
  box-shadow: 0 0 0 2px rgb(24 144 255 / 20%);
}

.version-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}

.version-number {
  font-size: 14px;
  font-weight: 600;
}

.version-time {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-color-secondary, rgb(0 0 0 / 45%));
}

.version-info {
  margin-top: 8px;
}

.change-summary {
  margin: 0 0 4px;
  color: var(--text-color-secondary, rgb(0 0 0 / 65%));
}

.version-author {
  margin: 0;
  font-size: 12px;
  color: var(--text-color-secondary, rgb(0 0 0 / 45%));
}

.version-author :deep(.anticon) {
  margin-right: 4px;
}

.version-detail {
  padding: 16px;
}

.detail-item {
  margin-bottom: 16px;
}

.detail-item .label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--text-color-secondary, rgb(0 0 0 / 45%));
}

.detail-item .value {
  font-size: 14px;
  color: var(--text-color, rgb(0 0 0 / 85%));
}

.change-desc {
  padding: 12px;
  margin: 8px 0 0;
  color: var(--text-color-secondary, rgb(0 0 0 / 65%));
  background: var(--background-mute, #f5f5f5);
  border-radius: 4px;
}

.content-preview {
  padding: 16px;
  margin-top: 8px;
  background: var(--success-bg-color, #f6ffed);
  border: 1px solid var(--success-border-color, #b7eb8f);
  border-radius: 8px;
}

.content-preview h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 500;
}

.content-preview p {
  margin: 0;
  color: var(--text-color-secondary, rgb(0 0 0 / 65%));
  overflow-wrap: break-word;
  white-space: pre-wrap;
}
</style>
