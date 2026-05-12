import { requestClient } from '#/api/request';

export interface AuditLogRow {
  id: string;
  scope: 'PLATFORM' | 'TENANT';
  action: string;
  resource: string;
  actorUserId: string | null;
  targetTenantId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export const auditApi = {
  list(params: {
    page?: number;
    pageSize?: number;
    action?: string;
    resource?: string;
    scope?: 'TENANT' | 'PLATFORM';
    fromDate?: string;
    toDate?: string;
  }) {
    return requestClient.get<{ items: AuditLogRow[]; total: number }>(
      '/api/ai-studio/audit-logs',
      { params },
    );
  },
  detail(id: string) {
    return requestClient.get<AuditLogRow>(`/api/ai-studio/audit-logs/${id}`);
  },
};
