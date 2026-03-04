<script setup lang="ts">
import { Form, Input } from 'ant-design-vue';

interface FormState {
  name: string;
  description: string;
  offer: string;
}

interface Props {
  formState: FormState;
}

interface Emits {
  (e: 'update:formState', value: FormState): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
  emit('update:formState', { ...props.formState, [field]: value });
}

defineOptions({ name: 'CampaignForm' });
</script>

<template>
  <div class="space-y-4">
    <Form.Item
      label="活动名称"
      required
      :rules="[{ required: true, message: '请输入活动名称' }]"
    >
      <Input
        :value="formState.name"
        @update:value="(v) => updateField('name', v as string)"
        placeholder="例如：新品推广活动"
        :maxlength="50"
        show-count
      />
    </Form.Item>

    <Form.Item
      label="活动描述"
      required
      :rules="[{ required: true, message: '请输入活动描述' }]"
    >
      <Input.TextArea
        :value="formState.description"
        @update:value="(v) => updateField('description', v as string)"
        placeholder="用自然语言描述您的营销目标和目标客户特征，例如：向高价值客户推广我们的新品，客户特征是最近3个月有消费记录且消费金额超过1000元"
        :rows="4"
        :maxlength="500"
        show-count
      />
    </Form.Item>

    <Form.Item label="优惠内容">
      <Input
        :value="formState.offer"
        @update:value="(v) => updateField('offer', v as string)"
        placeholder="例如：全场8折优惠、满200减50等"
        :maxlength="100"
        show-count
      />
    </Form.Item>
  </div>
</template>
