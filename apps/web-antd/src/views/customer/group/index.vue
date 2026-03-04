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
  message,
  Tag,
  Popconfirm,
  Drawer,
} from 'ant-design-vue';
import { BarChartOutlined } from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';
import { useCrudTable, useModalForm } from '#/composables';

const router = useRouter();

// ==================== 类型定义 ====================

interface GroupItem {
  id: number;
  chatId: string;
  name: string | null;
  notice: string | null;
  owner: string | null;
  status: string;
  memberCount: number;
  createTime: string | null;
  createdAt: string;
}

interface MemberItem {
  id: number;
  customerId: number | null;
  customerName: string | null;
  userId: string | null;
  type: string;
  joinTime: string | null;
}

interface CustomerItem {
  id: number;
  name: string;
}

interface GroupFormState {
  name: string;
  notice: string;
}

// ==================== 状态映射 ====================

const statusMap: Record<string, { label: string; color: string }> = {
  NORMAL: { label: '正常', color: 'green' },
  OWNER_QUIT: { label: '群主退出', color: 'orange' },
  TRANSFERRING: { label: '转让中', color: 'blue' },
  TRANSFERRED: { label: '已转让', color: 'default' },
};

// ==================== 表格列定义 ====================

const columns = [
  { title: '群名称', dataIndex: 'name', key: 'name' },
  {
    title: '群成员数',
    dataIndex: 'memberCount',
    key: 'memberCount',
    width: 100,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    customRender: ({ text }: { text: string }) => {
      const info = statusMap[text] || { label: text, color: 'default' };
      return h(Tag, { color: info.color }, () => info.label);
    },
  },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
  { title: '操作', key: 'action', width: 220 },
];

const memberColumns = [
  { title: '客户名称', dataIndex: 'customerName', key: 'customerName' },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    customRender: ({ text }: { text: string }) =>
      h(Tag, { color: text === 'EMPLOYEE' ? 'blue' : 'green' }, () =>
        text === 'EMPLOYEE' ? '员工' : '客户',
      ),
  },
  { title: '加入时间', dataIndex: 'joinTime', key: 'joinTime' },
  { title: '操作', key: 'action', width: 100 },
];

// ==================== 表格逻辑 ====================

const { tableProps, fetchData, handleDelete } = useCrudTable<GroupItem>({
  fetchApi: async (params) =>
    requestClient.get<{ items: GroupItem[]; total: number }>(
      '/customer/group',
      {
        params: { page: params.page, pageSize: params.pageSize },
      },
    ),
  deleteApi: async (id) => {
    await requestClient.delete(`/customer/group/${id}`);
  },
});

// ==================== Modal 逻辑 ====================

const { visible, formState, isEditing, openCreate, openEdit, submit } =
  useModalForm<GroupFormState>({
    createApi: async (data) => {
      await requestClient.post('/customer/group', data);
    },
    updateApi: async (id, data) => {
      await requestClient.put(`/customer/group/${id}`, data);
    },
    initialValues: () => ({
      name: '',
      notice: '',
    }),
    afterSubmit: fetchData,
  });

function handleEdit(record: GroupItem) {
  openEdit(record.id, {
    name: record.name || '',
    notice: record.notice || '',
  });
}

// ==================== 群成员管理 ====================

const memberDrawerVisible = ref(false);
const currentGroup = ref<GroupItem | null>(null);
const members = ref<MemberItem[]>([]);
const membersLoading = ref(false);
const addMemberModalVisible = ref(false);
const customers = ref<CustomerItem[]>([]);
const selectedCustomerId = ref<number | undefined>(undefined);

async function fetchCustomers() {
  try {
    const res = await requestClient.get<{ items: CustomerItem[] }>(
      '/customer/list',
    );
    customers.value = res.items;
  } catch (e) {
    console.error(e);
  }
}

async function fetchMembers(groupId: number) {
  membersLoading.value = true;
  try {
    members.value = await requestClient.get<MemberItem[]>(
      `/customer/group/${groupId}/members`,
    );
  } catch (e) {
    console.error(e);
  } finally {
    membersLoading.value = false;
  }
}

async function handleViewMembers(record: GroupItem) {
  currentGroup.value = record;
  memberDrawerVisible.value = true;
  await fetchMembers(record.id);
}

function handleAddMember() {
  selectedCustomerId.value = undefined;
  addMemberModalVisible.value = true;
}

async function handleAddMemberSubmit() {
  if (!currentGroup.value || !selectedCustomerId.value) return;
  try {
    await requestClient.post(
      `/customer/group/${currentGroup.value.id}/members`,
      {
        customerId: selectedCustomerId.value,
      },
    );
    message.success('添加成功');
    addMemberModalVisible.value = false;
    await fetchMembers(currentGroup.value.id);
    fetchData();
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : '添加失败';
    message.error(errorMessage);
  }
}

async function handleRemoveMember(memberId: number) {
  if (!currentGroup.value) return;
  try {
    await requestClient.delete(
      `/customer/group/${currentGroup.value.id}/members/${memberId}`,
    );
    message.success('移除成功');
    await fetchMembers(currentGroup.value.id);
    fetchData();
  } catch (e) {
    message.error('移除失败');
  }
}

function goToStatistics() {
  router.push('/customer/group/statistics');
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchData();
  fetchCustomers();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-bold">群管理</h2>
      <Space>
        <Button @click="goToStatistics">
          <template #icon><BarChartOutlined /></template>
          统计分析
        </Button>
        <Button type="primary" @click="openCreate">新建群</Button>
      </Space>
    </div>

    <!-- 表格区 -->
    <Table v-bind="tableProps" :columns="columns">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Space>
            <Button
              type="link"
              size="small"
              @click="handleViewMembers(record as GroupItem)"
            >
              成员
            </Button>
            <Button
              type="link"
              size="small"
              @click="handleEdit(record as GroupItem)"
            >
              编辑
            </Button>
            <Popconfirm
              title="确定删除吗？"
              @confirm="handleDelete((record as GroupItem).id)"
            >
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <!-- 新建/编辑群 Modal -->
    <Modal
      v-model:open="visible"
      :title="isEditing ? '编辑群' : '新建群'"
      @ok="submit"
    >
      <Form layout="vertical" class="mt-4">
        <Form.Item label="群名称" required>
          <Input v-model:value="formState.name" placeholder="请输入群名称" />
        </Form.Item>
        <Form.Item label="群公告">
          <Input.TextArea
            v-model:value="formState.notice"
            placeholder="请输入群公告"
            :rows="3"
          />
        </Form.Item>
      </Form>
    </Modal>

    <!-- 群成员 Drawer -->
    <Drawer
      v-model:open="memberDrawerVisible"
      :title="`群成员 - ${currentGroup?.name || ''}`"
      width="500"
    >
      <div class="mb-4">
        <Button type="primary" @click="handleAddMember">添加成员</Button>
      </div>
      <Table
        :columns="memberColumns"
        :data-source="members"
        :loading="membersLoading"
        :pagination="false"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <Popconfirm
              title="确定移除吗？"
              @confirm="handleRemoveMember((record as MemberItem).id)"
            >
              <Button type="link" size="small" danger>移除</Button>
            </Popconfirm>
          </template>
        </template>
      </Table>
    </Drawer>

    <!-- 添加成员 Modal -->
    <Modal
      v-model:open="addMemberModalVisible"
      title="添加群成员"
      @ok="handleAddMemberSubmit"
    >
      <Form layout="vertical" class="mt-4">
        <Form.Item label="选择客户" required>
          <Select
            v-model:value="selectedCustomerId"
            placeholder="请选择客户"
            show-search
            :filter-option="
              (input: string, option: any) =>
                option.label.toLowerCase().includes(input.toLowerCase())
            "
            :options="customers.map((c) => ({ value: c.id, label: c.name }))"
          />
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>
