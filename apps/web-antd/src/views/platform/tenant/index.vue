<script lang="ts" setup>
import { ref, onMounted, h } from 'vue';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Select,
  Tag,
  Popconfirm,
  Checkbox,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';

interface TenantItem {
  id: string;
  code: string;
  name: string;
  status: string;
  planType: string;
  maxUsers: number;
  maxCustomers: number;
  domain?: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    subscriptions: number;
  };
}

interface AppModule {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
}

const loading = ref(false);
const dataSource = ref<TenantItem[]>([]);
const pagination = ref({ current: 1, pageSize: 20, total: 0 });
const modalVisible = ref(false);
const modalTitle = ref('新增租户');
const editingId = ref<string | null>(null);
const formState = ref({
  code: '',
  name: '',
  domain: '',
  status: 'ACTIVE',
  planType: 'FREE',
  maxUsers: 10,
  maxCustomers: 1000,
});

// Subscription management state
const allAppModules = ref<AppModule[]>([]);
const subscriptionModalVisible = ref(false);
const currentTenantId = ref<string | null>(null);
const currentSubscriptions = ref<string[]>([]);
const subscriptionModalLoading = ref(false);
const appModulesLoading = ref(false);

const columns = [
  { title: '租户代码', dataIndex: 'code', key: 'code', width: 120 },
  { title: '租户名称', dataIndex: 'name', key: 'name', width: 150 },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    customRender: ({ text }: { text: string }) => {
      const statusMap: Record<string, { color: string; label: string }> = {
        ACTIVE: { color: 'green', label: '激活' },
        INACTIVE: { color: 'orange', label: '未激活' },
        SUSPENDED: { color: 'red', label: '已暂停' },
      };
      const status = statusMap[text] || { color: 'default', label: text };
      return h(Tag, { color: status.color }, () => status.label);
    },
  },
  {
    title: '套餐',
    dataIndex: 'planType',
    key: 'planType',
    width: 100,
    customRender: ({ text }: { text: string }) => {
      const planMap: Record<string, string> = {
        FREE: '免费版',
        BASIC: '基础版',
        PROFESSIONAL: '专业版',
        ENTERPRISE: '企业版',
      };
      return planMap[text] || text;
    },
  },
  {
    title: '用户数',
    key: 'userCount',
    width: 80,
    customRender: ({ record }: { record: TenantItem }) => {
      return record._count?.users || 0;
    },
  },
  { title: '用户限额', dataIndex: 'maxUsers', key: 'maxUsers', width: 90 },
  {
    title: '客户限额',
    dataIndex: 'maxCustomers',
    key: 'maxCustomers',
    width: 90,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    customRender: ({ text }: { text: string }) => {
      return new Date(text).toLocaleString('zh-CN');
    },
  },
  {
    title: '操作',
    key: 'action',
    width: 240,
  },
];

async function fetchData() {
  loading.value = true;
  try {
    const res = await requestClient.get<{ data: TenantItem[]; total: number }>(
      '/platform/tenants',
      {
        params: {
          page: pagination.value.current,
          pageSize: pagination.value.pageSize,
        },
      },
    );
    dataSource.value = res.data;
    pagination.value.total = res.total;
  } catch (e: any) {
    console.error(e);
    message.error(e.message || '获取租户列表失败');
  } finally {
    loading.value = false;
  }
}

function handleAdd() {
  editingId.value = null;
  modalTitle.value = '新增租户';
  formState.value = {
    code: '',
    name: '',
    domain: '',
    status: 'ACTIVE',
    planType: 'FREE',
    maxUsers: 10,
    maxCustomers: 1000,
  };
  modalVisible.value = true;
}

async function handleEdit(record: TenantItem) {
  editingId.value = record.id;
  modalTitle.value = '编辑租户';
  formState.value = {
    code: record.code,
    name: record.name,
    domain: record.domain || '',
    status: record.status,
    planType: record.planType,
    maxUsers: record.maxUsers,
    maxCustomers: record.maxCustomers,
  };
  modalVisible.value = true;
}

async function handleDelete(id: string) {
  try {
    await requestClient.delete(`/platform/tenants/${id}`);
    message.success('删除成功');
    fetchData();
  } catch (e: any) {
    message.error(e.message || '删除失败');
  }
}

async function handleSubmit() {
  try {
    if (editingId.value) {
      await requestClient.put(
        `/platform/tenants/${editingId.value}`,
        formState.value,
      );
      message.success('更新成功');
    } else {
      await requestClient.post('/platform/tenants', formState.value);
      message.success('创建成功');
    }
    modalVisible.value = false;
    fetchData();
  } catch (e: any) {
    message.error(e.message || '操作失败');
  }
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchData();
}

// Subscription management functions
async function fetchAllAppModules() {
  appModulesLoading.value = true;
  try {
    const res = await requestClient.get<{ items: AppModule[]; total: number }>(
      '/platform/app-modules/subscription-options',
    );
    allAppModules.value = res.items || [];
  } catch (e: any) {
    console.error('获取应用模块列表失败:', e);
    message.error(e?.message || '获取应用模块列表失败，请检查权限或联系管理员');
    allAppModules.value = [];
  } finally {
    appModulesLoading.value = false;
  }
}

async function handleManageSubscriptions(record: TenantItem) {
  currentTenantId.value = record.id;
  subscriptionModalVisible.value = true;

  // Get tenant's current subscriptions
  try {
    const res = await requestClient.get<{ appModule: AppModule }[]>(
      `/platform/tenants/${record.id}/subscriptions`,
    );
    currentSubscriptions.value = res.map((s) => s.appModule.code);
  } catch (e: any) {
    console.error(e);
    message.error(e.message || '获取租户订阅失败');
    currentSubscriptions.value = [];
  }
}

async function handleSubscriptionSubmit() {
  if (!currentTenantId.value) return;

  subscriptionModalLoading.value = true;
  try {
    await requestClient.put(
      `/platform/tenants/${currentTenantId.value}/subscriptions`,
      {
        appModuleCodes: currentSubscriptions.value,
      },
    );
    message.success('订阅管理成功');
    subscriptionModalVisible.value = false;
    fetchData();
  } catch (e: any) {
    message.error(e.message || '订阅管理失败');
  } finally {
    subscriptionModalLoading.value = false;
  }
}

onMounted(() => {
  fetchData();
  fetchAllAppModules();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-bold">租户管理</h2>
      <Button type="primary" @click="handleAdd">新增租户</Button>
    </div>

    <Table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Space>
            <Button type="link" size="small" @click="handleEdit(record)"
              >编辑</Button
            >
            <Button
              type="link"
              size="small"
              @click="handleManageSubscriptions(record)"
              >管理订阅</Button
            >
            <Popconfirm title="确定删除吗？" @confirm="handleDelete(record.id)">
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalVisible"
      :title="modalTitle"
      @ok="handleSubmit"
      width="600px"
    >
      <Form layout="vertical" class="mt-4">
        <Form.Item label="租户代码" required>
          <Input
            v-model:value="formState.code"
            placeholder="请输入租户代码（英文字母）"
            :disabled="!!editingId"
          />
        </Form.Item>
        <Form.Item label="租户名称" required>
          <Input v-model:value="formState.name" placeholder="请输入租户名称" />
        </Form.Item>
        <Form.Item label="域名">
          <Input
            v-model:value="formState.domain"
            placeholder="请输入域名（可选）"
          />
        </Form.Item>
        <Form.Item label="状态">
          <Select v-model:value="formState.status">
            <Select.Option value="ACTIVE">激活</Select.Option>
            <Select.Option value="INACTIVE">未激活</Select.Option>
            <Select.Option value="SUSPENDED">已暂停</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="套餐类型">
          <Select v-model:value="formState.planType">
            <Select.Option value="FREE">免费版</Select.Option>
            <Select.Option value="BASIC">基础版</Select.Option>
            <Select.Option value="PROFESSIONAL">专业版</Select.Option>
            <Select.Option value="ENTERPRISE">企业版</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="用户限额">
          <Input
            v-model:value="formState.maxUsers"
            type="number"
            placeholder="请输入用户限额"
          />
        </Form.Item>
        <Form.Item label="客户限额">
          <Input
            v-model:value="formState.maxCustomers"
            type="number"
            placeholder="请输入客户限额"
          />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      v-model:open="subscriptionModalVisible"
      title="管理订阅"
      @ok="handleSubscriptionSubmit"
      :confirmLoading="subscriptionModalLoading"
      width="600px"
    >
      <div class="mt-4">
        <p class="mb-4 text-gray-600">
          请选择租户可以使用的应用模块（可多选）：
        </p>
        <div v-if="appModulesLoading" class="py-8 text-center text-gray-500">
          加载中...
        </div>
        <template v-else-if="allAppModules.length > 0">
          <Checkbox.Group
            v-model:value="currentSubscriptions"
            style="width: 100%"
          >
            <div class="grid grid-cols-1 gap-3">
              <Checkbox
                v-for="module in allAppModules"
                :key="module.id"
                :value="module.code"
                class="mb-2"
              >
                <div class="flex flex-col">
                  <span class="font-medium">{{ module.name }}</span>
                  <span class="text-xs text-gray-500">{{
                    module.description
                  }}</span>
                </div>
              </Checkbox>
            </div>
          </Checkbox.Group>
        </template>
        <div v-else class="py-8 text-center text-gray-500">
          暂无应用模块，请联系管理员配置系统模块
        </div>
      </div>
    </Modal>
  </div>
</template>
