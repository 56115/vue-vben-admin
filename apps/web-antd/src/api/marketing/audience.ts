import { requestClient } from '#/api/request';
import type { PaginatedResponse } from '#/typings/shared';

// ==================== 类型定义 ====================

export type { PaginatedResponse };

/** 人群包状态 */
export type AudienceStatus =
  | 'DRAFT'
  | 'COMPUTING'
  | 'READY'
  | 'EXPIRED'
  | 'ARCHIVED';

/** 人群包计算类型 */
export type AudienceComputeType = 'STATIC' | 'DYNAMIC';

/** 筛选条件 */
export interface AudienceFilterConditions {
  keyword?: string;
  status?: string;
  lifecycleStage?: string;
  intentionLevel?: string;
  customerLevel?: string;
  churnRisk?: string;
  source?: string;
  sourceChannel?: string;
  province?: string;
  city?: string;
  tagIds?: number[];
  ownerId?: number;
  createdAtStart?: string;
  createdAtEnd?: string;
  lastActiveAtStart?: string;
  lastActiveAtEnd?: string;
  rfmScoreMin?: number;
  rfmScoreMax?: number;
  hasWecom?: boolean;
  hasDouyin?: boolean;
  hasXiaohongshu?: boolean;
}

/** 人群包 */
export interface Audience {
  id: number;
  name: string;
  description: string | null;
  filterConditions: AudienceFilterConditions;
  computeType: AudienceComputeType;
  status: AudienceStatus;
  customerCount: number;
  wecomCount: number;
  lastComputedAt: string | null;
  expiredAt: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

/** 人群包成员 */
export interface AudienceMember {
  id: number;
  customerId: number;
  customerName: string;
  wecomExternalUserid: string | null;
  wecomUserId: string | null;
  createdAt: string;
}

/** 计算结果 */
export interface AudienceComputeResult {
  audienceId: number;
  customerCount: number;
  wecomCount: number;
  computedAt: string;
}

/** 预览结果 */
export interface AudiencePreviewResult {
  customerCount: number;
  wecomCount: number;
  sampleCustomers: Array<{
    id: number;
    name: string;
    phone: string | null;
    wecomExternalUserid: string | null;
  }>;
}

// ==================== API 函数 ====================

/**
 * 获取人群包列表
 */
export async function getAudiences(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: AudienceStatus;
  computeType?: AudienceComputeType;
}) {
  return requestClient.get<PaginatedResponse<Audience>>('/marketing/audience', {
    params,
  });
}

/**
 * 获取人群包详情
 */
export async function getAudience(id: number) {
  return requestClient.get<Audience>(`/marketing/audience/${id}`);
}

/**
 * 创建人群包
 */
export async function createAudience(data: {
  name: string;
  description?: string;
  filterConditions: AudienceFilterConditions;
  computeType?: AudienceComputeType;
}) {
  return requestClient.post<Audience>('/marketing/audience', data);
}

/**
 * 更新人群包
 */
export async function updateAudience(
  id: number,
  data: {
    name?: string;
    description?: string;
    filterConditions?: AudienceFilterConditions;
    computeType?: AudienceComputeType;
  },
) {
  return requestClient.put<Audience>(`/marketing/audience/${id}`, data);
}

/**
 * 删除人群包
 */
export async function deleteAudience(id: number) {
  return requestClient.delete(`/marketing/audience/${id}`);
}

/**
 * 计算/刷新人群包
 */
export async function computeAudience(id: number) {
  return requestClient.post<AudienceComputeResult>(
    `/marketing/audience/${id}/compute`,
  );
}

/**
 * 预览人群包（不保存）
 */
export async function previewAudience(
  filterConditions: AudienceFilterConditions,
) {
  return requestClient.post<AudiencePreviewResult>(
    '/marketing/audience/preview',
    {
      filterConditions,
    },
  );
}

/**
 * 获取人群包成员列表
 */
export async function getAudienceMembers(
  id: number,
  params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    hasWecom?: boolean;
  },
) {
  return requestClient.get<PaginatedResponse<AudienceMember>>(
    `/marketing/audience/${id}/members`,
    {
      params,
    },
  );
}
