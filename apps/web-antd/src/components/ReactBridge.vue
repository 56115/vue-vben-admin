<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

// React 相关导入
// @ts-ignore - React 在 Vue 项目中使用，类型可能不完整
import { createRoot } from 'react-dom/client';
// @ts-ignore
import { createElement } from 'react';
import { VibeKanbanWebCompanion } from 'vibe-kanban-web-companion';

const containerRef = ref<HTMLDivElement | null>(null);
let root: any = null;

onMounted(() => {
  // 只在开发环境且容器存在时挂载 React 组件
  if (containerRef.value && import.meta.env.DEV) {
    try {
      // 创建 React 渲染根
      root = createRoot(containerRef.value);

      // 渲染 VibeKanbanWebCompanion 组件
      root.render(createElement(VibeKanbanWebCompanion));

      // ReactBridge mounted successfully
    } catch (error) {
      console.warn('[ReactBridge] Failed to mount React component:', error);
    }
  }
});

onUnmounted(() => {
  // 清理 React 组件
  if (root) {
    try {
      root.unmount();
      root = null;
      // ReactBridge unmounted
    } catch (error) {
      console.warn('[ReactBridge] Failed to unmount React component:', error);
    }
  }
});
</script>

<template>
  <!-- React 组件的挂载点 -->
  <div ref="containerRef" class="react-bridge-container"></div>
</template>

<style scoped>
.react-bridge-container {
  /* VibeKanban 是一个开发工具，通常使用固定定位 */
  /* 不影响页面布局 */
  position: fixed;
  z-index: 9999;
  pointer-events: none;
}

.react-bridge-container > * {
  /* 恢复 React 组件内部的交互 */
  pointer-events: auto;
}
</style>
