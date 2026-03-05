<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import {
  Button,
  Space,
  message,
  Card,
  Table,
  Modal,
  DatePicker,
  Select,
  Tag,
  Statistic,
  Row,
  Col,
  Descriptions,
  Badge,
  Tooltip,
} from 'ant-design-vue';
import {
  SearchOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  WarningOutlined,
  StopOutlined,
  UserDeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';

// Types
interface ViolationRecord {
  id: number;
  externalUserid: string;
  externalName: string | null;
  userId: number | null;
  userName: string | null;
  groupChatId: string | null;
  groupChatName: string | null;
  ruleId: number | null;
  ruleName: string | null;
  ruleType: string;
  violationType: string;
  matchedContent: string[];
  originalContent: string | null;
  messageType: string | null;
  action: string;
  actionExecuted: boolean;
  actionResult: string | null;
  actionError: string | null;
  occurredAt: string;
  processedAt: string | null;
  createdAt: string;
}

interface ViolationStatistics {
  totalCount: number;
  todayCount: number;
  weekCount: number;
  processedCount: number;
  pendingCount: number;
  byRuleType: Array<{ ruleType: string; count: number }>;
  byAction: Array<{ action: string; count: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
}

// State
const loading = ref(false);
const records = ref<ViolationRecord[]>([]);
const statistics = ref<ViolationStatistics | null>(null);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

// Filter state
const filterRuleType = ref<string | undefined>(undefined);
const filterViolationType = ref<string | undefined>(undefined);
const filterActionExecuted = ref<boolean | undefined>(undefined);
const filterDateRange = ref<[string, string] | null>(null);

// Modal state
const detailModalVisible = ref(false);
const selectedRecord = ref<ViolationRecord | null>(null);

// Options
const ruleTypeOptions = [
  { value: 'SENSITIVE_WORD', label: '敏感词检测' },
  { value: 'MESSAGE_TYPE', label: '消息类型限制' },
  { value: 'SPAM', label: '刷屏检测' },
  { value: 'EXTERNAL_CORP', label: '外企员工检测' },
];

const violationTypeOptions = [
  { value: 'SENSITIVE_WORD', label: '敏感词' },
  { value: 'PROHIBITED_MESSAGE_TYPE', label: '禁止消息类型' },
  { value: 'SPAM', label: '刷屏' },
  { value: 'EXTERNAL_CORP', label: '外企员工' },
  { value: 'BLACKLISTED', label: '黑名单用户' },
];

const actionOptions = [
  { value: 'WARN', label: '警告' },
  { value: 'KICK', label: '踢出群聊' },
  { value: 'BLACKLIST', label: '加入黑名单' },
];

// Helper functions for action display
function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    WARN: 'warning',
    KICK: 'error',
    BLACKLIST: 'default',
  };
  return colors[action] || 'default';
}

// Table columns
const columns = [
  {
    title: '违规用户',
    dataIndex: 'externalName',
    key: 'externalName',
    width: 120,
  },
  {
    title: '群聊',
    dataIndex: 'groupChatName',
    key: 'groupChatName',
    width: 120,
  },
  { title: '触发规则', dataIndex: 'ruleName', key: 'ruleName', width: 140 },
  {
    title: '违规类型',
    dataIndex: 'violationType',
    key: 'violationType',
    width: 120,
  },
  {
    title: '处置动作',
    dataIndex: 'action',
    key: 'action',
    width: 100,
  },
  {
    title: '处置状态',
    dataIndex: 'actionExecuted',
    key: 'actionExecuted',
    width: 100,
  },
  { title: '发生时间', dataIndex: 'occurredAt', key: 'occurredAt', width: 160 },
  {
    title: '操作',
    key: 'actions',
    width: 80,
  },
];

// Helper functions
function getViolationTypeLabel(type: string): string {
  const option = violationTypeOptions.find((o) => o.value === type);
  return option?.label || type;
}

function getRuleTypeLabel(type: string): string {
  const option = ruleTypeOptions.find((o) => o.value === type);
  return option?.label || type;
}

function getActionLabel(action: string): string {
  const option = actionOptions.find((o) => o.value === action);
  return option?.label || action;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// API calls
async function fetchRecords() {
  loading.value = true;
  try {
    const params: Record<string, unknown> = {
      page: currentPage.value,
      pageSize: pageSize.value,
    };

    if (filterRuleType.value) {
      params.ruleType = filterRuleType.value;
    }
    if (filterViolationType.value) {
      params.violationType = filterViolationType.value;
    }
    if (filterActionExecuted.value !== undefined) {
      params.actionExecuted = filterActionExecuted.value;
    }
    if (filterDateRange.value) {
      params.startDate = filterDateRange.value[0];
      params.endDate = filterDateRange.value[1];
    }

    const res = await requestClient.get<{
      items: ViolationRecord[];
      total: number;
    }>('/operations/anti-harassment/violations', { params });

    records.value = res.items || [];
    total.value = res.total || 0;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function fetchStatistics() {
  try {
    const res = await requestClient.get<ViolationStatistics>(
      '/operations/anti-harassment/violations/statistics',
    );
    statistics.value = res;
  } catch (e) {
    console.error(e);
  }
}

async function handleRetryFailed() {
  try {
    loading.value = true;
    const res = await requestClient.post<{
      total: number;
      succeeded: number;
      failed: number;
    }>('/operations/anti-harassment/violations/retry-failed');
    message.success(
      `重试完成：成功 ${res.succeeded} 条，失败 ${res.failed} 条`,
    );
    fetchRecords();
    fetchStatistics();
  } catch (e: any) {
    message.error(e.message || '重试失败');
  } finally {
    loading.value = false;
  }
}

// Event handlers
function handleSearch() {
  currentPage.value = 1;
  fetchRecords();
}

function handleReset() {
  filterRuleType.value = undefined;
  filterViolationType.value = undefined;
  filterActionExecuted.value = undefined;
  filterDateRange.value = null;
  currentPage.value = 1;
  fetchRecords();
}

function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  fetchRecords();
}

function handleViewDetail(record: ViolationRecord) {
  selectedRecord.value = record;
  detailModalVisible.value = true;
}

function goBack() {
  window.history.back();
}

onMounted(() => {
  fetchRecords();
  fetchStatistics();
});
</script>

<template>
  <div class="p-5">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center">
        <Button type="text" @click="goBack">
          <ArrowLeftOutlined />
        </Button>
        <h2 class="ml-2 text-xl font-bold">违规记录</h2>
      </div>
      <Button
        type="primary"
        :loading="loading"
        @click="handleRetryFailed"
        v-if="statistics?.pendingCount"
      >
        <ReloadOutlined /> 重试失败处置 ({{ statistics?.pendingCount }})
      </Button>
    </div>

    <!-- Statistics Cards -->
    <Row :gutter="16" class="mb-4" v-if="statistics">
      <Col :span="4">
        <Card>
          <Statistic title="总违规次数" :value="statistics.totalCount" />
        </Card>
      </Col>
      <Col :span="4">
        <Card>
          <Statistic
            title="今日违规"
            :value="statistics.todayCount"
            value-style="color: #cf1322"
          />
        </Card>
      </Col>
      <Col :span="4">
        <Card>
          <Statistic title="本周违规" :value="statistics.weekCount" />
        </Card>
      </Col>
      <Col :span="4">
        <Card>
          <Statistic
            title="已处置"
            :value="statistics.processedCount"
            value-style="color: #3f8600"
          />
        </Card>
      </Col>
      <Col :span="4">
        <Card>
          <Statistic
            title="待处置"
            :value="statistics.pendingCount"
            value-style="color: #faad14"
          />
        </Card>
      </Col>
    </Row>

    <!-- Filters -->
    <Card class="mb-4">
      <Space wrap>
        <Select
          v-model:value="filterRuleType"
          placeholder="规则类型"
          style="width: 140px"
          allowClear
          :options="ruleTypeOptions"
        />
        <Select
          v-model:value="filterViolationType"
          placeholder="违规类型"
          style="width: 140px"
          allowClear
          :options="violationTypeOptions"
        />
        <Select
          v-model:value="filterActionExecuted"
          placeholder="处置状态"
          style="width: 120px"
          allowClear
        >
          <Select.Option :value="true">已处置</Select.Option>
          <Select.Option :value="false">待处置</Select.Option>
        </Select>
        <DatePicker.RangePicker
          v-model:value="filterDateRange"
          style="width: 240px"
        />
        <Button type="primary" @click="handleSearch">
          <SearchOutlined /> 查询
        </Button>
        <Button @click="handleReset">重置</Button>
      </Space>
    </Card>

    <!-- Table -->
    <Card>
      <Table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          onChange: handlePageChange,
          showSizeChanger: true,
          showTotal: (t: number) => `共 ${t} 条`,
        }"
        row-key="id"
        :scroll="{ x: 1000 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'externalName'">
            <span>{{ record.externalName || record.externalUserid }}</span>
          </template>
          <template v-if="column.key === 'groupChatName'">
            <span>{{ record.groupChatName || '-' }}</span>
          </template>
          <template v-if="column.key === 'ruleName'">
            <Tooltip :title="getRuleTypeLabel(record.ruleType)">
              <span>{{ record.ruleName || '-' }}</span>
            </Tooltip>
          </template>
          <template v-if="column.key === 'violationType'">
            <Tag>{{ getViolationTypeLabel(record.violationType) }}</Tag>
          </template>
          <template v-if="column.key === 'action'">
            <Tag
              :color="
                record.action === 'WARN'
                  ? 'warning'
                  : record.action === 'KICK'
                    ? 'error'
                    : 'default'
              "
            >
              <WarningOutlined v-if="record.action === 'WARN'" />
              <UserDeleteOutlined v-else-if="record.action === 'KICK'" />
              <StopOutlined v-else />
              {{ getActionLabel(record.action) }}
            </Tag>
          </template>
          <template v-if="column.key === 'actionExecuted'">
            <Badge
              :status="record.actionExecuted ? 'success' : 'warning'"
              :text="record.actionExecuted ? '已处置' : '待处置'"
            />
          </template>
          <template v-if="column.key === 'occurredAt'">
            {{ formatDate(record.occurredAt) }}
          </template>
          <template v-if="column.key === 'actions'">
            <Button type="link" size="small" @click="handleViewDetail(record)">
              <EyeOutlined /> 详情
            </Button>
          </template>
        </template>
      </Table>
    </Card>

    <!-- Detail Modal -->
    <Modal
      v-model:open="detailModalVisible"
      title="违规详情"
      width="640px"
      :footer="null"
    >
      <Descriptions
        v-if="selectedRecord"
        :column="2"
        bordered
        size="small"
        class="mt-4"
      >
        <Descriptions.Item label="违规用户" :span="1">
          {{ selectedRecord.externalName || selectedRecord.externalUserid }}
        </Descriptions.Item>
        <Descriptions.Item label="所属员工" :span="1">
          {{ selectedRecord.userName || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="群聊" :span="2">
          {{ selectedRecord.groupChatName || '单聊' }}
        </Descriptions.Item>
        <Descriptions.Item label="触发规则" :span="1">
          {{ selectedRecord.ruleName || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="规则类型" :span="1">
          {{ getRuleTypeLabel(selectedRecord.ruleType) }}
        </Descriptions.Item>
        <Descriptions.Item label="违规类型" :span="1">
          <Tag>{{ getViolationTypeLabel(selectedRecord.violationType) }}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="消息类型" :span="1">
          {{ selectedRecord.messageType || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="匹配内容" :span="2">
          <Space wrap>
            <Tag
              v-for="(content, index) in selectedRecord.matchedContent"
              :key="index"
              color="red"
            >
              {{ content }}
            </Tag>
            <span v-if="!selectedRecord.matchedContent?.length">-</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="原始消息" :span="2">
          <div
            class="max-h-32 overflow-auto whitespace-pre-wrap text-sm text-gray-600"
          >
            {{ selectedRecord.originalContent || '-' }}
          </div>
        </Descriptions.Item>
        <Descriptions.Item label="处置动作" :span="1">
          <Tag
            :color="
              selectedRecord.action === 'WARN'
                ? 'warning'
                : selectedRecord.action === 'KICK'
                  ? 'error'
                  : 'default'
            "
          >
            {{ getActionLabel(selectedRecord.action) }}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="处置状态" :span="1">
          <Badge
            :status="selectedRecord.actionExecuted ? 'success' : 'warning'"
            :text="selectedRecord.actionExecuted ? '已处置' : '待处置'"
          />
        </Descriptions.Item>
        <Descriptions.Item
          v-if="selectedRecord.actionResult"
          label="处置结果"
          :span="2"
        >
          {{ selectedRecord.actionResult }}
        </Descriptions.Item>
        <Descriptions.Item
          v-if="selectedRecord.actionError"
          label="处置错误"
          :span="2"
        >
          <span class="text-red-500">{{ selectedRecord.actionError }}</span>
        </Descriptions.Item>
        <Descriptions.Item label="发生时间" :span="1">
          {{ formatDate(selectedRecord.occurredAt) }}
        </Descriptions.Item>
        <Descriptions.Item label="处置时间" :span="1">
          {{ formatDate(selectedRecord.processedAt || '') }}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  </div>
</template>
