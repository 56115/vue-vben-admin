/**
 * 共享类型定义
 * 所有模块共用的类型应该放在这里
 */

/**
 * 分页响应类型
 * 用于所有列表接口的返回类型
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 通用 ID 类型
 */
export interface IdObject {
  id: number;
}

/**
 * 通用创建响应
 */
export interface CreateResponse<T> {
  data: T;
  message?: string;
}

/**
 * 通用更新响应
 */
export interface UpdateResponse<T> {
  data: T;
  message?: string;
}

/**
 * 通用删除响应
 */
export interface DeleteResponse {
  id: number;
  message?: string;
}

/**
 * 通用列表查询参数
 */
export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 通用状态响应
 */
export interface StatusResponse {
  success: boolean;
  message?: string;
}
