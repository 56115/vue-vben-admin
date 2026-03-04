<script setup lang="ts">
import { reactive, watch } from 'vue';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  InputNumber,
} from 'ant-design-vue';
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
} from '@ant-design/icons-vue';
import type { MaterialFilters, CategoryItem } from '../types';

const props = defineProps<{
  filters: MaterialFilters;
  categories: CategoryItem[];
}>();

const emit = defineEmits<{
  (e: 'update', filters: MaterialFilters): void;
  (e: 'search'): void;
  (e: 'reset'): void;
}>();

// 本地状态
const localFilters = reactive<MaterialFilters>({ ...props.filters });

// 同步外部变化
watch(
  () => props.filters,
  (newFilters) => {
    Object.assign(localFilters, newFilters);
  },
  { deep: true },
);

// 常量
const typeOptions = [
  { value: 'TEXT', label: '文本', color: '#595959' },
  { value: 'IMAGE', label: '图片', color: '#52c41a' },
  { value: 'VIDEO', label: '视频', color: '#722ed1' },
  { value: 'LINK', label: '链接', color: '#1890ff' },
  { value: 'FILE', label: '文件', color: '#fa8c16' },
  { value: 'MIXED', label: '图文', color: '#13c2c2' },
] as const;

const statusOptions = [
  { value: 'ACTIVE', label: '启用', color: '#52c41a' },
  { value: 'DRAFT', label: '草稿', color: '#bfbfbf' },
  { value: 'ARCHIVED', label: '归档', color: '#8c8c8c' },
] as const;

const sortOptions = [
  { value: 'updatedAt', label: '最近更新' },
  { value: 'createdAt', label: '最新创建' },
  { value: 'usageCount', label: '使用次数' },
  { value: 'viewCount', label: '浏览次数' },
  { value: 'name', label: '名称' },
] as const;

const tagPresets = ['产品', '活动', '节日', '促销', '公告', '新品', '限时'];

// 获取分类选项（扁平化）
const categoryOptions = () => {
  const options: { value: number; label: string; depth: number }[] = [];

  function traverse(items: CategoryItem[], depth = 0) {
    for (const item of items) {
      options.push({
        value: Number(item.id),
        label: item.name,
        depth,
      });
      if (item.children?.length) {
        traverse(item.children, depth + 1);
      }
    }
  }

  traverse(props.categories);
  return options;
};

// 方法
function handleSearch() {
  emit('update', { ...localFilters });
  emit('search');
}

function handleReset() {
  localFilters.keyword = '';
  localFilters.type = undefined;
  localFilters.status = 'ACTIVE';
  localFilters.categoryId = undefined;
  localFilters.tags = [];
  localFilters.dateRange = undefined;
  localFilters.minUsageCount = undefined;
  localFilters.maxUsageCount = undefined;
  localFilters.sortBy = 'updatedAt';
  localFilters.sortOrder = 'desc';
  emit('update', { ...localFilters });
  emit('reset');
}

function toggleTag(tag: string) {
  const tags = localFilters.tags || [];
  const index = tags.indexOf(tag);
  if (index > -1) {
    tags.splice(index, 1);
  } else {
    tags.push(tag);
  }
  localFilters.tags = [...tags];
}

function handleSortChange(value: string) {
  if (localFilters.sortBy === value) {
    // 切换排序方向
    localFilters.sortOrder = localFilters.sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    localFilters.sortBy = value as MaterialFilters['sortBy'];
    // 根据字段设置默认排序方向
    localFilters.sortOrder = value === 'name' ? 'asc' : 'desc';
  }
}
</script>

<template>
  <div class="filter-panel">
    <div class="filter-row">
      <!-- 关键词搜索 -->
      <Input
        v-model:value="localFilters.keyword"
        placeholder="搜索素材名称/内容"
        style="width: 240px"
        allow-clear
        @press-enter="handleSearch"
      >
        <template #prefix>
          <SearchOutlined />
        </template>
      </Input>

      <!-- 类型筛选 -->
      <Select
        v-model:value="localFilters.type"
        placeholder="素材类型"
        style="width: 120px"
        allow-clear
      >
        <Select.Option
          v-for="opt in typeOptions"
          :key="opt.value"
          :value="opt.value"
        >
          <Tag :color="opt.color" style="margin: 0">{{ opt.label }}</Tag>
        </Select.Option>
      </Select>

      <!-- 状态筛选 -->
      <Select
        v-model:value="localFilters.status"
        placeholder="状态"
        style="width: 100px"
        allow-clear
      >
        <Select.Option
          v-for="opt in statusOptions"
          :key="opt.value"
          :value="opt.value"
        >
          <span :style="{ color: opt.color }">{{ opt.label }}</span>
        </Select.Option>
      </Select>

      <!-- 分类筛选 -->
      <Select
        v-model:value="localFilters.categoryId"
        placeholder="所属分类"
        style="width: 150px"
        allow-clear
      >
        <Select.Option :value="null">未分类</Select.Option>
        <Select.Option
          v-for="opt in categoryOptions()"
          :key="opt.value"
          :value="opt.value"
        >
          {{ '  '.repeat(opt.depth) }}{{ opt.label }}
        </Select.Option>
      </Select>

      <!-- 排序 -->
      <Select
        :value="localFilters.sortBy"
        style="width: 130px"
        @change="handleSortChange"
      >
        <Select.Option
          v-for="opt in sortOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
          <span v-if="localFilters.sortBy === opt.value" class="sort-indicator">
            {{ localFilters.sortOrder === 'asc' ? '↑' : '↓' }}
          </span>
        </Select.Option>
      </Select>

      <!-- 操作按钮 -->
      <Space>
        <Button type="primary" @click="handleSearch">
          <FilterOutlined />
          筛选
        </Button>
        <Button @click="handleReset">
          <ReloadOutlined />
          重置
        </Button>
      </Space>
    </div>

    <!-- 标签筛选 -->
    <div class="filter-tags">
      <span class="filter-label">常用标签：</span>
      <Tag
        v-for="tag in tagPresets"
        :key="tag"
        :color="localFilters.tags?.includes(tag) ? 'blue' : undefined"
        class="clickable-tag"
        @click="toggleTag(tag)"
      >
        {{ tag }}
      </Tag>
    </div>

    <!-- 高级筛选（可折叠） -->
    <div class="filter-advanced">
      <div class="advanced-row">
        <span class="filter-label">时间范围：</span>
        <DatePicker.RangePicker
          v-model:value="localFilters.dateRange"
          style="width: 280px"
          placeholder="['开始日期', '结束日期']"
        />

        <span class="filter-label" style="margin-left: 16px">使用次数：</span>
        <InputNumber
          v-model:value="localFilters.minUsageCount"
          placeholder="最小"
          :min="0"
          style="width: 80px"
        />
        <span class="range-separator">~</span>
        <InputNumber
          v-model:value="localFilters.maxUsageCount"
          placeholder="最大"
          :min="0"
          style="width: 80px"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-panel {
  padding: 16px;
  margin-bottom: 16px;
  background: var(--component-background, #f6ffed);
  border: 1px solid var(--border-color, #b7eb8f);
  border-radius: 8px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
}

.filter-label {
  font-size: 13px;
  color: var(--text-color-secondary, rgb(0 0 0 / 65%));
}

.clickable-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.clickable-tag:hover {
  opacity: 0.8;
}

.filter-advanced {
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px dashed var(--border-color, #d9f7be);
}

.advanced-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.range-separator {
  color: var(--text-color-secondary, rgb(0 0 0 / 45%));
}

.sort-indicator {
  float: right;
  font-weight: bold;
  color: var(--primary-color, #1890ff);
}
</style>
