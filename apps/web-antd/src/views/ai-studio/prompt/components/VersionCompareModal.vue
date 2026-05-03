<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { SwapOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Col,
  Divider,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'ant-design-vue';

import {
  compareVersions,
  type ComparisonResult,
} from '#/api/ai-studio/prompt-ab-testing';
import {
  getPromptTemplateVersions,
  type PromptTemplateVersion,
} from '#/api/ai-studio/prompt-template';

interface Props {
  visible: boolean;
  templateId: string;
  initialVersionA?: string;
  initialVersionB?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

const loading = ref(false);
const comparing = ref(false);
const versions = ref<PromptTemplateVersion[]>([]);
const versionAId = ref<number | undefined>(undefined);
const versionBId = ref<number | undefined>(undefined);
const comparison = ref<ComparisonResult | null>(null);

// 版本内容用于 diff 展示
const versionAContent = computed(() =>
  versions.value.find((v) => Number(v.id) === versionAId.value),
);
const versionBContent = computed(() =>
  versions.value.find((v) => Number(v.id) === versionBId.value),
);

const versionOptions = computed(() =>
  versions.value.map((v) => ({
    value: Number(v.id),
    label: `v${v.version} - ${v.changeLog || '无描述'}`,
  })),
);

/**
 * 简单行级 diff：逐行比对，标记新增/删除/相同
 */
const computeDiff = (textA: string, textB: string) => {
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');
  const result: Array<{
    type: 'same' | 'added' | 'removed';
    content: string;
    lineA?: number;
    lineB?: number;
  }> = [];

  const maxLen = Math.max(linesA.length, linesB.length);
  let idxA = 0;
  let idxB = 0;

  while (idxA < linesA.length || idxB < linesB.length) {
    if (idxA >= linesA.length) {
      result.push({ type: 'added', content: linesB[idxB]!, lineB: idxB + 1 });
      idxB++;
    } else if (idxB >= linesB.length) {
      result.push({ type: 'removed', content: linesA[idxA]!, lineA: idxA + 1 });
      idxA++;
    } else if (linesA[idxA] === linesB[idxB]) {
      result.push({
        type: 'same',
        content: linesA[idxA]!,
        lineA: idxA + 1,
        lineB: idxB + 1,
      });
      idxA++;
      idxB++;
    } else {
      // Check if line from A appears later in B (deletion)
      const futureInB = linesB.indexOf(linesA[idxA]!, idxB + 1);
      const futureInA = linesA.indexOf(linesB[idxB]!, idxA + 1);

      if (
        futureInB !== -1 &&
        (futureInA === -1 || futureInB - idxB <= futureInA - idxA)
      ) {
        // Lines added in B
        while (idxB < futureInB) {
          result.push({
            type: 'added',
            content: linesB[idxB]!,
            lineB: idxB + 1,
          });
          idxB++;
        }
      } else if (futureInA !== -1) {
        // Lines removed from A
        while (idxA < futureInA) {
          result.push({
            type: 'removed',
            content: linesA[idxA]!,
            lineA: idxA + 1,
          });
          idxA++;
        }
      } else {
        result.push({
          type: 'removed',
          content: linesA[idxA]!,
          lineA: idxA + 1,
        });
        result.push({ type: 'added', content: linesB[idxB]!, lineB: idxB + 1 });
        idxA++;
        idxB++;
      }
    }
  }

  return result;
};

const systemPromptDiff = computed(() => {
  if (!versionAContent.value || !versionBContent.value) return [];
  const contentA = versionAContent.value.systemPrompt || '' || '';
  const contentB = versionBContent.value.systemPrompt || '' || '';
  return computeDiff(contentA.trim(), contentB.trim());
});

const userPromptDiff = computed(() => {
  if (!versionAContent.value || !versionBContent.value) return [];
  return computeDiff(
    versionAContent.value.userPromptTpl || '',
    versionBContent.value.userPromptTpl || '',
  );
});

const loadVersions = async () => {
  if (!props.templateId) return;
  loading.value = true;
  try {
    const res = await getPromptTemplateVersions(props.templateId, {
      limit: 100,
    });
    versions.value = res.data;

    if (props.initialVersionA) versionAId.value = Number(props.initialVersionA);
    if (props.initialVersionB) versionBId.value = Number(props.initialVersionB);
  } catch {
    message.error('加载版本列表失败');
  } finally {
    loading.value = false;
  }
};

const handleCompare = async () => {
  if (!versionAId.value || !versionBId.value) {
    message.warning('请选择两个版本');
    return;
  }
  if (versionAId.value === versionBId.value) {
    message.warning('请选择不同的版本');
    return;
  }

  comparing.value = true;
  try {
    comparison.value = await compareVersions(props.templateId, {
      versionAId: versionAId.value,
      versionBId: versionBId.value,
    });
  } catch {
    message.error('对比失败');
  } finally {
    comparing.value = false;
  }
};

watch(
  () => props.visible,
  (val) => {
    if (val) {
      loadVersions();
      comparison.value = null;
    }
  },
);
</script>

<template>
  <Modal
    v-model:open="modalVisible"
    title="版本对比"
    :width="960"
    :footer="null"
  >
    <Spin :spinning="loading">
      <!-- 版本选择 -->
      <Row :gutter="16" align="middle" class="mb-4">
        <Col :span="10">
          <Select
            v-model:value="versionAId"
            :options="versionOptions"
            placeholder="选择版本 A"
            style="width: 100%"
            show-search
            :filter-option="
              (input: string, option: { label: string }) =>
                option.label.toLowerCase().includes(input.toLowerCase())
            "
          />
        </Col>
        <Col :span="4" class="text-center">
          <Button
            type="primary"
            :loading="comparing"
            :disabled="!versionAId || !versionBId"
            @click="handleCompare"
          >
            <SwapOutlined />
            对比
          </Button>
        </Col>
        <Col :span="10">
          <Select
            v-model:value="versionBId"
            :options="versionOptions"
            placeholder="选择版本 B"
            style="width: 100%"
            show-search
            :filter-option="
              (input: string, option: { label: string }) =>
                option.label.toLowerCase().includes(input.toLowerCase())
            "
          />
        </Col>
      </Row>

      <!-- 内容 diff -->
      <template v-if="versionAContent && versionBContent">
        <Card size="small" title="提示词内容对比" class="mb-4">
          <div class="diff-container">
            <div
              v-for="(line, idx) in userPromptDiff"
              :key="idx"
              class="diff-line"
              :class="{
                'diff-added': line.type === 'added',
                'diff-removed': line.type === 'removed',
              }"
            >
              <span class="diff-line-num">
                {{ line.lineA ?? '' }}
              </span>
              <span class="diff-line-num">
                {{ line.lineB ?? '' }}
              </span>
              <span class="diff-prefix">
                {{
                  line.type === 'added'
                    ? '+'
                    : line.type === 'removed'
                      ? '-'
                      : ' '
                }}
              </span>
              <span class="diff-content">{{ line.content }}</span>
            </div>
          </div>
        </Card>
      </template>

      <!-- 性能对比（仅在调用 compareVersions API 后显示） -->
      <template v-if="comparison">
        <Divider>性能指标对比</Divider>
        <Row :gutter="16" class="mb-4">
          <Col :span="8">
            <Card size="small">
              <Statistic
                title="延迟差异"
                :value="Math.abs(comparison.latencyDiffPercent)"
                :precision="1"
                suffix="%"
                :value-style="{
                  color:
                    comparison.latencyDiffPercent < 0
                      ? '#52c41a'
                      : comparison.latencyDiffPercent > 0
                        ? '#ff4d4f'
                        : '#999',
                }"
              />
              <Typography.Text type="secondary">
                {{
                  comparison.latencyDiffPercent < 0
                    ? 'B 更快'
                    : comparison.latencyDiffPercent > 0
                      ? 'A 更快'
                      : '持平'
                }}
              </Typography.Text>
            </Card>
          </Col>
          <Col :span="8">
            <Card size="small">
              <Statistic
                title="成功率差异"
                :value="Math.abs(comparison.successRateDiff * 100)"
                :precision="2"
                suffix="%"
                :value-style="{
                  color:
                    comparison.successRateDiff > 0
                      ? '#52c41a'
                      : comparison.successRateDiff < 0
                        ? '#ff4d4f'
                        : '#999',
                }"
              />
              <Typography.Text type="secondary">
                {{
                  comparison.successRateDiff > 0
                    ? 'B 更高'
                    : comparison.successRateDiff < 0
                      ? 'A 更高'
                      : '持平'
                }}
              </Typography.Text>
            </Card>
          </Col>
          <Col :span="8">
            <Card size="small">
              <Statistic
                title="Token 差异"
                :value="Math.abs(comparison.tokenDiffPercent)"
                :precision="1"
                suffix="%"
                :value-style="{
                  color:
                    comparison.tokenDiffPercent < 0
                      ? '#52c41a'
                      : comparison.tokenDiffPercent > 0
                        ? '#ff4d4f'
                        : '#999',
                }"
              />
              <Typography.Text type="secondary">
                {{
                  comparison.tokenDiffPercent < 0
                    ? 'B 更省'
                    : comparison.tokenDiffPercent > 0
                      ? 'A 更省'
                      : '持平'
                }}
              </Typography.Text>
            </Card>
          </Col>
        </Row>

        <Card size="small">
          <Space>
            <Tag
              :color="
                comparison.recommendedVersion === 'A'
                  ? 'blue'
                  : comparison.recommendedVersion === 'B'
                    ? 'green'
                    : 'default'
              "
            >
              推荐：{{
                comparison.recommendedVersion === 'A'
                  ? '版本 A'
                  : comparison.recommendedVersion === 'B'
                    ? '版本 B'
                    : '持平'
              }}
            </Tag>
            <Typography.Text type="secondary">
              {{ comparison.recommendation }}
            </Typography.Text>
          </Space>
        </Card>
      </template>
    </Spin>
  </Modal>
</template>

<style lang="less" scoped>
.diff-container {
  max-height: 400px;
  overflow: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.diff-line {
  display: flex;
  padding: 0 8px;

  &.diff-added {
    background: #e6ffed;
  }

  &.diff-removed {
    background: #ffeef0;
  }
}

.diff-line-num {
  width: 40px;
  text-align: right;
  color: #999;
  user-select: none;
  padding-right: 8px;
  flex-shrink: 0;
}

.diff-prefix {
  width: 16px;
  text-align: center;
  flex-shrink: 0;
  font-weight: bold;
}

.diff-content {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
