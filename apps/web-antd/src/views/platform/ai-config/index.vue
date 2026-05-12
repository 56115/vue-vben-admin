<script lang="ts" setup>
import AiConfigPage from '../../_shared/ai-config/AiConfigPage.vue';

defineOptions({ name: 'PlatformAiConfigPage' });
</script>

<template>
  <AiConfigPage
    scope="platform"
    page-title="平台 AI 配置"
    page-description="管理平台级凭据 + 全局默认模型。租户未配置时将回落到这些设置。"
    default-models-title="平台默认模型"
    default-models-description="作为所有租户在未自配凭据时的全局兜底。仅平台管理员可修改。"
    save-success-message="平台默认模型已保存"
  />
</template>
