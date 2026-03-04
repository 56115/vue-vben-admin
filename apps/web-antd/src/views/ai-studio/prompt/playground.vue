<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ArrowLeftOutlined,
  CaretRightOutlined,
  ClearOutlined,
  CopyOutlined,
  HistoryOutlined,
  LoadingOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Slider,
  Space,
  Spin,
  Statistic,
  Switch,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'ant-design-vue';

import {
  getPromptTemplate,
  getPromptTemplates,
  type PromptTemplate,
} from '#/api/ai-studio/prompt-template';
import {
  createLlmTestStream,
  getTestHistoryStats,
  LlmStreamEventType,
  testPromptRenderOnly,
  type LlmStreamEvent,
  type TestHistoryStats,
} from '#/api/ai-studio/prompt-playground';

const router = useRouter();
const route = useRoute();

// ==================== 状态 ====================

const loading = ref(false);
const testing = ref(false);
const streamAbortFn = ref<(() => void) | null>(null);

// 选中的模板
const selectedTemplateId = ref<string>('');
const template = ref<PromptTemplate | null>(null);
const templates = ref<PromptTemplate[]>([]);

// 变量输入
const variableInputs = ref<Record<string, unknown>>({});

// 模型配置
const modelConfig = ref({
  model: '',
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1.0,
});

// 输出状态
const outputContent = ref('');
const renderedPrompt = ref<{ systemPrompt: string; userPrompt: string } | null>(
  null,
);
const lastResult = ref<{
  success: boolean;
  latencyMs: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
} | null>(null);

// 测试历史
const showHistory = ref(false);
const historyStats = ref<TestHistoryStats | null>(null);

// 模型选项
const modelOptions = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'deepseek-chat', label: 'DeepSeek Chat' },
  { value: 'qwen-vl-max', label: 'Qwen VL Max' },
];

// ==================== 计算属性 ====================

const templateVariables = computed(() => {
  if (!template.value) return [];
  return template.value.variables || [];
});

const hasRequiredVarsMissing = computed(() => {
  for (const v of templateVariables.value) {
    if (v.required && !variableInputs.value[v.name]) {
      return true;
    }
  }
  return false;
});

// ==================== 方法 ====================

/**
 * 返回列表
 */
const goBack = () => {
  router.push('/ai-studio/prompt');
};

/**
 * 加载模板列表
 */
const loadTemplates = async () => {
  try {
    const res = await getPromptTemplates({ limit: 100 });
    templates.value = res.data || [];
  } catch (error) {
    console.error('Failed to load templates:', error);
  }
};

/**
 * 加载模板详情
 */
const loadTemplate = async (id: string) => {
  if (!id) return;

  loading.value = true;
  try {
    const res = await getPromptTemplate(id);
    template.value = res;

    // 设置默认模型配置
    if (res.modelConfig) {
      modelConfig.value = {
        model: res.modelConfig.model || modelConfig.value.model,
        temperature: res.modelConfig.temperature ?? 0.7,
        maxTokens: res.modelConfig.max_tokens ?? 2048,
        topP: res.modelConfig.top_p ?? 1.0,
      };
    }

    // 初始化变量输入
    initVariableInputs();
  } catch (error) {
    message.error('加载模板失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

/**
 * 初始化变量输入
 */
const initVariableInputs = () => {
  const inputs: Record<string, unknown> = {};
  for (const v of templateVariables.value) {
    inputs[v.name] = v.defaultValue ?? getDefaultValueForType(v.type);
  }
  variableInputs.value = inputs;
};

/**
 * 根据类型获取默认值
 */
const getDefaultValueForType = (type: string): unknown => {
  switch (type) {
    case 'string':
    case 'text':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return true;
    case 'json':
      return {};
    default:
      return '';
  }
};

/**
 * 生成测试数据
 */
const generateTestData = () => {
  const inputs: Record<string, unknown> = {};
  for (const v of templateVariables.value) {
    switch (v.type) {
      case 'string':
        inputs[v.name] = v.defaultValue || `示例${v.name}`;
        break;
      case 'text':
        inputs[v.name] =
          v.defaultValue || `这是一段示例文本，对应变量 ${v.name}`;
        break;
      case 'number':
        inputs[v.name] = v.defaultValue || 42;
        break;
      case 'boolean':
        inputs[v.name] = v.defaultValue ?? true;
        break;
      case 'json':
        inputs[v.name] = v.defaultValue || { example: 'data' };
        break;
      default:
        inputs[v.name] = v.defaultValue || '';
    }
  }
  variableInputs.value = inputs;
};

/**
 * 清除输入
 */
const clearInputs = () => {
  initVariableInputs();
  outputContent.value = '';
  renderedPrompt.value = null;
  lastResult.value = null;
};

/**
 * 仅渲染预览
 */
const handleRenderOnly = async () => {
  if (!selectedTemplateId.value) {
    message.warning('请先选择模板');
    return;
  }

  try {
    const res = await testPromptRenderOnly(selectedTemplateId.value, {
      variables: variableInputs.value,
    });

    renderedPrompt.value = res.renderedPrompt;
    outputContent.value = `[系统提示词]\n${res.renderedPrompt.systemPrompt}\n\n[用户提示词]\n${res.renderedPrompt.userPrompt}`;
    message.success('渲染成功');
  } catch (error) {
    message.error('渲染失败');
    console.error(error);
  }
};

/**
 * 执行 LLM 测试
 */
const handleRunTest = async () => {
  if (!selectedTemplateId.value) {
    message.warning('请先选择模板');
    return;
  }

  if (hasRequiredVarsMissing.value) {
    message.warning('请填写所有必需变量');
    return;
  }

  testing.value = true;
  outputContent.value = '';
  renderedPrompt.value = null;
  lastResult.value = null;

  const { abort } = createLlmTestStream(
    selectedTemplateId.value,
    {
      variables: variableInputs.value,
      model: modelConfig.value.model || undefined,
      temperature: modelConfig.value.temperature,
      maxTokens: modelConfig.value.maxTokens,
      topP: modelConfig.value.topP,
      stream: true,
    },
    (event: LlmStreamEvent) => {
      switch (event.type) {
        case LlmStreamEventType.START:
          renderedPrompt.value = event.data.renderedPrompt || null;
          break;
        case LlmStreamEventType.CONTENT:
          outputContent.value += event.data.content || '';
          break;
        case LlmStreamEventType.DONE:
          lastResult.value = {
            success: true,
            latencyMs: event.data.latencyMs || 0,
            tokenUsage: event.data.usage,
            model: event.data.model,
          };
          break;
        case LlmStreamEventType.ERROR:
          lastResult.value = {
            success: false,
            latencyMs: 0,
          };
          message.error(event.data.error || '测试失败');
          break;
      }
    },
    (error) => {
      message.error('测试失败: ' + error.message);
    },
    () => {
      testing.value = false;
      streamAbortFn.value = null;
    },
  );

  streamAbortFn.value = abort;
};

/**
 * 停止测试
 */
const handleStopTest = () => {
  if (streamAbortFn.value) {
    streamAbortFn.value();
    streamAbortFn.value = null;
    testing.value = false;
    message.info('测试已停止');
  }
};

/**
 * 复制输出内容
 */
const copyOutput = async () => {
  if (!outputContent.value) {
    message.warning('没有内容可复制');
    return;
  }

  try {
    await navigator.clipboard.writeText(outputContent.value);
    message.success('已复制到剪贴板');
  } catch {
    message.error('复制失败');
  }
};

/**
 * 加载测试历史统计
 */
const loadHistoryStats = async () => {
  if (!selectedTemplateId.value) return;

  try {
    const res = await getTestHistoryStats(selectedTemplateId.value);
    historyStats.value = res;
  } catch (error) {
    console.error('Failed to load history stats:', error);
  }
};

// ==================== 生命周期 ====================

onMounted(async () => {
  await loadTemplates();

  // 如果 URL 中有 id 参数，自动加载
  if (route.params.id) {
    selectedTemplateId.value = route.params.id as string;
    await loadTemplate(selectedTemplateId.value);
  }
});

// 监听模板选择变化
watch(selectedTemplateId, async (newId) => {
  if (newId) {
    await loadTemplate(newId);
    await loadHistoryStats();
  }
});
</script>

<template>
  <div class="prompt-playground">
    <!-- 顶部导航 -->
    <div class="page-header">
      <Breadcrumb>
        <Breadcrumb.Item>
          <a @click="goBack">
            <ArrowLeftOutlined />
            提示词管理
          </a>
        </Breadcrumb.Item>
        <Breadcrumb.Item>测试 Playground</Breadcrumb.Item>
      </Breadcrumb>

      <div class="header-actions">
        <Space>
          <Button @click="showHistory = true">
            <HistoryOutlined />
            测试历史
          </Button>
        </Space>
      </div>
    </div>

    <!-- 主内容区 -->
    <Row :gutter="16" class="main-content">
      <!-- 左侧：输入区域 -->
      <Col :span="12">
        <Card title="输入配置" class="input-card">
          <!-- 模板选择 -->
          <Form.Item label="选择模板" required>
            <Select
              v-model:value="selectedTemplateId"
              placeholder="选择要测试的模板"
              show-search
              option-filter-prop="label"
              :options="templates.map((t) => ({ value: t.id, label: t.name }))"
              style="width: 100%"
            />
          </Form.Item>

          <Spin :spinning="loading">
            <!-- 模板信息 -->
            <template v-if="template">
              <Alert
                :message="`模板: ${template.name}`"
                :description="template.description || '暂无描述'"
                type="info"
                class="mb-4"
                show-icon
              />

              <!-- 变量输入 -->
              <div
                v-if="templateVariables.length > 0"
                class="variables-section"
              >
                <div class="section-header">
                  <Typography.Text strong>变量输入</Typography.Text>
                  <Space>
                    <Button size="small" @click="generateTestData">
                      <ThunderboltOutlined />
                      生成测试数据
                    </Button>
                    <Button size="small" @click="clearInputs">
                      <ClearOutlined />
                      清除
                    </Button>
                  </Space>
                </div>

                <div
                  v-for="variable in templateVariables"
                  :key="variable.name"
                  class="variable-row"
                >
                  <div class="variable-label">
                    <Typography.Text strong>
                      {{ variable.name }}
                      <span v-if="variable.required" class="required">*</span>
                    </Typography.Text>
                    <Tag size="small">{{ variable.type }}</Tag>
                    <Typography.Text
                      v-if="variable.description"
                      type="secondary"
                      class="description"
                    >
                      {{ variable.description }}
                    </Typography.Text>
                  </div>

                  <div class="variable-input">
                    <Input.TextArea
                      v-if="variable.type === 'text'"
                      v-model:value="variableInputs[variable.name]"
                      :placeholder="`输入 ${variable.name}`"
                      :rows="3"
                      :auto-size="{ minRows: 2, maxRows: 6 }"
                    />
                    <Input.TextArea
                      v-else-if="variable.type === 'json'"
                      v-model:value="variableInputs[variable.name]"
                      placeholder="输入 JSON"
                      :rows="3"
                    />
                    <InputNumber
                      v-else-if="variable.type === 'number'"
                      v-model:value="variableInputs[variable.name]"
                      style="width: 100%"
                    />
                    <Switch
                      v-else-if="variable.type === 'boolean'"
                      v-model:checked="variableInputs[variable.name]"
                    />
                    <Input
                      v-else
                      v-model:value="variableInputs[variable.name]"
                      :placeholder="`输入 ${variable.name}`"
                    />
                  </div>
                </div>
              </div>

              <Empty v-else description="该模板没有变量" class="empty-vars" />

              <!-- 模型配置 -->
              <div class="model-config-section mt-4">
                <div class="section-header">
                  <Typography.Text strong>
                    <SettingOutlined />
                    模型配置
                  </Typography.Text>
                </div>

                <Row :gutter="16">
                  <Col :span="12">
                    <Form.Item label="模型">
                      <Select
                        v-model:value="modelConfig.model"
                        :options="modelOptions"
                        placeholder="使用模板默认"
                        allow-clear
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="12">
                    <Form.Item label="Temperature">
                      <Slider
                        v-model:value="modelConfig.temperature"
                        :min="0"
                        :max="2"
                        :step="0.1"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="12">
                    <Form.Item label="Max Tokens">
                      <InputNumber
                        v-model:value="modelConfig.maxTokens"
                        :min="1"
                        :max="128000"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="12">
                    <Form.Item label="Top P">
                      <Slider
                        v-model:value="modelConfig.topP"
                        :min="0"
                        :max="1"
                        :step="0.1"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </template>

            <Empty
              v-else-if="!loading && !selectedTemplateId"
              description="请选择一个模板开始测试"
            />
          </Spin>
        </Card>
      </Col>

      <!-- 右侧：输出区域 -->
      <Col :span="12">
        <Card class="output-card">
          <template #title>
            <Space>
              <span>输出结果</span>
              <Tag v-if="lastResult?.success" color="success">成功</Tag>
              <Tag v-else-if="lastResult && !lastResult.success" color="error"
                >失败</Tag
              >
            </Space>
          </template>

          <template #extra>
            <Space>
              <Tooltip title="仅渲染（不调用 LLM）">
                <Button
                  :disabled="!selectedTemplateId"
                  @click="handleRenderOnly"
                >
                  预览渲染
                </Button>
              </Tooltip>
              <Button
                v-if="testing"
                type="primary"
                danger
                @click="handleStopTest"
              >
                <LoadingOutlined />
                停止
              </Button>
              <Button
                v-else
                type="primary"
                :disabled="!selectedTemplateId || hasRequiredVarsMissing"
                @click="handleRunTest"
              >
                <CaretRightOutlined />
                运行测试
              </Button>
              <Tooltip title="复制输出">
                <Button :disabled="!outputContent" @click="copyOutput">
                  <CopyOutlined />
                </Button>
              </Tooltip>
            </Space>
          </template>

          <Tabs>
            <Tabs.TabPane key="output" tab="LLM 输出">
              <div class="output-content">
                <Spin :spinning="testing" tip="正在生成...">
                  <pre v-if="outputContent" class="output-text">{{
                    outputContent
                  }}</pre>
                  <Empty v-else description="运行测试后在此显示输出" />
                </Spin>
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane key="rendered" tab="渲染后提示词">
              <div v-if="renderedPrompt" class="rendered-prompts">
                <div class="prompt-section">
                  <Typography.Text strong>系统提示词</Typography.Text>
                  <pre class="prompt-text">{{
                    renderedPrompt.systemPrompt || '(空)'
                  }}</pre>
                </div>
                <div class="prompt-section">
                  <Typography.Text strong>用户提示词</Typography.Text>
                  <pre class="prompt-text">{{ renderedPrompt.userPrompt }}</pre>
                </div>
              </div>
              <Empty v-else description="运行测试后查看渲染结果" />
            </Tabs.TabPane>

            <Tabs.TabPane key="stats" tab="统计信息">
              <div v-if="lastResult" class="stats-panel">
                <Row :gutter="16">
                  <Col :span="8">
                    <Statistic
                      title="响应延迟"
                      :value="lastResult.latencyMs"
                      suffix="ms"
                    />
                  </Col>
                  <Col :span="8">
                    <Statistic
                      title="输入 Token"
                      :value="lastResult.tokenUsage?.promptTokens || 0"
                    />
                  </Col>
                  <Col :span="8">
                    <Statistic
                      title="输出 Token"
                      :value="lastResult.tokenUsage?.completionTokens || 0"
                    />
                  </Col>
                  <Col :span="8">
                    <Statistic
                      title="总 Token"
                      :value="lastResult.tokenUsage?.totalTokens || 0"
                    />
                  </Col>
                  <Col :span="8">
                    <Statistic
                      title="使用模型"
                      :value="lastResult.model || '-'"
                    />
                  </Col>
                </Row>
              </div>
              <Empty v-else description="运行测试后查看统计" />
            </Tabs.TabPane>
          </Tabs>
        </Card>
      </Col>
    </Row>

    <!-- 测试历史抽屉 -->
    <Drawer v-model:open="showHistory" title="测试历史统计" :width="500">
      <template v-if="historyStats">
        <Row :gutter="[16, 16]">
          <Col :span="12">
            <Statistic title="总测试次数" :value="historyStats.totalTests" />
          </Col>
          <Col :span="12">
            <Statistic
              title="成功率"
              :value="(historyStats.successRate * 100).toFixed(1)"
              suffix="%"
            />
          </Col>
          <Col :span="12">
            <Statistic
              title="平均延迟"
              :value="historyStats.avgLatencyMs"
              suffix="ms"
            />
          </Col>
          <Col :span="12">
            <Statistic
              title="总 Token 消耗"
              :value="historyStats.totalTokens.totalTokens"
            />
          </Col>
        </Row>

        <div class="history-section mt-4">
          <Typography.Title :level="5">按模型统计</Typography.Title>
          <div
            v-for="stat in historyStats.modelStats"
            :key="stat.model"
            class="model-stat-row"
          >
            <Tag>{{ stat.model }}</Tag>
            <span>{{ stat.testCount }} 次</span>
            <span>成功率 {{ (stat.successRate * 100).toFixed(1) }}%</span>
            <span>平均 {{ stat.avgLatencyMs }}ms</span>
          </div>
        </div>

        <div class="history-section mt-4">
          <Typography.Title :level="5">每日统计</Typography.Title>
          <Timeline>
            <Timeline.Item
              v-for="stat in historyStats.dailyStats.slice(-7)"
              :key="stat.date"
            >
              <div class="daily-stat">
                <Typography.Text strong>{{ stat.date }}</Typography.Text>
                <Space>
                  <Tag color="blue">{{ stat.testCount }} 次</Tag>
                  <Tag color="green">成功 {{ stat.successCount }}</Tag>
                  <Tag>平均 {{ stat.avgLatencyMs }}ms</Tag>
                </Space>
              </div>
            </Timeline.Item>
          </Timeline>
        </div>
      </template>

      <Empty v-else description="暂无测试历史" />
    </Drawer>
  </div>
</template>

<style lang="less" scoped>
.prompt-playground {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 16px;
    background: white;
    border-radius: 8px;
  }

  .main-content {
    .input-card,
    .output-card {
      height: calc(100vh - 150px);
      overflow: auto;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
    }

    .variables-section {
      margin-top: 16px;

      .variable-row {
        padding: 12px;
        margin-bottom: 12px;
        background: #fafafa;
        border-radius: 6px;

        .variable-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;

          .required {
            color: #ff4d4f;
          }

          .description {
            font-size: 12px;
          }
        }
      }
    }

    .model-config-section {
      padding: 16px;
      background: #fafafa;
      border-radius: 6px;
    }

    .output-content {
      min-height: 300px;

      .output-text {
        margin: 0;
        padding: 16px;
        background: #1a1a2e;
        color: #eee;
        border-radius: 6px;
        white-space: pre-wrap;
        word-break: break-all;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.6;
        max-height: 400px;
        overflow: auto;
      }
    }

    .rendered-prompts {
      .prompt-section {
        margin-bottom: 16px;

        .prompt-text {
          margin: 8px 0 0;
          padding: 12px;
          background: #f6f8fa;
          border-radius: 6px;
          white-space: pre-wrap;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          max-height: 200px;
          overflow: auto;
        }
      }
    }

    .stats-panel {
      padding: 16px;
    }
  }

  .history-section {
    .model-stat-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .daily-stat {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  }

  .empty-vars {
    padding: 24px 0;
  }
}
</style>
