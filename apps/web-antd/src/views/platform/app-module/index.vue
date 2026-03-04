<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Tag,
  Popconfirm,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';

interface AppModuleItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const loading = ref(false);
const dataSource = ref<AppModuleItem[]>([]);
const pagination = ref({ current: 1, pageSize: 20, total: 0 });
const modalVisible = ref(false);
const modalTitle = ref('新增应用模块');
const editingId = ref<string | null>(null);
const formState = ref({
  code: '',
  name: '',
  description: '',
  icon: 'ant-design:appstore-outlined',
  sort: 0,
});

const columns = [
  { title: '模块代码', dataIndex: 'code', key: 'code', width: 120 },
  { title: '模块名称', dataIndex: 'name', key: 'name' },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '图标', dataIndex: 'icon', key: 'icon', width: 200 },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  {
    title: '操作',
    key: 'action',
    width: 150,
  },
];

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
  } catch (e: any) {
    console.error('Fetch error:', e);
    message.error(e.message || '获取应用模块列表失败');
  } finally {
    loading.value = false;
  }
}

function handleAdd() {
  editingId.value = null;
  modalTitle.value = '新增应用模块';
  formState.value = {
    code: '',
    name: '',
    description: '',
    icon: 'ant-design:appstore-outlined',
    sort: 0,
  };
  modalVisible.value = true;
}

async function handleEdit(record: AppModuleItem) {
  editingId.value = record.id;
  modalTitle.value = '编辑应用模块';
  formState.value = {
    code: record.code,
    name: record.name,
    description: record.description || '',
    icon: record.icon || 'ant-design:appstore-outlined',
    sort: record.sort,
  };
  modalVisible.value = true;
}

async function handleDelete(id: string) {
  try {
    await requestClient.delete(`/platform/app-modules/${id}`);
    message.success('删除成功');
    fetchData();
  } catch (e) {
    message.error('删除失败');
  }
}

async function handleSubmit() {
  try {
    if (editingId.value) {
      await requestClient.put(
        `/platform/app-modules/${editingId.value}`,
        formState.value,
      );
      message.success('更新成功');
    } else {
      await requestClient.post('/platform/app-modules', formState.value);
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

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-bold">应用模块管理</h2>
      <Button type="primary" @click="handleAdd">新增模块</Button>
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
            <Popconfirm title="确定删除吗？" @confirm="handleDelete(record.id)">
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <Modal v-model:open="modalVisible" :title="modalTitle" @ok="handleSubmit">
      <Form layout="vertical" class="mt-4">
        <Form.Item label="模块代码" required>
          <Input
            v-model:value="formState.code"
            placeholder="请输入模块代码（如：CRM）"
            :disabled="!!editingId"
          />
        </Form.Item>
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
