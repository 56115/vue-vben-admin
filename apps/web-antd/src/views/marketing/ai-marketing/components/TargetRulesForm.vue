<script setup lang="ts">
import { Form, Select, InputNumber, Space } from 'ant-design-vue';
import type { SelectOption } from '#/constants/crm-options';

interface TargetRules {
  rfmSegments?: string[];
  minMonetary?: number;
  maxRecencyDays?: number;
}

interface Props {
  rules: TargetRules;
  audienceLimit: number;
}

interface Emits {
  (e: 'update:rules', value: TargetRules): void;
  (e: 'update:audienceLimit', value: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// RFM 分层选项
const rfmSegmentOptions: SelectOption[] = [
  { value: 'VIP', label: 'VIP客户', color: 'gold' },
  { value: 'IMPORTANT', label: '重要客户', color: 'orange' },
  { value: 'NORMAL', label: '普通客户', color: 'blue' },
  { value: 'POTENTIAL', label: '潜力客户', color: 'cyan' },
  { value: 'INACTIVE', label: '不活跃客户', color: 'default' },
];

// 人群上限选项
const audienceLimitOptions = [
  { value: 100, label: '100人' },
  { value: 500, label: '500人' },
  { value: 1000, label: '1000人' },
  { value: 2000, label: '2000人' },
  { value: 5000, label: '5000人' },
  { value: 10000, label: '10000人' },
];

function updateRules<K extends keyof TargetRules>(
  field: K,
  value: TargetRules[K],
) {
  emit('update:rules', { ...props.rules, [field]: value });
}

defineOptions({ name: 'TargetRulesForm' });
</script>

<template>
  <div class="space-y-4">
    <Form.Item label="RFM 分层">
      <Select
        mode="multiple"
        :value="rules.rfmSegments || []"
        @update:value="(v) => updateRules('rfmSegments', v as string[])"
        :options="rfmSegmentOptions"
        placeholder="选择目标RFM分层（可多选，不选则不限）"
        style="width: 100%"
      />
    </Form.Item>

    <Form.Item label="消费金额">
      <Space>
        <span>最低消费</span>
        <InputNumber
          :value="rules.minMonetary"
          @update:value="
            (v) => updateRules('minMonetary', v as number | undefined)
          "
          :min="0"
          :step="100"
          placeholder="不限"
          style="width: 150px"
        />
        <span>元</span>
      </Space>
    </Form.Item>

    <Form.Item label="最近消费">
      <Space>
        <span>最近</span>
        <InputNumber
          :value="rules.maxRecencyDays"
          @update:value="
            (v) => updateRules('maxRecencyDays', v as number | undefined)
          "
          :min="1"
          :max="365"
          placeholder="不限"
          style="width: 150px"
        />
        <span>天内有消费</span>
      </Space>
    </Form.Item>

    <Form.Item label="人群上限">
      <Select
        :value="audienceLimit"
        @update:value="(v) => $emit('update:audienceLimit', v as number)"
        :options="audienceLimitOptions"
        style="width: 200px"
      />
      <div class="mt-1 text-sm text-gray-400">最多匹配10000人</div>
    </Form.Item>
  </div>
</template>
