<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Card, Table, Tag, Button, Spin, Empty } from 'ant-design-vue';
import {
  HistoryOutlined,
  ArrowRightOutlined,
  BarChartOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';
import dayjs from 'dayjs';

interface CampaignItem {
  id: number;
  name: string;
  status: string;
  type: string;
  totalTarget: number;
  createdAt: string;
}

const router = useRouter();

// 状态
const loading = ref(false);
const campaigns = ref<CampaignItem[]>([]);

// 表格列定义
const columns = [
  { title: '活动名称', dataIndex: 'name', key: 'name', ellipsis: true },
  {
    title: '匹配人数',
    dataIndex: 'totalTarget',
    key: 'totalTarget',
    width: 100,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 150,
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
  },
];

// 状态映射
const statusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'default' },
  SCHEDULED: { label: '已排期', color: 'processing' },
  RUNNING: { label: '进行中', color: 'success' },
  PAUSED: { label: '已暂停', color: 'warning' },
  COMPLETED: { label: '已完成', color: 'default' },
  CANCELLED: { label: '已取消', color: 'error' },
};

// 获取最近 AI 活动
async function fetchRecentCampaigns() {
  loading.value = true;
  try {
    const response = await requestClient.get<{
      items: CampaignItem[];
      total: number;
    }>('/marketing/campaign', {
      params: { page: 1, pageSize: 5 },
    });
    campaigns.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch recent campaigns:', error);
  } finally {
    loading.value = false;
  }
}

// 跳转到活动列表
function goToCampaigns() {
  router.push('/marketing/campaign');
}

// 跳转到统计页面
function goToStatistics() {
  router.push('/marketing/ai-marketing/statistics');
}

onMounted(() => {
  fetchRecentCampaigns();
});

defineOptions({ name: 'RecentCampaigns' });
</script>

<template>
  <Card :bordered="false">
    <template #title>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <HistoryOutlined />
          <span>最近 AI 活动</span>
        </div>
        <Button type="link" size="small" @click="goToCampaigns">
          查看更多 <ArrowRightOutlined />
        </Button>
      </div>
    </template>

    <Spin :spinning="loading">
      <Table
        v-if="campaigns.length > 0"
        :columns="columns"
        :data-source="campaigns"
        :pagination="false"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag :color="statusMap[record.status]?.color || 'default'">
              {{ statusMap[record.status]?.label || record.status }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ dayjs(record.createdAt).format('MM-DD HH:mm') }}
          </template>
          <template v-else-if="column.key === 'action'">
            <Button type="link" size="small" @click="goToStatistics">
              <BarChartOutlined /> 统计
            </Button>
          </template>
        </template>
      </Table>

      <Empty v-else description="暂无活动" />
    </Spin>
  </Card>
</template>
