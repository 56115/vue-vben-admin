<template>
  <Page title="任务记录" description="企业微信同步任务历史">
    <!-- 筛选栏 -->
    <Card class="mb-4">
      <div class="filter-bar">
        <Select
          v-model:value="filters.type"
          placeholder="全部类型"
          allow-clear
          style="width: 140px"
          @change="onFilterChange"
        >
          <SelectOption value="WECOM_USER_SYNC">员工同步</SelectOption>
          <SelectOption value="WECOM_CUSTOMER_SYNC">客户同步</SelectOption>
          <SelectOption value="WECOM_FULL_SYNC">全量同步</SelectOption>
          <SelectOption value="WECOM_GROUP_SYNC">群聊同步</SelectOption>
          <SelectOption value="WECOM_DEPT_SYNC">部门同步</SelectOption>
        </Select>

        <Select
          v-model:value="filters.status"
          placeholder="全部状态"
          allow-clear
          style="width: 120px"
          @change="onFilterChange"
        >
          <SelectOption value="COMPLETED">已完成</SelectOption>
          <SelectOption value="FAILED">已失败</SelectOption>
          <SelectOption value="RUNNING">进行中</SelectOption>
          <SelectOption value="PENDING">等待中</SelectOption>
        </Select>

        <RangePicker
          v-model:value="filters.dateRange"
          :show-time="false"
          format="YYYY-MM-DD"
          @change="onFilterChange"
        />

        <Button @click="resetFilters">重置</Button>
        <Button type="primary" :loading="loading" @click="fetchData">
          <template #icon><ReloadOutlined /></template>
          刷新
        </Button>
      </div>
    </Card>

    <!-- 数据表格 -->
    <Card>
      <Table
        :data-source="sessions"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        :expandable="expandableConfig"
        @change="onTableChange"
      >
        <!-- 主表单元格 -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'typeLabel'">
            <Tag :color="typeTagColor(record.type)">{{ record.typeLabel }}</Tag>
          </template>

          <!-- 状态列 -->
          <template v-else-if="column.key === 'status'">
            <Badge
              :status="statusBadgeStatus(record.status)"
              :text="statusLabel(record.status)"
            />
          </template>

          <!-- 耗时列 -->
          <template v-else-if="column.key === 'durationSeconds'">
            {{ formatDuration(record.durationSeconds) }}
          </template>

          <!-- 开始时间列 -->
          <template v-else-if="column.key === 'startedAt'">
            <Tooltip :title="record.startedAt">
              {{ formatTime(record.startedAt) }}
            </Tooltip>
          </template>

          <!-- 错误信息（仅 FAILED 单任务行显示） -->
          <template v-else-if="column.key === 'error'">
            <span
              v-if="record.status === 'FAILED' && record.error"
              class="text-red-500 text-xs"
            >
              {{ record.error.length > 40 ? record.error.slice(0, 40) + '...' : record.error }}
            </span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </template>

        <!-- 展开行：子任务明细（仅多子任务 session，在 Table 组件内部声明） -->
        <template #expandedRowRender="{ record }">
          <Table
            :data-source="record.tasks"
            :columns="taskColumns"
            :pagination="false"
            row-key="type"
            size="small"
            class="sub-task-table"
          >
            <template #bodyCell="{ column, record: task }">
              <template v-if="column.key === 'status'">
                <Badge
                  :status="statusBadgeStatus(task.status)"
                  :text="statusLabel(task.status)"
                />
              </template>

              <template v-else-if="column.key === 'created'">
                {{ task.result?.created ?? '-' }}
              </template>

              <template v-else-if="column.key === 'updated'">
                {{ task.result?.updated ?? '-' }}
              </template>

              <template v-else-if="column.key === 'failed'">
                <span :class="task.result?.failed > 0 ? 'text-red-500' : ''">
                  {{ task.result?.failed ?? '-' }}
                </span>
              </template>

              <template v-else-if="column.key === 'relationsCreated'">
                {{ task.result?.relationsCreated ?? '-' }}
              </template>

              <template v-else-if="column.key === 'duration'">
                {{ taskDuration(task) }}
              </template>

              <template v-else-if="column.key === 'error'">
                <span v-if="task.error" class="text-red-500 text-xs">
                  {{ task.error.length > 50 ? task.error.slice(0, 50) + '...' : task.error }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </template>
            </template>
          </Table>
        </template>
      </Table>
    </Card>
  </Page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import {
  Card,
  Table,
  Select,
  SelectOption,
  Badge,
  Tag,
  Button,
  Tooltip,
  DatePicker,
} from 'ant-design-vue';
import { ReloadOutlined } from '@ant-design/icons-vue';
import { Page } from '@vben/common-ui';
import dayjs from 'dayjs';
import {
  fetchSyncSessions,
  type SyncSessionItem,
  type SyncTaskItem,
  type SyncSessionQuery,
} from '#/api/wecom-sync';

const RangePicker = DatePicker.RangePicker;

defineOptions({ name: 'ChannelRecordsTasks' });

// ==================== 状态 ====================

const loading = ref(false);
const sessions = ref<SyncSessionItem[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

const filters = reactive({
  type: undefined as string | undefined,
  status: undefined as string | undefined,
  dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
});

// ==================== 表格列定义 ====================

const columns = [
  { title: '任务类型', key: 'typeLabel', dataIndex: 'typeLabel', width: 120 },
  { title: '状态', key: 'status', dataIndex: 'status', width: 100 },
  { title: '触发人', key: 'triggeredBy', dataIndex: 'triggeredBy', width: 100 },
  { title: '耗时', key: 'durationSeconds', dataIndex: 'durationSeconds', width: 90 },
  { title: '开始时间', key: 'startedAt', dataIndex: 'startedAt', width: 160 },
  { title: '错误信息', key: 'error', dataIndex: 'error' },
];

const taskColumns = [
  { title: '子任务', key: 'label', dataIndex: 'label', width: 120 },
  { title: '状态', key: 'status', dataIndex: 'status', width: 90 },
  { title: '新增', key: 'created', width: 70 },
  { title: '更新', key: 'updated', width: 70 },
  { title: '失败', key: 'failed', width: 70 },
  { title: '关系', key: 'relationsCreated', width: 70 },
  { title: '耗时', key: 'duration', width: 80 },
  { title: '错误', key: 'error' },
];

// 多子任务行才可展开；单子任务 FAILED 时 session.error 已在行内显示，无需展开
const expandableConfig = {
  rowExpandable: (record: SyncSessionItem) => record.tasks.length > 1,
};

const pagination = computed<TablePaginationConfig>(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (t: number) => `共 ${t} 条`,
}));

// ==================== 数据获取 ====================

async function fetchData() {
  loading.value = true;
  try {
    const query: SyncSessionQuery = {
      page: currentPage.value,
      pageSize: pageSize.value,
    };
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.dateRange?.[0]) {
      query.startDate = filters.dateRange[0].startOf('day').toISOString();
    }
    if (filters.dateRange?.[1]) {
      query.endDate = filters.dateRange[1].endOf('day').toISOString();
    }

    const res = await fetchSyncSessions(query);
    sessions.value = res.items;
    total.value = res.total;
  } catch {
    // requestClient 已处理错误提示
  } finally {
    loading.value = false;
  }
}

function onFilterChange() {
  currentPage.value = 1;
  fetchData();
}

function resetFilters() {
  filters.type = undefined;
  filters.status = undefined;
  filters.dateRange = null;
  currentPage.value = 1;
  fetchData();
}

function onTableChange(pag: TablePaginationConfig) {
  currentPage.value = pag.current ?? 1;
  pageSize.value = pag.pageSize ?? 20;
  fetchData();
}

// ==================== 格式化工具 ====================

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTime(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD HH:mm:ss');
}

function taskDuration(task: SyncTaskItem): string {
  if (!task.startedAt || !task.completedAt) return '-';
  const seconds = Math.round(
    (new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 1000,
  );
  return formatDuration(seconds);
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    COMPLETED: '已完成',
    FAILED: '已失败',
    RUNNING: '进行中',
    PENDING: '等待中',
  };
  return map[status] ?? status;
}

function statusBadgeStatus(status: string): 'success' | 'error' | 'processing' | 'default' {
  const map: Record<string, 'success' | 'error' | 'processing' | 'default'> = {
    COMPLETED: 'success',
    FAILED: 'error',
    RUNNING: 'processing',
    PENDING: 'default',
  };
  return map[status] ?? 'default';
}

function typeTagColor(type: string): string {
  const map: Record<string, string> = {
    WECOM_USER_SYNC: 'blue',
    WECOM_CUSTOMER_SYNC: 'purple',
    WECOM_FULL_SYNC: 'green',
    WECOM_GROUP_SYNC: 'cyan',
    WECOM_DEPT_SYNC: 'orange',
  };
  return map[type] ?? 'default';
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.sub-task-table {
  margin: 0 16px 8px 48px;
}
</style>
