<script lang="ts" setup>
import { computed, ref } from 'vue';

import type { AiProviderKey, ModelCapability, ModelPreset } from './ProviderPresets';

import { PROVIDER_PRESETS } from './ProviderPresets';

defineOptions({ name: 'ModelChipsEditor' });

const props = defineProps<{
  modelValue: ModelPreset[];
  provider: AiProviderKey;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ModelPreset[]];
}>();

const pickerOpen = ref(false);
const pickerSelection = ref<Record<string, boolean>>({});

const presetModels = computed<ModelPreset[]>(
  () => PROVIDER_PRESETS[props.provider]?.models ?? [],
);

function chipKey(m: ModelPreset): string {
  return `${m.name}::${m.capability}`;
}

function capabilityColor(c: ModelCapability): string {
  if (c === 'LLM') return 'blue';
  if (c === 'VISION') return 'purple';
  return 'green';
}

function removeChip(target: ModelPreset) {
  const next = props.modelValue.filter((m) => chipKey(m) !== chipKey(target));
  emit('update:modelValue', next);
}

function openPicker() {
  pickerSelection.value = {};
  pickerOpen.value = true;
}

function confirmPicker() {
  const additions = presetModels.value.filter((m) => pickerSelection.value[chipKey(m)]);
  const seen = new Set(props.modelValue.map(chipKey));
  const merged = [...props.modelValue];
  for (const m of additions) {
    if (!seen.has(chipKey(m))) {
      merged.push(m);
      seen.add(chipKey(m));
    }
  }
  emit('update:modelValue', merged);
  pickerOpen.value = false;
}
</script>

<template>
  <div class="model-chips-editor">
    <div v-if="modelValue.length === 0" class="empty-hint" data-testid="model-chips-empty">
      还没添加任何模型
    </div>
    <div v-else class="chip-list">
      <span
        v-for="m in modelValue"
        :key="chipKey(m)"
        class="chip"
        :data-testid="'model-chip'"
        :data-capability="m.capability"
      >
        <span class="chip-cap" :data-color="capabilityColor(m.capability)">
          {{ m.capability }}
        </span>
        <span class="chip-name">{{ m.name }}</span>
        <button
          type="button"
          class="chip-remove"
          :data-testid="`model-chip-remove-${m.name}`"
          @click="removeChip(m)"
        >
          ×
        </button>
      </span>
    </div>

    <div class="actions">
      <button
        type="button"
        class="btn-quick-add"
        data-testid="model-quick-add"
        @click="openPicker"
      >
        快速添加
      </button>
    </div>

    <div v-if="pickerOpen" class="preset-picker" data-testid="model-preset-picker">
      <div v-if="presetModels.length === 0" class="empty-hint">
        当前 provider 无预置模型，请手动输入
      </div>
      <label
        v-for="m in presetModels"
        :key="chipKey(m)"
        class="preset-row"
      >
        <input
          type="checkbox"
          :data-testid="`preset-checkbox-${m.name}-${m.capability}`"
          :checked="pickerSelection[chipKey(m)] === true"
          @change="(e) => (pickerSelection[chipKey(m)] = (e.target as HTMLInputElement).checked)"
        />
        <span class="preset-cap">{{ m.capability }}</span>
        <span class="preset-name">{{ m.name }}</span>
      </label>
      <div class="picker-actions">
        <button
          type="button"
          data-testid="preset-confirm"
          @click="confirmPicker"
        >
          确认
        </button>
        <button
          type="button"
          data-testid="preset-cancel"
          @click="pickerOpen = false"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-chips-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border: 1px solid var(--ant-color-border, #d9d9d9);
  border-radius: 4px;
  font-size: 12px;
  background: var(--ant-color-bg-container, #fff);
}
.chip-cap {
  padding: 0 4px;
  font-weight: 600;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.05);
}
.chip-remove {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: var(--ant-color-text-tertiary, #999);
}
.empty-hint {
  color: var(--ant-color-text-tertiary, #999);
  font-size: 12px;
  padding: 4px 0;
}
.preset-picker {
  border: 1px solid var(--ant-color-border, #d9d9d9);
  border-radius: 4px;
  padding: 8px;
  background: var(--ant-color-bg-container, #fff);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.preset-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
}
.picker-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
</style>
