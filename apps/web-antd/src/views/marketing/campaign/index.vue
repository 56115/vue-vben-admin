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
} from 'ant-design-vue';
import { BarChartOutlined, TeamOutlined } from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';
import { useCrudTable, useModalForm } from '#/composables';
import {
  campaignStatusOptions,
  campaignTypeOptions,
  findOption,
} from '#/constants/crm-options';
import dayjs from 'dayjs';

const router = useRouter();

// ==================== 类型定义 ====================

interface CampaignItem {
  id: number;
  name: string;
  description: string | null;
  type: string;
  status: string;
  totalTarget: number;
  totalSent: number;
  totalDelivered: number;
  approvedAt: string | null;
  createdAt: string;
  createdBy: string | null;
}

interface CampaignFormState {
  name: string;
  description: string;
  type: string;
}

// ==================== 表格列定义 ====================

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '活动名称', dataIndex: 'name', key: 'name', width: 200 },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 120,
    customRender: ({ text }: { text: string }) => {
      const opt = findOption(campaignTypeOptions, text);
      return h(
        Tag,
        { color: opt?.color || 'default' },
        () => opt?.label || text,
      );
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    customRender: ({ text }: { text: string }) => {
      const opt = findOption(campaignStatusOptions, text);
      return h(
        Tag,
        { color: opt?.color || 'default' },
        () => opt?.label || text,
      );
    },
  },
  {
    title: '目标人数',
    dataIndex: 'totalTarget',
    key: 'totalTarget',
    width: 100,
  },
  { title: '已发送', dataIndex: 'totalSent', key: 'totalSent', width: 100 },
  {
    title: '已送达',
    dataIndex: 'totalDelivered',
    key: 'totalDelivered',
    width: 100,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
    customRender: ({ text }: { text: string }) =>
      text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
  },
  { title: '操作', key: 'action', width: 200, fixed: 'right' as const },
];

// ==================== 表格逻辑 ====================

const { tableProps, fetchData, handleDelete } = useCrudTable<CampaignItem>({
  fetchApi: async (params) => {
    const response = await requestClient.get<{
      items: CampaignItem[];
      total: number;
    }>('/marketing/campaign', {
      params: { page: params.page, pageSize: params.pageSize },
    });
    return { items: response.items || [], total: response.total || 0 };
  },
  deleteApi: async (id) => {
    await requestClient.delete(`/marketing/campaign/${id}`);
  },
});

// ==================== Modal 逻辑 ====================

const { visible, formState, isEditing, openCreate, openEdit, submit } =
  useModalForm<CampaignFormState>({
    createApi: async (data) => {
      await requestClient.post('/marketing/campaign', data);
    },
    updateApi: async (id, data) => {
      await requestClient.put(`/marketing/campaign/${id}`, data);
    },
    initialValues: () => ({
      name: '',
      description: '',
      type: 'MASS_MESSAGE',
    }),
    afterSubmit: fetchData,
  });

function handleEdit(record: CampaignItem) {
  openEdit(record.id, {
    name: record.name,
    description: record.description || '',
    type: record.type,
  });
}

// ==================== 详情抽屉 ====================

const detailVisible = ref(false);
const detailCampaign = ref<CampaignItem | null>(null);

function showDetail(record: CampaignItem) {
  detailCampaign.value = record;
  detailVisible.value = true;
}

function goToStatistics() {
  router.push('/marketing/campaign/statistics');
}

function goToAudienceStatistics() {
  router.push('/marketing/audience/statistics');
}

// ==================== 生命周期 ====================

onMounted(fetchData);
</script>

<template>
  <div class="p-5">
    <Card title="营销活动管理">
      <template #extra>
        <Space>
          <Button @click="goToAudienceStatistics">
            <template #icon><TeamOutlined /></template>
            人群包统计
          </Button>
          <Button @click="goToStatistics">
            <template #icon><BarChartOutlined /></template>
            统计分析
          </Button>
          <Button type="primary" @click="openCreate">新增活动</Button>
        </Space>
      </template>

      <!-- 表格区 -->
      <Table v-bind="tableProps" :columns="columns" :scroll="{ x: 1200 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <Space>
              <Button
                type="link"
                size="small"
                @click="showDetail(record as CampaignItem)"
              >
                详情
              </Button>
              <Button
                type="link"
                size="small"
                @click="handleEdit(record as CampaignItem)"
              >
                编辑
              </Button>
              <Popconfirm
                title="确定要删除这个营销活动吗？"
                @confirm="handleDelete((record as CampaignItem).id)"
                ok-text="确定"
                cancel-text="取消"
              >
                <Button type="link" danger size="small">删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 新增/编辑 Modal -->
    <Modal
      v-model:open="visible"
      :title="isEditing ? '编辑营销活动' : '新增营销活动'"
      @ok="submit"
      width="600px"
    >
      <Form :model="formState" layout="vertical">
        <Form.Item label="活动名称" required>
          <Input v-model:value="formState.name" placeholder="请输入活动名称" />
        </Form.Item>
        <Form.Item label="活动类型">
          <Select
            v-model:value="formState.type"
            :options="campaignTypeOptions"
          />
        </Form.Item>
        <Form.Item label="活动描述">
          <Input.TextArea
            v-model:value="formState.description"
            placeholder="请输入活动描述"
            :rows="4"
          />
        </Form.Item>
      </Form>
    </Modal>

    <!-- 详情 Drawer -->
    <Drawer
      v-model:open="detailVisible"
      title="营销活动详情"
      width="600"
      placement="right"
    >
      <div v-if="detailCampaign" class="space-y-4">
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">活动ID：</span>
          <span>{{ detailCampaign.id }}</span>
        </div>
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">活动名称：</span>
          <span>{{ detailCampaign.name }}</span>
        </div>
        <div class="flex items-center">
          <span class="w-24 font-medium text-gray-500">活动类型：</span>
          <Tag
            :color="findOption(campaignTypeOptions, detailCampaign.type)?.color"
          >
            {{ findOption(campaignTypeOptions, detailCampaign.type)?.label }}
          </Tag>
        </div>
        <div class="flex items-center">
          <span class="w-24 font-medium text-gray-500">活动状态：</span>
          <Tag
            :color="
              findOption(campaignStatusOptions, detailCampaign.status)?.color
            "
          >
            {{
              findOption(campaignStatusOptions, detailCampaign.status)?.label
            }}
          </Tag>
        </div>
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">目标人数：</span>
          <span>{{ detailCampaign.totalTarget }}</span>
        </div>
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">已发送：</span>
          <span>{{ detailCampaign.totalSent }}</span>
        </div>
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">已送达：</span>
          <span>{{ detailCampaign.totalDelivered }}</span>
        </div>
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">活动描述：</span>
          <span>{{ detailCampaign.description || '-' }}</span>
        </div>
        <div class="flex">
          <span class="w-24 font-medium text-gray-500">创建时间：</span>
          <span>{{
            dayjs(detailCampaign.createdAt).format('YYYY-MM-DD HH:mm:ss')
          }}</span>
        </div>
      </div>
    </Drawer>
  </div>
</template>
