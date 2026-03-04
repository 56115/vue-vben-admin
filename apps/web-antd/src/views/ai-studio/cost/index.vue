<script lang="ts" setup>
import { ref, computed, onMounted, h } from 'vue';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Select,
  DatePicker,
  Space,
  Tabs,
  Progress,
  Tooltip,
  Button,
  Spin,
} from 'ant-design-vue';
import {
  DollarOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  FallOutlined,
  PieChartOutlined,
  BarChartOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';
import dayjs from 'dayjs';

interface CostOverview {
  totalTokens: number;
  totalCost: number;
  promptTokens: number;
  completionTokens: number;
  avgCostPerExecution: number;
  tokensTrend: number;
  costTrend: number;
}

interface ModuleCost {
  module: string;
  moduleName: string;
  tokens: number;
  cost: number;
  executions: number;
  avgTokensPerExecution: number;
  percentage: number;
}

interface ModelCost {
  model: string;
  provider: string;
  tokens: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  calls: number;
  avgLatency: number;
}

interface DailyCost {
  date: string;
  tokens: number;
  cost: number;
  executions: number;
}

interface UserCost {
  userId: number;
  username: string;
  tokens: number;
  cost: number;
  executions: number;
}

const loading = ref(false);
const timeRange = ref('7d');
const dateRange = ref<any[]>([]);
const selectedModule = ref('all');
const activeTab = ref('overview');
const accessDenied = ref(false);
const errorMessage = ref('');

const overview = ref<CostOverview>({
  totalTokens: 0,
  totalCost: 0,
  promptTokens: 0,
  completionTokens: 0,
  avgCostPerExecution: 0,
  tokensTrend: 0,
  costTrend: 0,
});

const moduleCosts = ref<ModuleCost[]>([]);
const modelCosts = ref<ModelCost[]>([]);
const dailyCosts = ref<DailyCost[]>([]);
const userCosts = ref<UserCost[]>([]);

const timeRangeOptions = [
  { value: '1d', label: '今天' },
  { value: '7d', label: '最近7天' },
  { value: '30d', label: '最近30天' },
  { value: '90d', label: '最近90天' },
  { value: 'custom', label: '自定义' },
];

const moduleOptions = [
  { value: 'all', label: '全部模块' },
  { value: 'ai-tutor', label: 'AI-Tutor 智能辅导' },
  { value: 'ai-doctor', label: 'AI-Doctor 学习诊断' },
  { value: 'ai-studio', label: 'AI-Studio 流程编排' },
];

// 格式化 Token 数量
const formatTokens = (tokens: number): string => {
  // 确保 tokens 是数字
  const numTokens = typeof tokens === 'number' ? tokens : Number(tokens) || 0;
  if (numTokens >= 1000000) return `${(numTokens / 1000000).toFixed(2)}M`;
  if (numTokens >= 1000) return `${(numTokens / 1000).toFixed(1)}K`;
  return numTokens.toString();
};

// 格式化成本 (假设 1K tokens = $0.002 for input, $0.006 for output)
const formatCost = (cost: number): string => {
  if (cost >= 100) return `¥${cost.toFixed(0)}`;
  if (cost >= 1) return `¥${cost.toFixed(2)}`;
  return `¥${cost.toFixed(4)}`;
};

// 模块成本表格列
const moduleCostColumns = [
  {
    title: '模块',
    dataIndex: 'moduleName',
    key: 'moduleName',
    width: 180,
  },
  {
    title: 'Token 消耗',
    dataIndex: 'tokens',
    key: 'tokens',
    width: 120,
    customRender: ({ text }: { text: number }) => formatTokens(text),
    sorter: (a: ModuleCost, b: ModuleCost) => a.tokens - b.tokens,
  },
  {
    title: '成本',
    dataIndex: 'cost',
    key: 'cost',
    width: 100,
    customRender: ({ text }: { text: number }) => formatCost(text),
    sorter: (a: ModuleCost, b: ModuleCost) => a.cost - b.cost,
  },
  {
    title: '执行次数',
    dataIndex: 'executions',
    key: 'executions',
    width: 100,
  },
  {
    title: '平均 Token/次',
    dataIndex: 'avgTokensPerExecution',
    key: 'avgTokensPerExecution',
    width: 120,
    customRender: ({ text }: { text: number }) =>
      Math.round(text).toLocaleString(),
  },
  {
    title: '占比',
    dataIndex: 'percentage',
    key: 'percentage',
    width: 150,
  },
];

// 模型成本表格列
const modelCostColumns = [
  {
    title: '模型',
    dataIndex: 'model',
    key: 'model',
    width: 180,
  },
  {
    title: '提供商',
    dataIndex: 'provider',
    key: 'provider',
    width: 100,
  },
  {
    title: '输入 Token',
    dataIndex: 'promptTokens',
    key: 'promptTokens',
    width: 110,
    customRender: ({ text }: { text: number }) => formatTokens(text),
  },
  {
    title: '输出 Token',
    dataIndex: 'completionTokens',
    key: 'completionTokens',
    width: 110,
    customRender: ({ text }: { text: number }) => formatTokens(text),
  },
  {
    title: '总成本',
    dataIndex: 'cost',
    key: 'cost',
    width: 100,
    customRender: ({ text }: { text: number }) => formatCost(text),
    sorter: (a: ModelCost, b: ModelCost) => a.cost - b.cost,
  },
  {
    title: '调用次数',
    dataIndex: 'calls',
    key: 'calls',
    width: 100,
  },
  {
    title: '平均延迟',
    dataIndex: 'avgLatency',
    key: 'avgLatency',
    width: 100,
    customRender: ({ text }: { text: number }) => `${text}ms`,
  },
];

// 用户成本表格列
const userCostColumns = [
  {
    title: '用户',
    dataIndex: 'username',
    key: 'username',
    width: 150,
  },
  {
    title: 'Token 消耗',
    dataIndex: 'tokens',
    key: 'tokens',
    width: 120,
    customRender: ({ text }: { text: number }) => formatTokens(text),
    sorter: (a: UserCost, b: UserCost) => a.tokens - b.tokens,
  },
  {
    title: '成本',
    dataIndex: 'cost',
    key: 'cost',
    width: 100,
    customRender: ({ text }: { text: number }) => formatCost(text),
    sorter: (a: UserCost, b: UserCost) => a.cost - b.cost,
  },
  {
    title: '执行次数',
    dataIndex: 'executions',
    key: 'executions',
    width: 100,
  },
];

// 每日成本表格列
const dailyCostColumns = [
  {
    title: '日期',
    dataIndex: 'date',
    key: 'date',
    width: 120,
  },
  {
    title: 'Token 消耗',
    dataIndex: 'tokens',
    key: 'tokens',
    width: 120,
    customRender: ({ text }: { text: number }) => formatTokens(text),
  },
  {
    title: '成本',
    dataIndex: 'cost',
    key: 'cost',
    width: 100,
    customRender: ({ text }: { text: number }) => formatCost(text),
  },
  {
    title: '执行次数',
    dataIndex: 'executions',
    key: 'executions',
    width: 100,
  },
];

// 获取成本数据
const fetchCostData = async () => {
  loading.value = true;
  accessDenied.value = false;
  errorMessage.value = '';
  try {
    const response = await requestClient.get('/ai-studio/cost', {
      params: {
        timeRange: timeRange.value,
        startDate: dateRange.value[0]?.format('YYYY-MM-DD'),
        endDate: dateRange.value[1]?.format('YYYY-MM-DD'),
        module:
          selectedModule.value !== 'all' ? selectedModule.value : undefined,
      },
    });

    if (response.overview) {
      overview.value = response.overview;
    }
    if (response.modules) {
      moduleCosts.value = response.modules;
    }
    if (response.models) {
      modelCosts.value = response.models;
    }
    if (response.daily) {
      dailyCosts.value = response.daily;
    }
    if (response.users) {
      userCosts.value = response.users;
    }
  } catch (error: any) {
    console.error('Failed to fetch cost data:', error);

    // 检查是否是403权限错误
    if (error.response?.status === 403) {
      accessDenied.value = true;
      errorMessage.value =
        error.response?.data?.message ||
        '您没有权限访问此数据，请联系管理员分配权限。';
      // 清空数据
      overview.value = {
        totalTokens: 0,
        totalCost: 0,
        promptTokens: 0,
        completionTokens: 0,
        avgCostPerExecution: 0,
        tokensTrend: 0,
        costTrend: 0,
      };
      moduleCosts.value = [];
      modelCosts.value = [];
      dailyCosts.value = [];
      userCosts.value = [];
      return;
    }

    // 其他错误不显示mock数据，显示空状态
    errorMessage.value = '数据加载失败，请稍后重试';
    overview.value = {
      totalTokens: 0,
      totalCost: 0,
      promptTokens: 0,
      completionTokens: 0,
      avgCostPerExecution: 0,
      tokensTrend: 0,
      costTrend: 0,
    };
    moduleCosts.value = [];
    modelCosts.value = [];
    dailyCosts.value = [];
    userCosts.value = [];
  } finally {
    loading.value = false;
  }
};

// 导出报告
const exportReport = async () => {
  // TODO: 实现导出功能
};

// 处理时间范围变化
const handleTimeRangeChange = () => {
  if (timeRange.value !== 'custom') {
    dateRange.value = [];
  }
  fetchCostData();
};

onMounted(() => {
  fetchCostData();
});
</script>

<template>
  <div class="cost-dashboard">
    <!-- 无权限访问提示 -->
    <Card v-if="accessDenied" class="access-denied-card">
      <div class="access-denied-content">
        <div class="access-denied-icon">🔒</div>
        <div class="access-denied-message">
          <h3>无权访问</h3>
          <p>{{ errorMessage }}</p>
          <p class="hint">
            请联系管理员分配 <strong>AI_STUDIO:METRICS:COST</strong> 权限
          </p>
        </div>
      </div>
    </Card>

    <!-- 错误提示 -->
    <Card v-else-if="errorMessage" class="error-card">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <div class="error-message">
          <p>{{ errorMessage }}</p>
          <Button type="link" @click="fetchCostData">重试</Button>
        </div>
      </div>
    </Card>

    <template v-else>
      <!-- 筛选条件 -->
      <Card class="filter-card">
        <Space>
          <span>时间范围:</span>
          <Select
            v-model:value="timeRange"
            :options="timeRangeOptions"
            style="width: 120px"
            @change="handleTimeRangeChange"
          />
          <DatePicker.RangePicker
            v-if="timeRange === 'custom'"
            v-model:value="dateRange"
            @change="fetchCostData"
          />
          <span style="margin-left: 16px">模块:</span>
          <Select
            v-model:value="selectedModule"
            :options="moduleOptions"
            style="width: 180px"
            @change="fetchCostData"
          />
          <Button type="text" @click="fetchCostData">
            <template #icon><ReloadOutlined /></template>
            刷新
          </Button>
          <Button @click="exportReport">
            <template #icon><DownloadOutlined /></template>
            导出报告
          </Button>
        </Space>
      </Card>

      <Spin :spinning="loading">
        <!-- 总览统计 -->
        <Row :gutter="16" class="stats-row">
          <Col :span="6">
            <Card>
              <Statistic
                title="Token 总消耗"
                :value="overview.totalTokens"
                :prefix="h(ThunderboltOutlined)"
                :formatter="(value: number) => formatTokens(value)"
              >
                <template #suffix>
                  <span
                    :class="[
                      'trend',
                      overview.tokensTrend >= 0 ? 'trend-up' : 'trend-down',
                    ]"
                  >
                    <RiseOutlined v-if="overview.tokensTrend >= 0" />
                    <FallOutlined v-else />
                    {{ Math.abs(overview.tokensTrend) }}%
                  </span>
                </template>
              </Statistic>
            </Card>
          </Col>
          <Col :span="6">
            <Card>
              <Statistic
                title="总成本"
                :value="overview.totalCost"
                :precision="2"
                prefix="¥"
                :prefix-icon="h(DollarOutlined)"
              >
                <template #suffix>
                  <span
                    :class="[
                      'trend',
                      overview.costTrend >= 0 ? 'trend-up' : 'trend-down',
                    ]"
                  >
                    <RiseOutlined v-if="overview.costTrend >= 0" />
                    <FallOutlined v-else />
                    {{ Math.abs(overview.costTrend) }}%
                  </span>
                </template>
              </Statistic>
            </Card>
          </Col>
          <Col :span="6">
            <Card>
              <Statistic
                title="输入 Token"
                :value="overview.promptTokens"
                :formatter="(value: number) => formatTokens(value)"
              />
              <div class="stat-sub">
                占比:
                {{
                  (
                    (overview.promptTokens / overview.totalTokens) * 100 || 0
                  ).toFixed(1)
                }}%
              </div>
            </Card>
          </Col>
          <Col :span="6">
            <Card>
              <Statistic
                title="输出 Token"
                :value="overview.completionTokens"
                :formatter="(value: number) => formatTokens(value)"
              />
              <div class="stat-sub">
                占比:
                {{
                  (
                    (overview.completionTokens / overview.totalTokens) * 100 ||
                    0
                  ).toFixed(1)
                }}%
              </div>
            </Card>
          </Col>
        </Row>

        <!-- 详细数据 Tabs -->
        <Card>
          <Tabs v-model:activeKey="activeTab">
            <!-- 按模块统计 -->
            <Tabs.TabPane key="module" tab="按模块统计">
              <Table
                :columns="moduleCostColumns"
                :data-source="moduleCosts"
                :pagination="false"
                row-key="module"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'moduleName'">
                    <Space>
                      <Tag
                        :color="
                          record.module === 'ai-tutor'
                            ? 'blue'
                            : record.module === 'ai-doctor'
                              ? 'green'
                              : 'purple'
                        "
                      >
                        {{ record.moduleName }}
                      </Tag>
                    </Space>
                  </template>
                  <template v-if="column.key === 'percentage'">
                    <Progress
                      :percent="record.percentage"
                      :show-info="true"
                      size="small"
                      :stroke-color="
                        record.module === 'ai-tutor'
                          ? '#1890ff'
                          : record.module === 'ai-doctor'
                            ? '#52c41a'
                            : '#722ed1'
                      "
                    />
                  </template>
                </template>
              </Table>
            </Tabs.TabPane>

            <!-- 按模型统计 -->
            <Tabs.TabPane key="model" tab="按模型统计">
              <Table
                :columns="modelCostColumns"
                :data-source="modelCosts"
                :pagination="false"
                row-key="model"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'provider'">
                    <Tag>{{ record.provider }}</Tag>
                  </template>
                </template>
              </Table>
            </Tabs.TabPane>

            <!-- 按用户统计 -->
            <Tabs.TabPane key="user" tab="按用户统计">
              <Table
                :columns="userCostColumns"
                :data-source="userCosts"
                :pagination="{ pageSize: 10 }"
                row-key="userId"
              />
            </Tabs.TabPane>

            <!-- 每日趋势 -->
            <Tabs.TabPane key="daily" tab="每日趋势">
              <Table
                :columns="dailyCostColumns"
                :data-source="dailyCosts"
                :pagination="false"
                row-key="date"
              />
              <div class="chart-placeholder">
                <BarChartOutlined style="font-size: 48px; color: #d9d9d9" />
                <p>图表功能开发中...</p>
              </div>
            </Tabs.TabPane>
          </Tabs>
        </Card>

        <!-- 成本优化建议 -->
        <Card title="成本优化建议" class="suggestions-card">
          <Row :gutter="16">
            <Col :span="8">
              <div class="suggestion-item">
                <div class="suggestion-icon" style="background: #e6f7ff">
                  <ThunderboltOutlined style="color: #1890ff" />
                </div>
                <div class="suggestion-content">
                  <div class="suggestion-title">使用缓存减少重复调用</div>
                  <div class="suggestion-desc">
                    相同输入的 OCR 识别结果可缓存，预计节省 15% Token 消耗
                  </div>
                </div>
              </div>
            </Col>
            <Col :span="8">
              <div class="suggestion-item">
                <div class="suggestion-icon" style="background: #f6ffed">
                  <PieChartOutlined style="color: #52c41a" />
                </div>
                <div class="suggestion-content">
                  <div class="suggestion-title">优化 Prompt 长度</div>
                  <div class="suggestion-desc">
                    AI-Doctor 模块 Prompt 平均长度较高，建议精简系统提示词
                  </div>
                </div>
              </div>
            </Col>
            <Col :span="8">
              <div class="suggestion-item">
                <div class="suggestion-icon" style="background: #fff7e6">
                  <DollarOutlined style="color: #fa8c16" />
                </div>
                <div class="suggestion-content">
                  <div class="suggestion-title">选择性价比更高的模型</div>
                  <div class="suggestion-desc">
                    简单任务可使用 qwen-turbo 替代 qwen-plus，成本降低 60%
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      </Spin>
    </template>
  </div>
</template>

<script lang="ts">
export default {
  name: 'CostDashboard',
};
</script>

<style scoped>
.cost-dashboard {
  padding: 20px;
}

.filter-card {
  margin-bottom: 16px;
}

.access-denied-card {
  margin-bottom: 16px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
}

.access-denied-content {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 20px;
}

.access-denied-icon {
  flex-shrink: 0;
  font-size: 48px;
}

.access-denied-message h3 {
  margin-bottom: 8px;
  font-size: 18px;
  color: #cf1322;
}

.access-denied-message p {
  margin-bottom: 4px;
  color: #595959;
}

.access-denied-message .hint {
  margin-top: 12px;
  font-size: 12px;
  color: #8c8c8c;
}

.error-card {
  margin-bottom: 16px;
  background: #fffbe6;
  border: 1px solid #ffd591;
}

.error-content {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
}

.error-icon {
  flex-shrink: 0;
  font-size: 32px;
}

.error-message {
  flex: 1;
}

.stats-row {
  margin-bottom: 16px;
}

.trend {
  margin-left: 8px;
  font-size: 12px;
}

.trend-up {
  color: #cf1322;
}

.trend-down {
  color: #3f8600;
}

.stat-sub {
  margin-top: 8px;
  font-size: 12px;
  color: rgb(0 0 0 / 45%);
}

.chart-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: rgb(0 0 0 / 25%);
}

.suggestions-card {
  margin-top: 16px;
}

.suggestion-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.suggestion-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 24px;
  border-radius: 8px;
}

.suggestion-content {
  flex: 1;
}

.suggestion-title {
  font-weight: 500;
  color: rgb(0 0 0 / 85%);
}

.suggestion-desc {
  margin-top: 4px;
  font-size: 12px;
  color: rgb(0 0 0 / 45%);
}
</style>
