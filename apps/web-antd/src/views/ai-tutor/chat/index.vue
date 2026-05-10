<template>
  <div class="chat-page">
    <!-- Sidebar -->
    <div class="chat-sidebar">
      <div class="sidebar-header">
        <h3 class="sidebar-title">会话</h3>
        <Button type="primary" size="small" @click="createSession">
          <PlusOutlined />
          新建
        </Button>
      </div>

      <div class="sidebar-search">
        <Input
          v-model:value="searchText"
          placeholder="搜索会话..."
          size="small"
          allow-clear
        >
          <template #prefix>
            <SearchOutlined style="color: #bfbfbf" />
          </template>
        </Input>
      </div>

      <div class="sidebar-sessions">
        <template v-if="filteredSessions.length > 0">
          <div
            v-for="group in sessionGroups"
            :key="group.label"
            class="session-group"
          >
            <div class="session-group-label">{{ group.label }}</div>
            <div
              v-for="session in group.sessions"
              :key="session.id"
              class="session-item"
              :class="{ active: session.id === activeSessionId }"
              @click="selectSession(session.id)"
            >
              <div class="session-item-content">
                <div class="session-item-title">
                  {{ session.title || '新会话' }}
                </div>
                <div class="session-item-time">
                  {{ formatTime(session.updatedAt) }}
                </div>
              </div>
              <div class="session-item-actions" @click.stop>
                <Dropdown :trigger="['click']">
                  <Button type="text" size="small" class="session-action-btn">
                    <MoreOutlined />
                  </Button>
                  <template #overlay>
                    <Menu>
                      <MenuItem @click="renameSession(session)">
                        <EditOutlined /> 重命名
                      </MenuItem>
                      <MenuItem @click="confirmDeleteSession(session)">
                        <DeleteOutlined /> 删除
                      </MenuItem>
                    </Menu>
                  </template>
                </Dropdown>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="sidebar-empty">
          <Empty description="暂无会话" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </div>
      </div>
    </div>

    <!-- Main Chat Area -->
    <div class="chat-main">
      <template v-if="activeSessionId">
        <!-- Messages -->
        <div class="chat-messages" ref="messageContainer">
          <!-- Welcome Screen -->
          <div v-if="messages.length === 0" class="welcome-screen">
            <div class="welcome-icon">
              <RobotOutlined />
            </div>
            <h2 class="welcome-title">今天想学什么？</h2>
            <p class="welcome-subtitle">选择一个话题开始对话</p>
            <div class="welcome-cards">
              <div
                v-for="card in welcomeCards"
                :key="card.label"
                class="welcome-card"
                @click="sendFromCard(card.text)"
              >
                <component :is="card.icon" class="welcome-card-icon" />
                <div class="welcome-card-label">{{ card.label }}</div>
              </div>
            </div>
          </div>

          <!-- Message List -->
          <div v-for="msg in messages" :key="msg.id" class="message-row">
            <div
              class="message-bubble-wrapper"
              :class="
                msg.role === 'USER' ? 'message-user' : 'message-assistant'
              "
            >
              <div v-if="msg.role === 'ASSISTANT'" class="message-avatar">
                <RobotOutlined />
              </div>

              <div
                class="message-bubble"
                :class="
                  msg.role === 'USER' ? 'bubble-user' : 'bubble-assistant'
                "
              >
                <MarkdownRenderer
                  :content="
                    msg.status === 'STREAMING' ? streamingContent : msg.content
                  "
                  :streaming="msg.status === 'STREAMING'"
                />
                <span
                  v-if="msg.status === 'STREAMING'"
                  class="streaming-cursor"
                >
                  <span /><span /><span />
                </span>
              </div>

              <div
                v-if="msg.role === 'USER'"
                class="message-avatar message-avatar-user"
              >
                <UserOutlined />
              </div>
            </div>

            <!-- Assistant message actions -->
            <div
              v-if="
                msg.role === 'ASSISTANT' &&
                msg.status === 'COMPLETE' &&
                msg.content
              "
              class="message-actions"
            >
              <Tooltip title="复制">
                <Button
                  type="text"
                  size="small"
                  @click="copyMessage(msg.content)"
                >
                  <CopyOutlined />
                </Button>
              </Tooltip>
              <Tooltip title="重新生成">
                <Button
                  type="text"
                  size="small"
                  @click="regenerateMessage(msg.id)"
                >
                  <SyncOutlined />
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
          <div class="chat-input-container">
            <TextArea
              v-model:value="inputText"
              placeholder="输入消息..."
              :disabled="!activeSessionId || isStreaming"
              :auto-size="{ minRows: 1, maxRows: 6 }"
              class="chat-textarea"
              @keydown="handleInputKeydown"
            />
            <div class="chat-send-area">
              <Button
                v-if="isStreaming"
                type="text"
                danger
                size="small"
                @click="stopStreaming"
              >
                <StopOutlined /> 停止
              </Button>
              <Button
                v-else
                type="primary"
                size="small"
                :disabled="!inputText.trim() || !activeSessionId"
                @click="sendMessage"
              >
                <SendOutlined />
              </Button>
            </div>
          </div>
        </div>
      </template>

      <!-- No session selected -->
      <div v-else class="chat-empty">
        <Empty description="选择或创建一个会话开始对话" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import {
  Button,
  Input,
  Empty,
  Dropdown,
  Menu,
  MenuItem,
  Modal,
  Tooltip,
  message,
} from 'ant-design-vue';
import {
  PlusOutlined,
  UserOutlined,
  RobotOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  CopyOutlined,
  SyncOutlined,
  SendOutlined,
  StopOutlined,
  BookOutlined,
  BulbOutlined,
  FormOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons-vue';
import {
  listSessions,
  createSession as apiCreateSession,
  updateSession,
  deleteSession as apiDeleteSession,
  getMessages,
  sendMessageStream,
  regenerateMessageStream,
  stopMessage,
  type ChatSession,
  type ChatMessage,
} from '#/api/ai-chat';
import MarkdownRenderer from './components/MarkdownRenderer.vue';

const TextArea = Input.TextArea;

// ==================== State ====================

const sessions = ref<ChatSession[]>([]);
const activeSessionId = ref<string | null>(null);
const messages = ref<ChatMessage[]>([]);
const inputText = ref('');
const streamingContent = ref('');
const searchText = ref('');
const messageContainer = ref<HTMLElement>();
const abortController = ref<AbortController | null>(null);

const isStreaming = computed(() =>
  messages.value.some((m) => m.status === 'STREAMING'),
);

// ==================== Welcome Cards ====================

const welcomeCards = [
  { label: '解题', text: '帮我解一道数学题', icon: BookOutlined },
  { label: '讲概念', text: '给我讲一个数学概念', icon: BulbOutlined },
  { label: '练习题', text: '给我出几道练习题', icon: FormOutlined },
  {
    label: '检查答案',
    text: '帮我检查这道题的答案',
    icon: CheckCircleOutlined,
  },
];

// ==================== Session Filtering & Grouping ====================

const filteredSessions = computed(() => {
  if (!searchText.value) return sessions.value;
  const q = searchText.value.toLowerCase();
  return sessions.value.filter((s) =>
    (s.title || '新会话').toLowerCase().includes(q),
  );
});

const sessionGroups = computed(() => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; sessions: ChatSession[] }[] = [
    { label: '今天', sessions: [] },
    { label: '昨天', sessions: [] },
    { label: '近7天', sessions: [] },
    { label: '更早', sessions: [] },
  ];

  for (const session of filteredSessions.value) {
    const date = new Date(session.updatedAt);
    if (date >= today) {
      groups[0]!.sessions.push(session);
    } else if (date >= yesterday) {
      groups[1]!.sessions.push(session);
    } else if (date >= weekAgo) {
      groups[2]!.sessions.push(session);
    } else {
      groups[3]!.sessions.push(session);
    }
  }

  return groups.filter((g) => g.sessions.length > 0);
});

// ==================== Lifecycle ====================

onMounted(async () => {
  await loadSessions();
});

// ==================== Session Operations ====================

async function loadSessions() {
  try {
    const data = await listSessions();
    sessions.value = data.items || [];
  } catch (e) {
    console.error('Failed to load sessions:', e);
  }
}

async function createSession() {
  try {
    const { session } = await apiCreateSession({ scopeKey: 'tutor' });
    sessions.value.unshift(session);
    activeSessionId.value = session.id;
    messages.value = [];
  } catch (e) {
    console.error('Failed to create session:', e);
    message.error('创建会话失败');
  }
}

async function selectSession(sessionId: string) {
  activeSessionId.value = sessionId;
  try {
    const data = await getMessages(sessionId);
    messages.value = data.messages || [];
    nextTick(scrollToBottom);
  } catch (e) {
    console.error('Failed to load messages:', e);
  }
}

async function renameSession(session: ChatSession) {
  let newName = session.title || '';
  Modal.confirm({
    title: '重命名会话',
    content: () =>
      h(Input, {
        defaultValue: newName,
        onChange: (e: any) => {
          newName = e.target?.value ?? e;
        },
      }),
    onOk: async () => {
      if (newName && newName !== session.title) {
        await updateSession(session.id, { title: newName });
        session.title = newName;
      }
    },
  });
}

async function confirmDeleteSession(session: ChatSession) {
  Modal.confirm({
    title: '删除会话',
    content: `确定删除「${session.title || '新会话'}」吗？`,
    okType: 'danger',
    onOk: async () => {
      await apiDeleteSession(session.id);
      sessions.value = sessions.value.filter((s) => s.id !== session.id);
      if (activeSessionId.value === session.id) {
        activeSessionId.value = null;
        messages.value = [];
      }
    },
  });
}

// ==================== Send Message ====================

async function sendMessage() {
  if (!inputText.value.trim() || !activeSessionId.value || isStreaming.value)
    return;

  const content = inputText.value.trim();
  inputText.value = '';

  // Add user message
  messages.value.push({
    id: `user-${Date.now()}`,
    sessionId: activeSessionId.value,
    role: 'USER',
    content,
    status: 'COMPLETE',
    createdAt: new Date().toISOString(),
  });

  // Add assistant placeholder
  const assistantId = `assistant-${Date.now()}`;
  messages.value.push({
    id: assistantId,
    sessionId: activeSessionId.value!,
    role: 'ASSISTANT',
    content: '',
    status: 'STREAMING',
    createdAt: new Date().toISOString(),
  });
  streamingContent.value = '';

  scrollToBottom();

  const controller = new AbortController();
  abortController.value = controller;

  try {
    for await (const event of sendMessageStream(
      activeSessionId.value,
      { content },
      controller.signal,
    )) {
      if (event.type === 'token') {
        const tokenContent = (event.data as { content?: string }).content || '';
        streamingContent.value += tokenContent;
        scrollToBottom();
      } else if (event.type === 'final') {
        finalizeStreaming(event.messageId);
      } else if (event.type === 'error') {
        finalizeStreaming(
          event.messageId,
          (event.data as { message?: string }).message || '生成失败',
        );
      }
    }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      // User stopped generation
      finalizeStreaming(assistantId);
    } else {
      console.error('Stream error:', e);
      finalizeStreaming(assistantId, e.message || '发送失败');
    }
  } finally {
    abortController.value = null;
  }

  // Auto-update session title on first message
  const isFirstMessage =
    messages.value.filter((m) => m.role === 'USER').length === 1;
  if (isFirstMessage && activeSessionId.value) {
    const title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
    updateSession(activeSessionId.value, { title }).catch(() => {});
    // Update local session title
    const session = sessions.value.find((s) => s.id === activeSessionId.value);
    if (session) session.title = title;
  }
}

function sendFromCard(text: string) {
  inputText.value = text;
  sendMessage();
}

function stopStreaming() {
  abortController.value?.abort();
  // Also notify backend
  const streamingMsg = messages.value.find((m) => m.status === 'STREAMING');
  if (streamingMsg) {
    stopMessage(streamingMsg.id).catch(() => {});
  }
}

function finalizeStreaming(messageId?: string, error?: string) {
  const lastMsg = messages.value[messages.value.length - 1];
  if (lastMsg && lastMsg.status === 'STREAMING') {
    lastMsg.content = streamingContent.value;
    lastMsg.status = error ? 'FAILED' : 'COMPLETE';
    if (error) lastMsg.content = streamingContent.value || `错误: ${error}`;
    if (messageId) lastMsg.id = messageId;
  }
  streamingContent.value = '';
}

// ==================== Regenerate ====================

async function regenerateMessage(messageId: string) {
  if (isStreaming.value) return;

  // Remove messages after and including this one
  const idx = messages.value.findIndex((m) => m.id === messageId);
  if (idx === -1) return;

  messages.value.splice(idx);

  // Add new assistant placeholder
  const newId = `assistant-${Date.now()}`;
  messages.value.push({
    id: newId,
    sessionId: activeSessionId.value!,
    role: 'ASSISTANT',
    content: '',
    status: 'STREAMING',
    createdAt: new Date().toISOString(),
  });
  streamingContent.value = '';

  const controller = new AbortController();
  abortController.value = controller;

  try {
    for await (const event of regenerateMessageStream(
      messageId,
      controller.signal,
    )) {
      if (event.type === 'token') {
        const tokenContent = (event.data as { content?: string }).content || '';
        streamingContent.value += tokenContent;
        scrollToBottom();
      } else if (event.type === 'final') {
        finalizeStreaming(event.messageId);
      } else if (event.type === 'error') {
        finalizeStreaming(
          event.messageId,
          (event.data as { message?: string }).message || '重新生成失败',
        );
      }
    }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      finalizeStreaming(newId);
    } else {
      finalizeStreaming(newId, e.message || '重新生成失败');
    }
  } finally {
    abortController.value = null;
  }
}

// ==================== Utilities ====================

function scrollToBottom() {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    }
  });
}

function handleInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function copyMessage(content: string) {
  navigator.clipboard.writeText(content).then(() => {
    message.success('已复制');
  });
}

function formatTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return d.toLocaleDateString();
}

// Need h for Modal.confirm content
import { h } from 'vue';
</script>

<style scoped>
@keyframes dot-blink {
  0%,
  80%,
  100% {
    opacity: 0;
  }

  40% {
    opacity: 1;
  }
}

.chat-page {
  --chat-bg: #fff;
  --chat-sidebar-bg: #f9fafb;
  --chat-sidebar-border: #f0f0f0;
  --chat-sidebar-hover: #f0f0f0;
  --chat-sidebar-active: #e6f4ff;
  --chat-sidebar-active-bar: #1890ff;
  --chat-sidebar-text: #000;
  --chat-sidebar-muted: #8c8c8c;
  --chat-sidebar-time: #bfbfbf;
  --chat-main-border: #f0f0f0;
  --chat-empty-bg: #f9fafb;
  --chat-empty-border: #f0f0f0;
  --chat-empty-hover-bg: #e6f4ff;
  --chat-empty-hover-border: #91caff;
  --chat-bubble-user-bg: #1890ff;
  --chat-bubble-user-text: #fff;
  --chat-bubble-assistant-bg: #f3f4f6;
  --chat-bubble-assistant-text: #000;
  --chat-avatar-bot-bg: #e6f4ff;
  --chat-avatar-bot-color: #1890ff;
  --chat-avatar-user-bg: #1890ff;
  --chat-avatar-user-color: #fff;
  --chat-input-bg: #f9fafb;
  --chat-input-border: #f0f0f0;
  --chat-input-shadow: rgb(0 0 0 / 5%);
  --chat-dot-color: #8c8c8c;
  --chat-welcome-icon-bg: #e6f4ff;
  --chat-welcome-icon-color: #1890ff;
  --chat-welcome-subtitle: #8c8c8c;
  --chat-link-color: #1890ff;

  display: flex;
  height: 100%;
  background: var(--chat-bg);
}

:root.dark .chat-page,
.dark .chat-page {
  --chat-bg: #141414;
  --chat-sidebar-bg: #1f1f1f;
  --chat-sidebar-border: #303030;
  --chat-sidebar-hover: #2a2a2a;
  --chat-sidebar-active: #111b26;
  --chat-sidebar-active-bar: #177ddc;
  --chat-sidebar-text: #e0e0e0;
  --chat-sidebar-muted: #8c8c8c;
  --chat-sidebar-time: #595959;
  --chat-main-border: #303030;
  --chat-empty-bg: #1f1f1f;
  --chat-empty-border: #303030;
  --chat-empty-hover-bg: #111b26;
  --chat-empty-hover-border: #15325b;
  --chat-bubble-user-bg: #177ddc;
  --chat-bubble-user-text: #fff;
  --chat-bubble-assistant-bg: #2a2a2a;
  --chat-bubble-assistant-text: #e0e0e0;
  --chat-avatar-bot-bg: #111b26;
  --chat-avatar-bot-color: #177ddc;
  --chat-avatar-user-bg: #177ddc;
  --chat-avatar-user-color: #fff;
  --chat-input-bg: #1f1f1f;
  --chat-input-border: #303030;
  --chat-input-shadow: rgb(0 0 0 / 20%);
  --chat-dot-color: #8c8c8c;
  --chat-welcome-icon-bg: #111b26;
  --chat-welcome-icon-color: #177ddc;
  --chat-welcome-subtitle: #8c8c8c;
  --chat-link-color: #177ddc;
}

/* ==================== Sidebar ==================== */

.chat-sidebar {
  display: flex;
  flex-direction: column;
  width: 280px;
  background: var(--chat-sidebar-bg);
  border-right: 1px solid var(--chat-sidebar-border);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
}

.sidebar-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--chat-sidebar-text);
}

.sidebar-search {
  padding: 0 16px 12px;
}

.sidebar-sessions {
  flex: 1;
  overflow-y: auto;
}

.sidebar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.session-group-label {
  padding: 8px 16px 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--chat-sidebar-muted);
}

.session-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  margin: 0 8px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.session-item:hover {
  background: var(--chat-sidebar-hover);
}

.session-item.active {
  background: var(--chat-sidebar-active);
}

.session-item.active::before {
  position: absolute;
  left: 0;
  width: 3px;
  height: 60%;
  content: '';
  background: var(--chat-sidebar-active-bar);
  border-radius: 0 2px 2px 0;
  transform: translateY(30%);
}

.session-item-content {
  flex: 1;
  min-width: 0;
}

.session-item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
  color: var(--chat-sidebar-text);
  white-space: nowrap;
}

.session-item-time {
  margin-top: 2px;
  font-size: 12px;
  color: var(--chat-sidebar-time);
}

.session-item-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.session-item:hover .session-item-actions {
  opacity: 1;
}

.session-action-btn {
  padding: 0 4px !important;
  font-size: 12px !important;
}

/* ==================== Main Chat ==================== */

.chat-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.chat-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
}

/* ==================== Messages ==================== */

.chat-messages {
  flex: 1;
  padding: 24px 0;
  overflow-y: auto;
}

.message-row {
  max-width: 768px;
  padding: 0 24px;
  margin: 0 auto;
}

.message-bubble-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 4px;
}

.message-user {
  justify-content: flex-end;
}

.message-assistant {
  justify-content: flex-start;
}

.message-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-top: 4px;
  font-size: 16px;
  color: var(--chat-avatar-bot-color);
  background: var(--chat-avatar-bot-bg);
  border-radius: 50%;
}

.message-avatar-user {
  color: var(--chat-avatar-user-color);
  background: var(--chat-avatar-user-bg);
}

.message-bubble {
  max-width: 70%;
  padding: 10px 16px;
  font-size: 14px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.bubble-user {
  color: var(--chat-bubble-user-text);
  background: var(--chat-bubble-user-bg);
  border-radius: 12px 12px 2px;
}

.bubble-assistant {
  color: var(--chat-bubble-assistant-text);
  background: var(--chat-bubble-assistant-bg);
  border-radius: 12px 12px 12px 2px;
}

.message-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-start;
  max-width: 768px;
  padding: 0 24px 12px 68px;
  margin: 0 auto;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-row:hover .message-actions {
  opacity: 1;
}

/* Streaming cursor animation */
.streaming-cursor {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  margin-left: 2px;
}

.streaming-cursor span {
  display: inline-block;
  width: 4px;
  height: 4px;
  background: var(--chat-dot-color);
  border-radius: 50%;
  animation: dot-blink 1.4s infinite both;
}

.streaming-cursor span:nth-child(2) {
  animation-delay: 0.2s;
}

.streaming-cursor span:nth-child(3) {
  animation-delay: 0.4s;
}

/* ==================== Welcome Screen ==================== */

.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
}

.welcome-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 20px;
  font-size: 32px;
  color: var(--chat-welcome-icon-color);
  background: var(--chat-welcome-icon-bg);
  border-radius: 50%;
}

.welcome-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
  color: var(--chat-sidebar-text);
}

.welcome-subtitle {
  margin: 0 0 32px;
  font-size: 14px;
  color: var(--chat-welcome-subtitle);
}

.welcome-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  max-width: 400px;
}

.welcome-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  cursor: pointer;
  background: var(--chat-empty-bg);
  border: 1px solid var(--chat-empty-border);
  border-radius: 12px;
  transition: all 0.2s;
}

.welcome-card:hover {
  background: var(--chat-empty-hover-bg);
  border-color: var(--chat-empty-hover-border);
}

.welcome-card-icon {
  font-size: 24px;
  color: var(--chat-welcome-icon-color);
}

.welcome-card-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--chat-sidebar-text);
}

/* ==================== Input Area ==================== */

.chat-input-area {
  padding: 16px 24px;
  border-top: 1px solid var(--chat-main-border);
}

.chat-input-container {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  max-width: 768px;
  padding: 8px 12px;
  margin: 0 auto;
  background: var(--chat-input-bg);
  border: 1px solid var(--chat-input-border);
  border-radius: 16px;
  box-shadow: 0 1px 2px var(--chat-input-shadow);
}

.chat-textarea {
  flex: 1;
  resize: none !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.chat-textarea :deep(.ant-input) {
  color: var(--chat-sidebar-text);
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.chat-send-area {
  display: flex;
  flex-shrink: 0;
  align-items: center;
}
</style>
