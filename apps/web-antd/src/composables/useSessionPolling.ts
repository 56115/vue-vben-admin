import type { Ref } from 'vue';

import { requestClient } from '#/api/request';

/**
 * AsyncTaskSession 视图（来自 shared-async-task 的 /async-task-sessions/:id）。
 */
export interface SessionView {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  overallProgress: number;
  tasks: Array<{
    type: string;
    label: string;
    status: string;
    progress: number;
    error: string | null;
  }>;
  result: Record<string, unknown> | null;
  error: string | null;
}

/**
 * 前端进度展示视图。与页面里的 syncProgress ref 对齐。
 */
export interface SessionProgress {
  title: string;
  percent: number;
  status: 'active' | 'completed' | 'failed';
  total?: number;
  processed?: number;
}

export interface UseSessionPollingOptions {
  /** 进度展示用的标题前缀（RUNNING 阶段会拼上当前 task label）。*/
  titlePrefix?: string;
  /** 轮询间隔，默认 1000 ms。网络错误时用 2000 ms 退避。*/
  pollIntervalMs?: number;
  errorRetryMs?: number;
  /** 完成后清理进度条的延迟，默认 2000 ms。*/
  completeClearMs?: number;
}

/**
 * AsyncTaskSession 通用轮询封装。
 *
 * - 调 `GET /async-task-sessions/:sessionId` 拉最新状态
 * - 将 SessionView 拍平成 `SessionProgress` 写到传入的 ref
 * - COMPLETED / FAILED 自动停止轮询并回调 onComplete / onError
 * - `stop()` 方法用于页面 unmount 或用户手动停止
 *
 * 设计目的（计划回填 PF-6 的延伸）：operations 和 system 两个 wecom-sync 页面共享这份逻辑，
 * 避免双份复制漂移。后续其它 AsyncTaskSession 消费场景也可直接复用。
 */
export function useSessionPolling(progressRef: Ref<null | SessionProgress>) {
  let timer: null | ReturnType<typeof setTimeout> = null;

  const stop = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const start = (
    sessionId: string,
    onComplete: (result: Record<string, unknown>) => void,
    onError: (error: string) => void,
    options: UseSessionPollingOptions = {},
  ) => {
    const titlePrefix = options.titlePrefix ?? '同步进行中';
    const pollIntervalMs = options.pollIntervalMs ?? 1000;
    const errorRetryMs = options.errorRetryMs ?? 2000;
    const completeClearMs = options.completeClearMs ?? 2000;

    const poll = async () => {
      try {
        const session = await requestClient.get<SessionView>(
          `/async-task-sessions/${sessionId}`,
        );

        const runningTask = session.tasks.find((t) => t.status === 'RUNNING');
        const currentLabel = runningTask?.label || '准备中...';

        progressRef.value = {
          title: `${titlePrefix} - ${currentLabel}`,
          percent: session.overallProgress,
          status: session.status === 'FAILED' ? 'failed' : 'active',
          total: session.tasks.length,
          processed: session.tasks.filter((t) => t.status === 'COMPLETED').length,
        };

        if (session.status === 'COMPLETED') {
          progressRef.value = {
            ...progressRef.value,
            percent: 100,
            status: 'completed',
          };
          setTimeout(() => {
            progressRef.value = null;
          }, completeClearMs);
          onComplete(session.result || {});
          return;
        }
        if (session.status === 'FAILED') {
          setTimeout(() => {
            progressRef.value = null;
          }, completeClearMs);
          onError(session.error || '同步失败');
          return;
        }

        timer = setTimeout(poll, pollIntervalMs);
      } catch (error) {
        console.error('轮询会话状态失败', error);
        timer = setTimeout(poll, errorRetryMs);
      }
    };

    stop();
    poll();
  };

  return { start, stop };
}
