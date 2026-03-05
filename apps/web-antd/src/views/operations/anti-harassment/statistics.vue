<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Progress,
  Button,
  Spin,
  Alert,
  Tabs,
  TabPane,
  Badge,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  WarningOutlined,
  SafetyOutlined,
  StopOutlined,
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';
import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

interface StatisticsOverview {
  totalViolations: number;
  totalRules: number;
  activeRules: number;
  totalSensitiveWords: number;
  activeSensitiveWords: number;
  whitelistCount: number;
  blacklistCount: number;
  violationsToday: number;
  violationsThisWeek: number;
  processedCount: number;
  pendingCount: number;
  processedRate: number;
  byRuleType: Array<{ ruleType: string; count: number; percentage: number }>;
  byAction: Array<{ action: string; count: number; percentage: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
}

interface ViolationAnalysis {
  topViolators: Array<{
    externalUserid: string;
    externalName: string | null;
    violationCount: number;
    latestViolation: string;
  }>;
  topTriggeredRules: Array<{
    ruleId: number | null;
    ruleName: string | null;
    ruleType: string;
    triggerCount: number;
  }>;
  byGroupChat: Array<{
    groupChatId: string | null;
    groupChatName: string | null;
    violationCount: number;
  }>;
  byMessageType: Array<{
    messageType: string | null;
    count: number;
    percentage: number;
  }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
}

interface RuleEffectiveness {
  rules: Array<{
    id: number;
    name: string;
    ruleType: string;
    isActive: boolean;
    priority: number;
    triggerCount: number;
    actionSuccessCount: number;
    actionFailCount: number;
    successRate: number;
    lastTriggered: string | null;
    createdAt: string;
  }>;
  overallSuccessRate: number;
  averageTriggersPerRule: number;
  unusedRulesCount: number;
}

interface ListStatus {
  blacklist: {
    total: number;
    permanent: number;
    temporary: number;
    expiringSoon: number;
  };
  whitelist: {
    total: number;
    permanent: number;
    temporary: number;
    expiringSoon: number;
  };
  recentBlacklist: Array<{
    id: number;
    externalUserid: string;
    nickname: string | null;
    reason: string | null;
    expiresAt: string | null;
    createdAt: string;
  }>;
  recentWhitelist: Array<{
    id: number;
    externalUserid: string;
    nickname: string | null;
    reason: string | null;
    expiresAt: string | null;
    createdAt: string;
  }>;
}

// ==================== 状态 ====================

const router = useRouter();
const loading = ref(false);
const activeTab = ref('overview');

const overview = ref<StatisticsOverview | null>(null);
const violationAnalysis = ref<ViolationAnalysis | null>(null);
const ruleEffectiveness = ref<RuleEffectiveness | null>(null);
const listStatus = ref<ListStatus | null>(null);

// ==================== 规则类型映射 ====================

const ruleTypeMap: Record<string, string> = {
  SENSITIVE_WORD: '敏感词',
  MESSAGE_TYPE: '消息类型',
  SPAM: '刷屏',
  EXTERNAL_CORP: '外部企业',
};

const actionMap: Record<string, string> = {
  KICK: '踢出群聊',
  WARN: '警告',
  WARN_AND_KICK: '警告并踢出',
  WARN_THEN_KICK: '多次警告后踢出',
  MUTE: '禁言',
  BLOCK: '拉黑',
};

// ==================== 数据加载 ====================

async function loadData() {
  loading.value = true;
  try {
    const [overviewRes, analysisRes, effectivenessRes, listRes] =
      await Promise.all([
        requestClient.get<StatisticsOverview>(
          '/operations/anti-harassment/statistics/overview',
        ),
        requestClient.get<ViolationAnalysis>(
          '/operations/anti-harassment/statistics/violation-analysis',
        ),
        requestClient.get<RuleEffectiveness>(
          '/operations/anti-harassment/statistics/rule-effectiveness',
        ),
        requestClient.get<ListStatus>(
          '/operations/anti-harassment/statistics/list-status',
        ),
      ]);
    overview.value = overviewRes;
    violationAnalysis.value = analysisRes;
    ruleEffectiveness.value = effectivenessRes;
    listStatus.value = listRes;
  } catch (e) {
    console.error('加载统计数据失败', e);
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push('/operations/anti-harassment');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
}

// ==================== 表格列定义 ====================

const violatorColumns = [
  {
    title: '用户ID',
    dataIndex: 'externalUserid',
    key: 'externalUserid',
    ellipsis: true,
  },
  { title: '用户名称', dataIndex: 'externalName', key: 'externalName' },
  {
    title: '违规次数',
    dataIndex: 'violationCount',
    key: 'violationCount',
    sorter: (a: any, b: any) => a.violationCount - b.violationCount,
  },
  { title: '最近违规', dataIndex: 'latestViolation', key: 'latestViolation' },
];

const ruleColumns = [
  { title: '规则名称', dataIndex: 'name', key: 'name' },
  { title: '规则类型', dataIndex: 'ruleType', key: 'ruleType' },
  {
    title: '触发次数',
    dataIndex: 'triggerCount',
    key: 'triggerCount',
    sorter: (a: any, b: any) => a.triggerCount - b.triggerCount,
  },
];

const effectivenessColumns = [
  { title: '规则名称', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'ruleType', key: 'ruleType' },
  { title: '状态', dataIndex: 'isActive', key: 'isActive' },
  { title: '触发次数', dataIndex: 'triggerCount', key: 'triggerCount' },
  { title: '成功率', dataIndex: 'successRate', key: 'successRate' },
  { title: '最后触发', dataIndex: 'lastTriggered', key: 'lastTriggered' },
];

const listColumns = [
  {
    title: '用户ID',
    dataIndex: 'externalUserid',
    key: 'externalUserid',
    ellipsis: true,
  },
  { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
  { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
  { title: '过期时间', dataIndex: 'expiresAt', key: 'expiresAt' },
  { title: '添加时间', dataIndex: 'createdAt', key: 'createdAt' },
];

// ==================== 生命周期 ====================

onMounted(loadData);
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Button @click="goBack">
          <template #icon><ArrowLeftOutlined /></template>
          返回
        </Button>
        <h2 class="m-0 text-xl font-bold">安全管控统计</h2>
      </div>
      <Button @click="loadData" :loading="loading">
        <template #icon><ReloadOutlined /></template>
        刷新
      </Button>
    </div>

    <Spin :spinning="loading">
      <Tabs v-model:activeKey="activeTab">
        <!-- 概览 Tab -->
        <TabPane key="overview" tab="统计概览">
          <template v-if="overview">
            <!-- 核心指标 -->
            <Row :gutter="[16, 16]" class="mb-4">
              <Col :xs="24" :sm="12" :md="6">
                <Card>
                  <Statistic
                    title="总违规次数"
                    :value="overview.totalViolations"
                    :value-style="{ color: '#cf1322' }"
                  >
                    <template #prefix><WarningOutlined /></template>
                  </Statistic>
                </Card>
              </Col>
              <Col :xs="24" :sm="12" :md="6">
                <Card>
                  <Statistic
                    title="今日违规"
                    :value="overview.violationsToday"
                    :value-style="{ color: '#fa8c16' }"
                  />
                  <div class="mt-2 text-xs text-gray-500">
                    本周: {{ overview.violationsThisWeek }} 次
                  </div>
                </Card>
              </Col>
              <Col :xs="24" :sm="12" :md="6">
                <Card>
                  <Statistic
                    title="处置完成率"
                    :value="overview.processedRate"
                    suffix="%"
                    :value-style="{
                      color:
                        overview.processedRate >= 80 ? '#3f8600' : '#fa8c16',
                    }"
                  >
                    <template #prefix><CheckCircleOutlined /></template>
                  </Statistic>
                  <div class="mt-2 text-xs text-gray-500">
                    已处置: {{ overview.processedCount }} / 待处理:
                    {{ overview.pendingCount }}
                  </div>
                </Card>
              </Col>
              <Col :xs="24" :sm="12" :md="6">
                <Card>
                  <Statistic
                    title="启用规则"
                    :value="overview.activeRules"
                    :suffix="`/ ${overview.totalRules}`"
                  >
                    <template #prefix><SafetyOutlined /></template>
                  </Statistic>
                  <div class="mt-2 text-xs text-gray-500">
                    敏感词: {{ overview.activeSensitiveWords }} /
                    {{ overview.totalSensitiveWords }}
                  </div>
                </Card>
              </Col>
            </Row>

            <!-- 名单统计 -->
            <Row :gutter="[16, 16]" class="mb-4">
              <Col :xs="24" :sm="12">
                <Card title="白名单">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <SafetyOutlined class="text-2xl text-green-500" />
                      <span class="text-2xl font-bold">{{
                        overview.whitelistCount
                      }}</span>
                      <span class="text-gray-500">位用户</span>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col :xs="24" :sm="12">
                <Card title="黑名单">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <StopOutlined class="text-2xl text-red-500" />
                      <span class="text-2xl font-bold">{{
                        overview.blacklistCount
                      }}</span>
                      <span class="text-gray-500">位用户</span>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            <!-- 分布统计 -->
            <Row :gutter="[16, 16]" class="mb-4">
              <Col :xs="24" :md="12">
                <Card title="按规则类型分布">
                  <div
                    v-for="item in overview.byRuleType"
                    :key="item.ruleType"
                    class="mb-3"
                  >
                    <div class="mb-1 flex justify-between">
                      <span>{{
                        ruleTypeMap[item.ruleType] || item.ruleType
                      }}</span>
                      <span>{{ item.count }} ({{ item.percentage }}%)</span>
                    </div>
                    <Progress
                      :percent="item.percentage"
                      :show-info="false"
                      size="small"
                    />
                  </div>
                  <div
                    v-if="overview.byRuleType.length === 0"
                    class="text-center text-gray-400"
                  >
                    暂无数据
                  </div>
                </Card>
              </Col>
              <Col :xs="24" :md="12">
                <Card title="按处置动作分布">
                  <div
                    v-for="item in overview.byAction"
                    :key="item.action"
                    class="mb-3"
                  >
                    <div class="mb-1 flex justify-between">
                      <span>{{ actionMap[item.action] || item.action }}</span>
                      <span>{{ item.count }} ({{ item.percentage }}%)</span>
                    </div>
                    <Progress
                      :percent="item.percentage"
                      :show-info="false"
                      size="small"
                      :stroke-color="
                        item.action === 'KICK' ? '#ff4d4f' : '#1890ff'
                      "
                    />
                  </div>
                  <div
                    v-if="overview.byAction.length === 0"
                    class="text-center text-gray-400"
                  >
                    暂无数据
                  </div>
                </Card>
              </Col>
            </Row>

            <!-- 7天趋势 -->
            <Card title="近7天违规趋势" class="mb-4">
              <div class="flex h-32 items-end gap-2">
                <div
                  v-for="item in overview.dailyTrend"
                  :key="item.date"
                  class="flex flex-1 flex-col items-center"
                >
                  <div
                    class="w-full rounded-t bg-red-400"
                    :style="{
                      height: `${Math.max((item.count / Math.max(...overview.dailyTrend.map((d) => d.count), 1)) * 100, 4)}px`,
                    }"
                  ></div>
                  <div class="mt-2 text-xs text-gray-500">
                    {{ item.date.slice(5) }}
                  </div>
                  <div class="text-xs font-medium">{{ item.count }}</div>
                </div>
              </div>
            </Card>
          </template>
        </TabPane>

        <!-- 违规分析 Tab -->
        <TabPane key="analysis" tab="违规分析">
          <template v-if="violationAnalysis">
            <Row :gutter="[16, 16]" class="mb-4">
              <!-- 高频违规用户 -->
              <Col :xs="24" :lg="12">
                <Card title="高频违规用户 TOP 10">
                  <template #extra>
                    <UserOutlined />
                  </template>
                  <Table
                    :data-source="violationAnalysis.topViolators"
                    :columns="violatorColumns"
                    :pagination="false"
                    size="small"
                    row-key="externalUserid"
                  >
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'latestViolation'">
                        {{ formatDateTime(record.latestViolation) }}
                      </template>
                      <template v-if="column.key === 'externalName'">
                        {{ record.externalName || '-' }}
                      </template>
                    </template>
                  </Table>
                </Card>
              </Col>

              <!-- 高频触发规则 -->
              <Col :xs="24" :lg="12">
                <Card title="高频触发规则 TOP 10">
                  <template #extra>
                    <SafetyOutlined />
                  </template>
                  <Table
                    :data-source="violationAnalysis.topTriggeredRules"
                    :columns="ruleColumns"
                    :pagination="false"
                    size="small"
                    row-key="ruleId"
                  >
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'ruleType'">
                        <Tag>{{
                          ruleTypeMap[record.ruleType] || record.ruleType
                        }}</Tag>
                      </template>
                      <template v-if="column.key === 'name'">
                        {{ record.ruleName || '未知规则' }}
                      </template>
                    </template>
                  </Table>
                </Card>
              </Col>
            </Row>

            <Row :gutter="[16, 16]" class="mb-4">
              <!-- 按群聊统计 -->
              <Col :xs="24" :lg="12">
                <Card title="按群聊统计 TOP 10">
                  <template #extra>
                    <TeamOutlined />
                  </template>
                  <div
                    v-for="(item, index) in violationAnalysis.byGroupChat.slice(
                      0,
                      10,
                    )"
                    :key="index"
                    class="mb-2 flex items-center justify-between"
                  >
                    <span
                      class="truncate"
                      :title="item.groupChatName || item.groupChatId || '私聊'"
                    >
                      {{ item.groupChatName || item.groupChatId || '私聊' }}
                    </span>
                    <Tag color="red">{{ item.violationCount }} 次</Tag>
                  </div>
                  <div
                    v-if="violationAnalysis.byGroupChat.length === 0"
                    class="text-center text-gray-400"
                  >
                    暂无数据
                  </div>
                </Card>
              </Col>

              <!-- 按消息类型统计 -->
              <Col :xs="24" :lg="12">
                <Card title="按消息类型分布">
                  <div
                    v-for="(item, idx) in violationAnalysis.byMessageType"
                    :key="idx"
                    class="mb-3"
                  >
                    <div class="mb-1 flex justify-between">
                      <span>{{ item.messageType || '文本' }}</span>
                      <span>{{ item.count }} ({{ item.percentage }}%)</span>
                    </div>
                    <Progress
                      :percent="item.percentage"
                      :show-info="false"
                      size="small"
                    />
                  </div>
                  <div
                    v-if="violationAnalysis.byMessageType.length === 0"
                    class="text-center text-gray-400"
                  >
                    暂无数据
                  </div>
                </Card>
              </Col>
            </Row>

            <!-- 时段分布 -->
            <Card title="违规时段分布 (24小时)" class="mb-4">
              <div class="flex h-32 items-end gap-1">
                <div
                  v-for="item in violationAnalysis.hourlyDistribution"
                  :key="item.hour"
                  class="flex flex-1 flex-col items-center"
                >
                  <div
                    class="w-full rounded-t bg-orange-400"
                    :style="{
                      height: `${Math.max((item.count / Math.max(...violationAnalysis.hourlyDistribution.map((d) => d.count), 1)) * 100, 2)}px`,
                    }"
                  ></div>
                  <div class="mt-1 text-xs text-gray-500">
                    {{ item.hour }}
                  </div>
                </div>
              </div>
            </Card>
          </template>
        </TabPane>

        <!-- 规则效果 Tab -->
        <TabPane key="effectiveness" tab="规则效果">
          <template v-if="ruleEffectiveness">
            <!-- 总体指标 -->
            <Row :gutter="[16, 16]" class="mb-4">
              <Col :xs="24" :sm="8">
                <Card>
                  <Statistic
                    title="总体成功率"
                    :value="ruleEffectiveness.overallSuccessRate"
                    suffix="%"
                    :value-style="{
                      color:
                        ruleEffectiveness.overallSuccessRate >= 80
                          ? '#3f8600'
                          : '#fa8c16',
                    }"
                  />
                </Card>
              </Col>
              <Col :xs="24" :sm="8">
                <Card>
                  <Statistic
                    title="平均触发次数"
                    :value="ruleEffectiveness.averageTriggersPerRule"
                    suffix="次/规则"
                  />
                </Card>
              </Col>
              <Col :xs="24" :sm="8">
                <Card>
                  <Statistic
                    title="未使用规则"
                    :value="ruleEffectiveness.unusedRulesCount"
                    :value-style="{
                      color:
                        ruleEffectiveness.unusedRulesCount > 0
                          ? '#fa8c16'
                          : '#3f8600',
                    }"
                  />
                </Card>
              </Col>
            </Row>

            <!-- 规则详情表 -->
            <Card title="规则效果详情">
              <Table
                :data-source="ruleEffectiveness.rules"
                :columns="effectivenessColumns"
                :pagination="{ pageSize: 10 }"
                size="small"
                row-key="id"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'ruleType'">
                    <Tag>{{
                      ruleTypeMap[record.ruleType] || record.ruleType
                    }}</Tag>
                  </template>
                  <template v-if="column.key === 'isActive'">
                    <Badge
                      :status="record.isActive ? 'success' : 'default'"
                      :text="record.isActive ? '启用' : '禁用'"
                    />
                  </template>
                  <template v-if="column.key === 'successRate'">
                    <Progress
                      :percent="record.successRate"
                      :status="
                        record.successRate >= 80
                          ? 'success'
                          : record.successRate >= 50
                            ? 'normal'
                            : 'exception'
                      "
                      size="small"
                      style="width: 100px"
                    />
                  </template>
                  <template v-if="column.key === 'lastTriggered'">
                    {{ formatDateTime(record.lastTriggered) }}
                  </template>
                </template>
              </Table>
            </Card>

            <!-- 未使用规则告警 -->
            <Alert
              v-if="ruleEffectiveness.unusedRulesCount > 0"
              class="mt-4"
              type="warning"
              show-icon
            >
              <template #message>
                发现
                {{ ruleEffectiveness.unusedRulesCount }}
                条规则从未被触发，建议检查规则配置是否合理
              </template>
            </Alert>
          </template>
        </TabPane>

        <!-- 名单状态 Tab -->
        <TabPane key="lists" tab="名单状态">
          <template v-if="listStatus">
            <Row :gutter="[16, 16]" class="mb-4">
              <!-- 黑名单统计 -->
              <Col :xs="24" :md="12">
                <Card title="黑名单统计">
                  <template #extra>
                    <StopOutlined class="text-red-500" />
                  </template>
                  <Row :gutter="16">
                    <Col :span="12">
                      <Statistic
                        title="总数"
                        :value="listStatus.blacklist.total"
                      />
                    </Col>
                    <Col :span="12">
                      <Statistic
                        title="永久"
                        :value="listStatus.blacklist.permanent"
                      />
                    </Col>
                    <Col :span="12">
                      <Statistic
                        title="临时"
                        :value="listStatus.blacklist.temporary"
                      />
                    </Col>
                    <Col :span="12">
                      <Statistic
                        title="即将过期"
                        :value="listStatus.blacklist.expiringSoon"
                        :value-style="{
                          color:
                            listStatus.blacklist.expiringSoon > 0
                              ? '#fa8c16'
                              : undefined,
                        }"
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>

              <!-- 白名单统计 -->
              <Col :xs="24" :md="12">
                <Card title="白名单统计">
                  <template #extra>
                    <SafetyOutlined class="text-green-500" />
                  </template>
                  <Row :gutter="16">
                    <Col :span="12">
                      <Statistic
                        title="总数"
                        :value="listStatus.whitelist.total"
                      />
                    </Col>
                    <Col :span="12">
                      <Statistic
                        title="永久"
                        :value="listStatus.whitelist.permanent"
                      />
                    </Col>
                    <Col :span="12">
                      <Statistic
                        title="临时"
                        :value="listStatus.whitelist.temporary"
                      />
                    </Col>
                    <Col :span="12">
                      <Statistic
                        title="即将过期"
                        :value="listStatus.whitelist.expiringSoon"
                        :value-style="{
                          color:
                            listStatus.whitelist.expiringSoon > 0
                              ? '#fa8c16'
                              : undefined,
                        }"
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            <Row :gutter="[16, 16]">
              <!-- 最近添加的黑名单 -->
              <Col :xs="24" :lg="12">
                <Card title="最近添加的黑名单">
                  <Table
                    :data-source="listStatus.recentBlacklist"
                    :columns="listColumns"
                    :pagination="false"
                    size="small"
                    row-key="id"
                  >
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'expiresAt'">
                        <Tag v-if="!record.expiresAt" color="red">永久</Tag>
                        <span v-else>{{ formatDate(record.expiresAt) }}</span>
                      </template>
                      <template v-if="column.key === 'createdAt'">
                        {{ formatDate(record.createdAt) }}
                      </template>
                    </template>
                  </Table>
                </Card>
              </Col>

              <!-- 最近添加的白名单 -->
              <Col :xs="24" :lg="12">
                <Card title="最近添加的白名单">
                  <Table
                    :data-source="listStatus.recentWhitelist"
                    :columns="listColumns"
                    :pagination="false"
                    size="small"
                    row-key="id"
                  >
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'expiresAt'">
                        <Tag v-if="!record.expiresAt" color="green">永久</Tag>
                        <span v-else>{{ formatDate(record.expiresAt) }}</span>
                      </template>
                      <template v-if="column.key === 'createdAt'">
                        {{ formatDate(record.createdAt) }}
                      </template>
                    </template>
                  </Table>
                </Card>
              </Col>
            </Row>
          </template>
        </TabPane>
      </Tabs>
    </Spin>
  </div>
</template>
