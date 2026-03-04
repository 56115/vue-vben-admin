<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue';
import { useRouter } from 'vue-router';
import {
  Card,
  Button,
  Tree,
  Empty,
  Space,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  message,
  Radio,
  Pagination,
} from 'ant-design-vue';
import {
  PlusOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  CheckSquareOutlined,
  FolderOutlined,
  FileTextOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  LinkOutlined,
  FileOutlined,
  FolderOpenOutlined,
  ImportOutlined,
  ExportOutlined,
  HistoryOutlined,
} from '@ant-design/icons-vue';
import { useModalForm } from '#/composables';
import { requestClient } from '#/api/request';
import MaterialCard from './components/MaterialCard.vue';
import BatchToolbar from './components/BatchToolbar.vue';
import FilterPanel from './components/FilterPanel.vue';
import MaterialDetailDrawer from './components/MaterialDetailDrawer.vue';
import ImportExportModal from './components/ImportExportModal.vue';
import VersionManager from './components/VersionManager.vue';
import AIAssistant from './components/AIAssistant.vue';
import { useMaterialLibrary } from './composables/useMaterialLibrary';
import type { MaterialItem, MaterialFormState } from './types';

// ==================== 路由 ====================
const router = useRouter();

// ==================== 使用 composable ====================
const {
  viewMode,
  selectionMode,
  selectedIds,
  filters,
  categories,
  selectedCategoryId,
  categoryLoading,
  materials,
  loading,
  pagination,
  detailVisible,
  selectedMaterial,
  hasSelection,
  selectedCount,
  fetchMaterials,
  fetchCategories,
  toggleSelection,
  selectAll,
  clearSelection,
  enterSelectionMode,
  openDetail,
  closeDetail,
  batchDelete,
  batchChangeCategory,
  batchAddTags,
  batchRemoveTags,
  batchChangeStatus,
  batchExport,
  deleteMaterial,
  updateFilters,
  resetFilters,
} = useMaterialLibrary();

// ==================== 分类相关 ====================
const categoryModalVisible = ref(false);
const categoryFormState = ref({
  name: '',
  parentId: null as number | null,
});

// ==================== 导入导出 ====================
const importExportVisible = ref(false);

// ==================== 版本管理 ====================
const versionManagerVisible = ref(false);
const versionManagerMaterial = ref<MaterialItem | null>(null);

// 分类树数据
const categoryTreeData = computed(() => {
  const buildTree = (items: any[], parentId: number | null = null): any[] => {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        key: item.id,
        title: `${item.name} (${item.materialCount || 0})`,
        icon: () => h(FolderOutlined),
        children: buildTree(items, item.id),
      }));
  };

  return [
    {
      key: 'all',
      title: `全部分类 (${materials.value.length})`,
      icon: () => h(FolderOpenOutlined),
    },
    ...buildTree(categories.value),
  ];
});

function handleCategorySelect(selectedKeys: string[]) {
  const key = selectedKeys[0];
  if (key === 'all') {
    selectedCategoryId.value = null;
  } else {
    selectedCategoryId.value = Number(key);
  }
  fetchMaterials();
}

async function handleCreateCategory() {
  if (!categoryFormState.value.name.trim()) {
    message.warning('请输入分类名称');
    return;
  }

  try {
    await requestClient.post('/messaging/material/categories', {
      name: categoryFormState.value.name,
      parentId: categoryFormState.value.parentId || undefined,
    });
    message.success('分类创建成功');
    categoryModalVisible.value = false;
    categoryFormState.value = { name: '', parentId: null };
    fetchCategories();
  } catch (e) {
    message.error('创建分类失败');
  }
}

// ==================== 素材表单 ====================
const { visible, formState, isEditing, openCreate, openEdit, submit } =
  useModalForm<MaterialFormState>({
    createApi: async (data) => {
      await requestClient.post('/messaging/material', {
        name: data.name,
        description: data.description || undefined,
        type: data.type,
        content: data.content || undefined,
        mediaIds: data.mediaIds.length ? data.mediaIds : undefined,
        linkUrl: data.linkUrl || undefined,
        linkTitle: data.linkTitle || undefined,
        categoryId: data.categoryId || undefined,
        tags: data.tags.length ? data.tags : undefined,
        isPublic: data.isPublic,
      });
    },
    updateApi: async (id, data) => {
      await requestClient.put(`/messaging/material/${id}`, {
        name: data.name,
        description: data.description || undefined,
        type: data.type,
        content: data.content || undefined,
        mediaIds: data.mediaIds.length ? data.mediaIds : undefined,
        linkUrl: data.linkUrl || undefined,
        linkTitle: data.linkTitle || undefined,
        categoryId: data.categoryId || undefined,
        tags: data.tags.length ? data.tags : undefined,
        isPublic: data.isPublic,
      });
    },
    initialValues: () => ({
      name: '',
      description: '',
      type: 'TEXT',
      content: '',
      mediaIds: [],
      linkUrl: '',
      linkTitle: '',
      categoryId: null,
      tags: [],
      isPublic: true,
    }),
    afterSubmit: fetchMaterials,
  });

// ==================== 素材卡片事件 ====================
function handleCardClick(material: MaterialItem) {
  openDetail(material);
}

function handleCardSelect(material: MaterialItem, selected: boolean) {
  toggleSelection(material.id);
  if (selected && !selectionMode.value) {
    enterSelectionMode();
  }
}

function handleCardEdit(material: MaterialItem) {
  openEdit(material.id, {
    name: material.name,
    description: material.description || '',
    type: material.type,
    content: material.content || '',
    mediaIds: material.mediaIds || [],
    linkUrl: material.linkUrl || '',
    linkTitle: material.linkTitle || '',
    categoryId: material.categoryId,
    tags: material.tags || [],
    isPublic: material.isPublic,
  });
}

function handleCardDelete(material: MaterialItem) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除素材"${material.name}"吗？`,
    okText: '删除',
    cancelText: '取消',
    okButtonProps: { danger: true },
    onOk: () => deleteMaterial(material.id),
  });
}

function handleCardUse(material: MaterialItem) {
  message.info(`使用素材: ${material.name}`);
  // 这里可以打开使用场景选择器
}

// ==================== 批量操作 ====================
function handleSelectAll() {
  selectAll();
}

// ==================== 导航 ====================
function goToStatistics() {
  router.push('/messaging/material/statistics');
}

// ==================== 生命周期 ====================
onMounted(() => {
  fetchCategories();
  fetchMaterials();
});
</script>

<template>
  <div class="material-library">
    <div class="material-layout">
      <!-- 左侧分类树 -->
      <Card class="category-sidebar" :bordered="false">
        <template #title>
          <span class="sidebar-title">素材分类</span>
        </template>
        <template #extra>
          <Button
            type="link"
            size="small"
            :icon="h(PlusOutlined)"
            @click="categoryModalVisible = true"
          >
            添加
          </Button>
        </template>

        <Tree
          v-if="categories.length"
          :tree-data="categoryTreeData"
          :selected-keys="[selectedCategoryId ?? 'all']"
          default-expand-all
          @select="handleCategorySelect"
        >
          <template #title="{ title, icon }">
            <span class="tree-node">
              <component :is="icon" />
              {{ title }}
            </span>
          </template>
        </Tree>
        <Empty v-else description="暂无分类" />
      </Card>

      <!-- 右侧内容区 -->
      <div class="content-area">
        <!-- 工具栏 -->
        <div class="content-toolbar">
          <div class="toolbar-left">
            <!-- 视图切换 -->
            <Radio.Group
              v-model:value="viewMode"
              button-style="solid"
              size="small"
            >
              <Radio.Button value="grid">
                <AppstoreOutlined /> 卡片
              </Radio.Button>
              <Radio.Button value="list">
                <UnorderedListOutlined /> 列表
              </Radio.Button>
            </Radio.Group>

            <!-- 选择模式切换 -->
            <Button
              size="small"
              :type="selectionMode ? 'primary' : 'default'"
              :icon="h(CheckSquareOutlined)"
              @click="selectionMode ? clearSelection() : enterSelectionMode()"
            >
              {{ selectionMode ? `已选 ${selectedCount}` : '批量选择' }}
            </Button>

            <!-- 全选 -->
            <Button v-if="selectionMode" size="small" @click="handleSelectAll">
              {{ selectedCount === materials.length ? '取消全选' : '全选' }}
            </Button>
          </div>

          <div class="toolbar-right">
            <Button @click="goToStatistics">
              <BarChartOutlined /> 数据统计
            </Button>
            <Button @click="importExportVisible = true">
              <ImportOutlined /> 导入/导出
            </Button>
            <Button type="primary" :icon="h(PlusOutlined)" @click="openCreate">
              新建素材
            </Button>
          </div>
        </div>

        <!-- 筛选面板 -->
        <FilterPanel
          :filters="filters"
          :categories="categories"
          @update="updateFilters"
          @search="fetchMaterials"
          @reset="resetFilters"
        />

        <!-- 素材列表 -->
        <Card class="material-list-card" :bordered="false" :loading="loading">
          <!-- 网格视图 -->
          <div v-if="viewMode === 'grid'" class="material-grid">
            <MaterialCard
              v-for="material in materials"
              :key="material.id"
              :material="material"
              :selected="selectedIds.includes(material.id)"
              :selection-mode="selectionMode"
              view-mode="grid"
              @click="handleCardClick"
              @select="handleCardSelect"
              @edit="handleCardEdit"
              @delete="handleCardDelete"
              @use="handleCardUse"
            />
          </div>

          <!-- 列表视图 -->
          <div v-else class="material-list">
            <MaterialCard
              v-for="material in materials"
              :key="material.id"
              :material="material"
              :selected="selectedIds.includes(material.id)"
              :selection-mode="selectionMode"
              view-mode="list"
              @click="handleCardClick"
              @select="handleCardSelect"
              @edit="handleCardEdit"
              @delete="handleCardDelete"
              @use="handleCardUse"
            />
          </div>

          <!-- 空状态 -->
          <Empty
            v-if="!loading && !materials.length"
            description="暂无素材，点击右上角新建"
            class="empty-state"
          />

          <!-- 分页 -->
          <div v-if="pagination.total > 0" class="pagination-bar">
            <Pagination
              v-model:current="pagination.page"
              v-model:page-size="pagination.pageSize"
              :total="pagination.total"
              :page-size-options="['12', '24', '48', '96']"
              show-size-changer
              show-total
              @change="fetchMaterials"
            />
          </div>
        </Card>
      </div>
    </div>

    <!-- 批量操作工具栏 -->
    <BatchToolbar
      :selected-count="selectedCount"
      :categories="categories"
      @clear="clearSelection"
      @delete="batchDelete"
      @change-category="batchChangeCategory"
      @add-tags="batchAddTags"
      @remove-tags="batchRemoveTags"
      @change-status="batchChangeStatus"
      @export="batchExport"
    />

    <!-- 素材详情抽屉 -->
    <MaterialDetailDrawer
      v-model:visible="detailVisible"
      :material="selectedMaterial"
      @edit="handleCardEdit"
      @delete="handleCardDelete"
      @use="handleCardUse"
    />

    <!-- 新建/编辑素材弹窗 -->
    <Modal
      v-model:open="visible"
      :title="isEditing ? '编辑素材' : '新建素材'"
      width="700px"
      :confirm-loading="loading"
      @ok="submit"
    >
      <Form layout="vertical" class="mt-4">
        <Form.Item label="素材名称" required>
          <Input
            v-model:value="formState.name"
            placeholder="输入素材名称"
            :maxlength="100"
            show-count
          />
        </Form.Item>

        <Form.Item label="素材描述">
          <Input.TextArea
            v-model:value="formState.description"
            placeholder="简要描述素材用途"
            :rows="2"
            :maxlength="500"
            show-count
          />
        </Form.Item>

        <Form.Item label="素材类型">
          <Radio.Group v-model:value="formState.type">
            <Radio.Button value="TEXT">文本</Radio.Button>
            <Radio.Button value="IMAGE">图片</Radio.Button>
            <Radio.Button value="VIDEO">视频</Radio.Button>
            <Radio.Button value="LINK">链接</Radio.Button>
            <Radio.Button value="FILE">文件</Radio.Button>
            <Radio.Button value="MIXED">图文</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          v-if="['TEXT', 'MIXED'].includes(formState.type)"
          label="文本内容"
        >
          <Input.TextArea
            v-model:value="formState.content"
            placeholder="输入素材文本内容..."
            :rows="4"
            :maxlength="2000"
            show-count
          />
        </Form.Item>

        <Form.Item v-if="formState.type === 'LINK'" label="链接地址">
          <Input v-model:value="formState.linkUrl" placeholder="https://" />
        </Form.Item>

        <Form.Item v-if="formState.type === 'LINK'" label="链接标题">
          <Input
            v-model:value="formState.linkTitle"
            placeholder="链接显示标题"
          />
        </Form.Item>

        <Form.Item label="所属分类">
          <Select
            v-model:value="formState.categoryId"
            placeholder="选择分类"
            allow-clear
            style="width: 200px"
          >
            <Select.Option
              v-for="cat in categories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="标签">
          <Select
            v-model:value="formState.tags"
            mode="tags"
            placeholder="添加标签，便于分类管理"
            :token-separators="[',', '，']"
            style="width: 100%"
          >
            <Select.Option value="产品">产品</Select.Option>
            <Select.Option value="活动">活动</Select.Option>
            <Select.Option value="节日">节日</Select.Option>
            <Select.Option value="促销">促销</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>

    <!-- 添加分类弹窗 -->
    <Modal
      v-model:open="categoryModalVisible"
      title="添加分类"
      @ok="handleCreateCategory"
    >
      <Form layout="vertical" class="mt-4">
        <Form.Item label="分类名称" required>
          <Input
            v-model:value="categoryFormState.name"
            placeholder="输入分类名称"
          />
        </Form.Item>
        <Form.Item label="上级分类">
          <Select
            v-model:value="categoryFormState.parentId"
            placeholder="选择上级分类（可选）"
            allow-clear
          >
            <Select.Option
              v-for="cat in categories.filter((c) => c.parentId === null)"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>

    <!-- 导入导出弹窗 -->
    <ImportExportModal
      v-model:visible="importExportVisible"
      :selected-ids="selectedIds"
      @success="fetchMaterials"
    />

    <!-- 版本管理抽屉 -->
    <VersionManager
      v-model:visible="versionManagerVisible"
      :material="versionManagerMaterial"
      @restored="fetchMaterials"
    />
  </div>
</template>

<style scoped>
.material-library {
  height: 100%;
  padding: 16px;
  background: hsl(var(--background));
}

.material-layout {
  display: flex;
  gap: 16px;
  height: 100%;
}

.category-sidebar {
  flex-shrink: 0;
  width: 240px;
  height: fit-content;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
}

.tree-node {
  display: flex;
  gap: 6px;
  align-items: center;
}

.content-area {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.content-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: hsl(var(--card));
  border-radius: 8px;
}

.toolbar-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.material-list-card {
  flex: 1;
  min-height: 0;
}

.material-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  padding: 16px;
}

.material-list {
  display: flex;
  flex-direction: column;
}

.empty-state {
  padding: 64px 0;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 16px;
  border-top: 1px solid hsl(var(--border));
}
</style>
