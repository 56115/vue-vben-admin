import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/** 租户订阅模块 */
interface AppSubscriptionDto {
  appModuleCode: string;
  appModuleName: string;
  appModuleIcon: string;
  status: string;
  startAt: string;
  expiredAt: string | null;
  quotaUsers?: number;
  quotaCustomers?: number;
  quotaStorage?: number;
}

/** 租户信息 */
interface TenantInfoDto {
  id: number;
  name: string;
  code: string;
  logo?: string;
  status: string;
  planType: string;
  subscriptions: AppSubscriptionDto[];
}

/** 用户角色 */
interface UserRoleDto {
  roleId: number;
  roleName: string;
  roleCode: string;
  appModuleCode: string;
  dataScope: string;
  permissions: string[];
}

/** 后端返回的用户信息结构 */
interface BackendUserInfo {
  id: number;
  username: string;
  realName: string;
  avatar?: string;
  tenantId: number;
  tenant: TenantInfoDto;
  roles: UserRoleDto[];
}

// 缓存权限码，供 getAccessCodesApi 使用
let cachedPermissions: string[] = [];

/**
 * 获取缓存的权限码
 */
export function getCachedPermissions(): string[] {
  return cachedPermissions;
}

// 缓存完整的后端用户信息，供权限检查使用
let cachedBackendUserInfo: BackendUserInfo | null = null;

/**
 * 获取缓存的后端用户信息
 */
export function getCachedBackendUserInfo(): BackendUserInfo | null {
  return cachedBackendUserInfo;
}

/**
 * 清除用户缓存信息（登出时调用）
 */
export function clearUserCache(): void {
  cachedBackendUserInfo = null;
  cachedPermissions = [];
}

/**
 * 获取用户信息
 */
export async function getUserInfoApi(): Promise<UserInfo> {
  const result = await requestClient.get<BackendUserInfo>('/auth/me');

  // 缓存完整的后端用户信息
  cachedBackendUserInfo = result;

  // 缓存权限码：只包含角色权限，不混入租户订阅模块码。
  const rolePermissions = result.roles.flatMap((role) => role.permissions);
  cachedPermissions = [...new Set(rolePermissions)];

  // 提取角色名称列表
  const roleNames = result.roles.map((role) => role.roleName);

  // 转换为前端需要的 UserInfo 格式
  return {
    userId: String(result.id),
    avatar: result.avatar || '',
    realName: result.realName || result.username,
    roles: roleNames,
    desc: result.tenant.name,
    homePath: '/chat',
    token: '',
  };
}
