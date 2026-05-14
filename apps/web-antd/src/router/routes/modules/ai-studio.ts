import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:experiment-outlined',
      order: 7,
      title: 'AI 工作室',
      appModule: 'AI_STUDIO',
    },
    name: 'AIStudio',
    path: '/ai-studio',
    redirect: '/ai-studio/pipeline',
    children: [
      {
        name: 'AIPipeline',
        path: 'pipeline',
        component: () => import('#/views/ai-studio/pipeline/index.vue'),
        meta: {
          icon: 'ant-design:apartment-outlined',
          title: '流程管理',
          appModule: 'AI_STUDIO',
          permissions: ['AI_STUDIO:PIPELINE:LIST'],
        },
      },
      {
        name: 'AIPipelineEdit',
        path: 'pipeline/edit/:key',
        component: () => import('#/views/ai-studio/pipeline/edit.vue'),
        meta: {
          hideInMenu: true,
          title: '设计流程',
          appModule: 'AI_STUDIO',
          permissions: ['AI_STUDIO:PIPELINE:EDIT'],
        },
      },
      {
        name: 'AIPipelineTune',
        path: 'pipeline/tune/:key',
        component: () => import('#/views/ai-studio/pipeline/tune.vue'),
        meta: {
          hideInMenu: true,
          title: '参数调优',
          appModule: 'AI_STUDIO',
          permissions: ['AI_STUDIO:PIPELINE:EDIT'],
        },
      },
      {
        name: 'AIPrompt',
        path: 'prompt',
        component: () => import('#/views/ai-studio/prompt/index.vue'),
        meta: {
          icon: 'ant-design:file-text-outlined',
          title: '提示词管理',
          appModule: 'AI_STUDIO',
          permissions: ['AI_STUDIO:PROMPT:LIST'],
        },
      },
      {
        name: 'AIPromptEdit',
        path: 'prompt/edit/:id?',
        component: () => import('#/views/ai-studio/prompt/edit.vue'),
        meta: {
          hideInMenu: true,
          title: '编辑提示词',
          appModule: 'AI_STUDIO',
          permissions: ['AI_STUDIO:PROMPT:EDIT'],
        },
      },
      {
        name: 'AIPromptPlayground',
        path: 'prompt/playground/:id?',
        component: () => import('#/views/ai-studio/prompt/playground.vue'),
        meta: {
          hideInMenu: true,
          title: '提示词测试',
          appModule: 'AI_STUDIO',
          permissions: ['AI_STUDIO:PROMPT:TEST'],
        },
      },
      {
        name: 'AIComponent',
        path: 'component',
        component: () => import('#/views/ai-studio/component/index.vue'),
        meta: {
          icon: 'ant-design:appstore-outlined',
          title: '组件管理',
          appModule: 'AI_STUDIO',
          permissions: ['AI_STUDIO:COMPONENT:LIST'],
        },
      },
      {
        name: 'AIExecution',
        path: 'execution',
        component: () => import('#/views/ai-studio/execution/index.vue'),
        meta: {
          icon: 'ant-design:play-circle-outlined',
          title: '执行管理',
          appModule: 'AI_STUDIO',
          permissions: ['AI_STUDIO:EXECUTION:LIST'],
        },
      },
      {
        name: 'AITrace',
        path: 'trace',
        component: () => import('#/views/ai-studio/trace/index.vue'),
        meta: {
          icon: 'ant-design:branches-outlined',
          title: 'Trace Viewer',
          appModule: 'AI_STUDIO',
          permissions: ['AI_STUDIO:TRACE:LIST'],
        },
      },
      {
        name: 'AITraceDetail',
        path: 'trace/:traceId',
        component: () => import('#/views/ai-studio/trace/detail.vue'),
        meta: {
          hideInMenu: true,
          title: 'Trace 详情',
          appModule: 'AI_STUDIO',
          permissions: ['AI_STUDIO:TRACE:VIEW'],
        },
      },
      {
        name: 'AIMetrics',
        path: 'metrics',
        component: () => import('#/views/ai-studio/metrics/index.vue'),
        meta: {
          icon: 'ant-design:dashboard-outlined',
          title: '性能指标',
          appModule: 'AI_STUDIO',
          permissions: ['AI_STUDIO:METRICS:DASHBOARD'],
        },
      },
      {
        name: 'AICost',
        path: 'cost',
        component: () => import('#/views/ai-studio/cost/index.vue'),
        meta: {
          icon: 'ant-design:dollar-outlined',
          title: '成本看板',
          appModule: 'AI_STUDIO',
          permissions: ['AI_STUDIO:METRICS:COST'],
        },
      },
      {
        name: 'AITenantConfig',
        path: 'tenant-config',
        component: () => import('#/views/ai-studio/tenant-config/index.vue'),
        meta: {
          icon: 'ant-design:setting-outlined',
          title: '租户配置',
          appModule: 'AI_STUDIO',
          permissions: ['AI_STUDIO:TENANT_CONFIG:READ'],
        },
      },
    ],
  },
];

export default routes;
