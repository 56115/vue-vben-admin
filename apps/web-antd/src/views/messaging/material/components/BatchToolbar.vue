<script setup lang="ts">
import { computed, h } from 'vue';
import { Button, Space, Tag, Popconfirm, Dropdown } from 'ant-design-vue';
import {
  DeleteOutlined,
  FolderOutlined,
  TagOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  ExportOutlined,
  CloseOutlined,
} from '@ant-design/icons-vue';
import type { CategoryItem, MaterialStatus } from '../types';

const props = defineProps<{
  selectedCount: number;
  categories: CategoryItem[];
}>();

const emit = defineEmits<{
  (e: 'clear'): void;
  (e: 'delete'): void;
  (e: 'changeCategory', categoryId: number): void;
  (e: 'addTags', tags: string[]): void;
  (e: 'removeTags', tags: string[]): void;
  (e: 'changeStatus', status: MaterialStatus): void;
  (e: 'export'): void;
}>();

const isVisible = computed(() => props.selectedCount > 0);

// 分类菜单
const categoryMenuItems = computed(() => {
  const items: any[] = [];

  // 添加"未分类"选项
  items.push({
    key: 'null',
    label: '未分类',
    onClick: () => emit('changeCategory', null as any),
  });

  // 添加分隔线
  items.push({ type: 'divider' });

  // 递归添加分类
  function addCategories(categories: CategoryItem[], level = 0) {
    for (const cat of categories) {
      const indent = '  '.repeat(level);
      items.push({
        key: String(cat.id),
        label: `${indent}${cat.name}`,
        onClick: () => emit('changeCategory', cat.id),
      });

      if (cat.children?.length) {
        addCategories(cat.children, level + 1);
      }
    }
  }

  // 只添加顶级分类和一级子分类，避免菜单过长
  const topCategories = props.categories.filter((c) => c.parentId === null);
  addCategories(topCategories, 0);

  return items;
});

// 标签菜单
const tagMenuItems = [
  {
    key: 'add',
    label: '添加标签',
    icon: () => h(TagOutlined),
    children: [
      {
        key: 'add-产品',
        label: '产品',
        onClick: () => emit('addTags', ['产品']),
      },
      {
        key: 'add-活动',
        label: '活动',
        onClick: () => emit('addTags', ['活动']),
      },
      {
        key: 'add-节日',
        label: '节日',
        onClick: () => emit('addTags', ['节日']),
      },
      {
        key: 'add-促销',
        label: '促销',
        onClick: () => emit('addTags', ['促销']),
      },
    ],
  },
  {
    key: 'remove',
    label: '移除标签',
    icon: () => h(TagOutlined),
    children: [
      {
        key: 'remove-产品',
        label: '产品',
        onClick: () => emit('removeTags', ['产品']),
      },
      {
        key: 'remove-活动',
        label: '活动',
        onClick: () => emit('removeTags', ['活动']),
      },
      {
        key: 'remove-节日',
        label: '节日',
        onClick: () => emit('removeTags', ['节日']),
      },
      {
        key: 'remove-促销',
        label: '促销',
        onClick: () => emit('removeTags', ['促销']),
      },
    ],
  },
];

// 状态菜单
const statusMenuItems = [
  {
    key: 'ACTIVE',
    label: '设为启用',
    icon: () => h(CheckCircleOutlined),
    onClick: () => emit('changeStatus', 'ACTIVE'),
  },
  {
    key: 'DRAFT',
    label: '设为草稿',
    icon: () => h(ClockCircleOutlined),
    onClick: () => emit('changeStatus', 'DRAFT'),
  },
  {
    key: 'ARCHIVED',
    label: '设为归档',
    icon: () => h(StopOutlined),
    onClick: () => emit('changeStatus', 'ARCHIVED'),
  },
];

function handleClear() {
  emit('clear');
}

function handleExport() {
  emit('export');
}

function handleDelete() {
  emit('delete');
}
</script>

<template>
  <Transition name="batch-toolbar">
    <div v-show="isVisible" class="batch-toolbar">
      <div class="batch-toolbar__content">
        <Space>
          <!-- 选择计数 -->
          <Tag color="blue" class="count-tag">
            <CheckCircleOutlined />
            已选择 {{ selectedCount }} 项
          </Tag>

          <!-- 修改分类 -->
          <Dropdown :menu="{ items: categoryMenuItems }" placement="bottom">
            <Button size="small">
              <FolderOutlined />
              修改分类
            </Button>
          </Dropdown>

          <!-- 修改标签 -->
          <Dropdown :menu="{ items: tagMenuItems }" placement="bottom">
            <Button size="small">
              <TagOutlined />
              修改标签
            </Button>
          </Dropdown>

          <!-- 修改状态 -->
          <Dropdown :menu="{ items: statusMenuItems }" placement="bottom">
            <Button size="small">
              <CheckCircleOutlined />
              修改状态
            </Button>
          </Dropdown>

          <!-- 导出 -->
          <Button size="small" @click="handleExport">
            <ExportOutlined />
            导出
          </Button>

          <div class="divider" />

          <!-- 删除 -->
          <Popconfirm
            title="确定要删除选中的素材吗？"
            description="删除后将移至回收站，可在30天内恢复"
            okText="删除"
            cancelText="取消"
            okButtonProps="{ danger: true }"
            @confirm="handleDelete"
          >
            <Button type="primary" danger size="small">
              <DeleteOutlined />
              删除
            </Button>
          </Popconfirm>
        </Space>

        <!-- 关闭 -->
        <Button type="text" size="small" @click="handleClear">
          <CloseOutlined />
          取消选择
        </Button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.batch-toolbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  z-index: 1000;
  min-width: 600px;
  padding: 12px 20px;
  background: hsl(var(--card));
  border-radius: 8px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
  transform: translateX(-50%);
}

.batch-toolbar__content {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.count-tag {
  padding: 4px 12px;
  font-size: 14px;
}

.divider {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: hsl(var(--border));
}

/* 动画 */
.batch-toolbar-enter-active,
.batch-toolbar-leave-active {
  transition: all 0.3s ease;
}

.batch-toolbar-enter-from,
.batch-toolbar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
