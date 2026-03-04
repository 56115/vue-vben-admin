<template>
  <div class="mistake-detail-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <!-- 面包屑导航 -->
      <div class="breadcrumb-section">
        <a-breadcrumb>
          <a-breadcrumb-item>
            <router-link to="/education">教育管理</router-link>
          </a-breadcrumb-item>
          <a-breadcrumb-item>
            <router-link to="/education/mistakes">错题管理</router-link>
          </a-breadcrumb-item>
          <a-breadcrumb-item>错题详情</a-breadcrumb-item>
        </a-breadcrumb>
      </div>

      <!-- 头部内容 -->
      <div class="header-content">
        <div class="header-left">
          <a-button type="text" @click="handleBack">
            <LeftOutlined />
          </a-button>
          <h2>{{ pageTitle }}</h2>
        </div>
        <a-space>
          <!-- 上一题/下一题 -->
          <a-button-group>
            <a-button :disabled="!hasPrevious" @click="navigateToPrevious">
              <LeftOutlined />
              上一题
            </a-button>
            <a-button :disabled="!hasNext" @click="navigateToNext">
              下一题
              <RightOutlined />
            </a-button>
          </a-button-group>

          <!-- 操作按钮 -->
          <a-dropdown>
            <a-button>
              <MoreOutlined />
              更多操作
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="exportPDF">
                  <FilePdfOutlined />
                  导出PDF
                </a-menu-item>
                <a-menu-item @click="addToErrorBook">
                  <BookOutlined />
                  加入错题本
                </a-menu-item>
                <a-menu-item @click="markAsMastered">
                  <CheckCircleOutlined />
                  标记为已掌握
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item @click="shareMistake">
                  <ShareAltOutlined />
                  分享
                </a-menu-item>
                <a-menu-item @click="printMistake">
                  <PrinterOutlined />
                  打印
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>

          <!-- 刷新 -->
          <a-button @click="refreshData" :loading="loading">
            <ReloadOutlined />
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 主体内容区 -->
    <div class="page-content">
      <a-spin :spinning="loading" tip="加载中...">
        <!-- 三栏布局 -->
        <div class="three-column-layout">
          <!-- 左侧：图片标注区 -->
          <div class="left-panel">
            <a-card
              title="试卷原图"
              :bordered="false"
              class="panel-card"
              :body-style="{ padding: 0, height: '100%' }"
            >
              <template #extra>
                <a-space>
                  <a-tag :color="getSubjectColor(mistakeData?.subject)">
                    {{ getSubjectText(mistakeData?.subject) }}
                  </a-tag>
                  <a-tag color="blue">
                    第 {{ mistakeData?.questionNumber }} 题
                  </a-tag>
                </a-space>
              </template>

              <image-annotator
                v-if="imageData"
                :image-url="imageData.imageUrl"
                :questions="imageData.questions"
                :current-id="currentQuestionId"
                @question-click="handleQuestionClick"
                @update:current-id="currentQuestionId = $event"
              />

              <a-empty
                v-else
                description="暂无试卷图片"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
                style="margin: 60px 0"
              />
            </a-card>
          </div>

          <!-- 中间：题目信息区 -->
          <div class="middle-panel">
            <!-- 基本信息卡片 -->
            <a-card
              title="题目信息"
              :bordered="false"
              class="panel-card info-card"
            >
              <template #extra>
                <a-space>
                  <a-tag
                    :color="mistakeData?.isCorrect ? 'green' : 'red'"
                    style="font-size: 14px"
                  >
                    {{ mistakeData?.isCorrect ? '正确' : '错误' }}
                  </a-tag>
                  <a-tag :color="getErrorTypeColor(mistakeData?.errorType)">
                    {{ getErrorTypeText(mistakeData?.errorType) }}
                  </a-tag>
                </a-space>
              </template>

              <a-descriptions :column="2" bordered size="small">
                <a-descriptions-item label="题目类型">
                  {{ getQuestionTypeText(mistakeData?.questionType) }}
                </a-descriptions-item>
                <a-descriptions-item label="难度">
                  <a-rate
                    :value="mistakeData?.difficulty || 3"
                    disabled
                    :count="5"
                    style="font-size: 14px"
                  />
                </a-descriptions-item>
                <a-descriptions-item label="分值">
                  <span
                    style="font-size: 16px; font-weight: 600; color: #ff4d4f"
                  >
                    {{ mistakeData?.maxScore }}
                  </span>
                  分
                </a-descriptions-item>
                <a-descriptions-item label="得分">
                  <span
                    style="font-size: 16px; font-weight: 600"
                    :style="{
                      color: getScoreColor(
                        mistakeData?.score,
                        mistakeData?.maxScore,
                      ),
                    }"
                  >
                    {{ mistakeData?.score }}
                  </span>
                  分
                </a-descriptions-item>
                <a-descriptions-item label="OCR置信度" :span="2">
                  <a-progress
                    :percent="(mistakeData?.ocrConfidence || 0) * 100"
                    :format="(percent) => `${percent.toFixed(1)}%`"
                    :status="getOcrConfidenceStatus(mistakeData?.ocrConfidence)"
                  />
                </a-descriptions-item>
              </a-descriptions>

              <!-- 题目内容 -->
              <div class="question-content">
                <div class="content-label">
                  <FileTextOutlined />
                  <span>题目内容</span>
                </div>
                <div class="content-text">
                  {{ mistakeData?.questionContent }}
                </div>
                <div
                  v-if="mistakeData?.questionContentLatex"
                  class="content-latex"
                >
                  <katex-renderer
                    :expression="mistakeData.questionContentLatex"
                    :auto-fix="true"
                  />
                </div>
              </div>

              <!-- 学生答案 -->
              <div class="answer-section student-answer">
                <div class="section-header">
                  <EditOutlined />
                  <span>学生答案</span>
                  <a-tag
                    :color="mistakeData?.isCorrect ? 'green' : 'red'"
                    size="small"
                  >
                    {{ mistakeData?.isCorrect ? '正确' : '错误' }}
                  </a-tag>
                </div>
                <div class="answer-content">
                  <div class="answer-text">
                    {{ mistakeData?.studentAnswer || '未作答' }}
                  </div>
                  <div
                    v-if="mistakeData?.studentAnswerLatex"
                    class="answer-latex"
                  >
                    <katex-renderer
                      :expression="mistakeData.studentAnswerLatex"
                      :auto-fix="true"
                    />
                  </div>
                </div>
              </div>

              <!-- 正确答案 -->
              <div class="answer-section correct-answer">
                <div class="section-header">
                  <CheckCircleOutlined />
                  <span>正确答案</span>
                </div>
                <div class="answer-content">
                  <div class="answer-text">
                    {{ mistakeData?.correctAnswer }}
                  </div>
                  <div
                    v-if="mistakeData?.correctAnswerLatex"
                    class="answer-latex"
                  >
                    <katex-renderer
                      :expression="mistakeData.correctAnswerLatex"
                      :auto-fix="true"
                    />
                  </div>
                </div>
              </div>

              <!-- 错误分析 -->
              <div v-if="mistakeData?.errorAnalysis" class="analysis-section">
                <div class="section-header">
                  <BulbOutlined />
                  <span>错误分析</span>
                </div>
                <a-alert
                  :message="mistakeData.errorAnalysis"
                  type="warning"
                  show-icon
                />
              </div>

              <!-- 学习建议 -->
              <div v-if="mistakeData?.suggestion" class="suggestion-section">
                <div class="section-header">
                  <BulbOutlined />
                  <span>学习建议</span>
                </div>
                <a-alert
                  :message="mistakeData.suggestion"
                  type="info"
                  show-icon
                />
              </div>
            </a-card>

            <!-- 步骤评分卡片 -->
            <a-card
              title="解题步骤评分"
              :bordered="false"
              class="panel-card"
              :body-style="{ padding: 0 }"
            >
              <step-score-panel
                v-if="mistakeData?.questionItemId"
                :question-item-id="mistakeData.questionItemId"
                :editable="canEdit"
                @score-changed="handleScoreChanged"
                @saved="handleStepScoresSaved"
              />
            </a-card>
          </div>

          <!-- 右侧：矫正工具区 -->
          <div class="right-panel">
            <!-- Tab 切换 -->
            <a-card
              :bordered="false"
              class="panel-card"
              :body-style="{ padding: 0 }"
            >
              <a-tabs v-model:activeKey="activeTab" type="card">
                <!-- 矫正编辑 -->
                <a-tab-pane key="correction" tab="矫正编辑">
                  <template #tab>
                    <EditOutlined />
                    矫正编辑
                  </template>
                  <correction-editor
                    v-if="mistakeData"
                    :question="mistakeData"
                    :user-id="currentUserId"
                    :user-role="currentUserRole"
                    :editable="canEdit"
                    @save="handleCorrectionSave"
                    @submit-review="handleSubmitReview"
                    @cancel="handleCorrectionCancel"
                  />
                </a-tab-pane>

                <!-- 矫正历史 -->
                <a-tab-pane key="history" tab="矫正历史">
                  <template #tab>
                    <HistoryOutlined />
                    矫正历史
                    <a-badge
                      v-if="historyCount > 0"
                      :count="historyCount"
                      :number-style="{ backgroundColor: '#52c41a' }"
                      style="margin-left: 8px"
                    />
                  </template>
                  <history-timeline
                    v-if="mistakeData?.questionItemId"
                    :question-item-id="mistakeData.questionItemId"
                    :allow-rollback="canEdit"
                    @record-loaded="handleHistoryLoaded"
                    @rollback-success="handleRollbackSuccess"
                  />
                </a-tab-pane>

                <!-- 知识点关联 -->
                <a-tab-pane key="knowledge" tab="知识点">
                  <template #tab>
                    <NodeIndexOutlined />
                    知识点
                  </template>
                  <div class="knowledge-panel">
                    <a-list
                      :data-source="mistakeData?.knowledgePoints || []"
                      :locale="{ emptyText: '暂无关联知识点' }"
                    >
                      <template #renderItem="{ item }">
                        <a-list-item>
                          <a-list-item-meta>
                            <template #title>
                              <a @click="viewKnowledgePoint(item)">
                                {{ item.name }}
                              </a>
                            </template>
                            <template #description>
                              {{ item.description }}
                            </template>
                          </a-list-item-meta>
                          <template #actions>
                            <a @click="practiceKnowledge(item)">练习</a>
                          </template>
                        </a-list-item>
                      </template>
                    </a-list>
                  </div>
                </a-tab-pane>

                <!-- 相似题目 -->
                <a-tab-pane key="similar" tab="相似题">
                  <template #tab>
                    <CopyOutlined />
                    相似题
                  </template>
                  <div class="similar-panel">
                    <a-list
                      :data-source="similarQuestions"
                      :locale="{ emptyText: '暂无相似题目' }"
                      :loading="loadingSimilar"
                    >
                      <template #renderItem="{ item }">
                        <a-list-item>
                          <a-list-item-meta>
                            <template #title>
                              <a @click="viewSimilarQuestion(item)">
                                {{ item.questionContent }}
                              </a>
                            </template>
                            <template #description>
                              <a-space>
                                <a-tag size="small">
                                  相似度:
                                  {{ (item.similarity * 100).toFixed(0) }}%
                                </a-tag>
                                <span>{{ item.source }}</span>
                              </a-space>
                            </template>
                          </a-list-item-meta>
                          <template #actions>
                            <a @click="practiceSimilar(item)">练习</a>
                          </template>
                        </a-list-item>
                      </template>
                    </a-list>
                  </div>
                </a-tab-pane>
              </a-tabs>
            </a-card>
          </div>
        </div>
      </a-spin>
    </div>

    <!-- 底部操作栏（固定） -->
    <div v-if="canEdit" class="page-footer">
      <div class="footer-content">
        <a-space :size="16">
          <a-button
            type="primary"
            size="large"
            :loading="saving"
            @click="saveAllChanges"
          >
            <SaveOutlined />
            保存所有修改
          </a-button>
          <a-button size="large" @click="submitForReview" :loading="submitting">
            <CheckOutlined />
            提交审核
          </a-button>
          <a-button size="large" @click="handleBack"> 取消 </a-button>
        </a-space>

        <a-space :size="16">
          <span class="change-indicator" v-if="hasUnsavedChanges">
            <ExclamationCircleOutlined style="color: #faad14" />
            有未保存的修改
          </span>
        </a-space>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Modal, Empty } from 'ant-design-vue';
import {
  LeftOutlined,
  RightOutlined,
  MoreOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ShareAltOutlined,
  PrinterOutlined,
  FileTextOutlined,
  EditOutlined,
  BulbOutlined,
  SaveOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  NodeIndexOutlined,
  CopyOutlined,
} from '@ant-design/icons-vue';
import axios from 'axios';
import ImageAnnotator from '#/components/ImageAnnotator.vue';
import CorrectionEditor from '#/components/CorrectionEditor.vue';
import StepScorePanel from '#/components/StepScorePanel.vue';
import HistoryTimeline from '#/components/HistoryTimeline.vue';
import KatexRenderer from '#/components/KatexRenderer.vue';
// PageHeader component removed - using plain div instead

// 类型定义
interface MistakeData {
  id: string;
  questionItemId: string;
  questionNumber: string;
  subject: string;
  questionType: string;
  questionContent: string;
  questionContentLatex?: string;
  studentAnswer: string;
  studentAnswerLatex?: string;
  correctAnswer: string;
  correctAnswerLatex?: string;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  errorType: string;
  errorAnalysis: string;
  suggestion: string;
  difficulty: number;
  ocrConfidence: number;
  knowledgePoints?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

interface ImageData {
  imageUrl: string;
  questions: Array<{
    id: string;
    questionNumber: string;
    regionX: number;
    regionY: number;
    regionWidth: number;
    regionHeight: number;
    isCorrect: boolean;
    ocrConfidence: number;
  }>;
}

// Hooks
const route = useRoute();
const router = useRouter();

// State
const loading = ref(false);
const saving = ref(false);
const submitting = ref(false);
const loadingSimilar = ref(false);

const mistakeData = ref<MistakeData | null>(null);
const imageData = ref<ImageData | null>(null);
const similarQuestions = ref<any[]>([]);

const currentQuestionId = ref<string>('');
const activeTab = ref('correction');
const historyCount = ref(0);
const hasUnsavedChanges = ref(false);

// 用户信息（从 store 或 auth 获取）
const currentUserId = ref(1); // TODO: 从实际的用户状态获取
const currentUserRole = ref('teacher'); // TODO: 从实际的用户状态获取

// Computed
const mistakeId = computed(() => route.params.id as string);

const pageTitle = computed(() => {
  if (!mistakeData.value) return '错题详情';
  return `第 ${mistakeData.value.questionNumber} 题 - ${getSubjectText(mistakeData.value.subject)}`;
});

const canEdit = computed(() => {
  // TODO: 根据实际权限判断
  return ['teacher', 'expert', 'admin'].includes(currentUserRole.value);
});

const hasPrevious = computed(() => {
  // TODO: 实现上一题逻辑
  return false;
});

const hasNext = computed(() => {
  // TODO: 实现下一题逻辑
  return false;
});

// 加载数据
async function loadMistakeData() {
  loading.value = true;
  try {
    // 加载错题详情
    const response = await axios.get(
      `/api/education/mistakes/${mistakeId.value}`,
    );
    mistakeData.value = response.data.data;

    // 如果有题目ID，加载试卷图片
    if (mistakeData.value?.questionItemId) {
      await loadPaperImage(mistakeData.value.questionItemId);
    }

    // 加载相似题目
    loadSimilarQuestions();
  } catch (error: any) {
    console.error('Failed to load mistake data:', error);
    message.error(error.response?.data?.message || '加载错题详情失败');
  } finally {
    loading.value = false;
  }
}

// 加载试卷图片
async function loadPaperImage(questionItemId: string) {
  try {
    const response = await axios.get(
      `/api/education/paper/question-items/${questionItemId}/paper-image`,
    );
    imageData.value = response.data.data;
    currentQuestionId.value = questionItemId;
  } catch (error: any) {
    console.error('Failed to load paper image:', error);
    // 不阻断主流程
  }
}

// 加载相似题目
async function loadSimilarQuestions() {
  if (!mistakeData.value) return;

  loadingSimilar.value = true;
  try {
    const response = await axios.get(`/api/education/questions/similar`, {
      params: {
        questionContent: mistakeData.value.questionContent,
        limit: 5,
      },
    });
    similarQuestions.value = response.data.data || [];
  } catch (error: any) {
    console.error('Failed to load similar questions:', error);
  } finally {
    loadingSimilar.value = false;
  }
}

// 刷新数据
async function refreshData() {
  await loadMistakeData();
  message.success('刷新成功');
}

// 事件处理
function handleQuestionClick(_question: any) {
  // question click handler
}

function handleScoreChanged(_totalScore: number) {
  hasUnsavedChanges.value = true;
}

function handleStepScoresSaved(_steps: any[]) {
  hasUnsavedChanges.value = false;
  message.success('步骤评分已保存');
}

function handleCorrectionSave(_data: any) {
  hasUnsavedChanges.value = true;
}

function handleSubmitReview() {
  Modal.confirm({
    title: '确认提交审核',
    content: '提交后将进入专家审核队列，是否继续？',
    onOk: async () => {
      try {
        await axios.post(`/api/education/paper/corrections/submit-review`, {
          questionItemId: mistakeData.value?.questionItemId,
        });
        message.success('已提交审核');
        refreshData();
      } catch (error: any) {
        message.error(error.response?.data?.message || '提交失败');
      }
    },
  });
}

function handleCorrectionCancel() {
  if (hasUnsavedChanges.value) {
    Modal.confirm({
      title: '确认取消',
      content: '有未保存的修改，确认取消吗？',
      onOk: () => {
        hasUnsavedChanges.value = false;
      },
    });
  }
}

function handleHistoryLoaded(records: any[]) {
  historyCount.value = records.length;
}

function handleRollbackSuccess(recordId: string) {
  message.success('回滚成功');
  refreshData();
}

// 导航
function handleBack() {
  if (hasUnsavedChanges.value) {
    Modal.confirm({
      title: '确认返回',
      content: '有未保存的修改，确认返回吗？',
      onOk: () => {
        router.back();
      },
    });
  } else {
    router.back();
  }
}

function navigateToPrevious() {
  // TODO: 实现上一题导航
  message.info('上一题功能待实现');
}

function navigateToNext() {
  // TODO: 实现下一题导航
  message.info('下一题功能待实现');
}

// 操作
async function saveAllChanges() {
  saving.value = true;
  try {
    // TODO: 实现保存所有修改的逻辑
    await new Promise((resolve) => setTimeout(resolve, 1000));
    hasUnsavedChanges.value = false;
    message.success('保存成功');
  } catch (error: any) {
    message.error(error.response?.data?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function submitForReview() {
  submitting.value = true;
  try {
    await axios.post(`/api/education/paper/corrections/submit-review`, {
      questionItemId: mistakeData.value?.questionItemId,
    });
    message.success('已提交审核');
    refreshData();
  } catch (error: any) {
    message.error(error.response?.data?.message || '提交失败');
  } finally {
    submitting.value = false;
  }
}

function exportPDF() {
  message.info('导出PDF功能待实现');
}

function addToErrorBook() {
  message.info('加入错题本功能待实现');
}

function markAsMastered() {
  Modal.confirm({
    title: '确认标记为已掌握',
    content: '标记后此题将从待复习列表中移除',
    onOk: async () => {
      try {
        await axios.patch(
          `/api/education/mistakes/${mistakeId.value}/mastered`,
        );
        message.success('已标记为已掌握');
        refreshData();
      } catch (error: any) {
        message.error(error.response?.data?.message || '操作失败');
      }
    },
  });
}

function shareMistake() {
  message.info('分享功能待实现');
}

function printMistake() {
  window.print();
}

function viewKnowledgePoint(item: any) {
  router.push(`/education/knowledge/${item.id}`);
}

function practiceKnowledge(item: any) {
  router.push(`/education/practice?knowledge=${item.id}`);
}

function viewSimilarQuestion(item: any) {
  router.push(`/education/mistakes/${item.id}`);
}

function practiceSimilar(item: any) {
  message.info('练习功能待实现');
}

// 工具函数
function getSubjectColor(subject: string): string {
  const colors: Record<string, string> = {
    MATH: 'blue',
    CHINESE: 'red',
    ENGLISH: 'green',
    PHYSICS: 'purple',
    CHEMISTRY: 'orange',
  };
  return colors[subject] || 'default';
}

function getSubjectText(subject: string): string {
  const texts: Record<string, string> = {
    MATH: '数学',
    CHINESE: '语文',
    ENGLISH: '英语',
    PHYSICS: '物理',
    CHEMISTRY: '化学',
  };
  return texts[subject] || subject;
}

function getQuestionTypeText(type: string): string {
  const texts: Record<string, string> = {
    MULTIPLE_CHOICE: '选择题',
    FILL_BLANK: '填空题',
    SHORT_ANSWER: '简答题',
    CALCULATION: '计算题',
  };
  return texts[type] || type;
}

function getErrorTypeColor(type: string): string {
  const colors: Record<string, string> = {
    CALCULATION_ERROR: 'red',
    CONCEPT_ERROR: 'orange',
    CARELESS_ERROR: 'blue',
    METHOD_ERROR: 'purple',
  };
  return colors[type] || 'default';
}

function getErrorTypeText(type: string): string {
  const texts: Record<string, string> = {
    CALCULATION_ERROR: '计算错误',
    CONCEPT_ERROR: '概念错误',
    CARELESS_ERROR: '粗心错误',
    METHOD_ERROR: '方法错误',
  };
  return texts[type] || type;
}

function getScoreColor(score: number, maxScore: number): string {
  const rate = score / maxScore;
  if (rate >= 0.9) return '#52c41a';
  if (rate >= 0.7) return '#faad14';
  return '#ff4d4f';
}

function getOcrConfidenceStatus(
  confidence: number,
): 'success' | 'normal' | 'exception' {
  if (confidence >= 0.9) return 'success';
  if (confidence >= 0.75) return 'normal';
  return 'exception';
}

// 键盘快捷键
function handleKeydown(e: KeyboardEvent) {
  // Ctrl+S 保存
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    if (canEdit.value) {
      saveAllChanges();
    }
  }
  // Ctrl+Enter 提交审核
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    if (canEdit.value) {
      submitForReview();
    }
  }
  // 左箭头 上一题
  if (e.key === 'ArrowLeft' && hasPrevious.value) {
    navigateToPrevious();
  }
  // 右箭头 下一题
  if (e.key === 'ArrowRight' && hasNext.value) {
    navigateToNext();
  }
}

// 生命周期
onMounted(() => {
  loadMistakeData();
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'MistakeDetailPage',
});
</script>

<style scoped lang="less">
.mistake-detail-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f0f2f5;

  // 页面头部样式
  .page-header {
    background: #fff;
    padding: 16px 24px;
    border-bottom: 1px solid #e8e8e8;

    .breadcrumb-section {
      margin-bottom: 16px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;

        h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 500;
        }
      }
    }
  }

  .page-content {
    flex: 1;
    overflow: hidden;
    padding: 16px;
  }

  .three-column-layout {
    display: grid;
    grid-template-columns: 450px 1fr 500px;
    gap: 16px;
    height: 100%;

    .left-panel,
    .middle-panel,
    .right-panel {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .panel-card {
      margin-bottom: 16px;
      height: 100%;
      display: flex;
      flex-direction: column;

      :deep(.ant-card-body) {
        flex: 1;
        overflow-y: auto;
      }
    }

    .middle-panel {
      overflow-y: auto;
    }
  }

  // 题目信息卡片样式
  .info-card {
    .question-content,
    .answer-section,
    .analysis-section,
    .suggestion-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
    }

    .content-label,
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #262626;
      margin-bottom: 12px;
    }

    .content-text,
    .answer-text {
      font-size: 14px;
      line-height: 1.8;
      color: #595959;
      padding: 12px;
      background: #fafafa;
      border-radius: 4px;
      white-space: pre-wrap;
    }

    .content-latex,
    .answer-latex {
      margin-top: 8px;
      padding: 12px;
      background: #f0f5ff;
      border: 1px solid #adc6ff;
      border-radius: 4px;
    }

    .student-answer {
      .answer-content {
        background: #fff2e8;
        border: 1px solid #ffbb96;
        border-radius: 4px;
        padding: 12px;
      }
    }

    .correct-answer {
      .answer-content {
        background: #f6ffed;
        border: 1px solid #b7eb8f;
        border-radius: 4px;
        padding: 12px;
      }
    }
  }

  // 右侧面板样式
  .knowledge-panel,
  .similar-panel {
    padding: 16px;
  }

  // 底部操作栏
  .page-footer {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    border-top: 1px solid #e8e8e8;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
    z-index: 100;

    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      max-width: 1920px;
      margin: 0 auto;

      .change-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #faad14;
      }
    }
  }
}

// 打印样式
@media print {
  .page-header,
  .page-footer,
  .right-panel {
    display: none !important;
  }

  .three-column-layout {
    grid-template-columns: 1fr !important;
  }
}
</style>
