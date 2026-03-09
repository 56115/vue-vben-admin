<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import {
  Badge,
  Button,
  Card,
  Empty,
  Popconfirm,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
} from 'ant-design-vue';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import type { PipelineStep } from '#/api/ai-studio/pipeline';
import type { PipelinePromptBinding } from '#/api/ai-studio/pipeline-prompt-binding';
import {
  getStepPromptBindings,
  updatePromptBinding,
  deletePromptBinding,
} from '#/api/ai-studio/pipeline-prompt-binding';
import {
  getPromptTemplate,
  type PromptTemplate,
} from '#/api/ai-studio/prompt-template';
import PromptBindingModal from './PromptBindingModal.vue';

const { Text } = Typography;

interface Props {
  pipelineKey: string;
  steps: PipelineStep[];
}

const props = defineProps<Props>();

const loading = ref(false);
const selectedStepKey = ref<string>('');
const bindingsMap = ref<Map<string, PipelinePromptBinding[]>>(new Map());
const previewTemplate = ref<PromptTemplate | null>(null);
const previewLoading = ref(false);
const previewBindingId = ref<string>('');

// Modal state
const bindingModalOpen = ref(false);
const editingBinding = ref<PipelinePromptBinding | null>(null);

// Current step
const currentStep = computed(() =>
  props.steps.find((s) => s.stepKey === selectedStepKey.value),
);

// Current step bindings
const currentBindings = computed(
  () => bindingsMap.value.get(selectedStepKey.value) || [],
);

// Step type color mapping
function getStepTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    ocr: 'blue',
    transform: 'cyan',
    condition: 'orange',
    approval: 'purple',
    llm: 'green',
    'ai-completion': 'green',
    notification: 'gold',
  };
  return colorMap[type] || 'default';
}

// Binding type color
function getBindingTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    PRIMARY: 'blue',
    FALLBACK: 'orange',
    SHADOW: 'purple',
  };
  return colorMap[type] || 'default';
}

// Binding type label
function getBindingTypeLabel(type: string): string {
  const labelMap: Record<string, string> = {
    PRIMARY: '主要',
    FALLBACK: '备用',
    SHADOW: '影子',
  };
  return labelMap[type] || type;
}

// Load all step bindings
async function loadAllBindings() {
  loading.value = true;
  try {
    const map = new Map<string, PipelinePromptBinding[]>();
    await Promise.all(
      props.steps.map(async (step) => {
        try {
          const bindings = await getStepPromptBindings(
            props.pipelineKey,
            step.stepKey,
            false,
          );
          map.set(step.stepKey, bindings);
        } catch {
          map.set(step.stepKey, []);
        }
      }),
    );
    bindingsMap.value = map;
  } finally {
    loading.value = false;
  }
}

// Select step
function selectStep(stepKey: string) {
  selectedStepKey.value = stepKey;
  previewTemplate.value = null;
  previewBindingId.value = '';
}

// Preview a binding's template
async function previewBinding(binding: PipelinePromptBinding) {
  if (previewBindingId.value === binding.id) {
    previewTemplate.value = null;
    previewBindingId.value = '';
    return;
  }
  previewLoading.value = true;
  previewBindingId.value = binding.id;
  try {
    const template = await getPromptTemplate(binding.promptTemplateId);
    previewTemplate.value = template;
  } catch {
    message.error('加载模板详情失败');
    previewTemplate.value = null;
  } finally {
    previewLoading.value = false;
  }
}

// Toggle binding active state
async function toggleBindingActive(binding: PipelinePromptBinding) {
  try {
    await updatePromptBinding(
      props.pipelineKey,
      selectedStepKey.value,
      binding.id,
      { isActive: !binding.isActive },
    );
    message.success(binding.isActive ? '已禁用' : '已启用');
    await refreshCurrentStepBindings();
  } catch {
    message.error('操作失败');
  }
}

// Delete binding
async function handleDeleteBinding(bindingId: string) {
  try {
    await deletePromptBinding(
      props.pipelineKey,
      selectedStepKey.value,
      bindingId,
    );
    message.success('删除成功');
    if (previewBindingId.value === bindingId) {
      previewTemplate.value = null;
      previewBindingId.value = '';
    }
    await refreshCurrentStepBindings();
  } catch {
    message.error('删除失败');
  }
}

// Refresh current step bindings
async function refreshCurrentStepBindings() {
  if (!selectedStepKey.value) return;
  try {
    const bindings = await getStepPromptBindings(
      props.pipelineKey,
      selectedStepKey.value,
      false,
    );
    const map = new Map(bindingsMap.value);
    map.set(selectedStepKey.value, bindings);
    bindingsMap.value = map;
  } catch {
    // silent
  }
}

// Open add binding modal
function openAddBindingModal() {
  editingBinding.value = null;
  bindingModalOpen.value = true;
}

// Open edit binding modal
function openEditBindingModal(binding: PipelinePromptBinding) {
  editingBinding.value = binding;
  bindingModalOpen.value = true;
}

// Handle binding modal success
async function handleBindingSuccess() {
  bindingModalOpen.value = false;
  await refreshCurrentStepBindings();
}

// Get binding count for a step
function getBindingCount(stepKey: string): number {
  return bindingsMap.value.get(stepKey)?.length || 0;
}

// 监听 steps 变化（pipeline 异步加载完成后 steps 才有值）
watch(
  () => props.steps,
  (newSteps) => {
    if (newSteps.length > 0) {
      if (!selectedStepKey.value) {
        selectedStepKey.value = newSteps[0]!.stepKey;
      }
      loadAllBindings();
    }
  },
  { immediate: true },
);
</script>

<template>
  <Spin :spinning="loading">
    <div class="step-prompt-manager">
      <!-- Left panel: Step list -->
      <div class="step-list-panel">
        <div class="panel-title">流程步骤</div>
        <div class="step-list">
          <div
            v-for="step in steps"
            :key="step.stepKey"
            :class="['step-item', { active: selectedStepKey === step.stepKey }]"
            @click="selectStep(step.stepKey)"
          >
            <div class="step-item-main">
              <div class="step-name">{{ step.name }}</div>
              <div class="step-meta">
                <Tag :color="getStepTypeColor(step.type)" size="small">
                  {{ step.type }}
                </Tag>
                <Badge
                  v-if="getBindingCount(step.stepKey) > 0"
                  :count="getBindingCount(step.stepKey)"
                  :number-style="{
                    backgroundColor: '#1890ff',
                    fontSize: '11px',
                    height: '18px',
                    lineHeight: '18px',
                    minWidth: '18px',
                    padding: '0 4px',
                  }"
                />
              </div>
            </div>
          </div>
          <Empty
            v-if="steps.length === 0"
            description="无步骤"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </div>
      </div>

      <!-- Right panel: Binding config -->
      <div class="binding-panel">
        <template v-if="currentStep">
          <div class="panel-title">
            <span>{{ currentStep.name }} - 提示词绑定</span>
            <Button type="primary" size="small" @click="openAddBindingModal">
              <template #icon><PlusOutlined /></template>
              添加绑定
            </Button>
          </div>

          <!-- Binding list -->
          <div v-if="currentBindings.length > 0" class="binding-list">
            <Card
              v-for="binding in currentBindings"
              :key="binding.id"
              size="small"
              :class="[
                'binding-card',
                { previewing: previewBindingId === binding.id },
              ]"
            >
              <div class="binding-content">
                <div class="binding-info">
                  <div class="binding-header">
                    <Tag
                      :color="getBindingTypeColor(binding.bindingType)"
                      size="small"
                    >
                      {{ getBindingTypeLabel(binding.bindingType) }}
                    </Tag>
                    <Text strong>
                      {{
                        binding.promptTemplateName ||
                        binding.promptTemplateKey ||
                        `Template #${binding.promptTemplateId}`
                      }}
                    </Text>
                  </div>
                  <div class="binding-meta">
                    <Text type="secondary" style="font-size: 12px">
                      优先级: {{ binding.priority }}
                    </Text>
                  </div>
                </div>
                <div class="binding-actions">
                  <Switch
                    :checked="binding.isActive"
                    size="small"
                    @click.stop="toggleBindingActive(binding)"
                  />
                  <Button
                    type="text"
                    size="small"
                    @click="previewBinding(binding)"
                  >
                    {{ previewBindingId === binding.id ? '收起' : '预览' }}
                  </Button>
                  <Button
                    type="text"
                    size="small"
                    @click="openEditBindingModal(binding)"
                  >
                    <template #icon><EditOutlined /></template>
                  </Button>
                  <Popconfirm
                    title="确定删除此绑定？"
                    @confirm="handleDeleteBinding(binding.id)"
                  >
                    <Button type="text" size="small" danger>
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            </Card>

            <!-- Template preview -->
            <Card
              v-if="previewTemplate && previewBindingId"
              size="small"
              class="preview-card"
            >
              <Spin :spinning="previewLoading">
                <div class="preview-content">
                  <div
                    v-if="previewTemplate.activeVersion?.systemPrompt"
                    class="preview-section"
                  >
                    <div class="preview-label">System Prompt</div>
                    <pre class="preview-text">{{
                      previewTemplate.activeVersion.systemPrompt
                    }}</pre>
                  </div>
                  <div
                    v-if="previewTemplate.activeVersion?.userPromptTpl"
                    class="preview-section"
                  >
                    <div class="preview-label">User Prompt Template</div>
                    <pre class="preview-text">{{
                      previewTemplate.activeVersion.userPromptTpl
                    }}</pre>
                  </div>
                  <div
                    v-if="
                      previewTemplate.activeVersion?.variables &&
                      previewTemplate.activeVersion.variables.length > 0
                    "
                    class="preview-section"
                  >
                    <div class="preview-label">
                      变量 ({{
                        previewTemplate.activeVersion.variables.length
                      }})
                    </div>
                    <div class="var-list">
                      <Tag
                        v-for="v in previewTemplate.activeVersion.variables"
                        :key="v.name"
                        :color="v.required ? 'red' : 'default'"
                      >
                        {{ v.name }}: {{ v.type }}
                        {{ v.required ? ' *' : '' }}
                      </Tag>
                    </div>
                  </div>
                </div>
              </Spin>
            </Card>
          </div>

          <!-- Empty state -->
          <div v-else class="binding-empty">
            <Empty description="该步骤暂无提示词绑定">
              <Button type="primary" @click="openAddBindingModal">
                <template #icon><PlusOutlined /></template>
                添加绑定
              </Button>
            </Empty>
          </div>
        </template>

        <Empty
          v-else
          description="请选择一个步骤"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
      </div>
    </div>

    <!-- Binding Modal -->
    <PromptBindingModal
      v-model:open="bindingModalOpen"
      :pipeline-key="pipelineKey"
      :step-key="selectedStepKey"
      :step-name="currentStep?.name || ''"
      :existing-bindings="currentBindings"
      :editing-binding="editingBinding"
      @success="handleBindingSuccess"
    />
  </Spin>
</template>

<style scoped>
.step-prompt-manager {
  display: flex;
  gap: 16px;
  min-height: 500px;
}

.step-list-panel {
  flex: 0 0 260px;
  overflow-y: auto;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.binding-panel {
  flex: 1;
  min-width: 0;
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  background: white;
  border-bottom: 1px solid #f0f0f0;
  border-radius: 8px 8px 0 0;
}

.step-list {
  padding: 8px;
}

.step-item {
  padding: 10px 12px;
  margin-bottom: 4px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.step-item:hover {
  background: #e6f7ff;
}

.step-item.active {
  background: #e6f7ff;
  border-left: 3px solid #1890ff;
}

.step-item-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.step-name {
  font-size: 13px;
  font-weight: 500;
  color: #262626;
}

.step-meta {
  display: flex;
  gap: 6px;
  align-items: center;
}

.binding-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.binding-card {
  transition: all 0.2s;
}

.binding-card.previewing {
  border-color: #1890ff;
}

.binding-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.binding-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.binding-header {
  display: flex;
  gap: 8px;
  align-items: center;
}

.binding-meta {
  padding-left: 4px;
}

.binding-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.binding-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.preview-card {
  background: #f6fbff;
  border-color: #1890ff;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-label {
  font-size: 12px;
  font-weight: 600;
  color: #595959;
}

.preview-text {
  max-height: 200px;
  padding: 8px 12px;
  margin: 0;
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.var-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
