<script lang="tsx" setup>
import { computed, ref, watch } from 'vue';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'ant-design-vue';
import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue';
import type {
  CreateBindingParams,
  PipelinePromptBinding,
  BindingType,
} from '#/api/ai-studio/pipeline-prompt-binding';
import type { PromptTemplate } from '#/api/ai-studio/prompt-template';
import { getPromptTemplates } from '#/api/ai-studio/prompt-template';
import {
  createPromptBinding,
  updatePromptBinding,
} from '#/api/ai-studio/pipeline-prompt-binding';
import { usePromptParser } from '#/composables/usePromptParser';

import VariableMapper from './VariableMapper.vue';

const { Text, Paragraph } = Typography;
const FormItem = Form.Item;

interface Props {
  open: boolean;
  pipelineKey: string;
  stepKey: string;
  stepName: string;
  // 上游步骤可用变量
  stepOutputs?: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  // 已有的绑定列表（用于冲突检测）
  existingBindings?: PipelinePromptBinding[];
  editingBinding?: PipelinePromptBinding | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void;
  (e: 'success'): void;
  (e: 'cancel'): void;
}>();

// 加载状态
const loading = ref(false);
const templatesLoading = ref(false);
const saving = ref(false);

// 提示词模板列表
const templates = ref<PromptTemplate[]>([]);
const searchKeyword = ref('');

// 表单数据
const formState = ref<CreateBindingParams>({
  promptTemplateId: 0,
  bindingType: 'PRIMARY',
  priority: 0,
  variableMappings: {},
  condition: undefined,
});

// 选中的模板（必须先定义，才能在 usePromptParser 中使用）
const selectedTemplate = computed(() => {
  return templates.value.find(
    (t) => t.id === formState.value.promptTemplateId?.toString(),
  );
});

// 使用 PromptEngine 解析模板变量
const { variables: extractedVars } = usePromptParser(
  computed(() => selectedTemplate.value?.activeVersion?.userPromptTpl || ''),
);

// 模板变量（合并定义的变量和提取的变量）
const templateVariables = computed(() => {
  const definedVars = selectedTemplate.value?.activeVersion?.variables || [];
  const extracted = extractedVars.value;

  // 使用 Map 去重，优先使用定义的变量
  const varMap = new Map();
  for (const v of extracted) {
    varMap.set(v.name, {
      name: v.name,
      type: v.type,
      required: v.required,
      description: v.description,
    });
  }
  // 定义的变量覆盖提取的
  for (const v of definedVars) {
    varMap.set(v.name, {
      name: v.name,
      type: v.type,
      required: v.required,
      description: v.description,
    });
  }

  return Array.from(varMap.values());
});

// 绑定类型选项
const bindingTypeOptions = [
  { value: 'PRIMARY', label: '主要提示词', color: 'blue' },
  { value: 'FALLBACK', label: '备用提示词', color: 'orange' },
  { value: 'SHADOW', label: '影子测试', color: 'purple' },
];

// 过滤后的模板列表
const filteredTemplates = computed(() => {
  let result = templates.value;
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(keyword) ||
        t.key.toLowerCase().includes(keyword) ||
        t.category?.toLowerCase().includes(keyword),
    );
  }
  return result;
});

// 冲突警告
const bindingConflicts = computed(() => {
  const conflicts: string[] = [];
  if (!props.existingBindings || props.editingBinding) return conflicts;

  const sameType = props.existingBindings.filter(
    (b) =>
      b.bindingType === formState.value.bindingType &&
      b.isActive &&
      b.id !== props.editingBinding?.id,
  );

  if (sameType.length > 0 && formState.value.bindingType !== 'SHADOW') {
    conflicts.push(
      `${formState.value.bindingType} 类型已有激活的绑定，建议先禁用旧绑定`,
    );
  }

  return conflicts;
});

// 监听 open 变化
watch(
  () => props.open,
  (newVisible) => {
    if (newVisible) {
      loadTemplates();
      if (props.editingBinding) {
        // 编辑模式，填充表单
        formState.value = {
          promptTemplateId: Number(props.editingBinding.promptTemplateId),
          bindingType: props.editingBinding.bindingType,
          priority: props.editingBinding.priority,
          variableMappings: props.editingBinding.variableMappings || {},
          condition: props.editingBinding.condition || undefined,
        };
      } else {
        // 新建模式，重置表单
        formState.value = {
          promptTemplateId: 0,
          bindingType: 'PRIMARY',
          priority: 0,
          variableMappings: {},
          condition: undefined,
        };
      }
    }
  },
);

// 加载提示词模板列表
const loadTemplates = async () => {
  templatesLoading.value = true;
  try {
    const response = await getPromptTemplates({
      pageSize: 100,
    });
    templates.value = response.items;
  } catch (error) {
    message.error('加载提示词模板失败');
    console.error(error);
  } finally {
    templatesLoading.value = false;
  }
};

// 处理模板选择
const handleTemplateSelect = (templateId: number) => {
  formState.value.promptTemplateId = templateId;
};

// 保存绑定
const handleSave = async () => {
  if (!formState.value.promptTemplateId) {
    message.error('请选择提示词模板');
    return;
  }

  // 检查必需变量是否已映射
  const requiredVars = templateVariables.value.filter((v) => v.required);
  const unmappedRequired = requiredVars.filter(
    (v) => !formState.value.variableMappings?.[v.name],
  );

  if (unmappedRequired.length > 0) {
    Modal.confirm({
      title: '警告',
      icon: <ExclamationCircleOutlined />,
      content: `有 ${unmappedRequired.length} 个必需变量未映射，确定要保存吗？`,
      onOk: doSave,
    });
    return;
  }

  await doSave();
};

// 执行保存
const doSave = async () => {
  saving.value = true;
  try {
    if (props.editingBinding) {
      // 更新模式
      await updatePromptBinding(
        props.pipelineKey,
        props.stepKey,
        props.editingBinding.id,
        {
          bindingType: formState.value.bindingType as BindingType,
          priority: formState.value.priority,
          variableMappings: formState.value.variableMappings,
          condition: formState.value.condition,
        },
      );
      message.success('更新绑定成功');
    } else {
      // 创建模式
      await createPromptBinding(
        props.pipelineKey,
        props.stepKey,
        formState.value,
      );
      message.success('创建绑定成功');
    }
    emit('success');
    emit('update:open', false);
  } catch (error: any) {
    message.error(error?.response?.data?.message || '保存失败');
    console.error(error);
  } finally {
    saving.value = false;
  }
};

// 取消
const handleCancel = () => {
  emit('update:open', false);
  emit('cancel');
};

// 生成源变量列表
const sourceVariables = computed(() => {
  return (props.stepOutputs || []).map((output) => ({
    name: output.name,
    type: output.type,
    description: output.description,
    sourceStep: props.stepName,
  }));
});
</script>

<template>
  <Modal
    :open="open"
    :title="editingBinding ? '编辑提示词绑定' : '添加提示词绑定'"
    :width="900"
    :confirm-loading="saving"
    @ok="handleSave"
    @cancel="handleCancel"
    ok-text="保存"
    cancel-text="取消"
  >
    <Spin :spinning="loading">
      <div class="binding-modal-content">
        <!-- 冲突警告 -->
        <Alert
          v-if="bindingConflicts.length > 0"
          type="warning"
          :message="bindingConflicts[0]"
          class="mb-4"
          show-icon
        />

        <!-- 步骤信息 -->
        <div class="step-info">
          <Text type="secondary">步骤：</Text>
          <Tag color="blue">{{ stepName }}</Tag>
          <Tag>{{ stepKey }}</Tag>
        </div>

        <Row :gutter="24">
          <!-- 左侧：模板选择 -->
          <Col :span="12">
            <Card
              size="small"
              title="选择提示词模板"
              :body-style="{ padding: '12px' }"
            >
              <!-- 搜索 -->
              <Input.Search
                v-model:value="searchKeyword"
                placeholder="搜索模板名称或标识"
                class="mb-3"
                allow-clear
              />

              <!-- 模板列表 -->
              <Spin :spinning="templatesLoading">
                <div v-if="filteredTemplates.length" class="template-list">
                  <Card
                    v-for="template in filteredTemplates"
                    :key="template.id"
                    :class="[
                      'template-card',
                      {
                        selected:
                          formState.promptTemplateId === Number(template.id),
                      },
                    ]"
                    size="small"
                    @click="handleTemplateSelect(Number(template.id))"
                  >
                    <div class="template-card-content">
                      <div class="template-header">
                        <Text strong>{{ template.name }}</Text>
                        <Tag
                          v-if="template.type === 'SYSTEM'"
                          color="blue"
                          size="small"
                        >
                          系统
                        </Tag>
                      </div>
                      <Text type="secondary" class="template-key">
                        {{ template.key }}
                      </Text>
                      <div class="template-meta">
                        <Tag v-if="template.category" size="small">
                          {{ template.category }}
                        </Tag>
                        <Text type="secondary" style="font-size: 12px">
                          {{ template.activeVersion?.variables?.length || 0 }}
                          变量
                        </Text>
                      </div>
                    </div>
                  </Card>
                </div>
                <Empty v-else description="暂无提示词模板" />
              </Spin>
            </Card>

            <!-- 选中模板预览 -->
            <Card
              v-if="selectedTemplate"
              size="small"
              title="模板预览"
              class="mt-3"
              :body-style="{ maxHeight: '200px', overflow: 'auto' }"
            >
              <Paragraph
                :ellipsis="{ rows: 5, expandable: true }"
                type="secondary"
                style="font-size: 12px"
                :content="selectedTemplate.activeVersion?.userPromptTpl || ''"
              />
            </Card>
          </Col>

          <!-- 右侧：绑定配置 -->
          <Col :span="12">
            <Card
              size="small"
              title="绑定配置"
              :body-style="{ padding: '12px' }"
            >
              <Form layout="vertical">
                <!-- 绑定类型 -->
                <FormItem label="绑定类型" required>
                  <Select v-model:value="formState.bindingType">
                    <Select.Option
                      v-for="opt in bindingTypeOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      <Tag :color="opt.color">{{ opt.label }}</Tag>
                    </Select.Option>
                  </Select>
                </FormItem>

                <!-- 优先级 -->
                <FormItem label="优先级">
                  <InputNumber
                    v-model:value="formState.priority"
                    :min="0"
                    :max="100"
                    style="width: 100%"
                  />
                </FormItem>

                <!-- 使用条件 -->
                <FormItem label="使用条件（可选）">
                  <Input.TextArea
                    v-model:value="formState.condition"
                    :rows="2"
                    placeholder="输入条件表达式，如: $.inputs.priority > 5"
                  />
                </FormItem>
              </Form>
            </Card>

            <!-- 变量映射 -->
            <Card
              v-if="selectedTemplate"
              size="small"
              title="变量映射"
              class="mt-3"
              :body-style="{
                maxHeight: '300px',
                overflow: 'auto',
                padding: '12px',
              }"
            >
              <VariableMapper
                v-model="formState.variableMappings"
                :source-variables="sourceVariables"
                :target-variables="templateVariables"
                show-type-check
              />
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  </Modal>
</template>

<style scoped>
.binding-modal-content {
  max-height: 700px;
  overflow-y: auto;
}

.step-info {
  padding: 12px;
  margin-bottom: 20px;
  background: #f5f5f5;
  border-radius: 6px;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.template-card {
  cursor: pointer;
  transition: all 0.3s;
}

.template-card:hover {
  border-color: #1890ff;
}

.template-card.selected {
  background: #e6f7ff;
  border-color: #1890ff;
}

.template-card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.template-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.template-key {
  font-size: 12px;
}

.template-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
