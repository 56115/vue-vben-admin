<template>
  <div class="h-full flex">
    <!-- Session List -->
    <div class="w-60 border-r flex flex-col">
      <div class="p-4 border-b flex justify-between items-center">
        <h3 class="font-medium">会话列表</h3>
        <Button type="primary" size="small" @click="createSession">
          <PlusOutlined />
          新建
        </Button>
      </div>
      <div class="flex-1 overflow-auto">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="p-3 cursor-pointer hover:bg-gray-50 border-b"
          :class="{ 'bg-blue-50': session.id === activeSessionId }"
          @click="selectSession(session.id)"
        >
          <div class="font-medium truncate">{{ session.title || '新会话' }}</div>
          <div class="text-xs text-gray-400">{{ formatTime(session.updatedAt) }}</div>
        </div>
      </div>
    </div>

    <!-- Chat Area -->
    <div class="flex-1 flex flex-col">
      <!-- Messages -->
      <div class="flex-1 overflow-auto p-4" ref="messageContainer">
        <div v-if="messages.length === 0" class="h-full flex items-center justify-center">
          <Empty description="开始新对话" />
        </div>
        <div v-for="msg in messages" :key="msg.id" class="mb-4">
          <div class="flex gap-3" :class="msg.role === 'USER' ? 'flex-row-reverse' : ''">
            <Avatar :size="32" :style="msg.role === 'USER' ? {} : { backgroundColor: '#1890ff' }">
              <template #icon>
                <UserOutlined v-if="msg.role === 'USER'" />
                <RobotOutlined v-else />
              </template>
            </Avatar>
            <div
              class="max-w-[70%] p-3 rounded-lg"
              :class="msg.role === 'USER' ? 'bg-blue-500 text-white' : 'bg-gray-100'"
            >
              <div v-html="formatContent(msg.content, msg.status === 'STREAMING' ? streamingContent : '')" />
              <span v-if="msg.status === 'STREAMING'" class="animate-pulse">|</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="p-4 border-t flex gap-3">
        <Input
          v-model:value="inputText"
          placeholder="输入消息..."
          :disabled="!activeSessionId || isStreaming"
          @pressEnter="sendMessage"
        />
        <Button type="primary" :disabled="!inputText.trim() || isStreaming" @click="sendMessage">
          发送
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { Button, Input, Avatar, Empty } from 'ant-design-vue';
import { PlusOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons-vue';

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  status: 'STREAMING' | 'COMPLETE';
}

const sessions = ref<ChatSession[]>([]);
const activeSessionId = ref<string | null>(null);
const messages = ref<ChatMessage[]>([]);
const inputText = ref('');
const streamingContent = ref('');
const messageContainer = ref<HTMLElement>();

const isStreaming = computed(() => messages.value.some(m => m.status === 'STREAMING'));

const API_BASE = '/api/ai-chat';

onMounted(async () => {
  await loadSessions();
});

async function loadSessions() {
  try {
    const res = await fetch(`${API_BASE}/sessions`);
    const data = await res.json();
    sessions.value = data.items || [];
  } catch (e) {
    console.error('Failed to load sessions:', e);
  }
}

async function createSession() {
  try {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scopeKey: 'tutor' }),
    });
    const session = await res.json();
    sessions.value.unshift(session);
    activeSessionId.value = session.id;
    messages.value = [];
  } catch (e) {
    console.error('Failed to create session:', e);
  }
}

async function selectSession(sessionId: string) {
  activeSessionId.value = sessionId;
  try {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`);
    messages.value = await res.json();
  } catch (e) {
    console.error('Failed to load messages:', e);
  }
}

async function sendMessage() {
  if (!inputText.value.trim() || !activeSessionId.value || isStreaming.value) return;

  const content = inputText.value.trim();
  inputText.value = '';

  // Add user message
  messages.value.push({
    id: `user-${Date.now()}`,
    role: 'USER',
    content,
    status: 'COMPLETE',
  });

  // Add placeholder for assistant
  const assistantId = `assistant-${Date.now()}`;
  messages.value.push({
    id: assistantId,
    role: 'ASSISTANT',
    content: '',
    status: 'STREAMING',
  });
  streamingContent.value = '';

  scrollToBottom();

  try {
    const res = await fetch(`${API_BASE}/sessions/${activeSessionId.value}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const { assistantMessageId } = await res.json();
    connectSSE(assistantMessageId);
  } catch (e) {
    console.error('Failed to send message:', e);
  }
}

function connectSSE(messageId: string) {
  const eventSource = new EventSource(`${API_BASE}/stream/${messageId}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'token') {
        streamingContent.value += data.data.content;
        scrollToBottom();
      } else if (data.type === 'final' || data.type === 'error') {
        const lastMsg = messages.value[messages.value.length - 1];
        if (lastMsg) {
          lastMsg.content = streamingContent.value;
          lastMsg.status = 'COMPLETE';
        }
        streamingContent.value = '';
        eventSource.close();
      }
    } catch (e) {
      console.error('SSE parse error:', e);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    const lastMsg = messages.value[messages.value.length - 1];
    if (lastMsg && lastMsg.status === 'STREAMING') {
      lastMsg.content = streamingContent.value;
      lastMsg.status = 'COMPLETE';
    }
    streamingContent.value = '';
  };
}

function scrollToBottom() {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    }
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

function formatContent(content: string, streaming: string): string {
  const text = streaming || content;
  return text.replace(/\n/g, '<br>');
}
</script>