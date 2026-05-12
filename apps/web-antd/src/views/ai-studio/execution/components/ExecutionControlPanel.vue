<script setup lang="ts">
import { computed, ref } from 'vue';
import { Button, Modal, Space, Tag, message } from 'ant-design-vue';
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
} from '@ant-design/icons-vue';
import {
  suspendExecution,
  cancelExecution,
} from '#/api/ai-studio/execution-control';
import ResumeDataModal from './ResumeDataModal.vue';

interface Props {
  pipelineKey: string;
  executionId: string;
  /**
   * Execution status string. Accepts the AiPipelineExecution enum values
   * (PENDING / RUNNING / PAUSED / COMPLETED / FAILED / CANCELLED). Typed as
   * `string` so callers can pass list-view rows without coercion.
   */
  status: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'updated'): void }>();

const loading = ref(false);
const resumeModalOpen = ref(false);

const terminal = computed(() =>
  ['COMPLETED', 'FAILED', 'CANCELLED'].includes(props.status),
);

const statusTagColor = computed(() => {
  switch (props.status) {
    case 'PAUSED': {
      return 'orange';
    }
    case 'RUNNING': {
      return 'processing';
    }
    case 'COMPLETED': {
      return 'success';
    }
    case 'FAILED': {
      return 'error';
    }
    case 'CANCELLED': {
      return 'warning';
    }
    default: {
      return 'default';
    }
  }
});

async function doSuspend() {
  Modal.confirm({
    title: '确认暂停执行?',
    content:
      '工作流将在到达最近的暂停点(suspension point)后暂停。此操作为异步,通常需要数秒。',
    async onOk() {
      loading.value = true;
      try {
        const res = await suspendExecution(props.pipelineKey, props.executionId);
        if (res.success) {
          message.success('已请求暂停,等待工作流到达暂停点');
        } else {
          message.warning(`暂停未生效:${res.reason ?? '未知原因'}`);
        }
        emit('updated');
      } catch (error_) {
        const error = error_ as Error;
        message.error(error.message ?? '暂停请求失败');
      } finally {
        loading.value = false;
      }
    },
  });
}

async function doCancel() {
  Modal.confirm({
    title: '确认取消执行?',
    content: '取消后不能恢复。',
    okType: 'danger',
    async onOk() {
      loading.value = true;
      try {
        const res = await cancelExecution(props.pipelineKey, props.executionId);
        if (res.success) {
          message.success('已取消');
        } else if (res.reason === 'already-terminal') {
          message.info(`执行已结束(${res.currentStatus ?? 'terminal'})`);
        } else {
          message.warning(`取消失败:${res.reason ?? '未知原因'}`);
        }
        emit('updated');
      } catch (error_) {
        const error = error_ as Error;
        message.error(error.message ?? '取消请求失败');
      } finally {
        loading.value = false;
      }
    },
  });
}
</script>

<template>
  <div class="execution-control-panel">
    <Space>
      <Tag :color="statusTagColor" data-testid="execution-status-tag">
        {{ status }}
      </Tag>

      <Button
        v-if="status === 'RUNNING'"
        data-testid="btn-suspend"
        :loading="loading"
        @click="doSuspend"
      >
        <template #icon><PauseCircleOutlined /></template>
        暂停
      </Button>

      <Button
        v-if="status === 'PAUSED'"
        type="primary"
        data-testid="btn-resume"
        :loading="loading"
        @click="resumeModalOpen = true"
      >
        <template #icon><PlayCircleOutlined /></template>
        恢复
      </Button>

      <Button
        v-if="!terminal"
        danger
        data-testid="btn-cancel"
        :loading="loading"
        @click="doCancel"
      >
        <template #icon><StopOutlined /></template>
        取消
      </Button>
    </Space>

    <ResumeDataModal
      v-model:open="resumeModalOpen"
      :pipeline-key="pipelineKey"
      :execution-id="executionId"
      @resumed="emit('updated')"
    />
  </div>
</template>

<style scoped>
.execution-control-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}
</style>
