<script lang="tsx" setup>
import { computed, ref, watch } from 'vue';
import {
  BugOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SaveOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'ant-design-vue';

import {
  getStepPromptBindings,
  type PipelinePromptBinding,
} from '#/api/ai-studio/pipeline-prompt-binding';
import type { PromptTemplate } from '#/api/ai-studio/prompt-template';
import { usePromptParser } from '#/composables/usePromptParser';

interface StepInfo {
  key: string;
  name: string;
  type: string;
  outputs?: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
}

interface TestCase {
  id: string;
  name: string;
  data: Record<string, unknown>;
}

interface Props {
  pipelineKey: string;
  steps: StepInfo[];
}

const props = defineProps<Props>();

// ==================== 状态 ====================

const loading = ref(false);
const selectedStepKey = ref<string>('');
const selectedBindingId = ref<string>('');
const bindings = ref<PipelinePromptBinding[]>([]);

// 测试用例
const testCases = ref<TestCase[]>([]);
const activeTestCaseId = ref<string>('');
const testData = ref<Record<string, unknown>>({});

// 显示选项
const showRaw = ref(false);
const highlightVars = ref(true);
const highlightedContentRef = ref<HTMLElement | null>(null);

// 变量追踪
const traceModalVisible = ref(false);
const selectedVariable = ref<{
  name: string;
  original: unknown;
  replaced: string;
  isDefault?: boolean;
  source?: string;
} | null>(null);

// ==================== 计算属性 ====================

// LLM 步骤列表
const llmSteps = computed(() => {
  return props.steps.filter(
    (s) => s.type === 'LLM' || s.type === 'llm' || s.type === 'ai-completion',
  );
});

// 当前选中的步骤
const selectedStep = computed(() => {
  return llmSteps.value.find((s) => s.key === selectedStepKey.value);
});

// 当前步骤的绑定列表
const stepBindings = computed(() => {
  return bindings.value.filter((b) => b.stepKey === selectedStepKey.value);
});

// 当前选中的绑定
const selectedBinding = computed(() => {
  return stepBindings.value.find((b) => b.id === selectedBindingId.value);
});

// 当前选中的提示词模板
const selectedPrompt = computed<PromptTemplate | undefined>(() => {
  return selectedBinding.value?.promptTemplate;
});

// 使用 PromptEngine 解析模板
const {
  variables: extractedVars,
  render,
  detectRisks,
  validateData,
  createTestData,
} = usePromptParser(
  computed(() => selectedPrompt.value?.templateContent || ''),
);

// 模板变量
const templateVariables = computed(() => {
  const definedVars = selectedPrompt.value?.variables || [];
  const extracted = extractedVars.value;

  const varMap = new Map();
  for (const v of extracted) {
    varMap.set(v.name, v);
  }
  for (const v of definedVars) {
    varMap.set(v.name, v);
  }

  return Array.from(varMap.values());
});

// 渲染结果
const renderResult = computed(() => {
  if (!selectedPrompt.value?.templateContent) return null;
  return render(testData.value, { strict: false, fallback: 'keep' });
});

// 安全风险提示
const securityRisks = computed(() => {
  return detectRisks(testData.value);
});

// 变量替换追踪
const replacementTrace = computed(() => {
  if (!renderResult.value) return [];
  return Array.from(renderResult.value.replaced.entries()).map(
    ([name, info]) => ({
      name,
      ...info,
    }),
  );
});

// Token 成本估算
const tokenCost = computed(() => {
  if (!renderResult.value) return null;
  const tokens = renderResult.value.tokenEstimate;
  // 简单估算：每 1K tokens $0.01
  const cost = (tokens / 1000) * 0.01;
  return { tokens, cost };
});

// 带高亮的渲染内容（可点击变量）
const highlightedContent = computed(() => {
  if (!renderResult.value?.text || !highlightVars.value) {
    return renderResult.value?.text || '';
  }

  let content = renderResult.value.text;
  const replaced = renderResult.value.replaced;

  // 按变量名长度降序，避免短变量名干扰长变量名
  const sortedVars = Array.from(replaced.entries()).sort(
    (a, b) => b[0].length - a[0].length,
  );

  for (const [name, info] of sortedVars) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedName})`, 'g');
    const statusClass = info.isDefault ? 'var-default' : 'var-replaced';
    content = content.replace(
      regex,
      `<span class="trace-variable ${statusClass}" data-var="${name}">$1</span>`,
    );
  }

  return content;
});

// ==================== 方法 ====================

/**
 * 加载步骤的提示词绑定
 */
const loadBindings = async () => {
  if (!selectedStepKey.value) return;

  loading.value = true;
  try {
    const res = await getStepPromptBindings(
      props.pipelineKey,
      selectedStepKey.value,
    );
    bindings.value = res;

    // 自动选择第一个激活的绑定
    const active = res.find((b) => b.isActive);
    if (active) {
      selectedBindingId.value = active.id;
    } else if (res.length > 0) {
      selectedBindingId.value = res[0].id;
    }
  } finally {
    loading.value = false;
  }
};

/**
 * 创建测试用例
 */
const createTestCase = () => {
  const id = `case_${Date.now()}`;
  const newCase: TestCase = {
    id,
    name: `测试用例 ${testCases.value.length + 1}`,
    data: createTestData(),
  };
  testCases.value.push(newCase);
  activeTestCaseId.value = id;
  testData.value = newCase.data;
  message.success('创建测试用例成功');
};

/**
 * 保存测试用例
 */
const saveTestCase = () => {
  const current = testCases.value.find((c) => c.id === activeTestCaseId.value);
  if (current) {
    current.data = { ...testData.value };
    message.success('保存成功');
  }
};

/**
 * 切换测试用例
 */
const switchTestCase = (caseId: string) => {
  activeTestCaseId.value = caseId;
  const tc = testCases.value.find((c) => c.id === caseId);
  if (tc) {
    testData.value = { ...tc.data };
  }
};

/**
 * 生成自动测试数据
 */
const generateAutoData = () => {
  testData.value = createTestData();
  message.success('已生成测试数据');
};

/**
 * 复制渲染结果
 */
const copyResult = () => {
  if (!renderResult.value) return;
  navigator.clipboard.writeText(renderResult.value.text);
  message.success('已复制到剪贴板');
};

/**
 * 处理内容区域点击（事件委托）
 */
const handleContentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (target.classList.contains('trace-variable')) {
    const varName = target.getAttribute('data-var');
    if (varName) {
      handleVariableClick(varName);
    }
  }
};

/**
 * 处理变量点击
 */
const handleVariableClick = (varName: string) => {
  if (!renderResult.value) return;

  const varInfo = renderResult.value.replaced.get(varName);
  if (!varInfo) return;

  // 获取变量来源信息
  const varDef = templateVariables.value.find((v) => v.name === varName);
  const source =
    varDef?.description || (varDef?.inferred ? '自动推断' : '模板定义');

  selectedVariable.value = {
    name: varName,
    original: varInfo.original,
    replaced: varInfo.replaced,
    isDefault: varInfo.isDefault,
    source,
  };
  traceModalVisible.value = true;
};

/**
 * 关闭追踪弹窗
 */
const closeTraceModal = () => {
  traceModalVisible.value = false;
  selectedVariable.value = null;
};

// ==================== 监听 ====================

watch(selectedStepKey, () => {
  loadBindings();
});

watch(
  () => props.steps,
  () => {
    if (llmSteps.value.length > 0 && !selectedStepKey.value) {
      selectedStepKey.value = llmSteps.value[0].key;
    }
  },
  { immediate: true },
);

// 初始化测试数据
watch(
  templateVariables,
  (vars) => {
    if (vars.length > 0 && Object.keys(testData.value).length === 0) {
      testData.value = createTestData();
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="prompt-debugger">
    <Card :bordered="false">
      <!-- 头部选择区 -->
      <div class="debugger-header">
        <Row :gutter="16">
          <Col :span="12">
            <div class="select-label">选择步骤</div>
            <Select
              v-model:value="selectedStepKey"
              style="width: 100%"
              placeholder="选择 LLM 步骤"
            >
              <Select.Option
                v-for="step in llmSteps"
                :key="step.key"
                :value="step.key"
              >
                <Space>
                  <span>{{ step.name }}</span>
                  <Tag size="small">{{ step.key }}</Tag>
                </Space>
              </Select.Option>
            </Select>
          </Col>
          <Col :span="12">
            <div class="select-label">提示词绑定</div>
            <Select
              v-model:value="selectedBindingId"
              style="width: 100%"
              placeholder="选择提示词绑定"
              :loading="loading"
            >
              <Select.Option
                v-for="binding in stepBindings"
                :key="binding.id"
                :value="binding.id"
              >
                <Space>
                  <Tag
                    :color="
                      binding.bindingType === 'PRIMARY' ? 'blue' : 'orange'
                    "
                  >
                    {{ binding.bindingType }}
                  </Tag>
                  <span>{{ binding.promptTemplate?.name }}</span>
                  <Badge v-if="binding.isActive" status="success" />
                </Space>
              </Select.Option>
            </Select>
          </Col>
        </Row>
      </div>

      <!-- 主内容区 -->
      <div v-if="selectedPrompt" class="debugger-content">
        <Row :gutter="24">
          <!-- 左侧：测试数据 -->
          <Col :span="8">
            <Card size="small" title="测试数据">
              <template #extra>
                <Space>
                  <Button size="small" @click="generateAutoData">
                    <PlayCircleOutlined />
                    自动生成
                  </Button>
                  <Button type="primary" size="small" @click="createTestCase">
                    <PlusOutlined />
                    保存用例
                  </Button>
                </Space>
              </template>
              <!-- 测试用例切换 -->
              <div v-if="testCases.length > 0" class="test-cases mb-3">
                <Select
                  :value="activeTestCaseId"
                  placeholder="选择测试用例"
                  style="width: 100%"
                  @change="switchTestCase"
                >
                  <Select.Option
                    v-for="tc in testCases"
                    :key="tc.id"
                    :value="tc.id"
                  >
                    {{ tc.name }}
                  </Select.Option>
                </Select>
              </div>

              <!-- 变量输入 -->
              <div class="variable-inputs">
                <div
                  v-for="variable in templateVariables"
                  :key="variable.name"
                  class="var-input-row"
                >
                  <div class="var-label">
                    <Typography.Text strong>
                      {{ variable.name }}
                      <span v-if="variable.required" class="required">*</span>
                    </Typography.Text>
                    <Tag size="small">{{ variable.type }}</Tag>
                  </div>

                  <Input.TextArea
                    v-if="variable.type === 'text'"
                    v-model:value="testData[variable.name]"
                    :rows="3"
                    size="small"
                  />
                  <Switch
                    v-else-if="variable.type === 'boolean'"
                    v-model:checked="testData[variable.name]"
                    size="small"
                  />
                  <Input
                    v-else
                    v-model:value="testData[variable.name]"
                    size="small"
                  />
                </div>
              </div>

              <Empty
                v-if="templateVariables.length === 0"
                description="模板无变量"
              />
            </Card>
          </Col>

          <!-- 右侧：渲染结果 -->
          <Col :span="16">
            <Card size="small">
              <template #title>
                <Space>
                  <span>渲染结果</span>
                  <Tag v-if="selectedPrompt">
                    {{ selectedPrompt.name }}
                  </Tag>
                </Space>
              </template>
              <template #extra>
                <Space>
                  <Switch
                    v-model:checked="highlightVars"
                    size="small"
                    checked-children="高亮"
                    un-checked-children="普通"
                  />
                  <Switch
                    v-model:checked="showRaw"
                    size="small"
                    checked-children="原始"
                    un-checked-children="渲染"
                  />
                  <Button size="small" @click="copyResult">
                    <CopyOutlined />
                    复制
                  </Button>
                </Space>
              </template>
              <!-- 统计信息 -->
              <div v-if="tokenCost" class="stats-bar mb-3">
                <Space>
                  <Tag color="blue">
                    <EyeOutlined />
                    Token 预估: {{ tokenCost.tokens }}
                  </Tag>
                  <Tag color="green">
                    预估成本: ${{ tokenCost.cost.toFixed(4) }}
                  </Tag>
                  <Tag> 字符数: {{ renderResult?.text?.length || 0 }} </Tag>
                </Space>
              </div>

              <!-- 安全警告 -->
              <Alert
                v-if="securityRisks.length > 0"
                type="warning"
                message="检测到安全风险"
                class="mb-3"
              >
                <template #description>
                  <ul class="mb-0">
                    <li v-for="risk in securityRisks" :key="risk">
                      {{ risk }}
                    </li>
                  </ul>
                </template>
              </Alert>

              <!-- 渲染内容 -->
              <div class="render-content">
                <pre v-if="showRaw" class="content-raw">{{
                  renderResult?.text
                }}</pre>
                <pre
                  v-else-if="highlightVars"
                  ref="highlightedContentRef"
                  class="content-rendered highlighted"
                  v-html="highlightedContent"
                  @click="handleContentClick"
                />
                <pre v-else class="content-rendered">{{
                  renderResult?.text
                }}</pre>
              </div>

              <!-- 变量替换追踪 -->
              <Collapse v-if="replacementTrace.length > 0" class="mt-3">
                <Collapse.Panel header="变量替换详情">
                  <Table
                    :columns="[
                      { title: '变量名', dataIndex: 'name', width: 150 },
                      { title: '原始值', dataIndex: 'original' },
                      { title: '替换后', dataIndex: 'replaced' },
                    ]"
                    :data-source="replacementTrace"
                    size="small"
                    :pagination="false"
                  />
                </Collapse.Panel>
              </Collapse>
            </Card>
          </Col>
        </Row>
      </div>

      <!-- 空状态 -->
      <Empty
        v-else-if="!loading"
        description="请选择步骤和提示词绑定"
        class="py-8"
      />

      <!-- 变量追踪弹窗 -->
      <Modal
        v-model:open="traceModalVisible"
        :title="`变量追踪: ${selectedVariable?.name}`"
        width="600px"
        :footer="null"
        @cancel="closeTraceModal"
      >
        <div v-if="selectedVariable" class="trace-detail">
          <Alert
            v-if="selectedVariable.isDefault"
            type="info"
            message="使用了默认值"
            class="mb-3"
            show-icon
          />

          <Descriptions bordered :column="1" size="small">
            <Descriptions.Item label="变量名">
              <Tag color="blue">{{ selectedVariable.name }}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="来源">
              {{ selectedVariable.source }}
            </Descriptions.Item>

            <Descriptions.Item label="原始值类型">
              <Tag>{{ typeof selectedVariable.original }}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="原始值">
              <pre class="trace-value">{{
                JSON.stringify(selectedVariable.original, null, 2)
              }}</pre>
            </Descriptions.Item>

            <Descriptions.Item label="转换后">
              <pre class="trace-value">{{ selectedVariable.replaced }}</pre>
            </Descriptions.Item>

            <Descriptions.Item label="转换说明">
              <span v-if="selectedVariable.isDefault">
                使用了变量定义的默认值
              </span>
              <span v-else-if="typeof selectedVariable.original === 'object'">
                JSON 对象被序列化为字符串
              </span>
              <span v-else> 直接转换为字符串 </span>
            </Descriptions.Item>
          </Descriptions>

          <div class="trace-actions mt-4">
            <Button type="primary" @click="closeTraceModal">关闭</Button>
          </div>
        </div>
      </Modal>
    </Card>
  </div>
</template>

<style lang="less" scoped>
.prompt-debugger {
  .debugger-header {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;

    .select-label {
      margin-bottom: 8px;
      font-weight: 500;
    }
  }

  .variable-inputs {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .var-input-row {
    .var-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;

      .required {
        color: #ff4d4f;
        margin-left: 4px;
      }
    }
  }

  .render-content {
    pre {
      margin: 0;
      padding: 16px;
      background: #f6f8fa;
      border-radius: 6px;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
      max-height: 500px;
      overflow: auto;

      &.highlighted {
        :deep(.trace-variable) {
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 4px;
          transition: all 0.2s;
          font-weight: 500;

          &.var-replaced {
            background: #e6fffb;
            color: #006d75;
            border: 1px solid #87e8de;

            &:hover {
              background: #b5f5ec;
            }
          }

          &.var-default {
            background: #fff7e6;
            color: #ad6800;
            border: 1px solid #ffd591;

            &:hover {
              background: #ffe7ba;
            }
          }
        }
      }
    }
  }

  .trace-detail {
    .trace-value {
      margin: 0;
      padding: 12px;
      background: #f6f8fa;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      max-height: 200px;
      overflow: auto;
    }

    .trace-actions {
      text-align: right;
    }
  }

  .stats-bar {
    padding: 8px 12px;
    background: #f6ffed;
    border-radius: 4px;
  }

  .test-cases {
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;
  }
}
</style>
