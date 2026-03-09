<script lang="tsx" setup>
import { computed, ref, watch } from 'vue';

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ColumnHeightOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Modal,
  Row,
  Space,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  message,
} from 'ant-design-vue';

import {
  comparePromptVersions,
  getPromptTemplateVersions,
  rollbackPromptTemplate,
  type PromptTemplate,
  type PromptTemplateVersion,
} from '#/api/ai-studio/prompt-template';

interface Props {
  visible: boolean;
  template: PromptTemplate | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:visible': [value: boolean];
  success: [];
}>();

// ==================== 状态 ====================

const loading = ref(false);
const versions = ref<PromptTemplateVersion[]>([]);
const selectedVersions = ref<string[]>([]);

// 对比模式
const diffMode = ref<'split' | 'unified'>('split');
const showDiffPanel = ref(false);

// 对比结果
const diffResult = ref<{
  left: PromptTemplateVersion | null;
  right: PromptTemplateVersion | null;
  additions: number;
  deletions: number;
  diff: Array<{
    type: 'add' | 'delete' | 'equal';
    leftLine?: number;
    rightLine?: number;
    content: string;
  }>;
} | null>(null);

// ==================== 计算属性 ====================

const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

const hasSelectedTwoVersions = computed(
  () => selectedVersions.value.length === 2,
);

// 获取选中的版本信息
const selectedVersionInfo = computed(() => {
  if (selectedVersions.value.length !== 2) return null;
  const v1 = versions.value.find((v) => v.id === selectedVersions.value[0]);
  const v2 = versions.value.find((v) => v.id === selectedVersions.value[1]);
  return { v1, v2 };
});

// ==================== 方法 ====================

/**
 * 加载版本历史
 */
const loadVersions = async () => {
  if (!props.template) return;

  loading.value = true;
  try {
    const res = await getPromptTemplateVersions(props.template.id, {
      limit: 50,
    });
    versions.value = res.data;
  } finally {
    loading.value = false;
  }
};

/**
 * 关闭弹窗
 */
const handleClose = () => {
  modalVisible.value = false;
  selectedVersions.value = [];
  diffResult.value = null;
  showDiffPanel.value = false;
};

/**
 * 选择版本进行比对
 */
const toggleVersionSelection = (versionId: string) => {
  const index = selectedVersions.value.indexOf(versionId);
  if (index > -1) {
    selectedVersions.value.splice(index, 1);
  } else if (selectedVersions.value.length < 2) {
    selectedVersions.value.push(versionId);
  } else {
    // 替换最早选择的
    selectedVersions.value.shift();
    selectedVersions.value.push(versionId);
  }
};

/**
 * 计算文本差异
 */
const computeDiff = (oldText: string, newText: string) => {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diff: Array<{
    type: 'add' | 'delete' | 'equal';
    leftLine?: number;
    rightLine?: number;
    content: string;
  }> = [];

  let oldIndex = 0;
  let newIndex = 0;

  // 简单的行级 diff 算法
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    const oldLine = oldLines[oldIndex];
    const newLine = newLines[newIndex];

    if (oldIndex >= oldLines.length) {
      // 新增行
      diff.push({
        type: 'add',
        rightLine: newIndex + 1,
        content: newLine,
      });
      newIndex++;
    } else if (newIndex >= newLines.length) {
      // 删除行
      diff.push({
        type: 'delete',
        leftLine: oldIndex + 1,
        content: oldLine,
      });
      oldIndex++;
    } else if (oldLine === newLine) {
      // 相同行
      diff.push({
        type: 'equal',
        leftLine: oldIndex + 1,
        rightLine: newIndex + 1,
        content: oldLine,
      });
      oldIndex++;
      newIndex++;
    } else {
      // 检查是否是修改行（简单启发式：比较相似度）
      const nextOldMatch = newLines.indexOf(oldLine, newIndex);
      const nextNewMatch = oldLines.indexOf(newLine, oldIndex);

      if (
        nextOldMatch === -1 ||
        (nextNewMatch !== -1 && nextNewMatch < nextOldMatch)
      ) {
        // 当前 newLine 是被添加的
        diff.push({
          type: 'add',
          rightLine: newIndex + 1,
          content: newLine,
        });
        newIndex++;
      } else {
        // 当前 oldLine 是被删除的
        diff.push({
          type: 'delete',
          leftLine: oldIndex + 1,
          content: oldLine,
        });
        oldIndex++;
      }
    }
  }

  return diff;
};

/**
 * 对比版本
 */
const handleCompare = async () => {
  if (!hasSelectedTwoVersions.value || !props.template) return;

  const v1 = versions.value.find((v) => v.id === selectedVersions.value[0]);
  const v2 = versions.value.find((v) => v.id === selectedVersions.value[1]);

  if (!v1 || !v2) return;

  // 确保 v1 是较早版本
  const [left, right] = v1.version < v2.version ? [v1, v2] : [v2, v1];

  try {
    const diff = computeDiff(left.templateContent, right.templateContent);
    const additions = diff.filter((d) => d.type === 'add').length;
    const deletions = diff.filter((d) => d.type === 'delete').length;

    diffResult.value = {
      left,
      right,
      additions,
      deletions,
      diff,
    };
    showDiffPanel.value = true;
  } catch {
    message.error('对比失败');
  }
};

/**
 * 关闭对比面板
 */
const closeDiffPanel = () => {
  showDiffPanel.value = false;
  diffResult.value = null;
};

/**
 * 回滚到指定版本
 */
const handleRollback = async (version: PromptTemplateVersion) => {
  if (!props.template) return;

  Modal.confirm({
    title: '确认回滚',
    icon: <ExclamationCircleOutlined />,
    content: (
      <div>
        <p>确定要回滚到版本 {`v${version.version}`} 吗？</p>
        <Alert type="warning" class="mt-2">
          回滚后将创建新版本，当前内容会被保存到历史版本中
        </Alert>
      </div>
    ),
    onOk: async () => {
      try {
        await rollbackPromptTemplate(props.template!.id, version.id);
        message.success('回滚成功');
        emit('success');
        loadVersions();
      } catch {
        message.error('回滚失败');
      }
    },
  });
};

/**
 * 格式化日期
 */
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 获取变更类型标签
 */
const getChangeTypeTag = (changeLog: string | null) => {
  if (!changeLog) return null;
  if (changeLog.includes('创建')) {
    return <Tag color="green">创建</Tag>;
  }
  if (changeLog.includes('修改') || changeLog.includes('更新')) {
    return <Tag color="blue">更新</Tag>;
  }
  if (changeLog.includes('回滚')) {
    return <Tag color="orange">回滚</Tag>;
  }
  return <Tag>修改</Tag>;
};

// ==================== 生命周期 ====================

watch(
  () => props.visible,
  (val) => {
    if (val && props.template) {
      loadVersions();
    }
  },
);
</script>

<template>
  <Modal
    v-model:open="modalVisible"
    :title="`版本管理 - ${template?.name || ''}`"
    :width="showDiffPanel ? 1200 : 900"
    :footer="null"
    @cancel="handleClose"
  >
    <div class="version-manager">
      <!-- 左侧：版本列表 -->
      <div class="versions-panel" :class="{ narrow: showDiffPanel }">
        <!-- 操作栏 -->
        <div class="mb-4">
          <Alert
            v-if="selectedVersions.length > 0"
            type="info"
            :message="`已选择 ${selectedVersions.length}/2 个版本进行比对`"
            show-icon
          >
            <template #action>
              <Button
                type="primary"
                size="small"
                :disabled="!hasSelectedTwoVersions"
                @click="handleCompare"
              >
                对比选中版本
              </Button>
              <Button size="small" class="ml-2" @click="selectedVersions = []">
                清除选择
              </Button>
            </template>
          </Alert>
        </div>

        <!-- 版本列表 -->
        <div v-if="loading" class="py-8 text-center">
          <ReloadOutlined spin class="text-2xl" />
        </div>

        <Empty v-else-if="versions.length === 0" description="暂无版本历史" />

        <Timeline v-else mode="left">
          <Timeline.Item
            v-for="version in versions"
            :key="version.id"
            :color="
              version.version === template?.latestVersion ? 'green' : 'gray'
            "
          >
            <template #dot>
              <div
                class="version-dot"
                :class="{
                  selected: selectedVersions.includes(version.id),
                  current: version.version === template?.latestVersion,
                }"
                @click="toggleVersionSelection(version.id)"
              >
                <CheckCircleOutlined
                  v-if="selectedVersions.includes(version.id)"
                />
                <ClockCircleOutlined v-else />
              </div>
            </template>

            <Card
              size="small"
              :class="{
                'version-card': true,
                'version-current': version.version === template?.latestVersion,
                'version-selected': selectedVersions.includes(version.id),
              }"
            >
              <Descriptions :column="2" size="small">
                <Descriptions.Item label="版本号">
                  <Space>
                    <Typography.Text strong
                      >v{{ version.version }}</Typography.Text
                    >
                    <Tag
                      v-if="version.version === template?.latestVersion"
                      color="green"
                    >
                      当前
                    </Tag>
                    {{ getChangeTypeTag(version.changeLog) }}
                  </Space>
                </Descriptions.Item>

                <Descriptions.Item label="创建时间">
                  <Tooltip :title="formatDate(version.createdAt)">
                    {{ formatDate(version.createdAt) }}
                  </Tooltip>
                </Descriptions.Item>

                <Descriptions.Item label="创建者" :span="2">
                  <Avatar size="small" class="mr-2">
                    {{ version.createdBy.charAt(0).toUpperCase() }}
                  </Avatar>
                  {{ version.createdBy }}
                </Descriptions.Item>

                <Descriptions.Item
                  v-if="version.changeLog"
                  label="变更说明"
                  :span="2"
                >
                  <Typography.Text type="secondary">
                    {{ version.changeLog }}
                  </Typography.Text>
                </Descriptions.Item>
              </Descriptions>

              <template #actions>
                <Button
                  type="link"
                  size="small"
                  :disabled="version.version === template?.latestVersion"
                  @click="handleRollback(version)"
                >
                  <ReloadOutlined />
                  回滚到此版本
                </Button>
              </template>
            </Card>
          </Timeline.Item>
        </Timeline>

        <!-- 提示信息 -->
        <Alert
          class="mt-4"
          type="info"
          message="使用提示"
          description="点击版本左侧的圆圈选择要对比的版本（最多选择2个），然后点击'对比选中版本'查看差异。点击'回滚'可将当前提示词恢复到历史版本。"
          show-icon
        />
      </div>

      <!-- 右侧：对比面板 -->
      <div v-if="showDiffPanel && diffResult" class="diff-panel">
        <div class="diff-header">
          <Space>
            <Typography.Text strong>版本对比</Typography.Text>
            <Tag color="green">+{{ diffResult.additions }} 行</Tag>
            <Tag color="red">-{{ diffResult.deletions }} 行</Tag>
          </Space>
          <Space>
            <Button
              size="small"
              :type="diffMode === 'split' ? 'primary' : 'default'"
              @click="diffMode = 'split'"
            >
              <ColumnHeightOutlined />
              分栏
            </Button>
            <Button
              size="small"
              :type="diffMode === 'unified' ? 'primary' : 'default'"
              @click="diffMode = 'unified'"
            >
              统一
            </Button>
            <Button type="text" size="small" @click="closeDiffPanel">
              关闭
            </Button>
          </Space>
        </div>

        <!-- 分栏对比模式 -->
        <div v-if="diffMode === 'split'" class="diff-split">
          <div class="diff-column">
            <div class="diff-column-header">
              <Typography.Text strong>
                v{{ diffResult.left?.version }}
              </Typography.Text>
              <Typography.Text type="secondary" class="ml-2">
                {{ formatDate(diffResult.left?.createdAt || '') }}
              </Typography.Text>
            </div>
            <div class="diff-content">
              <div
                v-for="(line, idx) in diffResult.diff"
                :key="`left-${idx}`"
                class="diff-line"
                :class="{
                  'line-add': line.type === 'add',
                  'line-delete': line.type === 'delete',
                  'line-equal': line.type === 'equal',
                  'line-empty': line.type === 'add',
                }"
              >
                <span class="line-number">{{ line.leftLine || '' }}</span>
                <span class="line-marker">
                  {{
                    line.type === 'delete'
                      ? '-'
                      : line.type === 'equal'
                        ? ' '
                        : ''
                  }}
                </span>
                <span class="line-content">{{
                  line.type === 'add' ? '' : line.content
                }}</span>
              </div>
            </div>
          </div>

          <div class="diff-column">
            <div class="diff-column-header">
              <Typography.Text strong>
                v{{ diffResult.right?.version }}
              </Typography.Text>
              <Typography.Text type="secondary" class="ml-2">
                {{ formatDate(diffResult.right?.createdAt || '') }}
              </Typography.Text>
            </div>
            <div class="diff-content">
              <div
                v-for="(line, idx) in diffResult.diff"
                :key="`right-${idx}`"
                class="diff-line"
                :class="{
                  'line-add': line.type === 'add',
                  'line-delete': line.type === 'delete',
                  'line-equal': line.type === 'equal',
                  'line-empty': line.type === 'delete',
                }"
              >
                <span class="line-number">{{ line.rightLine || '' }}</span>
                <span class="line-marker">
                  {{
                    line.type === 'add' ? '+' : line.type === 'equal' ? ' ' : ''
                  }}
                </span>
                <span class="line-content">{{
                  line.type === 'delete' ? '' : line.content
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 统一对比模式 -->
        <div v-else class="diff-unified">
          <div class="diff-content">
            <div
              v-for="(line, idx) in diffResult.diff"
              :key="idx"
              class="diff-line"
              :class="{
                'line-add': line.type === 'add',
                'line-delete': line.type === 'delete',
                'line-equal': line.type === 'equal',
              }"
            >
              <span class="line-number">
                {{ line.leftLine || line.rightLine || '' }}
              </span>
              <span class="line-marker">
                {{
                  line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '
                }}
              </span>
              <span class="line-content">{{ line.content }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style lang="less" scoped>
.version-manager {
  display: flex;
  gap: 16px;

  .versions-panel {
    flex: 1;
    max-height: 600px;
    overflow-y: auto;

    &.narrow {
      width: 40%;
      flex: none;
    }
  }

  .diff-panel {
    width: 60%;
    border-left: 1px solid #f0f0f0;
    padding-left: 16px;
    display: flex;
    flex-direction: column;
  }
}

.version-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #e6f7ff;
    border-color: #1890ff;
  }

  &.selected {
    background: #1890ff;
    color: white;
  }

  &.current {
    border: 2px solid #52c41a;
  }
}

.version-card {
  transition: all 0.3s;

  &.version-current {
    border-color: #52c41a;
    background: #f6ffed;
  }

  &.version-selected {
    border-color: #1890ff;
  }
}

.diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 12px;
}

.diff-split {
  display: flex;
  gap: 8px;
  flex: 1;
  overflow: hidden;

  .diff-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    overflow: hidden;
  }

  .diff-column-header {
    padding: 8px 12px;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;
  }
}

.diff-unified {
  flex: 1;
  overflow: hidden;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.diff-content {
  flex: 1;
  overflow: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  background: #f6f8fa;
}

.diff-line {
  display: flex;
  white-space: pre;

  .line-number {
    width: 40px;
    padding: 0 8px;
    text-align: right;
    color: #6e7781;
    background: #f6f8fa;
    border-right: 1px solid #d0d7de;
    user-select: none;
  }

  .line-marker {
    width: 20px;
    padding: 0 4px;
    text-align: center;
    user-select: none;
  }

  .line-content {
    flex: 1;
    padding: 0 8px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &.line-add {
    background: #dafbe1;

    .line-marker {
      color: #1a7f37;
    }
  }

  &.line-delete {
    background: #ffebe9;

    .line-marker {
      color: #cf222e;
    }
  }

  &.line-equal {
    background: transparent;
  }

  &.line-empty {
    background: #f6f8fa;
    opacity: 0.5;
  }
}
</style>
