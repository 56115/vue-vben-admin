<script lang="ts" setup>
import { ref, computed, onMounted, h } from 'vue';
import {
  Card,
  Row,
  Col,
  Table,
  Progress,
  Select,
  Tag,
  Button,
  Statistic,
  message,
} from 'ant-design-vue';
import {
  ReloadOutlined,
  UserOutlined,
  RiseOutlined,
  TeamOutlined,
  WarningOutlined,
  StarOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';

import {
  StatisticCardRow,
  RankingTable,
  StatisticsPageLayout,
  type StatisticItem,
  type RankingColumn,
} from '#/components/statistics';

// ==================== 类型定义 ====================

interface StatisticsOverview {
  totalCustomers: number;
  newCustomersToday: number;
  newCustomersWeek: number;
  newCustomersMonth: number;
  activeCustomers: number;
  inactiveCustomers: number;
  unassignedCustomers: number;
  highValueCustomers: number;
  atRiskCustomers: number;
  avgProfileCompleteness: number;
  byStatus: Array<{ status: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
  byLevel: Array<{ level: string; count: number }>;
  topOwners: Array<{
    ownerId: number;
    ownerName: string | null;
    customerCount: number;
  }>;
  channelDistribution: Array<{ channel: string; count: number }>;
}

interface GrowthTrend {
  date: string;
  newCustomers: number;
  totalCustomers: number;
  growthRate: number;
}

interface RegionDistribution {
  province: string;
  city: string | null;
  count: number;
  percentage: number;
}

interface ValueAnalysis {
  totalValue: number;
  avgOrderValue: number;
  avgOrderCount: number;
  topCustomers: Array<{
    id: number;
    name: string;
    totalAmount: number;
    orderCount: number;
    level: string;
  }>;
  valueDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

interface OwnerRanking {
  ownerId: number;
  ownerName: string | null;
  totalCustomers: number;
  newCustomersWeek: number;
  highValueCount: number;
  avgProfileCompleteness: number;
}

// ==================== 状态 ====================

const loading = ref(false);
const overview = ref<StatisticsOverview | null>(null);
const growthTrend = ref<GrowthTrend[]>([]);
const regionDistribution = ref<RegionDistribution[]>([]);
const valueAnalysis = ref<ValueAnalysis | null>(null);
const ownerRanking = ref<OwnerRanking[]>([]);
const growthPeriod = ref<'week' | 'month' | 'quarter'>('month');
const rankingPeriod = ref<'week' | 'month'>('month');

// ==================== 映射 ====================

const statusMap: Record<string, { label: string; color: string }> = {
  LEAD: { label: '线索', color: 'blue' },
  POTENTIAL: { label: '潜在客户', color: 'cyan' },
  CUSTOMER: { label: '正式客户', color: 'green' },
  CHURNED: { label: '流失客户', color: 'red' },
  BLACKLIST: { label: '黑名单', color: 'default' },
};

const sourceMap: Record<string, { label: string; color: string }> = {
  WECOM: { label: '企业微信', color: 'green' },
  DOUYIN: { label: '抖音', color: 'magenta' },
  XHS: { label: '小红书', color: 'red' },
  MANUAL: { label: '手动录入', color: 'blue' },
  IMPORT: { label: '批量导入', color: 'purple' },
  API: { label: 'API同步', color: 'cyan' },
};

const levelMap: Record<string, { label: string; color: string }> = {
  NORMAL: { label: '普通', color: 'default' },
  POTENTIAL: { label: '潜在', color: 'cyan' },
  IMPORTANT: { label: '重要', color: 'gold' },
  VIP: { label: 'VIP', color: 'orange' },
  INACTIVE: { label: '不活跃', color: 'default' },
};

const channelMap: Record<string, string> = {
  WECOM: '企业微信',
  DOUYIN: '抖音',
  XHS: '小红书',
  MANUAL: '手动录入',
};

// ==================== 统计卡片配置 ====================

const overviewCards1 = computed<StatisticItem[]>(() => [
  {
    title: '客户总数',
    value: overview.value?.totalCustomers || 0,
    prefixIcon: UserOutlined,
    valueColor: '#1890ff',
  },
  {
    title: '今日新增',
    value: overview.value?.newCustomersToday || 0,
    prefixIcon: RiseOutlined,
    valueColor: '#52c41a',
  },
  {
    title: '本周新增',
    value: overview.value?.newCustomersWeek || 0,
    valueColor: '#13c2c2',
  },
  {
    title: '本月新增',
    value: overview.value?.newCustomersMonth || 0,
    valueColor: '#722ed1',
  },
]);

const overviewCards2 = computed<StatisticItem[]>(() => [
  {
    title: '活跃客户',
    value: overview.value?.activeCustomers || 0,
    valueColor: '#52c41a',
  },
  {
    title: '未分配',
    value: overview.value?.unassignedCustomers || 0,
    prefixIcon: TeamOutlined,
    valueColor: '#faad14',
  },
  {
    title: '高价值客户',
    value: overview.value?.highValueCustomers || 0,
    prefixIcon: StarOutlined,
    valueColor: '#eb2f96',
  },
  {
    title: '流失风险',
    value: overview.value?.atRiskCustomers || 0,
    prefixIcon: WarningOutlined,
    valueColor: '#ff4d4f',
  },
]);

// ==================== 表格列配置 ====================

const topOwnersColumns: RankingColumn[] = [
  { title: '排名', key: 'rank', width: 60, isRank: true },
  { title: '员工', dataIndex: 'ownerName', key: 'ownerName' },
  {
    title: '客户数',
    dataIndex: 'customerCount',
    key: 'customerCount',
    width: 100,
  },
];

const regionColumns: RankingColumn[] = [
  { title: '排名', key: 'rank', width: 60, isRank: true },
  { title: '省份', dataIndex: 'province', key: 'province' },
  { title: '客户数', dataIndex: 'count', key: 'count', width: 100 },
];

const topCustomersColumns = [
  { title: '排名', key: 'rank', width: 60 },
  { title: '客户名称', dataIndex: 'name', key: 'name' },
  { title: '等级', dataIndex: 'level', key: 'level', width: 80 },
  {
    title: '消费金额',
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    width: 120,
  },
  { title: '订单数', dataIndex: 'orderCount', key: 'orderCount', width: 80 },
];

// ==================== API 调用 ====================

async function fetchOverview() {
  try {
    loading.value = true;
    overview.value = await requestClient.get<StatisticsOverview>(
      '/customer/list/statistics/overview',
    );
  } catch (error) {
    message.error('获取统计数据失败');
  } finally {
    loading.value = false;
  }
}

async function fetchGrowthTrend() {
  try {
    growthTrend.value = await requestClient.get<GrowthTrend[]>(
      '/customer/list/statistics/growth-trend',
      { params: { period: growthPeriod.value } },
    );
  } catch (error) {
    message.error('获取增长趋势失败');
  }
}

async function fetchRegionDistribution() {
  try {
    regionDistribution.value = await requestClient.get<RegionDistribution[]>(
      '/customer/list/statistics/region-distribution',
      { params: { level: 'province', limit: 10 } },
    );
  } catch (error) {
    message.error('获取地区分布失败');
  }
}

async function fetchValueAnalysis() {
  try {
    valueAnalysis.value = await requestClient.get<ValueAnalysis>(
      '/customer/list/statistics/value-analysis',
    );
  } catch (error) {
    message.error('获取价值分析失败');
  }
}

async function fetchOwnerRanking() {
  try {
    ownerRanking.value = await requestClient.get<OwnerRanking[]>(
      '/customer/list/statistics/owner-ranking',
      { params: { period: rankingPeriod.value, limit: 10 } },
    );
  } catch (error) {
    message.error('获取员工排行失败');
  }
}

function handleGrowthPeriodChange() {
  fetchGrowthTrend();
}

function handleRankingPeriodChange() {
  fetchOwnerRanking();
}

function refresh() {
  fetchOverview();
  fetchGrowthTrend();
  fetchRegionDistribution();
  fetchValueAnalysis();
  fetchOwnerRanking();
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchOverview();
  fetchGrowthTrend();
  fetchRegionDistribution();
  fetchValueAnalysis();
  fetchOwnerRanking();
});
</script>

<script lang="ts">
export default {
  name: 'CustomerStatistics',
};
</script>

<template>
  <StatisticsPageLayout
    title="客户统计分析"
    back-path="/customer/list"
    :loading="loading"
  >
    <template #actions>
      <Button type="primary" @click="refresh">
        <ReloadOutlined /> 刷新
      </Button>
    </template>

    <!-- 统计卡片 - 第一行 -->
    <StatisticCardRow :items="overviewCards1" />

    <!-- 统计卡片 - 第二行 -->
    <StatisticCardRow :items="overviewCards2" />

    <!-- 资料完整度 -->
    <Row :gutter="16" class="mb-4">
      <Col :span="12">
        <Card title="平均资料完整度">
          <div class="flex items-center justify-center py-4">
            <Progress
              type="circle"
              :percent="overview?.avgProfileCompleteness || 0"
              :width="120"
              :stroke-color="{ '0%': '#108ee9', '100%': '#52c41a' }"
            />
          </div>
        </Card>
      </Col>
      <Col :span="12">
        <Card title="渠道分布">
          <div class="space-y-2">
            <div
              v-for="item in overview?.channelDistribution || []"
              :key="item.channel"
              class="flex items-center justify-between"
            >
              <span>{{ channelMap[item.channel] || item.channel }}</span>
              <span class="font-semibold">{{ item.count }}</span>
            </div>
            <div
              v-if="!overview?.channelDistribution?.length"
              class="text-center text-gray-400"
            >
              暂无数据
            </div>
          </div>
        </Card>
      </Col>
    </Row>

    <!-- 员工客户排行和地区分布 -->
    <Row :gutter="16" class="mb-4">
      <Col :span="12">
        <RankingTable
          title="员工客户排行 TOP 10"
          :data-source="overview?.topOwners || []"
          :columns="topOwnersColumns"
        />
      </Col>
      <Col :span="12">
        <Card title="地区分布 TOP 10">
          <template #extra><EnvironmentOutlined /></template>
          <Table
            :columns="[
              { title: '排名', key: 'rank', width: 60 },
              { title: '省份', dataIndex: 'province', key: 'province' },
              { title: '客户数', dataIndex: 'count', key: 'count', width: 100 },
              {
                title: '占比',
                dataIndex: 'percentage',
                key: 'percentage',
                width: 120,
              },
            ]"
            :data-source="
              regionDistribution.map((item, index) => ({ ...item, key: index }))
            "
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'rank'">
                <span :class="{ 'font-bold text-red-500': index < 3 }">{{
                  index + 1
                }}</span>
              </template>
              <template v-if="column.key === 'percentage'"
                >{{ record.percentage }}%</template
              >
            </template>
          </Table>
        </Card>
      </Col>
    </Row>

    <!-- 价值分析 -->
    <Row :gutter="16" class="mb-4">
      <Col :span="12">
        <Card title="客户价值分析">
          <Row :gutter="16" class="mb-4">
            <Col :span="8">
              <Statistic
                title="总消费金额"
                :value="valueAnalysis?.totalValue || 0"
                prefix="¥"
                :precision="0"
              />
            </Col>
            <Col :span="8">
              <Statistic
                title="平均消费"
                :value="valueAnalysis?.avgOrderValue || 0"
                prefix="¥"
                :precision="0"
              />
            </Col>
            <Col :span="8">
              <Statistic
                title="平均订单数"
                :value="valueAnalysis?.avgOrderCount || 0"
                :precision="1"
              />
            </Col>
          </Row>
          <div class="mt-4">
            <h4 class="mb-2 text-sm font-medium">价值分布</h4>
            <div class="space-y-2">
              <div
                v-for="item in valueAnalysis?.valueDistribution || []"
                :key="item.range"
                class="flex items-center"
              >
                <span class="w-24">{{ item.range }}</span>
                <Progress
                  :percent="item.percentage"
                  :show-info="false"
                  class="mx-2 flex-1"
                />
                <span class="w-16 text-right">{{ item.count }}人</span>
              </div>
            </div>
          </div>
        </Card>
      </Col>
      <Col :span="12">
        <Card title="高价值客户 TOP 10">
          <Table
            :columns="topCustomersColumns"
            :data-source="
              (valueAnalysis?.topCustomers || []).map((item, index) => ({
                ...item,
                key: index,
              }))
            "
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'rank'">
                <span :class="{ 'font-bold text-red-500': index < 3 }">{{
                  index + 1
                }}</span>
              </template>
              <template v-if="column.key === 'level'">
                <Tag :color="levelMap[record.level]?.color || 'default'">
                  {{ levelMap[record.level]?.label || record.level }}
                </Tag>
              </template>
              <template v-if="column.key === 'totalAmount'"
                >¥{{ record.totalAmount.toLocaleString() }}</template
              >
            </template>
          </Table>
        </Card>
      </Col>
    </Row>

    <!-- 员工排行详情 -->
    <Card title="员工客户排行详情" class="mb-4">
      <template #extra>
        <Select
          v-model:value="rankingPeriod"
          style="width: 100px"
          @change="handleRankingPeriodChange"
        >
          <Select.Option value="week">本周</Select.Option>
          <Select.Option value="month">本月</Select.Option>
        </Select>
      </template>
      <Table
        :columns="[
          { title: '排名', key: 'rank', width: 60 },
          { title: '员工', dataIndex: 'ownerName', key: 'ownerName' },
          {
            title: '客户总数',
            dataIndex: 'totalCustomers',
            key: 'totalCustomers',
            width: 90,
          },
          {
            title: '本周新增',
            dataIndex: 'newCustomersWeek',
            key: 'newCustomersWeek',
            width: 90,
          },
          {
            title: '高价值客户',
            dataIndex: 'highValueCount',
            key: 'highValueCount',
            width: 100,
          },
          {
            title: '资料完整度',
            dataIndex: 'avgProfileCompleteness',
            key: 'avgProfileCompleteness',
            width: 120,
          },
        ]"
        :data-source="
          ownerRanking.map((item, index) => ({ ...item, key: index }))
        "
        :pagination="false"
        size="small"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'rank'">
            <span :class="{ 'font-bold text-red-500': index < 3 }">{{
              index + 1
            }}</span>
          </template>
          <template v-if="column.key === 'avgProfileCompleteness'">
            <Progress
              :percent="record.avgProfileCompleteness"
              size="small"
              :show-info="true"
            />
          </template>
        </template>
      </Table>
    </Card>

    <!-- 每日趋势 -->
    <Card title="客户增长趋势" class="mb-4">
      <template #extra>
        <Select
          v-model:value="growthPeriod"
          style="width: 100px"
          @change="handleGrowthPeriodChange"
        >
          <Select.Option value="week">近一周</Select.Option>
          <Select.Option value="month">近一月</Select.Option>
          <Select.Option value="quarter">近三月</Select.Option>
        </Select>
      </template>
      <Table
        :columns="[
          { title: '日期', dataIndex: 'date', key: 'date' },
          { title: '新增客户', dataIndex: 'newCustomers', key: 'newCustomers' },
          {
            title: '累计客户',
            dataIndex: 'totalCustomers',
            key: 'totalCustomers',
          },
          { title: '增长率', dataIndex: 'growthRate', key: 'growthRate' },
        ]"
        :data-source="
          growthTrend.map((item, index) => ({ ...item, key: index }))
        "
        :pagination="false"
        size="small"
        :scroll="{ y: 300 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'growthRate'"
            >{{ record.growthRate }}%</template
          >
        </template>
      </Table>
    </Card>

    <!-- 状态/来源/等级分布 -->
    <Row :gutter="16" class="mb-4">
      <Col :span="8">
        <Card title="状态分布">
          <div class="space-y-2">
            <div
              v-for="item in overview?.byStatus || []"
              :key="item.status"
              class="flex items-center justify-between"
            >
              <Tag :color="statusMap[item.status]?.color || 'default'">
                {{ statusMap[item.status]?.label || item.status }}
              </Tag>
              <span class="font-semibold">{{ item.count }}</span>
            </div>
          </div>
        </Card>
      </Col>
      <Col :span="8">
        <Card title="来源分布">
          <div class="space-y-2">
            <div
              v-for="item in overview?.bySource || []"
              :key="item.source"
              class="flex items-center justify-between"
            >
              <Tag :color="sourceMap[item.source]?.color || 'default'">
                {{ sourceMap[item.source]?.label || item.source }}
              </Tag>
              <span class="font-semibold">{{ item.count }}</span>
            </div>
          </div>
        </Card>
      </Col>
      <Col :span="8">
        <Card title="等级分布">
          <div class="space-y-2">
            <div
              v-for="item in overview?.byLevel || []"
              :key="item.level"
              class="flex items-center justify-between"
            >
              <Tag :color="levelMap[item.level]?.color || 'default'">
                {{ levelMap[item.level]?.label || item.level }}
              </Tag>
              <span class="font-semibold">{{ item.count }}</span>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  </StatisticsPageLayout>
</template>
