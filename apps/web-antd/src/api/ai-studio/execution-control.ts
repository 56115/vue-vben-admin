import { requestClient } from '../request';

export interface ControlResult {
  success: boolean;
  status?: string;
  intentId?: string;
  reason?: string;
  currentStatus?: string;
}

export interface ResumePayload {
  resumeData?: Record<string, unknown>;
  step?: string;
}

export function suspendExecution(
  pipelineKey: string,
  execId: string | number,
  reason?: string,
) {
  return requestClient.post<ControlResult>(
    `/ai-studio/pipelines/${pipelineKey}/executions/${execId}/suspend`,
    { reason },
  );
}

export function resumeExecution(
  pipelineKey: string,
  execId: string | number,
  payload: ResumePayload = {},
) {
  return requestClient.post<ControlResult>(
    `/ai-studio/pipelines/${pipelineKey}/executions/${execId}/resume`,
    payload,
  );
}

export function cancelExecution(
  pipelineKey: string,
  execId: string | number,
  reason?: string,
) {
  return requestClient.post<ControlResult>(
    `/ai-studio/pipelines/${pipelineKey}/executions/${execId}/cancel`,
    { reason },
  );
}
