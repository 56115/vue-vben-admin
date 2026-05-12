<template>
  <div>
    <a-alert type="info"
      message="Agent 工具开关"
      description="Phase 4 接入 Mastra agent tool registry,本 Phase 仅 stub。" />
    <a-list :data-source="placeholders">
      <template #renderItem="{ item }">
        <a-list-item>
          <a-switch :checked="item.enabled" disabled />
          <span style="margin-left: 8px">{{ item.name }}</span>
        </a-list-item>
      </template>
    </a-list>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const placeholders = ref([
  { name: 'mastra:web-search', enabled: false, description: '占位 — Phase 4 实装' },
  { name: 'mastra:code-runner', enabled: false, description: '占位 — Phase 4 实装' },
]);
</script>
