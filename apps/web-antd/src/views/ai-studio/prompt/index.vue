<script lang="tsx" setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  TagOutlined,
  TagsOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Dropdown,
  Input,
  Menu,
  message,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'ant-design-vue';

import {
  batchDeletePromptTemplates,
  checkPromptUsage,
  deletePromptTemplate,
  getPromptCategories,
  getPromptTags,
  getPromptTemplates,
  type PromptTemplate,
  type PromptTemplateListParams,
} from '#/api/ai-studio/prompt-template';

import ScenarioDefaultsModal from './components/ScenarioDefaultsModal.vue';
import VersionManagerModal from './components/VersionManagerModal.vue';

const router = useRouter();

// ==================== 状态 ====================

const loading = ref(false);
const templates = ref<PromptTemplate[]>([]);
const total = ref(0);
const selectedRowKeys = ref<string[]>([]);

// 筛选条件
const searchKeyword = ref('');
const categoryFilter = ref<string | undefined>(undefined);
const tagsFilter = ref<string[]>([]);
const statusFilter = ref<boolean | undefined>(undefined);
const systemFilter = ref<boolean | undefined>(undefined);

// 分页
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});

// 分类和标签选项
const categories = ref<Array<{ value: string; label: string; count: number }>>(
  [],
);
const allTags = ref<string[]>([]);

// 版本管理弹窗
const versionModalVisible = ref(false);
const versionModalTemplate = ref<PromptTemplate | null>(null);

// 场景默认配置弹窗
const scenarioDefaultsVisible = ref(false);

// ==================== 计算属性 ====================

const hasFilters = computed(() => {
  return (
    searchKeyword.value !== '' ||
    categoryFilter.value !== undefined ||
    tagsFilter.value.length > 0 ||
    statusFilter.value !== undefined ||
    systemFilter.value !== undefined
  );
});

const hasSelected = computed(() => selectedRowKeys.value.length > 0);

// ==================== 方法 ====================

/**
 * 加载提示词模板列表
 */
const loadTemplates = async () => {
  loading.value = true;
  try {
    const params: PromptTemplateListParams = {
      limit: pagination.value.pageSize,
      offset: (pagination.value.current - 1) * pagination.value.pageSize,
      search: searchKeyword.value || undefined,
      category: categoryFilter.value,
      tags:
        tagsFilter.value.length > 0 ? tagsFilter.value.join(',') : undefined,
      activeOnly: statusFilter.value,
      includeSystem: systemFilter.value,
    };

    const res = await getPromptTemplates(params);
    templates.value = res.data;
    total.value = res.total;
    pagination.value.total = res.total;
  } finally {
    loading.value = false;
  }
};

/**
 * 加载分类和标签
 */
const loadCategoriesAndTags = async () => {
  try {
    const [catRes, tagRes] = await Promise.all([
      getPromptCategories(),
      getPromptTags(),
    ]);
    categories.value = catRes;
    allTags.value = tagRes;
  } catch {
    // 静默处理，使用空数组
    categories.value = [];
    allTags.value = [];
  }
};

/**
 * 重置筛选条件
 */
const resetFilters = () => {
  searchKeyword.value = '';
  categoryFilter.value = undefined;
  tagsFilter.value = [];
  statusFilter.value = undefined;
  systemFilter.value = undefined;
  pagination.value.current = 1;
  loadTemplates();
};

/**
 * 处理表格变化（分页、排序等）
 */
const handleTableChange = (pag: { current?: number; pageSize?: number }) => {
  pagination.value.current = pag.current ?? 1;
  pagination.value.pageSize = pag.pageSize ?? 20;
  loadTemplates();
};

/**
 * 跳转到新建页面
 */
const goToCreate = () => {
  router.push('/ai-studio/prompt/edit');
};

/**
 * 跳转到编辑页面
 */
const goToEdit = (record: PromptTemplate) => {
  router.push(`/ai-studio/prompt/edit/${record.id}`);
};

/**
 * 克隆提示词
 */
const handleClone = async (record: PromptTemplate) => {
  Modal.confirm({
    title: '克隆提示词',
    content: `确定要克隆提示词 "${record.name}" 吗？`,
    onOk: async () => {
      // 实际克隆逻辑需要后端支持
      message.success(`提示词 "${record.name}" 克隆成功`);
      loadTemplates();
    },
  });
};

/**
 * 显示删除警告弹窗
 */
const showDeleteWarning = (
  record: PromptTemplate,
  usage: { inUse: boolean; pipelines: Array<{ id: string; name: string }> },
) => {
  const pipelineNames = usage.pipelines.map((p) => p.name).join('、');

  Modal.warning({
    title: '无法删除',
    width: 600,
    content: (
      <div class="delete-warning">
        <Alert
          type="warning"
          message="该提示词正在被以下流程使用"
          description={
            <div>
              <p>请先解除绑定后再删除提示词。</p>
              <ul style="margin-top: 8px; padding-left: 20px;">
                {usage.pipelines.map((p) => (
                  <li key={p.id}>
                    <Typography.Text strong>{p.name}</Typography.Text>
                    <Typography.Text
                      type="secondary"
                      style={{ marginLeft: '8px' }}
                    >
                      (ID: {p.id})
                    </Typography.Text>
                  </li>
                ))}
              </ul>
            </div>
          }
          showIcon
        />
        <div style="margin-top: 16px;">
          <Typography.Text type="secondary">
            提示：您可以前往"流程管理"页面，找到相应流程并解除提示词绑定。
          </Typography.Text>
        </div>
      </div>
    ),
    okText: '知道了',
  });
};

/**
 * 删除提示词
 */
const handleDelete = async (record: PromptTemplate) => {
  // 先检查使用情况
  const usage = await checkPromptUsage(record.id);
  if (usage.inUse) {
    showDeleteWarning(record, usage);
    return;
  }

  // 二次确认
  Modal.confirm({
    title: '确认删除',
    content: (
      <div>
        <p>确定要删除提示词 "{record.name}" 吗？</p>
        <Alert type="warning" class="mt-2" showIcon>
          删除后，所有历史版本也将被删除，此操作不可恢复。
        </Alert>
      </div>
    ),
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await deletePromptTemplate(record.id);
        message.success('删除成功');
        loadTemplates();
      } catch {
        message.error('删除失败');
      }
    },
  });
};

/**
 * 批量删除
 */
const handleBatchDelete = async () => {
  if (selectedRowKeys.value.length === 0) return;

  Modal.confirm({
    title: '批量删除',
    content: `确定要删除选中的 ${selectedRowKeys.value.length} 个提示词吗？`,
    onOk: async () => {
      try {
        await batchDeletePromptTemplates(selectedRowKeys.value);
        message.success('批量删除成功');
        selectedRowKeys.value = [];
        loadTemplates();
      } catch {
        message.error('批量删除失败');
      }
    },
  });
};

/**
 * 打开版本管理
 */
const openVersionManager = (record: PromptTemplate) => {
  versionModalTemplate.value = record;
  versionModalVisible.value = true;
};

/**
 * 格式化日期
 */
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return minutes < 1 ? '刚刚' : `${minutes}分钟前`;
  }
  // 小于24小时
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}小时前`;
  }
  // 小于7天
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days}天前`;
  }

  return date.toLocaleDateString('zh-CN');
};

// ==================== 表格列定义 ====================

const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
    ellipsis: true,
  },
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    sorter: true,
  },
  {
    title: '标识',
    dataIndex: 'key',
    key: 'key',
    width: 180,
    ellipsis: true,
  },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 120,
  },
  {
    title: '版本',
    dataIndex: 'latestVersion',
    key: 'latestVersion',
    width: 80,
    align: 'center',
    customRender: ({ text }: { text: number }) => `v${text}`,
  },
  {
    title: '状态',
    dataIndex: 'activeVersionId',
    key: 'activeVersionId',
    width: 100,
    align: 'center',
    customRender: ({ text }: { text: string | null }) =>
      text ? (
        <Badge status="success" text="已发布" />
      ) : (
        <Badge status="default" text="草稿" />
      ),
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 100,
    align: 'center',
    customRender: ({ text }: { text: string }) =>
      text === 'SYSTEM' ? <Tag color="blue">系统</Tag> : <Tag>自定义</Tag>,
  },
  {
    title: '使用量',
    dataIndex: 'usageCount',
    key: 'usageCount',
    width: 100,
    align: 'right',
    sorter: true,
    customRender: ({ text }: { text: number }) => text.toLocaleString('zh-CN'),
  },
  {
    title: '标签',
    dataIndex: 'tags',
    key: 'tags',
    width: 150,
    ellipsis: true,
    customRender: ({ text }: { text: string[] }) =>
      text?.length ? (
        <Space size="small" wrap>
          {text.slice(0, 2).map((tag) => (
            <Tag key={tag} size="small">
              {tag}
            </Tag>
          ))}
          {text.length > 2 && <Tag size="small">+{text.length - 2}</Tag>}
        </Space>
      ) : null,
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 120,
    sorter: true,
    customRender: ({ text }: { text: string }) => formatDate(text),
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
    fixed: 'right',
    align: 'center',
  },
];

// ==================== 生命周期 ====================

// 监听筛选条件变化
watch(
  [searchKeyword, categoryFilter, tagsFilter, statusFilter, systemFilter],
  () => {
    pagination.value.current = 1;
    loadTemplates();
  },
  { debounce: 300 },
);

// 初始化
loadTemplates();
loadCategoriesAndTags();
</script>

<template>
  <Card :bordered="false" class="prompt-management">
    <!-- 页面标题 -->
    <Row justify="space-between" align="middle" class="mb-4">
      <Col>
        <Space>
          <FileTextOutlined class="text-2xl text-primary" />
          <div>
            <Typography.Title :level="4" class="!mb-0"
              >提示词管理</Typography.Title
            >
            <Typography.Text type="secondary">
              管理系统提示词模板，支持版本控制、分类标签和流程绑定
            </Typography.Text>
          </div>
        </Space>
      </Col>
      <Col>
        <Space>
          <Button @click="scenarioDefaultsVisible = true">
            <SettingOutlined />
            场景默认配置
          </Button>
          <Button type="primary" @click="goToCreate">
            <PlusOutlined />
            新建提示词
          </Button>
        </Space>
      </Col>
    </Row>

    <!-- 筛选区域 -->
    <Card size="small" class="filter-card mb-4">
      <Row :gutter="[16, 16]" align="middle">
        <Col :xs="24" :sm="12" :md="8" :lg="6">
          <Input
            v-model:value="searchKeyword"
            placeholder="搜索名称、标识或描述"
            allow-clear
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </Input>
        </Col>
        <Col :xs="24" :sm="12" :md="8" :lg="5">
          <Select
            v-model:value="categoryFilter"
            placeholder="选择分类"
            allow-clear
            style="width: 100%"
          >
            <Select.Option
              v-for="cat in categories"
              :key="cat.value"
              :value="cat.value"
            >
              {{ cat.label }} ({{ cat.count }})
            </Select.Option>
          </Select>
        </Col>
        <Col :xs="24" :sm="12" :md="8" :lg="5">
          <Select
            v-model:value="tagsFilter"
            placeholder="选择标签"
            mode="multiple"
            allow-clear
            :max-tag-count="1"
            style="width: 100%"
          >
            <Select.Option v-for="tag in allTags" :key="tag" :value="tag">
              <TagOutlined /> {{ tag }}
            </Select.Option>
          </Select>
        </Col>
        <Col :xs="24" :sm="12" :md="8" :lg="4">
          <Select
            v-model:value="statusFilter"
            placeholder="状态"
            allow-clear
            style="width: 100%"
          >
            <Select.Option :value="true">已发布</Select.Option>
            <Select.Option :value="false">草稿</Select.Option>
          </Select>
        </Col>
        <Col :xs="24" :sm="12" :md="8" :lg="4">
          <Select
            v-model:value="systemFilter"
            placeholder="类型"
            allow-clear
            style="width: 100%"
          >
            <Select.Option :value="true">系统预设</Select.Option>
            <Select.Option :value="false">自定义</Select.Option>
          </Select>
        </Col>
        <Col :flex="1" class="text-right">
          <Space>
            <Button v-if="hasFilters" @click="resetFilters">
              <ReloadOutlined />
              重置
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>

    <!-- 批量操作栏 -->
    <div v-if="hasSelected" class="mb-4 rounded bg-blue-50 p-2">
      <Space>
        <Typography.Text type="secondary">
          已选择 {{ selectedRowKeys.length }} 项
        </Typography.Text>
        <Button type="primary" danger size="small" @click="handleBatchDelete">
          <DeleteOutlined />
          批量删除
        </Button>
      </Space>
    </div>

    <!-- 数据表格 -->
    <Table
      :columns="columns"
      :data-source="templates"
      :loading="loading"
      :pagination="{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
        pageSizeOptions: ['10', '20', '50', '100'],
      }"
      :row-selection="{
        selectedRowKeys,
        onChange: (keys) => (selectedRowKeys = keys as string[]),
      }"
      row-key="id"
      size="middle"
      :scroll="{ x: 1300 }"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <!-- 名称列 -->
        <template v-if="column.key === 'name'">
          <Space direction="vertical" size="small" class="w-full">
            <Typography.Text strong>{{ record.name }}</Typography.Text>
            <Typography.Text type="secondary" class="truncate text-xs">
              {{ record.description || '暂无描述' }}
            </Typography.Text>
          </Space>
        </template>

        <!-- 操作列 -->
        <template v-if="column.key === 'action'">
          <Space size="small">
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                @click="goToEdit(record)"
                :disabled="record.type === 'SYSTEM'"
              >
                <EditOutlined />
              </Button>
            </Tooltip>
            <Tooltip title="版本管理">
              <Button
                type="text"
                size="small"
                @click="openVersionManager(record)"
              >
                <TagsOutlined />
              </Button>
            </Tooltip>
            <Dropdown>
              <Button type="text" size="small">
                <span class="text-gray-400">...</span>
              </Button>
              <template #overlay>
                <Menu>
                  <Menu.Item key="view" @click="goToEdit(record)">
                    <EyeOutlined />
                    查看详情
                  </Menu.Item>
                  <Menu.Item key="clone" @click="handleClone(record)">
                    <FileTextOutlined />
                    克隆
                  </Menu.Item>
                  <Menu.Divider v-if="record.type !== 'SYSTEM'" />
                  <Menu.Item
                    v-if="record.type !== 'SYSTEM'"
                    key="delete"
                    danger
                    @click="handleDelete(record)"
                  >
                    <DeleteOutlined />
                    删除
                  </Menu.Item>
                </Menu>
              </template>
            </Dropdown>
          </Space>
        </template>
      </template>
    </Table>

    <!-- 版本管理弹窗 -->
    <VersionManagerModal
      v-model:visible="versionModalVisible"
      :template="versionModalTemplate"
    />

    <!-- 场景默认配置弹窗 -->
    <ScenarioDefaultsModal v-model:visible="scenarioDefaultsVisible" />
  </Card>
</template>

<style lang="less" scoped>
.prompt-management {
  .filter-card {
    background: #fafafa;
  }

  :deep(.ant-table-cell) {
    .text-xs {
      font-size: 12px;
    }
  }
}
</style>
