<script lang="ts" setup>
import { ref, onMounted, h } from 'vue';
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
  Popconfirm,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';

interface ConfigItem {
  id: string;
  key: string;
  value: string;
  description: string | null;
  category: string;
  valueType: string;
  isEncrypted: boolean;
  isSystem: boolean;
  isPublic: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

const loading = ref(false);
const dataSource = ref<ConfigItem[]>([]);
const pagination = ref({ current: 1, pageSize: 20, total: 0 });
const modalVisible = ref(false);
const modalTitle = ref('新增配置');
const editingId = ref<string | null>(null);
const formState = ref({
  key: '',
  value: '',
  description: '',
  category: 'SYSTEM',
  valueType: 'STRING',
  isPublic: false,
  isSystem: false,
});

const columns = [
  { title: '配置键', dataIndex: 'key', key: 'key', width: 200 },
  { title: '配置值', dataIndex: 'value', key: 'value', ellipsis: true },
  { title: '分类', dataIndex: 'category', key: 'category', width: 100 },
  {
    title: '值类型',
    dataIndex: 'valueType',
    key: 'valueType',
    width: 100,
    customRender: ({ text }: { text: string }) => {
      return h(Tag, { color: 'blue' }, () => text);
    },
  },
  {
    title: '可见性',
    dataIndex: 'isPublic',
    key: 'isPublic',
    width: 100,
    customRender: ({ text }: { text: boolean }) => {
      const color = text ? 'green' : 'orange';
      const label = text ? '公开' : '私有';
      return h(Tag, { color }, () => label);
    },
  },
  {
    title: '系统配置',
    dataIndex: 'isSystem',
    key: 'isSystem',
    width: 100,
    customRender: ({ text }: { text: boolean }) => {
      return text ? h(Tag, { color: 'red' }, () => '系统') : null;
    },
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 180 },
  {
    title: '操作',
    key: 'action',
    width: 150,
  },
];

async function fetchData() {
  loading.value = true;
  try {
    const res = await requestClient.get<{ data: ConfigItem[]; total: number }>(
      '/platform/configs',
      {
        params: {
          page: pagination.value.current,
          pageSize: pagination.value.pageSize,
        },
      },
    );
    if (res && res.data) {
      dataSource.value = res.data;
      pagination.value.total = res.total;
    } else {
      console.error('Invalid response structure:', res);
      message.error('数据格式错误');
    }
  } catch (e: any) {
    console.error('Fetch error:', e);
    message.error(e.message || '获取配置列表失败');
  } finally {
    loading.value = false;
  }
}

function handleAdd() {
  editingId.value = null;
  modalTitle.value = '新增配置';
  formState.value = {
    key: '',
    value: '',
    description: '',
    category: 'SYSTEM',
    valueType: 'STRING',
    isPublic: false,
    isSystem: false,
  };
  modalVisible.value = true;
}

async function handleEdit(record: ConfigItem) {
  if (record.isSystem) {
    message.warning('系统配置不允许编辑');
    return;
  }

  editingId.value = record.id;
  modalTitle.value = '编辑配置';
  formState.value = {
    key: record.key,
    value: record.value,
    description: record.description || '',
    category: record.category,
    valueType: record.valueType,
    isPublic: record.isPublic,
    isSystem: record.isSystem,
  };
  modalVisible.value = true;
}

async function handleDelete(record: ConfigItem) {
  if (record.isSystem) {
    message.warning('系统配置不允许删除');
    return;
  }

  try {
    await requestClient.delete(`/platform/configs/${record.id}`);
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
        `/platform/configs/${editingId.value}`,
        formState.value,
      );
      message.success('更新成功');
    } else {
      await requestClient.post('/platform/configs', formState.value);
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
      <h2 class="text-xl font-bold">系统配置</h2>
      <Button type="primary" @click="handleAdd">新增配置</Button>
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
            <Popconfirm
              title="确定删除吗？"
              @confirm="handleDelete(record)"
              :disabled="record.isSystem"
            >
              <Button
                type="link"
                size="small"
                danger
                :disabled="record.isSystem"
                >删除</Button
              >
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
        <Form.Item label="配置键" required>
          <Input
            v-model:value="formState.key"
            placeholder="如：SYSTEM_NAME"
            :disabled="!!editingId"
          />
        </Form.Item>
        <Form.Item label="配置值" required>
          <Input.TextArea
            v-model:value="formState.value"
            placeholder="请输入配置值"
            :rows="4"
          />
        </Form.Item>
        <Form.Item label="分类" required>
          <Input
            v-model:value="formState.category"
            placeholder="如：SYSTEM, EMAIL, SMS, STORAGE"
          />
        </Form.Item>
        <Form.Item label="值类型" required>
          <Select v-model:value="formState.valueType" placeholder="选择值类型">
            <Select.Option value="STRING">字符串 (STRING)</Select.Option>
            <Select.Option value="NUMBER">数字 (NUMBER)</Select.Option>
            <Select.Option value="BOOLEAN">布尔值 (BOOLEAN)</Select.Option>
            <Select.Option value="JSON">JSON对象 (JSON)</Select.Option>
            <Select.Option value="ARRAY">数组 (ARRAY)</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="描述">
          <Input.TextArea
            v-model:value="formState.description"
            placeholder="请输入描述"
            :rows="2"
          />
        </Form.Item>
        <Form.Item label="可见性">
          <Space>
            <Tag :color="formState.isPublic ? 'green' : 'orange'">
              {{ formState.isPublic ? '公开' : '私有' }}
            </Tag>
            <Button
              size="small"
              @click="formState.isPublic = !formState.isPublic"
            >
              切换为{{ formState.isPublic ? '私有' : '公开' }}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>
