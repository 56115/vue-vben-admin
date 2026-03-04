<script lang="ts" setup>
/**
 * 拍照批改统一入口 - 工作流模式
 * Phase 1: 核心菜单重组 - 合并题目识别+作业批改
 *
 * 功能：
 * - 统一上传界面
 * - 批改模式切换（仅对答案 / 启发模式）
 * - 实时批改进度（通过工作流执行状态）
 * - 自动跳转到批改历史
 * - 支持 homework-grading-approval 工作流 (id=51)
 */
import { ref, computed, watch } from 'vue';
import {
  Card,
  Upload,
  Button,
  Radio,
  Switch,
  Spin,
  Alert,
  Progress,
  Tabs,
  TabPane,
  Divider,
  message,
} from 'ant-design-vue';
import {
  CameraOutlined,
  EditOutlined,
  FileImageOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue';
import type { UploadFile } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import MigrationNotice from '#/components/MigrationNotice.vue';
import { requestClient } from '#/api/request';

const router = useRouter();

// 批改模式
const gradingMode = ref<'answer' | 'guide'>('answer');
const isLoading = ref(false);
const fileList = ref<UploadFile[]>([]);
const previewUrl = ref<string>('');
const progress = ref(0);
const currentStep = ref<string>('');

// 批改模式选项
const gradingModeOptions = [
  { value: 'answer', label: '仅对答案', desc: '快速批改，显示对错' },
  { value: 'guide', label: '启发模式', desc: '提供家长引导话术' },
];

// 处理文件选择
const handleFileChange = (info: { file: UploadFile; fileList: UploadFile[] }) => {
  fileList.value = info.fileList.slice(-1);

  if (info.file.originFileObj) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewUrl.value = e.target?.result as string;
    };
    reader.readAsDataURL(info.file.originFileObj);
  }
};

// 开始批改（工作流模式）
const handleStartGrading = async () => {
  if (fileList.value.length === 0 || !fileList.value[0]?.originFileObj) {
    message.warning('请先上传作业图片');
    return;
  }

  isLoading.value = true;
  progress.value = 0;
  currentStep.value = '提交批改任务...';

  try {
    // 准备表单数据 - 使用工作流模式
    const formData = new FormData();
    formData.append('files', fileList.value[0].originFileObj);
    formData.append('subject', 'MATH');
    formData.append('gradeLevel', 'grade-3'); // 默认小学三年级，可根据实际调整
    formData.append('gradingMode', gradingMode.value);

    // 调用工作流批改 API (Qwen-VL + 审批流模式)
    const submitResponse = await requestClient.post<{
      recordId: string;
      executionId: string;
      traceId?: string;
      status: string;
      message: string;
      estimatedSeconds?: number;
    }>('/education/paper/submit-qwen-vl', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });

    currentStep.value = '批改任务已提交，正在处理...';

    const { executionId, recordId } = submitResponse;

    // 轮询执行状态
    let attempts = 0;
    const maxAttempts = 60; // 最多轮询60次（2分钟）
    const pollInterval = 2000; // 每2秒查询一次

    const pollStatus = async () => {
      try {
        const statusResponse = await requestClient.get<{
          executionId: string;
          recordId: string;
          status: string;
          progress: number;
          currentStep?: string;
          steps: Array<{
            stepKey: string;
            name: string;
            status: string;
            startedAt?: string;
            completedAt?: string;
            error?: string;
          }>;
          result?: any;
          error?: string;
          requiresApproval?: boolean;
          approvalReason?: string;
        }>(`/education/paper/executions/${executionId}/status`);

        // 更新进度条
        progress.value = statusResponse.progress || 0;
        currentStep.value = statusResponse.currentStep || '处理中...';

        if (statusResponse.status === 'COMPLETED') {
          // 批改完成
          progress.value = 100;
          currentStep.value = '批改完成！';
          message.success('批改完成！即将跳转...');
          setTimeout(() => {
            router.push('/ai-tutor/grading-history');
          }, 1000);
          return;
        }

        if (statusResponse.status === 'FAILED') {
          // 批改失败
          currentStep.value = '批改失败';
          message.error(`批改失败: ${statusResponse.error || '未知错误'}`);
          isLoading.value = false;
          return;
        }

        if (statusResponse.status === 'WAITING_APPROVAL') {
          // 等待审批
          currentStep.value = '批改结果需要人工审核...';
          message.info('批改结果需要人工审核，请等待审批完成');
          // 继续轮询，等待审批
        }

        // 继续轮询
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollStatus, pollInterval);
        } else {
          message.warning('批改超时，请稍后在批改历史中查看结果');
          isLoading.value = false;
          router.push('/ai-tutor/grading-history');
        }
      } catch (error: any) {
        console.error('Poll status error:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollStatus, pollInterval);
        } else {
          message.error('查询批改状态失败');
          isLoading.value = false;
        }
      }
    };

    // 开始轮询
    setTimeout(pollStatus, pollInterval);
  } catch (error: any) {
    message.error(error?.response?.data?.message || error.message || '提交批改失败');
    console.error('Grading submission error:', error);
    isLoading.value = false;
  }
};

// 清空
const handleClear = () => {
  fileList.value = [];
  previewUrl.value = '';
  progress.value = 0;
  currentStep.value = '';
};

// 监听文件列表变化，自动更新预览
watch(fileList, (newList) => {
  if (newList.length > 0 && newList[0]?.originFileObj) {
    const file = newList[0].originFileObj;
    const reader = new FileReader();
    reader.onload = (e) => {
      previewUrl.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  } else if (newList.length === 0) {
    previewUrl.value = '';
  }
}, { deep: true });
</script>

<template>
  <div class="quick-grading-page">
    <!-- 迁移提示 -->
    <MigrationNotice />

    <div class="page-header">
      <h2><CameraOutlined class="header-icon" /> 拍照批改 (工作流模式)</h2>
      <p>拍照上传作业，AI 自动识别并批改，支持启发式引导 + 审批流</p>
    </div>

    <div class="content-wrapper">
      <!-- 左侧：上传区 -->
      <div class="upload-section">
        <Card title="上传作业" :bordered="false">
          <!-- 上传组件 -->
          <div class="upload-area">
            <Upload.Dragger
              v-model:file-list="fileList"
              :before-upload="() => false"
              accept="image/*"
              :max-count="1"
              @change="handleFileChange"
            >
              <div v-if="previewUrl" class="preview-image">
                <img :src="previewUrl" alt="预览" />
              </div>
              <div v-else class="upload-placeholder">
                <p class="ant-upload-drag-icon">
                  <FileImageOutlined style="font-size: 48px; color: #1890ff" />
                </p>
                <p class="ant-upload-text">点击或拖拽作业图片到此处</p>
                <p class="ant-upload-hint">
                  支持 JPG、PNG 格式，建议清晰拍摄
                </p>
              </div>
            </Upload.Dragger>
          </div>

          <Divider orientation="left">批改模式</Divider>

          <!-- 批改模式选择 -->
          <Radio.Group
            v-model:value="gradingMode"
            button-style="solid"
            size="large"
            class="mode-selector"
          >
            <Radio.Button
              v-for="mode in gradingModeOptions"
              :key="mode.value"
              :value="mode.value"
            >
              <div class="mode-option">
                <div class="mode-label">{{ mode.label }}</div>
                <div class="mode-desc">{{ mode.desc }}</div>
              </div>
            </Radio.Button>
          </Radio.Group>

          <!-- 模式说明 -->
          <Alert
            v-if="gradingMode === 'guide'"
            type="info"
            show-icon
            class="mode-tip"
          >
            <template #message>
              启发模式会提供家长引导话术，帮助孩子独立思考，而非直接给出答案
            </template>
          </Alert>

          <!-- 操作按钮 -->
          <div class="action-buttons">
            <Button @click="handleClear">清空</Button>
            <Button
              type="primary"
              size="large"
              :loading="isLoading"
              :disabled="!previewUrl"
              @click="handleStartGrading"
            >
              <template #icon>
                <EditOutlined />
              </template>
              开始批改 (工作流)
            </Button>
          </div>
        </Card>

        <!-- 使用说明 -->
        <Card title="使用提示" :bordered="false" class="tips-card">
          <ul class="tips-list">
            <li>
              <strong>工作流模式</strong>：使用 Qwen-VL + 审批流，支持实时进度追踪
            </li>
            <li>
              <strong>拍照技巧</strong>：请确保作业图片清晰、光线充足，正面平拍
            </li>
            <li>
              <strong>批改速度</strong>：一般2-5秒完成，复杂作业可能需要更长时间
            </li>
            <li>
              <strong>仅对答案</strong>：快速批改模式，显示对错和得分
            </li>
            <li>
              <strong>启发模式</strong>：家长模式，提供引导话术而非直接答案
            </li>
            <li>
              <strong>人工审核</strong>：低置信度结果会自动进入审批流程
            </li>
          </ul>
        </Card>
      </div>

      <!-- 右侧：进度区 -->
      <div class="progress-section">
        <Card title="批改进度" :bordered="false" class="progress-card">
          <!-- 加载中 -->
          <div v-if="isLoading" class="progress-state">
            <Spin size="large" />
            <div class="progress-info">
              <div class="progress-text">{{ currentStep }}</div>
              <Progress
                :percent="progress"
                :status="progress === 100 ? 'success' : 'active'"
                stroke-color="#1890ff"
              />
              <div class="progress-details">
                <span v-if="progress < 30">📸 正在识别题目...</span>
                <span v-else-if="progress < 70">🤖 AI 智能批改中...</span>
                <span v-else-if="progress < 100">💾 保存结果...</span>
                <span v-else>✅ 批改完成！</span>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else-if="!previewUrl" class="empty-state">
            <CameraOutlined class="empty-icon" />
            <p>上传作业图片后开始批改</p>
          </div>

          <!-- 待批改状态 -->
          <div v-else class="ready-state">
            <FileImageOutlined class="ready-icon" />
            <p>图片已上传，选择批改模式后点击"开始批改"</p>
            <div class="ready-preview">
              <img :src="previewUrl" alt="预览" />
            </div>
          </div>
        </Card>

        <!-- 快捷功能 -->
        <Card title="快捷功能" :bordered="false" class="shortcuts-card">
          <div class="shortcuts">
            <Button block @click="router.push('/ai-tutor/grading-history')">
              查看批改历史
            </Button>
            <Button block @click="router.push('/ai-studio/execution')">
              查看执行管理
            </Button>
            <Button block @click="router.push('/ai-tutor/chat')">
              智能辅导对话
            </Button>
            <Button block @click="router.push('/growth-profile/progress')">
              查看学习进度
            </Button>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quick-grading-page {
  padding: 16px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 20px;
}

.page-header p {
  margin: 0;
  color: #666;
}

.content-wrapper {
  display: grid;
  grid-template-columns: 500px 1fr;
  gap: 24px;
}

@media (max-width: 1200px) {
  .content-wrapper {
    grid-template-columns: 1fr;
  }
}

.upload-area {
  margin-bottom: 16px;
}

.preview-image {
  padding: 16px;
}

.preview-image img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
}

.upload-placeholder {
  padding: 40px 0;
}

.mode-selector {
  display: flex;
  width: 100%;
  margin-bottom: 16px;
}

.mode-selector :deep(.ant-radio-button-wrapper) {
  flex: 1;
  height: auto;
  padding: 12px 16px;
  text-align: left;
}

.mode-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mode-label {
  font-size: 14px;
  font-weight: 500;
}

.mode-desc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.mode-tip {
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.tips-card {
  margin-top: 16px;
}

.tips-list {
  padding-left: 20px;
  margin: 0;
  color: #666;
}

.tips-list li {
  margin-bottom: 12px;
  line-height: 1.6;
}

.progress-card {
  min-height: 400px;
}

.progress-state,
.empty-state,
.ready-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.progress-info {
  margin-top: 24px;
  width: 80%;
  max-width: 400px;
}

.progress-text {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 500;
  color: #333;
  text-align: center;
}

.progress-details {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
  text-align: center;
}

.empty-icon,
.ready-icon {
  margin-bottom: 16px;
  font-size: 64px;
}

.ready-icon {
  color: #52c41a;
}

.ready-preview {
  margin-top: 24px;
  max-width: 300px;
}

.ready-preview img {
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.shortcuts-card {
  margin-top: 16px;
}

.shortcuts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
