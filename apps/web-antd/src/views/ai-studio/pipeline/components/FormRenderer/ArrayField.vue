<script lang="ts" setup>
import { ref, watch } from 'vue';
import { Button, FormItem, Input } from 'ant-design-vue';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue';

interface Props {
  modelValue: string[] | undefined;
  schema: Record<string, unknown>;
  fieldKey: string;
  required?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const localValue = ref<string[]>(
  Array.isArray(props.modelValue)
    ? [...props.modelValue]
    : Array.isArray(props.schema.default)
      ? [...(props.schema.default as string[])]
      : [''],
);

watch(
  localValue,
  (newValue) => {
    emit('update:modelValue', newValue);
  },
  { deep: true },
);

watch(
  () => props.modelValue,
  (newValue) => {
    if (
      Array.isArray(newValue) &&
      JSON.stringify(newValue) !== JSON.stringify(localValue.value)
    ) {
      localValue.value = [...newValue];
    }
  },
);

function addItem() {
  localValue.value.push('');
}

function removeItem(index: number) {
  localValue.value.splice(index, 1);
  if (localValue.value.length === 0) {
    localValue.value.push('');
  }
}

function updateItem(index: number, value: string) {
  localValue.value[index] = value;
}
</script>

<template>
  <FormItem
    :label="(schema.title as string) || fieldKey"
    :name="fieldKey"
    :help="schema.description as string"
    :required="required"
  >
    <div class="array-field">
      <div
        v-for="(item, index) in localValue"
        :key="index"
        class="array-field-item"
      >
        <Input
          :value="item"
          :placeholder="
            ((schema.items as Record<string, unknown>)
              ?.description as string) || `Item ${index + 1}`
          "
          @update:value="(val: string) => updateItem(index, val)"
        />
        <Button
          type="text"
          danger
          size="small"
          :disabled="localValue.length <= 1 && !item"
          @click="removeItem(index)"
        >
          <template #icon><DeleteOutlined /></template>
        </Button>
      </div>
      <Button type="dashed" block @click="addItem">
        <template #icon><PlusOutlined /></template>
        Add Item
      </Button>
    </div>
  </FormItem>
</template>

<style scoped>
.array-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.array-field-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.array-field-item :deep(.ant-input) {
  flex: 1;
}
</style>
