<script setup lang="ts">
import { Card, Steps, Step } from 'ant-design-vue';
import {
  EditOutlined,
  TeamOutlined,
  EyeOutlined,
  FileTextOutlined,
  RocketOutlined,
} from '@ant-design/icons-vue';

defineOptions({ name: 'GuideCard' });
</script>

<template>
  <Card class="mb-4" :bordered="false">
    <template #title>
      <div class="flex items-center gap-2">
        <span class="text-lg">💡</span>
        <span>使用指南</span>
      </div>
    </template>

    <Steps direction="horizontal" :current="-1" size="small">
      <Step title="描述目标">
        <template #icon>
          <EditOutlined />
        </template>
        <template #description>
          用自然语言描述营销目标
        </template>
      </Step>
      <Step title="设置规则">
        <template #icon>
          <TeamOutlined />
        </template>
        <template #description>
          可选：设置目标人群规则
        </template>
      </Step>
      <Step title="预览匹配">
        <template #icon>
          <EyeOutlined />
        </template>
        <template #description>
          AI 匹配人群和分群
        </template>
      </Step>
      <Step title="生成文案">
        <template #icon>
          <FileTextOutlined />
        </template>
        <template #description>
          自动生成个性化文案
        </template>
      </Step>
      <Step title="创建活动">
        <template #icon>
          <RocketOutlined />
        </template>
        <template #description>
          一键创建营销活动
        </template>
      </Step>
    </Steps>
  </Card>
</template>

<style scoped>
:deep(.ant-steps-item-description) {
  font-size: 12px;
  color: #666;
}
</style>
