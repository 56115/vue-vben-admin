<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  Card,
  Button,
  Tag,
  Empty,
  Spin,
  Badge,
  Tabs,
  TabPane,
  message,
} from 'ant-design-vue';
import {
  RobotOutlined,
  TagOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  SendOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';
import type {
  MaterialItem,
  SimilarMaterial,
  RecommendedMaterial,
} from '../types';

const props = defineProps<{
  material: MaterialItem | null;
}>();

const emit = defineEmits<{
  (e: 'view', material: SimilarMaterial | RecommendedMaterial): void;
  (e: 'applyTags', tags: string[]): void;
}>();

const loading = ref({
  tags: false,
  similar: false,
  recommend: false,
});

const generatedTags = ref<string[]>([]);
const similarMaterials = ref<SimilarMaterial[]>([]);
const recommendedMaterials = ref<RecommendedMaterial[]>([]);

// 监听素材变化
watch(
  () => props.material,
  (material) => {
    if (material) {
      generatedTags.value = [];
      similarMaterials.value = [];
      recommendedMaterials.value = [];
    }
  },
  { immediate: true },
);

// 自动生成标签
async function autoGenerateTags() {
  if (!props.material) return;

  loading.value.tags = true;
  try {
    const res = await requestClient.post<{ tags: string[] }>(
      `/messaging/material/${props.material.id}/auto-tag`,
      { maxTags: 5, overwrite: false },
    );
    generatedTags.value = res.tags || [];
    message.success('标签生成成功');
  } catch (e) {
    message.error('标签生成失败');
  } finally {
    loading.value.tags = false;
  }
}

// 检测相似素材
async function detectSimilar() {
  if (!props.material) return;

  loading.value.similar = true;
  try {
    const res = await requestClient.get<SimilarMaterial[]>(
      `/messaging/material/${props.material.id}/similar`,
      { params: { limit: 5 } },
    );
    similarMaterials.value = res || [];
  } catch (e) {
    message.error('检测失败');
  } finally {
    loading.value.similar = false;
  }
}

// 获取推荐素材
async function fetchRecommendations() {
  if (!props.material) return;

  loading.value.recommend = true;
  try {
    const res = await requestClient.get<RecommendedMaterial[]>(
      `/messaging/material/${props.material.id}/recommendations`,
      { params: { limit: 5 } },
    );
    recommendedMaterials.value = res || [];
  } catch (e) {
    message.error('获取推荐失败');
  } finally {
    loading.value.recommend = false;
  }
}

// 应用生成的标签
function applyGeneratedTags() {
  if (generatedTags.value.length) {
    emit('applyTags', generatedTags.value);
    message.success('标签已应用');
  }
}

// 获取推荐原因图标
function getReasonIcon(reason: string) {
  if (reason.includes('热门')) return ThunderboltOutlined;
  if (reason.includes('相似')) return EyeOutlined;
  if (reason.includes('常用')) return SendOutlined;
  return CheckCircleOutlined;
}

// 获取相似度颜色
function getSimilarityColor(score: number): string {
  if (score >= 90) return 'red';
  if (score >= 70) return 'orange';
  if (score >= 50) return 'gold';
  return 'default';
}
</script>

<template>
  <Card class="ai-assistant" :bordered="false" v-if="material">
    <template #title>
      <span class="ai-title">
        <RobotOutlined />
        AI 智能助手
      </span>
    </template>

    <Tabs size="small" class="ai-tabs">
      <!-- 自动标签 -->
      <TabPane key="tags" tab="智能标签">
        <div class="ai-section">
          <p class="ai-desc">基于内容分析自动生成标签</p>

          <Button
            type="primary"
            size="small"
            :loading="loading.tags"
            :disabled="generatedTags.length > 0"
            @click="autoGenerateTags"
          >
            <TagOutlined />
            {{ generatedTags.length > 0 ? '已生成' : '生成标签' }}
          </Button>

          <Spin v-if="loading.tags" class="mt-4" />

          <div v-else-if="generatedTags.length" class="tag-result">
            <div class="tag-list">
              <Tag
                v-for="tag in generatedTags"
                :key="tag"
                color="blue"
                class="generated-tag"
              >
                {{ tag }}
              </Tag>
            </div>
            <Button type="link" size="small" @click="applyGeneratedTags">
              <CheckCircleOutlined />
              应用这些标签
            </Button>
          </div>
        </div>
      </TabPane>

      <!-- 相似检测 -->
      <TabPane key="similar" tab="相似检测">
        <div class="ai-section">
          <p class="ai-desc">检测内容相似的素材，避免重复</p>

          <Button
            type="primary"
            size="small"
            :loading="loading.similar"
            :disabled="similarMaterials.length > 0"
            @click="detectSimilar"
          >
            <WarningOutlined />
            {{ similarMaterials.length > 0 ? '已检测' : '检测相似' }}
          </Button>

          <Spin v-if="loading.similar" class="mt-4" />

          <div v-else-if="similarMaterials.length" class="similar-result">
            <div
              v-for="item in similarMaterials"
              :key="item.id"
              class="similar-item"
              @click="emit('view', item)"
            >
              <div class="similar-info">
                <span class="similar-name">{{ item.name }}</span>
                <span class="similar-reason">{{ item.similarityReason }}</span>
              </div>
              <Badge
                :count="`${item.similarityScore}%`"
                :color="getSimilarityColor(item.similarityScore)"
              />
            </div>
          </div>

          <Empty
            v-else-if="!loading.similar && similarMaterials.length === 0"
            description="点击检测查找相似素材"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </div>
      </TabPane>

      <!-- 智能推荐 -->
      <TabPane key="recommend" tab="相关推荐">
        <div class="ai-section">
          <p class="ai-desc">基于使用习惯推荐相关素材</p>

          <Button
            type="primary"
            size="small"
            :loading="loading.recommend"
            :disabled="recommendedMaterials.length > 0"
            @click="fetchRecommendations"
          >
            <ThunderboltOutlined />
            {{ recommendedMaterials.length > 0 ? '已推荐' : '获取推荐' }}
          </Button>

          <Spin v-if="loading.recommend" class="mt-4" />

          <div v-else-if="recommendedMaterials.length" class="recommend-result">
            <div
              v-for="item in recommendedMaterials"
              :key="item.id"
              class="recommend-item"
              @click="emit('view', item)"
            >
              <div class="recommend-main">
                <span class="recommend-name">{{ item.name }}</span>
                <Tag size="small" color="green">
                  <component :is="getReasonIcon(item.reason)" />
                  {{ item.reason }}
                </Tag>
              </div>
              <div class="recommend-meta">
                <span class="recommend-score">匹配度 {{ item.score }}%</span>
                <ArrowRightOutlined />
              </div>
            </div>
          </div>

          <Empty
            v-else-if="!loading.recommend && recommendedMaterials.length === 0"
            description="点击获取个性化推荐"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </div>
      </TabPane>
    </Tabs>
  </Card>
</template>

<style scoped>
.ai-assistant {
  margin-top: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.ai-assistant :deep(.ant-card-head) {
  border-bottom: 1px solid rgb(255 255 255 / 20%);
}

.ai-assistant :deep(.ant-card-head-title) {
  color: white;
}

.ai-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
}

.ai-tabs :deep(.ant-tabs-nav::before) {
  border-bottom-color: rgb(255 255 255 / 20%);
}

.ai-tabs :deep(.ant-tabs-tab) {
  color: rgb(255 255 255 / 70%);
}

.ai-tabs :deep(.ant-tabs-tab-active) {
  color: white;
}

.ai-tabs :deep(.ant-tabs-ink-bar) {
  background: white;
}

.ai-section {
  padding: 8px 0;
}

.ai-desc {
  margin-bottom: 12px;
  font-size: 12px;
  color: rgb(255 255 255 / 80%);
}

.mt-4 {
  margin-top: 16px;
}

.tag-result {
  padding: 12px;
  margin-top: 16px;
  background: rgb(255 255 255 / 10%);
  border-radius: 8px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.generated-tag {
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.similar-result,
.recommend-result {
  margin-top: 16px;
}

.similar-item,
.recommend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  background: rgb(255 255 255 / 10%);
  border-radius: 8px;
  transition: all 0.3s;
}

.similar-item:hover,
.recommend-item:hover {
  background: rgb(255 255 255 / 20%);
}

.similar-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.similar-name {
  font-weight: 500;
  color: white;
}

.similar-reason {
  font-size: 12px;
  color: rgb(255 255 255 / 70%);
}

.recommend-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recommend-name {
  font-weight: 500;
  color: white;
}

.recommend-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: rgb(255 255 255 / 70%);
}

.recommend-score {
  color: #52c41a;
}

:deep(.ant-empty-description) {
  color: rgb(255 255 255 / 60%);
}
</style>
