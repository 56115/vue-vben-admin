<script lang="ts" setup>
import AiConfigPage from '../../_shared/ai-config/AiConfigPage.vue';

defineOptions({ name: 'TenantAiConfigPage' });
</script>

<template>
  <AiConfigPage
    scope="tenant"
    default-models-title="默认模型"
    default-models-description="选择默认 LLM / Vision / Embedding，未在场景级覆盖的调用将使用这些默认值。"
    save-success-message="默认模型已保存"
  />
</template>
