<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import {
  Button,
  Space,
  message,
  Tag,
  Card,
  Table,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Popconfirm,
} from 'ant-design-vue';
import {
  PlusOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SendOutlined,
  DeleteOutlined,
  EditOutlined,
  BarChartOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';
import { requestClient } from '#/api/request';
import { useCrudTable, useModalForm } from '#/composables';
import dayjs from 'dayjs';
import { MaterialPicker } from '#/components';
import type { Material, MaterialType } from '#/components';

// ==================== 类型定义 ====================

interface ScheduledMessage {
  id: number;
  name: string;
  content: string;
  scheduledAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'SENT' | 'FAILED' | 'CANCELLED';
  targetType: 'CUSTOMER' | 'TAG' | 'ALL';
  targetCount: number;
  createdAt: string;
}

interface MessageAttachment {
  id?: string;
  type: 'image' | 'video' | 'file' | 'link';
  materialId?: number; // For usage tracking
  mediaId?: number;
  url?: string;
  name?: string;
}

interface FormState {
  name: string;
  content: string;
  scheduledAt: dayjs.Dayjs | undefined;
  targetType: 'CUSTOMER' | 'TAG' | 'ALL';
  targetIds: number[];
  attachments: MessageAttachment[];
}

// ==================== 常量 ====================

const columns = [
  { title: '任务名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '消息内容', dataIndex: 'content', key: 'content', ellipsis: true },
  {
    title: '计划发送时间',
    dataIndex: 'scheduledAt',
    key: 'scheduledAt',
    width: 180,
  },
  {
    title: '目标数量',
    dataIndex: 'targetCount',
    key: 'targetCount',
    width: 100,
  },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 200 },
];

const statusMap: Record<string, { text: string; color: string }> = {
  PENDING: { text: '待确认', color: 'orange' },
  CONFIRMED: { text: '待发送', color: 'blue' },
  SENT: { text: '已发送', color: 'green' },
  FAILED: { text: '发送失败', color: 'red' },
  CANCELLED: { text: '已取消', color: 'default' },
};

const targetTypeOptions = [
  { value: 'CUSTOMER', label: '指定客户' },
  { value: 'TAG', label: '按标签' },
  { value: 'ALL', label: '全部客户' },
];

// ==================== 表格逻辑 ====================

const { tableProps, fetchData } = useCrudTable<ScheduledMessage>({
  fetchApi: async (params) => {
    const res = await requestClient.get<{
      items: ScheduledMessage[];
      total?: number;
    }>('/messaging/scheduled', {
      params: { page: params.page, pageSize: params.pageSize },
    });
    return { items: res.items || [], total: res.total || 0 };
  },
});

// ==================== Modal 逻辑 ====================

// Material Picker state
const materialPickerVisible = ref(false);
const materialPickerType = ref<MaterialType>('ALL');

const { visible, formState, isEditing, openCreate, openEdit, submit } =
  useModalForm<FormState>({
    createApi: async (data) => {
      await requestClient.post('/messaging/scheduled', {
        ...data,
        scheduledAt: data.scheduledAt?.toISOString(),
        attachments: data.attachments.map((att) => ({
          type: att.type,
          materialId: att.materialId,
          mediaId: att.mediaId,
          url: att.url,
        })),
      });
    },
    updateApi: async (id, data) => {
      await requestClient.put(`/messaging/scheduled/${id}`, {
        ...data,
        scheduledAt: data.scheduledAt?.toISOString(),
        attachments: data.attachments.map((att) => ({
          type: att.type,
          materialId: att.materialId,
          mediaId: att.mediaId,
          url: att.url,
        })),
      });
    },
    initialValues: () => ({
      name: '',
      content: '',
      scheduledAt: undefined,
      targetType: 'CUSTOMER',
      targetIds: [],
      attachments: [],
    }),
    afterSubmit: fetchData,
  });

// ==================== 素材选择逻辑 ====================

function generateAttachmentId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function handleOpenMaterialPicker() {
  materialPickerType.value = 'ALL';
  materialPickerVisible.value = true;
}

function handleMaterialSelect(selectedMaterials: Material[]) {
  const newAttachments: MessageAttachment[] = selectedMaterials.map(
    (material) => {
      const att: MessageAttachment = {
        id: generateAttachmentId(),
        type: material.type.toLowerCase() as
          | 'image'
          | 'video'
          | 'file'
          | 'link',
        materialId: material.id, // Important: for usage tracking
        name: material.name,
      };

      if (
        material.type === 'IMAGE' ||
        material.type === 'VIDEO' ||
        material.type === 'FILE'
      ) {
        if (material.mediaIds && material.mediaIds.length > 0) {
          att.mediaId = material.mediaIds[0];
        }
      } else if (material.type === 'LINK' && material.linkUrl) {
        att.url = material.linkUrl;
      }

      return att;
    },
  );

  formState.value.attachments = [
    ...formState.value.attachments,
    ...newAttachments,
  ];

  materialPickerVisible.value = false;
}

function handleRemoveAttachment(id: string) {
  formState.value.attachments = formState.value.attachments.filter(
    (att) => att.id !== id,
  );
}

// ==================== 事件处理 ====================

function handleEdit(record: ScheduledMessage) {
  openEdit(record.id, {
    name: record.name,
    content: record.content,
    scheduledAt: dayjs(record.scheduledAt),
    targetType: record.targetType,
    targetIds: [],
    attachments: [],
  });
}

async function handleConfirm(id: number) {
  try {
    await requestClient.post(`/messaging/scheduled/${id}/confirm`);
    message.success('已确认，将按计划发送');
    fetchData();
  } catch {
    message.error('确认失败');
  }
}

async function handleExecute(id: number) {
  try {
    await requestClient.post(`/messaging/scheduled/${id}/execute`);
    message.success('已立即发送');
    fetchData();
  } catch {
    message.error('发送失败');
  }
}

async function handleDelete(id: number) {
  try {
    await requestClient.delete(`/messaging/scheduled/${id}`);
    message.success('删除成功');
    fetchData();
  } catch {
    message.error('删除失败');
  }
}

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

// ==================== 路由 ====================

const router = useRouter();

function goToStatistics() {
  router.push('/messaging/scheduled/statistics');
}

// ==================== 生命周期 ====================

onMounted(fetchData);
</script>

<template>
  <div class="scheduled-message-container">
    <Card title="定时消息" :bordered="false">
      <template #extra>
        <Space>
          <Button @click="goToStatistics">
            <template #icon><BarChartOutlined /></template>
            数据统计
          </Button>
          <Button type="primary" @click="openCreate">
            <template #icon><PlusOutlined /></template>
            新建定时消息
          </Button>
        </Space>
      </template>

      <Table v-bind="tableProps" :columns="columns">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'scheduledAt'">
            <Space>
              <ClockCircleOutlined />
              {{ formatDate((record as ScheduledMessage).scheduledAt) }}
            </Space>
          </template>
          <template v-if="column.key === 'status'">
            <Tag :color="statusMap[(record as ScheduledMessage).status]?.color">
              {{ statusMap[(record as ScheduledMessage).status]?.text }}
            </Tag>
          </template>
          <template v-if="column.key === 'action'">
            <Space>
              <Button
                v-if="(record as ScheduledMessage).status === 'PENDING'"
                type="link"
                size="small"
                @click="handleConfirm((record as ScheduledMessage).id)"
              >
                <CheckCircleOutlined /> 确认
              </Button>
              <Button
                v-if="(record as ScheduledMessage).status === 'CONFIRMED'"
                type="link"
                size="small"
                @click="handleExecute((record as ScheduledMessage).id)"
              >
                <SendOutlined /> 立即发送
              </Button>
              <Button
                v-if="
                  ['PENDING', 'CONFIRMED'].includes(
                    (record as ScheduledMessage).status,
                  )
                "
                type="link"
                size="small"
                @click="handleEdit(record as ScheduledMessage)"
              >
                <EditOutlined /> 编辑
              </Button>
              <Popconfirm
                v-if="
                  ['PENDING', 'CONFIRMED'].includes(
                    (record as ScheduledMessage).status,
                  )
                "
                title="确定要删除这条定时消息吗？"
                @confirm="handleDelete((record as ScheduledMessage).id)"
              >
                <Button type="link" size="small" danger>
                  <DeleteOutlined /> 删除
                </Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
        <template #emptyText>
          <div style="padding: 40px; color: #999; text-align: center">
            <ClockCircleOutlined style="margin-bottom: 16px; font-size: 48px" />
            <p>暂无定时消息</p>
            <p>点击"新建定时消息"创建您的第一条定时消息</p>
          </div>
        </template>
      </Table>
    </Card>

    <Modal
      v-model:open="visible"
      :title="isEditing ? '编辑定时消息' : '新建定时消息'"
      @ok="submit"
    >
      <Form layout="vertical">
        <Form.Item label="任务名称" required>
          <Input v-model:value="formState.name" placeholder="请输入任务名称" />
        </Form.Item>
        <Form.Item label="消息内容" required>
          <Input.TextArea
            v-model:value="formState.content"
            placeholder="请输入消息内容"
            :rows="4"
          />
        </Form.Item>
        <Form.Item label="计划发送时间" required>
          <DatePicker
            v-model:value="formState.scheduledAt"
            show-time
            placeholder="选择发送时间"
            style="width: 100%"
          />
        </Form.Item>
        <Form.Item label="发送目标">
          <Select
            v-model:value="formState.targetType"
            :options="targetTypeOptions"
            placeholder="选择发送目标类型"
          />
        </Form.Item>
        <Form.Item label="附件">
          <div
            v-if="formState.attachments.length > 0"
            class="mb-2 flex flex-wrap gap-2"
          >
            <Tag
              v-for="att in formState.attachments"
              :key="att.id"
              closable
              @close="handleRemoveAttachment(att.id!)"
            >
              {{ att.name || att.type }}
            </Tag>
          </div>
          <Button @click="handleOpenMaterialPicker">
            <FolderOpenOutlined /> 选择素材
          </Button>
        </Form.Item>
      </Form>
    </Modal>

    <!-- Material Picker Modal -->
    <MaterialPicker
      v-model:open="materialPickerVisible"
      :type="materialPickerType"
      :multiple="true"
      :max-count="9"
      @select="handleMaterialSelect"
    />
  </div>
</template>

<style scoped>
.scheduled-message-container {
  padding: 16px;
}
</style>
