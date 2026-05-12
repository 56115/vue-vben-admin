<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { message, Table, Tag } from 'ant-design-vue';

import { requestClient } from '#/api/request';

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

const columns = [
  { title: '模块代码', dataIndex: 'code', key: 'code', width: 120 },
  { title: '模块名称', dataIndex: 'name', key: 'name' },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '图标', dataIndex: 'icon', key: 'icon', width: 200 },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '状态', dataIndex: 'isActive', key: 'isActive', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
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
  } catch (error: any) {
    console.error('Fetch error:', error);
    message.error(error.message || '获取应用模块列表失败');
  } finally {
    loading.value = false;
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
          系统功能模块目录仅供查看；租户可用功能请在租户管理中配置订阅。
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
      </template>
    </Table>
  </div>
</template>
