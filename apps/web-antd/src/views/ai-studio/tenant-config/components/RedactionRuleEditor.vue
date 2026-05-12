<template>
  <div>
    <a-alert
      type="info" show-icon
      message="Redaction 规则编辑器(Phase 2F YAML stub;Phase 4 升级为富 UI)"
      description="租户规则只能 narrow 平台默认。violations 会在保存时返回。" />

    <Codemirror
      v-model:value="yaml"
      :options="{ mode: 'yaml', lineNumbers: true }"
      style="height: 400px; margin: 12px 0;" />

    <a-collapse :default-active-key="['registry']">
      <a-collapse-panel key="registry" header="平台 Coverage Registry(参考)">
        <a-table :dataSource="registry" :columns="registryColumns"
          rowKey="row=>row.table+'.'+row.column" size="small" :pagination="false" />
      </a-collapse-panel>
    </a-collapse>

    <div style="margin-top: 12px;">
      <a-space>
        <a-button type="primary" @click="emit('save', parsed)" :disabled="!parsed">
          保存
        </a-button>
      </a-space>
    </div>

    <a-alert v-if="parseError" type="error" style="margin-top: 12px;"
      :message="parseError" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Codemirror from 'vue-codemirror';
import * as YAML from 'yaml';
import type { TenantRedactionRule, CoverageRegistryColumn } from '../api';

const props = defineProps<{
  rule: TenantRedactionRule;
  registry: CoverageRegistryColumn[];
}>();
const emit = defineEmits<{
  (e: 'update:rule', v: TenantRedactionRule): void;
  (e: 'save', v: TenantRedactionRule): void;
}>();

const yaml = ref(YAML.stringify(props.rule || {}));
const parseError = ref('');
const parsed = computed<TenantRedactionRule | null>(() => {
  try {
    parseError.value = '';
    return YAML.parse(yaml.value) ?? {};
  } catch (e: any) {
    parseError.value = `YAML 解析错误:${e.message}`;
    return null;
  }
});

watch(parsed, (v) => { if (v) emit('update:rule', v); });

const registryColumns = [
  { title: 'Table', dataIndex: 'table' },
  { title: 'Column', dataIndex: 'column' },
  { title: 'Policy', dataIndex: 'policy' },
  { title: 'Description', dataIndex: 'description' },
];
</script>
