<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import {
  Button,
  Space,
  message,
  Tag,
  Card,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Checkbox,
  InputNumber,
  Tabs,
  TabPane,
  Popconfirm,
  Badge,
} from 'ant-design-vue';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  SafetyOutlined,
  StopOutlined,
  WarningOutlined,
  BarChartOutlined,
} from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';
import { requestClient } from '#/api/request';
import { useCrudTable } from '#/composables';

// ==================== 类型定义 ====================

interface AntiHarassmentRule {
  id: number;
  name: string;
  ruleType: string;
  config: Record<string, unknown>;
  action: string;
  groupIds: string[];
  isActive: boolean;
  priority: number;
  createdAt: string;
}

interface SensitiveWord {
  id: number;
  word: string;
  category: string;
  level: number;
  isActive: boolean;
}

// ==================== Router ====================

const router = useRouter();

// ==================== 状态 ====================

const activeTab = ref('rules');
const sensitiveWords = ref<SensitiveWord[]>([]);
const wordsLoading = ref(false);
const whitelistCount = ref(0);
const blacklistCount = ref(0);
const violationCount = ref(0);

// Modal state (保留手动管理，因表单逻辑复杂)
const ruleModalVisible = ref(false);
const ruleModalTitle = ref('新建规则');
const editingRule = ref<AntiHarassmentRule | null>(null);
const modalLoading = ref(false);

// Form state
const ruleForm = ref({
  name: '',
  ruleType: 'SENSITIVE_WORD',
  config: {
    keywords: [] as string[],
    messageTypes: [] as string[],
    maxLength: 800,
    maxLines: 80,
    maxFrequency: 10,
    frequencyWindow: 10,
    blockExternalCorp: false,
  },
  action: 'WARN',
  addToOrgBlacklist: false,
  addToGroupBlacklist: false,
  warningMessage: '',
  warnCount: 3,
  isActive: true,
});

// Options
const ruleTypeOptions = [
  { value: 'SENSITIVE_WORD', label: '防敏感词' },
  { value: 'MESSAGE_TYPE', label: '防特定消息类型' },
  { value: 'SPAM', label: '防刷屏' },
  { value: 'EXTERNAL_CORP', label: '防其他企业员工' },
];

const actionOptions = [
  { value: 'KICK', label: '踢出群聊' },
  { value: 'WARN_AND_KICK', label: '警告并踢出群聊' },
  { value: 'WARN_THEN_KICK', label: '警告3次后踢出群聊' },
  { value: 'WARN', label: '仅发警告' },
];

const messageTypeOptions = [
  { value: 'MINI_PROGRAM', label: '小程序' },
  { value: 'WEB_PAGE', label: '网页' },
  { value: 'QR_CODE', label: '二维码' },
  { value: 'IMAGE', label: '图片' },
  { value: 'VOICE', label: '语音' },
  { value: 'VIDEO', label: '视频' },
  { value: 'FILE', label: '文件' },
  { value: 'CARD', label: '名片' },
  { value: 'CHAT_HISTORY', label: '聊天记录' },
];

// ==================== 表格列定义 ====================

const ruleColumns = [
  { title: '规则名称', dataIndex: 'name', key: 'name' },
  {
    title: '规则类型',
    dataIndex: 'ruleType',
    key: 'ruleType',
    customRender: ({ text }: { text: string }) => {
      const option = ruleTypeOptions.find((o) => o.value === text);
      return option?.label || text;
    },
  },
  {
    title: '处置方式',
    dataIndex: 'action',
    key: 'action',
    customRender: ({ text }: { text: string }) => {
      const option = actionOptions.find((o) => o.value === text);
      return option?.label || text;
    },
  },
  { title: '状态', dataIndex: 'isActive', key: 'isActive' },
  { title: '优先级', dataIndex: 'priority', key: 'priority' },
  { title: '操作', key: 'actions', width: 150 },
];

// ==================== 规则表格逻辑 ====================

const {
  tableProps,
  dataSource: rules,
  fetchData,
} = useCrudTable<AntiHarassmentRule>({
  fetchApi: async (params) => {
    const res = await requestClient.get<{
      items: AntiHarassmentRule[];
      total?: number;
    }>('/operations/anti-harassment/rules', {
      params: { page: params.page, pageSize: params.pageSize },
    });
    return {
      items: res.items || [],
      total: res.total || res.items?.length || 0,
    };
  },
  deleteApi: async (id) => {
    await requestClient.delete(`/operations/anti-harassment/rules/${id}`);
  },
});

// ==================== 辅助数据加载 ====================

async function fetchSensitiveWords() {
  wordsLoading.value = true;
  try {
    const res = await requestClient.get<{ items: SensitiveWord[] }>(
      '/operations/anti-harassment/sensitive-words',
      { params: { pageSize: 100 } },
    );
    sensitiveWords.value = res.items || [];
  } catch (e) {
    console.error(e);
  } finally {
    wordsLoading.value = false;
  }
}

async function fetchListCounts() {
  try {
    const [whiteRes, blackRes] = await Promise.all([
      requestClient.get<{ total: number }>('/operations/anti-harassment/lists', {
        params: { listType: 'WHITELIST', pageSize: 1 },
      }),
      requestClient.get<{ total: number }>('/operations/anti-harassment/lists', {
        params: { listType: 'BLACKLIST', pageSize: 1 },
      }),
    ]);
    whitelistCount.value = whiteRes.total || 0;
    blacklistCount.value = blackRes.total || 0;
  } catch (e) {
    console.error(e);
  }
}

async function fetchViolationCount() {
  try {
    const res = await requestClient.get<{ totalCount: number }>(
      '/operations/anti-harassment/violations/statistics',
    );
    violationCount.value = res.totalCount || 0;
  } catch (e) {
    console.error(e);
  }
}

// Modal handlers
function handleCreateRule() {
  editingRule.value = null;
  ruleModalTitle.value = '新建规则';
  resetRuleForm();
  ruleModalVisible.value = true;
}

function handleEditRule(rule: AntiHarassmentRule) {
  editingRule.value = rule;
  ruleModalTitle.value = '编辑规则';
  ruleForm.value = {
    name: rule.name,
    ruleType: rule.ruleType,
    config: { ...ruleForm.value.config, ...rule.config },
    action: rule.action,
    addToOrgBlacklist: false,
    addToGroupBlacklist: false,
    warningMessage: rule.config.warningMessage || '',
    warnCount: rule.config.warnCount || 3,
    isActive: rule.isActive,
  };
  ruleModalVisible.value = true;
}

function resetRuleForm() {
  ruleForm.value = {
    name: '',
    ruleType: 'SENSITIVE_WORD',
    config: {
      keywords: [],
      messageTypes: [],
      maxLength: 800,
      maxLines: 80,
      maxFrequency: 10,
      frequencyWindow: 10,
      blockExternalCorp: false,
    },
    action: 'WARN',
    addToOrgBlacklist: false,
    addToGroupBlacklist: false,
    warningMessage: '',
    warnCount: 3,
    isActive: true,
  };
}

async function handleSaveRule() {
  if (!ruleForm.value.name) {
    message.warning('请输入规则名称');
    return;
  }

  modalLoading.value = true;
  try {
    const payload = {
      name: ruleForm.value.name,
      ruleType: ruleForm.value.ruleType,
      config: buildRuleConfig(),
      action: ruleForm.value.action,
      isActive: ruleForm.value.isActive,
    };

    if (editingRule.value) {
      await requestClient.put(
        `/operations/anti-harassment/rules/${editingRule.value.id}`,
        payload,
      );
      message.success('规则更新成功');
    } else {
      await requestClient.post('/operations/anti-harassment/rules', payload);
      message.success('规则创建成功');
    }

    ruleModalVisible.value = false;
    fetchData();
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : '操作失败';
    message.error(errorMessage);
  } finally {
    modalLoading.value = false;
  }
}

function buildRuleConfig() {
  const form = ruleForm.value;
  const config: Record<string, unknown> = {
    warningMessage: form.warningMessage,
    warnCount: form.warnCount,
    addToOrgBlacklist: form.addToOrgBlacklist,
    addToGroupBlacklist: form.addToGroupBlacklist,
  };

  switch (form.ruleType) {
    case 'SENSITIVE_WORD':
      config.keywords = form.config.keywords;
      break;
    case 'MESSAGE_TYPE':
      config.messageTypes = form.config.messageTypes;
      break;
    case 'SPAM':
      config.maxLength = form.config.maxLength;
      config.maxLines = form.config.maxLines;
      config.maxFrequency = form.config.maxFrequency;
      config.frequencyWindow = form.config.frequencyWindow;
      break;
    case 'EXTERNAL_CORP':
      config.blockExternalCorp = true;
      break;
  }

  return config;
}

async function handleDeleteRule(id: number) {
  try {
    await requestClient.delete(`/operations/anti-harassment/rules/${id}`);
    message.success('规则删除成功');
    fetchData();
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : '删除失败';
    message.error(errorMessage);
  }
}

async function handleToggleRule(rule: AntiHarassmentRule) {
  try {
    await requestClient.patch(`/operations/anti-harassment/rules/${rule.id}/toggle`, {
      isActive: !rule.isActive,
    });
    message.success(rule.isActive ? '规则已禁用' : '规则已启用');
    fetchData();
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : '操作失败';
    message.error(errorMessage);
  }
}

// Navigation
function goToWhitelist() {
  router.push('/operations/anti-harassment/whitelist');
}

function goToBlacklist() {
  router.push('/operations/anti-harassment/blacklist');
}

function goToViolations() {
  router.push('/operations/anti-harassment/violations');
}

function goToStatistics() {
  router.push('/operations/anti-harassment/statistics');
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchData();
  fetchSensitiveWords();
  fetchListCounts();
  fetchViolationCount();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold">安全管控</h2>
        <p class="text-gray-500">
          配置防骚扰规则，群客户发送的消息命中规则时，该成员将会被踢出群聊或收到警告消息
        </p>
      </div>
      <Button @click="goToStatistics"> <BarChartOutlined /> 统计分析 </Button>
    </div>

    <!-- Quick Actions -->
    <div class="mb-4 grid grid-cols-4 gap-4">
      <Card hoverable @click="handleCreateRule">
        <div class="flex items-center">
          <div
            class="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100"
          >
            <SettingOutlined class="text-xl text-blue-500" />
          </div>
          <div>
            <div class="font-medium">配置防骚扰规则</div>
            <div class="text-sm text-gray-500">{{ rules.length }} 条规则</div>
          </div>
        </div>
      </Card>

      <Card hoverable @click="goToViolations">
        <div class="flex items-center">
          <div
            class="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100"
          >
            <WarningOutlined class="text-xl text-orange-500" />
          </div>
          <div>
            <div class="font-medium">违规记录</div>
            <div class="text-sm text-gray-500">{{ violationCount }} 条记录</div>
          </div>
        </div>
      </Card>

      <Card hoverable @click="goToWhitelist">
        <div class="flex items-center">
          <div
            class="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100"
          >
            <SafetyOutlined class="text-xl text-green-500" />
          </div>
          <div>
            <div class="font-medium">不受规则限制的人员</div>
            <div class="text-sm text-gray-500">{{ whitelistCount }} 位客户</div>
          </div>
        </div>
      </Card>

      <Card hoverable @click="goToBlacklist">
        <div class="flex items-center">
          <div
            class="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100"
          >
            <StopOutlined class="text-xl text-red-500" />
          </div>
          <div>
            <div class="font-medium">群聊黑名单</div>
            <div class="text-sm text-gray-500">{{ blacklistCount }} 位客户</div>
          </div>
        </div>
      </Card>
    </div>

    <!-- Main Content -->
    <Card>
      <Tabs v-model:activeKey="activeTab">
        <TabPane key="rules" tab="规则管理">
          <div class="mb-4 flex justify-between">
            <Space>
              <Button type="primary" @click="handleCreateRule">
                <PlusOutlined /> 新建规则
              </Button>
            </Space>
          </div>

          <Table v-bind="tableProps" :columns="ruleColumns">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'isActive'">
                <Badge
                  :status="record.isActive ? 'success' : 'default'"
                  :text="record.isActive ? '已启用' : '已禁用'"
                />
              </template>
              <template v-if="column.key === 'actions'">
                <Space>
                  <Button
                    type="link"
                    size="small"
                    @click="handleEditRule(record)"
                  >
                    <EditOutlined /> 编辑
                  </Button>
                  <Popconfirm
                    title="确定要删除这条规则吗？"
                    @confirm="handleDeleteRule(record.id)"
                  >
                    <Button type="link" size="small" danger>
                      <DeleteOutlined /> 删除
                    </Button>
                  </Popconfirm>
                </Space>
              </template>
            </template>
          </Table>
        </TabPane>

        <TabPane key="words" tab="敏感词库">
          <div class="mb-4">
            <Button type="primary"> <PlusOutlined /> 添加敏感词 </Button>
          </div>

          <Table
            :data-source="sensitiveWords"
            :loading="wordsLoading"
            :pagination="{ pageSize: 20 }"
            row-key="id"
          >
            <template #columns>
              <Table.Column title="敏感词" dataIndex="word" />
              <Table.Column title="分类" dataIndex="category" />
              <Table.Column title="级别" dataIndex="level">
                <template #default="{ text }">
                  <Tag
                    :color="
                      text === 1 ? 'orange' : text === 2 ? 'red' : 'default'
                    "
                  >
                    {{ text === 1 ? '一般' : text === 2 ? '严重' : '普通' }}
                  </Tag>
                </template>
              </Table.Column>
              <Table.Column title="状态" dataIndex="isActive">
                <template #default="{ text }">
                  <Badge
                    :status="text ? 'success' : 'default'"
                    :text="text ? '启用' : '禁用'"
                  />
                </template>
              </Table.Column>
            </template>
          </Table>
        </TabPane>
      </Tabs>
    </Card>

    <!-- Rule Modal -->
    <Modal
      v-model:open="ruleModalVisible"
      :title="ruleModalTitle"
      width="640px"
      @ok="handleSaveRule"
      :confirmLoading="modalLoading"
    >
      <Form layout="vertical" class="mt-4">
        <Form.Item label="规则名称" required>
          <Input v-model:value="ruleForm.name" placeholder="请输入规则名称" />
        </Form.Item>

        <Form.Item label="规则类型" required>
          <Select
            v-model:value="ruleForm.ruleType"
            :options="ruleTypeOptions"
            @change="resetRuleForm"
          />
        </Form.Item>

        <!-- Sensitive Word Config -->
        <template v-if="ruleForm.ruleType === 'SENSITIVE_WORD'">
          <Form.Item label="敏感词列表">
            <Select
              v-model:value="ruleForm.config.keywords"
              mode="tags"
              placeholder="输入敏感词后回车添加，如：返现、砍一刀、好评返现"
              :token-separators="[',', '，']"
            />
            <div class="mt-1 text-xs text-gray-400">
              提示：可以输入多个敏感词，用逗号分隔或回车添加
            </div>
          </Form.Item>
        </template>

        <!-- Message Type Config -->
        <template v-if="ruleForm.ruleType === 'MESSAGE_TYPE'">
          <Form.Item label="禁止的消息类型">
            <Checkbox.Group v-model:value="ruleForm.config.messageTypes">
              <div class="grid grid-cols-3 gap-2">
                <Checkbox
                  v-for="opt in messageTypeOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </Checkbox>
              </div>
            </Checkbox.Group>
          </Form.Item>
        </template>

        <!-- Spam Config -->
        <template v-if="ruleForm.ruleType === 'SPAM'">
          <div class="rounded border p-4">
            <div class="mb-3">
              <Checkbox>
                消息长度超过
                <InputNumber
                  v-model:value="ruleForm.config.maxLength"
                  :min="100"
                  :max="5000"
                  size="small"
                  style="width: 80px"
                  class="mx-1"
                />
                字符
              </Checkbox>
            </div>
            <div class="mb-3">
              <Checkbox>
                消息行数超过
                <InputNumber
                  v-model:value="ruleForm.config.maxLines"
                  :min="10"
                  :max="200"
                  size="small"
                  style="width: 80px"
                  class="mx-1"
                />
                行
              </Checkbox>
            </div>
            <div>
              <Checkbox>
                在
                <InputNumber
                  v-model:value="ruleForm.config.frequencyWindow"
                  :min="5"
                  :max="60"
                  size="small"
                  style="width: 60px"
                  class="mx-1"
                />
                秒内发送超过
                <InputNumber
                  v-model:value="ruleForm.config.maxFrequency"
                  :min="3"
                  :max="50"
                  size="small"
                  style="width: 60px"
                  class="mx-1"
                />
                条消息
              </Checkbox>
            </div>
          </div>
        </template>

        <!-- External Corp Config -->
        <template v-if="ruleForm.ruleType === 'EXTERNAL_CORP'">
          <Form.Item>
            <div class="rounded border bg-gray-50 p-4">
              <div class="font-medium">阻止其他企业员工</div>
              <div class="mt-1 text-sm text-gray-500">
                开启后，其他企业的员工将无法加入本企业的客户群
              </div>
            </div>
          </Form.Item>
        </template>

        <Form.Item label="限人方式" required>
          <Select v-model:value="ruleForm.action" :options="actionOptions" />
        </Form.Item>

        <template v-if="ruleForm.action === 'WARN_THEN_KICK'">
          <Form.Item label="警告次数">
            <InputNumber
              v-model:value="ruleForm.warnCount"
              :min="1"
              :max="10"
            />
            <span class="ml-2 text-gray-500">次后踢出群聊</span>
          </Form.Item>
        </template>

        <Form.Item label="附加操作">
          <div class="space-y-2">
            <Checkbox v-model:checked="ruleForm.addToOrgBlacklist">
              <span class="text-red-500">加入本组织黑名单</span>
              <span class="ml-1 text-gray-400">（向客户发送以下消息）</span>
            </Checkbox>
            <Checkbox v-model:checked="ruleForm.addToGroupBlacklist">
              <span class="text-red-500">加入全集团黑名单</span>
            </Checkbox>
          </div>
        </Form.Item>

        <Form.Item label="警告消息">
          <Input.TextArea
            v-model:value="ruleForm.warningMessage"
            placeholder="您好，请注意本群是【振华购物中心百货】为会员提供专属福利和官方信息的社群。为避免误导其他会员，请勿在此发送其他平台或商品的推广信息，请撤回(抱歉)。再次感谢您遵守社群规范！"
            :rows="4"
          />
        </Form.Item>

        <Form.Item label="启用状态">
          <Switch v-model:checked="ruleForm.isActive" />
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>
