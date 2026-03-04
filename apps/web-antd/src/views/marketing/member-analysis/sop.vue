<script lang="ts" setup>
import { ref, computed, onMounted, h } from 'vue';
import {
  Card,
  Row,
  Col,
  Tabs,
  TabPane,
  Table,
  Button,
  Space,
  Tag,
  Progress,
  Drawer,
  Timeline,
  TimelineItem,
  Select,
  Input,
  InputSearch,
  Modal,
  message,
  Spin,
  Empty,
  Avatar,
  Popconfirm,
} from 'ant-design-vue';
import {
  RocketOutlined,
  CrownOutlined,
  UserOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  RedoOutlined,
  StepForwardOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons-vue';
import { useCrudTable } from '#/composables';
import {
  getSopStats,
  startCustomerSop,
  getCustomerSopProgress,
  type SopStats,
  type CustomerSopProgress,
} from '#/api/crm/retail';
import { getCustomers } from '#/api/crm';
import dayjs from 'dayjs';

defineOptions({ name: 'SopManagement' });

// ==================== Constants ====================

const SOP_TYPES = [
  { value: 'WELCOME_NEW_MEMBER', label: '新会员欢迎 SOP', color: 'blue', icon: RocketOutlined },
  { value: 'VIP_UPGRADE', label: 'VIP 升级 SOP', color: 'gold', icon: CrownOutlined },
] as const;

const SOP_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待开始', color: 'default' },
  { value: 'in_progress', label: '进行中', color: 'blue' },
  { value: 'completed', label: '已完成', color: 'green' },
  { value: 'skipped', label: '已跳过', color: 'red' },
];

// ==================== State ====================

const activeTab = ref('overview');
const loadingStats = ref(false);
const welcomeSopStats = ref<SopStats | null>(null);
const vipSopStats = ref<SopStats | null>(null);

// Detail drawer state
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailCustomer = ref<{
  id: number;
  name: string;
  avatar?: string;
  customerLevel?: string;
} | null>(null);
const detailProgress = ref<CustomerSopProgress | null>(null);

// Batch start modal state
const batchModalVisible = ref(false);
const batchModalLoading = ref(false);
const selectedCustomers = ref<number[]>([]);
const selectedSopCode = ref<string>('WELCOME_NEW_MEMBER');

// ==================== Computed ====================

const sopStatsMap = computed(() => ({
  WELCOME_NEW_MEMBER: welcomeSopStats.value,
  VIP_UPGRADE: vipSopStats.value,
}));

// ==================== Types ====================

interface CustomerSopItem {
  id: number;
  name: string;
  avatar?: string;
  customerLevel: string;
  sopType: string;
  sopStatus: string;
  currentStep: number;
  totalSteps: number;
  startedAt?: string;
  updatedAt?: string;
}

interface CustomerSopFilters {
  keyword?: string;
  sopType?: string;
  sopStatus?: string;
}

// ==================== Helper Functions ====================

function getSopTypeLabel(code: string) {
  return SOP_TYPES.find(t => t.value === code)?.label || code;
}

function getSopTypeColor(code: string) {
  return SOP_TYPES.find(t => t.value === code)?.color || 'default';
}

function getSopStatusLabel(status: string) {
  return SOP_STATUS_OPTIONS.find(o => o.value === status)?.label || status;
}

function getSopStatusColor(status: string) {
  return SOP_STATUS_OPTIONS.find(o => o.value === status)?.color || 'default';
}

function getSopStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return CheckCircleOutlined;
    case 'in_progress':
      return ClockCircleOutlined;
    case 'skipped':
      return CloseCircleOutlined;
    default:
      return MinusCircleOutlined;
  }
}

// ==================== API Functions ====================

async function fetchSopStats() {
  loadingStats.value = true;
  try {
    const [welcome, vip] = await Promise.all([
      getSopStats('WELCOME_NEW_MEMBER'),
      getSopStats('VIP_UPGRADE'),
    ]);
    welcomeSopStats.value = welcome;
    vipSopStats.value = vip;
  } catch (error) {
    message.error('获取 SOP 统计失败');
    console.error(error);
  } finally {
    loadingStats.value = false;
  }
}

// ==================== Table Configuration ====================

const columns = [
  {
    title: '客户',
    key: 'customer',
    width: 220,
    fixed: 'left' as const,
  },
  {
    title: 'SOP 类型',
    dataIndex: 'sopType',
    key: 'sopType',
    width: 150,
    customRender: ({ text }: { text: string }) => {
      const config = SOP_TYPES.find(t => t.value === text);
      return h(
        Tag,
        { color: config?.color || 'default' },
        () => [h(config?.icon || RocketOutlined, { style: { marginRight: '4px' } }), config?.label || text],
      );
    },
  },
  {
    title: '状态',
    dataIndex: 'sopStatus',
    key: 'sopStatus',
    width: 100,
    customRender: ({ text }: { text: string }) => {
      const config = SOP_STATUS_OPTIONS.find(o => o.value === text);
      return h(
        Tag,
        { color: config?.color || 'default' },
        () => config?.label || text,
      );
    },
  },
  {
    title: '进度',
    key: 'progress',
    width: 150,
    customRender: ({ record }: { record: CustomerSopItem }) => {
      const percent = record.totalSteps > 0
        ? Math.round((record.currentStep / record.totalSteps) * 100)
        : 0;
      return h('div', {}, [
        h(Progress, {
          percent,
          size: 'small',
          style: { width: '100px', display: 'inline-block', marginRight: '8px' },
        }),
        h('span', { style: { fontSize: '12px' } }, `${record.currentStep}/${record.totalSteps}`),
      ]);
    },
  },
  {
    title: '开始时间',
    dataIndex: 'startedAt',
    key: 'startedAt',
    width: 150,
    customRender: ({ text }: { text: string }) =>
      text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 150,
    customRender: ({ text }: { text: string }) =>
      text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
    fixed: 'right' as const,
  },
];

// ==================== Table Logic ====================

const {
  tableProps,
  filters,
  loading: tableLoading,
  dataSource,
  search,
  resetFilters,
  fetchData,
} = useCrudTable<CustomerSopItem, CustomerSopFilters>({
  fetchApi: async (params) => {
    // First get customers
    const response = await getCustomers({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
    });

    // Then fetch SOP progress for each customer
    const itemsWithSop = await Promise.all(
      response.items.map(async (customer) => {
        try {
          const progress = await getCustomerSopProgress(customer.id.toString());
          // Get the first SOP progress or default
          const sopEntries = Object.entries(progress.sopProgress || {});
          const [sopCode, sopData] = sopEntries[0] || ['', null];

          return {
            id: customer.id,
            name: customer.name,
            avatar: customer.avatar,
            customerLevel: customer.customerLevel,
            sopType: sopCode || 'WELCOME_NEW_MEMBER',
            sopStatus: (sopData as { status?: string })?.status || 'pending',
            currentStep: (sopData as { currentStep?: number })?.currentStep || 0,
            totalSteps: 4, // Default total steps
            startedAt: (sopData as { startedAt?: string })?.startedAt,
            updatedAt: (sopData as { updatedAt?: string })?.updatedAt,
          };
        } catch {
          // Return default if no SOP progress
          return {
            id: customer.id,
            name: customer.name,
            avatar: customer.avatar,
            customerLevel: customer.customerLevel,
            sopType: 'WELCOME_NEW_MEMBER',
            sopStatus: 'pending',
            currentStep: 0,
            totalSteps: 4,
            startedAt: undefined,
            updatedAt: undefined,
          };
        }
      }),
    );

    // Filter by SOP type and status if specified
    let filteredItems = itemsWithSop;
    if (params.sopType) {
      filteredItems = filteredItems.filter(item => item.sopType === params.sopType);
    }
    if (params.sopStatus) {
      filteredItems = filteredItems.filter(item => item.sopStatus === params.sopStatus);
    }

    return {
      items: filteredItems,
      total: response.total,
    };
  },
  defaultPageSize: 10,
});

// ==================== Event Handlers ====================

function handleSearch(value: string) {
  filters.value.keyword = value;
  search();
}

function handleFilter() {
  search();
}

function handleReset() {
  filters.value = {};
  resetFilters();
}

async function handleViewDetail(record: CustomerSopItem) {
  detailVisible.value = true;
  detailLoading.value = true;
  detailCustomer.value = {
    id: record.id,
    name: record.name,
    avatar: record.avatar,
    customerLevel: record.customerLevel,
  };

  try {
    const progress = await getCustomerSopProgress(record.id.toString());
    detailProgress.value = progress;
  } catch (error) {
    message.error('获取 SOP 进度失败');
    console.error(error);
  } finally {
    detailLoading.value = false;
  }
}

async function handleBatchStart() {
  if (selectedCustomers.value.length === 0) {
    message.warning('请选择至少一个客户');
    return;
  }
  batchModalVisible.value = true;
}

async function confirmBatchStart() {
  batchModalLoading.value = true;
  try {
    await startCustomerSop({
      customerIds: selectedCustomers.value.map(id => id.toString()),
      sopCode: selectedSopCode.value,
    });
    message.success('SOP 启动成功');
    batchModalVisible.value = false;
    selectedCustomers.value = [];
    fetchData();
    fetchSopStats();
  } catch (error) {
    message.error('启动 SOP 失败');
    console.error(error);
  } finally {
    batchModalLoading.value = false;
  }
}

function handleSelectionChange(selectedRowKeys: number[]) {
  selectedCustomers.value = selectedRowKeys;
}

function getTimelineItems(sopCode: string, progress: Record<string, unknown>) {
  const steps = [
    { title: '欢迎消息', description: '发送欢迎消息和介绍' },
    { title: '优惠券发放', description: '发放新人优惠券' },
    { title: '首单引导', description: '引导完成首次购买' },
    { title: '满意度调查', description: '收集客户反馈' },
  ];

  const sopData = progress[sopCode] as {
    status?: string;
    currentStep?: number;
    startedAt?: string;
    completedAt?: string;
  } | undefined;

  const currentStep = sopData?.currentStep || 0;
  const status = sopData?.status || 'pending';

  return steps.map((step, index) => {
    const stepNum = index + 1;
    let itemStatus: 'finish' | 'process' | 'wait' = 'wait';
    let dot = h(MinusCircleOutlined);

    if (status === 'completed') {
      itemStatus = 'finish';
      dot = h(CheckCircleOutlined, { style: { color: '#52c41a' } });
    } else if (stepNum < currentStep) {
      itemStatus = 'finish';
      dot = h(CheckCircleOutlined, { style: { color: '#52c41a' } });
    } else if (stepNum === currentStep && status === 'in_progress') {
      itemStatus = 'process';
      dot = h(ClockCircleOutlined, { style: { color: '#1890ff' } });
    }

    return {
      label: `步骤 ${stepNum}`,
      children: h('div', {}, [
        h('div', { style: { fontWeight: 500 } }, step.title),
        h('div', { style: { fontSize: '12px', color: '#999' } }, step.description),
      ]),
      color: itemStatus === 'finish' ? '#52c41a' : itemStatus === 'process' ? '#1890ff' : undefined,
      dot,
    };
  });
}

// ==================== Lifecycle ====================

onMounted(() => {
  fetchSopStats();
});
</script>

<template>
  <div class="sop-management">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h2>SOP 管理</h2>
        <p>标准操作流程自动化管理 - 新会员欢迎、VIP 升级等营销流程</p>
      </div>
      <Button
        type="primary"
        :disabled="selectedCustomers.length === 0"
        @click="handleBatchStart"
      >
        <template #icon><PlayCircleOutlined /></template>
        批量启动 SOP ({{ selectedCustomers.length }})
      </Button>
    </div>

    <!-- Tabs -->
    <Tabs v-model:active-key="activeTab" class="sop-tabs">
      <!-- Tab 1: SOP Overview -->
      <TabPane key="overview" tab="SOP 概览">
        <Spin :spinning="loadingStats">
          <Row :gutter="[16, 16]">
            <!-- Welcome New Member SOP Card -->
            <Col :xs="24" :lg="12">
              <Card class="sop-card">
                <div class="sop-card-header">
                  <div class="sop-title">
                    <RocketOutlined class="sop-icon" style="color: #1890ff;" />
                    <div>
                      <h4>新会员欢迎 SOP</h4>
                      <p class="sop-desc">自动欢迎新注册会员，发放优惠券并引导首单</p>
                    </div>
                  </div>
                  <Tag color="blue" size="large">
                    {{ welcomeSopStats?.totalCustomers || 0 }} 人
                  </Tag>
                </div>

                <div v-if="welcomeSopStats" class="sop-stats">
                  <div class="progress-item">
                    <span class="label">进行中</span>
                    <Progress
                      :percent="welcomeSopStats.totalCustomers > 0
                        ? (welcomeSopStats.inProgress / welcomeSopStats.totalCustomers) * 100
                        : 0"
                      :show-info="false"
                      stroke-color="#1890ff"
                    />
                    <span class="value">{{ welcomeSopStats.inProgress }}</span>
                  </div>
                  <div class="progress-item">
                    <span class="label">已完成</span>
                    <Progress
                      :percent="welcomeSopStats.totalCustomers > 0
                        ? (welcomeSopStats.completed / welcomeSopStats.totalCustomers) * 100
                        : 0"
                      :show-info="false"
                      stroke-color="#52c41a"
                    />
                    <span class="value">{{ welcomeSopStats.completed }}</span>
                  </div>
                  <div class="progress-item">
                    <span class="label">已跳过</span>
                    <Progress
                      :percent="welcomeSopStats.totalCustomers > 0
                        ? (welcomeSopStats.abandoned / welcomeSopStats.totalCustomers) * 100
                        : 0"
                      :show-info="false"
                      stroke-color="#ff4d4f"
                    />
                    <span class="value">{{ welcomeSopStats.abandoned }}</span>
                  </div>
                </div>

                <div class="sop-footer">
                  <Tag color="green">
                    完成率: {{ welcomeSopStats?.completionRate?.toFixed(1) || 0 }}%
                  </Tag>
                </div>
              </Card>
            </Col>

            <!-- VIP Upgrade SOP Card -->
            <Col :xs="24" :lg="12">
              <Card class="sop-card">
                <div class="sop-card-header">
                  <div class="sop-title">
                    <CrownOutlined class="sop-icon" style="color: #faad14;" />
                    <div>
                      <h4>VIP 升级 SOP</h4>
                      <p class="sop-desc">引导高价值客户升级 VIP，享受专属权益</p>
                    </div>
                  </div>
                  <Tag color="gold" size="large">
                    {{ vipSopStats?.totalCustomers || 0 }} 人
                  </Tag>
                </div>

                <div v-if="vipSopStats" class="sop-stats">
                  <div class="progress-item">
                    <span class="label">进行中</span>
                    <Progress
                      :percent="vipSopStats.totalCustomers > 0
                        ? (vipSopStats.inProgress / vipSopStats.totalCustomers) * 100
                        : 0"
                      :show-info="false"
                      stroke-color="#1890ff"
                    />
                    <span class="value">{{ vipSopStats.inProgress }}</span>
                  </div>
                  <div class="progress-item">
                    <span class="label">已完成</span>
                    <Progress
                      :percent="vipSopStats.totalCustomers > 0
                        ? (vipSopStats.completed / vipSopStats.totalCustomers) * 100
                        : 0"
                      :show-info="false"
                      stroke-color="#52c41a"
                    />
                    <span class="value">{{ vipSopStats.completed }}</span>
                  </div>
                  <div class="progress-item">
                    <span class="label">已跳过</span>
                    <Progress
                      :percent="vipSopStats.totalCustomers > 0
                        ? (vipSopStats.abandoned / vipSopStats.totalCustomers) * 100
                        : 0"
                      :show-info="false"
                      stroke-color="#ff4d4f"
                    />
                    <span class="value">{{ vipSopStats.abandoned }}</span>
                  </div>
                </div>

                <div class="sop-footer">
                  <Tag color="green">
                    完成率: {{ vipSopStats?.completionRate?.toFixed(1) || 0 }}%
                  </Tag>
                </div>
              </Card>
            </Col>
          </Row>

          <!-- SOP Description Cards -->
          <Row :gutter="[16, 16]" class="mt-4">
            <Col :span="24">
              <Card title="SOP 流程说明">
                <Row :gutter="[24, 16]">
                  <Col :xs="24" :md="12">
                    <div class="sop-steps">
                      <h5><RocketOutlined /> 新会员欢迎 SOP 流程</h5>
                      <Timeline>
                        <TimelineItem color="green">
                          <p><strong>步骤 1:</strong> 发送欢迎消息</p>
                          <p class="step-desc">自动发送个性化欢迎语，介绍品牌和服务</p>
                        </TimelineItem>
                        <TimelineItem color="blue">
                          <p><strong>步骤 2:</strong> 优惠券发放</p>
                          <p class="step-desc">发放新人专属优惠券，促进首次购买</p>
                        </TimelineItem>
                        <TimelineItem color="blue">
                          <p><strong>步骤 3:</strong> 首单引导</p>
                          <p class="step-desc">推荐热门商品，引导完成首次订单</p>
                        </TimelineItem>
                        <TimelineItem>
                          <p><strong>步骤 4:</strong> 满意度调查</p>
                          <p class="step-desc">收集购物体验反馈，持续优化服务</p>
                        </TimelineItem>
                      </Timeline>
                    </div>
                  </Col>
                  <Col :xs="24" :md="12">
                    <div class="sop-steps">
                      <h5><CrownOutlined /> VIP 升级 SOP 流程</h5>
                      <Timeline>
                        <TimelineItem color="green">
                          <p><strong>步骤 1:</strong> VIP 权益介绍</p>
                          <p class="step-desc">详细介绍 VIP 专属权益和优惠</p>
                        </TimelineItem>
                        <TimelineItem color="blue">
                          <p><strong>步骤 2:</strong> 升级引导</p>
                          <p class="step-desc">说明升级条件和流程，降低门槛</p>
                        </TimelineItem>
                        <TimelineItem color="blue">
                          <p><strong>步骤 3:</strong> 专属福利</p>
                          <p class="step-desc">提供限时升级福利，增加吸引力</p>
                        </TimelineItem>
                        <TimelineItem>
                          <p><strong>步骤 4:</strong> 持续关怀</p>
                          <p class="step-desc">升级后持续跟进，提升留存</p>
                        </TimelineItem>
                      </Timeline>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </Spin>
      </TabPane>

      <!-- Tab 2: Customer SOP Management -->
      <TabPane key="management" tab="客户 SOP 管理">
        <!-- Filter Area -->
        <Card class="mb-4" size="small">
          <div class="filter-area">
            <InputSearch
              v-model:value="filters.keyword"
              placeholder="搜索客户名称"
              style="width: 200px"
              allow-clear
              @search="handleSearch"
            />
            <Select
              v-model:value="filters.sopType"
              :options="[{ value: '', label: '全部 SOP 类型' }, ...SOP_TYPES.map(t => ({ value: t.value, label: t.label }))]"
              placeholder="SOP 类型"
              style="width: 160px"
              allow-clear
            />
            <Select
              v-model:value="filters.sopStatus"
              :options="SOP_STATUS_OPTIONS"
              placeholder="状态"
              style="width: 120px"
              allow-clear
            />
            <Button type="primary" @click="handleFilter">筛选</Button>
            <Button @click="handleReset">重置</Button>
          </div>
        </Card>

        <!-- Table -->
        <Table
          v-bind="tableProps"
          :columns="columns"
          :scroll="{ x: 1200 }"
          :row-selection="{
            selectedRowKeys: selectedCustomers,
            onChange: handleSelectionChange,
          }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'customer'">
              <div class="customer-cell">
                <Avatar
                  v-if="record.avatar"
                  :src="record.avatar"
                  :size="40"
                />
                <Avatar v-else :size="40">
                  <template #icon><UserOutlined /></template>
                </Avatar>
                <div class="customer-info">
                  <div class="customer-name">{{ record.name }}</div>
                  <Tag size="small" color="default">{{ record.customerLevel }}</Tag>
                </div>
              </div>
            </template>
            <template v-if="column.key === 'action'">
              <Space>
                <Button
                  type="link"
                  size="small"
                  @click="handleViewDetail(record as CustomerSopItem)"
                >
                  <template #icon><EyeOutlined /></template>
                  详情
                </Button>
                <Popconfirm
                  title="确定要重置该客户的 SOP 进度吗？"
                  @confirm="message.info('重置功能开发中')"
                >
                  <Button type="link" size="small">
                    <template #icon><RedoOutlined /></template>
                    重置
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="确定要跳过当前 SOP 吗？"
                  @confirm="message.info('跳过功能开发中')"
                >
                  <Button type="link" size="small" danger>
                    <template #icon><StepForwardOutlined /></template>
                    跳过
                  </Button>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </TabPane>
    </Tabs>

    <!-- Customer SOP Detail Drawer -->
    <Drawer
      v-model:open="detailVisible"
      title="客户 SOP 详情"
      width="600"
      placement="right"
    >
      <Spin :spinning="detailLoading">
        <div v-if="detailCustomer" class="detail-content">
          <!-- Customer Info -->
          <div class="detail-header">
            <Avatar
              v-if="detailCustomer.avatar"
              :src="detailCustomer.avatar"
              :size="64"
            />
            <Avatar v-else :size="64">
              <template #icon><UserOutlined /></template>
            </Avatar>
            <div class="detail-info">
              <h3>{{ detailCustomer.name }}</h3>
              <Tag color="blue">{{ detailCustomer.customerLevel }}</Tag>
            </div>
          </div>

          <!-- SOP Progress Timeline -->
          <div v-if="detailProgress" class="detail-timeline">
            <h4>SOP 进度</h4>
            <div
              v-for="sopType in SOP_TYPES"
              :key="sopType.value"
              class="sop-timeline-section"
            >
              <div class="sop-timeline-header">
                <Tag :color="sopType.color">
                  <component :is="sopType.icon" />
                  {{ sopType.label }}
                </Tag>
                <Tag :color="getSopStatusColor(
                  (detailProgress.sopProgress?.[sopType.value] as { status?: string })?.status || 'pending'
                )">
                  {{ getSopStatusLabel(
                    (detailProgress.sopProgress?.[sopType.value] as { status?: string })?.status || 'pending'
                  ) }}
                </Tag>
              </div>
              <Timeline class="mt-3">
                <TimelineItem
                  v-for="(item, index) in getTimelineItems(sopType.value, detailProgress.sopProgress || {})"
                  :key="index"
                  :color="item.color"
                >
                  <template #dot>{{ item.dot }}</template>
                  <div v-html="item.children" />
                </TimelineItem>
              </Timeline>
            </div>
          </div>

          <Empty v-else description="暂无 SOP 数据" />
        </div>
      </Spin>
    </Drawer>

    <!-- Batch Start Modal -->
    <Modal
      v-model:open="batchModalVisible"
      title="批量启动 SOP"
      @ok="confirmBatchStart"
      :confirm-loading="batchModalLoading"
    >
      <div class="batch-modal-content">
        <p>已选择 {{ selectedCustomers.length }} 个客户</p>
        <div class="form-item">
          <label>选择 SOP 类型：</label>
          <Select
            v-model:value="selectedSopCode"
            style="width: 100%"
            :options="SOP_TYPES.map(t => ({ value: t.value, label: t.label }))"
          />
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped lang="less">
.sop-management {
  padding: 16px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    h2 {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    p {
      color: rgba(0, 0, 0, 0.45);
      margin: 0;
    }
  }

  .sop-tabs {
    :deep(.ant-tabs-content) {
      padding-top: 16px;
    }
  }

  .sop-card {
    height: 100%;

    .sop-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;

      .sop-title {
        display: flex;
        align-items: flex-start;
        gap: 12px;

        .sop-icon {
          font-size: 32px;
          padding: 8px;
          background: #f5f5f5;
          border-radius: 8px;
        }

        h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .sop-desc {
          margin: 0;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.45);
        }
      }
    }

    .sop-stats {
      .progress-item {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;

        &:last-child {
          margin-bottom: 0;
        }

        .label {
          width: 60px;
          font-size: 13px;
          color: rgba(0, 0, 0, 0.65);
        }

        .value {
          width: 40px;
          text-align: right;
          font-size: 13px;
          font-weight: 500;
        }

        :deep(.ant-progress) {
          flex: 1;
        }
      }
    }

    .sop-footer {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
    }
  }

  .sop-steps {
    h5 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .step-desc {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
      margin: 4px 0 0 0;
    }
  }

  .filter-area {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }

  .customer-cell {
    display: flex;
    align-items: center;
    gap: 12px;

    .customer-info {
      .customer-name {
        font-weight: 500;
        margin-bottom: 4px;
      }
    }
  }

  .detail-content {
    .detail-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-bottom: 24px;
      margin-bottom: 24px;
      border-bottom: 1px solid #f0f0f0;

      .detail-info {
        h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
        }
      }
    }

    .detail-timeline {
      h4 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
      }

      .sop-timeline-section {
        margin-bottom: 24px;

        .sop-timeline-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
      }
    }
  }

  .batch-modal-content {
    padding: 16px 0;

    p {
      margin-bottom: 16px;
      color: rgba(0, 0, 0, 0.65);
    }

    .form-item {
      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
      }
    }
  }

  .mt-4 {
    margin-top: 16px;
  }

  .mt-3 {
    margin-top: 12px;
  }

  .mb-4 {
    margin-bottom: 16px;
  }
}
</style>
