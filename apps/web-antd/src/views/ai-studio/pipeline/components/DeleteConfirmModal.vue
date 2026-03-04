<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import {
  Modal,
  Alert,
  Input,
  Typography,
  Space,
  Tag,
  Button,
} from 'ant-design-vue';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  PlayCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons-vue';
import type { DeleteCheckResponse } from '#/api/ai-studio/pipeline';

const { Paragraph, Text } = Typography;

interface Props {
  visible: boolean;
  pipelineKey: string;
  checkData: DeleteCheckResponse | null;
  loading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void;
  (e: 'confirm', confirmationText: string): void;
  (e: 'cancel'): void;
}>();

// 确认文本输入
const confirmationText = ref('');

// 是否可以确认删除
const canConfirm = computed(() => {
  if (!props.checkData) return false;
  return confirmationText.value === props.checkData.requiredConfirmation;
});

// 监听 visible 变化，打开时重置输入
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      confirmationText.value = '';
    }
  },
);

// 处理确认
const handleOk = () => {
  if (canConfirm.value) {
    emit('confirm', confirmationText.value);
  }
};

// 处理取消
const handleCancel = () => {
  emit('update:visible', false);
  emit('cancel');
};

// 获取风险等级
const getRiskLevel = () => {
  if (!props.checkData) return 'warning';
  const { runningExecutions, featureBindings } = props.checkData;
  if (runningExecutions > 0 || featureBindings.length > 0) {
    return 'error';
  }
  return 'warning';
};

// 获取风险描述
const getRiskDescription = () => {
  if (!props.checkData) return '';
  const { runningExecutions, featureBindings } = props.checkData;
  const parts: string[] = [];

  if (runningExecutions > 0) {
    parts.push(`有 ${runningExecutions} 个正在运行的执行将被取消`);
  }

  if (featureBindings.length > 0) {
    parts.push(`影响 ${featureBindings.length} 个已绑定的功能模块`);
  }

  return parts.join('，') || '此操作不可恢复';
};
</script>

<template>
  <Modal
    :open="visible"
    :title="null"
    :closable="!loading"
    :mask-closable="!loading"
    :confirm-loading="loading"
    :ok-button-props="{
      disabled: !canConfirm,
      danger: true,
    }"
    ok-text="确认删除"
    cancel-text="取消"
    width="560px"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="delete-confirm-content">
      <!-- 标题 -->
      <div class="modal-header">
        <ExclamationCircleOutlined class="warning-icon" />
        <span class="title">确认删除流程？</span>
      </div>

      <!-- 风险提示 -->
      <Alert
        :type="getRiskLevel()"
        :message="`警告：${getRiskDescription()}`"
        :description="checkData?.warnings.join('；')"
        show-icon
        class="risk-alert"
      />

      <!-- 流程信息 -->
      <div class="pipeline-info">
        <div class="info-item">
          <Text type="secondary">流程名称：</Text>
          <Text strong>{{ checkData?.pipelineName }}</Text>
        </div>
        <div class="info-item">
          <Text type="secondary">流程标识：</Text>
          <Tag>{{ checkData?.requiredConfirmation }}</Tag>
        </div>
      </div>

      <!-- 功能模块绑定信息 -->
      <div v-if="checkData?.featureBindings.length" class="feature-bindings">
        <div class="section-title">
          <LinkOutlined />
          <span>已绑定的功能模块</span>
        </div>
        <Space wrap>
          <Tag
            v-for="feature in checkData.featureBindings"
            :key="feature.featureCode"
            :color="feature.isSystem ? 'blue' : 'default'"
          >
            {{ feature.featureName }}
            <template v-if="feature.isSystem">(系统)</template>
          </Tag>
        </Space>
      </div>

      <!-- 运行中的执行 -->
      <div v-if="checkData?.runningExecutions" class="running-executions">
        <div class="section-title">
          <PlayCircleOutlined />
          <span>运行中的执行</span>
        </div>
        <Text type="danger"
          >{{ checkData.runningExecutions }} 个执行将被取消</Text
        >
      </div>

      <!-- 删除影响说明 -->
      <div class="impact-notice">
        <div class="section-title">
          <WarningOutlined />
          <span>删除后影响</span>
        </div>
        <ul class="impact-list">
          <li>绑定的功能模块将无法正常使用此流程</li>
          <li>正在运行的执行将被立即取消</li>
          <li>历史执行记录将被保留但无法追溯流程定义</li>
          <li>此操作<strong>不可恢复</strong></li>
        </ul>
      </div>

      <!-- 确认输入 -->
      <div class="confirmation-section">
        <Paragraph class="confirmation-text">
          请输入流程标识
          <Text code copyable>{{ checkData?.requiredConfirmation }}</Text>
          以确认删除：
        </Paragraph>
        <Input
          v-model:value="confirmationText"
          placeholder="请输入流程标识"
          size="large"
          :disabled="loading"
        />
      </div>
    </div>

    <!-- 自定义页脚 -->
    <template #footer>
      <div class="modal-footer">
        <Space>
          <Button @click="handleCancel" :disabled="loading">取消</Button>
          <Button
            type="primary"
            danger
            :disabled="!canConfirm"
            :loading="loading"
            @click="handleOk"
          >
            确认删除
          </Button>
        </Space>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.delete-confirm-content {
  padding: 8px 0;
}

.modal-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}

.warning-icon {
  font-size: 24px;
  color: #faad14;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: rgb(0 0 0 / 85%);
}

.risk-alert {
  margin-bottom: 20px;
}

.pipeline-info {
  padding: 16px;
  margin-bottom: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.info-item {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.feature-bindings,
.running-executions,
.impact-notice {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
  color: rgb(0 0 0 / 85%);
}

.impact-list {
  padding-left: 20px;
  margin: 0;
  color: rgb(0 0 0 / 65%);
}

.impact-list li {
  margin-bottom: 4px;
}

.confirmation-section {
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.confirmation-text {
  margin-bottom: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
