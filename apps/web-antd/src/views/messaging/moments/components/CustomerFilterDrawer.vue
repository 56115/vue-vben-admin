<script lang="ts" setup>
import { ref, reactive, computed, watch, onMounted, h } from 'vue';
import {
  Drawer,
  Form,
  Select,
  Tree,
  Radio,
  Button,
  Space,
  Tag,
  Upload,
  Spin,
  Alert,
  Divider,
  Table,
  message,
  Collapse,
  CollapsePanel,
} from 'ant-design-vue';
import type { TreeProps, UploadFile } from 'ant-design-vue';
import type { Key } from 'ant-design-vue/es/_util/type';
import type { CheckInfo } from 'ant-design-vue/es/vc-tree/props';
import {
  UserOutlined,
  TeamOutlined,
  TagOutlined,
  FileExcelOutlined,
  InboxOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';

// ==================== Types ====================

interface Department {
  id: number;
  name: string;
  children?: Department[];
}

interface TagItem {
  id: number;
  name: string;
  color?: string;
  customerCount?: number;
}

interface UserItem {
  id: number;
  realName: string;
  username: string;
}

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

interface ImportPreviewResult {
  validCount: number;
  invalidCount: number;
  sampleCustomers: { id: number; name: string; phone?: string }[];
  invalidRows: { row: number; reason: string }[];
}

// ==================== Props & Emits ====================

const props = defineProps<{
  open: boolean;
  initialConditions?: Partial<FilterConditions>;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm', conditions: FilterConditions): void;
}>();

// ==================== State ====================

const loading = ref(false);
const previewLoading = ref(false);
const departments = ref<Department[]>([]);
const tags = ref<TagItem[]>([]);
const users = ref<UserItem[]>([]);
const previewCount = ref(0);

// Import state
const importLoading = ref(false);
const importFile = ref<UploadFile | null>(null);
const importPreview = ref<ImportPreviewResult | null>(null);
const importMatchColumn = ref<'phone' | 'externalId' | 'customerId'>('phone');

// Filter conditions
const conditions = reactive<FilterConditions>({
  tagIds: [],
  tagLogic: 'ANY',
  departmentIds: [],
  excludeDepartmentIds: [],
  ownerIds: [],
  statuses: [],
  lifecycleStages: [],
  importedCustomerIds: [],
});

// Department selection state
const expandedDeptKeys = ref<(string | number)[]>([]);

// ==================== Options ====================

const statusOptions = [
  { value: 'POTENTIAL', label: '潜在客户' },
  { value: 'ACTIVE', label: '活跃客户' },
  { value: 'INACTIVE', label: '不活跃' },
  { value: 'CHURNED', label: '已流失' },
];

const lifecycleOptions = [
  { value: 'LEAD', label: '线索' },
  { value: 'PROSPECT', label: '商机' },
  { value: 'CUSTOMER', label: '客户' },
  { value: 'LOYAL', label: '忠诚客户' },
  { value: 'CHURNED', label: '已流失' },
];

const tagLogicOptions = [
  { value: 'ANY', label: '满足任意标签' },
  { value: 'ALL', label: '满足全部标签' },
  { value: 'EXCLUDE', label: '排除这些标签' },
];

const matchColumnOptions = [
  { value: 'phone', label: '手机号' },
  { value: 'externalId', label: '外部联系人ID' },
  { value: 'customerId', label: '客户ID' },
];

// ==================== Computed ====================

const drawerOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
});

const treeData = computed<TreeProps['treeData']>(() => {
  const convert = (items: Department[]): TreeProps['treeData'] => {
    return items.map((item) => ({
      key: item.id,
      title: item.name,
      children: item.children ? convert(item.children) : undefined,
    }));
  };
  return convert(departments.value);
});

const selectedTagNames = computed(() => {
  return conditions.tagIds.map((id) => {
    const tag = tags.value.find((t) => t.id === id);
    return tag?.name || id;
  });
});

const selectedDeptNames = computed(() => {
  const getNames = (ids: number[], depts: Department[]): string[] => {
    const names: string[] = [];
    const findNames = (items: Department[]) => {
      for (const item of items) {
        if (ids.includes(item.id)) {
          names.push(item.name);
        }
        if (item.children) {
          findNames(item.children);
        }
      }
    };
    findNames(depts);
    return names;
  };
  return getNames(conditions.departmentIds, departments.value);
});

const excludeDeptNames = computed(() => {
  const getNames = (ids: number[], depts: Department[]): string[] => {
    const names: string[] = [];
    const findNames = (items: Department[]) => {
      for (const item of items) {
        if (ids.includes(item.id)) {
          names.push(item.name);
        }
        if (item.children) {
          findNames(item.children);
        }
      }
    };
    findNames(depts);
    return names;
  };
  return getNames(conditions.excludeDepartmentIds, departments.value);
});

const hasAnyCondition = computed(() => {
  return (
    conditions.tagIds.length > 0 ||
    conditions.departmentIds.length > 0 ||
    conditions.excludeDepartmentIds.length > 0 ||
    conditions.ownerIds.length > 0 ||
    conditions.statuses.length > 0 ||
    conditions.lifecycleStages.length > 0 ||
    conditions.importedCustomerIds.length > 0
  );
});

const conditionSummary = computed(() => {
  const parts: string[] = [];

  if (conditions.departmentIds.length > 0) {
    parts.push(`${selectedDeptNames.value.join(', ')} 部门下的客户`);
  }

  if (conditions.excludeDepartmentIds.length > 0) {
    parts.push(`排除 ${excludeDeptNames.value.join(', ')} 部门`);
  }

  if (conditions.tagIds.length > 0) {
    const logicText =
      conditions.tagLogic === 'ANY'
        ? '满足任意'
        : conditions.tagLogic === 'ALL'
          ? '满足全部'
          : '排除';
    parts.push(`${logicText} ${selectedTagNames.value.join(', ')} 标签`);
  }

  if (conditions.statuses.length > 0) {
    const statusNames = conditions.statuses.map(
      (s) => statusOptions.find((o) => o.value === s)?.label || s,
    );
    parts.push(`状态为 ${statusNames.join('/')}`);
  }

  if (conditions.lifecycleStages.length > 0) {
    const stageNames = conditions.lifecycleStages.map(
      (s) => lifecycleOptions.find((o) => o.value === s)?.label || s,
    );
    parts.push(`生命周期为 ${stageNames.join('/')}`);
  }

  if (conditions.importedCustomerIds.length > 0) {
    parts.push(`导入的 ${conditions.importedCustomerIds.length} 位客户`);
  }

  return parts.length > 0 ? parts.join('，') : '未设置筛选条件';
});

// ==================== API Calls ====================

async function fetchDepartments() {
  try {
    const res = await requestClient.get<{ items: Department[] }>(
      '/departments/tree',
    );
    departments.value = res.items || [];
  } catch (e) {
    console.error(e);
  }
}

async function fetchTags() {
  try {
    const res = await requestClient.get<{ items: TagItem[] }>(
      '/customer/tag',
      {
        params: { pageSize: 100 },
      },
    );
    tags.value = res.items || [];
  } catch (e) {
    console.error(e);
  }
}

async function fetchUsers() {
  try {
    const res = await requestClient.get<{ items: UserItem[] }>('/users', {
      params: { pageSize: 100 },
    });
    users.value = res.items || [];
  } catch (e) {
    console.error(e);
  }
}

async function fetchPreviewCount() {
  if (!hasAnyCondition.value) {
    previewCount.value = 0;
    return;
  }

  previewLoading.value = true;
  try {
    const res = await requestClient.post<{ count: number }>(
      '/messaging/moments/preview-customers',
      {
        tagIds: conditions.tagIds.length ? conditions.tagIds : undefined,
        tagLogic: conditions.tagIds.length ? conditions.tagLogic : undefined,
        departmentIds: conditions.departmentIds.length
          ? conditions.departmentIds
          : undefined,
        excludeDepartmentIds: conditions.excludeDepartmentIds.length
          ? conditions.excludeDepartmentIds
          : undefined,
        ownerIds: conditions.ownerIds.length ? conditions.ownerIds : undefined,
        statuses: conditions.statuses.length ? conditions.statuses : undefined,
        lifecycleStages: conditions.lifecycleStages.length
          ? conditions.lifecycleStages
          : undefined,
        importedCustomerIds: conditions.importedCustomerIds.length
          ? conditions.importedCustomerIds
          : undefined,
      },
    );
    previewCount.value = res.count || 0;
  } catch (e) {
    console.error(e);
    previewCount.value = 0;
  } finally {
    previewLoading.value = false;
  }
}

async function validateImportedCustomers(
  ids: string[],
  matchBy: 'phone' | 'externalId' | 'customerId',
): Promise<ImportPreviewResult> {
  const res = await requestClient.post<ImportPreviewResult>(
    '/messaging/moments/preview-import',
    {
      identifiers: ids,
      matchBy,
    },
  );
  return res;
}

// ==================== Event Handlers ====================

function handleTagChange(value: unknown) {
  conditions.tagIds = value as number[];
}

function handleRemoveTag(tagId: number) {
  conditions.tagIds = conditions.tagIds.filter((id) => id !== tagId);
}

function handleDeptCheck(
  checkedKeys: Key[] | { checked: Key[]; halfChecked: Key[] },
  _info: CheckInfo,
  mode: 'include' | 'exclude',
) {
  const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
  if (mode === 'include') {
    conditions.departmentIds = keys.map((k) => Number(k));
  } else {
    conditions.excludeDepartmentIds = keys.map((k) => Number(k));
  }
}

function handleRemoveDept(deptId: number, mode: 'include' | 'exclude') {
  if (mode === 'include') {
    conditions.departmentIds = conditions.departmentIds.filter(
      (id) => id !== deptId,
    );
  } else {
    conditions.excludeDepartmentIds = conditions.excludeDepartmentIds.filter(
      (id) => id !== deptId,
    );
  }
}

async function handleFileUpload(file: File): Promise<boolean> {
  importLoading.value = true;
  importFile.value = {
    uid: '-1',
    name: file.name,
    status: 'uploading',
  };

  try {
    const data = await readExcelFile(file);
    if (data.length === 0) {
      message.error('文件为空');
      importFile.value = null;
      return false;
    }

    // Validate with backend
    const result = await validateImportedCustomers(
      data,
      importMatchColumn.value,
    );
    importPreview.value = result;
    importFile.value.status = 'done';

    if (result.validCount > 0) {
      conditions.importedCustomerIds = result.sampleCustomers.map((c) => c.id);
      message.success(
        `成功匹配 ${result.validCount} 位客户，${result.invalidCount} 条无效`,
      );
    } else {
      message.warning('未能匹配到有效客户');
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : '文件解析失败';
    message.error(errorMessage);
    importFile.value = null;
  } finally {
    importLoading.value = false;
  }

  return false;
}

async function readExcelFile(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        let rows: string[] = [];

        if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
          // CSV/TXT: split by line
          const text =
            typeof data === 'string'
              ? data
              : new TextDecoder().decode(data as ArrayBuffer);
          rows = text
            .split(/\r?\n/)
            .map((line: string) => line.trim())
            .filter(Boolean);
        } else {
          // Excel - dynamically import xlsx
          try {
            // @ts-ignore - xlsx may not have type declarations
            const XLSX = await import('xlsx');
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            if (firstSheetName) {
              const firstSheet = workbook.Sheets[firstSheetName];
              if (firstSheet) {
                const json = XLSX.utils.sheet_to_json(firstSheet, {
                  header: 1,
                }) as unknown[][];
                rows = json
                  .flat()
                  .map((v: unknown) => String(v || '').trim())
                  .filter(Boolean);
              }
            }
          } catch {
            // If xlsx is not available, try to read as CSV
            const text = new TextDecoder().decode(data as ArrayBuffer);
            rows = text
              .split(/\r?\n/)
              .map((line: string) => line.trim())
              .filter(Boolean);
          }
        }

        // Remove header if first row looks like a header
        if (
          rows.length > 0 &&
          (rows[0]?.includes('手机') ||
            rows[0]?.includes('ID') ||
            rows[0]?.includes('客户'))
        ) {
          rows.shift();
        }

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

function handleRemoveImport() {
  importFile.value = null;
  importPreview.value = null;
  conditions.importedCustomerIds = [];
}

function handleReset() {
  conditions.tagIds = [];
  conditions.tagLogic = 'ANY';
  conditions.departmentIds = [];
  conditions.excludeDepartmentIds = [];
  conditions.ownerIds = [];
  conditions.statuses = [];
  conditions.lifecycleStages = [];
  conditions.importedCustomerIds = [];
  importFile.value = null;
  importPreview.value = null;
  previewCount.value = 0;
}

function handleConfirm() {
  emit('confirm', { ...conditions });
  emit('update:open', false);
}

function handleClose() {
  emit('update:open', false);
}

// ==================== Watchers ====================

watch(
  () => [
    conditions.tagIds,
    conditions.tagLogic,
    conditions.departmentIds,
    conditions.excludeDepartmentIds,
    conditions.ownerIds,
    conditions.statuses,
    conditions.lifecycleStages,
    conditions.importedCustomerIds,
  ],
  () => {
    fetchPreviewCount();
  },
  { deep: true },
);

watch(
  () => props.open,
  (val) => {
    if (val) {
      if (props.initialConditions) {
        Object.assign(conditions, props.initialConditions);
      }
      fetchPreviewCount();
    }
  },
);

// ==================== Lifecycle ====================

onMounted(() => {
  fetchDepartments();
  fetchTags();
  fetchUsers();
});
</script>

<template>
  <Drawer
    v-model:open="drawerOpen"
    title="选择可见的客户"
    width="640px"
    :footer-style="{ textAlign: 'right' }"
    @close="handleClose"
  >
    <Spin :spinning="loading">
      <Form layout="vertical">
        <!-- Tags Section -->
        <Collapse :default-active-key="['tags']" ghost>
          <CollapsePanel key="tags">
            <template #header>
              <div class="flex items-center gap-2">
                <TagOutlined />
                <span>按标签筛选</span>
                <Tag v-if="conditions.tagIds.length > 0" color="blue">
                  {{ conditions.tagIds.length }} 个
                </Tag>
              </div>
            </template>

            <Form.Item label="标签匹配逻辑">
              <Radio.Group v-model:value="conditions.tagLogic">
                <Radio
                  v-for="opt in tagLogicOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item label="选择标签">
              <Select
                v-model:value="conditions.tagIds"
                mode="multiple"
                placeholder="选择客户标签"
                :options="tags.map((t) => ({ value: t.id, label: t.name }))"
                :max-tag-count="5"
                allow-clear
                show-search
                option-filter-prop="label"
                @change="handleTagChange"
              />
            </Form.Item>

            <div
              v-if="conditions.tagIds.length > 0"
              class="mb-4 flex flex-wrap gap-2"
            >
              <Tag
                v-for="tagId in conditions.tagIds"
                :key="tagId"
                closable
                @close="handleRemoveTag(tagId)"
              >
                {{ tags.find((t) => t.id === tagId)?.name || tagId }}
              </Tag>
            </div>
          </CollapsePanel>

          <!-- Department Section -->
          <CollapsePanel key="departments">
            <template #header>
              <div class="flex items-center gap-2">
                <TeamOutlined />
                <span>按组织架构筛选</span>
                <Tag
                  v-if="
                    conditions.departmentIds.length > 0 ||
                    conditions.excludeDepartmentIds.length > 0
                  "
                  color="blue"
                >
                  {{
                    conditions.departmentIds.length +
                    conditions.excludeDepartmentIds.length
                  }}
                  个
                </Tag>
              </div>
            </template>

            <div class="mb-4">
              <div class="mb-2 text-sm text-gray-500">
                发送给以下部门的客户：
              </div>
              <div
                v-if="conditions.departmentIds.length > 0"
                class="mb-2 flex flex-wrap gap-2"
              >
                <Tag
                  v-for="deptId in conditions.departmentIds"
                  :key="deptId"
                  color="blue"
                  closable
                  @close="handleRemoveDept(deptId, 'include')"
                >
                  {{
                    departments
                      .flatMap((d) => [d, ...(d.children || [])])
                      .find((d) => d.id === deptId)?.name || deptId
                  }}
                </Tag>
              </div>
              <Tree
                v-model:expanded-keys="expandedDeptKeys"
                :tree-data="treeData"
                :checked-keys="conditions.departmentIds"
                checkable
                :selectable="false"
                @check="
                  (
                    keys: Key[] | { checked: Key[]; halfChecked: Key[] },
                    info: CheckInfo,
                  ) => handleDeptCheck(keys, info, 'include')
                "
              />
            </div>

            <Divider />

            <div>
              <div class="mb-2 text-sm text-gray-500">排除以下部门的客户：</div>
              <div
                v-if="conditions.excludeDepartmentIds.length > 0"
                class="mb-2 flex flex-wrap gap-2"
              >
                <Tag
                  v-for="deptId in conditions.excludeDepartmentIds"
                  :key="deptId"
                  color="red"
                  closable
                  @close="handleRemoveDept(deptId, 'exclude')"
                >
                  {{
                    departments
                      .flatMap((d) => [d, ...(d.children || [])])
                      .find((d) => d.id === deptId)?.name || deptId
                  }}
                </Tag>
              </div>
              <Tree
                :tree-data="treeData"
                :checked-keys="conditions.excludeDepartmentIds"
                checkable
                :selectable="false"
                @check="
                  (
                    keys: Key[] | { checked: Key[]; halfChecked: Key[] },
                    info: CheckInfo,
                  ) => handleDeptCheck(keys, info, 'exclude')
                "
              />
            </div>
          </CollapsePanel>

          <!-- Owner Section -->
          <CollapsePanel key="owners">
            <template #header>
              <div class="flex items-center gap-2">
                <UserOutlined />
                <span>按归属人筛选</span>
                <Tag v-if="conditions.ownerIds.length > 0" color="blue">
                  {{ conditions.ownerIds.length }} 人
                </Tag>
              </div>
            </template>

            <Form.Item label="选择归属人">
              <Select
                v-model:value="conditions.ownerIds"
                mode="multiple"
                placeholder="选择归属人"
                :options="
                  users.map((u) => ({
                    value: u.id,
                    label: u.realName || u.username,
                  }))
                "
                :max-tag-count="5"
                allow-clear
                show-search
                option-filter-prop="label"
              />
            </Form.Item>
          </CollapsePanel>

          <!-- Status Section -->
          <CollapsePanel key="status">
            <template #header>
              <div class="flex items-center gap-2">
                <span>按客户状态筛选</span>
                <Tag
                  v-if="
                    conditions.statuses.length > 0 ||
                    conditions.lifecycleStages.length > 0
                  "
                  color="blue"
                >
                  {{
                    conditions.statuses.length +
                    conditions.lifecycleStages.length
                  }}
                  个
                </Tag>
              </div>
            </template>

            <Form.Item label="客户状态">
              <Select
                v-model:value="conditions.statuses"
                mode="multiple"
                placeholder="选择客户状态"
                :options="statusOptions"
                allow-clear
              />
            </Form.Item>

            <Form.Item label="生命周期阶段">
              <Select
                v-model:value="conditions.lifecycleStages"
                mode="multiple"
                placeholder="选择生命周期阶段"
                :options="lifecycleOptions"
                allow-clear
              />
            </Form.Item>
          </CollapsePanel>

          <!-- Import Section -->
          <CollapsePanel key="import">
            <template #header>
              <div class="flex items-center gap-2">
                <FileExcelOutlined />
                <span>从文件导入客户</span>
                <Tag
                  v-if="conditions.importedCustomerIds.length > 0"
                  color="blue"
                >
                  {{ conditions.importedCustomerIds.length }} 人
                </Tag>
              </div>
            </template>

            <Form.Item label="匹配字段">
              <Radio.Group v-model:value="importMatchColumn">
                <Radio
                  v-for="opt in matchColumnOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item label="上传文件">
              <Upload.Dragger
                v-if="!importFile"
                accept=".csv,.txt,.xlsx,.xls"
                :show-upload-list="false"
                :before-upload="handleFileUpload"
              >
                <p class="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p class="ant-upload-text">点击或拖拽文件到此处上传</p>
                <p class="ant-upload-hint">
                  支持 CSV、TXT、Excel 格式，每行一个手机号/ID
                </p>
              </Upload.Dragger>

              <div v-else class="rounded border p-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <FileExcelOutlined class="text-green-500" />
                    <span>{{ importFile.name }}</span>
                    <Spin v-if="importLoading" size="small" />
                  </div>
                  <Button
                    type="text"
                    danger
                    :icon="h(DeleteOutlined)"
                    @click="handleRemoveImport"
                  />
                </div>

                <div v-if="importPreview" class="mt-4">
                  <Alert
                    :type="importPreview.validCount > 0 ? 'success' : 'warning'"
                    :message="`成功匹配 ${importPreview.validCount} 位客户，${importPreview.invalidCount} 条无效`"
                    class="mb-2"
                  />

                  <div
                    v-if="importPreview.sampleCustomers.length > 0"
                    class="mb-2"
                  >
                    <div class="mb-1 text-sm text-gray-500">匹配示例：</div>
                    <Table
                      :columns="[
                        { title: '客户名', dataIndex: 'name', key: 'name' },
                        { title: '手机号', dataIndex: 'phone', key: 'phone' },
                      ]"
                      :data-source="importPreview.sampleCustomers.slice(0, 5)"
                      :pagination="false"
                      size="small"
                    />
                  </div>

                  <div v-if="importPreview.invalidRows.length > 0">
                    <div class="mb-1 text-sm text-red-500">
                      无效数据（前5条）：
                    </div>
                    <div
                      v-for="row in importPreview.invalidRows.slice(0, 5)"
                      :key="row.row"
                      class="text-xs text-gray-400"
                    >
                      第 {{ row.row }} 行: {{ row.reason }}
                    </div>
                  </div>
                </div>
              </div>
            </Form.Item>
          </CollapsePanel>
        </Collapse>
      </Form>

      <!-- Summary -->
      <div class="mt-6 rounded bg-gray-50 p-4">
        <div class="mb-2 text-sm font-medium">筛选条件摘要</div>
        <div class="text-sm text-gray-600">{{ conditionSummary }}</div>
        <div class="mt-2 flex items-center gap-2">
          <span class="text-sm text-gray-500">预计可见客户数：</span>
          <Spin v-if="previewLoading" size="small" />
          <span v-else class="text-lg font-bold text-blue-500">
            {{ previewCount }}
          </span>
          <span class="text-sm text-gray-400">人</span>
        </div>
      </div>
    </Spin>

    <template #footer>
      <Space>
        <Button @click="handleReset">重置</Button>
        <Button @click="handleClose">取消</Button>
        <Button
          type="primary"
          :disabled="!hasAnyCondition"
          @click="handleConfirm"
        >
          确认 ({{ previewCount }} 人)
        </Button>
      </Space>
    </template>
  </Drawer>
</template>
