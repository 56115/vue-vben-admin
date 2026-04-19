import type { RouteRecordRaw } from 'vue-router';
import { filterTree } from '@vben/utils';

/**
 * 清理 children 为空的父路由（分组路由）
 * filterTree 会保留通过检查的父节点，即使所有子节点被过滤
 */
export function cleanEmptyParentRoutes(routes: RouteRecordRaw[]): RouteRecordRaw[] {
  return routes.filter((route) => {
    if (route.children) {
      // 递归清理子节点（filterTree 可能把 children 设为空数组 []）
      route.children = cleanEmptyParentRoutes(route.children);
      // 如果清理后没有子节点，且当前路由有 redirect（说明是分组/父路由），则移除
      if (route.children.length === 0 && route.redirect) {
        return false;
      }
    }
    return true;
  });
}

/**
 * 按租户订阅和用户权限过滤路由
 * - 移除用户未订阅模块的路由
 * - 移除用户无权限的路由
 * - 无 appModule 标记的路由（如 Dashboard、个人中心）始终保留
 */
export function filterRoutesByAccess(
  routes: RouteRecordRaw[],
  hasAppModule: (code: string) => boolean,
  hasPermission: (code: string) => boolean,
): RouteRecordRaw[] {
  const filtered = filterTree(routes, (route) => {
    // 第一层：检查应用模块订阅
    const appModule = route.meta?.appModule as string | undefined;
    if (appModule && !hasAppModule(appModule)) return false;

    // 第二层：检查权限码（拥有任一权限即可）
    const permissions = route.meta?.permissions as string[] | undefined;
    if (permissions && permissions.length > 0) {
      return permissions.some((perm) => hasPermission(perm));
    }

    return true;
  });

  // 清理子路由全部被过滤掉的父路由（filterTree 会保留通过 appModule 检查的父节点）
  return cleanEmptyParentRoutes(filtered);
}
