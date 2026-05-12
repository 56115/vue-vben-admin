import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:setting-outlined',
      order: 90,
      title: '平台管理',
      // 权限配置：需要订阅 PLATFORM 模块
      appModule: 'PLATFORM',
    },
    name: 'Platform',
    path: '/platform',
    redirect: '/platform/tenant',
    children: [
      {
        name: 'TenantManagement',
        path: 'tenant',
        component: () => import('#/views/platform/tenant/index.vue'),
        meta: {
          icon: 'ant-design:apartment-outlined',
          title: '租户管理',
          appModule: 'PLATFORM',
          permissions: ['PLATFORM:TENANT:LIST'],
        },
      },
      {
        name: 'AppModuleManagement',
        path: 'app-module',
        component: () => import('#/views/platform/app-module/index.vue'),
        meta: {
          icon: 'ant-design:appstore-outlined',
          title: '应用模块',
          appModule: 'PLATFORM',
          permissions: ['PLATFORM:APP_MODULE:MANAGE'],
        },
      },
      {
        name: 'PlatformUserManagement',
        path: 'user',
        component: () => import('#/views/platform/user/index.vue'),
        meta: {
          icon: 'ant-design:user-outlined',
          title: '用户管理',
          appModule: 'PLATFORM',
          permissions: ['PLATFORM:USER:LIST'],
        },
      },
      {
        name: 'PlatformRoleManagement',
        path: 'role',
        component: () => import('#/views/platform/role/index.vue'),
        meta: {
          icon: 'ant-design:safety-outlined',
          title: '角色管理',
          appModule: 'PLATFORM',
          permissions: ['PLATFORM:ROLE:LIST'],
        },
      },
      {
        name: 'SystemConfig',
        path: 'config',
        component: () => import('#/views/platform/config/index.vue'),
        meta: {
          icon: 'ant-design:control-outlined',
          title: '系统配置',
          appModule: 'PLATFORM',
          permissions: ['PLATFORM:SYSTEM:CONFIG'],
        },
      },
      {
        name: 'SystemLogs',
        path: 'logs',
        component: () => import('#/views/platform/logs/index.vue'),
        meta: {
          icon: 'ant-design:file-text-outlined',
          title: '系统日志',
          appModule: 'PLATFORM',
          permissions: ['PLATFORM:AUDIT:LOG'],
        },
      },
      {
        name: 'MastraStudio',
        path: 'mastra-studio',
        component: () => import('#/views/platform/mastra-studio/index.vue'),
        meta: {
          icon: 'ant-design:robot-outlined',
          title: 'AI 调试工具',
          appModule: 'PLATFORM',
          permissions: ['PLATFORM:MASTRA_STUDIO:ACCESS'],
        },
      },
      {
        name: 'PlatformAiConfig',
        path: 'ai-config',
        component: () => import('#/views/platform/ai-config/index.vue'),
        meta: {
          icon: 'ant-design:api-outlined',
          title: 'AI 配置',
          appModule: 'PLATFORM',
          permissions: ['PLATFORM:AI_CONFIG:VIEW'],
        },
      },
    ],
  },
];

export default routes;
