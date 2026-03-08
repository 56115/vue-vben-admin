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
  Tag,
  Popconfirm,
  Card,
  Drawer,
  Badge,
} from 'ant-design-vue';
import {
  BarChartOutlined,
  TeamOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';
import { useCrudTable, useModalForm } from '#/composables';
import dayjs from 'dayjs';
import {
  getAudiences,
  createAudience,
  updateAudience,
  deleteAudience,
  computeAudience,
  getAudienceMembers,
  type Audience,
  type AudienceStatus,
  type AudienceComputeType,
  type AudienceMember,
} from '#/api/marketing/audience';

const router = useRouter();

// ==================== 状态映射 ====================

const statusMap: Record<AudienceStatus, { text: string; color: string }> = {
  DRAFT: { text: '草稿', color: 'default' },
  COMPUTING: { text: '计算中', color: 'processing' },
  READY: { text: '就绪', color: 'success' },
  EXPIRED: { text: '已过期', color: 'error' },
  ARCHIVED: { text: '已归档', color: 'warning' },
};

const computeTypeMap: Record<AudienceComputeType, { text: string; color: string }> = {
  STATIC: { text: '静态', color: 'blue' },
  DYNAMIC: { text: '动态', color: 'purple' },
};

const statusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '计算中', value: 'COMPUTING' },
  { label: '就绪', value: 'READY' },
  { label: '已过期', value: 'EXPIRED' },
  { label: '已归档', value: 'ARCHIVED' },
];

const computeTypeOptions = [
  { label: '静态', value: 'STATIC' },
  { label: '动态', value: 'DYNAMIC' },
];

// ==================== 表格列定义 ====================

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '名称', dataIndex: 'name', key: 'name', width: 200, ellipsis: true },
  {
    title: '计算类型',
    dataIndex: 'computeType',
    key: 'computeType',
    width: 100,
    customRender: ({ text }: { text: AudienceComputeType }) => {
      const map = computeTypeMap[text];
      return h(Tag, { color: map?.color }, () => map?.text || text);
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    customRender: ({ text }: { text: AudienceStatus }) => {
      const map = statusMap[text];
      return h(Badge, { status: map?.color as any, text: map?.text || text });
    },
  },
  { title: '客户数', dataIndex: 'customerCount', key: 'customerCount', width: 100 },
  { title: '企微客户', dataIndex: 'wecomCount', key: 'wecomCount', width: 100 },
  {
    title: '最后计算',
    dataIndex: 'lastComputedAt',
    key: 'lastComputedAt',
    width: 180,
    customRender: ({ text }: { text: string | null }) =>
      text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
    customRender: ({ text }: { text: string }) =>
      text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
  },
  { title: '操作', key: 'action', width: 280, fixed: 'right' as const },
];

// ==================== 表格逻辑 ====================

interface AudienceFilters {
  keyword?: string;
  status?: AudienceStatus;
  computeType?: AudienceComputeType;
}

const { tableProps, filters, fetchData, handleDelete, refresh } = useCrudTable<Audience, AudienceFilters>({
  fetchApi: async (params) => {
    const response = await getAudiences({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      status: params.status,
      computeType: params.computeType,
    });
    return { items: response.items || [], total: response.total || 0 };
  },
  deleteApi: async (id: string | number) => {
    await deleteAudience(Number(id));
  },
});

// ==================== Modal 逻辑 ====================

interface AudienceFormState {
  name: string;
  description: string;
  computeType: AudienceComputeType;
  filterConditions: {
    keyword?: string;
    tagIds?: number[];
    lifecycleStage?: string;
    hasWecom?: boolean;
  };
}

const { visible, formState, modalTitle, openCreate, openEdit, submit } =
  useModalForm<AudienceFormState>({
    createApi: async (data) => {
      await createAudience({
        name: data.name,
        description: data.description,
        computeType: data.computeType,
        filterConditions: data.filterConditions,
      });
    },
    updateApi: async (id, data) => {
      await updateAudience(Number(id), {
        name: data.name,
        description: data.description,
        computeType: data.computeType,
        filterConditions: data.filterConditions,
      });
    },
    initialValues: () => ({
      name: '',
      description: '',
      computeType: 'STATIC',
      filterConditions: {},
    }),
    afterSubmit: fetchData,
  });

function handleEdit(record: Audience) {
  openEdit(record.id, {
    name: record.name,
    description: record.description || '',
    computeType: record.computeType,
    filterConditions: record.filterConditions || {},
  });
}

// ==================== 计算逻辑 ====================

const computingIds = ref<Set<number>>(new Set());

async function handleCompute(record: Audience) {
  computingIds.value.add(record.id);
  try {
    await computeAudience(record.id);
    refresh();
  } finally {
    computingIds.value.delete(record.id);
  }
}

function isComputing(record: Audience): boolean {
  return record.status === 'COMPUTING' || computingIds.value.has(record.id);
}

// ==================== 成员抽屉 ====================

const membersVisible = ref(false);
const membersLoading = ref(false);
const membersData = ref<AudienceMember[]>([]);
const membersPagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
});
const currentAudience = ref<Audience | null>(null);

const memberColumns = [
  { title: 'ID', dataIndex: 'customerId', width: 80 },
  { title: '客户名称', dataIndex: 'customerName', ellipsis: true },
  { title: '企微ID', dataIndex: 'wecomExternalUserid', ellipsis: true },
  {
    title: '加入时间',
    dataIndex: 'createdAt',
    customRender: ({ text }: { text: string }) =>
      text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
  },
];

async function loadMembers(audienceId: number, page = 1) {
  membersLoading.value = true;
  try {
    const res = await getAudienceMembers(audienceId, {
      page,
      pageSize: membersPagination.value.pageSize,
    });
    membersData.value = res.items || [];
    membersPagination.value = {
      page: res.page,
      pageSize: res.pageSize,
      total: res.total,
    };
  } finally {
    membersLoading.value = false;
  }
}

function handleViewMembers(record: Audience) {
  currentAudience.value = record;
  membersVisible.value = true;
  loadMembers(record.id);
}

function handleMemberTableChange(pag: { current?: number }) {
  if (pag.current && currentAudience.value) {
    loadMembers(currentAudience.value.id, pag.current);
  }
}

// ==================== 详情抽屉 ====================

const detailVisible = ref(false);
const detailAudience = ref<Audience | null>(null);

function showDetail(record: Audience) {
  detailAudience.value = record;
  detailVisible.value = true;
}

// ==================== 导航 ====================

function goToStatistics() {
  router.push('/marketing/audience/statistics');
}

// ==================== 生命周期 ====================

onMounted(fetchData);
</script>

<template>
  <div class="p-5">
    <Card title="人群包管理">
      <template #extra>
        <Space>
          <Button @click="goToStatistics">
            <template #icon><BarChartOutlined /></template>
            统计分析
          </Button>
          <Button type="primary" @click="openCreate">
            <template #icon><PlusOutlined /></template>
            新增人群包
          </Button>
        </Space>
      </template>

      <!-- 筛选区 -->
      <div class="mb-4 flex flex-wrap gap-4">
        <Input
          v-model:value="(filters as AudienceFilters).keyword"
          placeholder="搜索名称"
          style="width: 200px"
          allow-clear
          @press-enter="fetchData"
        />
        <Select
          v-model:value="(filters as AudienceFilters).status"
          placeholder="状态"
          style="width: 150px"
          allow-clear
          :options="statusOptions"
          @change="fetchData"
        />
        <Select
          v-model:value="(filters as AudienceFilters).computeType"
          placeholder="计算类型"
          style="width: 150px"
          allow-clear
          :options="computeTypeOptions"
          @change="fetchData"
        />
        <Button type="primary" @click="fetchData">查询</Button>
        <Button @click="refresh">
          <template #icon><ReloadOutlined /></template>
          刷新
        </Button>
      </div>

      <!-- 表格区 -->
      <Table v-bind="tableProps" :columns="columns" :scroll="{ x: 1200 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <Space>
              <Button
                type="link"
                size="small"
                @click="showDetail(record as Audience)"
              >
                <template #icon><EyeOutlined /></template>
                详情
              </Button>
              <Button
                type="link"
                size="small"
                @click="handleViewMembers(record as Audience)"
              >
                <template #icon><TeamOutlined /></template>
                成员
              </Button>
              <Button
                type="link"
                size="small"
                :loading="isComputing(record as Audience)"
                :disabled="(record as Audience).status === 'COMPUTING'"
                @click="handleCompute(record as Audience)"
              >
                <template #icon><ReloadOutlined v-if="!isComputing(record as Audience)" /></template>
                计算
              </Button>
              <Button
                type="link"
                size="small"
                @click="handleEdit(record as Audience)"
              >
                <template #icon><EditOutlined /></template>
                编辑
              </Button>
              <Popconfirm
                title="确定要删除这个人群包吗？"
                @confirm="handleDelete((record as Audience).id)"
                ok-text="确定"
                cancel-text="取消"
              >
                <Button type="link" danger size="small">
                  <template #icon><DeleteOutlined /></template>
                  删除
                </Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 新增/编辑 Modal -->
    <Modal
      v-model:open="visible"
      :title="modalTitle + '人群包'"
      @ok="submit"
      width="600px"
    >
      <Form :model="formState" layout="vertical">
        <Form.Item label="人群包名称" required>
          <Input v-model:value="formState.name" placeholder="请输入人群包名称" />
        </Form.Item>
        <Form.Item label="计算类型">
          <Select v-model:value="formState.computeType" :options="computeTypeOptions" />
        </Form.Item>
        <Form.Item label="描述">
          <Input.TextArea
            v-model:value="formState.description"
            placeholder="请输入描述"
            :rows="4"
          />
        </Form.Item>
      </Form>
    </Modal>

    <!-- 详情 Drawer -->
    <Drawer
      v-model:open="detailVisible"
      title="人群包详情"
      width="600"
      placement="right"
    >
      <div v-if="detailAudience" class="space-y-4">
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">ID：</span>
          <span>{{ detailAudience.id }}</span>
        </div>
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">名称：</span>
          <span>{{ detailAudience.name }}</span>
        </div>
        <div class="flex items-center">
          <span class="w-24 font-medium text-gray-500">计算类型：</span>
          <Tag :color="computeTypeMap[detailAudience.computeType]?.color">
            {{ computeTypeMap[detailAudience.computeType]?.text }}
          </Tag>
        </div>
        <div class="flex items-center">
          <span class="w-24 font-medium text-gray-500">状态：</span>
          <Badge
            :status="statusMap[detailAudience.status]?.color as any"
            :text="statusMap[detailAudience.status]?.text"
          />
        </div>
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">客户数：</span>
          <span>{{ detailAudience.customerCount }}</span>
        </div>
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">企微客户：</span>
          <span>{{ detailAudience.wecomCount }}</span>
        </div>
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">描述：</span>
          <span>{{ detailAudience.description || '-' }}</span>
        </div>
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">最后计算：</span>
          <span>{{ detailAudience.lastComputedAt ? dayjs(detailAudience.lastComputedAt).format('YYYY-MM-DD HH:mm:ss') : '-' }}</span>
        </div>
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">过期时间：</span>
          <span>{{ detailAudience.expiredAt ? dayjs(detailAudience.expiredAt).format('YYYY-MM-DD HH:mm:ss') : '-' }}</span>
        </div>
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">创建时间：</span>
          <span>{{ dayjs(detailAudience.createdAt).format('YYYY-MM-DD HH:mm:ss') }}</span>
        </div>
      </div>
    </Drawer>

    <!-- 成员 Drawer -->
    <Drawer
      v-model:open="membersVisible"
      :title="currentAudience ? `${currentAudience.name} - 成员列表` : '成员列表'"
      width="700"
      placement="right"
    >
      <Table
        :data-source="membersData"
        :columns="memberColumns"
        :loading="membersLoading"
        :pagination="{
          current: membersPagination.page,
          pageSize: membersPagination.pageSize,
          total: membersPagination.total,
          showSizeChanger: false,
        }"
        row-key="id"
        @change="handleMemberTableChange"
      />
    </Drawer>
  </div>
</template>
