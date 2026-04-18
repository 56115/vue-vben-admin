<script lang="ts" setup>
import { ref, onMounted, h } from 'vue';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Select,
  Tag,
  Popconfirm,
  Checkbox,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';

interface Role {
  id: string;
  name: string;
  code: string;
}

interface UserItem {
  id: string;
  username: string;
  realName: string;
  email: string | null;
  phone: string | null;
  status: string;
  tenantId: string;
  avatar?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  roles?: Array<{
    id: string;
    userId: string;
    roleId: string;
    role: Role;
  }>;
}

interface Tenant {
  id: string;
  code: string;
  name: string;
}

const loading = ref(false);
const dataSource = ref<UserItem[]>([]);
const pagination = ref({ current: 1, pageSize: 20, total: 0 });
const modalVisible = ref(false);
const modalTitle = ref('新增用户');
const editingId = ref<string | null>(null);
const formState = ref({
  username: '',
  password: '',
  realName: '',
  email: '',
  phone: '',
  status: 'ACTIVE',
  tenantId: '',
});
const tenants = ref<Tenant[]>([]);
const allRoles = ref<Role[]>([]);
const roleModalVisible = ref(false);
const currentUserId = ref<string | null>(null);
const currentUserRoles = ref<string[]>([]);
const roleModalLoading = ref(false);

const columns = [
  { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
  { title: '真实姓名', dataIndex: 'realName', key: 'realName', width: 120 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
  { title: '手机号', dataIndex: 'phone', key: 'phone', width: 120 },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80,
    customRender: ({ text }: { text: string }) => {
      const statusMap: Record<string, { color: string; label: string }> = {
        ACTIVE: { color: 'green', label: '激活' },
        INACTIVE: { color: 'orange', label: '未激活' },
        BANNED: { color: 'red', label: '已封禁' },
      };
      const status = statusMap[text] || { color: 'default', label: text };
      return h(Tag, { color: status.color }, () => status.label);
    },
  },
  {
    title: '角色',
    key: 'roles',
    width: 300,
    customRender: ({ record }: { record: UserItem }) => {
      if (!record.roles || record.roles.length === 0) {
        return h('span', { style: 'color: #999' }, '无');
      }
      return h(Space, { size: [4, 4], wrap: true }, () =>
        record.roles!.map((ur) =>
          h(Tag, { color: 'blue', key: ur.id }, () => ur.role.name),
        ),
      );
    },
  },
  {
    title: '最后登录',
    dataIndex: 'lastLoginAt',
    key: 'lastLoginAt',
    width: 160,
    customRender: ({ text }: { text: string | null }) => {
      return text ? new Date(text).toLocaleString('zh-CN') : '从未登录';
    },
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    customRender: ({ text }: { text: string }) => {
      return new Date(text).toLocaleString('zh-CN');
    },
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
    fixed: 'right',
  },
];

async function fetchData() {
  loading.value = true;
  try {
    const res = await requestClient.get<{ items: UserItem[]; total: number }>(
      '/platform/users',
      {
        params: {
          page: pagination.value.current,
          pageSize: pagination.value.pageSize,
        },
      },
    );
    dataSource.value = res.items;
    pagination.value.total = res.total;
  } catch (e: any) {
    console.error(e);
    message.error(e.message || '获取用户列表失败');
  } finally {
    loading.value = false;
  }
}

async function fetchTenants() {
  try {
    const res = await requestClient.get<{ data: Tenant[]; total: number }>(
      '/platform/tenants',
      {
        params: { page: 1, pageSize: 100 },
      },
    );
    tenants.value = res.data;
  } catch (e: any) {
    console.error(e);
    message.error(e.message || '获取租户列表失败');
  }
}

async function fetchAllRoles() {
  try {
    const res = await requestClient.get<{ items: Role[]; total: number }>('/platform/roles', {
      params: { page: 1, pageSize: 100 },
    });
    allRoles.value = res.items;
  } catch (e: any) {
    console.error(e);
    message.error(e.message || '获取角色列表失败');
  }
}

async function handleAssignRoles(record: UserItem) {
  currentUserId.value = record.id;
  roleModalVisible.value = true;

  // 获取用户当前角色
  try {
    const res = await requestClient.get<Role[]>(
      `/platform/users/${record.id}/roles`,
    );
    currentUserRoles.value = res.map((r) => r.id);
  } catch (e: any) {
    console.error(e);
    message.error(e.message || '获取用户角色失败');
    currentUserRoles.value = [];
  }
}

async function handleRoleSubmit() {
  if (!currentUserId.value) return;

  roleModalLoading.value = true;
  try {
    await requestClient.put(`/platform/users/${currentUserId.value}/roles`, {
      roleIds: currentUserRoles.value.map((id) => String(id)),
    });
    message.success('角色分配成功');
    roleModalVisible.value = false;
    fetchData();
  } catch (e: any) {
    message.error(e.message || '角色分配失败');
  } finally {
    roleModalLoading.value = false;
  }
}

function handleAdd() {
  editingId.value = null;
  modalTitle.value = '新增用户';
  formState.value = {
    username: '',
    password: '',
    realName: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
    tenantId: '',
  };
  modalVisible.value = true;
}

async function handleEdit(record: UserItem) {
  editingId.value = record.id;
  modalTitle.value = '编辑用户';
  formState.value = {
    username: record.username,
    password: '',
    realName: record.realName,
    email: record.email || '',
    phone: record.phone || '',
    status: record.status,
    tenantId: String(record.tenantId || ''),
  };
  modalVisible.value = true;
}

async function handleDelete(id: string) {
  try {
    await requestClient.delete(`/platform/users/${id}`);
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
        `/platform/users/${editingId.value}`,
        formState.value,
      );
      message.success('更新成功');
    } else {
      await requestClient.post('/platform/users', formState.value);
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
  fetchTenants();
  fetchAllRoles();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-bold">用户管理</h2>
      <Button type="primary" @click="handleAdd">新增用户</Button>
    </div>

    <Table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: 1400 }"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Space>
            <Button type="link" size="small" @click="handleEdit(record)"
              >编辑</Button
            >
            <Button type="link" size="small" @click="handleAssignRoles(record)"
              >分配角色</Button
            >
            <Popconfirm title="确定删除吗？" @confirm="handleDelete(record.id)">
              <Button type="link" size="small" danger>删除</Button>
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
        <Form.Item label="用户名" required>
          <Input
            v-model:value="formState.username"
            placeholder="请输入用户名（3-50字符）"
            :disabled="!!editingId"
          />
        </Form.Item>
        <Form.Item label="密码" :required="!editingId">
          <Input.Password
            v-model:value="formState.password"
            placeholder="请输入密码（6位以上）"
          />
        </Form.Item>
        <Form.Item label="真实姓名" required>
          <Input
            v-model:value="formState.realName"
            placeholder="请输入真实姓名"
          />
        </Form.Item>
        <Form.Item label="邮箱">
          <Input
            v-model:value="formState.email"
            placeholder="请输入邮箱"
            type="email"
          />
        </Form.Item>
        <Form.Item label="手机号">
          <Input v-model:value="formState.phone" placeholder="请输入手机号" />
        </Form.Item>
        <Form.Item label="状态">
          <Select v-model:value="formState.status">
            <Select.Option value="ACTIVE">激活</Select.Option>
            <Select.Option value="INACTIVE">未激活</Select.Option>
            <Select.Option value="BANNED">已封禁</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="所属租户" required>
          <Select
            v-model:value="formState.tenantId"
            placeholder="请选择租户"
            :disabled="!!editingId"
            show-search
          >
            <Select.Option
              v-for="tenant in tenants"
              :key="tenant.id"
              :value="tenant.id"
            >
              {{ tenant.name }} ({{ tenant.code }})
            </Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>

    <!-- 角色分配对话框 -->
    <Modal
      v-model:open="roleModalVisible"
      title="分配角色"
      @ok="handleRoleSubmit"
      :confirmLoading="roleModalLoading"
      width="600px"
    >
      <div class="mt-4">
        <p class="mb-4 text-gray-600">请选择要分配给该用户的角色（可多选）：</p>
        <Checkbox.Group v-model:value="currentUserRoles" style="width: 100%">
          <div class="grid grid-cols-2 gap-3">
            <Checkbox
              v-for="role in allRoles"
              :key="role.id"
              :value="role.id"
              class="mb-2"
            >
              <div class="flex flex-col">
                <span class="font-medium">{{ role.name }}</span>
                <span class="text-xs text-gray-500">{{ role.code }}</span>
              </div>
            </Checkbox>
          </div>
        </Checkbox.Group>
      </div>
    </Modal>
  </div>
</template>
