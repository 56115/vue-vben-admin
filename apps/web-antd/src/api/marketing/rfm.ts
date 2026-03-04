import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

/** RFM 分层类型 */
export type RfmSegment =
  | 'CHAMPIONS'
  | 'LOYAL_CUSTOMERS'
  | 'POTENTIAL_LOYALISTS'
  | 'NEW_CUSTOMERS'
  | 'PROMISING'
  | 'NEED_ATTENTION'
  | 'ABOUT_TO_SLEEP'
  | 'AT_RISK'
  | 'CANT_LOSE_THEM'
  | 'HIBERNATING'
  | 'LOST';

/** 分层信息 */
export interface SegmentInfo {
  text: string;
  color: string;
  strategy: string;
  description: string;
}

/** RFM 分层分布统计 */
export interface RfmSegmentDistribution {
  segment: RfmSegment;
  segmentLabel: string;
  color: string;
  count: number;
  percentage: number;
  avgRfmScore: number;
}

/** RFM 评分详情 */
export interface RfmScoreDetail {
  recencyDays: number;
  recencyScore: number;
  lastOrderAt: string | null;
  frequencyCount: number;
  frequencyScore: number;
  monetaryAmount: number;
  monetaryScore: number;
  rfmScore: number;
  rfmSegment: RfmSegment;
  rfmSegmentLabel: string;
  dataSource: string;
  analysisPeriodDays: number;
  calculatedAt: string;
}

/** 客户 RFM 档案 */
export interface CustomerRfmProfile {
  customerId: number;
  customerName: string;
  rfm: RfmScoreDetail;
  externalMemberId: string | null;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 批量计算结果 */
export interface BatchRfmResult {
  processed: number;
  success: number;
  failed: number;
  duration: number;
}

// ==================== 常量映射 ====================

/** 分层中文映射 */
export const segmentMap: Record<RfmSegment, SegmentInfo> = {
  CHAMPIONS: {
    text: '最佳客户',
    color: 'green',
    strategy: '重点维护，提供VIP服务和专属优惠',
    description: '最近消费、消费频繁且消费金额高的客户',
  },
  LOYAL_CUSTOMERS: {
    text: '忠诚客户',
    color: 'cyan',
    strategy: '保持联系，推荐新品和升级服务',
    description: '消费频繁且金额高，但最近未消费',
  },
  POTENTIAL_LOYALISTS: {
    text: '潜力客户',
    color: 'blue',
    strategy: '培养忠诚度，提供会员计划和积分奖励',
    description: '最近消费，但消费频率或金额有待提升',
  },
  NEW_CUSTOMERS: {
    text: '新客户',
    color: 'geekblue',
    strategy: '欢迎活动，引导二次消费',
    description: '最近刚消费，但频率和金额较低',
  },
  PROMISING: {
    text: '有希望',
    color: 'purple',
    strategy: '定期触达，提供优惠券刺激消费',
    description: '有一定消费潜力，需要持续培育',
  },
  NEED_ATTENTION: {
    text: '需关注',
    color: 'orange',
    strategy: '主动关怀，了解需求变化',
    description: '各项指标中等，需要关注维护',
  },
  ABOUT_TO_SLEEP: {
    text: '即将沉睡',
    color: 'gold',
    strategy: '唤醒活动，发送专属优惠',
    description: '消费间隔变长，即将进入沉睡状态',
  },
  AT_RISK: {
    text: '有风险',
    color: 'volcano',
    strategy: '挽回活动，提供大额优惠',
    description: '曾经的高价值客户，最近未消费',
  },
  CANT_LOSE_THEM: {
    text: '不能失去',
    color: 'red',
    strategy: '紧急挽回，一对一沟通',
    description: '高价值客户流失风险极高',
  },
  HIBERNATING: {
    text: '休眠中',
    color: 'default',
    strategy: '低成本触达，等待唤醒时机',
    description: '长时间未消费的低价值客户',
  },
  LOST: {
    text: '已流失',
    color: '#8c8c8c',
    strategy: '尝试重新激活或放弃',
    description: '长期未消费，基本流失',
  },
};

/** 分层颜色映射（用于图表） */
export const segmentColors: Record<RfmSegment, string> = {
  CHAMPIONS: '#52c41a',
  LOYAL_CUSTOMERS: '#73d13d',
  POTENTIAL_LOYALISTS: '#1890ff',
  NEW_CUSTOMERS: '#69c0ff',
  PROMISING: '#597ef7',
  NEED_ATTENTION: '#faad14',
  ABOUT_TO_SLEEP: '#ffc53d',
  AT_RISK: '#ff7a45',
  CANT_LOSE_THEM: '#ff4d4f',
  HIBERNATING: '#bfbfbf',
  LOST: '#8c8c8c',
};

/** 分层排序（按价值从高到低） */
export const segmentOrder: RfmSegment[] = [
  'CHAMPIONS',
  'LOYAL_CUSTOMERS',
  'POTENTIAL_LOYALISTS',
  'NEW_CUSTOMERS',
  'PROMISING',
  'NEED_ATTENTION',
  'ABOUT_TO_SLEEP',
  'AT_RISK',
  'CANT_LOSE_THEM',
  'HIBERNATING',
  'LOST',
];

// ==================== API 函数 ====================

/**
 * 获取 RFM 分层分布统计
 */
export async function getRfmSegmentDistribution() {
  return requestClient.get<RfmSegmentDistribution[]>(
    '/marketing/retail/rfm/segments',
  );
}

/**
 * 按分层获取客户列表
 */
export async function getCustomersBySegment(
  segment: RfmSegment,
  params?: { page?: number; pageSize?: number },
) {
  return requestClient.get<PaginatedResponse<CustomerRfmProfile>>(
    `/marketing/retail/rfm/segments/${segment}`,
    { params },
  );
}

/**
 * 获取客户 RFM 档案
 */
export async function getCustomerRfmProfile(customerId: number) {
  return requestClient.get<CustomerRfmProfile>(
    `/marketing/retail/rfm/customer/${customerId}`,
  );
}

/**
 * 触发 RFM 批量重新计算
 */
export async function recalculateRfm(customerIds?: number[]) {
  return requestClient.post<BatchRfmResult>(
    '/marketing/retail/rfm/recalculate',
    {
      customerIds,
    },
  );
}
