<template>
  <a-drawer
    :open="visible"
    width="900"
    title="审计日志详情"
    @update:open="(v) => emit('update:visible', v)"
  >
    <template v-if="row">
      <a-descriptions :column="2" bordered size="small">
        <a-descriptions-item label="ID">{{ row.id }}</a-descriptions-item>
        <a-descriptions-item label="Scope">{{ row.scope }}</a-descriptions-item>
        <a-descriptions-item label="Action" :span="2">{{ row.action }}</a-descriptions-item>
        <a-descriptions-item label="Resource">{{ row.resource }}</a-descriptions-item>
        <a-descriptions-item label="Actor">{{ row.actorUserId }}</a-descriptions-item>
        <a-descriptions-item label="IP">{{ row.ip ?? 'N/A' }}</a-descriptions-item>
        <a-descriptions-item label="UA">{{ row.userAgent ?? 'N/A' }}</a-descriptions-item>
      </a-descriptions>

      <a-divider>Before / After Diff</a-divider>
      <CodeDiff
        :old-string="JSON.stringify(row.before ?? {}, null, 2)"
        :new-string="JSON.stringify(row.after ?? {}, null, 2)"
        output-format="line-by-line"
        language="json"
      />
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import CodeDiff from 'v-code-diff';
import type { AuditLogRow } from '../api';

defineProps<{ visible: boolean; row: AuditLogRow | null }>();
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>();
</script>
