import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

/** 活动信息 */
export interface CampaignInfo {
  name: string;
  description: string;
  offer: string;
}

/** 目标人群规则 */
export interface TargetRules {
  minRfmScore?: number;
  minMonetary?: number;
  maxRecencyDays?: number;
  rfmSegments?: string[];
}

/** 创建 AI 营销活动请求 */
export interface CreateAiCampaignRequest {
  campaignDescription: string;
  campaignInfo: CampaignInfo;
  targetRules?: TargetRules;
  audienceLimit?: number;
  autoCreateAudience?: boolean;
  autoGenerateCopy?: boolean;
}

/** 人群匹配结果 */
export interface AudienceMatchResult {
  customerId: string;
  memberId: string;
  name: string;
  mobile: string | null;
  rfmSegment: string;
  rfmScore: number;
  monetary: number;
  similarityScore: number;
}

/** 人群分群 */
export interface AudienceSegment {
  segmentId: string;
  segmentName: string;
  characteristics: string;
  memberCount: number;
}

/** 个性化文案 */
export interface PersonalizedCopy {
  segmentId: string;
  textContent: string;
  linkTitle: string;
  linkDesc: string;
  callToAction: string;
}

/** 创建 AI 营销活动响应 */
export interface CreateAiCampaignResponse {
  success: boolean;
  campaignId: string;
  audienceId?: string;
  totalMatched: number;
  segments: AudienceSegment[];
  personalizedCopies?: PersonalizedCopy[];
  error?: string;
}

/** 人群匹配请求 */
export interface MatchAudienceRequest {
  targetPersonaDescription: string;
  targetRules?: TargetRules;
  exclusionCriteria?: string[];
  limit?: number;
}

/** 人群匹配响应 */
export interface MatchAudienceResponse {
  results: AudienceMatchResult[];
  segments: AudienceSegment[];
}

/** 获取文案响应 */
export interface GetCampaignCopiesResponse {
  copies: PersonalizedCopy[];
  segments: AudienceSegment[];
}

/** 渲染文案响应 */
export interface GetRenderedCopyResponse {
  textContent: string;
  linkTitle: string;
  linkDesc: string;
  callToAction: string;
}

// ==================== API 函数 ====================

/**
 * 创建 AI 营销活动
 */
export async function createAiCampaign(data: CreateAiCampaignRequest) {
  return requestClient.post<CreateAiCampaignResponse>(
    '/targeted-marketing/campaign',
    data,
  );
}

/**
 * 预览匹配人群
 */
export async function matchAudience(data: MatchAudienceRequest) {
  return requestClient.post<MatchAudienceResponse>('/targeted-marketing/match', data);
}

/**
 * 获取活动文案
 */
export async function getCampaignCopies(campaignId: string) {
  return requestClient.get<GetCampaignCopiesResponse>(
    `/targeted-marketing/campaign/${campaignId}/copies`,
  );
}

/**
 * 获取渲染文案
 */
export async function getRenderedCopy(campaignId: string, customerId: string) {
  return requestClient.get<GetRenderedCopyResponse>(
    `/targeted-marketing/campaign/${campaignId}/customer/${customerId}/copy`,
  );
}
