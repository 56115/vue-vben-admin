<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import {
  Button,
  Space,
  message,
  Card,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  Tabs,
  TabPane,
} from 'ant-design-vue';
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';

// Types
interface BlacklistItem {
  id: number;
  externalUserid: string;
  nickname: string;
  reason: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
}

// State
const activeTab = ref('org');
const loading = ref(false);
const blacklist = ref<BlacklistItem[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

// Config
const orgShareEnabled = ref(true);
const interOrgShareEnabled = ref(false);

// Table columns
const columns = [
  { title: '客户名称', dataIndex: 'nickname', key: 'nickname' },
  { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
  { title: '添加人', dataIndex: 'createdBy', key: 'createdBy' },
  { title: '添加时间', dataIndex: 'createdAt', key: 'createdAt' },
  {
    title: '操作',
    key: 'actions',
    width: 100,
  },
];

// API calls
async function fetchBlacklist() {
  loading.value = true;
  try {
    const scope = activeTab.value === 'org' ? 'ORGANIZATION' : 'INTER_ORG';
    const res = await requestClient.get<{
      items: BlacklistItem[];
      total: number;
    }>('/operations/anti-harassment/blacklist', {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        scope,
      },
    });
    blacklist.value = res.items || [];
    total.value = res.total || 0;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function handleDelete(id: number) {
  try {
    await requestClient.delete(`/operations/anti-harassment/blacklist/${id}`);
    message.success('删除成功');
    fetchBlacklist();
  } catch (e: any) {
    message.error(e.message || '删除失败');
  }
}

async function handleToggleOrgShare(enabled: boolean) {
  try {
    await requestClient.patch('/operations/anti-harassment/blacklist/config', {
      orgShareEnabled: enabled,
    });
    message.success('设置已更新');
  } catch (e: any) {
    message.error(e.message || '设置失败');
    orgShareEnabled.value = !enabled;
  }
}

async function handleToggleInterOrgShare(enabled: boolean) {
  try {
    await requestClient.patch('/operations/anti-harassment/blacklist/config', {
      interOrgShareEnabled: enabled,
    });
    message.success('设置已更新');
  } catch (e: any) {
    message.error(e.message || '设置失败');
    interOrgShareEnabled.value = !enabled;
  }
}

function handleTabChange(key: string) {
  activeTab.value = key;
  currentPage.value = 1;
  fetchBlacklist();
}

function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  fetchBlacklist();
}

function goBack() {
  window.history.back();
}

onMounted(() => {
  fetchBlacklist();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center">
      <Button type="text" @click="goBack">
        <ArrowLeftOutlined />
      </Button>
      <h2 class="ml-2 text-xl font-bold">群聊黑名单</h2>
    </div>

    <Card class="mb-4">
      <div class="text-gray-600">
        群聊黑名单中的用户将不能加入我创建的客户群。可通过设置防骚扰规则自动加入黑名单或标记用户进入群聊黑名单。企业还可以设置成员之间共享使用群聊黑名单。
      </div>
    </Card>

    <Tabs v-model:activeKey="activeTab" @change="handleTabChange">
      <TabPane key="org" tab="本企业黑名单">
        <Card>
          <div
            class="mb-4 flex items-center justify-between rounded bg-gray-50 p-4"
          >
            <div class="flex items-center">
              <span class="font-medium">成员共享使用群聊黑名单</span>
              <Switch
                v-model:checked="orgShareEnabled"
                class="ml-4"
                @change="handleToggleOrgShare"
              />
              <span class="ml-2">开启</span>
            </div>
            <div class="text-gray-500">
              开启后，成员之间共享使用群聊黑名单，企业可以管理共享的群聊黑名单。
            </div>
          </div>

          <div class="mb-2 text-sm">
            <span class="text-gray-600">群聊黑名单</span>
            <span class="ml-4 text-blue-500">共 {{ total }} 位客户</span>
            <a class="ml-2 text-blue-500">查看</a>
          </div>

          <Table
            :columns="columns"
            :data-source="blacklist"
            :loading="loading"
            :pagination="{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              onChange: handlePageChange,
              showSizeChanger: true,
              showTotal: (t: number) => `共 ${t} 条`,
            }"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <Popconfirm
                  title="确定要移除此客户吗？"
                  @confirm="handleDelete(record.id)"
                >
                  <Button type="link" size="small" danger>
                    <DeleteOutlined /> 移除
                  </Button>
                </Popconfirm>
              </template>
            </template>
          </Table>
        </Card>
      </TabPane>

      <TabPane key="inter-org" tab="企业间黑名单">
        <Card>
          <div
            class="mb-4 flex items-center justify-between rounded bg-gray-50 p-4"
          >
            <div class="flex items-center">
              <span class="font-medium">企业间共享使用群聊黑名单</span>
              <Switch
                v-model:checked="interOrgShareEnabled"
                class="ml-4"
                @change="handleToggleInterOrgShare"
              />
              <span class="ml-2">{{
                interOrgShareEnabled ? '开启' : '关闭'
              }}</span>
            </div>
            <div class="text-gray-500">
              开启后，将使用企业间共享黑名单，对恶意用户进行拦截入群、踢出群等处置。
            </div>
          </div>

          <Table
            :columns="columns"
            :data-source="blacklist"
            :loading="loading"
            :pagination="{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              onChange: handlePageChange,
              showSizeChanger: true,
              showTotal: (t: number) => `共 ${t} 条`,
            }"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <Popconfirm
                  title="确定要移除此客户吗？"
                  @confirm="handleDelete(record.id)"
                >
                  <Button type="link" size="small" danger>
                    <DeleteOutlined /> 移除
                  </Button>
                </Popconfirm>
              </template>
            </template>
          </Table>
        </Card>
      </TabPane>
    </Tabs>
  </div>
</template>
