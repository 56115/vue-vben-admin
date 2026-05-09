<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';

import { message } from 'ant-design-vue';

import type {
  AiCredentialDto,
  AiCredentialUpsertDto,
  CredentialScope,
} from './credentials.api';
import type { AiProviderKey, ModelPreset } from './ProviderPresets';

import { createCredential, updateCredential } from './credentials.api';
import ModelChipsEditor from './ModelChipsEditor.vue';
import { PROVIDER_PRESETS } from './ProviderPresets';

defineOptions({ name: 'CredentialDialog' });

const props = defineProps<{
  initialValue?: AiCredentialDto;
  mode: 'create' | 'edit';
  scope: CredentialScope;
  visible: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  saved: [credential: AiCredentialDto];
}>();

const PROVIDER_KEYS: AiProviderKey[] = [
  'OPENAI',
  'ANTHROPIC',
  'DEEPSEEK',
  'QWEN',
  'MOONSHOT',
  'OLLAMA',
  'ONEAPI',
  'CUSTOM',
];

interface FormState {
  apiKey: string;
  baseUrl: string;
  displayName: string;
  enabledModels: ModelPreset[];
  isActive: boolean;
  provider: AiProviderKey;
}

function emptyForm(): FormState {
  return {
    provider: 'OPENAI',
    displayName: '',
    baseUrl: PROVIDER_PRESETS.OPENAI.defaultBaseUrl,
    apiKey: '',
    enabledModels: [],
    isActive: true,
  };
}

const form = reactive<FormState>(emptyForm());
const errors = reactive<Partial<Record<keyof FormState, string>>>({});
const submitting = ref(false);

watch(
  () => [props.visible, props.initialValue, props.mode] as const,
  ([visible, init]) => {
    if (!visible) return;
    Object.assign(form, emptyForm());
    Object.keys(errors).forEach((k) => delete (errors as Record<string, string>)[k]);
    if (init) {
      form.provider = init.provider;
      form.displayName = init.displayName;
      form.baseUrl = init.baseUrl;
      form.apiKey = '';
      form.enabledModels = [...init.enabledModels];
      form.isActive = init.isActive;
    }
  },
  { immediate: true },
);

const apiKeyPlaceholder = computed(() =>
  props.mode === 'edit' ? '留空表示不变（保留旧 apiKey）' : '请输入 apiKey',
);

function onProviderChange(value: AiProviderKey) {
  form.provider = value;
  const preset = PROVIDER_PRESETS[value];
  if (preset?.defaultBaseUrl) {
    form.baseUrl = preset.defaultBaseUrl;
  }
}

function isValidUrl(v: string): boolean {
  return /^https?:\/\//.test(v);
}

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete (errors as Record<string, string>)[k]);
  if (!form.displayName.trim()) errors.displayName = 'displayName 必填';
  if (!form.baseUrl.trim()) {
    errors.baseUrl = 'baseUrl 必填';
  } else if (!isValidUrl(form.baseUrl)) {
    errors.baseUrl = 'baseUrl 必须以 http:// 或 https:// 开头';
  }
  if (props.mode === 'create' && !form.apiKey.trim()) {
    errors.apiKey = 'apiKey 必填';
  }
  return Object.keys(errors).length === 0;
}

async function onSubmit() {
  if (!validate()) return;
  submitting.value = true;
  try {
    const dto: AiCredentialUpsertDto = {
      provider: form.provider,
      displayName: form.displayName.trim(),
      baseUrl: form.baseUrl.trim(),
      enabledModels: form.enabledModels,
      isActive: form.isActive,
    };
    if (form.apiKey.trim()) {
      dto.apiKey = form.apiKey.trim();
    }
    let saved: AiCredentialDto;
    if (props.mode === 'create') {
      saved = await createCredential(props.scope, dto);
      message.success('凭据已创建');
    } else {
      if (!props.initialValue) {
        throw new Error('initialValue is required in edit mode');
      }
      saved = await updateCredential(props.scope, props.initialValue.id, dto);
      message.success('凭据已更新');
    }
    emit('saved', saved);
    emit('update:visible', false);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    message.error(`保存失败：${reason}`);
  } finally {
    submitting.value = false;
  }
}

function onCancel() {
  emit('update:visible', false);
}
</script>

<template>
  <div v-if="visible" class="cred-dialog" data-testid="credential-dialog">
    <div class="cred-dialog-mask" @click="onCancel" />
    <div class="cred-dialog-body">
      <h3 class="cred-dialog-title">
        {{ mode === 'create' ? '新增凭据' : '编辑凭据' }}
      </h3>

      <label class="form-row">
        <span class="form-label">Provider</span>
        <select
          data-testid="cred-select-provider"
          :value="form.provider"
          @change="onProviderChange(($event.target as HTMLSelectElement).value as AiProviderKey)"
        >
          <option v-for="p in PROVIDER_KEYS" :key="p" :value="p">{{ p }}</option>
        </select>
      </label>

      <label class="form-row">
        <span class="form-label">显示名称</span>
        <input
          v-model="form.displayName"
          data-testid="cred-input-displayName"
          placeholder="如 OpenAI Default"
        />
        <span v-if="errors.displayName" class="form-error" data-testid="cred-error-displayName">
          {{ errors.displayName }}
        </span>
      </label>

      <label class="form-row">
        <span class="form-label">Base URL</span>
        <input
          v-model="form.baseUrl"
          data-testid="cred-input-baseUrl"
          placeholder="https://..."
        />
        <span v-if="errors.baseUrl" class="form-error" data-testid="cred-error-baseUrl">
          {{ errors.baseUrl }}
        </span>
      </label>

      <label class="form-row">
        <span class="form-label">API Key</span>
        <input
          v-model="form.apiKey"
          type="password"
          data-testid="cred-input-apiKey"
          :placeholder="apiKeyPlaceholder"
        />
        <span v-if="errors.apiKey" class="form-error" data-testid="cred-error-apiKey">
          {{ errors.apiKey }}
        </span>
      </label>

      <div class="form-row">
        <span class="form-label">启用模型</span>
        <ModelChipsEditor
          v-model="form.enabledModels"
          :provider="form.provider"
        />
      </div>

      <label class="form-row">
        <span class="form-label">是否启用</span>
        <input
          v-model="form.isActive"
          type="checkbox"
          data-testid="cred-input-isActive"
        />
      </label>

      <div class="form-actions">
        <button type="button" data-testid="cred-cancel" @click="onCancel">取消</button>
        <button
          type="button"
          data-testid="cred-submit"
          :disabled="submitting || undefined"
          @click="onSubmit"
        >
          {{ submitting ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cred-dialog {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cred-dialog-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
}
.cred-dialog-body {
  position: relative;
  width: 480px;
  max-width: 92vw;
  background: var(--ant-color-bg-container, #fff);
  border-radius: 6px;
  padding: 20px 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}
.cred-dialog-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
.form-label {
  font-size: 12px;
  color: var(--ant-color-text-tertiary, #999);
}
.form-error {
  color: var(--ant-color-error, #ff4d4f);
  font-size: 12px;
}
.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
