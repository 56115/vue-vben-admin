<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Card,
  Button,
  Space,
  message,
  Empty,
  Spin,
  Alert,
  Tag,
  Form,
  FormItem,
  FormItemRest,
  Input,
  Upload,
  Image,
  Tabs,
} from 'ant-design-vue';
import {
  SaveOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  LeftOutlined,
  UploadOutlined,
  PictureOutlined,
} from '@ant-design/icons-vue';
import SchemaForm from './components/SchemaForm.vue';
import PromptDebugger from './components/PromptDebugger.vue';
import {
  getPipelineByKey,
  updateRuntimeConfig,
  executePipeline,
  type Pipeline,
  type ExecutionSubmitResponse,
} from '#/api/ai-studio/pipeline';
import type { PipelineDefinition } from '#/api/ai-studio/pipeline';
import { requestClient } from '#/api/request';

const route = useRoute();

// 当前活动标签页
const activeTab = ref('config');
const router = useRouter();

const pipelineKey = route.params.key as string;
const loading = ref(false);
const saving = ref(false);
const testing = ref(false);
const uploading = ref(false);
const pipeline = ref<Pipeline | null>(null);
const config = ref<Record<string, any>>({});
const testParams = ref<Record<string, any>>({
  imageUrl: '',
  feedbackText: '',
  customerId: '',
  tenantId: '',
});
const testResult = ref<ExecutionSubmitResponse | null>(null);
const schemaFormRef = ref();
const testFormRef = ref();
const imagePreviewUrl = ref<string>('');

// 步骤状态管理 (流程可视化)
const currentStep = ref(1); // 1: 配置参数, 2: 准备测试, 3: 查看结果

const pageTitle = computed(() => {
  return pipeline.value?.name || '流程参数配置';
});

const pageSubtitle = computed(() => {
  const parts = [];
  if (pipeline.value?.description) {
    parts.push(pipeline.value.description);
  }
  if (pipeline.value?.isSystem) {
    parts.push('(系统流程)');
  }
  return parts.join(' ');
});

// 提取 Schema 默认值
function extractDefaults(schema: any): Record<string, any> {
  if (!schema?.properties) return {};

  const defaults: Record<string, any> = {};
  Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
    if (prop.default !== undefined) {
      defaults[key] = prop.default;
    }
  });
  return defaults;
}

// 加载 Pipeline 详情
async function fetchPipeline() {
  loading.value = true;
  try {
    const data = await getPipelineByKey(pipelineKey);
    pipeline.value = data;

    // 初始化配置
    if (data.runtimeConfig && Object.keys(data.runtimeConfig).length > 0) {
      config.value = { ...data.runtimeConfig };
    } else {
      // 使用 Schema 默认值
      config.value = extractDefaults(data.formSchema);
    }
  } catch (error: any) {
    console.error('加载 Pipeline 失败:', error);
    message.error(error.message || '加载流程失败');
    // 如果加载失败，返回列表页
    setTimeout(() => {
      router.push('/ai-studio/pipeline');
    }, 2000);
  } finally {
    loading.value = false;
  }
}

// 保存配置
async function handleSave() {
  // 验证表单
  const valid = await schemaFormRef.value?.validate();
  if (!valid) {
    message.error('请修正表单错误');
    return;
  }

  saving.value = true;
  try {
    await updateRuntimeConfig(pipelineKey, config.value);
    message.success('配置保存成功');
    // 保存成功后，进入步骤2
    if (currentStep.value === 1) {
      currentStep.value = 2;
    }
  } catch (error: any) {
    message.error(error.message || '配置保存失败');
  } finally {
    saving.value = false;
  }
}

// 重置为默认值
function handleReset() {
  if (!pipeline.value?.formSchema) return;
  config.value = extractDefaults(pipeline.value.formSchema);
  message.info('已重置为默认值');
}

// 测试执行（同步模式）
async function handleTest() {
  // 验证配置表单（如果存在）
  if (schemaFormRef.value) {
    try {
      const configValid = await schemaFormRef.value.validate();
      if (!configValid) {
        message.error('请先修正配置参数错误');
        return;
      }
    } catch (error) {
      console.error('配置参数验证失败:', error);
      message.error('请先修正配置参数错误');
      return;
    }
  }

  // 验证测试参数表单
  try {
    await testFormRef.value?.validate();
  } catch (error) {
    console.error('测试参数验证失败:', error);
    message.error('请填写完整的测试参数');
    return;
  }

  testing.value = true;
  testResult.value = null;

  try {
    // 合并配置和测试参数，并转换字段名为下划线格式
    const inputData = {
      // 转换 testParams 的驼峰式字段名为下划线格式
      image_url: testParams.value.imageUrl,
      feedback_text: testParams.value.feedbackText,
      customer_id: testParams.value.customerId,
      tenant_id: testParams.value.tenantId,
      // 合并配置参数（保持原样）
      ...config.value,
    };

    // 构建完整的请求体
    const requestBody = {
      inputData: inputData,
      sync: true, // 同步执行
    };

    // 调用执行API
    const result = await executePipeline(pipelineKey, requestBody);

    testResult.value = result;

    if (result.status === 'COMPLETED') {
      message.success('测试执行成功');
    } else if (result.status === 'FAILED') {
      message.error('测试执行失败');
    }

    // 测试完成后，进入步骤3
    currentStep.value = 3;
  } catch (error: any) {
    console.error('测试执行错误:', error);
    message.error(error.message || '测试执行失败');
  } finally {
    testing.value = false;
  }
}

// 将图片转换为base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 处理图片上传
async function handleImageUpload(file: File) {
  uploading.value = true;

  try {
    // 检查文件大小（限制10MB）
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('图片大小不能超过 10MB');
    }

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      throw new Error('只能上传图片文件');
    }

    // 直接使用 Base64 编码（简单、可靠、无需权限）
    message.loading('正在处理图片...', 0);
    const base64 = await fileToBase64(file);

    testParams.value.imageUrl = base64;
    imagePreviewUrl.value = base64;

    message.destroy();
    message.success('✅ 图片处理成功（Base64 编码）');

  } catch (error: any) {
    console.error('图片处理错误:', error);
    message.destroy();
    message.error(error.message || '图片处理失败');
  } finally {
    uploading.value = false;
  }

  return false; // 阻止默认上传行为
}

// 处理图片粘贴
function handlePaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // 检查是否是图片
    if (item.type.indexOf('image') !== -1) {
      event.preventDefault();

      const file = item.getAsFile();
      if (file) {
        message.loading('正在处理粘贴的图片...', 0);

        // 使用上传功能处理粘贴的图片
        handleImageUpload(file).then(() => {
          message.destroy();
        });
      }
      break;
    }
  }
}

// 清除图片
function handleClearImage() {
  testParams.value.imageUrl = '';
  imagePreviewUrl.value = '';
  message.info('已清除图片');
}

// 监听 imageUrl 变化更新预览
function handleImageUrlChange(url: string) {
  imagePreviewUrl.value = url;
}

// 返回列表
function handleBack() {
  router.push('/ai-studio/pipeline');
}

onMounted(() => {
  fetchPipeline();

  // 添加全局粘贴事件监听
  document.addEventListener('paste', handlePaste);
});

onBeforeUnmount(() => {
  // 移除粘贴事件监听
  document.removeEventListener('paste', handlePaste);
});
</script>

<template>
  <div class="pipeline-tune-page">
    <Spin :spinning="loading" tip="加载中...">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-top">
          <Button @click="handleBack" size="large">
            <template #icon><LeftOutlined /></template>
            返回列表
          </Button>
          <div class="header-title">
            <h1>{{ pageTitle }}</h1>
            <p class="subtitle">{{ pageSubtitle }}</p>
          </div>
          <Space size="middle">
            <Button size="large" @click="handleReset">
              <template #icon><ReloadOutlined /></template>
              重置默认值
            </Button>
            <Button
              type="primary"
              size="large"
              @click="handleSave"
              :loading="saving"
            >
              <template #icon><SaveOutlined /></template>
              保存配置
            </Button>
          </Space>
        </div>

        <!-- 进度指示器 -->
        <div class="progress-bar">
          <div
            :class="[
              'progress-item',
              { active: currentStep >= 1, completed: currentStep > 1 },
            ]"
          >
            <div class="progress-number">{{ currentStep > 1 ? '✓' : '1' }}</div>
            <div class="progress-label">配置参数</div>
          </div>
          <div class="progress-line" :class="{ active: currentStep > 1 }"></div>
          <div
            :class="[
              'progress-item',
              { active: currentStep >= 2, completed: currentStep > 2 },
            ]"
          >
            <div class="progress-number">{{ currentStep > 2 ? '✓' : '2' }}</div>
            <div class="progress-label">测试运行</div>
          </div>
          <div class="progress-line" :class="{ active: currentStep > 2 }"></div>
          <div :class="['progress-item', { active: currentStep >= 3 }]">
            <div class="progress-number">3</div>
            <div class="progress-label">查看结果</div>
          </div>
        </div>
      </div>

      <!-- 主内容区域 -->
      <div class="main-content">
        <Tabs v-model:active-key="activeTab" type="card">
          <!-- Tab 1: 流程配置 -->
          <Tabs.TabPane key="config" tab="流程配置">
            <!-- Step 1: 配置参数 -->
            <Card class="step-card" :class="{ active: currentStep === 1 }">
              <template #title>
                <div class="card-title">
                  <span class="step-badge">步骤 1</span>
                  <span class="title-text">配置流程参数</span>
                </div>
              </template>
              <div v-if="pipeline?.formSchema" class="form-container">
                <SchemaForm
                  ref="schemaFormRef"
                  v-model="config"
                  :schema="pipeline.formSchema"
                  @validate="() => {}"
                />
              </div>
              <Empty
                v-else-if="pipeline && !pipeline.formSchema"
                description="该流程无需配置参数"
              />
            </Card>

            <!-- Step 2: 测试运行 -->
            <Card class="step-card" :class="{ active: currentStep === 2 }">
              <template #title>
                <div class="card-title">
                  <span class="step-badge">步骤 2</span>
                  <span class="title-text">测试运行</span>
                </div>
              </template>
              <Alert
                message="测试模式"
                description="使用当前配置同步执行流程。请在下方输入测试数据。"
                type="info"
                show-icon
                class="test-tip"
              />

              <!-- 粘贴提示 -->
              <div class="paste-hint" v-if="!testParams.imageUrl">
                <div class="paste-hint-icon">📋</div>
                <div class="paste-hint-text">
                  <strong>快捷方式</strong>：复制图片后按
                  <kbd>Ctrl+V</kbd> 直接粘贴
                </div>
              </div>

              <!-- 测试参数输入 -->
              <div class="test-form-container">
                <div class="form-section-title">
                  <span class="icon">📝</span>
                  <span>测试输入参数</span>
                </div>
                <Form
                  ref="testFormRef"
                  :model="testParams"
                  layout="vertical"
                  class="test-form"
                >
                  <FormItem
                    label="客户反馈图片地址"
                    name="imageUrl"
                    :rules="[
                      { required: true, message: '请输入图片URL或上传图片' },
                    ]"
                  >
                    <Space direction="vertical" style="width: 100%" :size="12">
                      <!-- URL输入框和操作按钮 -->
                      <div class="image-input-row">
                        <Input
                          v-model:value="testParams.imageUrl"
                          placeholder="https://example.com/feedback-image.jpg"
                          size="large"
                          @change="handleImageUrlChange(testParams.imageUrl)"
                        >
                          <template #prefix>
                            <PictureOutlined style="color: #8c8c8c" />
                          </template>
                        </Input>
                        <!-- 使用 FormItemRest 包裹 Upload，避免 FormItem 收集多个字段 -->
                        <FormItemRest>
                          <Upload
                            :before-upload="handleImageUpload"
                            accept="image/*"
                            :show-upload-list="false"
                          >
                            <Button size="large" :loading="uploading">
                              <template #icon><UploadOutlined /></template>
                              {{ uploading ? '上传中...' : '上传图片' }}
                            </Button>
                          </Upload>
                        </FormItemRest>
                        <FormItemRest>
                          <Button
                            size="large"
                            danger
                            v-if="testParams.imageUrl"
                            @click="handleClearImage"
                          >
                            清除
                          </Button>
                        </FormItemRest>
                      </div>

                      <!-- 图片预览 -->
                      <div
                        v-if="imagePreviewUrl"
                        class="image-preview-container"
                      >
                        <div class="preview-label">图片预览：</div>
                        <Image
                          :src="imagePreviewUrl"
                          :width="200"
                          :preview="true"
                          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                        />
                      </div>

                      <div class="field-tip">
                        💡 支持三种方式：
                        <br />• 直接输入图片URL <br />•
                        点击"上传图片"选择本地文件 <br />•
                        <strong>按 Ctrl+V 粘贴剪贴板中的图片</strong> ⭐
                      </div>
                    </Space>
                  </FormItem>

                  <FormItem label="文字反馈（可选）" name="feedbackText">
                    <Input.TextArea
                      v-model:value="testParams.feedbackText"
                      placeholder="客户的文字反馈内容..."
                      :rows="3"
                      size="large"
                    />
                  </FormItem>

                  <div class="form-row">
                    <FormItem
                      label="客户ID"
                      name="customerId"
                      :rules="[{ required: true, message: '请输入客户ID' }]"
                      class="form-col"
                    >
                      <Input
                        v-model:value="testParams.customerId"
                        placeholder="C12345"
                        size="large"
                      />
                    </FormItem>

                    <FormItem
                      label="租户ID"
                      name="tenantId"
                      :rules="[{ required: true, message: '请输入租户ID' }]"
                      class="form-col"
                    >
                      <Input
                        v-model:value="testParams.tenantId"
                        placeholder="1"
                        size="large"
                      />
                    </FormItem>
                  </div>
                </Form>
              </div>

              <div class="test-action">
                <Button
                  type="primary"
                  @click="handleTest"
                  :loading="testing"
                  size="large"
                  block
                >
                  <template #icon><ThunderboltOutlined /></template>
                  {{ testing ? '执行中...' : '立即测试' }}
                </Button>
                <div
                  v-if="!pipeline?.formSchema"
                  style="
                    margin-top: 8px;
                    font-size: 12px;
                    color: #8c8c8c;
                    text-align: center;
                  "
                >
                  提示：该流程无需配置参数，可直接测试
                </div>
              </div>
            </Card>

            <!-- Step 3: 执行结果 -->
            <Card
              class="step-card result-card"
              :class="{ active: currentStep === 3 }"
              v-if="testResult"
            >
              <template #title>
                <div class="card-title">
                  <span class="step-badge">步骤 3</span>
                  <span class="title-text">执行结果</span>
                </div>
              </template>

              <!-- 执行状态 -->
              <Alert
                :type="
                  testResult.status === 'COMPLETED'
                    ? 'success'
                    : testResult.status === 'FAILED'
                      ? 'error'
                      : 'info'
                "
                show-icon
                class="status-alert"
              >
                <template #message>
                  <div class="status-header">
                    <span class="status-label">执行状态：</span>
                    <Tag
                      :color="
                        testResult.status === 'COMPLETED'
                          ? 'success'
                          : testResult.status === 'FAILED'
                            ? 'error'
                            : 'processing'
                      "
                      class="status-tag"
                    >
                      {{
                        testResult.status === 'COMPLETED'
                          ? '✓ 成功'
                          : testResult.status === 'FAILED'
                            ? '✗ 失败'
                            : '⋯ 进行中'
                      }}
                    </Tag>
                  </div>
                </template>
                <template #description>
                  <div class="execution-info">
                    <div>执行ID：{{ testResult.executionId }}</div>
                    <div v-if="testResult.jobId">
                      任务ID：{{ testResult.jobId }}
                    </div>
                  </div>
                </template>
              </Alert>

              <!-- 分析结果（成功时显示） -->
              <div
                v-if="testResult.result && testResult.status === 'COMPLETED'"
                class="result-container"
              >
                <div class="result-section">
                  <div class="section-title">
                    <span class="icon">🎯</span>
                    <span>情感分析</span>
                  </div>
                  <div
                    v-if="testResult.result.sentiment"
                    class="sentiment-result"
                  >
                    <Tag
                      :color="
                        testResult.result.sentiment === 'satisfied'
                          ? 'green'
                          : testResult.result.sentiment === 'neutral'
                            ? 'blue'
                            : testResult.result.sentiment === 'dissatisfied'
                              ? 'orange'
                              : 'red'
                      "
                      class="sentiment-tag"
                    >
                      {{
                        testResult.result.sentiment === 'satisfied'
                          ? '😊 满意'
                          : testResult.result.sentiment === 'neutral'
                            ? '😐 一般'
                            : testResult.result.sentiment === 'dissatisfied'
                              ? '😟 不满意'
                              : '😠 非常不满'
                      }}
                    </Tag>
                    <span
                      v-if="testResult.result.confidence"
                      class="confidence"
                    >
                      置信度：{{
                        (testResult.result.confidence * 100).toFixed(1)
                      }}%
                    </span>
                    <Tag
                      v-if="testResult.result.priority"
                      :color="
                        testResult.result.priority === 'high'
                          ? 'red'
                          : testResult.result.priority === 'medium'
                            ? 'orange'
                            : 'green'
                      "
                      class="priority-tag"
                    >
                      优先级：{{
                        testResult.result.priority === 'high'
                          ? '高'
                          : testResult.result.priority === 'medium'
                            ? '中'
                            : '低'
                      }}
                    </Tag>
                  </div>
                </div>

                <!-- OCR 文字识别 -->
                <div
                  v-if="testResult.result.extractedText"
                  class="result-section"
                >
                  <div class="section-title">
                    <span class="icon">📝</span>
                    <span>OCR 文字提取</span>
                  </div>
                  <div class="text-box">
                    {{ testResult.result.extractedText }}
                  </div>
                </div>

                <!-- 图像分析 -->
                <div
                  v-if="testResult.result.imageAnalysis"
                  class="result-section"
                >
                  <div class="section-title">
                    <span class="icon">🖼️</span>
                    <span>图像分析</span>
                  </div>
                  <div class="analysis-items">
                    <div
                      v-if="testResult.result.imageAnalysis.productCondition"
                      class="analysis-item"
                    >
                      <span class="label">产品状态：</span>
                      <span class="value">{{
                        testResult.result.imageAnalysis.productCondition
                      }}</span>
                    </div>
                    <div
                      v-if="testResult.result.imageAnalysis.emotionalTone"
                      class="analysis-item"
                    >
                      <span class="label">情感基调：</span>
                      <span class="value">{{
                        testResult.result.imageAnalysis.emotionalTone
                      }}</span>
                    </div>
                  </div>
                </div>

                <!-- 问题列表 -->
                <div
                  v-if="
                    testResult.result.issues &&
                    testResult.result.issues.length > 0
                  "
                  class="result-section"
                >
                  <div class="section-title">
                    <span class="icon">⚠️</span>
                    <span>发现的问题</span>
                  </div>
                  <ul class="issue-list">
                    <li
                      v-for="(issue, idx) in testResult.result.issues"
                      :key="idx"
                    >
                      {{ issue }}
                    </li>
                  </ul>
                </div>

                <!-- 行动建议 -->
                <div
                  v-if="
                    testResult.result.actionPlan &&
                    testResult.result.actionPlan.length > 0
                  "
                  class="result-section"
                >
                  <div class="section-title">
                    <span class="icon">💡</span>
                    <span>行动建议</span>
                  </div>
                  <ul class="action-list">
                    <li
                      v-for="(action, idx) in testResult.result.actionPlan"
                      :key="idx"
                    >
                      {{ action }}
                    </li>
                  </ul>
                </div>

                <!-- 原始数据（折叠） -->
                <details class="raw-json">
                  <summary>查看原始JSON数据</summary>
                  <pre>{{ JSON.stringify(testResult.result, null, 2) }}</pre>
                </details>
              </div>

              <!-- 错误详情（失败时显示） -->
              <div
                v-if="testResult.result && testResult.status === 'FAILED'"
                class="error-container"
              >
                <Alert
                  type="error"
                  :message="testResult.result.error || '执行失败'"
                  show-icon
                  class="error-alert"
                />
                <details class="error-details">
                  <summary>查看错误详情</summary>
                  <pre>{{ JSON.stringify(testResult.result, null, 2) }}</pre>
                </details>
              </div>
            </Card>

            <!-- 空状态（未测试时） -->
            <Card class="step-card empty-card" v-else>
              <template #title>
                <div class="card-title">
                  <span class="step-badge">步骤 3</span>
                  <span class="title-text">执行结果</span>
                </div>
              </template>
              <Empty description="运行测试后查看结果" />
            </Card>
          </Tabs.TabPane>

          <!-- Tab 2: 提示词预览 -->
          <Tabs.TabPane key="prompt-debug" tab="提示词预览">
            <PromptDebugger
              :pipeline-key="pipelineKey"
              :steps="(pipeline?.definition as PipelineDefinition)?.steps || []"
            />
          </Tabs.TabPane>
        </Tabs>
      </div>
    </Spin>
  </div>
</template>

<style scoped>
/* ====================
   响应式设计
   ==================== */
@media (max-width: 768px) {
  .pipeline-tune-page {
    padding: 16px;
  }

  .page-header {
    padding: 16px;
  }

  .header-top {
    flex-direction: column;
    align-items: stretch;
  }

  .progress-bar {
    padding: 16px 0 0;
  }

  .progress-line {
    width: 60px;
    margin: 0 8px;
  }

  .form-row {
    flex-direction: column;
  }

  .image-input-row {
    flex-direction: column;
    align-items: stretch;
  }

  .image-input-row :deep(.ant-input-affix-wrapper) {
    width: 100%;
  }
}

.pipeline-tune-page {
  min-height: 100vh;
  padding: 24px;
  background: #f0f2f5;
}

/* ====================
   页面头部
   ==================== */
.page-header {
  padding: 24px;
  margin-bottom: 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 6%);
}

.header-top {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-bottom: 24px;
}

.header-title {
  flex: 1;
}

.header-title h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #262626;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: #8c8c8c;
}

/* ====================
   进度指示器
   ==================== */
.progress-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0 0;
  border-top: 1px solid #f0f0f0;
}

.progress-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.progress-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 18px;
  font-weight: 600;
  color: #bfbfbf;
  background: #f5f5f5;
  border: 2px solid #d9d9d9;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.progress-item.active .progress-number {
  color: white;
  background: #1890ff;
  border-color: #1890ff;
  box-shadow: 0 0 0 4px rgb(24 144 255 / 12%);
}

.progress-item.completed .progress-number {
  color: white;
  background: #52c41a;
  border-color: #52c41a;
}

.progress-label {
  font-size: 14px;
  font-weight: 500;
  color: #8c8c8c;
}

.progress-item.active .progress-label {
  color: #1890ff;
}

.progress-item.completed .progress-label {
  color: #52c41a;
}

.progress-line {
  position: relative;
  top: -20px;
  width: 100px;
  height: 2px;
  margin: 0 16px;
  background: #d9d9d9;
}

.progress-line.active {
  background: #52c41a;
}

/* ====================
   主内容区域
   ==================== */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.step-card {
  border-radius: 8px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 6%);
  transition: all 0.3s ease;
}

.step-card.active {
  border-color: #1890ff;
  box-shadow: 0 4px 12px rgb(24 144 255 / 15%);
}

.card-title {
  display: flex;
  gap: 12px;
  align-items: center;
}

.step-badge {
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
}

.title-text {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

/* ====================
   表单容器
   ==================== */
.form-container {
  padding: 8px 0;
}

.test-tip {
  margin-bottom: 16px;
}

/* 粘贴提示框 */
.paste-hint {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px 20px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%);
  border: 2px dashed #91caff;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.paste-hint:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgb(24 144 255 / 15%);
}

.paste-hint-icon {
  font-size: 32px;
  line-height: 1;
}

.paste-hint-text {
  flex: 1;
  line-height: 1.6;
  color: #595959;
}

.paste-hint-text strong {
  margin-right: 4px;
  font-weight: 600;
  color: #1890ff;
}

.paste-hint-text kbd {
  display: inline-block;
  padding: 2px 8px;
  margin: 0 2px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #262626;
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
}

.test-form-container {
  margin-top: 16px;
}

.form-section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
  border-bottom: 2px solid #f0f0f0;
}

.form-section-title .icon {
  font-size: 18px;
}

.test-form {
  margin-bottom: 24px;
}

.field-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.8;
  color: #8c8c8c;
}

.field-tip strong {
  font-weight: 600;
  color: #1890ff;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-col {
  flex: 1;
}

.test-action {
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid #f0f0f0;
}

/* ====================
   结果展示
   ==================== */
.status-alert {
  margin-bottom: 24px;
}

.status-header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.status-label {
  font-size: 15px;
  font-weight: 600;
}

.status-tag {
  padding: 4px 12px;
  font-size: 14px;
  font-weight: 600;
}

.execution-info {
  margin-top: 8px;
  font-size: 13px;
  color: #595959;
}

.result-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.result-section {
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
}

.section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.section-title .icon {
  font-size: 20px;
}

.sentiment-result {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.sentiment-tag {
  padding: 8px 16px;
  font-size: 16px;
  font-weight: 600;
}

.confidence {
  font-size: 14px;
  font-weight: 500;
  color: #595959;
}

.priority-tag {
  padding: 4px 12px;
  font-weight: 600;
}

.text-box {
  padding: 16px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #262626;
  white-space: pre-wrap;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
}

.analysis-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.analysis-item {
  padding: 12px 16px;
  background: white;
  border-left: 3px solid #1890ff;
  border-radius: 6px;
}

.analysis-item .label {
  margin-right: 8px;
  font-weight: 600;
  color: #595959;
}

.analysis-item .value {
  color: #262626;
}

.issue-list,
.action-list {
  padding-left: 24px;
  margin: 0;
  list-style: none;
}

.issue-list li,
.action-list li {
  position: relative;
  padding: 8px 0;
  padding-left: 24px;
  line-height: 1.6;
  color: #262626;
}

.issue-list li::before {
  position: absolute;
  left: 0;
  content: '⚠️';
}

.action-list li::before {
  position: absolute;
  left: 0;
  font-weight: bold;
  color: #1890ff;
  content: '▸';
}

.raw-json {
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid #e8e8e8;
}

.raw-json summary {
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #1890ff;
  cursor: pointer;
  user-select: none;
  background: #f0f5ff;
  border-radius: 4px;
}

.raw-json summary:hover {
  background: #e6f4ff;
}

.raw-json pre {
  padding: 16px;
  margin-top: 12px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
}

.error-container {
  margin-top: 16px;
}

.error-details {
  margin-top: 16px;
}

.error-details summary {
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #ff4d4f;
  cursor: pointer;
  user-select: none;
  background: #fff2f0;
  border-radius: 4px;
}

.error-details summary:hover {
  background: #ffccc7;
}

.error-details pre {
  padding: 16px;
  margin-top: 12px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
}

/* ====================
   图片上传和预览
   ==================== */
.image-input-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.image-input-row :deep(.ant-input-affix-wrapper) {
  flex: 1;
}

.image-preview-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #fafafa;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
}

.preview-label {
  font-size: 13px;
  font-weight: 500;
  color: #595959;
}

.image-preview-container :deep(.ant-image) {
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
}

/* ====================
   全局样式
   ==================== */
</style>
