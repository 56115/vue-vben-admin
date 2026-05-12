import { describe, expect, it } from 'vitest';

import platformRoutes from './platform';

describe('platform app module route access', () => {
  it('requires APP_MODULE:MANAGE for /platform/app-module', () => {
    const platformRoot = platformRoutes.find(
      (route) => route.path === '/platform',
    );
    const appModuleRoute = platformRoot?.children?.find(
      (route) => route.name === 'AppModuleManagement',
    );

    expect(appModuleRoute?.meta?.appModule).toBe('PLATFORM');
    expect(appModuleRoute?.meta?.permissions).toEqual([
      'PLATFORM:APP_MODULE:MANAGE',
    ]);
  });
});
