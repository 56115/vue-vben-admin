import type { RouteRecordRaw } from 'vue-router';

/**
 * 系统设置路由
 *
 * 通用系统级配置，不包含渠道相关配置（已移到渠道中心）
 */
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:settings',
      order: 999,
      title: '系统设置',
    },
    name: 'System',
    path: '/system',
    redirect: '/system/settings',
    children: [
      // 渠道配置已移到「渠道中心」，此处保留系统级通用配置入口
      {
        name: 'SystemSettings',
        path: 'settings',
        component: () => import('#/views/_core/fallback/coming-soon.vue'),
        meta: {
          icon: 'lucide:sliders-horizontal',
          title: '通用配置',
        },
      },
    ],
  },
];

export default routes;
