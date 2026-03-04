<script setup lang="ts">
import { ref } from 'vue';
import {
  Card,
  Tabs,
  TabPane,
  Tag,
  Empty,
  Spin,
  Button,
  Space,
  Tooltip,
} from 'ant-design-vue';
import {
  FileTextOutlined,
  CopyOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue';
import type {
  PersonalizedCopy,
  AudienceSegment,
} from '#/api/marketing/ai-marketing';
import { message } from 'ant-design-vue';

interface Props {
  copies: PersonalizedCopy[];
  segments: AudienceSegment[];
  loading: boolean;
  editable?: boolean;
}

interface Emits {
  (e: 'regenerate', segmentId?: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 当前选中的分群
const activeSegmentId = ref<string | undefined>(undefined);

// 获取分群信息
function getSegment(segmentId: string): AudienceSegment | undefined {
  return props.segments.find((s) => s.segmentId === segmentId);
}

// 获取分群颜色
function getSegmentColor(index: number): string {
  const colors = ['green', 'blue', 'purple', 'orange', 'pink', 'cyan'];
  return colors[index % colors.length] || 'blue';
}

// 复制文案
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  } catch {
    message.error('复制失败');
  }
}

// 复制全部文案
async function copyAllCopies() {
  const text = props.copies
    .map((copy) => {
      const segment = getSegment(copy.segmentId);
      return `【${segment?.segmentName || copy.segmentId}】\n${copy.textContent}\n`;
    })
    .join('\n---\n\n');
  await copyText(text);
}

defineOptions({ name: 'CopyPreview' });
</script>

<template>
  <Card class="mb-4" :bordered="false">
    <template #title>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-lg">✨</span>
          <span>个性化文案</span>
          <Tooltip title="AI 为每个分群生成的个性化营销文案">
            <InfoCircleOutlined class="text-gray-400" />
          </Tooltip>
        </div>
        <Space>
          <Button
            v-if="copies.length > 0"
            type="link"
            size="small"
            @click="copyAllCopies"
          >
            <CopyOutlined /> 复制全部
          </Button>
          <Button
            v-if="copies.length > 0"
            type="link"
            size="small"
            @click="$emit('regenerate')"
          >
            <ReloadOutlined /> 重新生成
          </Button>
        </Space>
      </div>
    </template>

    <Spin :spinning="loading">
      <div v-if="copies.length > 0">
        <!-- 分群文案标签页 -->
        <Tabs v-model:activeKey="activeSegmentId" type="card" size="small">
          <TabPane
            v-for="(copy, index) in copies"
            :key="copy.segmentId"
            :tab="getSegment(copy.segmentId)?.segmentName || copy.segmentId"
          >
            <div class="space-y-4">
              <!-- 文案内容 -->
              <div class="rounded-lg bg-gray-50 p-4">
                <div class="mb-2 flex items-center justify-between">
                  <Tag :color="getSegmentColor(index)">
                    {{
                      getSegment(copy.segmentId)?.segmentName || copy.segmentId
                    }}
                  </Tag>
                  <Space>
                    <Tooltip title="复制文案">
                      <Button
                        type="text"
                        size="small"
                        @click="copyText(copy.textContent)"
                      >
                        <CopyOutlined />
                      </Button>
                    </Tooltip>
                    <Tooltip title="重新生成">
                      <Button
                        type="text"
                        size="small"
                        @click="$emit('regenerate', copy.segmentId)"
                      >
                        <ReloadOutlined />
                      </Button>
                    </Tooltip>
                  </Space>
                </div>
                <p class="whitespace-pre-wrap text-gray-800">
                  {{ copy.textContent }}
                </p>
              </div>

              <!-- 链接信息 -->
              <div
                v-if="copy.linkTitle || copy.linkDesc"
                class="rounded-lg border p-3"
              >
                <div class="mb-1 text-sm text-gray-500">链接卡片</div>
                <div class="font-medium">{{ copy.linkTitle }}</div>
                <div class="text-sm text-gray-600">{{ copy.linkDesc }}</div>
              </div>

              <!-- 行动号召 -->
              <div v-if="copy.callToAction" class="flex items-center gap-2">
                <span class="text-sm text-gray-500">行动号召:</span>
                <Tag color="blue">{{ copy.callToAction }}</Tag>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </div>

      <Empty v-else description="创建活动后将自动生成个性化文案">
        <template #image>
          <FileTextOutlined style="font-size: 48px; color: #d9d9d9" />
        </template>
      </Empty>
    </Spin>
  </Card>
</template>
