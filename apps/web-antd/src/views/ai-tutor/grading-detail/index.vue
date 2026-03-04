<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Card,
  Image,
  Spin,
  Empty,
  Button,
  Space,
  Tag,
  Progress,
  Tabs,
  TabPane,
  message,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons-vue';
import { getGradingRecord } from '#/api/grading';
import type { GradingRecord } from '#/api/grading';
import QuestionListTab from '../../lms/grading-records/components/QuestionListTab.vue';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const detail = ref<GradingRecord | null>(null);

// 当前查看的图片索引
const currentImageIndex = ref(0);

// 当前图片的 URLs
const currentImageUrls = computed(() => {
  if (
    !detail.value?.paperImageUrls ||
    detail.value.paperImageUrls.length === 0
  ) {
    return null;
  }
  return detail.value.paperImageUrls[currentImageIndex.value];
});

// 是否有多页
const hasMultiplePages = computed(() => {
  return detail.value?.paperImageUrls && detail.value.paperImageUrls.length > 1;
});

// 获取批改详情
const loadDetail = async () => {
  loading.value = true;
  try {
    const recordId = route.params.id as string;
    detail.value = await getGradingRecord(recordId);
  } catch (error: any) {
    message.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

// 切换到上一页
const prevPage = () => {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--;
  }
};

// 切换到下一页
const nextPage = () => {
  if (
    detail.value?.paperImageUrls &&
    currentImageIndex.value < detail.value.paperImageUrls.length - 1
  ) {
    currentImageIndex.value++;
  }
};

// 格式化时间
const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 获取正确率颜色
const getAccuracyColor = (accuracy: number) => {
  if (accuracy >= 0.8) return '#52c41a';
  if (accuracy >= 0.6) return '#faad14';
  return '#ff4d4f';
};

// 返回列表
const goBack = () => {
  router.push('/ai-tutor/grading-history');
};

onMounted(() => {
  loadDetail();
});
</script>

<template>
  <div class="grading-detail-page">
    <Spin :spinning="loading">
      <Card v-if="detail" :bordered="false">
        <template #title>
          <div class="card-header">
            <Button type="text" @click="goBack">
              <template #icon><ArrowLeftOutlined /></template>
              返回列表
            </Button>
            <h2>批改详情</h2>
          </div>
        </template>

        <!-- Tabs：试卷预览 + 题目列表 -->
        <Tabs default-active-key="preview" type="card">
          <!-- 试卷预览标签页 -->
          <TabPane key="preview" tab="试卷预览">
            <!-- 试卷图片展示 -->
            <div v-if="currentImageUrls" class="paper-viewer">
              <!-- 图片展示区域 -->
              <div class="image-container">
                <!-- 使用预览图，点击可查看原图 -->
                <Image
                  :src="currentImageUrls.enhanced || currentImageUrls.preview"
                  :preview="{
                    src: currentImageUrls.enhanced || currentImageUrls.original,
                  }"
                  :alt="`第${currentImageUrls.pageIndex}页`"
                  class="paper-image"
                />
              </div>

              <!-- 分页控制 -->
              <div v-if="hasMultiplePages" class="page-controls">
                <Button :disabled="currentImageIndex === 0" @click="prevPage">
                  <template #icon><LeftOutlined /></template>
                  上一页
                </Button>
                <span class="page-indicator">
                  {{ currentImageIndex + 1 }} /
                  {{ detail.paperImageUrls!.length }}
                </span>
                <Button
                  :disabled="
                    currentImageIndex === detail.paperImageUrls!.length - 1
                  "
                  @click="nextPage"
                >
                  下一页
                  <template #icon><RightOutlined /></template>
                </Button>
              </div>

              <!-- 缩略图导航 -->
              <div v-if="hasMultiplePages" class="thumbnail-nav">
                <div
                  v-for="(img, index) in detail.paperImageUrls"
                  :key="index"
                  :class="[
                    'thumbnail-item',
                    { active: index === currentImageIndex },
                  ]"
                  @click="currentImageIndex = index"
                >
                  <img
                    :src="img.thumbnail"
                    :alt="`第${img.pageIndex}页`"
                    loading="lazy"
                  />
                  <span class="page-number">{{ img.pageIndex }}</span>
                </div>
              </div>
            </div>

            <!-- 无图片状态 -->
            <Empty v-else description="暂无试卷图片" />

            <!-- 批改信息 -->
            <div class="grading-info">
              <h3>批改结果</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">批改时间：</span>
                  <span class="value">{{ formatTime(detail.createdAt) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">题目数：</span>
                  <Tag color="blue">{{ detail.totalQuestions }}</Tag>
                </div>
                <div class="info-item">
                  <span class="label">正确数：</span>
                  <Tag color="green">{{ detail.correctCount }}</Tag>
                </div>
                <div class="info-item">
                  <span class="label">正确率：</span>
                  <Progress
                    :percent="detail.accuracy * 100"
                    :stroke-color="getAccuracyColor(detail.accuracy)"
                    :format="(percent) => `${percent?.toFixed(1)}%`"
                    size="small"
                    style="width: 200px"
                  />
                </div>
                <div class="info-item">
                  <span class="label">得分：</span>
                  <span class="value score"
                    >{{ detail.totalScore }} / {{ detail.maxScore }}</span
                  >
                </div>
                <div class="info-item">
                  <span class="label">处理耗时：</span>
                  <span class="value">{{ detail.processingMs }}ms</span>
                </div>
              </div>
            </div>
          </TabPane>

          <!-- 题目列表标签页 -->
          <TabPane key="questions" tab="题目列表">
            <QuestionListTab :record-id="route.params.id as string" />
          </TabPane>
        </Tabs>
      </Card>
    </Spin>
  </div>
</template>

<style scoped>
.grading-detail-page {
  padding: 16px;
}

.card-header {
  display: flex;
  gap: 16px;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
}

.paper-viewer {
  margin-bottom: 24px;
}

.image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 20px;
  margin-bottom: 16px;
  background: #f5f5f5;
  border-radius: 8px;
}

.paper-image {
  max-width: 100%;
  height: auto;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.page-controls {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.page-indicator {
  min-width: 80px;
  font-size: 14px;
  color: #666;
  text-align: center;
}

.thumbnail-nav {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 8px 0;
  overflow-x: auto;
}

.thumbnail-item {
  position: relative;
  flex-shrink: 0;
  width: 80px;
  height: 100px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 4px;
  transition: all 0.3s;
}

.thumbnail-item:hover {
  border-color: #1890ff;
}

.thumbnail-item.active {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgb(24 144 255 / 30%);
}

.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.page-number {
  position: absolute;
  right: 4px;
  bottom: 4px;
  padding: 2px 6px;
  font-size: 12px;
  color: #fff;
  background: rgb(0 0 0 / 70%);
  border-radius: 2px;
}

.grading-info {
  padding: 16px;
  margin-top: 24px;
  background: #f9f9f9;
  border-radius: 8px;
}

.grading-info h3 {
  margin: 0 0 16px;
  font-size: 18px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item .label {
  margin-right: 8px;
  color: #666;
  white-space: nowrap;
}

.info-item .value {
  font-weight: 500;
  color: #333;
}

.info-item .value.score {
  font-size: 16px;
  color: #1890ff;
}

@media (max-width: 768px) {
  .grading-detail-page {
    padding: 8px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .thumbnail-nav {
    justify-content: flex-start;
  }

  .page-controls {
    flex-wrap: wrap;
  }
}
</style>
