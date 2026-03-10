import type { RouteRecordRaw } from 'vue-router';

/**
 * AI 学习医生路由 - Phase 1 重组版
 * 保持 5 个核心功能，增强以下模块：
 * 1. 诊断中心：合并试卷深度分析功能
 * 2. 复诊追踪：合并错题本+错题审核功能
 */
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:medicine-box-outlined',
      order: 6,
      title: 'AI 学习医生',
      appModule: 'LEARNING_DIAGNOSIS',
    },
    name: 'AIDoctor',
    path: '/ai-doctor',
    redirect: '/ai-doctor/diagnosis',
    children: [
      // ⭐ 1. 诊断中心（增强：合并试卷分析功能）
      {
        name: 'DiagnosisCenter',
        path: 'diagnosis',
        component: () => import('#/views/ai-doctor/diagnosis/index.vue'),
        meta: {
          icon: 'ant-design:file-search-outlined',
          title: '诊断中心',
          appModule: 'LEARNING_DIAGNOSIS',
          permissions: [
            'LEARNING_DIAGNOSIS:DIAGNOSIS:VIEW',
            'LEARNING_DIAGNOSIS:DIAGNOSIS:CREATE',
          ],
        },
      },

      // 2. 学习处方
      {
        name: 'PrescriptionList',
        path: 'prescription',
        component: () => import('#/views/ai-doctor/prescription/index.vue'),
        meta: {
          icon: 'ant-design:solution-outlined',
          title: '学习处方',
          appModule: 'LEARNING_DIAGNOSIS',
          permissions: [
            'LEARNING_DIAGNOSIS:PRESCRIPTION:LIST',
            'LEARNING_DIAGNOSIS:PRESCRIPTION:VIEW',
          ],
        },
      },

      // ⭐ 3. 复诊追踪（增强：合并错题本+错题审核）
      {
        name: 'FollowUpTracking',
        path: 'follow-up',
        component: () => import('#/views/ai-doctor/follow-up/index.vue'),
        meta: {
          icon: 'ant-design:reload-outlined',
          title: '复诊追踪',
          appModule: 'LEARNING_DIAGNOSIS',
          permissions: ['LEARNING_DIAGNOSIS:FOLLOW_UP:VIEW'],
        },
      },

      // 4. AI 咨询师
      {
        name: 'CounselorChat',
        path: 'counselor',
        component: () => import('#/views/ai-doctor/counselor/index.vue'),
        meta: {
          icon: 'ant-design:customer-service-outlined',
          title: 'AI 咨询师',
          appModule: 'LEARNING_DIAGNOSIS',
          permissions: ['LEARNING_DIAGNOSIS:COUNSELOR:SESSION'],
        },
      },

      // 4.1 常见问题 FAQ（咨询师子页面）
      {
        name: 'CounselorFAQ',
        path: 'counselor/faq',
        component: () => import('#/views/ai-doctor/counselor/faq/index.vue'),
        meta: {
          icon: 'ant-design:question-circle-outlined',
          title: '常见问题',
          appModule: 'LEARNING_DIAGNOSIS',
          permissions: ['LEARNING_DIAGNOSIS:COUNSELOR:SESSION'],
          hideInMenu: true, // 隐藏在菜单中，但保留路由
        },
      },

      // 5. 家长报告
      {
        name: 'ParentReport',
        path: 'parent-report',
        component: () => import('#/views/ai-doctor/parent-report/index.vue'),
        meta: {
          icon: 'ant-design:file-done-outlined',
          title: '家长报告',
          appModule: 'LEARNING_DIAGNOSIS',
          permissions: ['LEARNING_DIAGNOSIS:COUNSELOR:PARENT_REPORT'],
        },
      },
    ],
  },
];

export default routes;
