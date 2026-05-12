/**
 * Prompt Playground API
 * 提示词测试 Playground 接口
 */
import { requestClient } from '../request';

// ==================== 类型定义 ====================

export interface TestPromptWithLlmParams {
  variables: Record<string, unknown>;
  versionId?: number;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}

export interface TestRenderOnlyParams {
  variables: Record<string, unknown>;
  versionId?: number;
}

export interface LlmTestResult {
  success: boolean;
  renderedPrompt: {
    systemPrompt: string;
    userPrompt: string;
  };
  response?: string;
  model?: string;
  latencyMs: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  errorMessage?: string;
}

export interface RenderOnlyResult {
  success: boolean;
  renderedPrompt: {
    systemPrompt: string;
    userPrompt: string;
  };
  config: Record<string, unknown>;
  variables: Array<{
    name: string;
    value: unknown;
    replaced: boolean;
  }>;
}

export interface TestHistoryStatsParams {
  startDate?: string;
  endDate?: string;
}

export interface TestHistoryStats {
  totalTests: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgLatencyMs: number;
  totalTokens: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  dailyStats: Array<{
    date: string;
    testCount: number;
    successCount: number;
    avgLatencyMs: number;
    totalTokens: number;
  }>;
  modelStats: Array<{
    model: string;
    testCount: number;
    successRate: number;
    avgLatencyMs: number;
  }>;
}

// LLM 流式事件类型
export enum LlmStreamEventType {
  START = 'start',
  CONTENT = 'content',
  THINKING = 'thinking',
  TOOL_CALL = 'tool_call',
  DONE = 'done',
  ERROR = 'error',
}

export interface LlmStreamEvent {
  type: LlmStreamEventType;
  data: {
    content?: string;
    model?: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    latencyMs?: number;
    error?: string;
    renderedPrompt?: {
      systemPrompt: string;
      userPrompt: string;
    };
  };
  timestamp: number;
}

// ==================== API ====================

/**
 * LLM 测试（同步返回）
 */
export async function testPromptWithLlmSync(
  templateId: string,
  params: TestPromptWithLlmParams,
) {
  return requestClient.post<LlmTestResult>(
    `/prompt-templates/${templateId}/test-llm-sync`,
    params,
  );
}

/**
 * 仅渲染预览（不调用 LLM）
 */
export async function testPromptRenderOnly(
  templateId: string,
  params: TestRenderOnlyParams,
) {
  return requestClient.post<RenderOnlyResult>(
    `/prompt-templates/${templateId}/test-render`,
    params,
  );
}

/**
 * 获取测试历史统计
 */
export async function getTestHistoryStats(
  templateId: string,
  params?: TestHistoryStatsParams,
) {
  return requestClient.get<TestHistoryStats>(
    `/prompt-templates/${templateId}/test-history/stats`,
    { params },
  );
}

/**
 * 创建 SSE 流式测试连接
 * 使用 fetch + ReadableStream 读取后端 SSE 流，支持 JWT Authorization 头
 *
 * 后端端点: GET /ai-studio/prompt-templates/:id/playground/stream
 * SSE 事件类型: meta | token | done | error
 */
export function createLlmTestStream(
  templateId: string,
  params: TestPromptWithLlmParams,
  onEvent: (event: LlmStreamEvent) => void,
  onError?: (error: Error) => void,
  onComplete?: () => void,
): { abort: () => void } {
  const controller = new AbortController();

  const startStream = async () => {
    try {
      // 从 access store 读取 token（与 requestClient 同一来源）
      const { useAccessStore } = await import('@vben/stores');
      const accessStore = useAccessStore();
      const token = accessStore.accessToken;

      // 构建查询参数
      const query = new URLSearchParams();
      query.set('variables', JSON.stringify(params.variables));
      if (params.model) query.set('model', params.model);
      if (params.temperature !== undefined)
        query.set('temperature', String(params.temperature));
      if (params.maxTokens !== undefined)
        query.set('maxTokens', String(params.maxTokens));

      const url = `${import.meta.env.VITE_GLOB_API_URL || ''}/ai-studio/prompt-templates/${templateId}/playground/stream?${query.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE request failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      // SSE 解析状态
      let buffer = '';
      let metaReceived = false;

      const decoder = new TextDecoder();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (controller.signal.aborted) break;

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 按行分割处理 SSE 事件
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留未完整行

        let currentEventType = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.slice(5).trim();
          } else if (line === '' && currentEventType) {
            // 事件结束，处理
            handleSseEvent(
              currentEventType,
              currentData,
              onEvent,
              () => {
                metaReceived = true;
              },
            );
            currentEventType = '';
            currentData = '';
          }
        }
      }

      // 处理 buffer 中剩余内容
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        let currentEventType = '';
        let currentData = '';
        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.slice(5).trim();
          }
        }
        if (currentEventType) {
          handleSseEvent(currentEventType, currentData, onEvent, () => {
            metaReceived = true;
          });
        }
      }

      if (!metaReceived) {
        // 没有收到任何事件，但流正常结束
        onEvent({
          type: LlmStreamEventType.DONE,
          data: {},
          timestamp: Date.now(),
        });
      }

      onComplete?.();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // 用户主动取消，不触发 error 回调
        onComplete?.();
        return;
      }
      onEvent({
        type: LlmStreamEventType.ERROR,
        data: { error: (error as Error).message },
        timestamp: Date.now(),
      });
      onError?.(error as Error);
    }
  };

  startStream();

  return {
    abort: () => controller.abort(),
  };
}

/**
 * 解析单个 SSE 事件并转换为 LlmStreamEvent
 */
function handleSseEvent(
  eventType: string,
  data: string,
  onEvent: (event: LlmStreamEvent) => void,
  _onMeta: () => void,
): void {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(data);
  } catch {
    // 非 JSON 数据，当作纯文本
  }

  switch (eventType) {
    case 'meta': {
      _onMeta();
      onEvent({
        type: LlmStreamEventType.START,
        data: {
          renderedPrompt: payload.renderedPrompt as
            | { systemPrompt: string; userPrompt: string }
            | undefined,
          usage: payload.tokensIn
            ? {
                promptTokens: Number(payload.tokensIn),
                completionTokens: Number(payload.tokensOut || 0),
                totalTokens:
                  Number(payload.tokensIn) + Number(payload.tokensOut || 0),
              }
            : undefined,
        },
        timestamp: Date.now(),
      });
      break;
    }
    case 'token': {
      onEvent({
        type: LlmStreamEventType.CONTENT,
        data: { content: String(payload.delta || '') },
        timestamp: Date.now(),
      });
      break;
    }
    case 'done': {
      onEvent({
        type: LlmStreamEventType.DONE,
        data: {},
        timestamp: Date.now(),
      });
      break;
    }
    case 'error': {
      onEvent({
        type: LlmStreamEventType.ERROR,
        data: { error: String(payload.error || 'Unknown SSE error') },
        timestamp: Date.now(),
      });
      break;
    }
  }
}
