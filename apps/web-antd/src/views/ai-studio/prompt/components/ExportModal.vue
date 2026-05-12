<script lang="tsx" setup>
import { computed, ref } from 'vue';

import {
  CopyOutlined,
  DownloadOutlined,
  ExportOutlined,
  LinkOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Col,
  Input,
  Modal,
  Radio,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from 'ant-design-vue';

import type { PromptTemplate } from '#/api/ai-studio/prompt-template';
import {
  downloadFile,
  exportAsJson,
  exportAsLangChain,
  exportAsLangChainChat,
  exportAsMarkdown,
  exportAsOpenAI,
  generatePreviewLink,
} from '#/utils/prompt-export';

interface Props {
  visible: boolean;
  template: Partial<PromptTemplate>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

// ==================== 状态 ====================

const activeFormat = ref<
  'json' | 'langchain' | 'langchain-chat' | 'openai' | 'markdown'
>('json');
const generatingLink = ref(false);
const previewLink = ref('');

// ==================== 计算属性 ====================

const previewContent = computed(() => {
  if (!props.template) return '';

  switch (activeFormat.value) {
    case 'json':
      return exportAsJson(props.template);
    case 'langchain':
      return exportAsLangChain(props.template);
    case 'langchain-chat':
      return exportAsLangChainChat(props.template);
    case 'openai':
      return exportAsOpenAI(props.template);
    case 'markdown':
      return exportAsMarkdown(props.template);
    default:
      return exportAsJson(props.template);
  }
});

const formatOptions = [
  { value: 'json', label: 'JSON', desc: 'OmniReach 标准格式' },
  { value: 'langchain', label: 'LangChain', desc: 'LangChain PromptTemplate' },
  {
    value: 'langchain-chat',
    label: 'LangChain Chat',
    desc: 'LangChain ChatPromptTemplate',
  },
  { value: 'openai', label: 'OpenAI API', desc: 'OpenAI API 请求格式' },
  { value: 'markdown', label: 'Markdown', desc: 'Markdown 文档格式' },
];

// ==================== 方法 ====================

const handleClose = () => {
  emit('update:visible', false);
  previewLink.value = '';
};

const handleCopy = () => {
  navigator.clipboard.writeText(previewContent.value);
  message.success('已复制到剪贴板');
};

const handleDownload = () => {
  const { format } =
    activeFormat.value === 'langchain-chat'
      ? { format: 'langchain' as const }
      : { format: activeFormat.value as 'json' | 'langchain' | 'markdown' };

  const content = previewContent.value;
  const safeName = (
    props.template.key ||
    props.template.name ||
    'prompt'
  ).replace(/[^a-z0-9_-]/gi, '_');

  let filename: string;
  let mimeType: string;

  switch (format) {
    case 'json':
      filename = `${safeName}.json`;
      mimeType = 'application/json';
      break;
    case 'langchain':
      filename = `${safeName}_langchain.json`;
      mimeType = 'application/json';
      break;
    case 'markdown':
      filename = `${safeName}.md`;
      mimeType = 'text/markdown';
      break;
    default:
      filename = `${safeName}.json`;
      mimeType = 'application/json';
  }

  downloadFile(content, filename, mimeType);
  message.success('下载成功');
};

const handleGenerateLink = async () => {
  generatingLink.value = true;
  try {
    const link = await generatePreviewLink(props.template);
    previewLink.value = link;
  } finally {
    generatingLink.value = false;
  }
};

const handleCopyLink = () => {
  navigator.clipboard.writeText(previewLink.value);
  message.success('链接已复制');
};
</script>

<template>
  <Modal
    :open="visible"
    title="导出提示词"
    width="800px"
    :footer="null"
    @cancel="handleClose"
  >
    <div class="export-modal">
      <Row :gutter="24">
        <!-- 左侧：格式选择 -->
        <Col :span="8">
          <Card size="small" title="选择格式">
            <Radio.Group
              v-model:value="activeFormat"
              direction="vertical"
              class="format-radio-group"
            >
              <Radio
                v-for="opt in formatOptions"
                :key="opt.value"
                :value="opt.value"
                class="format-radio-item"
              >
                <div class="format-option">
                  <div class="format-label">{{ opt.label }}</div>
                  <div class="format-desc">{{ opt.desc }}</div>
                </div>
              </Radio>
            </Radio.Group>
          </Card>

          <Card size="small" title="分享链接" class="mt-3">
            <div v-if="!previewLink">
              <Button
                type="primary"
                size="small"
                block
                :loading="generatingLink"
                @click="handleGenerateLink"
              >
                <LinkOutlined />
                生成预览链接
              </Button>
            </div>
            <div v-else>
              <Input :value="previewLink" size="small" readonly class="mb-2">
                <template #addonAfter>
                  <Button size="small" @click="handleCopyLink">
                    <CopyOutlined />
                  </Button>
                </template>
              </Input>
              <Typography.Text type="secondary" class="text-xs">
                链接有效期 7 天，可直接分享给团队成员
              </Typography.Text>
            </div>
          </Card>
        </Col>

        <!-- 右侧：预览 -->
        <Col :span="16">
          <Card size="small">
            <template #title>
              <Space>
                <ExportOutlined />
                <span>预览</span>
                <Tag
                  color="blue"
                  >{{ formatOptions.find((o: any) => o.value === activeFormat)?.label }}</Tag
                >
              </Space>
            </template>
            <template #extra>
              <Space>
                <Button size="small" @click="handleCopy">
                  <CopyOutlined />
                  复制
                </Button>
                <Button type="primary" size="small" @click="handleDownload">
                  <DownloadOutlined />
                  下载
                </Button>
              </Space>
            </template>
            <pre class="export-preview">{{ previewContent }}</pre>
          </Card>
        </Col>
      </Row>
    </div>
  </Modal>
</template>

<style lang="less" scoped>
.export-modal {
  .format-radio-group {
    width: 100%;

    .format-radio-item {
      display: block;
      margin-bottom: 12px;

      :deep(.ant-radio) {
        margin-top: 4px;
      }
    }
  }

  .format-option {
    .format-label {
      font-weight: 500;
      margin-bottom: 2px;
    }

    .format-desc {
      font-size: 12px;
      color: #999;
    }
  }

  .export-preview {
    margin: 0;
    padding: 12px;
    background: #f6f8fa;
    border-radius: 6px;
    white-space: pre-wrap;
    word-break: break-all;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.5;
    max-height: 400px;
    overflow: auto;
  }

  .mt-3 {
    margin-top: 12px;
  }

  .text-xs {
    font-size: 12px;
  }

  .mb-2 {
    margin-bottom: 8px;
  }
}
</style>
