import type { RouteRecordRaw } from 'vue-router';

/**
 * 运营管理模块路由
 *
 * 运营人员日常操作：员工任务分配、安全管控
 * 渠道相关功能已移到「渠道中心」
 */
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:setting-outlined',
      order: 4,
      title: '运营管理',
      appModule: 'OPERATIONS',
    },
    name: 'Operations',
    path: '/operations',
    redirect: '/operations/employee-task',
    children: [
      {
        name: 'OperationsEmployeeTask',
        path: 'employee-task',
        component: () => import('#/views/operations/employee-task/index.vue'),
        meta: {
          icon: 'ant-design:solution-outlined',
          title: '员工任务',
          appModule: 'OPERATIONS',
          permissions: [
            'OPERATIONS:EMPLOYEE_TASK:VIEW',
            'CRM:EMPLOYEE_TASK:VIEW',
          ],
        },
      },
      {
        name: 'OperationsEmployeeTaskStatistics',
        path: 'employee-task/statistics',
        component: () =>
          import('#/views/operations/employee-task/statistics.vue'),
        meta: {
          icon: 'ant-design:bar-chart-outlined',
          title: '员工任务统计',
          appModule: 'OPERATIONS',
          permissions: [
            'OPERATIONS:EMPLOYEE_TASK:VIEW',
            'CRM:EMPLOYEE_TASK:VIEW',
          ],
          hideInMenu: true,
        },
      },
      {
        name: 'OperationsAntiHarassment',
        path: 'anti-harassment',
        component: () => import('#/views/operations/anti-harassment/index.vue'),
        meta: {
          icon: 'ant-design:safety-outlined',
          title: '安全管控',
          appModule: 'OPERATIONS',
          permissions: [
            'OPERATIONS:ANTI_HARASSMENT:VIEW',
            'CRM:ANTI_HARASSMENT:VIEW',
          ],
        },
      },
      {
        name: 'OperationsAntiHarassmentStatistics',
        path: 'anti-harassment/statistics',
        component: () =>
          import('#/views/operations/anti-harassment/statistics.vue'),
        meta: {
          icon: 'ant-design:bar-chart-outlined',
          title: '安全管控统计',
          appModule: 'OPERATIONS',
          permissions: [
            'OPERATIONS:ANTI_HARASSMENT:VIEW',
            'CRM:ANTI_HARASSMENT:VIEW',
          ],
          hideInMenu: true,
        },
      },
      {
        name: 'OperationsAntiHarassmentWhitelist',
        path: 'anti-harassment/whitelist',
        component: () =>
          import('#/views/operations/anti-harassment/whitelist.vue'),
        meta: {
          icon: 'ant-design:safety-outlined',
          title: '白名单管理',
          appModule: 'OPERATIONS',
          permissions: [
            'OPERATIONS:ANTI_HARASSMENT:VIEW',
            'CRM:ANTI_HARASSMENT:VIEW',
          ],
          hideInMenu: true,
        },
      },
      {
        name: 'OperationsAntiHarassmentBlacklist',
        path: 'anti-harassment/blacklist',
        component: () =>
          import('#/views/operations/anti-harassment/blacklist.vue'),
        meta: {
          icon: 'ant-design:stop-outlined',
          title: '黑名单管理',
          appModule: 'OPERATIONS',
          permissions: [
            'OPERATIONS:ANTI_HARASSMENT:VIEW',
            'CRM:ANTI_HARASSMENT:VIEW',
          ],
          hideInMenu: true,
        },
      },
      {
        name: 'OperationsAntiHarassmentViolations',
        path: 'anti-harassment/violations',
        component: () =>
          import('#/views/operations/anti-harassment/violations.vue'),
        meta: {
          icon: 'ant-design:warning-outlined',
          title: '违规记录',
          appModule: 'OPERATIONS',
          permissions: [
            'OPERATIONS:ANTI_HARASSMENT:VIEW',
            'CRM:ANTI_HARASSMENT:VIEW',
          ],
          hideInMenu: true,
        },
      },
    ],
  },
];

export default routes;
