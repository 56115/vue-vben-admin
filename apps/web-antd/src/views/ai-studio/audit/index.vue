<template>
  <Page>
    <a-card>
      <a-form layout="inline" :model="filter" @finish="reload">
        <a-form-item label="Action">
          <a-input v-model:value="filter.action" placeholder="e.g. prompt:update" />
        </a-form-item>
        <a-form-item label="Resource">
          <a-input v-model:value="filter.resource" placeholder="e.g. PromptTemplate" />
        </a-form-item>
        <a-form-item label="Scope">
          <a-select v-model:value="filter.scope" allow-clear style="width: 120px;">
            <a-select-option value="TENANT">TENANT</a-select-option>
            <a-select-option value="PLATFORM">PLATFORM</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="时间范围">
          <a-range-picker v-model:value="filter.dateRange" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit">查询</a-button>
        </a-form-item>
      </a-form>

      <a-table
        :columns="columns"
        :dataSource="rows"
        :loading="loading"
        :pagination="pagination"
        rowKey="id"
        @change="onPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'actions'">
            <a @click="openDetail(record)">详情</a>
          </template>
        </template>
      </a-table>
    </a-card>

    <AuditLogDetail
      v-model:visible="detailVisible"
      :row="selectedRow" />
  </Page>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Page } from '@vben/common-ui';
import AuditLogDetail from './components/AuditLogDetail.vue';
import { auditApi, type AuditLogRow } from './api';

const filter = reactive<{
  action?: string;
  resource?: string;
  scope?: 'TENANT' | 'PLATFORM';
  dateRange?: [string, string];
}>({});

const rows = ref<AuditLogRow[]>([]);
const loading = ref(false);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const detailVisible = ref(false);
const selectedRow = ref<AuditLogRow | null>(null);

const columns = [
  { title: 'ID', dataIndex: 'id', width: 120 },
  { title: 'Scope', dataIndex: 'scope', width: 90 },
  { title: 'Action', dataIndex: 'action' },
  { title: 'Resource', dataIndex: 'resource' },
  { title: 'Actor', dataIndex: 'actorUserId', width: 100 },
  { title: 'CreatedAt', dataIndex: 'createdAt', width: 180 },
  { title: '操作', dataIndex: 'actions', width: 80 },
];

async function reload() {
  loading.value = true;
  try {
    const res = await auditApi.list({
      page: pagination.current,
      pageSize: pagination.pageSize,
      action: filter.action,
      resource: filter.resource,
      scope: filter.scope,
      fromDate: filter.dateRange?.[0],
      toDate: filter.dateRange?.[1],
    });
    rows.value = res.items;
    pagination.total = res.total;
  } finally {
    loading.value = false;
  }
}

function onPageChange(pg: any) {
  pagination.current = pg.current;
  pagination.pageSize = pg.pageSize;
  reload();
}

function openDetail(row: AuditLogRow) {
  selectedRow.value = row;
  detailVisible.value = true;
}

onMounted(reload);
</script>
