<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  Button,
  Space,
  message,
  Tag,
  Card,
  Form,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Table,
  Steps,
  Step,
  Result,
  Alert,
  Divider,
  Spin,
} from 'ant-design-vue';
import {
  SendOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  BarChartOutlined,
} from '@ant-design/icons-vue';
import {
  quickSendMassMessage,
  previewMassMessage,
  getMessageTemplates,
  type MessageTemplate,
  type PreviewMassMessageResponse,
} from '#/api/crm';
import { requestClient } from '#/api/request';

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

const currentStep = ref(0);
const loading = ref(false);
const previewLoading = ref(false);
const sendSuccess = ref(false);
const sendResult = ref<{ campaignId: number; totalTarget: number } | null>(
  null,
);

const tags = ref<TagItem[]>([]);
const users = ref<UserItem[]>([]);
const templates = ref<MessageTemplate[]>([]);
const preview = ref<PreviewMassMessageResponse | null>(null);

const formState = ref({
  name: '',
  tagIds: [] as number[],
  ownerId: undefined as number | undefined,
  status: undefined as string | undefined,
  lifecycleStage: undefined as string | undefined,
  textContent: '',
  templateId: undefined as number | undefined,
});

const statusOptions = [
  { value: 'POTENTIAL', label: '潜在客户' },
  { value: 'ACTIVE', label: '活跃客户' },
  { value: 'AT_RISK', label: '流失风险' },
  { value: 'CHURNED', label: '已流失' },
];

const lifecycleOptions = [
  { value: 'LEAD', label: '线索' },
  { value: 'OPPORTUNITY', label: '商机' },
  { value: 'CUSTOMER', label: '客户' },
  { value: 'EVANGELIST', label: '传播者' },
];

const previewColumns = [
  { title: '客户', dataIndex: 'name', key: 'name' },
  { title: '归属人', dataIndex: 'ownerName', key: 'ownerName' },
  {
    title: '企微ID',
    dataIndex: 'wecomExternalUserid',
    key: 'wecomExternalUserid',
    ellipsis: true,
  },
];

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

async function fetchTemplates() {
  try {
    const res = await getMessageTemplates({ isActive: true, pageSize: 100 });
    templates.value = res.items || [];
  } catch (e) {
    console.error(e);
  }
}

async function handlePreview() {
  previewLoading.value = true;
  try {
    const res = await previewMassMessage({
      tagIds: formState.value.tagIds.length
        ? formState.value.tagIds
        : undefined,
      ownerId: formState.value.ownerId,
      status: formState.value.status,
      lifecycleStage: formState.value.lifecycleStage,
    });
    preview.value = res;
  } catch (e: any) {
    message.error(e.message || '预览失败');
  } finally {
    previewLoading.value = false;
  }
}

function handleNext() {
  if (currentStep.value === 0) {
    // Validate target selection
    if (
      !formState.value.tagIds.length &&
      !formState.value.ownerId &&
      !formState.value.status &&
      !formState.value.lifecycleStage
    ) {
      message.warning('请至少选择一个筛选条件');
      return;
    }
    handlePreview();
    currentStep.value = 1;
  } else if (currentStep.value === 1) {
    // Validate message content
    if (!formState.value.textContent && !formState.value.templateId) {
      message.warning('请输入消息内容或选择模板');
      return;
    }
    currentStep.value = 2;
  }
}

function handlePrev() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

async function handleSend() {
  loading.value = true;
  try {
    const res = await quickSendMassMessage({
      name: formState.value.name || undefined,
      tagIds: formState.value.tagIds.length
        ? formState.value.tagIds
        : undefined,
      ownerId: formState.value.ownerId,
      status: formState.value.status,
      lifecycleStage: formState.value.lifecycleStage,
      textContent: formState.value.textContent || undefined,
    });

    if (res.success) {
      sendSuccess.value = true;
      sendResult.value = {
        campaignId: res.campaignId,
        totalTarget: res.totalTarget,
      };
      currentStep.value = 3;
    }
  } catch (e: any) {
    message.error(e.message || '发送失败');
  } finally {
    loading.value = false;
  }
}

function handleReset() {
  currentStep.value = 0;
  sendSuccess.value = false;
  sendResult.value = null;
  preview.value = null;
  formState.value = {
    name: '',
    tagIds: [],
    ownerId: undefined,
    status: undefined,
    lifecycleStage: undefined,
    textContent: '',
    templateId: undefined,
  };
}

function handleTemplateChange(templateId: number | undefined) {
  if (templateId) {
    const template = templates.value.find((t) => t.id === templateId);
    if (template) {
      formState.value.textContent = template.content.text || '';
    }
  }
}

watch(
  () => [
    formState.value.tagIds,
    formState.value.ownerId,
    formState.value.status,
    formState.value.lifecycleStage,
  ],
  () => {
    if (currentStep.value === 1) {
      handlePreview();
    }
  },
  { deep: true },
);

const router = useRouter();

function goToStatistics() {
  router.push('/messaging/mass-message/statistics');
}

onMounted(() => {
  fetchTags();
  fetchUsers();
  fetchTemplates();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold">群发消息</h2>
        <p class="text-gray-500">选择目标客户群，快速发送营销消息</p>
      </div>
      <Button @click="goToStatistics">
        <template #icon><BarChartOutlined /></template>
        统计分析
      </Button>
    </div>

    <!-- Steps -->
    <Card class="mb-4">
      <Steps :current="currentStep" size="small">
        <Step title="选择目标" />
        <Step title="编辑内容" />
        <Step title="确认发送" />
        <Step title="发送完成" />
      </Steps>
    </Card>

    <!-- Step 1: Select Target -->
    <Card v-show="currentStep === 0" title="选择目标客户">
      <Form layout="vertical">
        <Row :gutter="16">
          <Col :span="12">
            <Form.Item label="按标签筛选">
              <Select
                v-model:value="formState.tagIds"
                mode="multiple"
                placeholder="选择客户标签"
                :options="tags.map((t) => ({ value: t.id, label: t.name }))"
                allow-clear
                :max-tag-count="3"
              />
            </Form.Item>
          </Col>
          <Col :span="12">
            <Form.Item label="按归属人筛选">
              <Select
                v-model:value="formState.ownerId"
                placeholder="选择归属人"
                :options="
                  users.map((u) => ({
                    value: u.id,
                    label: u.realName || u.username,
                  }))
                "
                allow-clear
              />
            </Form.Item>
          </Col>
          <Col :span="12">
            <Form.Item label="按客户状态筛选">
              <Select
                v-model:value="formState.status"
                placeholder="选择客户状态"
                :options="statusOptions"
                allow-clear
              />
            </Form.Item>
          </Col>
          <Col :span="12">
            <Form.Item label="按生命周期筛选">
              <Select
                v-model:value="formState.lifecycleStage"
                placeholder="选择生命周期阶段"
                :options="lifecycleOptions"
                allow-clear
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <div class="mt-4 flex justify-end">
        <Button type="primary" @click="handleNext">
          下一步 <ArrowRightOutlined />
        </Button>
      </div>
    </Card>

    <!-- Step 2: Edit Content -->
    <Card v-show="currentStep === 1" title="编辑消息内容">
      <Row :gutter="24">
        <!-- Left: Form -->
        <Col :span="14">
          <Form layout="vertical">
            <Form.Item label="任务名称">
              <Input
                v-model:value="formState.name"
                placeholder="可选，便于后续查找"
              />
            </Form.Item>
            <Form.Item label="选择模板">
              <Select
                v-model:value="formState.templateId"
                placeholder="选择消息模板（可选）"
                allow-clear
                :options="
                  templates.map((t) => ({ value: t.id, label: t.name }))
                "
                @change="handleTemplateChange"
              />
            </Form.Item>
            <Form.Item label="消息内容" required>
              <Input.TextArea
                v-model:value="formState.textContent"
                placeholder="请输入消息内容"
                :rows="6"
                :maxlength="2048"
                show-count
              />
            </Form.Item>
          </Form>
        </Col>

        <!-- Right: Preview -->
        <Col :span="10">
          <Card title="目标客户预览" size="small">
            <Spin :spinning="previewLoading">
              <template v-if="preview">
                <Statistic
                  title="预计发送人数"
                  :value="preview.totalCount"
                  class="mb-4"
                >
                  <template #prefix>
                    <TeamOutlined />
                  </template>
                </Statistic>

                <Divider>样本客户</Divider>
                <Table
                  :columns="previewColumns"
                  :data-source="preview.sampleCustomers"
                  :pagination="false"
                  size="small"
                  :scroll="{ y: 200 }"
                />

                <Divider>按归属人分布</Divider>
                <div class="space-y-2">
                  <div
                    v-for="item in preview.byOwner"
                    :key="item.ownerId || 'none'"
                    class="flex justify-between"
                  >
                    <span>{{ item.ownerName || '未分配' }}</span>
                    <Tag>{{ item.count }} 人</Tag>
                  </div>
                </div>
              </template>
              <div v-else class="py-8 text-center text-gray-400">
                请先选择筛选条件
              </div>
            </Spin>
          </Card>
        </Col>
      </Row>

      <div class="mt-4 flex justify-between">
        <Button @click="handlePrev"> <ArrowLeftOutlined /> 上一步 </Button>
        <Button type="primary" @click="handleNext">
          下一步 <ArrowRightOutlined />
        </Button>
      </div>
    </Card>

    <!-- Step 3: Confirm -->
    <Card v-show="currentStep === 2" title="确认发送">
      <Alert
        message="请确认以下信息无误后，点击发送"
        type="info"
        show-icon
        class="mb-4"
      />

      <Row :gutter="24">
        <Col :span="12">
          <Card title="目标信息" size="small">
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-500">预计发送人数</span>
                <span class="font-bold text-blue-500"
                  >{{ preview?.totalCount || 0 }} 人</span
                >
              </div>
              <div v-if="formState.tagIds.length" class="flex justify-between">
                <span class="text-gray-500">标签筛选</span>
                <span>
                  <Tag v-for="id in formState.tagIds" :key="id" size="small">
                    {{ tags.find((t) => t.id === id)?.name }}
                  </Tag>
                </span>
              </div>
              <div v-if="formState.ownerId" class="flex justify-between">
                <span class="text-gray-500">归属人</span>
                <span>{{
                  users.find((u) => u.id === formState.ownerId)?.realName
                }}</span>
              </div>
              <div v-if="formState.status" class="flex justify-between">
                <span class="text-gray-500">客户状态</span>
                <span>{{
                  statusOptions.find((o) => o.value === formState.status)?.label
                }}</span>
              </div>
            </div>
          </Card>
        </Col>
        <Col :span="12">
          <Card title="消息内容" size="small">
            <div class="whitespace-pre-wrap rounded bg-gray-50 p-3">
              {{ formState.textContent || '(无内容)' }}
            </div>
          </Card>
        </Col>
      </Row>

      <div class="mt-4 flex justify-between">
        <Button @click="handlePrev"> <ArrowLeftOutlined /> 上一步 </Button>
        <Button type="primary" :loading="loading" @click="handleSend">
          <SendOutlined /> 确认发送
        </Button>
      </div>
    </Card>

    <!-- Step 4: Result -->
    <Card v-show="currentStep === 3">
      <Result
        :status="sendSuccess ? 'success' : 'error'"
        :title="sendSuccess ? '发送成功' : '发送失败'"
        :sub-title="
          sendSuccess
            ? `任务已创建，预计发送 ${sendResult?.totalTarget || 0} 人`
            : '请稍后重试'
        "
      >
        <template #extra>
          <Space>
            <Button type="primary" @click="handleReset"> 继续发送 </Button>
          </Space>
        </template>
      </Result>
    </Card>
  </div>
</template>
