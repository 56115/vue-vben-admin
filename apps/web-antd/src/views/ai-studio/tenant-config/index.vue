<template>
  <Page>
    <a-tabs v-model:activeKey="tab">
      <a-tab-pane key="redaction" tab="Redaction 规则">
        <RedactionRuleEditor v-model:rule="rule" :registry="registry"
          @save="onSave" />
      </a-tab-pane>
      <a-tab-pane key="agents" tab="Agent 工具开关">
        <AgentToolToggleList />
      </a-tab-pane>
    </a-tabs>
  </Page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { message } from 'ant-design-vue';
import RedactionRuleEditor from './components/RedactionRuleEditor.vue';
import AgentToolToggleList from './components/AgentToolToggleList.vue';
import { tenantConfigApi, type TenantRedactionRule, type CoverageRegistryColumn }
  from './api';

const tab = ref<'redaction' | 'agents'>('redaction');
const rule = ref<TenantRedactionRule>({});
const registry = ref<CoverageRegistryColumn[]>([]);

onMounted(async () => {
  const cfg = await tenantConfigApi.getConfig();
  if (cfg.redaction) rule.value = cfg.redaction;
  const reg = await tenantConfigApi.getCoverageRegistry();
  registry.value = reg.columns;
});

async function onSave(updated: TenantRedactionRule) {
  try {
    await tenantConfigApi.updateRedactionRule(updated);
    message.success('Redaction 规则已保存');
    rule.value = updated;
  } catch (e: any) {
    if (e?.response?.data?.code === 'ILLEGAL_TENANT_RULE') {
      message.error(
        `规则违反平台约束:\n${e.response.data.violations.join('\n')}`,
        10,
      );
    } else {
      message.error('保存失败');
    }
  }
}
</script>
