<script setup lang="ts">
import { ref, onMounted, h, computed, watch } from 'vue';
import {
  Card,
  Row,
  Col,
  Statistic,
  Tabs,
  Table,
  Tag,
  Button,
  Progress,
  Spin,
  Empty,
  Alert,
  List,
  Avatar,
  Badge,
  Space,
  message,
  Modal,
} from 'ant-design-vue';
import {
  TeamOutlined,
  ReloadOutlined,
  TrophyOutlined,
  WarningOutlined,
  CrownOutlined,
  EyeOutlined,
  RocketOutlined,
  MailOutlined,
} from '@ant-design/icons-vue';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import type { EchartsUIType } from '@vben/plugins/echarts';
import { useRouter } from 'vue-router';

import {
  getRfmSegmentDistribution,
  getCustomersBySegment,
  recalculateRfm,
  segmentMap,
  segmentColors,
  segmentOrder,
  type RfmSegment,
  type RfmSegmentDistribution,
  type CustomerRfmProfile,
} from '#/api/marketing/rfm';

// ==================== 类型定义 ====================

defineOptions({ name: 'RfmAnalysis' });

// ==================== 状态 ====================

const router = useRouter();
const loading = ref(false);
const recalculating = ref(false);
const activeTab = ref('overview');
const segmentData = ref<RfmSegmentDistribution[]>([]);
const selectedSegment = ref<RfmSegment | null>(null);
const customerList = ref<CustomerRfmProfile[]>([]);
const customerLoading = ref(false);
const customerPagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
});

// 图表引用
const distributionChartRef = ref<EchartsUIType>();
const { renderEcharts: renderDistributionChart } = useEcharts(distributionChartRef);

// ==================== 计算属性 ====================

const totalCustomers = computed(() =>
  segmentData.value.reduce((sum, s) => sum + s.count, 0),
);

const championsCount = computed(() =>
  segmentData.value.find((s) => s.segment === 'CHAMPIONS')?.count || 0,
);

const atRiskCount = computed(() =>
  segmentData.value
    .filter((s) => ['AT_RISK', 'CANT_LOSE_THEM'].includes(s.segment))
    .reduce((sum, s) => sum + s.count, 0),
);

const loyalCount = computed(() =>
  segmentData.value
    .filter((s) => ['CHAMPIONS', 'LOYAL_CUSTOMERS'].includes(s.segment))
    .reduce((sum, s) => sum + s.count, 0),
);

// 按固定顺序排序的分层数据
const sortedSegmentData = computed(() => {
  return segmentOrder
    .map((segment) => segmentData.value.find((s) => s.segment === segment))
    .filter(Boolean) as RfmSegmentDistribution[];
});

// ==================== 表格列定义 ====================

const customerColumns = [
  {
    title: '客户',
    dataIndex: 'customerName',
    key: 'customerName',
    ellipsis: true,
  },
  {
    title: 'RFM总分',
    dataIndex: ['rfm', 'rfmScore'],
    key: 'rfmScore',
    width: 100,
    sorter: (a: CustomerRfmProfile, b: CustomerRfmProfile) =>
      a.rfm.rfmScore - b.rfm.rfmScore,
    customRender: ({ value }: { value: number }) =>
      h('span', { class: 'font-bold text-blue-600' }, value),
  },
  {
    title: 'R(最近消费)',
    key: 'recency',
    width: 120,
    customRender: ({ record }: { record: CustomerRfmProfile }) =>
      h(Space, { size: 'small' }, () => [
        h('span', {}, `${record.rfm.recencyDays}天`),
        h(
          Tag,
          { color: getScoreColor(record.rfm.recencyScore) },
          () => `${record.rfm.recencyScore}分`,
        ),
      ]),
  },
  {
    title: 'F(消费频率)',
    key: 'frequency',
    width: 120,
    customRender: ({ record }: { record: CustomerRfmProfile }) =>
      h(Space, { size: 'small' }, () => [
        h('span', {}, `${record.rfm.frequencyCount}次`),
        h(
          Tag,
          { color: getScoreColor(record.rfm.frequencyScore) },
          () => `${record.rfm.frequencyScore}分`,
        ),
      ]),
  },
  {
    title: 'M(消费金额)',
    key: 'monetary',
    width: 140,
    customRender: ({ record }: { record: CustomerRfmProfile }) =>
      h(Space, { size: 'small' }, () => [
        h('span', {}, `¥${formatMoney(record.rfm.monetaryAmount)}`),
        h(
          Tag,
          { color: getScoreColor(record.rfm.monetaryScore) },
          () => `${record.rfm.monetaryScore}分`,
        ),
      ]),
  },
  {
    title: '分层',
    dataIndex: ['rfm', 'rfmSegment'],
    key: 'segment',
    width: 120,
    customRender: ({ value }: { value: RfmSegment }) =>
      h(Tag, { color: segmentMap[value]?.color || 'default' }, () =>
        segmentMap[value]?.text || value,
      ),
  },
  {
    title: '操作',
    key: 'action',
    width: 120,
    fixed: 'right' as const,
    customRender: ({ record }: { record: CustomerRfmProfile }) =>
      h(
        Button,
        {
          type: 'link',
          size: 'small',
          onClick: () => viewCustomerDetail(record.customerId),
        },
        () => [h(EyeOutlined), ' 详情'],
      ),
  },
];

// ==================== 辅助函数 ====================

function getScoreColor(score: number): string {
  if (score >= 4) return 'green';
  if (score >= 3) return 'blue';
  if (score >= 2) return 'orange';
  return 'red';
}

function formatMoney(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(1)}万`;
  }
  return amount.toLocaleString();
}

// ==================== 数据加载 ====================

async function loadData() {
  loading.value = true;
  try {
    segmentData.value = await getRfmSegmentDistribution();
    renderDistributionChartData();
  } catch (e) {
    console.error('加载RFM数据失败', e);
    message.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

function renderDistributionChartData() {
  if (!segmentData.value.length) return;

  const data = segmentOrder
    .map((segment) => segmentData.value.find((s) => s.segment === segment))
    .filter(Boolean)
    .map((item) => ({
      name: item!.segmentLabel,
      value: item!.count,
      itemStyle: { color: item!.color || segmentColors[item!.segment] },
    }));

  renderDistributionChart({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      type: 'scroll',
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data,
      },
    ],
  });
}

async function loadCustomersBySegment(segment: RfmSegment) {
  selectedSegment.value = segment;
  customerLoading.value = true;
  try {
    const result = await getCustomersBySegment(segment, {
      page: customerPagination.value.current,
      pageSize: customerPagination.value.pageSize,
    });
    customerList.value = result.list;
    customerPagination.value.total = result.total;
  } catch (e) {
    console.error('加载客户列表失败', e);
    message.error('加载客户列表失败');
  } finally {
    customerLoading.value = false;
  }
}

function handleTableChange(pagination: any) {
  customerPagination.value.current = pagination.current;
  customerPagination.value.pageSize = pagination.pageSize;
  if (selectedSegment.value) {
    loadCustomersBySegment(selectedSegment.value);
  }
}

async function handleRecalculate() {
  Modal.confirm({
    title: '重新计算 RFM',
    content: '确定要重新计算所有客户的 RFM 分数吗？这可能需要一些时间。',
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      recalculating.value = true;
      try {
        const result = await recalculateRfm();
        message.success(`成功处理 ${result.processed} 个客户`);
        await loadData();
      } catch (e) {
        console.error('重新计算失败', e);
        message.error('重新计算失败');
      } finally {
        recalculating.value = false;
      }
    },
  });
}

function viewCustomerDetail(customerId: number) {
  router.push(`/customer/detail/${customerId}`);
}

function createCampaign(segment: RfmSegment) {
  router.push({
    path: '/marketing/campaign/create',
    query: { rfmSegment: segment },
  });
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadData();
});

// 监听 Tab 切换，加载客户列表
watch(activeTab, (newTab) => {
  if (newTab === 'customers' && !selectedSegment.value && segmentData.value.length > 0) {
    // 默认选择第一个有客户的分层
    const firstSegment = sortedSegmentData.value.find((s) => s.count > 0);
    if (firstSegment) {
      loadCustomersBySegment(firstSegment.segment);
    }
  }
});
</script>

<template>
  <div class="p-5">
    <!-- 页面头部 -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="m-0 text-xl font-bold">RFM 客户分析</h2>
        <Badge :count="totalCustomers" :overflow-count="99999" show-zero>
          <Tag color="blue">总客户</Tag>
        </Badge>
      </div>
      <Button type="primary" :loading="recalculating" @click="handleRecalculate">
        <template #icon><ReloadOutlined /></template>
        重新计算
      </Button>
    </div>

    <Spin :spinning="loading">
      <Tabs v-model:activeKey="activeTab" type="card">
        <!-- Tab 1: RFM 概览 -->
        <Tabs.TabPane key="overview" tab="RFM 概览">
          <!-- 核心指标 -->
          <Row :gutter="[16, 16]" class="mb-4">
            <Col :xs="24" :sm="12" :md="6">
              <Card>
                <Statistic title="总客户数" :value="totalCustomers">
                  <template #prefix><TeamOutlined /></template>
                </Statistic>
                <div class="mt-2 text-xs text-gray-500">
                  覆盖 {{ segmentData.length }} 个分层
                </div>
              </Card>
            </Col>
            <Col :xs="24" :sm="12" :md="6">
              <Card>
                <Statistic
                  title="最佳客户"
                  :value="championsCount"
                  :value-style="{ color: '#52c41a' }"
                >
                  <template #prefix><TrophyOutlined /></template>
                </Statistic>
                <div class="mt-2 text-xs text-green-600">
                  占比: {{ totalCustomers > 0 ? ((championsCount / totalCustomers) * 100).toFixed(1) : 0 }}%
                </div>
              </Card>
            </Col>
            <Col :xs="24" :sm="12" :md="6">
              <Card>
                <Statistic
                  title="有风险客户"
                  :value="atRiskCount"
                  :value-style="{ color: '#fa8c16' }"
                >
                  <template #prefix><WarningOutlined /></template>
                </Statistic>
                <div class="mt-2 text-xs text-orange-600">
                  需要重点关注和挽回
                </div>
              </Card>
            </Col>
            <Col :xs="24" :sm="12" :md="6">
              <Card>
                <Statistic
                  title="忠诚客户"
                  :value="loyalCount"
                  :value-style="{ color: '#1890ff' }"
                >
                  <template #prefix><CrownOutlined /></template>
                </Statistic>
                <div class="mt-2 text-xs text-blue-600">
                  最佳+忠诚客户总数
                </div>
              </Card>
            </Col>
          </Row>

          <!-- 分布图表 -->
          <Row :gutter="[16, 16]" class="mb-4">
            <Col :xs="24" :md="12">
              <Card title="RFM 分层分布" class="h-full">
                <EchartsUI
                  v-if="segmentData.length"
                  ref="distributionChartRef"
                  class="h-80"
                />
                <Empty v-else description="暂无数据" class="py-20" />
              </Card>
            </Col>
            <Col :xs="24" :md="12">
              <Card title="分层明细" class="h-full">
                <Table
                  :data-source="sortedSegmentData"
                  :pagination="false"
                  size="small"
                  row-key="segment"
                  :scroll="{ y: 320 }"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'segment'">
                      <Tag :color="record.color || segmentColors[record.segment as RfmSegment]">
                        {{ record.segmentLabel }}
                      </Tag>
                    </template>
                    <template v-if="column.key === 'count'">
                      <span class="font-medium">{{ record.count }}</span>
                    </template>
                    <template v-if="column.key === 'percentage'">
                      <Progress :percent="record.percentage" size="small" />
                    </template>
                  </template>
                </Table>
              </Card>
            </Col>
          </Row>

          <!-- 分层卡片 -->
          <Row :gutter="[16, 16]">
            <Col
              v-for="item in sortedSegmentData"
              :key="item.segment"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="6"
            >
              <Card
                size="small"
                class="cursor-pointer transition-shadow hover:shadow-md"
                :style="{ borderTop: `3px solid ${item.color || segmentColors[item.segment as RfmSegment]}` }"
                @click="activeTab = 'customers'; loadCustomersBySegment(item.segment);"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-sm text-gray-500">{{ item.segmentLabel }}</div>
                    <div class="text-2xl font-bold">{{ item.count }}</div>
                    <div class="text-xs text-gray-400">
                      占比 {{ item.percentage }}% · 均分 {{ item.avgRfmScore }}
                    </div>
                  </div>
                  <Avatar
                    :style="{
                      backgroundColor: item.color || segmentColors[item.segment],
                    }"
                    :icon="h(TeamOutlined)"
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <!-- Tab 2: 客户分层明细 -->
        <Tabs.TabPane key="customers" tab="客户分层明细">
          <Row :gutter="[16, 16]">
            <!-- 左侧分层选择 -->
            <Col :xs="24" :md="6">
              <Card title="选择分层" class="h-full">
                <List
                  :data-source="sortedSegmentData"
                  size="small"
                >
                  <template #renderItem="{ item }">
                    <List.Item
                      :class="[
                        'cursor-pointer transition-colors hover:bg-gray-50',
                        selectedSegment === item.segment ? 'bg-blue-50' : '',
                      ]"
                      @click="loadCustomersBySegment(item.segment)"
                    >
                      <div class="flex w-full items-center justify-between">
                        <Space>
                          <Badge
                            :color="item.color || segmentColors[item.segment as RfmSegment]"
                            :text="item.segmentLabel"
                          />
                        </Space>
                        <Tag>{{ item.count }}</Tag>
                      </div>
                    </List.Item>
                  </template>
                </List>
              </Card>
            </Col>

            <!-- 右侧客户列表 -->
            <Col :xs="24" :md="18">
              <Card
                :title="selectedSegment ? segmentMap[selectedSegment]?.text + ' 客户列表' : '请选择分层'"
              >
                <template v-if="selectedSegment" #extra>
                  <Button
                    type="primary"
                    size="small"
                    @click="createCampaign(selectedSegment)"
                  >
                    <template #icon><RocketOutlined /></template>
                    创建营销活动
                  </Button>
                </template>

                <Table
                  v-if="selectedSegment"
                  :data-source="customerList"
                  :columns="customerColumns"
                  :loading="customerLoading"
                  :pagination="{
                    ...customerPagination,
                    showSizeChanger: true,
                    showTotal: (total: number) => `共 ${total} 条`,
                  }"
                  row-key="customerId"
                  size="small"
                  @change="handleTableChange"
                />
                <Empty
                  v-else
                  description="请在左侧选择一个分层查看客户"
                  class="py-20"
                />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <!-- Tab 3: 营销建议 -->
        <Tabs.TabPane key="strategy" tab="营销建议">
          <Alert
            message="RFM 分层营销策略"
            description="根据客户的 RFM 分层，制定针对性的营销策略，提高客户价值和留存率。"
            type="info"
            show-icon
            class="mb-4"
          />

          <Row :gutter="[16, 16]">
            <Col
              v-for="segment in segmentOrder"
              :key="segment"
              :xs="24"
              :sm="12"
              :lg="8"
            >
              <Card
                class="h-full"
                :style="{ borderTop: `3px solid ${segmentColors[segment]}` }"
              >
                <template #title>
                  <Space>
                    <Avatar
                      :style="{ backgroundColor: segmentColors[segment] }"
                      size="small"
                    >
                      {{ segmentMap[segment].text.charAt(0) }}
                    </Avatar>
                    <span>{{ segmentMap[segment].text }}</span>
                    <Tag :color="segmentMap[segment].color">
                      {{ segmentData.find(s => s.segment === segment)?.count || 0 }} 人
                    </Tag>
                  </Space>
                </template>

                <template #extra>
                  <Button
                    type="link"
                    size="small"
                    @click="activeTab = 'customers'; loadCustomersBySegment(segment);"
                  >
                    查看客户
                  </Button>
                </template>

                <div class="space-y-3">
                  <div>
                    <div class="mb-1 text-sm font-medium text-gray-500">客户特征</div>
                    <div class="text-sm">{{ segmentMap[segment].description }}</div>
                  </div>

                  <div>
                    <div class="mb-1 text-sm font-medium text-gray-500">营销策略</div>
                    <div class="text-sm">{{ segmentMap[segment].strategy }}</div>
                  </div>

                  <div class="pt-2">
                    <Space>
                      <Button
                        size="small"
                        @click="createCampaign(segment)"
                      >
                        <template #icon><RocketOutlined /></template>
                        创建活动
                      </Button>
                      <Button
                        size="small"
                        @click="activeTab = 'customers'; loadCustomersBySegment(segment);"
                      >
                        <template #icon><MailOutlined /></template>
                        发送消息
                      </Button>
                    </Space>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <!-- Tab 4: RFM 说明 -->
        <Tabs.TabPane key="about" tab="RFM 说明">
          <Row :gutter="[16, 16]">
            <Col :xs="24" :md="12">
              <Card title="什么是 RFM 模型？">
                <p class="mb-4">
                  RFM 模型是客户关系管理中最经典的分析模型之一，通过三个维度对客户进行分层：
                </p>
                <List>
                  <List.Item>
                    <List.Item.Meta>
                      <template #title>
                        <Space>
                          <Avatar style="background-color: #1890ff">R</Avatar>
                          <span>Recency (最近消费)</span>
                        </Space>
                      </template>
                      <template #description>
                        客户最近一次消费距离现在的天数。天数越小，客户越活跃。
                        评分 1-5 分，5 分表示最近 7 天内有消费。
                      </template>
                    </List.Item.Meta>
                  </List.Item>
                  <List.Item>
                    <List.Item.Meta>
                      <template #title>
                        <Space>
                          <Avatar style="background-color: #52c41a">F</Avatar>
                          <span>Frequency (消费频率)</span>
                        </Space>
                      </template>
                      <template #description>
                        客户在分析周期内的消费次数。次数越多，客户忠诚度越高。
                        评分 1-5 分，5 分表示年消费 20 次以上。
                      </template>
                    </List.Item.Meta>
                  </List.Item>
                  <List.Item>
                    <List.Item.Meta>
                      <template #title>
                        <Space>
                          <Avatar style="background-color: #fa8c16">M</Avatar>
                          <span>Monetary (消费金额)</span>
                        </Space>
                      </template>
                      <template #description>
                        客户在分析周期内的消费总金额。金额越高，客户价值越大。
                        评分 1-5 分，5 分表示年消费 5 万元以上。
                      </template>
                    </List.Item.Meta>
                  </List.Item>
                </List>
              </Card>
            </Col>

            <Col :xs="24" :md="12">
              <Card title="评分规则">
                <Table
                  :data-source="[
                    { dim: 'R (最近消费)', s5: '0-7天', s4: '8-30天', s3: '31-60天', s2: '61-90天', s1: '>90天' },
                    { dim: 'F (消费频率)', s5: '≥20次', s4: '10-19次', s3: '5-9次', s2: '2-4次', s1: '0-1次' },
                    { dim: 'M (消费金额)', s5: '≥5万', s4: '2-5万', s3: '5千-2万', s2: '1千-5千', s1: '<1千' },
                  ]"
                  :pagination="false"
                  size="small"
                >
                  <template #bodyCell="{ column, text }">
                    <Tag v-if="typeof column.key === 'string' && column.key.startsWith('s')" :color="getScoreColor(parseInt(column.key.slice(1)))">
                      {{ text }}
                    </Tag>
                    <span v-else>{{ text }}</span>
                  </template>
                </Table>

                <Alert
                  message="RFM 总分计算"
                  description="RFM 总分 = R×100 + F×10 + M，范围 111-555。根据 RFM 组合将客户分为 11 个分层。"
                  type="info"
                  show-icon
                  class="mt-4"
                />
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>
      </Tabs>
    </Spin>
  </div>
</template>
