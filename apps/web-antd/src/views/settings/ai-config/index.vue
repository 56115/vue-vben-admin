<template>
  <Page title="AI 配置" description="配置 AI 功能的模型参数和场景设置">
    <!-- 基础配置卡片 -->
    <Card class="basic-config-card mb-6" title="基础配置">
      <Alert
        message="配置自定义 API 可使用您自己的模型服务"
        description="启用自定义 Provider 后，系统将使用您配置的 API 地址和密钥调用模型，而不是平台默认服务。"
        type="info"
        show-icon
        class="mb-4"
      />
      <Form layout="vertical" :model="basicConfig">
        <FormItem label="启用自定义 Provider">
          <Switch
            v-model:checked="basicConfig.enableCustomProvider"
            checked-children="启用"
            un-checked-children="禁用"
          />
        </FormItem>
        <FormItem
          v-if="basicConfig.enableCustomProvider"
          label="API 地址"
          required
        >
          <Input
            v-model:value="basicConfig.oneApiBaseUrl"
            placeholder="例如: https://api.openai.com/v1"
          />
          <div class="form-hint">
            模型服务的 API 地址，需要支持 OpenAI 格式的接口
          </div>
        </FormItem>
        <FormItem
          v-if="basicConfig.enableCustomProvider"
          label="API Key"
          required
        >
          <InputPassword
            v-model:value="basicConfig.oneApiKey"
            placeholder="输入您的 API Key"
          />
          <div class="form-hint">
            API 密钥将安全存储，仅用于调用您配置的模型服务
          </div>
        </FormItem>
        <FormItem v-if="basicConfig.enableCustomProvider">
          <Button
            type="primary"
            :loading="savingBasicConfig"
            @click="saveBasicConfig"
          >
            保存基础配置
          </Button>
        </FormItem>
      </Form>
    </Card>

    <!-- 配额信息卡片 -->
    <Card class="quota-card mb-6">
      <Row :gutter="24">
        <Col :span="8">
          <Statistic
            title="本月使用量"
            :value="quota.usedTokens"
            suffix="tokens"
          >
            <template #prefix>
              <ThunderboltOutlined style="color: #1890ff" />
            </template>
          </Statistic>
        </Col>
        <Col :span="8">
          <Statistic
            title="剩余配额"
            :value="quota.remainingTokens"
            suffix="tokens"
          >
            <template #prefix>
              <DatabaseOutlined style="color: #52c41a" />
            </template>
          </Statistic>
        </Col>
        <Col :span="8">
          <Statistic title="使用率" :value="quota.usagePercent" suffix="%">
            <template #prefix>
              <PieChartOutlined style="color: #722ed1" />
            </template>
          </Statistic>
        </Col>
      </Row>
      <Progress
        :percent="quota.usagePercent"
        :status="quota.usagePercent > 80 ? 'exception' : 'active'"
        :stroke-color="quota.usagePercent > 80 ? '#ff4d4f' : '#1890ff'"
        class="mt-4"
      />
    </Card>

    <Row :gutter="24">
      <!-- 场景配置列表 -->
      <Col :span="16">
        <Card title="场景配置" class="scenario-card">
          <template #extra>
            <Button type="link" @click="refreshConfig">
              <ReloadOutlined />
              刷新
            </Button>
          </template>

          <Spin :spinning="loading">
            <div class="scenario-list">
              <div
                v-for="scenario in scenarios"
                :key="scenario.scenario"
                class="scenario-item"
                :class="{ 'is-customized': scenario.isCustomized }"
              >
                <div class="scenario-header">
                  <div class="scenario-info">
                    <div class="scenario-icon">
                      <RobotOutlined
                        v-if="scenario.scenario.includes('CHAT')"
                      />
                      <BulbOutlined
                        v-else-if="scenario.scenario.includes('REASONING')"
                      />
                      <EyeOutlined
                        v-else-if="scenario.scenario.includes('VISION')"
                      />
                      <ApiOutlined v-else />
                    </div>
                    <div class="scenario-title">
                      <span class="name">{{
                        getScenarioName(scenario.scenario)
                      }}</span>
                      <Tag
                        v-if="scenario.isCustomized"
                        color="blue"
                        size="small"
                        >已自定义</Tag
                      >
                      <Tag v-else color="default" size="small">默认</Tag>
                    </div>
                  </div>
                  <div class="scenario-actions">
                    <Button
                      type="link"
                      size="small"
                      @click="editScenario(scenario)"
                    >
                      <EditOutlined />
                      编辑
                    </Button>
                    <Button
                      v-if="scenario.isCustomized"
                      type="link"
                      size="small"
                      danger
                      @click="resetScenario(scenario.scenario)"
                    >
                      <UndoOutlined />
                      重置
                    </Button>
                  </div>
                </div>

                <div class="scenario-body">
                  <div class="config-item">
                    <span class="label">模型:</span>
                    <span class="value">{{ scenario.modelName }}</span>
                  </div>
                  <div class="config-item">
                    <span class="label">温度:</span>
                    <span class="value">{{ scenario.temperature }}</span>
                  </div>
                  <div class="config-item">
                    <span class="label">最大 Token:</span>
                    <span class="value">{{ scenario.maxTokens }}</span>
                  </div>
                  <div class="config-item">
                    <span class="label">超时:</span>
                    <span class="value">{{ scenario.timeout }}ms</span>
                  </div>
                </div>
              </div>
            </div>
          </Spin>
        </Card>
      </Col>

      <!-- 右侧信息 -->
      <Col :span="8">
        <!-- 可用模型 -->
        <Card title="可用模型" class="models-card mb-6">
          <div class="model-list">
            <div v-for="model in models" :key="model.id" class="model-item">
              <div class="model-info">
                <span class="model-name">{{ model.name }}</span>
                <Tag
                  :color="model.isPlatformDefault ? 'green' : 'default'"
                  size="small"
                >
                  {{ model.isPlatformDefault ? '推荐' : '可用' }}
                </Tag>
              </div>
              <div class="model-desc">{{ model.description || model.id }}</div>
            </div>
          </div>
        </Card>

        <!-- 帮助信息 -->
        <Card class="help-card">
          <template #title>
            <QuestionCircleOutlined class="mr-2" />
            配置说明
          </template>

          <div class="help-content">
            <div class="help-item">
              <div class="help-title">温度 (Temperature)</div>
              <div class="help-desc">
                控制输出的随机性，0-2之间。较低值更确定，较高值更有创意。
              </div>
            </div>
            <div class="help-item">
              <div class="help-title">最大 Token</div>
              <div class="help-desc">
                AI 响应的最大长度限制，影响回复的详细程度。
              </div>
            </div>
            <div class="help-item">
              <div class="help-title">超时时间</div>
              <div class="help-desc">
                API 调用的超时时间（毫秒），超时将返回错误。
              </div>
            </div>
          </div>
        </Card>
      </Col>
    </Row>

    <!-- 编辑对话框 -->
    <Modal
      v-model:open="editModalVisible"
      :title="'编辑 ' + getScenarioName(currentScenario?.scenario || '')"
      :confirm-loading="saving"
      @ok="handleSave"
      @cancel="editModalVisible = false"
    >
      <Form layout="vertical" :model="editForm">
        <FormItem label="模型">
          <Select
            v-model:value="editForm.modelName"
            placeholder="选择模型（留空使用默认）"
            allow-clear
          >
            <SelectOption
              v-for="model in models"
              :key="model.id"
              :value="model.id"
            >
              {{ model.name }}
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem label="温度 (Temperature)">
          <Slider
            v-model:value="editForm.temperature"
            :min="0"
            :max="2"
            :step="0.1"
          />
          <InputNumber
            v-model:value="editForm.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            style="width: 100%"
          />
        </FormItem>
        <FormItem label="最大 Token">
          <InputNumber
            v-model:value="editForm.maxTokens"
            :min="100"
            :max="128000"
            :step="100"
            style="width: 100%"
          />
        </FormItem>
        <FormItem label="超时时间 (毫秒)">
          <InputNumber
            v-model:value="editForm.timeout"
            :min="5000"
            :max="600000"
            :step="1000"
            style="width: 100%"
          />
        </FormItem>
      </Form>
    </Modal>
  </Page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import {
  message,
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Button,
  Tag,
  Spin,
  Modal,
  Form,
  FormItem,
  Select,
  SelectOption,
  Slider,
  InputNumber,
  Input,
  Switch,
  Alert,
} from 'ant-design-vue';
import {
  ThunderboltOutlined,
  DatabaseOutlined,
  PieChartOutlined,
  ReloadOutlined,
  RobotOutlined,
  BulbOutlined,
  EyeOutlined,
  ApiOutlined,
  EditOutlined,
  UndoOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons-vue';
import { Page } from '@vben/common-ui';
import { requestClient } from '#/api/request';

interface ScenarioConfig {
  scenario: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  topP: number | null;
  isCustomized: boolean;
}

interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  isPlatformDefault: boolean;
}

interface QuotaInfo {
  usedTokens: number;
  totalQuota: number;
  remainingTokens: number;
  usagePercent: number;
}

const InputPassword = Input.Password;

const loading = ref(false);
const saving = ref(false);
const savingBasicConfig = ref(false);
const editModalVisible = ref(false);

const basicConfig = reactive({
  enableCustomProvider: false,
  oneApiBaseUrl: '',
  oneApiKey: '',
});

const scenarios = ref<ScenarioConfig[]>([]);
const models = ref<ModelInfo[]>([]);
const quota = ref<QuotaInfo>({
  usedTokens: 0,
  totalQuota: 1000000,
  remainingTokens: 1000000,
  usagePercent: 0,
});

const currentScenario = ref<ScenarioConfig | null>(null);
const editForm = reactive({
  modelName: null as string | null,
  temperature: 0.7,
  maxTokens: 4096,
  timeout: 120000,
});

const scenarioNames: Record<string, string> = {
  LLM_CHAT: '普通对话',
  LLM_REASONING: '结构化推理',
  VISION_OCR: 'OCR 识别',
  VISION_ANALYSIS: '图像分析',
  EMBEDDING: '向量嵌入',
};

const getScenarioName = (scenario: string): string => {
  return scenarioNames[scenario] || scenario;
};

const fetchConfig = async () => {
  loading.value = true;
  try {
    const res = await requestClient.get<{
      scenarios: ScenarioConfig[];
      basicConfig?: {
        enableCustomProvider: boolean;
        oneApiBaseUrl?: string;
        oneApiKey?: string;
      };
    }>('/settings/ai-config');

    scenarios.value = res.scenarios || [];

    // 加载基础配置
    if (res.basicConfig) {
      basicConfig.enableCustomProvider = res.basicConfig.enableCustomProvider;
      basicConfig.oneApiBaseUrl = res.basicConfig.oneApiBaseUrl || '';
      basicConfig.oneApiKey = res.basicConfig.oneApiKey || '';
    }
  } catch (error: any) {
    message.error(error.message || '获取配置失败');
  } finally {
    loading.value = false;
  }
};

const fetchModels = async () => {
  try {
    const res = await requestClient.get<{ models: ModelInfo[] }>(
      '/settings/ai-config/models',
    );
    models.value = res.models || [];
  } catch (error: any) {
    console.error('获取模型列表失败', error);
  }
};

const fetchQuota = async () => {
  try {
    const res = await requestClient.get<QuotaInfo>('/settings/ai-config/quota');
    quota.value = res;
  } catch (error: any) {
    console.error('获取配额信息失败', error);
  }
};

const refreshConfig = () => {
  fetchConfig();
  fetchModels();
  fetchQuota();
};

const editScenario = (scenario: ScenarioConfig) => {
  currentScenario.value = scenario;
  editForm.modelName = scenario.isCustomized ? scenario.modelName : null;
  editForm.temperature = scenario.temperature;
  editForm.maxTokens = scenario.maxTokens;
  editForm.timeout = scenario.timeout;
  editModalVisible.value = true;
};

const handleSave = async () => {
  if (!currentScenario.value) return;

  saving.value = true;
  try {
    const data: Record<string, any> = {};
    if (editForm.modelName) data.modelName = editForm.modelName;
    if (editForm.temperature !== currentScenario.value.temperature) {
      data.temperature = editForm.temperature;
    }
    if (editForm.maxTokens !== currentScenario.value.maxTokens) {
      data.maxTokens = editForm.maxTokens;
    }
    if (editForm.timeout !== currentScenario.value.timeout) {
      data.timeout = editForm.timeout;
    }

    await requestClient.put(
      `/settings/ai-config/scenarios/${currentScenario.value.scenario}`,
      data,
    );
    message.success('保存成功');
    editModalVisible.value = false;
    await fetchConfig();
  } catch (error: any) {
    message.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const resetScenario = async (scenario: string) => {
  Modal.confirm({
    title: '确认重置',
    content: `确定要将 ${getScenarioName(scenario)} 重置为默认配置吗？`,
    onOk: async () => {
      try {
        await requestClient.delete(`/settings/ai-config/scenarios/${scenario}`);
        message.success('已重置为默认配置');
        await fetchConfig();
      } catch (error: any) {
        message.error(error.message || '重置失败');
      }
    },
  });
};

const saveBasicConfig = async () => {
  if (basicConfig.enableCustomProvider) {
    if (!basicConfig.oneApiBaseUrl || !basicConfig.oneApiKey) {
      message.error('请填写 API 地址和 API Key');
      return;
    }
  }

  savingBasicConfig.value = true;
  try {
    await requestClient.put('/settings/ai-config/basic', {
      enableCustomProvider: basicConfig.enableCustomProvider,
      oneApiBaseUrl: basicConfig.enableCustomProvider
        ? basicConfig.oneApiBaseUrl
        : null,
      oneApiKey: basicConfig.enableCustomProvider
        ? basicConfig.oneApiKey
        : null,
    });
    message.success('基础配置保存成功');
    await fetchConfig();
  } catch (error: any) {
    message.error(error.message || '保存失败');
  } finally {
    savingBasicConfig.value = false;
  }
};

onMounted(() => {
  fetchConfig();
  fetchModels();
  fetchQuota();
});
</script>

<style scoped>
/* 基础配置卡片 */
.basic-config-card {
  border-radius: 12px;
}

.form-hint {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-color-secondary, #999);
}

/* 配额卡片 */
.quota-card {
  border-radius: 12px;
}

.quota-card :deep(.ant-statistic-title) {
  font-size: 14px;
  color: var(--text-color-secondary, #666);
}

.quota-card :deep(.ant-statistic-content) {
  font-size: 28px;
  font-weight: 600;
}

/* 场景配置卡片 */
.scenario-card {
  border-radius: 12px;
}

.scenario-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-item {
  padding: 16px;
  border: 1px solid var(--border-color, #f0f0f0);
  border-radius: 8px;
  transition: all 0.3s;
}

.scenario-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgb(24 144 255 / 15%);
}

.scenario-item.is-customized {
  border-left: 3px solid #1890ff;
}

.scenario-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.scenario-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.scenario-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  color: #1890ff;
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  border-radius: 8px;
}

.scenario-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scenario-title .name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color, #333);
}

.scenario-body {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 24px;
  padding-left: 52px;
}

.config-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.config-item .label {
  font-size: 13px;
  color: var(--text-color-secondary, #999);
}

.config-item .value {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color, #333);
}

/* 模型列表卡片 */
.models-card {
  border-radius: 12px;
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-item {
  padding: 12px;
  background: var(--component-background-light, #fafafa);
  border-radius: 8px;
}

.model-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.model-name {
  font-weight: 500;
  color: var(--text-color, #333);
}

.model-desc {
  font-size: 12px;
  color: var(--text-color-secondary, #999);
}

/* 帮助卡片 */
.help-card {
  border-radius: 12px;
}

.help-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.help-item {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
}

.help-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.help-title {
  margin-bottom: 4px;
  font-weight: 600;
  color: var(--text-color, #333);
}

.help-desc {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-color-secondary, #666);
}
</style>
