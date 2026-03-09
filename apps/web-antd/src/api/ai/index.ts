/**
 * AI 教师 API 接口
 */
import { requestClient } from '../request';
import type { PaginatedResponse } from '#/typings/shared';

// ==================== 类型定义 ====================

export type { PaginatedResponse };

export interface TutorSession {
  id: string;
  studentId: string;
  subject: string;
  status: 'ACTIVE' | 'ENDED';
  startedAt: string;
  endedAt?: string;
  messageCount: number;
}

export interface TutorMessage {
  role: 'STUDENT' | 'TUTOR';
  content: string;
  createdAt: string;
}

export interface MathStep {
  step: number;
  description: string;
  expression: string;
  latex?: string;
  explanation?: string;
}

export interface TutorResponse {
  sessionId?: string;
  response: string;
  strategy: string;
  hints: string[];
  followUpQuestions: string[];
  mathSteps?: MathStep[];
  toolsUsed?: string[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface MathCalculateResult {
  success: boolean;
  result: string | string[];
  steps: MathStep[];
  latex?: string;
  engine: 'algebrite' | 'sympy';
  error?: string;
}

export interface StudentProgress {
  profile: {
    masteryLevel: number;
    learningStyle?: string;
    strengths: string[];
    weaknesses: string[];
  } | null;
  overallMastery: number;
  knowledgePoints: Array<{
    topic: string;
    mastery: number;
  }>;
  recentSessions: Array<{
    id: string;
    subject: string;
    startedAt: string;
    messageCount: number;
  }>;
  pendingMistakes: number;
}

export interface QuickAnswerResult {
  answer: string;
  explanation?: string;
}

export interface MistakeRecord {
  id: string;
  studentId: string;
  subject: string;
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  knowledgePoint: string;
  explanation?: string;
  errorCount: number;
  status: 'pending' | 'reviewing' | 'mastered';
  createdAt: string;
  updatedAt: string;
  // 图片多尺寸 URLs（新增）
  questionImageUrls?: QuestionImageUrls;
  answerImageUrls?: QuestionImageUrls;
}

// ==================== 会话管理 API ====================

/**
 * 开始教学会话
 */
export async function startSession(data: {
  studentId: string;
  subject: 'math' | 'chinese' | 'english' | 'physics' | 'chemistry';
  initialQuestion?: string;
}) {
  return requestClient.post<TutorResponse>('/education/sessions/start', data);
}

/**
 * 发送消息
 */
export async function sendMessage(data: {
  sessionId: string;
  message: string;
  imageUrl?: string;
}) {
  return requestClient.post<TutorResponse>('/education/sessions/message', data);
}

/**
 * 结束会话
 */
export async function endSession(sessionId: string) {
  return requestClient.post<{
    sessionId: string;
    duration: number;
    messageCount: number;
    problemsSolved: number;
  }>(`/education/sessions/${sessionId}/end`);
}

/**
 * 快速问答（不创建会话）
 */
export async function quickAnswer(data: {
  question: string;
  subject: 'math' | 'chinese' | 'english' | 'physics' | 'chemistry';
}) {
  return requestClient.post<QuickAnswerResult>('/education/quick-answer', data);
}

// ==================== 数学计算 API ====================

/**
 * 数学计算
 */
export async function mathCalculate(data: {
  expression: string;
  type:
    | 'equation'
    | 'simplify'
    | 'factor'
    | 'expand'
    | 'derivative'
    | 'integral';
  variable?: string;
}) {
  return requestClient.post<MathCalculateResult>(
    '/education/math/calculate',
    data,
  );
}

/**
 * 验证答案
 */
export async function verifyAnswer(data: {
  question: string;
  studentAnswer: string;
  subject?: string;
}) {
  return requestClient.post<{
    correct: boolean;
    feedback: string;
    correctAnswer?: string;
  }>('/education/math/verify', data);
}

/**
 * 获取数学引擎状态
 */
export async function getMathEngineStatus() {
  return requestClient.get<{
    algebrite: boolean;
    sympy: boolean;
  }>('/education/math/status');
}

// ==================== 学习进度 API ====================

/**
 * 获取学生学习进度
 */
export async function getStudentProgress(studentId: string, subject?: string) {
  const params = subject ? { subject } : {};
  return requestClient.get<StudentProgress>(
    `/education/progress/${studentId}`,
    { params },
  );
}

// ==================== 错题本 API ====================

/**
 * 添加错题
 */
export async function addMistake(data: {
  studentId: string;
  subject: string;
  question: string;
  correctAnswer: string;
  studentAnswer?: string;
  errorType?: string;
}) {
  return requestClient.post('/education/mistakes', data);
}

/**
 * 获取错题列表
 */
export async function getMistakes(studentId: string, subject?: string) {
  const params = subject ? { subject } : {};
  return requestClient.get<MistakeRecord[]>(
    `/education/mistakes/${studentId}`,
    { params },
  );
}

/**
 * 标记错题已掌握
 */
export async function markMistakeMastered(mistakeId: string) {
  return requestClient.post(`/education/mistakes/${mistakeId}/mastered`);
}

// ==================== 结构化求解 API ====================

/**
 * 问题分析结果
 */
export interface ProblemAnalysis {
  originalText: string;
  category: string;
  gradeLevel: number;
  knownVariables: Array<{
    name: string;
    value: string | number;
    unit?: string;
    description: string;
  }>;
  unknownVariables: Array<{
    name: string;
    symbol: string;
    unit?: string;
    description: string;
  }>;
  constraints: string[];
  mathematicalModel: {
    equations: string[];
    latex: string[];
    explanation: string;
    variables: string[];
  };
  difficulty: 'easy' | 'medium' | 'hard';
  knowledgePoints: string[];
  isWordProblem: boolean;
  confidence: number;
}

/**
 * 解题步骤
 */
export interface SolutionStep {
  stepNumber: number;
  description: string;
  expression: string;
  latex?: string;
  explanation?: string;
  verified?: boolean;
}

/**
 * 验证方法结果
 */
export interface VerificationMethodResult {
  name: 'substitution' | 'alternative_method' | 'reasonableness';
  passed: boolean;
  details: string;
  steps?: string[];
  confidence: number;
}

/**
 * 验证结果
 */
export interface VerificationResult {
  isVerified: boolean;
  confidence: number;
  methods: VerificationMethodResult[];
  summary: string;
  warnings?: string[];
  suggestions?: string[];
}

/**
 * 结构化解题响应
 */
export interface StructuredSolutionResponse {
  sessionId: string;
  analysis: ProblemAnalysis;
  solution: {
    method: string;
    steps: SolutionStep[];
    finalAnswer: {
      value: string;
      unit?: string;
      latex?: string;
    };
    alternativeAnswers?: string[];
  };
  verification?: VerificationResult;
  teaching: {
    explanation: string;
    hints: string[];
    followUpQuestions: string[];
    relatedProblems: string[];
    knowledgePointLinks: string[];
  };
  metadata: {
    processingTimeMs: number;
    tokensUsed?: number;
    mathEngineUsed: string;
  };
}

/**
 * 分析数学问题
 */
export async function analyzeProblem(data: {
  question: string;
  gradeLevel?: number;
}) {
  return requestClient.post<{
    analysis: ProblemAnalysis;
    processingTimeMs: number;
    tokensUsed?: number;
  }>('/education/math/analyze', data);
}

/**
 * 快速分析问题（不调用 LLM）
 */
export async function quickAnalyzeProblem(data: { question: string }) {
  return requestClient.post<{
    category: string;
    difficulty: string;
    isWordProblem: boolean;
    gradeLevel: number;
    knowledgePoints: string[];
    hasEquation: boolean;
  }>('/education/math/quick-analyze', data);
}

/**
 * 结构化求解数学问题
 */
export async function solveStructured(data: {
  question: string;
  studentId?: string;
  gradeLevel?: number;
  options?: {
    includeVerification?: boolean;
    includeTeaching?: boolean;
    verificationLevel?: 'basic' | 'comprehensive';
  };
}) {
  return requestClient.post<StructuredSolutionResponse>(
    '/education/math/solve-structured',
    data,
  );
}

/**
 * 验证数学解答
 */
export async function verifySolution(data: {
  equation: string;
  solutions: Array<{ variable: string; value: string | number }>;
  originalQuestion?: string;
  enabledMethods?: Array<
    'substitution' | 'alternative_method' | 'reasonableness'
  >;
  includeSteps?: boolean;
}) {
  return requestClient.post<VerificationResult>(
    '/education/math/verify-solution',
    data,
  );
}

// ==================== OCR 识别 API ====================

/**
 * OCR缓存统计
 */
export interface OcrCacheStats {
  totalCount: number;
  totalAccessCount: number;
  byOcrType: Record<string, number>;
  byProvider: Record<string, number>;
  oldestCache: string | null;
  newestCache: string | null;
}

/**
 * 题目识别响应
 */
export interface RecognizeQuestionResponse {
  text: string;
  latex?: string;
  confidence: number;
  cached: boolean;
  fingerprint: string;
  libraryMatch?: {
    questionId: string;
    similarity: number;
    answer: string;
  };
  solution?: {
    answer: string;
    steps: Array<{ step: number; description: string; latex?: string }>;
    explanation: string;
  };
}

/**
 * 公式识别响应
 */
export interface FormulaOcrResponse {
  latex: string;
  mathml?: string;
  confidence: number;
  cached: boolean;
  fingerprint: string;
}

/**
 * 获取OCR缓存统计
 */
export async function getOcrCacheStats() {
  return requestClient.get<OcrCacheStats>('/lms/ocr/cache/stats');
}

/**
 * 识别题目并解答
 */
export async function recognizeQuestion(formData: FormData) {
  return requestClient.post<RecognizeQuestionResponse>(
    '/lms/ocr/recognize',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
}

/**
 * 公式识别
 */
export async function recognizeFormula(formData: FormData) {
  return requestClient.post<FormulaOcrResponse>('/lms/ocr/formula', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// ==================== 作业批改 API ====================

/**
 * 单题批改结果
 */
export interface QuestionGradingResult {
  index: number;
  questionContent: string;
  studentAnswer: string;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  errorType?: string;
  errorAnalysis?: string;
  correction?: string;
  libraryMatched?: boolean;
  libraryQuestionId?: string;
}

/**
 * 薄弱知识点
 */
export interface WeakPoint {
  name: string;
  errorCount: number;
}

/**
 * 作业批改响应
 */
export interface HomeworkGradingResponse {
  summary: {
    totalQuestions: number;
    correctCount: number;
    score: number;
    maxScore: number;
    accuracy: number;
  };
  questions: QuestionGradingResult[];
  weakPoints?: WeakPoint[];
  processingMs: number;
  recordId?: string;
}

/**
 * 试卷图片多尺寸 URLs
 */
export interface PaperImageUrls {
  pageIndex: number;
  thumbnail: string; // 缩略图 (400px)
  preview: string; // 预览图 (1000px)
  original: string; // 原图
}

/**
 * 题目图片多尺寸 URLs
 */
export interface QuestionImageUrls {
  thumbnail: string; // 缩略图 (200px) - 列表页
  medium: string; // 中等图 (800px) - 详情页
  original: string; // 原图 - 高清查看
}

/**
 * 批改历史记录
 */
export interface GradingHistoryItem {
  id: string;
  studentId?: string;
  questionCount: number;
  correctCount: number;
  totalScore: number;
  maxScore: number;
  accuracy: number;
  processingMs: number;
  createdAt: string;
  paperImageUrls?: PaperImageUrls[]; // 试卷图片 URLs
}

/**
 * 获取批改历史
 */
export async function getGradingHistory(params: {
  page?: number;
  pageSize?: number;
  studentId?: string;
}) {
  return requestClient.get<PaginatedResponse<GradingHistoryItem>>(
    '/lms/homework/grading-history',
    { params },
  );
}

/**
 * 获取批改详情
 */
export async function getGradingDetail(recordId: string) {
  return requestClient.get<GradingHistoryItem>(
    `/education/paper/grade/${recordId}`,
  );
}

// ==================== 试卷分析 API ====================

/**
 * 试卷信息
 */
export interface PaperInfo {
  title?: string;
  subject?: string;
  totalScore?: number;
  questionCount: number;
}

/**
 * 解析出的题目
 */
export interface ParsedQuestion {
  index: number;
  type: string;
  content: string;
  options?: string[];
  score?: number;
  answer?: string;
}

/**
 * 试卷分析响应
 */
export interface PaperAnalysisResponse {
  paperInfo: PaperInfo;
  questions: ParsedQuestion[];
  processingMs: number;
}

/**
 * 导入详情
 */
export interface ImportDetail {
  index: number;
  status: 'imported' | 'duplicate' | 'failed';
  questionId?: string;
  error?: string;
}

/**
 * 导入题目响应
 */
export interface ImportQuestionsResponse {
  imported: number;
  duplicates: number;
  failed: number;
  details: ImportDetail[];
}

/**
 * 分析试卷
 */
export async function analyzePaper(formData: FormData) {
  return requestClient.post<PaperAnalysisResponse>(
    '/lms/paper/analyze',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
}

/**
 * 导入题目到题库
 */
export async function importQuestions(formData: FormData) {
  return requestClient.post<ImportQuestionsResponse>(
    '/lms/paper/import-questions',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
}

// ==================== AI 智能批改 API (correct_edu) ====================

/**
 * correct_edu 题目类型
 * 1: 数学计算题
 * 2: 数学应用题
 * 3: 数学填空题
 * 4: 古诗文/作文默写
 */
export type CorrectEduQuestionType = 1 | 2 | 3 | 4;

/**
 * AI 批改请求参数
 */
export interface AIGradingRequest {
  useCorrectEdu?: boolean;
  questionType?: CorrectEduQuestionType;
  standardAnswer?: string;
  subject?: string;
}

/**
 * AI 批改题目结果
 */
export interface AIQuestionResult {
  index: number;
  questionContent: string;
  studentAnswer: string;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  reason?: string;
  errorAnalysis?: string;
  correction?: string;
  aiGraded?: boolean;
}

/**
 * AI 批改响应
 */
export interface AIGradingResponse {
  summary: {
    totalQuestions: number;
    correctCount: number;
    score: number;
    maxScore: number;
    accuracy: number;
  };
  questions: AIQuestionResult[];
  weakPoints?: WeakPoint[];
  processingMs: number;
  recordId?: string;
  useCorrectEdu?: boolean;
}

/**
 * AI 智能批改作业 (支持 correct_edu)
 */
export async function gradeWithAI(
  formData: FormData,
  options?: AIGradingRequest,
) {
  // subject 是必填字段，默认为 MATH
  formData.append('subject', options?.subject || 'MATH');

  if (options?.useCorrectEdu) {
    formData.append('useCorrectEdu', 'true');
  }
  if (options?.questionType) {
    formData.append('questionType', String(options.questionType));
  }
  if (options?.standardAnswer) {
    formData.append('standardAnswer', options.standardAnswer);
  }

  const response = await requestClient.post<{
    gradingMode: string;
    result: {
      recordId: string;
      totalQuestions: number;
      correctCount: number;
      totalScore: number;
      maxScore: number;
      accuracy: number;
      processingMs: number;
      questions: AIQuestionResult[];
    };
    message: string;
  }>('/education/paper/grade', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // AI 批改需要更长时间
  });

  // 转换响应格式以匹配前端期望的结构
  const result = response.result;
  return {
    summary: {
      totalQuestions: result.totalQuestions,
      correctCount: result.correctCount,
      score: result.totalScore,
      maxScore: result.maxScore,
      accuracy: result.accuracy,
    },
    questions: result.questions.map((q, idx) => ({
      index: idx + 1,
      questionContent: q.questionContent || '',
      studentAnswer: q.studentAnswer || '',
      isCorrect: q.isCorrect,
      score: q.score,
      maxScore: q.maxScore,
      reason: q.reason,
      errorAnalysis: q.errorAnalysis,
      correction: q.correction,
      aiGraded: q.aiGraded,
    })),
    weakPoints: [],
    processingMs: result.processingMs,
    recordId: result.recordId,
    useCorrectEdu: options?.useCorrectEdu,
  } as AIGradingResponse;
}

/**
 * 获取题目类型名称
 */
export function getQuestionTypeName(type: CorrectEduQuestionType): string {
  const names: Record<CorrectEduQuestionType, string> = {
    1: '数学计算题',
    2: '数学应用题',
    3: '数学填空题',
    4: '古诗文默写',
  };
  return names[type] || '未知类型';
}

// ==================== OSS 直传 + 异步批改 API ====================

/**
 * 获取 OSS 签名 URL（用于前端直传）
 */
export async function getPresignedUploadUrl(data: {
  filename: string;
  contentType: string;
  pathPrefix?: string;
}) {
  return requestClient.post<{
    signedUrl: string;
    key: string;
    expiresIn: number;
  }>('/messaging/media/presigned-url', data);
}

/**
 * 上传文件到 OSS（使用签名 URL）
 */
export async function uploadToOss(signedUrl: string, file: File) {
  const response = await fetch(signedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!response.ok) {
    throw new Error(`OSS 上传失败: ${response.statusText}`);
  }

  return response;
}

/**
 * 提交作业批改任务（异步）
 */
export async function submitGradingTask(data: {
  ossKey: string;
  studentId?: string;
  subjectId?: string;
  useAI?: boolean;
}) {
  return requestClient.post<{
    success: boolean;
    message: string;
    jobId: string;
    status: string;
  }>('/lms/homework/grade-by-oss', data);
}

/**
 * 查询批改任务状态
 */
export async function getGradingStatus(jobId: string) {
  return requestClient.get<{
    jobId: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
    progress?: number;
    result?: HomeworkGradingResponse;
    error?: string;
  }>(`/lms/homework/grade-status/${jobId}`);
}
