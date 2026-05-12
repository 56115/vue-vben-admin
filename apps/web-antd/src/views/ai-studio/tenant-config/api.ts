import { requestClient } from '#/api/request';

export interface TenantRedactionRule {
  allowlist?: string[];
  columnOverrides?: Record<string, {
    table: string;
    policy: 'redact' | 'intentional_plaintext_signed';
    signOff?: { actor: string; reason: string; ts: number };
  }>;
}

export interface CoverageRegistryColumn {
  table: string;
  column: string;
  policy: string;
  description: string;
}

export const tenantConfigApi = {
  getConfig() {
    return requestClient.get<{ redaction: TenantRedactionRule | null; agentToggles: any[] }>(
      '/api/ai-studio/tenant-config/redaction',
    );
  },
  updateRedactionRule(rule: TenantRedactionRule) {
    return requestClient.put<{ merged: { columnOverrides: string[] } }>(
      '/api/ai-studio/tenant-config/redaction',
      rule,
    );
  },
  getCoverageRegistry() {
    return requestClient.get<{ columns: CoverageRegistryColumn[] }>(
      '/api/ai-studio/tenant-config/redaction/registry',
    );
  },
};
