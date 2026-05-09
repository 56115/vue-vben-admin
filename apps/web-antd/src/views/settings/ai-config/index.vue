<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { message } from 'ant-design-vue';

import type {
  AiCredentialDto,
  DefaultModelBindingDto,
} from '../../_shared/ai-config/credentials.api';
import type { ModelCapability } from '../../_shared/ai-config/ProviderPresets';

import CredentialDialog from '../../_shared/ai-config/CredentialDialog.vue';
import CredentialList from '../../_shared/ai-config/CredentialList.vue';
import {
  getDefaultModels,
  getScenarioBindings,
  listCredentials,
  setDefaultModels,
} from '../../_shared/ai-config/credentials.api';
import DefaultModelPicker from '../../_shared/ai-config/DefaultModelPicker.vue';
import ScenarioBindingTable from '../../_shared/ai-config/ScenarioBindingTable.vue';

defineOptions({ name: 'TenantAiConfigPage' });

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
    credentials.value = await listCredentials('tenant');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    message.error(`加载凭据失败：${reason}`);
  }
}

async function loadDefaults() {
  try {
    const list = await getDefaultModels('tenant');
    for (const cap of ['LLM', 'VISION', 'EMBEDDING'] as ModelCapability[]) {
      const item = list.find((d) => d.capability === cap);
      defaultBindings.value[cap] = item ? `${item.credentialId}:${item.modelName}` : '';
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    message.error(`加载默认模型失败：${reason}`);
  }
}

async function loadScenarioStub() {
  try {
    await getScenarioBindings('tenant');
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
    await setDefaultModels('tenant', dto);
    message.success('默认模型已保存');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    message.error(`保存失败：${reason}`);
  }
}
</script>

<template>
  <div class="ai-config-page">
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
      <CredentialList
        scope="tenant"
        @add="openAdd"
        @edit="openEdit"
      />
      <CredentialDialog
        v-model:visible="dialogVisible"
        :mode="dialogMode"
        scope="tenant"
        :initial-value="editingCredential"
        @saved="onSaved"
      />
    </div>

    <div v-if="activeTab === 'defaults'" class="tab-panel">
      <h4>默认模型</h4>
      <p class="helper-text">选择默认 LLM / Vision / Embedding，未在场景级覆盖的调用将使用这些默认值。</p>
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
      <ScenarioBindingTable scope="tenant" :credentials="credentials" />
    </div>
  </div>
</template>

<style scoped>
.ai-config-page {
  padding: 16px 20px;
}
.tab-bar {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--ant-color-border, #d9d9d9);
  margin-bottom: 16px;
}
.tab-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: var(--ant-color-text, #333);
  font-size: 13px;
}
.tab-btn.active {
  border-bottom-color: var(--ant-color-primary, #1677ff);
  color: var(--ant-color-primary, #1677ff);
  font-weight: 600;
}
.tab-panel {
  padding: 8px 0;
}
.helper-text {
  color: var(--ant-color-text-tertiary, #999);
  font-size: 12px;
  margin-bottom: 12px;
}
.defaults-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  max-width: 480px;
}
.defaults-label {
  width: 80px;
  font-size: 12px;
  font-weight: 600;
}
.btn-save {
  margin-top: 12px;
  padding: 6px 14px;
  border: 1px solid var(--ant-color-primary, #1677ff);
  background: var(--ant-color-primary, #1677ff);
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
}
</style>
