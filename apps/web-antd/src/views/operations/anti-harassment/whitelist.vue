<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import {
  Button,
  Space,
  message,
  Card,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  Tag,
} from 'ant-design-vue';
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';

// Types
interface WhitelistItem {
  id: number;
  externalUserid: string;
  nickname: string;
  reason: string;
  sharedBy: string;
  sharedAt: string;
  createdAt: string;
}

interface Customer {
  id: number;
  name: string;
  wecomExternalUserid: string;
}

// State
const loading = ref(false);
const whitelist = ref<WhitelistItem[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

// Search
const searchKeyword = ref('');

// Modal state
const addModalVisible = ref(false);
const customers = ref<Customer[]>([]);
const customerLoading = ref(false);

// Form state
const formState = ref({
  customerId: undefined as number | undefined,
  shareEnabled: true,
  sharedTo: 'INDIVIDUAL' as 'INDIVIDUAL' | 'ORGANIZATION',
});

// Config
const shareConfigEnabled = ref(true);

// Table columns
const columns = [
  { title: '客户名称', dataIndex: 'nickname', key: 'nickname' },
  { title: '共享人', dataIndex: 'sharedBy', key: 'sharedBy' },
  { title: '共享时间', dataIndex: 'sharedAt', key: 'sharedAt' },
  {
    title: '操作',
    key: 'actions',
    width: 100,
  },
];

// API calls
async function fetchWhitelist() {
  loading.value = true;
  try {
    const res = await requestClient.get<{
      items: WhitelistItem[];
      total: number;
    }>('/operations/anti-harassment/whitelist', {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        keyword: searchKeyword.value || undefined,
      },
    });
    whitelist.value = res.items || [];
    total.value = res.total || 0;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function searchCustomers(keyword: string) {
  if (!keyword) {
    customers.value = [];
    return;
  }
  customerLoading.value = true;
  try {
    const res = await requestClient.get<{ items: Customer[] }>(
      '/customer/list',
      {
        params: { keyword, pageSize: 20 },
      },
    );
    customers.value = res.items || [];
  } catch (e) {
    console.error(e);
  } finally {
    customerLoading.value = false;
  }
}

async function handleAdd() {
  if (!formState.value.customerId) {
    message.warning('请选择客户');
    return;
  }

  loading.value = true;
  try {
    await requestClient.post('/operations/anti-harassment/whitelist', {
      customerId: formState.value.customerId,
      shareEnabled: formState.value.shareEnabled,
      sharedTo: formState.value.sharedTo,
    });
    message.success('添加成功');
    addModalVisible.value = false;
    formState.value = {
      customerId: undefined,
      shareEnabled: true,
      sharedTo: 'INDIVIDUAL',
    };
    fetchWhitelist();
  } catch (e: any) {
    message.error(e.message || '添加失败');
  } finally {
    loading.value = false;
  }
}

async function handleDelete(id: number) {
  try {
    await requestClient.delete(`/operations/anti-harassment/whitelist/${id}`);
    message.success('删除成功');
    fetchWhitelist();
  } catch (e: any) {
    message.error(e.message || '删除失败');
  }
}

async function handleToggleShare(enabled: boolean) {
  try {
    await requestClient.patch('/operations/anti-harassment/whitelist/config', {
      shareEnabled: enabled,
    });
    message.success('设置已更新');
  } catch (e: any) {
    message.error(e.message || '设置失败');
  }
}

function handleSearch() {
  currentPage.value = 1;
  fetchWhitelist();
}

function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  fetchWhitelist();
}

function goBack() {
  window.history.back();
}

onMounted(() => {
  fetchWhitelist();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center">
      <Button type="text" @click="goBack">
        <ArrowLeftOutlined />
      </Button>
      <h2 class="ml-2 text-xl font-bold">不受规则限制的人员</h2>
    </div>

    <Card class="mb-4">
      <div class="text-gray-600">
        此名单中的客户将不会触发防骚扰规则。可通过标记客户进入此名单，企业还可以设置成员之间共享使用此名单。
      </div>

      <div
        class="mt-4 flex items-center justify-between rounded bg-gray-50 p-4"
      >
        <div class="flex items-center">
          <Switch
            v-model:checked="shareConfigEnabled"
            @change="handleToggleShare"
          />
          <span class="ml-2">开启</span>
          <span class="ml-4 text-gray-500">
            开启后，成员之间共享使用此名单，企业可以管理共享的名单。
          </span>
        </div>
      </div>
    </Card>

    <Card>
      <div class="mb-4 flex justify-between">
        <Space>
          <Input
            v-model:value="searchKeyword"
            placeholder="搜索客户昵称"
            style="width: 200px"
            allow-clear
            @press-enter="handleSearch"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </Input>
          <Select placeholder="共享人" style="width: 120px" allow-clear>
            <Select.Option value="">请选择</Select.Option>
          </Select>
        </Space>

        <Button type="primary" @click="addModalVisible = true">
          <PlusOutlined /> 添加
        </Button>
      </div>

      <div class="mb-2 text-sm text-gray-500">
        不受规则限制的人员 共 {{ total }} 位客户
        <a class="ml-2">查看</a>
      </div>

      <Table
        :columns="columns"
        :data-source="whitelist"
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
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <Popconfirm
              title="确定要移除此客户吗？"
              @confirm="handleDelete(record.id)"
            >
              <Button type="link" size="small" danger>
                <DeleteOutlined /> 移除
              </Button>
            </Popconfirm>
          </template>
        </template>

        <template #emptyText>
          <div class="py-8 text-center text-gray-400">
            <div class="mb-2">0位客户</div>
            <div class="text-xs">客户名称 | 共享人 | 共享时间</div>
          </div>
        </template>
      </Table>

      <div class="mt-2 text-xs text-gray-400">填加后可看到共享的信息</div>
    </Card>

    <!-- Add Modal -->
    <Modal
      v-model:open="addModalVisible"
      title="添加不受规则限制的人员"
      @ok="handleAdd"
      :confirmLoading="loading"
    >
      <Form layout="vertical" class="mt-4">
        <Form.Item label="选择客户" required>
          <Select
            v-model:value="formState.customerId"
            show-search
            placeholder="搜索客户昵称"
            :filter-option="false"
            :loading="customerLoading"
            @search="searchCustomers"
          >
            <Select.Option
              v-for="customer in customers"
              :key="customer.id"
              :value="customer.id"
            >
              {{ customer.name }}
            </Select.Option>
          </Select>
          <div class="mt-1 text-xs text-gray-400">选择客户支持搜索</div>
        </Form.Item>

        <Form.Item label="共享人">
          <Select v-model:value="formState.sharedTo" placeholder="请选择">
            <Select.Option value="INDIVIDUAL">个人</Select.Option>
            <Select.Option value="ORGANIZATION">组织</Select.Option>
          </Select>
          <div class="mt-1 text-xs text-gray-400">
            共享人可选择【个人】或是【组织】
          </div>
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>
