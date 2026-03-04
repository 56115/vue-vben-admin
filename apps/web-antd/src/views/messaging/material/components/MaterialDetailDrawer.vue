<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import {
  Drawer,
  Button,
  Tag,
  Tabs,
  TabPane,
  Empty,
  Table,
  Timeline,
  TimelineItem,
  Tooltip,
  message,
} from 'ant-design-vue';
import {
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  HistoryOutlined,
  FileTextOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  LinkOutlined,
  FileOutlined,
  FolderOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SwapOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';
import AIAssistant from './AIAssistant.vue';
import type {
  MaterialItem,
  VersionItem,
  UsageRecord,
  SimilarMaterial,
} from '../types';

const props = defineProps<{
  visible: boolean;
  material: MaterialItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void;
  (e: 'edit', material: MaterialItem): void;
  (e: 'delete', material: MaterialItem): void;
  (e: 'use', material: MaterialItem): void;
}>();

// 本地状态
const activeTab = ref('overview');
const loading = ref({
  versions: false,
  usage: false,
  similar: false,
});

const versions = ref<VersionItem[]>([]);
const usageRecords = ref<UsageRecord[]>([]);
const similarMaterials = ref<SimilarMaterial[]>([]);

// 类型配置
const typeIcons: Record<string, any> = {
  TEXT: FileTextOutlined,
  IMAGE: PictureOutlined,
  VIDEO: VideoCameraOutlined,
  LINK: LinkOutlined,
  FILE: FileOutlined,
  MIXED: FolderOutlined,
};

const typeLabels: Record<string, string> = {
  TEXT: '文本',
  IMAGE: '图片',
  VIDEO: '视频',
  LINK: '链接',
  FILE: '文件',
  MIXED: '图文',
};

const typeColors: Record<string, string> = {
  TEXT: '#595959',
  IMAGE: '#52c41a',
  VIDEO: '#722ed1',
  LINK: '#1890ff',
  FILE: '#fa8c16',
  MIXED: '#13c2c2',
};

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  DRAFT: { label: '草稿', color: '#bfbfbf', icon: ClockCircleOutlined },
  ACTIVE: { label: '启用', color: '#52c41a', icon: CheckCircleOutlined },
  ARCHIVED: {
    label: '归档',
    color: '#8c8c8c',
    icon: ExclamationCircleOutlined,
  },
};

// 计算属性
const TypeIcon = computed(() => {
  if (!props.material) return FileTextOutlined;
  return typeIcons[props.material.type] || FileTextOutlined;
});

// 方法
function close() {
  emit('update:visible', false);
}

function handleEdit() {
  if (props.material) {
    emit('edit', props.material);
  }
}

function handleDelete() {
  if (props.material) {
    emit('delete', props.material);
    close();
  }
}

function handleUse() {
  if (props.material) {
    emit('use', props.material);
  }
}

async function fetchVersions() {
  if (!props.material) return;
  loading.value.versions = true;
  try {
    const res = await requestClient.get<VersionItem[]>(
      `/messaging/material/${props.material.id}/versions`,
    );
    versions.value = res || [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value.versions = false;
  }
}

async function fetchUsageRecords() {
  if (!props.material) return;
  loading.value.usage = true;
  try {
    const res = await requestClient.get<{
      items: UsageRecord[];
      total: number;
    }>(`/messaging/material/${props.material.id}/stats`);
    usageRecords.value = res?.items || [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value.usage = false;
  }
}

async function fetchSimilarMaterials() {
  if (!props.material) return;
  loading.value.similar = true;
  try {
    const res = await requestClient.get<SimilarMaterial[]>(
      `/messaging/material/${props.material.id}/similar`,
    );
    similarMaterials.value = res || [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value.similar = false;
  }
}

async function restoreVersion(version: number) {
  if (!props.material) return;
  try {
    await requestClient.post(
      `/messaging/material/${props.material.id}/versions/${version}/restore`,
      { reason: '从版本历史恢复' },
    );
    message.success('版本恢复成功');
    fetchVersions();
  } catch (e) {
    message.error('版本恢复失败');
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
}

// 监听标签切换
watch(activeTab, (tab) => {
  if (tab === 'versions' && versions.value.length === 0) {
    fetchVersions();
  } else if (tab === 'usage' && usageRecords.value.length === 0) {
    fetchUsageRecords();
  } else if (tab === 'similar' && similarMaterials.value.length === 0) {
    fetchSimilarMaterials();
  }
});

// 监听显示状态
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      activeTab.value = 'overview';
      versions.value = [];
      usageRecords.value = [];
      similarMaterials.value = [];
    }
  },
);

// 处理应用标签
async function handleApplyTags(tags: string[]) {
  if (!props.material) return;

  try {
    await requestClient.put(`/messaging/material/${props.material.id}`, {
      tags: [...(props.material.tags || []), ...tags],
    });
    message.success('标签已应用');
    // 刷新素材数据
    const res = await requestClient.get<MaterialItem>(
      `/messaging/material/${props.material.id}`,
    );
    if (props.material) {
      Object.assign(props.material, res);
    }
  } catch (e) {
    message.error('应用标签失败');
  }
}
</script>

<template>
  <Drawer :visible="visible" :width="560" :closable="false" @close="close">
    <template v-if="material">
      <!-- 头部 -->
      <div class="drawer-header">
        <div class="header-main">
          <div
            class="material-icon"
            :style="{ color: typeColors[material.type] }"
          >
            <component :is="TypeIcon" />
          </div>
          <div class="header-info">
            <h3 class="material-title">{{ material.name }}</h3>
            <div class="header-meta">
              <Tag :color="statusConfig[material.status].color">
                <component :is="statusConfig[material.status].icon" />
                {{ statusConfig[material.status].label }}
              </Tag>
              <span class="type-label">{{ typeLabels[material.type] }}</span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <Button type="primary" @click="handleUse">
            <SendOutlined /> 使用
          </Button>
          <Button @click="handleEdit"> <EditOutlined /> 编辑 </Button>
        </div>
      </div>

      <!-- 内容区 -->
      <Tabs v-model:activeKey="activeTab" class="drawer-tabs">
        <!-- 概览 -->
        <TabPane key="overview" tab="概览">
          <!-- 预览区 -->
          <div class="preview-section">
            <div
              v-if="material.type === 'IMAGE' && material.mediaUrls?.[0]"
              class="preview-image-large"
            >
              <img :src="material.mediaUrls[0]" :alt="material.name" />
            </div>
            <div
              v-else-if="material.type === 'TEXT'"
              class="preview-text-large"
            >
              {{ material.content || '无内容' }}
            </div>
            <div v-else-if="material.type === 'LINK'" class="preview-link">
              <a :href="material.linkUrl" target="_blank">{{
                material.linkUrl
              }}</a>
              <p v-if="material.linkTitle">{{ material.linkTitle }}</p>
            </div>
            <div v-else class="preview-placeholder">
              <component :is="TypeIcon" />
              <p>{{ typeLabels[material.type] }}素材</p>
            </div>
          </div>

          <!-- 信息卡片 -->
          <div class="info-section">
            <h4>基本信息</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">分类</span>
                <span class="info-value">{{
                  material.categoryName || '未分类'
                }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">创建者</span>
                <span class="info-value">ID: {{ material.createdBy }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">创建时间</span>
                <span class="info-value">{{
                  formatDate(material.createdAt)
                }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">更新时间</span>
                <span class="info-value">{{
                  formatDate(material.updatedAt)
                }}</span>
              </div>
            </div>
          </div>

          <!-- 统计卡片 -->
          <div class="stats-section">
            <h4>数据统计</h4>
            <div class="stats-grid">
              <div class="stat-card">
                <EyeOutlined class="stat-icon" />
                <div class="stat-value">{{ material.viewCount || 0 }}</div>
                <div class="stat-label">浏览次数</div>
              </div>
              <div class="stat-card">
                <SendOutlined class="stat-icon" />
                <div class="stat-value">{{ material.usageCount || 0 }}</div>
                <div class="stat-label">使用次数</div>
              </div>
              <div class="stat-card">
                <FolderOutlined class="stat-icon" />
                <div class="stat-value">{{ material.likeCount || 0 }}</div>
                <div class="stat-label">点赞数</div>
              </div>
            </div>
          </div>

          <!-- 标签 -->
          <div v-if="material.tags?.length" class="tags-section">
            <h4>标签</h4>
            <div class="tags-list">
              <Tag v-for="tag in material.tags" :key="tag">{{ tag }}</Tag>
            </div>
          </div>

          <!-- 描述 -->
          <div v-if="material.description" class="desc-section">
            <h4>描述</h4>
            <p>{{ material.description }}</p>
          </div>
        </TabPane>

        <!-- 使用记录 -->
        <TabPane key="usage" tab="使用记录">
          <div v-if="loading.usage" class="loading-state">加载中...</div>
          <div v-else-if="!usageRecords.length" class="empty-state">
            <Empty description="暂无使用记录" />
          </div>
          <Timeline v-else>
            <TimelineItem v-for="record in usageRecords" :key="record.id">
              <p>{{ record.materialName }}</p>
              <p class="text-gray-400">
                {{ record.usageType }} - {{ formatDate(record.createdAt) }}
              </p>
            </TimelineItem>
          </Timeline>
        </TabPane>

        <!-- 版本历史 -->
        <TabPane key="versions" tab="版本历史">
          <div v-if="loading.versions" class="loading-state">加载中...</div>
          <div v-else-if="!versions.length" class="empty-state">
            <Empty description="暂无版本记录" />
          </div>
          <div v-else class="version-list">
            <div
              v-for="(version, index) in versions"
              :key="version.id"
              class="version-item"
              :class="{ 'is-current': index === 0 }"
            >
              <div class="version-header">
                <span class="version-number">v{{ version.version }}</span>
                <Tag v-if="index === 0" color="blue">当前</Tag>
                <span class="version-time">{{
                  formatDate(version.createdAt)
                }}</span>
              </div>
              <div class="version-info">
                <p>{{ version.changeSummary || '内容更新' }}</p>
                <p class="version-author">
                  by {{ version.createdByName || '用户' + version.createdBy }}
                </p>
              </div>
              <div v-if="index > 0" class="version-actions">
                <Tooltip title="恢复此版本">
                  <Button
                    type="link"
                    size="small"
                    @click="restoreVersion(version.version)"
                  >
                    <ReloadOutlined /> 恢复
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>
        </TabPane>

        <!-- 相似素材 -->
        <TabPane key="similar" tab="相似素材">
          <div v-if="loading.similar" class="loading-state">加载中...</div>
          <div v-else-if="!similarMaterials.length" class="empty-state">
            <Empty description="未找到相似素材" />
          </div>
          <div v-else class="similar-list">
            <div
              v-for="item in similarMaterials"
              :key="item.id"
              class="similar-item"
            >
              <div
                class="similar-icon"
                :style="{ color: typeColors[item.type] }"
              >
                <component :is="typeIcons[item.type] || FileTextOutlined" />
              </div>
              <div class="similar-info">
                <h4>{{ item.name }}</h4>
                <p>{{ item.similarityReason }}</p>
              </div>
              <Tag :color="item.similarityScore > 80 ? 'red' : 'orange'">
                {{ item.similarityScore }}% 相似
              </Tag>
            </div>
          </div>
        </TabPane>
      </Tabs>

      <!-- AI 助手 -->
      <AIAssistant :material="material" @apply-tags="handleApplyTags" />

      <!-- 底部操作 -->
      <div class="drawer-footer">
        <Button danger @click="handleDelete">
          <DeleteOutlined /> 删除素材
        </Button>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
.drawer-header {
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.header-main {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.material-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 24px;
  background: #f5f5f5;
  border-radius: 8px;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.material-title {
  margin: 0 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
}

.header-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.type-label {
  font-size: 13px;
  color: rgb(0 0 0 / 45%);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.drawer-tabs :deep(.ant-tabs-content) {
  padding: 0;
}

.preview-section {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 24px;
  margin-bottom: 24px;
  background: #f5f5f5;
  border-radius: 8px;
}

.preview-image-large {
  max-width: 100%;
  max-height: 300px;
}

.preview-image-large img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 4px;
}

.preview-text-large {
  max-height: 300px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
  color: rgb(0 0 0 / 85%);
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.preview-link {
  text-align: center;
}

.preview-link a {
  color: #1890ff;
  word-break: break-all;
}

.preview-placeholder {
  font-size: 48px;
  color: rgb(0 0 0 / 45%);
  text-align: center;
}

.preview-placeholder p {
  margin-top: 8px;
  font-size: 14px;
}

.info-section,
.stats-section,
.tags-section,
.desc-section {
  margin-bottom: 24px;
}

.info-section h4,
.stats-section h4,
.tags-section h4,
.desc-section h4 {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: rgb(0 0 0 / 85%);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: rgb(0 0 0 / 45%);
}

.info-value {
  font-size: 14px;
  color: rgb(0 0 0 / 85%);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-card {
  padding: 16px;
  text-align: center;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
}

.stat-icon {
  margin-bottom: 8px;
  font-size: 24px;
  color: #52c41a;
}

.stat-value {
  margin-bottom: 4px;
  font-size: 24px;
  font-weight: 600;
  color: rgb(0 0 0 / 85%);
}

.stat-label {
  font-size: 12px;
  color: rgb(0 0 0 / 45%);
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.desc-section p {
  font-size: 14px;
  line-height: 1.6;
  color: rgb(0 0 0 / 65%);
  white-space: pre-wrap;
}

.loading-state,
.empty-state {
  padding: 48px 0;
  text-align: center;
}

.version-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.version-item {
  padding: 12px;
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.version-item.is-current {
  background: #e6f7ff;
  border-color: #91d5ff;
}

.version-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.version-number {
  font-size: 14px;
  font-weight: 600;
}

.version-time {
  margin-left: auto;
  font-size: 12px;
  color: rgb(0 0 0 / 45%);
}

.version-info p {
  margin: 0;
  font-size: 13px;
}

.version-author {
  margin-top: 4px;
  font-size: 12px;
  color: rgb(0 0 0 / 45%);
}

.version-actions {
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px dashed #f0f0f0;
}

.similar-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.similar-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.similar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 24px;
  background: #f5f5f5;
  border-radius: 8px;
}

.similar-info {
  flex: 1;
  min-width: 0;
}

.similar-info h4 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
}

.similar-info p {
  margin: 0;
  font-size: 12px;
  color: rgb(0 0 0 / 45%);
}

.drawer-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #f0f0f0;
}
</style>
