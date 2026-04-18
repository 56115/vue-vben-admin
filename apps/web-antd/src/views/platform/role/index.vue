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
  Collapse,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';

interface RoleItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  appModuleCode: string;
  dataScope: string;
  status: string;
  isSystem: boolean;
  createdAt: string;
}

interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  appModule: {
    code: string;
    name: string;
  };
}

const loading = ref(false);
const dataSource = ref<RoleItem[]>([]);
const pagination = ref({ current: 1, pageSize: 20, total: 0 });
const modalVisible = ref(false);
const modalTitle = ref('新增角色');
const editingId = ref<string | null>(null);
const formState = ref({
  code: '',
  name: '',
  description: '',
  appModuleCode: '',
  dataScope: 'ALL',
  status: 'ACTIVE',
});

// Permission assignment state
const allPermissions = ref<Record<string, Permission[]>>({});
const permissionModalVisible = ref(false);
const currentRoleId = ref<string | null>(null);
const currentRoleName = ref<string>('');
const currentPermissions = ref<string[]>([]);
const permissionModalLoading = ref(false);
const activeKeys = ref<string[]>([]);

const columns = [
  { title: '角色代码', dataIndex: 'code', key: 'code', width: 150 },
  { title: '角色名称', dataIndex: 'name', key: 'name' },
  {
    title: '应用模块',
    dataIndex: 'appModuleCode',
    key: 'appModuleCode',
    width: 100,
  },
  {
    title: '数据范围',
    dataIndex: 'dataScope',
    key: 'dataScope',
    width: 120,
    customRender: ({ text }: { text: string }) => {
      const scopeMap: Record<string, { label: string; color: string }> = {
        ALL: { label: '全部数据', color: 'blue' },
        DEPARTMENT: { label: '部门数据', color: 'green' },
        SELF: { label: '个人数据', color: 'orange' },
      };
      const scope = scopeMap[text] || { label: text, color: 'default' };
      return h(Tag, { color: scope.color }, () => scope.label);
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    customRender: ({ text }: { text: string }) => {
      const color = text === 'ACTIVE' ? 'green' : 'red';
      return h(Tag, { color }, () => text);
    },
  },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  {
    title: '操作',
    key: 'action',
    width: 200,
  },
];

async function fetchData() {
  loading.value = true;
  try {
    const res = await requestClient.get<{ items: RoleItem[]; total: number }>(
      '/platform/roles',
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
    message.error(e.message || '获取角色列表失败');
  } finally {
    loading.value = false;
  }
}

// Permission management functions
async function fetchAllPermissions() {
  try {
    const res = await requestClient.get<Record<string, Permission[]>>(
      '/platform/permissions/for-assignment',
    );
    allPermissions.value = res;
  } catch (e: any) {
    console.error(e);
    message.error(e.message || '获取权限列表失败');
  }
}

async function handleAssignPermissions(record: RoleItem) {
  if (record.isSystem) {
    message.warning('系统角色的权限不允许修改');
    return;
  }

  currentRoleId.value = record.id;
  currentRoleName.value = record.name;
  permissionModalVisible.value = true;

  // Get role's current permissions
  try {
    const res = await requestClient.get<Permission[]>(
      `/platform/roles/${record.id}/permissions`,
    );
    currentPermissions.value = res.map((p) => p.id);
  } catch (e: any) {
    console.error(e);
    message.error(e.message || '获取角色权限失败');
    currentPermissions.value = [];
  }
}

async function handlePermissionSubmit() {
  if (!currentRoleId.value) return;

  permissionModalLoading.value = true;
  try {
    await requestClient.put(
      `/platform/roles/${currentRoleId.value}/permissions`,
      {
        permissionIds: currentPermissions.value,
      },
    );
    message.success('权限分配成功');
    permissionModalVisible.value = false;
    fetchData();
  } catch (e: any) {
    message.error(e.message || '权限分配失败');
  } finally {
    permissionModalLoading.value = false;
  }
}

function handleAdd() {
  editingId.value = null;
  modalTitle.value = '新增角色';
  formState.value = {
    code: '',
    name: '',
    description: '',
    appModuleCode: '',
    dataScope: 'ALL',
    status: 'ACTIVE',
  };
  modalVisible.value = true;
}

async function handleEdit(record: RoleItem) {
  editingId.value = record.id;
  modalTitle.value = '编辑角色';
  formState.value = {
    code: record.code,
    name: record.name,
    description: record.description || '',
    appModuleCode: record.appModuleCode,
    dataScope: record.dataScope,
    status: record.status,
  };
  modalVisible.value = true;
}

async function handleDelete(id: number) {
  try {
    await requestClient.delete(`/platform/roles/${id}`);
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
        `/platform/roles/${editingId.value}`,
        formState.value,
      );
      message.success('更新成功');
    } else {
      await requestClient.post('/platform/roles', formState.value);
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
  fetchAllPermissions();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-bold">角色权限管理</h2>
      <Button type="primary" @click="handleAdd">新增角色</Button>
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
            <Button
              type="link"
              size="small"
              @click="handleAssignPermissions(record)"
              >分配权限</Button
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
        <Form.Item label="角色代码" required>
          <Input
            v-model:value="formState.code"
            placeholder="如：CUSTOMER_ADMIN"
            :disabled="!!editingId"
          />
        </Form.Item>
        <Form.Item label="角色名称" required>
          <Input v-model:value="formState.name" placeholder="请输入角色名称" />
        </Form.Item>
        <Form.Item label="应用模块" required>
          <Input
            v-model:value="formState.appModuleCode"
            placeholder="如：CRM"
          />
        </Form.Item>
        <Form.Item label="数据范围">
          <Select v-model:value="formState.dataScope">
            <Select.Option value="ALL">全部数据</Select.Option>
            <Select.Option value="DEPARTMENT">部门数据</Select.Option>
            <Select.Option value="SELF">个人数据</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="状态">
          <Select v-model:value="formState.status">
            <Select.Option value="ACTIVE">激活</Select.Option>
            <Select.Option value="INACTIVE">禁用</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="描述">
          <Input.TextArea
            v-model:value="formState.description"
            placeholder="请输入描述"
          />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      v-model:open="permissionModalVisible"
      :title="`分配权限 - ${currentRoleName}`"
      @ok="handlePermissionSubmit"
      :confirmLoading="permissionModalLoading"
      width="800px"
    >
      <div class="mt-4 max-h-96 overflow-y-auto">
        <p class="mb-4 text-gray-600">请选择要分配给该角色的权限（可多选）：</p>
        <Collapse v-model:activeKey="activeKeys">
          <Collapse.Panel
            v-for="(permissions, moduleName) in allPermissions"
            :key="moduleName"
            :header="`${moduleName} (${permissions.length}个权限)`"
          >
            <Checkbox.Group
              v-model:value="currentPermissions"
              style="width: 100%"
            >
              <div class="grid grid-cols-2 gap-2">
                <Checkbox
                  v-for="perm in permissions"
                  :key="perm.id"
                  :value="perm.id"
                  class="mb-2"
                >
                  <div class="flex flex-col">
                    <span class="text-sm font-medium">{{ perm.name }}</span>
                    <span class="text-xs text-gray-500">{{ perm.code }}</span>
                    <span
                      v-if="perm.description"
                      class="text-xs text-gray-400"
                      >{{ perm.description }}</span
                    >
                  </div>
                </Checkbox>
              </div>
            </Checkbox.Group>
          </Collapse.Panel>
        </Collapse>
      </div>
    </Modal>
  </div>
</template>
