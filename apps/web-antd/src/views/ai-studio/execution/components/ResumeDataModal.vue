<script setup lang="ts">
import { ref, watch } from 'vue';
import { Input, Modal, message } from 'ant-design-vue';
import { resumeExecution } from '#/api/ai-studio/execution-control';

interface Props {
  open: boolean;
  pipelineKey: string;
  executionId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'resumed'): void;
}>();

const jsonText = ref('{}');
const loading = ref(false);
const errorText = ref<null | string>(null);

const MAX_SIZE_BYTES = 16 * 1024;

watch(
  () => props.open,
  (next) => {
    if (next) {
      jsonText.value = '{}';
      errorText.value = null;
    }
  },
);

function validatePayload(): null | Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText.value);
  } catch (error_) {
    const error = error_ as Error;
    errorText.value = `JSON 解析失败:${error.message}`;
    return null;
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    errorText.value = 'resumeData 必须是 JSON 对象(非数组、非 null)';
    return null;
  }
  const serialized = JSON.stringify(parsed);
  if (new TextEncoder().encode(serialized).byteLength > MAX_SIZE_BYTES) {
    errorText.value = `resumeData 序列化后超过 ${MAX_SIZE_BYTES} 字节上限`;
    return null;
  }
  return parsed as Record<string, unknown>;
}

async function onOk() {
  errorText.value = null;
  const payload = validatePayload();
  if (!payload) return;

  loading.value = true;
  try {
    const res = await resumeExecution(props.pipelineKey, props.executionId, {
      resumeData: payload,
    });
    if (res.success) {
      message.success('已恢复执行');
      emit('resumed');
      emit('update:open', false);
    } else {
      errorText.value = `恢复未生效:${res.reason ?? '未知原因'} (当前状态 ${
        res.currentStatus ?? 'unknown'
      })`;
    }
  } catch (error_) {
    const error = error_ as Error;
    errorText.value = error.message ?? '恢复请求失败';
  } finally {
    loading.value = false;
  }
}

function onCancel() {
  emit('update:open', false);
}
</script>

<template>
  <Modal
    :open="open"
    title="恢复执行 - 提供 resumeData"
    :confirm-loading="loading"
    width="600px"
    @ok="onOk"
    @cancel="onCancel"
  >
    <p class="hint">
      为暂停的 step 提供 resume 数据(JSON 对象,序列化后 ≤
      {{ MAX_SIZE_BYTES }} 字节)。
    </p>
    <Input.TextArea
      v-model:value="jsonText"
      :rows="12"
      placeholder='{"decision": "approve"}'
      data-testid="resume-data-input"
    />
    <p v-if="errorText" class="error" data-testid="resume-error">
      {{ errorText }}
    </p>
  </Modal>
</template>

<style scoped>
.hint {
  margin-bottom: 8px;
  color: rgb(0 0 0 / 45%);
}
.error {
  margin-top: 8px;
  color: #ff4d4f;
}
</style>
