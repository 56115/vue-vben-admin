/**
 * 作业批改 API 接口
 */
import { requestClient } from '../request';

// ==================== 类型定义 ====================

/**
 * 审批人信息
 */
export interface ApproverInfo {
  id: string;
  username: string;
  realName?: string;
}

/**
 * 修改详情
 */
export interface ModificationDetail {
  questionId: string;
  questionNumber: number;
  field: 'score' | 'feedback' | 'isCorrect';
  before: any;
  after: any;
  reason?: string;
}

/**
 * 审批结果
 */
export interface ApprovalResult {
  taskId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'TIMEOUT';
  approver?: ApproverInfo;
  approvedAt?: string;
  approvalComment?: string;
  approvalDurationMs?: number;
  isModified: boolean;
  originalData: any;
  approvedData?: any;
  modifications?: ModificationDetail[];
}

/**
 * 批改题目
 */
export interface GradingQuestion {
  id: string;
  questionNumber: string;
  questionContent: string;
  studentAnswer: string;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  errorType?: string;
  errorAnalysis: string;
  suggestions?: string[];
  keyPoints?: string[];
}

/**
 * 批改记录
 */
export interface GradingRecord {
  recordId: string;
  gradingMode: string;
  paperName: string;
  subject: string;
  status: string;
  totalQuestions: number;
  correctCount: number;
  totalScore: number;
  maxScore: number;
  accuracy: number;
  processingMs?: number;
  createdAt?: string;
  paperImageUrls?: Array<{
    pageIndex: number;
    thumbnail: string;
    preview: string;
    original: string;
    enhanced?: string;
  }>;
}

// ==================== API 方法 ====================

/**
 * 获取批改记录的审批结果
 *
 * @param recordId 批改记录 ID
 * @returns 审批结果详情
 */
export async function getApprovalResult(
  recordId: string,
): Promise<ApprovalResult> {
  return requestClient.get(
    `/education/paper/grade/${recordId}/approval-result`,
  );
}

/**
 * 获取批改记录详情
 *
 * @param recordId 批改记录 ID
 */
export async function getGradingRecord(recordId: string) {
  return requestClient.get(`/education/paper/grade/${recordId}`);
}

/**
 * 获取批改记录列表
 *
 * @param params ���询参数
 */
export async function getGradingRecords(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  return requestClient.get('/education/paper/history', { params });
}

/**
 * 获取批改记录的题目列表
 *
 * @param recordId 批改记录 ID
 * @returns 题目列表
 */
export async function getGradingQuestions(
  recordId: string,
): Promise<GradingQuestion[]> {
  return requestClient.get(`/education/paper/records/${recordId}/questions`);
}
