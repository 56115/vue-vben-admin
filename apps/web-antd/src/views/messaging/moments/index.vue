<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import {
  Button,
  Space,
  message,
  Tag,
  Card,
  Table,
  Form,
  Input,
  Select,
  DatePicker,
  Tabs,
  TabPane,
  Radio,
  Popconfirm,
  Image,
  Alert,
} from 'ant-design-vue';
import type { UploadFile } from 'ant-design-vue';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LikeOutlined,
  CommentOutlined,
  EyeOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  FileOutlined,
  LinkOutlined,
  AppstoreOutlined,
  BellOutlined,
  ExportOutlined,
  BarChartOutlined,
  ReloadOutlined,
  FilterOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';
import { requestClient } from '#/api/request';
import { useCrudTable } from '#/composables';
import CustomerFilterDrawer from './components/CustomerFilterDrawer.vue';
import { MaterialPicker } from '#/components';
import type { Material, MaterialType } from '#/components';

interface FilterConditions {
  tagIds: number[];
  tagLogic: 'ANY' | 'ALL' | 'EXCLUDE';
  departmentIds: number[];
  excludeDepartmentIds: number[];
  ownerIds: number[];
  statuses: string[];
  lifecycleStages: string[];
  importedCustomerIds: number[];
}

// ==================== 类型定义 ====================

interface MomentTask {
  id: number;
  name: string;
  text: string;
  attachments: unknown[];
  visibleType: string;
  senderList: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdBy: string;
  createdAt: string;
}

interface MaterialItem {
  id: number;
  title: string;
  type: string;
  url: string;
  thumbnail: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdBy: string;
  createdAt: string;
}

interface MomentFilters {
  createdBy?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  minLikes?: number;
  minComments?: number;
  minViews?: number;
}

// ==================== Router ====================

const router = useRouter();

// ==================== 状态 ====================

const activeTab = ref('create');
const failedCount = ref(0);
const retryLoading = ref(false);
const materials = ref<MaterialItem[]>([]);
const materialsLoading = ref(false);
const materialsTotal = ref(0);
const materialsPage = ref(1);

// Filters (用于 history 表格)
const dateRange = ref<[unknown, unknown] | null>(null);

// Attachment interface
interface MomentsAttachment {
  id?: string;
  type: 'image' | 'video' | 'file' | 'link' | 'miniprogram';
  materialId?: number; // For usage tracking
  mediaId?: number;
  ossUrl?: string;
  name?: string;
  url?: string;
  thumbnail?: string;
}

// Create form
const createForm = ref({
  visibleType: 'ALL' as 'ALL' | 'FILTERED',
  text: '',
  attachments: [] as MomentsAttachment[],
});
const createLoading = ref(false);

// Material Picker state
const materialPickerVisible = ref(false);
const materialPickerType = ref<MaterialType>('ALL');

// Customer filter drawer
const filterDrawerVisible = ref(false);
const filterConditions = ref<FilterConditions>({
  tagIds: [],
  tagLogic: 'ANY',
  departmentIds: [],
  excludeDepartmentIds: [],
  ownerIds: [],
  statuses: [],
  lifecycleStages: [],
  importedCustomerIds: [],
});
const previewCount = ref(0);

// ==================== 常量 ====================

const attachmentTypes = [
  { key: 'image', icon: PictureOutlined, label: '图片' },
  { key: 'video', icon: VideoCameraOutlined, label: '视频' },
  { key: 'file', icon: FileOutlined, label: '文件' },
  { key: 'link', icon: LinkOutlined, label: '网页' },
  { key: 'miniprogram', icon: AppstoreOutlined, label: '小程序' },
];

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待发送', color: 'default' },
  SUBMITTED: { label: '已提交', color: 'processing' },
  POLLING: { label: '处理中', color: 'processing' },
  PUBLISHED: { label: '已发布', color: 'success' },
  COMPLETED: { label: '已完成', color: 'success' },
  FAILED: { label: '失败', color: 'error' },
  CANCELLED: { label: '已取消', color: 'default' },
};

// ==================== 表格列定义 ====================

const historyColumns = [
  { title: '内容', dataIndex: 'text', key: 'text', ellipsis: true, width: 300 },
  {
    title: '点赞',
    dataIndex: 'likeCount',
    key: 'likeCount',
    width: 80,
    sorter: true,
  },
  {
    title: '评论',
    dataIndex: 'commentCount',
    key: 'commentCount',
    width: 80,
    sorter: true,
  },
  {
    title: '浏览',
    dataIndex: 'viewCount',
    key: 'viewCount',
    width: 80,
    sorter: true,
  },
  { title: '创建人', dataIndex: 'createdBy', key: 'createdBy', width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
  { title: '发表情况', dataIndex: 'status', key: 'status', width: 120 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' as const },
];

const materialColumns = [
  { title: '内容', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: '点赞', dataIndex: 'likeCount', key: 'likeCount', sorter: true },
  {
    title: '评论',
    dataIndex: 'commentCount',
    key: 'commentCount',
    sorter: true,
  },
  { title: '收藏', key: 'favoriteCount' },
  { title: '浏览', dataIndex: 'viewCount', key: 'viewCount', sorter: true },
  { title: '使用次数', key: 'usageCount' },
  { title: '创建人', dataIndex: 'createdBy', key: 'createdBy' },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
  { title: '操作', key: 'actions', width: 150 },
];

// ==================== History 表格逻辑 ====================

const {
  tableProps: historyTableProps,
  filters,
  search: searchHistory,
  fetchData: fetchMoments,
} = useCrudTable<MomentTask, MomentFilters>({
  fetchApi: async (params) => {
    const apiParams: Record<string, unknown> = {
      page: params.page,
      pageSize: params.pageSize,
    };
    if (params.createdBy) apiParams.createdBy = params.createdBy;
    if (params.status) apiParams.status = params.status;
    if (dateRange.value) {
      apiParams.startDate = dateRange.value[0];
      apiParams.endDate = dateRange.value[1];
    }
    if (params.minLikes) apiParams.minLikes = params.minLikes;
    if (params.minComments) apiParams.minComments = params.minComments;
    if (params.minViews) apiParams.minViews = params.minViews;

    const res = await requestClient.get<{ items: MomentTask[]; total: number }>(
      '/messaging/moments',
      { params: apiParams },
    );
    return { items: res.items || [], total: res.total || 0 };
  },
  deleteApi: async (id) => {
    await requestClient.delete(`/messaging/moments/${id}`);
  },
});

// ==================== Materials 表格加载 ====================

async function fetchMaterials() {
  materialsLoading.value = true;
  try {
    const res = await requestClient.get<{
      items: MaterialItem[];
      total: number;
    }>('/messaging/moments/materials', {
      params: { page: materialsPage.value, pageSize: 10 },
    });
    materials.value = res.items || [];
    materialsTotal.value = res.total || 0;
  } catch (e) {
    console.error(e);
  } finally {
    materialsLoading.value = false;
  }
}

// ==================== 计算属性 ====================

const hasFilterConditions = computed(() => {
  const c = filterConditions.value;
  return (
    c.tagIds.length > 0 ||
    c.departmentIds.length > 0 ||
    c.excludeDepartmentIds.length > 0 ||
    c.ownerIds.length > 0 ||
    c.statuses.length > 0 ||
    c.lifecycleStages.length > 0 ||
    c.importedCustomerIds.length > 0
  );
});

const filterSummary = computed(() => {
  if (!hasFilterConditions.value) return '未设置筛选条件';
  const parts: string[] = [];
  const c = filterConditions.value;
  if (c.tagIds.length > 0) parts.push(`${c.tagIds.length} 个标签`);
  if (c.departmentIds.length > 0)
    parts.push(`${c.departmentIds.length} 个部门`);
  if (c.excludeDepartmentIds.length > 0)
    parts.push(`排除 ${c.excludeDepartmentIds.length} 个部门`);
  if (c.ownerIds.length > 0) parts.push(`${c.ownerIds.length} 个归属人`);
  if (c.statuses.length > 0) parts.push(`${c.statuses.length} 种状态`);
  if (c.lifecycleStages.length > 0)
    parts.push(`${c.lifecycleStages.length} 个生命周期`);
  if (c.importedCustomerIds.length > 0)
    parts.push(`导入 ${c.importedCustomerIds.length} 人`);
  return parts.join('、');
});

// ==================== 事件处理 ====================

function generateAttachmentId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function handleOpenMaterialPicker(type?: 'image' | 'video' | 'file') {
  if (createForm.value.attachments.length >= 9) {
    message.warning('最多只能添加 9 个附件');
    return;
  }

  // Map types to MaterialType
  const typeMap: Record<string, MaterialType> = {
    image: 'IMAGE',
    video: 'VIDEO',
    file: 'FILE',
  };

  materialPickerType.value = type ? typeMap[type] || 'ALL' : 'ALL';
  materialPickerVisible.value = true;
}

function handleMaterialSelect(selectedMaterials: Material[]) {
  const maxCount = 9;
  const remaining = maxCount - createForm.value.attachments.length;
  const toAdd = selectedMaterials.slice(0, remaining);

  const newAttachments: MomentsAttachment[] = toAdd.map((material) => {
    const att: MomentsAttachment = {
      id: generateAttachmentId(),
      type: material.type.toLowerCase() as
        | 'image'
        | 'video'
        | 'file'
        | 'link'
        | 'miniprogram',
      materialId: material.id, // Important: for usage tracking
      name: material.name,
    };

    // Handle different material types
    if (
      material.type === 'IMAGE' ||
      material.type === 'VIDEO' ||
      material.type === 'FILE'
    ) {
      if (material.mediaIds && material.mediaIds.length > 0) {
        att.mediaId = material.mediaIds[0];
      }
      // Assuming we need to fetch the actual URL from backend
      att.ossUrl = '';
      att.thumbnail = '';
    } else if (material.type === 'LINK' && material.linkUrl) {
      att.url = material.linkUrl;
    }

    return att;
  });

  createForm.value.attachments = [
    ...createForm.value.attachments,
    ...newAttachments,
  ];

  if (selectedMaterials.length > remaining) {
    message.warning(
      `已添加 ${remaining} 个，超出数量的 ${selectedMaterials.length - remaining} 个已忽略`,
    );
  }

  materialPickerVisible.value = false;
}

function handleRemoveAttachment(id: string) {
  createForm.value.attachments = createForm.value.attachments.filter(
    (att) => att.id !== id,
  );
}

function handleOpenFilterDrawer() {
  filterDrawerVisible.value = true;
}

function handleFilterConfirm(conditions: FilterConditions) {
  filterConditions.value = conditions;
  // Preview count will be updated by the drawer
}

async function handlePublish() {
  if (!createForm.value.text && createForm.value.attachments.length === 0) {
    message.warning('请输入内容或添加附件');
    return;
  }

  if (
    createForm.value.visibleType === 'FILTERED' &&
    !hasFilterConditions.value
  ) {
    message.warning('请设置客户筛选条件');
    return;
  }

  createLoading.value = true;
  try {
    const payload: Record<string, unknown> = {
      name: `朋友圈发布 - ${new Date().toLocaleString('zh-CN')}`,
      text: createForm.value.text,
      visibleType: createForm.value.visibleType,
      attachments: createForm.value.attachments.map((att) => ({
        type: att.type,
        materialId: att.materialId, // Important: for usage tracking
        mediaId: att.mediaId,
        url: att.url || att.ossUrl,
        name: att.name,
      })),
    };

    // Add filter conditions if using FILTERED mode
    if (createForm.value.visibleType === 'FILTERED') {
      const c = filterConditions.value;
      if (c.tagIds.length > 0) {
        payload.tagIds = c.tagIds;
        payload.tagLogic = c.tagLogic;
      }
      if (c.departmentIds.length > 0) {
        payload.departmentIds = c.departmentIds;
      }
      if (c.excludeDepartmentIds.length > 0) {
        payload.excludeDepartmentIds = c.excludeDepartmentIds;
      }
      if (c.ownerIds.length > 0) {
        payload.ownerIds = c.ownerIds;
      }
      if (c.statuses.length > 0) {
        payload.statuses = c.statuses;
      }
      if (c.lifecycleStages.length > 0) {
        payload.lifecycleStages = c.lifecycleStages;
      }
      if (c.importedCustomerIds.length > 0) {
        payload.importedCustomerIds = c.importedCustomerIds;
      }
    }

    await requestClient.post('/messaging/moments', payload);
    message.success('已通知成员发表');

    // Reset form
    createForm.value = {
      visibleType: 'ALL',
      text: '',
      attachments: [],
    };
    filterConditions.value = {
      tagIds: [],
      tagLogic: 'ANY',
      departmentIds: [],
      excludeDepartmentIds: [],
      ownerIds: [],
      statuses: [],
      lifecycleStages: [],
      importedCustomerIds: [],
    };
    previewCount.value = 0;
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : '发布失败';
    message.error(errorMessage);
  } finally {
    createLoading.value = false;
  }
}

async function handleRemind(id: number) {
  try {
    await requestClient.post(`/messaging/moments/${id}/remind`);
    message.success('已发送提醒');
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : '提醒失败';
    message.error(errorMessage);
  }
}

async function handleDelete(id: number) {
  try {
    await requestClient.delete(`/messaging/moments/${id}`);
    message.success('删除成功');
    fetchMoments();
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : '删除失败';
    message.error(errorMessage);
  }
}

function handleTabChange(key: string | number) {
  activeTab.value = String(key);
  if (key === 'history') {
    fetchMoments();
  } else if (key === 'materials') {
    materialsPage.value = 1;
    fetchMaterials();
  }
}

function handleMaterialsPageChange(page: number) {
  materialsPage.value = page;
  fetchMaterials();
}

// ==================== 统计与重试 ====================

async function fetchFailedCount() {
  try {
    const res = await requestClient.get<{
      totalTasks: number;
      failedTasks: number;
    }>('/messaging/moments/statistics');
    failedCount.value = res.failedTasks || 0;
  } catch (e) {
    console.error(e);
  }
}

async function handleRetryFailed() {
  retryLoading.value = true;
  try {
    const res = await requestClient.post<{
      total: number;
      succeeded: number;
      failed: number;
    }>('/messaging/moments/retry-failed');
    message.success(
      `重试完成：成功 ${res.succeeded} 条，失败 ${res.failed} 条`,
    );
    fetchFailedCount();
    if (activeTab.value === 'history') {
      fetchMoments();
    }
  } catch (e: any) {
    message.error(e.message || '重试失败');
  } finally {
    retryLoading.value = false;
  }
}

function goToStatistics() {
  router.push('/messaging/moments/statistics');
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchFailedCount();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">企业发表到客户的朋友圈</h2>
        <p class="text-gray-500">
          管理员或负责人编辑内容，选择可见的客户，成员确认后发表到客户的朋友圈
        </p>
      </div>
      <Space>
        <Button @click="goToStatistics"> <BarChartOutlined /> 数据统计 </Button>
        <Button
          v-if="failedCount > 0"
          type="primary"
          danger
          :loading="retryLoading"
          @click="handleRetryFailed"
        >
          <ReloadOutlined /> 重试失败 ({{ failedCount }})
        </Button>
      </Space>
    </div>

    <Card>
      <Tabs v-model:activeKey="activeTab" @change="handleTabChange">
        <!-- Create Tab -->
        <TabPane key="create" tab="新建内容">
          <div class="max-w-3xl">
            <Form layout="vertical">
              <Form.Item label="可见的客户">
                <div class="flex flex-col gap-2">
                  <Radio.Group v-model:value="createForm.visibleType">
                    <Radio value="ALL">公开（所有客户可见）</Radio>
                    <Radio value="FILTERED">按条件筛选的客户</Radio>
                  </Radio.Group>

                  <div
                    v-if="createForm.visibleType === 'FILTERED'"
                    class="mt-2"
                  >
                    <div class="flex items-center gap-2">
                      <Button
                        type="primary"
                        ghost
                        @click="handleOpenFilterDrawer"
                      >
                        <FilterOutlined /> 设置筛选条件
                      </Button>
                      <span v-if="previewCount > 0" class="text-blue-500">
                        {{ previewCount }} 位客户
                      </span>
                    </div>

                    <Alert
                      v-if="hasFilterConditions"
                      class="mt-2"
                      type="info"
                      :message="`已设置筛选条件：${filterSummary}`"
                      show-icon
                    />
                  </div>
                </div>
              </Form.Item>

              <Form.Item label="内容">
                <Input.TextArea
                  v-model:value="createForm.text"
                  placeholder="输入内容..."
                  :rows="4"
                  :maxlength="2000"
                  show-count
                />
              </Form.Item>

              <Form.Item label="添加附件">
                <!-- Attachment Preview List -->
                <div
                  v-if="createForm.attachments.length > 0"
                  class="mb-4 flex flex-wrap gap-3"
                >
                  <Card
                    v-for="att in createForm.attachments"
                    :key="att.id"
                    class="relative w-32"
                    size="small"
                    :body-style="{ padding: '8px' }"
                  >
                    <!-- Remove button -->
                    <Button
                      type="text"
                      danger
                      size="small"
                      class="absolute -right-2 -top-2 z-10"
                      shape="circle"
                      @click="handleRemoveAttachment(att.id!)"
                    >
                      <DeleteOutlined />
                    </Button>

                    <!-- Preview -->
                    <div
                      class="mb-2 flex h-20 items-center justify-center overflow-hidden rounded bg-gray-100"
                    >
                      <Image
                        v-if="
                          (att.type === 'image' || att.type === 'video') &&
                          (att.ossUrl || att.thumbnail)
                        "
                        :src="att.ossUrl || att.thumbnail"
                        :preview="false"
                        class="h-full w-full object-cover"
                      />
                      <div
                        v-else-if="att.type === 'link'"
                        class="flex flex-col items-center text-gray-400"
                      >
                        <LinkOutlined class="text-2xl" />
                        <span class="mt-1 text-xs">网页</span>
                      </div>
                      <div
                        v-else
                        class="flex flex-col items-center text-gray-400"
                      >
                        <component
                          :is="
                            att.type === 'image'
                              ? PictureOutlined
                              : att.type === 'video'
                                ? VideoCameraOutlined
                                : FileOutlined
                          "
                          class="text-2xl"
                        />
                        <span class="mt-1 text-xs">{{ att.type }}</span>
                      </div>
                    </div>

                    <!-- Title -->
                    <div class="truncate text-xs text-gray-600">
                      {{ att.name || '附件' }}
                    </div>
                  </Card>
                </div>

                <div class="rounded border border-dashed p-4">
                  <div class="mb-2 text-sm text-gray-500">
                    + 添加图片/视频/网页
                    <span
                      v-if="createForm.attachments.length >= 9"
                      class="text-red-500"
                    >
                      （已达最大数量 9）
                    </span>
                    <span v-else class="text-gray-400">
                      （还可添加 {{ 9 - createForm.attachments.length }} 个）
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <Button
                      class="flex h-16 w-16 flex-col items-center justify-center"
                      :disabled="createForm.attachments.length >= 9"
                      @click="handleOpenMaterialPicker('image')"
                    >
                      <PictureOutlined class="text-lg" />
                      <span class="mt-1 text-xs">图片</span>
                    </Button>

                    <Button
                      class="flex h-16 w-16 flex-col items-center justify-center"
                      :disabled="createForm.attachments.length >= 9"
                      @click="handleOpenMaterialPicker('video')"
                    >
                      <VideoCameraOutlined class="text-lg" />
                      <span class="mt-1 text-xs">视频</span>
                    </Button>

                    <Button
                      class="flex h-16 w-16 flex-col items-center justify-center"
                      :disabled="createForm.attachments.length >= 9"
                      @click="handleOpenMaterialPicker('file')"
                    >
                      <FileOutlined class="text-lg" />
                      <span class="mt-1 text-xs">文件</span>
                    </Button>

                    <Button
                      class="flex h-16 w-16 flex-col items-center justify-center"
                      :disabled="createForm.attachments.length >= 9"
                      @click="handleOpenMaterialPicker()"
                    >
                      <FolderOpenOutlined class="text-lg" />
                      <span class="mt-1 text-xs">素材库</span>
                    </Button>
                  </div>
                  <div class="mt-2 text-xs text-gray-400">
                    支持 jpg/png 图片，mp4 视频，最多 9 个附件
                  </div>
                </div>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  :loading="createLoading"
                  @click="handlePublish"
                >
                  通知成员发表
                </Button>
              </Form.Item>
            </Form>
          </div>
        </TabPane>

        <!-- History Tab -->
        <TabPane key="history" tab="企业发表记录">
          <!-- Filters -->
          <div class="mb-4 flex flex-wrap gap-4">
            <Select
              v-model:value="filters.createdBy"
              placeholder="创建人：全部"
              style="width: 140px"
              allow-clear
            >
              <Select.Option value="">全部</Select.Option>
            </Select>

            <Select
              v-model:value="filters.status"
              placeholder="发表情况：全部"
              style="width: 140px"
              allow-clear
            >
              <Select.Option value="">全部</Select.Option>
              <Select.Option value="PUBLISHED">已发布</Select.Option>
              <Select.Option value="PENDING">待发送</Select.Option>
            </Select>

            <DatePicker.RangePicker
              v-model:value="dateRange"
              format="YYYY年MM月DD日"
              :placeholder="['开始时间', '结束时间']"
            />

            <div class="flex items-center gap-2 rounded bg-orange-50 px-3 py-1">
              <span class="text-orange-600">点赞量【大于等于】</span>
              <Input
                v-model:value="filters.minLikes"
                type="number"
                style="width: 80px"
                size="small"
              />
            </div>

            <div class="flex items-center gap-2 rounded bg-orange-50 px-3 py-1">
              <span class="text-orange-600">评论量【大于等于】</span>
              <Input
                v-model:value="filters.minComments"
                type="number"
                style="width: 80px"
                size="small"
              />
            </div>

            <div class="flex items-center gap-2 rounded bg-orange-50 px-3 py-1">
              <span class="text-orange-600">浏览量【大于等于】</span>
              <Input
                v-model:value="filters.minViews"
                type="number"
                style="width: 80px"
                size="small"
              />
            </div>

            <Button type="primary" @click="searchHistory">查询</Button>

            <Button class="ml-auto"> <ExportOutlined /> 导出 </Button>
          </div>

          <!-- Actions -->
          <div class="mb-4">
            <Button type="link" class="text-red-500">
              <BellOutlined /> 提醒成员发表
            </Button>
            <span class="ml-4 text-red-500">支持提醒成员发表的功能</span>
          </div>

          <Table
            v-bind="historyTableProps"
            :columns="historyColumns"
            :scroll="{ x: 1200 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'text'">
                <div class="flex items-start gap-2">
                  <Image
                    v-if="record.attachments?.[0]?.thumbnail"
                    :src="record.attachments[0].thumbnail"
                    :width="48"
                    :height="48"
                    class="rounded"
                  />
                  <div class="flex-1">
                    <div class="line-clamp-2">{{ record.text }}</div>
                  </div>
                </div>
              </template>

              <template v-if="column.key === 'likeCount'">
                <div class="flex items-center gap-1">
                  <LikeOutlined class="text-gray-400" />
                  {{ record.likeCount || 0 }}
                </div>
              </template>

              <template v-if="column.key === 'commentCount'">
                <div class="flex items-center gap-1">
                  <CommentOutlined class="text-gray-400" />
                  {{ record.commentCount || 0 }}
                </div>
              </template>

              <template v-if="column.key === 'viewCount'">
                <div class="flex items-center gap-1">
                  <EyeOutlined class="text-gray-400" />
                  {{ record.viewCount || 0 }}
                </div>
              </template>

              <template v-if="column.key === 'status'">
                <Tag :color="statusMap[record.status]?.color || 'default'">
                  {{ statusMap[record.status]?.label || record.status }}
                </Tag>
                <div
                  v-if="record.publishedAt"
                  class="mt-1 text-xs text-gray-400"
                >
                  {{ record.senderList?.length || 0 }}名成员已发表到{{
                    record.viewCount || 0
                  }}位客户的...
                </div>
              </template>

              <template v-if="column.key === 'actions'">
                <Space>
                  <Button
                    type="link"
                    size="small"
                    @click="handleRemind(record.id)"
                  >
                    提醒
                  </Button>
                  <Popconfirm
                    title="确定要删除吗？"
                    @confirm="handleDelete(record.id)"
                  >
                    <Button type="link" size="small" danger> 删除 </Button>
                  </Popconfirm>
                </Space>
              </template>
            </template>
          </Table>
        </TabPane>

        <!-- Materials Tab -->
        <TabPane key="materials" tab="素材库">
          <!-- Filters -->
          <div class="mb-4 flex flex-wrap gap-4 rounded bg-gray-50 p-4">
            <div class="flex items-center gap-2">
              <span>筛选条件:</span>
              <Input placeholder="活动标题【包含】" style="width: 160px" />
            </div>
            <Input placeholder="创建人【在之中】" style="width: 160px" />
            <Input placeholder="创建时间【大于等于】" style="width: 160px" />
            <Input placeholder="创建时间【小于】" style="width: 160px" />
            <Button type="primary">筛选</Button>
          </div>

          <!-- Add button -->
          <div class="mb-4">
            <Button type="primary"> <PlusOutlined /> 添加素材 </Button>
          </div>

          <Table
            :columns="materialColumns"
            :data-source="materials"
            :loading="materialsLoading"
            :pagination="{
              current: materialsPage,
              pageSize: 10,
              total: materialsTotal,
              onChange: handleMaterialsPageChange,
              showSizeChanger: true,
              showTotal: (t: number) => `共 ${t} 条`,
            }"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'title'">
                <div class="flex items-start gap-2">
                  <Image
                    v-if="record.thumbnail"
                    :src="record.thumbnail"
                    :width="48"
                    :height="48"
                    class="rounded"
                  />
                  <div class="flex-1">{{ record.title }}</div>
                </div>
              </template>

              <template v-if="column.key === 'actions'">
                <Space>
                  <Button type="link" size="small">
                    <EditOutlined /> 编辑
                  </Button>
                  <Button type="link" size="small" danger>
                    <DeleteOutlined /> 删除
                  </Button>
                </Space>
              </template>
            </template>
          </Table>
        </TabPane>
      </Tabs>
    </Card>

    <!-- Customer Filter Drawer -->
    <CustomerFilterDrawer
      v-model:open="filterDrawerVisible"
      :initial-conditions="filterConditions"
      @confirm="handleFilterConfirm"
    />

    <!-- Material Picker Modal -->
    <MaterialPicker
      v-model:open="materialPickerVisible"
      :type="materialPickerType"
      :multiple="true"
      :max-count="9 - createForm.attachments.length"
      @select="handleMaterialSelect"
    />
  </div>
</template>
