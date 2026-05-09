<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { message } from 'ant-design-vue';

import { requestClient } from '#/api/request';

import type { AiCredentialDto, CredentialScope, ScenarioBindingDto } from './credentials.api';
import type { AiScenarioKey } from './scenario-capability.map';

import { getScenarioBindings } from './credentials.api';
import DefaultModelPicker from './DefaultModelPicker.vue';
import { ALL_SCENARIOS, capabilityFor } from './scenario-capability.map';

defineOptions({ name: 'ScenarioBindingTable' });

const props = defineProps<{
  credentials: AiCredentialDto[];
  scope: CredentialScope;
}>();

interface RowState {
  binding: string;
  maxTokens: null | number;
  saving: boolean;
  temperature: null | number;
  timeout: null | number;
  topP: null | number;
}

const rows = reactive<Record<AiScenarioKey, RowState>>({} as Record<AiScenarioKey, RowState>);
const loaded = ref(false);

for (const s of ALL_SCENARIOS) {
  rows[s] = {
    binding: '',
    temperature: null,
    maxTokens: null,
    timeout: null,
    topP: null,
    saving: false,
  };
}

function basePath(): string {
  return props.scope === 'platform'
    ? '/platform/ai-config/scenarios'
    : '/settings/ai-config/scenarios';
}

async function load() {
  try {
    const bindings: ScenarioBindingDto[] = await getScenarioBindings(props.scope);
    for (const b of bindings) {
      const row = rows[b.scenario as AiScenarioKey];
      if (row) {
        row.binding = `${b.credentialId}:${b.modelName}`;
      }
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    message.error(`加载场景配置失败：${reason}`);
  } finally {
    loaded.value = true;
  }
}

onMounted(load);

async function saveRow(scenario: AiScenarioKey) {
  const row = rows[scenario];
  row.saving = true;
  try {
    const [credId, modelName] = row.binding.split(':') as [string, string];
    await requestClient.put(`${basePath()}/${scenario}`, {
      credentialId: credId ? Number(credId) : null,
      modelName: modelName ?? null,
      temperature: row.temperature,
      maxTokens: row.maxTokens,
      timeout: row.timeout,
      topP: row.topP,
    });
    message.success(`${scenario} 已保存`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    message.error(`保存失败：${reason}`);
  } finally {
    row.saving = false;
  }
}
</script>

<template>
  <table class="scenario-table">
    <thead>
      <tr>
        <th>场景</th>
        <th>能力</th>
        <th>模型</th>
        <th>temperature</th>
        <th>maxTokens</th>
        <th>timeout</th>
        <th>topP</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="s in ALL_SCENARIOS"
        :key="s"
        data-testid="scenario-row"
        :data-scenario="s"
      >
        <td>{{ s }}</td>
        <td data-testid="scenario-capability">{{ capabilityFor(s) }}</td>
        <td>
          <DefaultModelPicker
            v-model="rows[s].binding"
            :credentials="credentials"
            :capability="capabilityFor(s)"
          />
        </td>
        <td>
          <input
            v-model.number="rows[s].temperature"
            type="number"
            step="0.1"
            data-testid="scenario-input-temperature"
            class="num-input"
          />
        </td>
        <td>
          <input
            v-model.number="rows[s].maxTokens"
            type="number"
            data-testid="scenario-input-maxTokens"
            class="num-input"
          />
        </td>
        <td>
          <input
            v-model.number="rows[s].timeout"
            type="number"
            data-testid="scenario-input-timeout"
            class="num-input"
          />
        </td>
        <td>
          <input
            v-model.number="rows[s].topP"
            type="number"
            step="0.1"
            data-testid="scenario-input-topP"
            class="num-input"
          />
        </td>
        <td>
          <button
            type="button"
            class="btn-save"
            data-testid="scenario-save"
            :disabled="rows[s].saving || undefined"
            @click="saveRow(s)"
          >
            {{ rows[s].saving ? '保存中…' : '保存' }}
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.scenario-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.scenario-table th,
.scenario-table td {
  border-bottom: 1px solid var(--ant-color-border, #d9d9d9);
  padding: 6px 8px;
  text-align: left;
}
.num-input {
  width: 80px;
  padding: 2px 6px;
  border: 1px solid var(--ant-color-border, #d9d9d9);
  border-radius: 3px;
}
.btn-save {
  padding: 3px 10px;
  border: 1px solid var(--ant-color-primary, #1677ff);
  background: var(--ant-color-primary, #1677ff);
  color: #fff;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}
.btn-save[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
