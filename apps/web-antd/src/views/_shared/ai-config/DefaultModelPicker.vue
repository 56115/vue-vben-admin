<script lang="ts" setup>
import { computed } from 'vue';

import type { AiCredentialDto } from './credentials.api';
import type { ModelCapability } from './ProviderPresets';

defineOptions({ name: 'DefaultModelPicker' });

const props = defineProps<{
  capability: ModelCapability;
  credentials: AiCredentialDto[];
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

interface Option {
  label: string;
  value: string;
}

const options = computed<Option[]>(() => {
  const out: Option[] = [];
  for (const c of props.credentials) {
    if (!c.isActive) continue;
    for (const m of c.enabledModels) {
      if (m.capability !== props.capability) continue;
      out.push({
        value: `${c.id}:${m.name}`,
        label: `${c.displayName} / ${m.name}`,
      });
    }
  }
  return out;
});

function onChange(event: Event) {
  const v = (event.target as HTMLSelectElement).value;
  emit('update:modelValue', v);
}
</script>

<template>
  <div class="default-model-picker">
    <div v-if="credentials.length === 0" class="empty-hint">
      请先创建凭据
    </div>
    <select
      v-else
      class="picker-select"
      :value="modelValue"
      data-testid="default-model-select"
      @change="onChange"
    >
      <option value="">— 未选择 —</option>
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.default-model-picker {
  width: 100%;
}
.picker-select {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--ant-color-border, #d9d9d9);
  border-radius: 4px;
  font-size: 13px;
}
.empty-hint {
  color: var(--ant-color-text-tertiary, #999);
  font-size: 12px;
}
</style>
