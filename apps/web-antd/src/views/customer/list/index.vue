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
  Avatar,
  Card,
  InputSearch,
} from 'ant-design-vue';
import {
  UserOutlined,
  WechatOutlined,
  BarChartOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';

const router = useRouter();
import { useCrudTable, useModalForm } from '#/composables';
import {
  customerStatusOptions,
  customerSourceOptions,
  customerLevelOptions,
  findOption,
  withAllOption,
} from '#/constants/crm-options';
import dayjs from 'dayjs';
import CustomerDetailDrawer from './components/CustomerDetailDrawer.vue';

// ==================== 类型定义 ====================

interface CustomerItem {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  company: string | null;
  gender: string;
  status: string;
  source: string | null;
  customerLevel: string;
  totalAmount: number;
  orderCount: number;
  lastActiveAt: string | null;
  remark: string | null;
  ownerName: string | null;
  createdAt: string;
}

interface CustomerFilters {
  source?: string;
  status?: string;
  customerLevel?: string;
  keyword?: string;
}

interface CustomerFormState {
  name: string;
  phone: string | undefined;
  email: string | undefined;
  company: string | undefined;
  status: string;
  source: string | undefined;
  remark: string | undefined;
}

// ==================== 表格列定义 ====================

const columns = [
  { title: '客户', key: 'customer', width: 220, fixed: 'left' as const },
  { title: '电话', dataIndex: 'phone', key: 'phone', width: 140 },
  {
    title: '公司',
    dataIndex: 'company',
    key: 'company',
    ellipsis: true,
    width: 150,
  },
  {
    title: '等级',
    dataIndex: 'customerLevel',
    key: 'customerLevel',
    width: 100,
    customRender: ({ text }: { text: string }) => {
      const opt = findOption(customerLevelOptions, text);
      return h(
        Tag,
        { color: opt?.color || 'default' },
        () => opt?.label || text,
      );
    },
  },
  {
    title: '来源',
    dataIndex: 'source',
    key: 'source',
    width: 100,
    customRender: ({ text }: { text: string }) => {
      const opt = findOption(customerSourceOptions, text);
      if (!opt) return h(Tag, { color: 'default' }, () => text || '-');
      return h(Tag, { color: opt.color }, () => opt.label);
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    customRender: ({ text }: { text: string }) => {
      const opt = findOption(customerStatusOptions, text);
      return h(
        Tag,
        { color: opt?.color || 'default' },
        () => opt?.label || text,
      );
    },
  },
  {
    title: '消费总额',
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    width: 120,
    customRender: ({ text }: { text: number }) => `¥${(text || 0).toFixed(2)}`,
  },
  { title: '负责人', dataIndex: 'ownerName', key: 'ownerName', width: 100 },
  {
    title: '最后活跃',
    dataIndex: 'lastActiveAt',
    key: 'lastActiveAt',
    width: 120,
    customRender: ({ text }: { text: string }) =>
      text ? dayjs(text).fromNow() : '-',
  },
  { title: '操作', key: 'action', width: 160, fixed: 'right' as const },
];

// ==================== 表格逻辑 ====================

const { tableProps, filters, search, resetFilters, fetchData, handleDelete } =
  useCrudTable<CustomerItem, CustomerFilters>({
    fetchApi: async (params) => {
      const apiParams: Record<string, unknown> = {
        page: params.page,
        pageSize: params.pageSize,
      };
      if (params.source) apiParams.source = params.source;
      if (params.status) apiParams.status = params.status;
      if (params.customerLevel) apiParams.customerLevel = params.customerLevel;
      if (params.keyword) apiParams.keyword = params.keyword;

      return requestClient.get<{ items: CustomerItem[]; total: number }>(
        '/customer/list',
        { params: apiParams },
      );
    },
    deleteApi: async (id) => {
      await requestClient.delete(`/customer/list/${id}`);
    },
  });

// ==================== Modal 逻辑 ====================

const {
  visible: modalVisible,
  formState,
  isEditing,
  openCreate,
  openEdit,
  submit,
} = useModalForm<CustomerFormState>({
  createApi: async (data) => {
    await requestClient.post('/customer/list', data);
  },
  updateApi: async (id, data) => {
    await requestClient.put(`/customer/list/${id}`, data);
  },
  initialValues: () => ({
    name: '',
    phone: undefined,
    email: undefined,
    company: undefined,
    status: 'LEAD',
    source: undefined,
    remark: undefined,
  }),
  afterSubmit: fetchData,
});

// ==================== 详情抽屉 ====================

const detailVisible = ref(false);
const detailCustomerId = ref<number | null>(null);

function handleView(record: CustomerItem) {
  detailCustomerId.value = record.id;
  detailVisible.value = true;
}

// ==================== 事件处理 ====================

function handleEdit(record: CustomerItem) {
  openEdit(record.id, {
    name: record.name,
    phone: record.phone || undefined,
    email: record.email || undefined,
    company: record.company || undefined,
    status: record.status,
    source: record.source || undefined,
    remark: record.remark || undefined,
  });
}

function handleSearch(value: string) {
  filters.value.keyword = value;
  search();
}

function handleFilter() {
  search();
}

function handleReset() {
  filters.value.keyword = '';
  resetFilters();
}

function goToStatistics() {
  router.push('/customer/list/statistics');
}

// ==================== 生命周期 ====================

onMounted(fetchData);
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-bold">客户列表</h2>
      <Space>
        <Button @click="goToStatistics">
          <template #icon><BarChartOutlined /></template>
          统计分析
        </Button>
        <Button type="primary" @click="openCreate">新增客户</Button>
      </Space>
    </div>

    <!-- 筛选区 -->
    <Card class="mb-4" size="small">
      <div class="flex flex-wrap items-center gap-4">
        <InputSearch
          v-model:value="filters.keyword"
          placeholder="搜索客户名称/电话"
          style="width: 200px"
          allow-clear
          @search="handleSearch"
        />
        <Select
          v-model:value="filters.status"
          :options="withAllOption(customerStatusOptions, '全部状态')"
          placeholder="客户状态"
          style="width: 120px"
          allow-clear
        />
        <Select
          v-model:value="filters.customerLevel"
          :options="withAllOption(customerLevelOptions, '全部等级')"
          placeholder="客户等级"
          style="width: 120px"
          allow-clear
        />
        <Select
          v-model:value="filters.source"
          :options="withAllOption(customerSourceOptions, '全部来源')"
          placeholder="来源渠道"
          style="width: 120px"
          allow-clear
        />
        <Button type="primary" @click="handleFilter">筛选</Button>
        <Button @click="handleReset">重置</Button>
      </div>
    </Card>

    <!-- 表格区 -->
    <Table v-bind="tableProps" :columns="columns" :scroll="{ x: 1400 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'customer'">
          <div
            class="flex cursor-pointer items-center gap-2"
            @click="handleView(record as CustomerItem)"
          >
            <Avatar v-if="record.avatar" :src="record.avatar" :size="40" />
            <Avatar v-else :size="40">
              <template #icon><UserOutlined /></template>
            </Avatar>
            <div>
              <div class="font-medium text-blue-600 hover:text-blue-800">
                {{ record.name }}
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-400">
                <WechatOutlined
                  v-if="record.source === 'WECOM'"
                  class="text-green-500"
                />
                <span>订单 {{ record.orderCount || 0 }}</span>
              </div>
            </div>
          </div>
        </template>
        <template v-if="column.key === 'action'">
          <Space>
            <Button
              type="link"
              size="small"
              @click="handleView(record as CustomerItem)"
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              @click="handleEdit(record as CustomerItem)"
            >
              编辑
            </Button>
            <Popconfirm
              title="确定删除吗？"
              @confirm="handleDelete((record as CustomerItem).id)"
            >
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <!-- 新增/编辑 Modal -->
    <Modal
      v-model:open="modalVisible"
      :title="isEditing ? '编辑客户' : '新增客户'"
      @ok="submit"
    >
      <Form layout="vertical" class="mt-4">
        <Form.Item label="客户名称" required>
          <Input v-model:value="formState.name" placeholder="请输入客户名称" />
        </Form.Item>
        <Form.Item label="电话">
          <Input v-model:value="formState.phone" placeholder="请输入电话" />
        </Form.Item>
        <Form.Item label="邮箱">
          <Input v-model:value="formState.email" placeholder="请输入邮箱" />
        </Form.Item>
        <Form.Item label="公司">
          <Input
            v-model:value="formState.company"
            placeholder="请输入公司名称"
          />
        </Form.Item>
        <Form.Item label="状态">
          <Select
            v-model:value="formState.status"
            :options="customerStatusOptions"
          />
        </Form.Item>
        <Form.Item label="来源">
          <Select
            v-model:value="formState.source"
            :options="customerSourceOptions"
            allow-clear
          />
        </Form.Item>
        <Form.Item label="备注">
          <Input.TextArea
            v-model:value="formState.remark"
            placeholder="请输入备注"
          />
        </Form.Item>
      </Form>
    </Modal>

    <!-- 详情抽屉 -->
    <CustomerDetailDrawer
      v-model:open="detailVisible"
      :customer-id="detailCustomerId"
      @refresh="fetchData"
    />
  </div>
</template>
