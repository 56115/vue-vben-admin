<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { message } from 'ant-design-vue';

import type {
  AiCredentialDto,
  CredentialScope,
  CredentialTestStatus,
} from './credentials.api';

import { deleteCredential, listCredentials } from './credentials.api';
import TestConnectionButton from './TestConnectionButton.vue';

defineOptions({ name: 'CredentialList' });

const props = defineProps<{
  scope: CredentialScope;
}>();

const emit = defineEmits<{
  add: [];
  edit: [id: number];
}>();

const credentials = ref<AiCredentialDto[]>([]);
const loading = ref(false);
const pendingDeleteId = ref<null | number>(null);
const occupied = ref<null | { id: number; scenarios: string[] }>(null);

defineExpose({ refresh });

async function refresh() {
  loading.value = true;
  try {
    credentials.value = await listCredentials(props.scope);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    message.error(`加载凭据失败：${reason}`);
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);

function statusColor(s?: CredentialTestStatus | null): string {
  if (s === 'OK') return 'green';
  if (s === 'AUTH_FAILED') return 'red';
  if (!s) return 'gray';
  return 'orange';
}

function updateCredentialStatus(id: number, status: CredentialTestStatus) {
  const credential = credentials.value.find((item) => item.id === id);
  if (credential) credential.lastTestStatus = status;
}

function askDelete(id: number) {
  pendingDeleteId.value = id;
}

function cancelDelete() {
  pendingDeleteId.value = null;
}

async function confirmDelete(id: number) {
  pendingDeleteId.value = null;
  try {
    await deleteCredential(props.scope, id);
    message.success('凭据已删除');
    await refresh();
  } catch (error) {
    const err = error as {
      response?: { data?: { occupied?: string[] }; status?: number };
    };
    if (err?.response?.status === 409 && err.response.data?.occupied) {
      occupied.value = { id, scenarios: err.response.data.occupied };
      return;
    }
    const reason = error instanceof Error ? error.message : String(error);
    message.error(`删除失败：${reason}`);
  }
}

function dismissOccupied() {
  occupied.value = null;
}
</script>

<template>
  <div class="credential-list">
    <div class="list-header">
      <h3 class="list-title">AI 凭据</h3>
      <button
        type="button"
        data-testid="cred-list-add"
        class="btn-add"
        @click="emit('add')"
      >
        新增凭据
      </button>
    </div>

    <div v-if="loading" class="empty-hint">加载中…</div>
    <div
      v-else-if="credentials.length === 0"
      class="empty-hint"
      data-testid="cred-list-empty"
    >
      还没有配置任何凭据
    </div>

    <div class="card-grid">
      <div
        v-for="c in credentials"
        :key="c.id"
        class="cred-card"
        data-testid="credential-card"
      >
        <div class="card-header">
          <span class="provider-tag" :data-provider="c.provider">{{
            c.provider
          }}</span>
          <span class="display-name">{{ c.displayName }}</span>
          <span
            class="status-badge"
            :data-color="statusColor(c.lastTestStatus)"
            data-testid="cred-status-badge"
          >
            {{ c.lastTestStatus ?? '未测试' }}
          </span>
        </div>
        <div class="card-meta">
          <div>
            <span class="meta-label">Base URL：</span>
            <span class="meta-value">{{ c.baseUrl }}</span>
          </div>
          <div>
            <span class="meta-label">API Key：</span>
            <span class="meta-value">{{ c.apiKeyHint }}</span>
          </div>
          <div>
            <span class="meta-label">已启用模型：</span>
            <span class="meta-value">{{ c.enabledModels.length }}</span>
          </div>
        </div>
        <div class="card-actions">
          <TestConnectionButton
            :credential-id="c.id"
            :scope="scope"
            @update:status="updateCredentialStatus(c.id, $event)"
          />
          <button
            type="button"
            :data-testid="`cred-edit-${c.id}`"
            class="btn-action"
            @click="emit('edit', c.id)"
          >
            编辑
          </button>
          <button
            type="button"
            :data-testid="`cred-delete-${c.id}`"
            class="btn-action danger"
            @click="askDelete(c.id)"
          >
            删除
          </button>
        </div>

        <div
          v-if="pendingDeleteId === c.id"
          class="delete-confirm"
          :data-testid="`cred-delete-confirm-card-${c.id}`"
        >
          <span>确认删除这个凭据吗？</span>
          <button
            type="button"
            :data-testid="`cred-delete-confirm-${c.id}`"
            class="btn-action danger"
            @click="confirmDelete(c.id)"
          >
            确认
          </button>
          <button
            type="button"
            :data-testid="`cred-delete-cancel-${c.id}`"
            class="btn-action"
            @click="cancelDelete"
          >
            取消
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="occupied"
      class="occupied-dialog"
      data-testid="cred-occupied-dialog"
    >
      <div class="occupied-mask" @click="dismissOccupied" />
      <div class="occupied-body">
        <h4>无法删除：凭据正在被使用</h4>
        <p>以下场景仍引用此凭据，请先解除绑定：</p>
        <ul>
          <li v-for="s in occupied.scenarios" :key="s">{{ s }}</li>
        </ul>
        <button
          type="button"
          data-testid="cred-occupied-dismiss"
          @click="dismissOccupied"
        >
          知道了
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.credential-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.btn-add {
  padding: 4px 12px;
  color: #fff;
  cursor: pointer;
  background: var(--ant-color-primary, #1677ff);
  border: 1px solid var(--ant-color-primary, #1677ff);
  border-radius: 4px;
}

.empty-hint {
  padding: 16px;
  color: var(--ant-color-text-tertiary, #999);
  text-align: center;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.cred-card {
  padding: 12px;
  background: var(--ant-color-bg-container, #fff);
  border: 1px solid var(--ant-color-border, #d9d9d9);
  border-radius: 6px;
}

.card-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.provider-tag {
  padding: 1px 6px;
  font-size: 11px;
  background: var(--ant-color-bg-elevated, #f5f5f5);
  border-radius: 3px;
}

.display-name {
  flex: 1;
  font-weight: 600;
}

.status-badge {
  padding: 1px 6px;
  font-size: 11px;
  background: rgb(0 0 0 / 5%);
  border-radius: 3px;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 12px;
  font-size: 12px;
}

.meta-label {
  color: var(--ant-color-text-tertiary, #999);
}

.card-actions {
  display: flex;
  gap: 6px;
}

.btn-action {
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
  background: var(--ant-color-bg-container, #fff);
  border: 1px solid var(--ant-color-border, #d9d9d9);
  border-radius: 4px;
}

.btn-action.danger {
  color: var(--ant-color-error, #ff4d4f);
  border-color: var(--ant-color-error, #ff4d4f);
}

.delete-confirm {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 8px;
  margin-top: 8px;
  font-size: 12px;
  background: var(--ant-color-warning-bg, #fffbe6);
  border-radius: 4px;
}

.occupied-dialog {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.occupied-mask {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 40%);
}

.occupied-body {
  position: relative;
  max-width: 480px;
  padding: 20px;
  background: var(--ant-color-bg-container, #fff);
  border-radius: 6px;
}
</style>
