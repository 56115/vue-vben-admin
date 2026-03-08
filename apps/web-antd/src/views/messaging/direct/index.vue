<script lang="ts" setup>
import { ref, computed, onMounted, h, watch } from 'vue';
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
  Card,
  Avatar,
  Drawer,
  Tabs,
  TabPane,
  Checkbox,
  Alert,
  Spin,
} from 'ant-design-vue';
import {
  SendOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  TeamOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';
import {
  getDirectMessages,
  sendDirectMessage,
  sendBatchDirectMessages,
  getMessageTemplates,
  getCustomers,
  getEmployees,
  getEmployeeCustomers,
  sendToEmployees,
  sendTestMessage,
  type DirectMessage,
  type MessageTemplate,
  type Customer,
  type WecomEmployee,
  type EmployeeCustomer,
} from '#/api/crm';
import { MaterialPicker } from '#/components';
import type { Material, MaterialType } from '#/components';
import { useCrudTable } from '#/composables';
import {
  messageStatusOptions,
  messageTypeOptions,
  findOption,
  withAllOption,
} from '#/constants/crm-options';
import dayjs from 'dayjs';

// ==================== 类型定义 ====================

interface MessageFilters {
  status?: string;
}

interface MessageAttachment {
  id?: string;
  type: 'image' | 'video' | 'file' | 'link';
  materialId?: number; // For usage tracking
  mediaId?: number;
  url?: string;
  name?: string;
}

// ==================== 表格列定义 ====================

const columns = [
  { title: '客户', key: 'customer', width: 200 },
  {
    title: '消息内容',
    dataIndex: ['content', 'text'],
    key: 'content',
    ellipsis: true,
  },
  {
    title: '类型',
    dataIndex: 'messageType',
    key: 'messageType',
    width: 100,
    customRender: ({ text }: { text: string }) => {
      const opt = findOption(messageTypeOptions, text);
      return h(
        Tag,
        { color: opt?.color || 'default' },
        () => opt?.label || text,
      );
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    customRender: ({ text }: { text: string }) => {
      const opt = findOption(messageStatusOptions, text);
      return h(
        Tag,
        { color: opt?.color || 'default' },
        () => opt?.label || text,
      );
    },
  },
  {
    title: '发送时间',
    dataIndex: 'sentAt',
    key: 'sentAt',
    width: 140,
    customRender: ({ text }: { text: string | null }) =>
      text ? dayjs(text).format('MM-DD HH:mm') : '-',
  },
  { title: '操作', key: 'action', width: 80, fixed: 'right' as const },
];

// ==================== 表格逻辑 ====================

const { tableProps, filters, fetchData } = useCrudTable<
  DirectMessage,
  MessageFilters
>({
  fetchApi: async (params) => {
    const apiParams: Record<string, unknown> = {
      page: params.page,
      pageSize: params.pageSize,
    };
    if (params.status) apiParams.status = params.status;
    const res = await getDirectMessages(apiParams);
    return { items: res.items || [], total: res.total || 0 };
  },
});

// ==================== 发送 Modal 相关 ====================

const sendModalVisible = ref(false);
const sendMode = ref<'CUSTOMER' | 'EMPLOYEE' | 'TEST'>('CUSTOMER');

const customers = ref<Customer[]>([]);
const templates = ref<MessageTemplate[]>([]);
const employees = ref<WecomEmployee[]>([]);
const employeeCustomers = ref<EmployeeCustomer[]>([]);

const customerFormState = ref({
  customerId: undefined as number | undefined,
  customerIds: [] as number[],
  textContent: '',
  templateId: undefined as number | undefined,
  isBatch: false,
  attachments: [] as MessageAttachment[],
});

const employeeFormState = ref({
  wecomUserIds: [] as string[],
  textContent: '',
  templateId: undefined as number | undefined,
  allowSelect: false,
  attachments: [] as MessageAttachment[],
});

const testFormState = ref({
  selectedEmployeeId: undefined as string | undefined,
  customerId: undefined as number | undefined,
  textContent: '',
  templateId: undefined as number | undefined,
  attachments: [] as MessageAttachment[],
});

// Material Picker state
const materialPickerVisible = ref(false);
const materialPickerType = ref<MaterialType>('ALL');
const materialPickerTarget = ref<'customer' | 'employee' | 'test'>('customer');

const employeeLoading = ref(false);
const employeeCustomersLoading = ref(false);

const selectedEmployeesCustomerCount = computed(() =>
  employees.value
    .filter((e) => employeeFormState.value.wecomUserIds.includes(e.wecomUserId))
    .reduce((sum, e) => sum + e.customerCount, 0),
);

// ==================== 详情 Drawer ====================

const detailDrawerVisible = ref(false);
const selectedMessage = ref<DirectMessage | null>(null);

function handleViewDetail(record: DirectMessage) {
  selectedMessage.value = record;
  detailDrawerVisible.value = true;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'SENT':
    case 'DELIVERED':
      return h(CheckCircleOutlined, { style: { color: '#52c41a' } });
    case 'FAILED':
      return h(CloseCircleOutlined, { style: { color: '#ff4d4f' } });
    case 'SENDING':
      return h(ReloadOutlined, { spin: true, style: { color: '#1890ff' } });
    default:
      return h(ClockCircleOutlined, { style: { color: '#d9d9d9' } });
  }
}

// ==================== 数据获取 ====================

async function fetchCustomers() {
  try {
    const res = await getCustomers({ pageSize: 100 });
    customers.value = res.items || [];
  } catch (e) {
    console.error(e);
  }
}

async function fetchTemplates() {
  try {
    const res = await getMessageTemplates({ isActive: true, pageSize: 100 });
    templates.value = (res as any).data || res.items || [];
  } catch (e) {
    console.error(e);
  }
}

async function fetchEmployees(keyword?: string) {
  employeeLoading.value = true;
  try {
    const params: Record<string, unknown> = { pageSize: 100 };
    if (keyword) params.keyword = keyword;
    const res = await getEmployees(params);
    employees.value = res.items || [];
  } catch (e) {
    console.error(e);
  } finally {
    employeeLoading.value = false;
  }
}

let employeeSearchTimer: ReturnType<typeof setTimeout> | null = null;
function handleEmployeeSearch(keyword: string) {
  if (employeeSearchTimer) clearTimeout(employeeSearchTimer);
  employeeSearchTimer = setTimeout(() => fetchEmployees(keyword), 300);
}

async function fetchEmployeeCustomers(wecomUserId: string) {
  employeeCustomersLoading.value = true;
  try {
    const res = await getEmployeeCustomers(wecomUserId, { pageSize: 100 });
    employeeCustomers.value = res.items || [];
  } catch (e) {
    console.error(e);
    employeeCustomers.value = [];
  } finally {
    employeeCustomersLoading.value = false;
  }
}

// ==================== 素材选择逻辑 ====================

function generateAttachmentId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function handleOpenMaterialPicker(target: 'customer' | 'employee' | 'test') {
  materialPickerTarget.value = target;
  materialPickerType.value = 'ALL';
  materialPickerVisible.value = true;
}

function handleMaterialSelect(selectedMaterials: Material[]) {
  const newAttachments: MessageAttachment[] = selectedMaterials.map(
    (material) => {
      const att: MessageAttachment = {
        id: generateAttachmentId(),
        type: material.type.toLowerCase() as
          | 'image'
          | 'video'
          | 'file'
          | 'link',
        materialId: material.id, // Important: for usage tracking
        name: material.name,
      };

      if (
        material.type === 'IMAGE' ||
        material.type === 'VIDEO' ||
        material.type === 'FILE'
      ) {
        if (material.mediaIds && material.mediaIds.length > 0) {
          att.mediaId = material.mediaIds[0];
        }
      } else if (material.type === 'LINK' && material.linkUrl) {
        att.url = material.linkUrl;
      }

      return att;
    },
  );

  // Add to appropriate form based on target
  if (materialPickerTarget.value === 'customer') {
    customerFormState.value.attachments = [
      ...customerFormState.value.attachments,
      ...newAttachments,
    ];
  } else if (materialPickerTarget.value === 'employee') {
    employeeFormState.value.attachments = [
      ...employeeFormState.value.attachments,
      ...newAttachments,
    ];
  } else {
    testFormState.value.attachments = [
      ...testFormState.value.attachments,
      ...newAttachments,
    ];
  }

  materialPickerVisible.value = false;
}

function handleRemoveAttachment(
  target: 'customer' | 'employee' | 'test',
  id: string,
) {
  if (target === 'customer') {
    customerFormState.value.attachments =
      customerFormState.value.attachments.filter((att) => att.id !== id);
  } else if (target === 'employee') {
    employeeFormState.value.attachments =
      employeeFormState.value.attachments.filter((att) => att.id !== id);
  } else {
    testFormState.value.attachments = testFormState.value.attachments.filter(
      (att) => att.id !== id,
    );
  }
}

// ==================== 发送逻辑 ====================

function handleOpenSendModal() {
  customerFormState.value = {
    customerId: undefined,
    customerIds: [],
    textContent: '',
    templateId: undefined,
    isBatch: false,
    attachments: [],
  };
  employeeFormState.value = {
    wecomUserIds: [],
    textContent: '',
    templateId: undefined,
    allowSelect: false,
    attachments: [],
  };
  testFormState.value = {
    selectedEmployeeId: undefined,
    customerId: undefined,
    textContent: '',
    templateId: undefined,
    attachments: [],
  };
  employeeCustomers.value = [];
  sendModalVisible.value = true;
}

async function handleSubmitSend() {
  try {
    if (sendMode.value === 'CUSTOMER') await handleCustomerSend();
    else if (sendMode.value === 'EMPLOYEE') await handleEmployeeSend();
    else if (sendMode.value === 'TEST') await handleTestSend();
    sendModalVisible.value = false;
    fetchData();
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : '发送失败';
    message.error(errorMessage);
  }
}

async function handleCustomerSend() {
  const form = customerFormState.value;
  if (form.isBatch) {
    if (!form.customerIds.length) {
      message.warning('请选择客户');
      return;
    }
    if (!form.textContent && !form.templateId && !form.attachments.length) {
      message.warning('请输入消息内容、选择模板或添加附件');
      return;
    }
    const res = await sendBatchDirectMessages({
      customerIds: form.customerIds,
      textContent: form.textContent || undefined,
      templateId: form.templateId,
      attachments: form.attachments.map((att) => ({
        type: att.type,
        materialId: att.materialId,
        mediaId: att.mediaId,
        url: att.url,
      })),
    });
    message.success(`成功发送 ${res.successCount}/${res.totalCount} 条消息`);
  } else {
    if (!form.customerId) {
      message.warning('请选择客户');
      return;
    }
    if (!form.textContent && !form.templateId && !form.attachments.length) {
      message.warning('请输入消息内容、选择模板或添加附件');
      return;
    }
    await sendDirectMessage({
      customerId: form.customerId,
      textContent: form.textContent || undefined,
      templateId: form.templateId,
      attachments: form.attachments.map((att) => ({
        type: att.type,
        materialId: att.materialId,
        mediaId: att.mediaId,
        url: att.url,
      })),
    });
    message.success('消息已发送');
  }
}

async function handleEmployeeSend() {
  const form = employeeFormState.value;
  if (!form.wecomUserIds.length) {
    message.warning('请选择员工');
    return;
  }
  if (!form.textContent && !form.templateId && !form.attachments.length) {
    message.warning('请输入消息内容、选择模板或添加附件');
    return;
  }
  const res = await sendToEmployees({
    wecomUserIds: form.wecomUserIds,
    textContent: form.textContent || undefined,
    templateId: form.templateId,
    allowSelect: form.allowSelect,
    attachments: form.attachments.map((att) => ({
      type: att.type,
      materialId: att.materialId,
      mediaId: att.mediaId,
      url: att.url,
    })),
  });
  const successCount = res.results.filter((r) => r.status === 'SENT').length;
  if (res.success) {
    message.success(
      `已向 ${successCount}/${res.totalEmployees} 个员工推送消息，共 ${res.totalCustomers} 个客户`,
    );
  } else {
    message.warning('部分发送失败，请查看详情');
  }
}

async function handleTestSend() {
  const form = testFormState.value;
  if (!form.customerId) {
    message.warning('请选择测试客户');
    return;
  }
  if (!form.textContent && !form.templateId && !form.attachments.length) {
    message.warning('请输入消息内容、选择模板或添加附件');
    return;
  }
  const res = await sendTestMessage({
    customerId: form.customerId,
    textContent: form.textContent || undefined,
    templateId: form.templateId,
    attachments: form.attachments.map((att) => ({
      type: att.type,
      materialId: att.materialId,
      mediaId: att.mediaId,
      url: att.url,
    })),
  });
  if (res.status === 'SENT') {
    message.success('测试消息已发送');
  } else {
    message.warning(`发送失败: ${res.failReason || '未知错误'}`);
  }
}

function handleTemplateChange(
  templateId: unknown,
  target: 'customer' | 'employee' | 'test',
) {
  if (!templateId || typeof templateId !== 'number') return;
  const template = templates.value.find((t) => t.id === templateId);
  if (!template) return;
  const text = template.content.text || '';
  if (target === 'customer') customerFormState.value.textContent = text;
  else if (target === 'employee') employeeFormState.value.textContent = text;
  else testFormState.value.textContent = text;
}

function handleFilter() {
  fetchData();
}

watch(
  () => testFormState.value.selectedEmployeeId,
  (newVal) => {
    if (newVal) {
      testFormState.value.customerId = undefined;
      fetchEmployeeCustomers(newVal);
    } else {
      employeeCustomers.value = [];
    }
  },
);

// ==================== 路由 ====================

const router = useRouter();

function goToStatistics() {
  router.push('/messaging/direct/statistics');
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchData();
  fetchCustomers();
  fetchTemplates();
  fetchEmployees();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-bold">消息推送</h2>
      <Space>
        <Button @click="goToStatistics"> <BarChartOutlined /> 数据统计 </Button>
        <Button type="primary" @click="handleOpenSendModal">
          <SendOutlined /> 发送消息
        </Button>
      </Space>
    </div>

    <!-- 筛选区 -->
    <Card class="mb-4" size="small">
      <Space wrap>
        <span class="text-gray-500">状态:</span>
        <Select
          v-model:value="filters.status"
          :options="withAllOption(messageStatusOptions)"
          placeholder="选择状态"
          style="width: 120px"
          allow-clear
          @change="handleFilter"
        />
        <Button type="primary" @click="fetchData">
          <ReloadOutlined /> 刷新
        </Button>
      </Space>
    </Card>

    <!-- 表格区 -->
    <Table v-bind="tableProps" :columns="columns" :scroll="{ x: 900 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'customer'">
          <div class="flex items-center gap-2">
            <Avatar :size="32">
              <template #icon><UserOutlined /></template>
            </Avatar>
            <div>
              <div class="font-medium">
                {{ record.customerName || '未知客户' }}
              </div>
              <div class="text-xs text-gray-400">
                {{ record.externalUserid }}
              </div>
            </div>
          </div>
        </template>
        <template v-if="column.key === 'action'">
          <Button
            type="link"
            size="small"
            @click="handleViewDetail(record as DirectMessage)"
          >
            详情
          </Button>
        </template>
      </template>
    </Table>

    <!-- 发送 Modal -->
    <Modal
      v-model:open="sendModalVisible"
      title="发送消息"
      @ok="handleSubmitSend"
      width="650px"
      :ok-text="
        sendMode === 'TEST'
          ? '测试发送'
          : sendMode === 'EMPLOYEE'
            ? '推送给员工'
            : '发送'
      "
    >
      <Tabs v-model:activeKey="sendMode" class="mt-2">
        <TabPane key="CUSTOMER">
          <template #tab><UserOutlined /> 按客户发送</template>
        </TabPane>
        <TabPane key="EMPLOYEE">
          <template #tab><TeamOutlined /> 按员工发送</template>
        </TabPane>
        <TabPane key="TEST">
          <template #tab><ExperimentOutlined /> 测试发送</template>
        </TabPane>
      </Tabs>

      <!-- Customer Mode -->
      <div v-if="sendMode === 'CUSTOMER'" class="mt-4">
        <Form layout="vertical">
          <Form.Item>
            <Checkbox v-model:checked="customerFormState.isBatch">
              批量发送（多选客户）
            </Checkbox>
          </Form.Item>
          <Form.Item label="选择客户" required>
            <Select
              v-if="!customerFormState.isBatch"
              v-model:value="customerFormState.customerId"
              placeholder="请选择客户"
              show-search
              :filter-option="
                (input: string, option: any) =>
                  option.label.toLowerCase().includes(input.toLowerCase())
              "
              :options="customers.map((c) => ({ value: c.id, label: c.name }))"
            />
            <Select
              v-else
              v-model:value="customerFormState.customerIds"
              mode="multiple"
              placeholder="请选择客户（可多选）"
              show-search
              :filter-option="
                (input: string, option: any) =>
                  option.label.toLowerCase().includes(input.toLowerCase())
              "
              :options="customers.map((c) => ({ value: c.id, label: c.name }))"
              :max-tag-count="3"
            />
          </Form.Item>
          <Form.Item label="选择模板">
            <Select
              v-model:value="customerFormState.templateId"
              placeholder="选择消息模板（可选）"
              allow-clear
              :options="templates.map((t) => ({ value: t.id, label: t.name }))"
              @change="(v) => handleTemplateChange(v, 'customer')"
            />
          </Form.Item>
          <Form.Item label="消息内容">
            <Input.TextArea
              v-model:value="customerFormState.textContent"
              placeholder="请输入消息内容"
              :rows="4"
              :maxlength="2048"
              show-count
            />
          </Form.Item>
          <Form.Item label="附件">
            <div
              v-if="customerFormState.attachments.length > 0"
              class="mb-2 flex flex-wrap gap-2"
            >
              <Tag
                v-for="att in customerFormState.attachments"
                :key="att.id"
                closable
                @close="handleRemoveAttachment('customer', att.id!)"
              >
                {{ att.name || att.type }}
              </Tag>
            </div>
            <Button @click="handleOpenMaterialPicker('customer')">
              <FolderOpenOutlined /> 选择素材
            </Button>
          </Form.Item>
        </Form>
      </div>

      <!-- Employee Mode -->
      <div v-if="sendMode === 'EMPLOYEE'" class="mt-4">
        <Alert
          type="info"
          message="选择员工后，消息将推送到员工手机端，由员工确认后发送给其所有客户"
          class="mb-4"
          show-icon
        />
        <Form layout="vertical">
          <Form.Item label="选择员工" required>
            <Spin :spinning="employeeLoading">
              <Select
                v-model:value="employeeFormState.wecomUserIds"
                mode="multiple"
                placeholder="输入员工姓名搜索（可多选）"
                show-search
                :filter-option="false"
                :options="
                  employees.map((e) => ({
                    value: e.wecomUserId,
                    label: `${e.userName || e.wecomUserId} (${e.customerCount}个客户)`,
                  }))
                "
                :max-tag-count="3"
                @search="handleEmployeeSearch"
              />
            </Spin>
          </Form.Item>
          <Form.Item>
            <Checkbox v-model:checked="employeeFormState.allowSelect">
              允许员工修改客户列表
            </Checkbox>
          </Form.Item>
          <div
            v-if="employeeFormState.wecomUserIds.length > 0"
            class="mb-4 rounded bg-blue-50 p-3"
          >
            <span class="text-blue-600">
              预计发送给
              <strong>{{ selectedEmployeesCustomerCount }}</strong> 个客户
            </span>
          </div>
          <Form.Item label="选择模板">
            <Select
              v-model:value="employeeFormState.templateId"
              placeholder="选择消息模板（可选）"
              allow-clear
              :options="templates.map((t) => ({ value: t.id, label: t.name }))"
              @change="(v) => handleTemplateChange(v, 'employee')"
            />
          </Form.Item>
          <Form.Item label="消息内容">
            <Input.TextArea
              v-model:value="employeeFormState.textContent"
              placeholder="请输入消息内容"
              :rows="4"
              :maxlength="2048"
              show-count
            />
          </Form.Item>
          <Form.Item label="附件">
            <div
              v-if="employeeFormState.attachments.length > 0"
              class="mb-2 flex flex-wrap gap-2"
            >
              <Tag
                v-for="att in employeeFormState.attachments"
                :key="att.id"
                closable
                @close="handleRemoveAttachment('employee', att.id!)"
              >
                {{ att.name || att.type }}
              </Tag>
            </div>
            <Button @click="handleOpenMaterialPicker('employee')">
              <FolderOpenOutlined /> 选择素材
            </Button>
          </Form.Item>
        </Form>
      </div>

      <!-- Test Mode -->
      <div v-if="sendMode === 'TEST'" class="mt-4">
        <Alert
          type="warning"
          message="测试模式：选择单个客户验证消息内容，消息将立即发送"
          class="mb-4"
          show-icon
        />
        <Form layout="vertical">
          <Form.Item label="选择员工">
            <Spin :spinning="employeeLoading">
              <Select
                v-model:value="testFormState.selectedEmployeeId"
                placeholder="输入员工姓名搜索"
                show-search
                allow-clear
                :filter-option="false"
                :options="
                  employees.map((e) => ({
                    value: e.wecomUserId,
                    label: `${e.userName || e.wecomUserId} (${e.customerCount}个客户)`,
                  }))
                "
                @search="handleEmployeeSearch"
              />
            </Spin>
          </Form.Item>
          <Form.Item label="选择测试客户" required>
            <Spin :spinning="employeeCustomersLoading">
              <Select
                v-model:value="testFormState.customerId"
                placeholder="请选择测试客户"
                show-search
                :disabled="!testFormState.selectedEmployeeId"
                :filter-option="
                  (input: string, option: any) =>
                    option.label.toLowerCase().includes(input.toLowerCase())
                "
                :options="
                  employeeCustomers.map((c) => ({
                    value: c.id,
                    label: `${c.name}${c.phone ? ' - ' + c.phone : ''}`,
                  }))
                "
              />
            </Spin>
          </Form.Item>
          <Form.Item label="选择模板">
            <Select
              v-model:value="testFormState.templateId"
              placeholder="选择消息模板（可选）"
              allow-clear
              :options="templates.map((t) => ({ value: t.id, label: t.name }))"
              @change="(v) => handleTemplateChange(v, 'test')"
            />
          </Form.Item>
          <Form.Item label="消息内容">
            <Input.TextArea
              v-model:value="testFormState.textContent"
              placeholder="请输入消息内容"
              :rows="4"
              :maxlength="2048"
              show-count
            />
          </Form.Item>
          <Form.Item label="附件">
            <div
              v-if="testFormState.attachments.length > 0"
              class="mb-2 flex flex-wrap gap-2"
            >
              <Tag
                v-for="att in testFormState.attachments"
                :key="att.id"
                closable
                @close="handleRemoveAttachment('test', att.id!)"
              >
                {{ att.name || att.type }}
              </Tag>
            </div>
            <Button @click="handleOpenMaterialPicker('test')">
              <FolderOpenOutlined /> 选择素材
            </Button>
          </Form.Item>
        </Form>
      </div>
    </Modal>

    <!-- Material Picker Modal -->
    <MaterialPicker
      v-model:open="materialPickerVisible"
      :type="materialPickerType"
      :multiple="true"
      :max-count="9"
      @select="handleMaterialSelect"
    />

    <!-- 详情 Drawer -->
    <Drawer v-model:open="detailDrawerVisible" title="消息详情" width="400">
      <template v-if="selectedMessage">
        <div class="space-y-4">
          <div>
            <div class="text-sm text-gray-500">客户</div>
            <div class="font-medium">
              {{ selectedMessage.customerName || '未知客户' }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">消息类型</div>
            <div>
              {{
                findOption(messageTypeOptions, selectedMessage.messageType)
                  ?.label || selectedMessage.messageType
              }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">状态</div>
            <div class="flex items-center gap-2">
              <component :is="() => getStatusIcon(selectedMessage!.status)" />
              <span>{{
                findOption(messageStatusOptions, selectedMessage.status)?.label
              }}</span>
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">消息内容</div>
            <div class="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-3">
              {{ selectedMessage.content?.text || '无文本内容' }}
            </div>
          </div>
          <div v-if="selectedMessage.failReason">
            <div class="text-sm text-gray-500">失败原因</div>
            <div class="text-red-500">{{ selectedMessage.failReason }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">创建时间</div>
            <div>
              {{
                dayjs(selectedMessage.createdAt).format('YYYY-MM-DD HH:mm:ss')
              }}
            </div>
          </div>
          <div v-if="selectedMessage.sentAt">
            <div class="text-sm text-gray-500">发送时间</div>
            <div>
              {{ dayjs(selectedMessage.sentAt).format('YYYY-MM-DD HH:mm:ss') }}
            </div>
          </div>
        </div>
      </template>
    </Drawer>
  </div>
</template>
