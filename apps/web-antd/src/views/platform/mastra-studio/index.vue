<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  Card,
  Descriptions,
  DescriptionsItem,
  Table,
  Tag,
  Button,
  Modal,
  Input,
  message,
  Spin,
  Alert,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';

interface StudioStatus {
  enabled: string;
  running: boolean;
  port: number;
  url: string;
  agents: string[];
  workflows: string[];
}

interface AgentDetails {
  id: string;
  name: string;
  description: string;
  instructions: string;
  modelId: string;
  provider: string;
}

const loading = ref(false);
const status = ref<StudioStatus | null>(null);
const error = ref<string | null>(null);

// Agent 测试
const testModalVisible = ref(false);
const testingAgent = ref<string | null>(null);
const testMessage = ref('');
const testResult = ref<string | null>(null);
const testLoading = ref(false);

// Agent 详情
const detailModalVisible = ref(false);
const agentDetails = ref<AgentDetails | null>(null);
const detailLoading = ref(false);

const fetchStatus = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await requestClient.get<StudioStatus>(
      '/platform/mastra-studio-api/status',
    );
    status.value = res;
  } catch (e: any) {
    error.value = e.message || '获取状态失败';
  } finally {
    loading.value = false;
  }
};

const showAgentDetails = async (agentId: string) => {
  detailLoading.value = true;
  detailModalVisible.value = true;
  agentDetails.value = null;
  try {
    const res = await requestClient.get<AgentDetails>(
      `/platform/mastra-studio-api/agents/${agentId}`,
    );
    agentDetails.value = res;
  } catch (e: any) {
    message.error(e.message || '获取 Agent 详情失败');
    detailModalVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
};

const openTestModal = (agentId: string) => {
  testingAgent.value = agentId;
  testMessage.value = '';
  testResult.value = null;
  testModalVisible.value = true;
};

const runTest = async () => {
  if (!testingAgent.value || !testMessage.value.trim()) {
    message.warning('请输入测试消息');
    return;
  }
  testLoading.value = true;
  testResult.value = null;
  try {
    const res = await requestClient.post<{
      success: boolean;
      response?: string;
      error?: string;
    }>(`/platform/mastra-studio-api/agents/${testingAgent.value}/test`, {
      message: testMessage.value,
    });
    if (res.success) {
      testResult.value = res.response || '(无响应)';
    } else {
      testResult.value = `错误: ${res.error}`;
    }
  } catch (e: any) {
    testResult.value = `请求失败: ${e.message}`;
  } finally {
    testLoading.value = false;
  }
};

const agentColumns = [
  { title: 'Agent ID', dataIndex: 'id', key: 'id' },
  { title: '操作', key: 'action', width: 200 },
];

const agentData = computed(() => {
  if (!status.value) return [];
  return status.value.agents.map((id) => ({ id, key: id }));
});

onMounted(() => {
  fetchStatus();
});
</script>

<template>
  <div class="p-4">
    <Card title="Mastra Studio - AI 调试工具" :loading="loading">
      <template #extra>
        <Button type="primary" @click="fetchStatus" :loading="loading">
          刷新状态
        </Button>
      </template>

      <Alert
        v-if="error"
        type="error"
        :message="error"
        show-icon
        class="mb-4"
      />

      <template v-if="status">
        <Descriptions bordered :column="2" class="mb-4">
          <DescriptionsItem label="服务状态">
            <Tag :color="status.running ? 'green' : 'red'">
              {{ status.running ? '运行中' : '已停止' }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="端口">
            {{ status.port }}
          </DescriptionsItem>
          <DescriptionsItem label="Agent 数量">
            {{ status.agents.length }}
          </DescriptionsItem>
          <DescriptionsItem label="Workflow 数量">
            {{ status.workflows.length }}
          </DescriptionsItem>
          <DescriptionsItem label="Studio URL" :span="2">
            <a :href="status.url" target="_blank">{{ status.url }}</a>
            <Tag color="orange" class="ml-2">仅内网访问</Tag>
          </DescriptionsItem>
        </Descriptions>

        <Card title="Agent 列表" size="small">
          <Table
            :columns="agentColumns"
            :data-source="agentData"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'action'">
                <Button
                  type="link"
                  size="small"
                  @click="showAgentDetails(record.id)"
                >
                  详情
                </Button>
                <Button
                  type="link"
                  size="small"
                  @click="openTestModal(record.id)"
                >
                  测试
                </Button>
              </template>
            </template>
          </Table>
        </Card>
      </template>
    </Card>

    <!-- Agent 详情弹窗 -->
    <Modal
      v-model:open="detailModalVisible"
      title="Agent 详情"
      width="800px"
      :footer="null"
    >
      <Spin :spinning="detailLoading">
        <template v-if="agentDetails">
          <Descriptions bordered :column="1">
            <DescriptionsItem label="ID">
              {{ agentDetails.id }}
            </DescriptionsItem>
            <DescriptionsItem label="名称">
              {{ agentDetails.name }}
            </DescriptionsItem>
            <DescriptionsItem label="模型">
              {{ agentDetails.provider }} / {{ agentDetails.modelId }}
            </DescriptionsItem>
            <DescriptionsItem label="描述">
              {{ agentDetails.description || '(无)' }}
            </DescriptionsItem>
            <DescriptionsItem label="指令">
              <pre
                class="max-h-60 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-sm"
                >{{ agentDetails.instructions }}</pre
              >
            </DescriptionsItem>
          </Descriptions>
        </template>
      </Spin>
    </Modal>

    <!-- Agent 测试弹窗 -->
    <Modal
      v-model:open="testModalVisible"
      :title="`测试 Agent: ${testingAgent}`"
      width="600px"
      @ok="runTest"
      :confirmLoading="testLoading"
      okText="发送"
    >
      <div class="mb-4">
        <Input.TextArea
          v-model:value="testMessage"
          placeholder="输入测试消息..."
          :rows="3"
        />
      </div>
      <div v-if="testResult" class="mt-4">
        <div class="mb-2 font-bold">响应结果:</div>
        <pre
          class="max-h-60 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm"
          >{{ testResult }}</pre
        >
      </div>
    </Modal>
  </div>
</template>

<script lang="ts">
import { computed } from 'vue';
export default {
  name: 'MastraStudioView',
};
</script>
