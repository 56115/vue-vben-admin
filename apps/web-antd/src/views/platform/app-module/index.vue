<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import { requestClient } from '#/api/request';
import { hasPermission } from '#/utils/permissions';

interface AppModuleItem {
  id: string;
  code: string;
  name: string;
  description: null | string;
  icon: null | string;
  sort: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const loading = ref(false);
const dataSource = ref<AppModuleItem[]>([]);
const pagination = ref({ current: 1, pageSize: 20, total: 0 });
const modalVisible = ref(false);
const editingId = ref<null | string>(null);
const formState = ref({
  name: '',
  description: '',
  icon: '',
  sort: 0,
  isActive: true,
});

const canEdit = computed(() => hasPermission('PLATFORM:APP_MODULE:EDIT'));
const canDelete = computed(() => hasPermission('PLATFORM:APP_MODULE:DELETE'));
const canOperate = computed(() => canEdit.value || canDelete.value);

const columns = computed(() => {
  const baseColumns = [
    { title: '模块代码', dataIndex: 'code', key: 'code', width: 120 },
    { title: '模块名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '图标', dataIndex: 'icon', key: 'icon', width: 200 },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
    { title: '状态', dataIndex: 'isActive', key: 'isActive', width: 90 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  ];

  return canOperate.value
    ? [...baseColumns, { title: '操作', key: 'action', width: 150 }]
    : baseColumns;
});

async function fetchData() {
  loading.value = true;
  try {
    const res = await requestClient.get<{
      items: AppModuleItem[];
      total: number;
    }>('/platform/app-modules', {
      params: {
        page: pagination.value.current,
        pageSize: pagination.value.pageSize,
      },
    });
    if (res && res.items) {
      dataSource.value = res.items;
      pagination.value.total = res.total;
    } else {
      console.error('Invalid response structure:', res);
      message.error('数据格式错误');
    }
  } catch (error: any) {
    console.error('Fetch error:', error);
    message.error(error.message || '获取应用模块列表失败');
  } finally {
    loading.value = false;
  }
}

function handleEdit(record: AppModuleItem) {
  editingId.value = record.id;
  formState.value = {
    name: record.name,
    description: record.description || '',
    icon: record.icon || '',
    sort: record.sort,
    isActive: record.isActive,
  };
  modalVisible.value = true;
}

async function handleDelete(id: string) {
  try {
    await requestClient.delete(`/platform/app-modules/${id}`);
    message.success('删除成功');
    await fetchData();
  } catch (error: any) {
    message.error(error.message || '删除失败');
  }
}

async function handleSubmit() {
  if (!editingId.value) return;
  try {
    await requestClient.put(
      `/platform/app-modules/${editingId.value}`,
      formState.value,
    );
    message.success('更新成功');
    modalVisible.value = false;
    await fetchData();
  } catch (error: any) {
    message.error(error.message || '更新失败');
  }
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchData();
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold">应用模块目录</h2>
        <p class="mt-1 text-sm text-gray-500">
          系统功能模块目录仅供授权用户维护；租户可用功能请在租户管理中配置订阅。
        </p>
      </div>
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
        <template v-if="column.key === 'isActive'">
          <Tag :color="record.isActive ? 'green' : 'default'">
            {{ record.isActive ? '启用' : '停用' }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button
              v-if="canEdit"
              type="link"
              size="small"
              @click="handleEdit(record)"
            >
              编辑
            </Button>
            <Popconfirm
              v-if="canDelete"
              title="确定停用该模块吗？"
              @confirm="handleDelete(record.id)"
            >
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <Modal v-model:open="modalVisible" title="编辑应用模块" @ok="handleSubmit">
      <Form layout="vertical" class="mt-4">
        <Form.Item label="模块名称" required>
          <Input v-model:value="formState.name" placeholder="请输入模块名称" />
        </Form.Item>
        <Form.Item label="描述">
          <Input.TextArea
            v-model:value="formState.description"
            placeholder="请输入描述"
          />
        </Form.Item>
        <Form.Item label="图标">
          <Input
            v-model:value="formState.icon"
            placeholder="如：ant-design:appstore-outlined"
          />
        </Form.Item>
        <Form.Item label="排序">
          <Input
            v-model:value="formState.sort"
            type="number"
            placeholder="数字越小越靠前"
          />
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>
