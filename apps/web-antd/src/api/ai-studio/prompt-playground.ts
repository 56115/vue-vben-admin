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
 * 返回 EventSource 用于接收流式响应
 */
export function createLlmTestStream(
  templateId: string,
  params: TestPromptWithLlmParams,
  onEvent: (event: LlmStreamEvent) => void,
  onError?: (error: Error) => void,
  onComplete?: () => void,
): { abort: () => void } {
  // 由于 SSE 需要 GET 请求，我们需要使用 POST 端点并轮询
  // 或者使用 fetch API 处理 SSE
  const controller = new AbortController();

  const startStream = async () => {
    try {
      // 使用同步 API 进行测试（简化实现）
      // 生产环境应该使用真正的 SSE 或 WebSocket
      const result = await testPromptWithLlmSync(templateId, params);

      // 模拟流式事件
      onEvent({
        type: LlmStreamEventType.START,
        data: {
          model: result.model,
          renderedPrompt: result.renderedPrompt,
        },
        timestamp: Date.now(),
      });

      if (result.response) {
        // 模拟逐字输出
        for (let i = 0; i < result.response.length; i += 10) {
          if (controller.signal.aborted) break;
          const chunk = result.response.slice(
            i,
            Math.min(i + 10, result.response.length),
          );
          onEvent({
            type: LlmStreamEventType.CONTENT,
            data: { content: chunk },
            timestamp: Date.now(),
          });
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      onEvent({
        type: LlmStreamEventType.DONE,
        data: {
          content: result.response,
          model: result.model,
          usage: result.tokenUsage,
          latencyMs: result.latencyMs,
        },
        timestamp: Date.now(),
      });

      onComplete?.();
    } catch (error) {
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
