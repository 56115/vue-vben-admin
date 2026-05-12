<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { message } from 'ant-design-vue';

import type {
  AiCredentialDto,
  CredentialScope,
  DefaultModelBindingDto,
} from './credentials.api';
import type { ModelCapability } from './ProviderPresets';

import CredentialDialog from './CredentialDialog.vue';
import CredentialList from './CredentialList.vue';
import {
  getDefaultModels,
  getScenarioBindings,
  listCredentials,
  setDefaultModels,
} from './credentials.api';
import DefaultModelPicker from './DefaultModelPicker.vue';
import ScenarioBindingTable from './ScenarioBindingTable.vue';

defineOptions({ name: 'AiConfigPage' });

const props = withDefaults(
  defineProps<{
    defaultModelsDescription: string;
    defaultModelsTitle: string;
    pageDescription?: string;
    pageTitle?: string;
    saveSuccessMessage: string;
    scope: CredentialScope;
  }>(),
  {
    pageDescription: undefined,
    pageTitle: undefined,
  },
);

type TabKey = 'credentials' | 'defaults' | 'scenarios';

const activeTab = ref<TabKey>('credentials');

const credentials = ref<AiCredentialDto[]>([]);
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const editingCredential = ref<AiCredentialDto | undefined>(undefined);

const defaultBindings = ref<Record<ModelCapability, string>>({
  LLM: '',
  VISION: '',
  EMBEDDING: '',
});

async function refreshCredentials() {
  try {
    credentials.value = await listCredentials(props.scope);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    message.error(`加载凭据失败：${reason}`);
  }
}

async function loadDefaults() {
  try {
    const list = await getDefaultModels(props.scope);
    for (const cap of ['LLM', 'VISION', 'EMBEDDING'] as ModelCapability[]) {
      const item = list.find((d) => d.capability === cap);
      defaultBindings.value[cap] = item
        ? `${item.credentialId}:${item.modelName}`
        : '';
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    message.error(`加载默认模型失败：${reason}`);
  }
}

async function loadScenarioStub() {
  try {
    await getScenarioBindings(props.scope);
  } catch {
    /* tab will retry on activation */
  }
}

onMounted(async () => {
  await Promise.all([refreshCredentials(), loadDefaults(), loadScenarioStub()]);
});

function openAdd() {
  dialogMode.value = 'create';
  editingCredential.value = undefined;
  dialogVisible.value = true;
}

function openEdit(id: number) {
  const found = credentials.value.find((c) => c.id === id);
  if (!found) return;
  dialogMode.value = 'edit';
  editingCredential.value = found;
  dialogVisible.value = true;
}

async function onSaved() {
  await refreshCredentials();
}

async function saveDefaults() {
  const dto: DefaultModelBindingDto[] = [];
  for (const cap of ['LLM', 'VISION', 'EMBEDDING'] as ModelCapability[]) {
    const v = defaultBindings.value[cap];
    if (!v) continue;
    const [credId, modelName] = v.split(':') as [string, string];
    dto.push({
      capability: cap,
      credentialId: Number(credId),
      modelName,
    });
  }
  try {
    await setDefaultModels(props.scope, dto);
    message.success(props.saveSuccessMessage);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    message.error(`保存失败：${reason}`);
  }
}
</script>

<template>
  <div class="ai-config-page">
    <div v-if="pageTitle" class="page-header">
      <h2>{{ pageTitle }}</h2>
      <p v-if="pageDescription" class="page-description">
        {{ pageDescription }}
      </p>
    </div>

    <div class="tab-bar">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'credentials' }"
        data-testid="tab-credentials"
        @click="activeTab = 'credentials'"
      >
        凭据管理
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'defaults' }"
        data-testid="tab-defaults"
        @click="activeTab = 'defaults'"
      >
        默认模型
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'scenarios' }"
        data-testid="tab-scenarios"
        @click="activeTab = 'scenarios'"
      >
        场景覆盖（高级）
      </button>
    </div>

    <div v-if="activeTab === 'credentials'" class="tab-panel">
      <CredentialList :scope="scope" @add="openAdd" @edit="openEdit" />
      <CredentialDialog
        v-model:visible="dialogVisible"
        :mode="dialogMode"
        :scope="scope"
        :initial-value="editingCredential"
        @saved="onSaved"
      />
    </div>

    <div v-if="activeTab === 'defaults'" class="tab-panel">
      <h4>{{ defaultModelsTitle }}</h4>
      <p class="helper-text">{{ defaultModelsDescription }}</p>
      <div class="defaults-row">
        <span class="defaults-label">LLM</span>
        <DefaultModelPicker
          v-model="defaultBindings.LLM"
          :credentials="credentials"
          capability="LLM"
        />
      </div>
      <div class="defaults-row">
        <span class="defaults-label">VISION</span>
        <DefaultModelPicker
          v-model="defaultBindings.VISION"
          :credentials="credentials"
          capability="VISION"
        />
      </div>
      <div class="defaults-row">
        <span class="defaults-label">EMBEDDING</span>
        <DefaultModelPicker
          v-model="defaultBindings.EMBEDDING"
          :credentials="credentials"
          capability="EMBEDDING"
        />
      </div>
      <button
        type="button"
        class="btn-save"
        data-testid="defaults-save"
        @click="saveDefaults"
      >
        保存默认模型
      </button>
    </div>

    <div v-if="activeTab === 'scenarios'" class="tab-panel">
      <ScenarioBindingTable :scope="scope" :credentials="credentials" />
    </div>
  </div>
</template>

<style scoped>
.ai-config-page {
  padding: 16px 20px;
}

.page-header {
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
}

.page-description {
  margin: 0;
  font-size: 12px;
  color: var(--ant-color-text-tertiary, #999);
}

.tab-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--ant-color-border, #d9d9d9);
}

.tab-btn {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--ant-color-text, #333);
  cursor: pointer;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
}

.tab-btn.active {
  font-weight: 600;
  color: var(--ant-color-primary, #1677ff);
  border-bottom-color: var(--ant-color-primary, #1677ff);
}

.tab-panel {
  padding: 8px 0;
}

.helper-text {
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary, #999);
}

.defaults-row {
  display: flex;
  gap: 12px;
  align-items: center;
  max-width: 480px;
  margin-bottom: 10px;
}

.defaults-label {
  width: 80px;
  font-size: 12px;
  font-weight: 600;
}

.btn-save {
  padding: 6px 14px;
  margin-top: 12px;
  color: #fff;
  cursor: pointer;
  background: var(--ant-color-primary, #1677ff);
  border: 1px solid var(--ant-color-primary, #1677ff);
  border-radius: 4px;
}
</style>
