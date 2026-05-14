import type { RouteRecordRaw } from 'vue-router';

import { describe, expect, it } from 'vitest';

import aiStudioRoutes from './ai-studio';

function findChild(
  parent: RouteRecordRaw,
  name: string,
): RouteRecordRaw | undefined {
  return parent.children?.find((child) => child.name === name);
}

describe('AI Studio routes', () => {
  it('exposes tenant config menu for Phase 4 agent and redaction settings', () => {
    const root = aiStudioRoutes[0];
    expect(root).toBeDefined();

    const tenantConfig = findChild(root!, 'AITenantConfig');
    expect(tenantConfig).toBeDefined();
    expect(tenantConfig!.path).toBe('tenant-config');
    expect(tenantConfig!.meta?.appModule).toBe('AI_STUDIO');
    expect(tenantConfig!.meta?.permissions).toContain(
      'AI_STUDIO:TENANT_CONFIG:READ',
    );
    expect(tenantConfig!.component).toBeTypeOf('function');
  });
});
