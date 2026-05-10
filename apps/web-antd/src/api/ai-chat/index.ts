import { requestClient } from '../request';
import { useAccessStore } from '@vben/stores';
import { useAppConfig } from '@vben/hooks';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

// ==================== Types ====================

export interface ChatSession {
  id: string;
  title: string;
  scopeKey: string;
  defaultAgentId?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  agentId?: string;
  status: 'STREAMING' | 'COMPLETE' | 'FAILED';
  createdAt: string;
}

export interface ChatMessageEvent {
  type: 'token' | 'final' | 'error';
  messageId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface ScopeInfo {
  key: string;
  displayName: string;
  description?: string;
  icon?: string;
  agents: Array<{
    id: string;
    displayName: string;
    description: string;
    icon: string;
    category: string;
  }>;
}

// ==================== Non-streaming API ====================

export async function listScopes(): Promise<{ scopes: ScopeInfo[] }> {
  return requestClient.get('/ai-chat/scopes');
}

export async function listSessions(
  scopeKey?: string,
): Promise<{ items: ChatSession[]; total: number }> {
  const params = scopeKey ? { scopeKey } : {};
  return requestClient.get('/ai-chat/sessions', { params });
}

export async function createSession(data: {
  scopeKey: string;
  title?: string;
  defaultAgentId?: string;
}): Promise<{ session: ChatSession }> {
  return requestClient.post('/ai-chat/sessions', data);
}

export async function getSession(
  sessionId: string,
): Promise<{ session: ChatSession; messages: ChatMessage[] }> {
  return requestClient.get(`/ai-chat/sessions/${sessionId}`);
}

export async function updateSession(
  sessionId: string,
  data: { title?: string },
): Promise<{ session: ChatSession | null }> {
  return requestClient.patch(`/ai-chat/sessions/${sessionId}`, data);
}

export async function deleteSession(
  sessionId: string,
): Promise<{ success: boolean }> {
  return requestClient.delete(`/ai-chat/sessions/${sessionId}`);
}

export async function getMessages(
  sessionId: string,
  limit?: number,
): Promise<{ messages: ChatMessage[] }> {
  const params = limit ? { limit } : {};
  return requestClient.get(`/ai-chat/sessions/${sessionId}/messages`, {
    params,
  });
}

export async function stopMessage(
  messageId: string,
): Promise<{ success: boolean }> {
  return requestClient.post(`/ai-chat/messages/${messageId}/stop`);
}

// ==================== SSE Streaming API ====================

/**
 * Send a message and receive streaming response via POST+SSE.
 * Uses fetch + ReadableStream since EventSource only supports GET.
 */
export async function* sendMessageStream(
  sessionId: string,
  body: { content: string },
  signal?: AbortSignal,
): AsyncGenerator<ChatMessageEvent> {
  const token = useAccessStore().accessToken;
  const url = `${apiURL}/ai-chat/sessions/${sessionId}/messages/stream`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Stream request failed: ${response.status} ${text}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split by double newline (SSE event boundary)
      const parts = buffer.split('\n\n');
      // Keep the last incomplete part in buffer
      buffer = parts.pop() || '';

      for (const part of parts) {
        const event = parseSSEEvent(part);
        if (event) {
          yield event;
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const event = parseSSEEvent(buffer);
      if (event) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Regenerate a message response via POST+SSE.
 */
export async function* regenerateMessageStream(
  messageId: string,
  signal?: AbortSignal,
): AsyncGenerator<ChatMessageEvent> {
  const token = useAccessStore().accessToken;
  const url = `${apiURL}/ai-chat/messages/${messageId}/regenerate`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Regenerate request failed: ${response.status} ${text}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const event = parseSSEEvent(part);
        if (event) {
          yield event;
        }
      }
    }

    if (buffer.trim()) {
      const event = parseSSEEvent(buffer);
      if (event) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ==================== SSE Parsing ====================

function parseSSEEvent(raw: string): ChatMessageEvent | null {
  const lines = raw.split('\n');
  let eventType = 'message';
  let dataStr = '';

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataStr += line.slice(5).trim();
    } else if (line.startsWith('id:')) {
      // ignore
    }
  }

  if (!dataStr) return null;

  try {
    const parsed = JSON.parse(dataStr);
    // Backend double-encodes: data = JSON.stringify({messageId, data, timestamp})
    // After first parse, parsed.data is still a JSON string — parse it again
    let innerData = parsed.data;
    if (typeof innerData === 'string') {
      try {
        innerData = JSON.parse(innerData);
      } catch {
        /* keep as string */
      }
    }
    return {
      type: (parsed.type || eventType) as ChatMessageEvent['type'],
      messageId: parsed.messageId || '',
      data: innerData || {},
      timestamp: parsed.timestamp || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
