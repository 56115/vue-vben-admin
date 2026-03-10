import type { RouteRecordRaw } from 'vue-router';

/**
 * AI 教师路由 - Phase 1 重组版
 * 精简为 5 个核心功能：
 * 1. 拍照批改（合并题目识别+作业批改）
 * 2. 数学计算器
 * 3. 智能辅导
 * 4. 批改历史
 * 5. 题库管理
 */
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:robot-outlined',
      order: 5,
      title: 'AI 教师',
      appModule: 'LMS',
    },
    name: 'AITutor',
    path: '/ai-tutor',
    redirect: '/ai-tutor/quick-grading',
    children: [
      // ⭐ 1. 拍照批改 - 高频入口（合并题目识别+作业批改）
      {
        name: 'QuickGrading',
        path: 'quick-grading',
        component: () => import('#/views/ai-tutor/quick-grading/index.vue'),
        meta: {
          icon: 'ant-design:camera-outlined',
          title: '拍照批改',
          appModule: 'LMS',
          permissions: ['LMS:TUTOR:USE'],
        },
      },

      // 2. 数学计算器
      {
        name: 'MathCalculator',
        path: 'calculator',
        component: () => import('#/views/ai-tutor/calculator/index.vue'),
        meta: {
          icon: 'ant-design:calculator-outlined',
          title: '数学计算器',
          appModule: 'LMS',
          permissions: ['LMS:TUTOR:USE'],
        },
      },

      // 3. 智能辅导
      {
        name: 'AITutorChat',
        path: 'chat',
        component: () => import('#/views/ai-tutor/chat/index.vue'),
        meta: {
          icon: 'ant-design:message-outlined',
          title: '智能辅导',
          appModule: 'LMS',
          permissions: ['LMS:TUTOR:USE'],
        },
      },

      // 4. 批改历史
      {
        name: 'GradingHistory',
        path: 'grading-history',
        component: () => import('#/views/ai-tutor/grading-history/index.vue'),
        meta: {
          icon: 'ant-design:history-outlined',
          title: '批改历史',
          appModule: 'LMS',
          permissions: ['LMS:TUTOR:USE'],
        },
      },

      // 批改详情（隐藏菜单，保留功能）
      {
        name: 'GradingDetail',
        path: 'grading/:id',
        component: () => import('#/views/ai-tutor/grading-detail/index.vue'),
        meta: {
          title: '批改详情',
          appModule: 'LMS',
          permissions: ['LMS:TUTOR:USE'],
          hideInMenu: true,
          activeMenu: '/ai-tutor/grading-history',
        },
      },

      // 5. 题库管理
      {
        name: 'QuestionBank',
        path: 'question-bank',
        component: () => import('#/views/ai-tutor/question-bank/index.vue'),
        meta: {
          icon: 'ant-design:database-outlined',
          title: '题库管理',
          appModule: 'LMS',
          permissions: ['LMS:QUESTION_BANK:LIST', 'LMS:QUESTION_BANK:VIEW'],
        },
      },

      // ==================== 旧路由保留（用于兼容性，隐藏菜单）====================
      // 这些路由已通过 redirects.ts 重定向到新位置

      // 旧：题目识别 → 新：拍照批改
      {
        name: 'OcrRecognition',
        path: 'ocr',
        component: () => import('#/views/ai-tutor/ocr/index.vue'),
        meta: {
          title: '题目识别',
          appModule: 'LMS',
          permissions: ['LMS:TUTOR:USE'],
          hideInMenu: true,
        },
      },

      // 旧：作业批改 → 新：拍照批改
      {
        name: 'HomeworkGrading',
        path: 'homework',
        component: () => import('#/views/ai-tutor/homework/index.vue'),
        meta: {
          title: '作业批改',
          appModule: 'LMS',
          permissions: ['LMS:TUTOR:USE'],
          hideInMenu: true,
        },
      },

      // 旧：试卷分析 → 新：AI 学习医生 > 诊断中心
      {
        name: 'PaperAnalysis',
        path: 'paper',
        component: () => import('#/views/ai-tutor/paper/index.vue'),
        meta: {
          title: '试卷分析',
          appModule: 'LMS',
          permissions: ['LMS:TUTOR:USE'],
          hideInMenu: true,
        },
      },

      // 旧：学习进度 → 新：成长档案
      {
        name: 'LearningProgress',
        path: 'progress',
        component: () => import('#/views/ai-tutor/progress/index.vue'),
        meta: {
          title: '学习进度',
          appModule: 'LMS',
          permissions: ['LMS:STUDENT:VIEW'],
          hideInMenu: true,
        },
      },

      // 旧：错题本 → 新：AI 学习医生 > 复诊追踪
      {
        name: 'MistakeBook',
        path: 'mistakes',
        component: () => import('#/views/ai-tutor/mistakes/index.vue'),
        meta: {
          title: '错题本',
          appModule: 'LMS',
          permissions: ['LMS:TUTOR:USE'],
          hideInMenu: true,
        },
      },

      // 旧：错题审核 → 新：AI 学习医生 > 复诊追踪
      {
        name: 'MistakeReview',
        path: 'mistake-review',
        meta: {
          title: '错题审核',
          appModule: 'LMS',
          permissions: ['LMS:TUTOR:USE'],
          hideInMenu: true,
        },
        children: [
          {
            name: 'MistakeList',
            path: '',
            component: () =>
              import('#/views/ai-tutor/mistake-review/MistakeListPage.vue'),
            meta: {
              title: '错题列表',
              appModule: 'LMS',
              permissions: ['LMS:TUTOR:USE'],
              hideInMenu: true,
            },
          },
          {
            name: 'MistakeDetail',
            path: ':mistakeId',
            component: () =>
              import('#/views/ai-tutor/mistake-review/MistakeDetailPage.vue'),
            meta: {
              title: '错题详情',
              appModule: 'LMS',
              permissions: ['LMS:TUTOR:USE'],
              hideInMenu: true,
              activeMenu: '/ai-tutor/mistake-review',
            },
          },
        ],
      },

      // 旧：题库导入 → 新：题库管理
      {
        name: 'QuestionBankImport',
        path: 'question-import',
        component: () =>
          import('#/views/ai-tutor/mistake-review/QuestionBankImportPage.vue'),
        meta: {
          title: '题库导入',
          appModule: 'LMS',
          permissions: ['LMS:QUESTION_BANK:IMPORT'],
          hideInMenu: true,
        },
      },
    ],
  },
];

export default routes;
