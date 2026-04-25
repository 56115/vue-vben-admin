// apps/web/apps/web-antd/src/api/wecom-sync.ts
import { requestClient } from '#/api/request';

export interface SyncTaskItem {
  type: string;
  label: string;
  status: string;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface SyncSessionItem {
  id: string;
  type: string;
  typeLabel: string;
  status: string;
  triggeredBy: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  tasks: SyncTaskItem[];
  error: string | null;
}

export interface SyncSessionListResult {
  items: SyncSessionItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SyncSessionQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export function fetchSyncSessions(
  query: SyncSessionQuery,
): Promise<SyncSessionListResult> {
  return requestClient.get('/operations/wecom-sync/sessions', {
    params: query,
  });
}
