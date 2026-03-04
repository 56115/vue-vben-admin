<script lang="ts" setup>
import { ref, onMounted, h } from 'vue';
import { useRouter } from 'vue-router';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
  Tabs,
  TabPane,
  List,
  ListItem,
  ListItemMeta,
  Avatar,
  Badge,
  Popconfirm,
  DatePicker,
  Empty,
} from 'ant-design-vue';
import {
  PhoneOutlined,
  MessageOutlined,
  TeamOutlined,
  MailOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  BarChartOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';
import { useCrudTable } from '#/composables';
import {
  followUpStatusOptions,
  followUpTypeOptions,
  findOption,
  withAllOption,
} from '#/constants/crm-options';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const router = useRouter();

// ==================== 类型定义 ====================

interface FollowUpItem {
  id: number;
  customerId: number;
  customerName: string;
  customerPhone: string | null;
  userId: number;
  userName: string | null;
  type: string;
  content: string;
  nextPlanAt: string | null;
  status: 'PENDING' | 'OVERDUE' | 'COMPLETED';
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FollowUpStats {
  total: number;
  todayCount: number;
  pendingCount: number;
  overdueCount: number;
  byType: Record<string, number>;
  recentDays: { date: string; count: number }[];
}

interface TodayFollowUp {
  today: FollowUpItem[];
  overdue: FollowUpItem[];
  upcoming: FollowUpItem[];
  stats: {
    todayCount: number;
    overdueCount: number;
    upcomingCount: number;
  };
}

interface CustomerItem {
  id: number;
  name: string;
}

interface FollowUpFilters {
  status?: string;
  type?: string;
}

// ==================== 类型图标映射 ====================

const typeIconMap: Record<string, typeof PhoneOutlined> = {
  PHONE: PhoneOutlined,
  WECHAT: MessageOutlined,
  VISIT: TeamOutlined,
  EMAIL: MailOutlined,
  OTHER: ClockCircleOutlined,
};

function getTypeIcon(type: string) {
  return typeIconMap[type] || ClockCircleOutlined;
}

// ==================== 表格列定义 ====================

const columns = [
  { title: '客户', key: 'customer', width: 180 },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 100,
    customRender: ({ text }: { text: string }) => {
      const opt = findOption(followUpTypeOptions, text);
      return h(
        Tag,
        { color: opt?.color || 'default' },
        () => opt?.label || text,
      );
    },
  },
  { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
  {
    title: '状态',
    key: 'status',
    width: 100,
    customRender: ({ record }: { record: FollowUpItem }) => {
      const opt = findOption(followUpStatusOptions, record.status);
      return h(
        Tag,
        { color: opt?.color || 'default' },
        () => opt?.label || record.status,
      );
    },
  },
  {
    title: '计划时间',
    dataIndex: 'nextPlanAt',
    key: 'nextPlanAt',
    width: 160,
    customRender: ({ text }: { text: string | null }) =>
      text ? dayjs(text).format('MM-DD HH:mm') : '-',
  },
  { title: '跟进人', dataIndex: 'userName', key: 'userName', width: 100 },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 140,
    customRender: ({ text }: { text: string }) =>
      dayjs(text).format('MM-DD HH:mm'),
  },
  { title: '操作', key: 'action', width: 140, fixed: 'right' as const },
];

// ==================== 表格逻辑 ====================

const { tableProps, filters, search, resetFilters, fetchData } = useCrudTable<
  FollowUpItem,
  FollowUpFilters
>({
  fetchApi: async (params) => {
    const apiParams: Record<string, unknown> = {
      page: params.page,
      pageSize: params.pageSize,
    };
    if (params.status) apiParams.status = params.status;
    if (params.type) apiParams.type = params.type;
    return requestClient.get<{ items: FollowUpItem[]; total: number }>(
      '/customer/follow-up',
      { params: apiParams },
    );
  },
});

// ==================== 统计和今日数据 ====================

const stats = ref<FollowUpStats | null>(null);
const todayData = ref<TodayFollowUp | null>(null);
const activeTab = ref('dashboard');

async function fetchStats() {
  try {
    stats.value = await requestClient.get<FollowUpStats>(
      '/customer/follow-up/stats',
    );
  } catch (e) {
    console.error(e);
  }
}

async function fetchTodayData() {
  try {
    todayData.value = await requestClient.get<TodayFollowUp>(
      '/customer/follow-up/today',
    );
  } catch (e) {
    console.error(e);
  }
}

// ==================== 新增跟进 Modal ====================

const modalVisible = ref(false);
const customers = ref<CustomerItem[]>([]);
const formState = ref({
  customerId: undefined as number | undefined,
  type: 'PHONE',
  content: '',
  nextPlanAt: undefined as dayjs.Dayjs | undefined,
});

async function fetchCustomers() {
  try {
    const res = await requestClient.get<{ items: CustomerItem[] }>(
      '/customer/list',
      {
        params: { pageSize: 100 },
      },
    );
    customers.value = res.items;
  } catch (e) {
    console.error(e);
  }
}

function handleAdd() {
  formState.value = {
    customerId: undefined,
    type: 'PHONE',
    content: '',
    nextPlanAt: undefined,
  };
  modalVisible.value = true;
}

async function handleSubmit() {
  if (!formState.value.customerId) {
    message.warning('请选择客户');
    return;
  }
  if (!formState.value.content) {
    message.warning('请输入跟进内容');
    return;
  }

  try {
    await requestClient.post('/customer/follow-up', {
      customerId: formState.value.customerId,
      type: formState.value.type,
      content: formState.value.content,
      nextPlanAt: formState.value.nextPlanAt?.toISOString(),
    });
    message.success('添加成功');
    modalVisible.value = false;
    refreshAll();
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : '操作失败';
    message.error(errorMessage);
  }
}

// ==================== 操作函数 ====================

async function handleMarkCompleted(id: number) {
  try {
    await requestClient.put(`/customer/follow-up/${id}/complete`);
    message.success('已标记完成');
    refreshAll();
  } catch (e) {
    message.error('操作失败');
  }
}

async function handleDelete(id: number) {
  try {
    await requestClient.delete(`/customer/follow-up/${id}`);
    message.success('删除成功');
    refreshAll();
  } catch (e) {
    message.error('删除失败');
  }
}

function refreshAll() {
  fetchData();
  fetchStats();
  fetchTodayData();
}

function handleFilter() {
  search();
}

function handleReset() {
  resetFilters();
}

function formatRelativeTime(time: string | null) {
  return time ? dayjs(time).fromNow() : '-';
}

function goToStatistics() {
  router.push('/customer/follow-up/statistics');
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchData();
  fetchStats();
  fetchTodayData();
  fetchCustomers();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-bold">跟进管理</h2>
      <Space>
        <Button @click="goToStatistics">
          <template #icon><BarChartOutlined /></template>
          统计分析
        </Button>
        <Button type="primary" @click="handleAdd">新增跟进</Button>
      </Space>
    </div>

    <!-- 统计卡片 -->
    <Row :gutter="16" class="mb-4">
      <Col :span="6">
        <Card>
          <Statistic
            title="总跟进数"
            :value="stats?.total || 0"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix><CalendarOutlined /></template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="待执行"
            :value="stats?.pendingCount || 0"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix><ClockCircleOutlined /></template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="已逾期"
            :value="stats?.overdueCount || 0"
            :value-style="{ color: '#ff4d4f' }"
          >
            <template #prefix><ExclamationCircleOutlined /></template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="今日新增"
            :value="stats?.todayCount || 0"
            :value-style="{ color: '#52c41a' }"
          >
            <template #prefix><CheckCircleOutlined /></template>
          </Statistic>
        </Card>
      </Col>
    </Row>

    <Tabs v-model:activeKey="activeTab">
      <!-- 工作台 Tab -->
      <TabPane key="dashboard" tab="工作台">
        <Row :gutter="16">
          <!-- 已逾期 -->
          <Col :span="8">
            <Card title="已逾期" size="small" class="h-96 overflow-auto">
              <template #extra>
                <Badge
                  :count="todayData?.stats.overdueCount || 0"
                  :number-style="{ backgroundColor: '#ff4d4f' }"
                />
              </template>
              <List
                v-if="todayData?.overdue.length"
                :data-source="todayData?.overdue"
                size="small"
              >
                <template #renderItem="{ item }">
                  <ListItem>
                    <ListItemMeta>
                      <template #avatar>
                        <Avatar
                          :style="{ backgroundColor: '#ff4d4f' }"
                          :size="32"
                        >
                          <template #icon>
                            <component :is="getTypeIcon(item.type)" />
                          </template>
                        </Avatar>
                      </template>
                      <template #title>
                        <div class="flex items-center justify-between">
                          <span>{{ item.customerName }}</span>
                          <Popconfirm
                            title="标记为已完成?"
                            @confirm="handleMarkCompleted(item.id)"
                          >
                            <Button type="link" size="small">
                              <CheckCircleOutlined />
                            </Button>
                          </Popconfirm>
                        </div>
                      </template>
                      <template #description>
                        <div class="text-xs">{{ item.content }}</div>
                        <div class="text-xs text-red-500">
                          {{ formatRelativeTime(item.nextPlanAt) }}
                        </div>
                      </template>
                    </ListItemMeta>
                  </ListItem>
                </template>
              </List>
              <Empty
                v-else
                description="无逾期任务"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
              />
            </Card>
          </Col>

          <!-- 今日待办 -->
          <Col :span="8">
            <Card title="今日待办" size="small" class="h-96 overflow-auto">
              <template #extra>
                <Badge
                  :count="todayData?.stats.todayCount || 0"
                  :number-style="{ backgroundColor: '#1890ff' }"
                />
              </template>
              <List
                v-if="todayData?.today.length"
                :data-source="todayData?.today"
                size="small"
              >
                <template #renderItem="{ item }">
                  <ListItem>
                    <ListItemMeta>
                      <template #avatar>
                        <Avatar
                          :style="{ backgroundColor: '#1890ff' }"
                          :size="32"
                        >
                          <template #icon>
                            <component :is="getTypeIcon(item.type)" />
                          </template>
                        </Avatar>
                      </template>
                      <template #title>
                        <div class="flex items-center justify-between">
                          <span>{{ item.customerName }}</span>
                          <Popconfirm
                            title="标记为已完成?"
                            @confirm="handleMarkCompleted(item.id)"
                          >
                            <Button type="link" size="small">
                              <CheckCircleOutlined />
                            </Button>
                          </Popconfirm>
                        </div>
                      </template>
                      <template #description>
                        <div class="text-xs">{{ item.content }}</div>
                        <div class="text-xs text-gray-400">
                          {{ dayjs(item.nextPlanAt).format('HH:mm') }}
                        </div>
                      </template>
                    </ListItemMeta>
                  </ListItem>
                </template>
              </List>
              <Empty
                v-else
                description="今日无待办"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
              />
            </Card>
          </Col>

          <!-- 即将到来 -->
          <Col :span="8">
            <Card
              title="即将到来 (3天内)"
              size="small"
              class="h-96 overflow-auto"
            >
              <template #extra>
                <Badge
                  :count="todayData?.stats.upcomingCount || 0"
                  :number-style="{ backgroundColor: '#52c41a' }"
                />
              </template>
              <List
                v-if="todayData?.upcoming.length"
                :data-source="todayData?.upcoming"
                size="small"
              >
                <template #renderItem="{ item }">
                  <ListItem>
                    <ListItemMeta>
                      <template #avatar>
                        <Avatar
                          :style="{ backgroundColor: '#52c41a' }"
                          :size="32"
                        >
                          <template #icon>
                            <component :is="getTypeIcon(item.type)" />
                          </template>
                        </Avatar>
                      </template>
                      <template #title>{{ item.customerName }}</template>
                      <template #description>
                        <div class="text-xs">{{ item.content }}</div>
                        <div class="text-xs text-gray-400">
                          {{ dayjs(item.nextPlanAt).format('MM-DD HH:mm') }}
                        </div>
                      </template>
                    </ListItemMeta>
                  </ListItem>
                </template>
              </List>
              <Empty
                v-else
                description="暂无即将到来的任务"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
              />
            </Card>
          </Col>
        </Row>
      </TabPane>

      <!-- 全部记录 Tab -->
      <TabPane key="list" tab="全部记录">
        <!-- 筛选区 -->
        <Card class="mb-4" size="small">
          <Space wrap>
            <span class="text-gray-500">状态:</span>
            <Select
              v-model:value="filters.status"
              :options="withAllOption(followUpStatusOptions)"
              placeholder="选择状态"
              style="width: 120px"
              allow-clear
            />
            <span class="ml-4 text-gray-500">类型:</span>
            <Select
              v-model:value="filters.type"
              :options="withAllOption(followUpTypeOptions)"
              placeholder="选择类型"
              style="width: 120px"
              allow-clear
            />
            <Button type="primary" @click="handleFilter">筛选</Button>
            <Button @click="handleReset">重置</Button>
          </Space>
        </Card>

        <!-- 表格区 -->
        <Table v-bind="tableProps" :columns="columns" :scroll="{ x: 1100 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'customer'">
              <div class="flex items-center gap-2">
                <Avatar :size="32">
                  <template #icon><UserOutlined /></template>
                </Avatar>
                <div>
                  <div class="font-medium">{{ record.customerName }}</div>
                  <div
                    v-if="record.customerPhone"
                    class="text-xs text-gray-400"
                  >
                    {{ record.customerPhone }}
                  </div>
                </div>
              </div>
            </template>
            <template v-if="column.key === 'action'">
              <Space>
                <Popconfirm
                  v-if="record.status !== 'COMPLETED'"
                  title="标记为已完成?"
                  @confirm="handleMarkCompleted((record as FollowUpItem).id)"
                >
                  <Button type="link" size="small">完成</Button>
                </Popconfirm>
                <Popconfirm
                  title="确定删除吗？"
                  @confirm="handleDelete((record as FollowUpItem).id)"
                >
                  <Button type="link" size="small" danger>删除</Button>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </TabPane>
    </Tabs>

    <!-- 新增跟进 Modal -->
    <Modal v-model:open="modalVisible" title="新增跟进记录" @ok="handleSubmit">
      <Form layout="vertical" class="mt-4">
        <Form.Item label="客户" required>
          <Select
            v-model:value="formState.customerId"
            placeholder="请选择客户"
            show-search
            :filter-option="
              (input: string, option: any) =>
                option.label.toLowerCase().includes(input.toLowerCase())
            "
            :options="customers.map((c) => ({ value: c.id, label: c.name }))"
          />
        </Form.Item>
        <Form.Item label="跟进方式">
          <Select
            v-model:value="formState.type"
            :options="followUpTypeOptions"
          />
        </Form.Item>
        <Form.Item label="跟进内容" required>
          <Input.TextArea
            v-model:value="formState.content"
            placeholder="请输入跟进内容"
            :rows="4"
          />
        </Form.Item>
        <Form.Item label="计划时间">
          <DatePicker
            v-model:value="formState.nextPlanAt"
            show-time
            placeholder="选择计划执行时间"
            style="width: 100%"
            format="YYYY-MM-DD HH:mm"
          />
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>
