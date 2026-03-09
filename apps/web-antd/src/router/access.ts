import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import type { RouteRecordRaw } from 'vue-router';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';
import { filterTree } from '@vben/utils';

import { message } from 'ant-design-vue';

import { getAllMenusApi } from '#/api';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';
import { hasAppModule } from '#/utils/permissions';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

/**
 * 按租户订阅过滤路由：移除用户未订阅模块的路由
 * 无 appModule 标记的路由（如 Dashboard、个人中心）始终保留
 */
function filterRoutesBySubscription(
  routes: RouteRecordRaw[],
): RouteRecordRaw[] {
  return filterTree(routes, (route) => {
    const appModule = route.meta?.appModule as string | undefined;
    if (!appModule) return true;
    return hasAppModule(appModule);
  });
}

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    // 按订阅过滤路由，未订阅模块的路由不生成菜单
    routes: filterRoutesBySubscription(options.routes),
    fetchMenuListAsync: async () => {
      message.loading({
        content: `${$t('common.loadingMenu')}...`,
        duration: 1.5,
      });
      return await getAllMenusApi();
    },
    // 可以指定没有权限跳转403页面
    forbiddenComponent,
    // 如果 route.meta.menuVisibleWithForbidden = true
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
