import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearUserCache, getCachedPermissions, getUserInfoApi } from './user';

const getMock = vi.fn();

vi.mock('#/api/request', () => ({
  requestClient: { get: (...args: unknown[]) => getMock(...args) },
}));

describe('user permission cache', () => {
  beforeEach(() => {
    clearUserCache();
    getMock.mockReset().mockResolvedValue({
      id: 1,
      username: 'admin',
      realName: 'Admin',
      avatar: '',
      tenantId: 1,
      tenant: {
        id: 1,
        name: 'Platform',
        code: 'platform',
        status: 'ACTIVE',
        planType: 'ENTERPRISE',
        subscriptions: [
          {
            appModuleCode: 'PLATFORM',
            appModuleName: '平台管理',
            appModuleIcon: 'icon',
            status: 'ACTIVE',
            startAt: '2026-05-12T00:00:00.000Z',
            expiredAt: null,
          },
        ],
      },
      roles: [
        {
          roleId: 1,
          roleName: '只读',
          roleCode: 'READONLY',
          appModuleCode: 'PLATFORM',
          dataScope: 'ALL',
          permissions: ['PLATFORM:TENANT:LIST'],
        },
      ],
    });
  });

  it('caches only role permissions, not subscribed module codes', async () => {
    await getUserInfoApi();

    expect(getCachedPermissions()).toEqual(['PLATFORM:TENANT:LIST']);
    expect(getCachedPermissions()).not.toContain('PLATFORM');
  });
});
