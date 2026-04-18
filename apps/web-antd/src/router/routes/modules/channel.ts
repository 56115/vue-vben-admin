import type { RouteRecordRaw } from 'vue-router';

/**
 * 渠道中心路由
 *
 * 渠道是 OmniReach 的核心业务域，统一管理所有外部渠道：
 * - 配置域：连接各渠道（企业微信、小红书、抖音等）
 * - 同步域：执行数据拉取
 * - 记录域：查看任务和统计
 * - 资产域：管理同步过来的数据资产
 */
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:apartment-outlined',
      order: 5,
      title: '渠道中心',
    },
    name: 'Channel',
    path: '/channel',
    redirect: '/channel/config',
    children: [
      {
        name: 'ChannelConfig',
        path: 'config',
        component: () => import('#/views/channel/config/index.vue'),
        meta: {
          icon: 'ant-design:tool-outlined',
          title: '渠道配置',
          permissions: ['CHANNEL:WECOM:VIEW'],
        },
      },
      {
        name: 'ChannelSync',
        path: 'sync',
        component: () => import('#/views/channel/sync/index.vue'),
        meta: {
          icon: 'ant-design:cloud-sync-outlined',
          title: '数据同步',
          permissions: ['CHANNEL:WECOM:SYNC'],
        },
      },
      {
        name: 'ChannelRecords',
        path: 'records',
        component: () => import('#/views/channel/records/index.vue'),
        meta: {
          icon: 'ant-design:history-outlined',
          title: '同步记录',
          permissions: ['CHANNEL:RECORD:VIEW'],
        },
      },
      {
        name: 'ChannelAssets',
        path: 'assets',
        component: () => import('#/views/channel/assets/index.vue'),
        meta: {
          icon: 'ant-design:database-outlined',
          title: '渠道资产',
          permissions: ['CHANNEL:ASSET:VIEW'],
        },
      },
      // 子页面路由（实际功能页面）
      {
        name: 'ChannelConfigWecom',
        path: 'config/wecom',
        component: () => import('#/views/system/wecom-config/index.vue'),
        meta: {
          icon: 'ant-design:wechat-outlined',
          title: '企业微信配置',
          permissions: ['CHANNEL:WECOM:VIEW'],
          hideInMenu: true,
        },
      },
      {
        name: 'ChannelSyncWecom',
        path: 'sync/wecom',
        component: () => import('#/views/operations/wecom-sync/index.vue'),
        meta: {
          icon: 'ant-design:cloud-sync-outlined',
          title: '企微同步',
          permissions: ['CHANNEL:WECOM:SYNC'],
          hideInMenu: true,
        },
      },
      {
        name: 'ChannelSyncMember',
        path: 'sync/member',
        component: () => import('#/views/operations/member-sync/member-sync.vue'),
        meta: {
          icon: 'ant-design:sync-outlined',
          title: '会员同步',
          permissions: ['CHANNEL:WECOM:SYNC'],
          hideInMenu: true,
        },
      },
      {
        name: 'ChannelRecordsStatistics',
        path: 'records/statistics',
        component: () => import('#/views/system/wecom-sync/statistics.vue'),
        meta: {
          icon: 'ant-design:bar-chart-outlined',
          title: '统计分析',
          permissions: ['CHANNEL:RECORD:VIEW'],
          hideInMenu: true,
        },
      },
      {
        name: 'ChannelRecordsTasks',
        path: 'records/tasks',
        component: () => import('#/views/_core/fallback/coming-soon.vue'),
        meta: {
          icon: 'ant-design:unordered-list-outlined',
          title: '任务记录',
          permissions: ['CHANNEL:RECORD:VIEW'],
          hideInMenu: true,
        },
      },
      {
        name: 'ChannelAssetsUsers',
        path: 'assets/users',
        component: () => import('#/views/system/wecom-users/index.vue'),
        meta: {
          icon: 'ant-design:team-outlined',
          title: '员工管理',
          permissions: ['CHANNEL:ASSET:VIEW'],
          hideInMenu: true,
        },
      },
      {
        name: 'ChannelAssetsGroups',
        path: 'assets/groups',
        component: () => import('#/views/_core/fallback/coming-soon.vue'),
        meta: {
          icon: 'ant-design:usergroup-add-outlined',
          title: '群聊管理',
          permissions: ['CHANNEL:ASSET:VIEW'],
          hideInMenu: true,
        },
      },
    ],
  },
];

export default routes;
