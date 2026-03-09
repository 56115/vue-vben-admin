/**
 * Prompt Template API
 * 提示词模板接口
 */
import { requestClient } from '../request';

// ==================== 类型定义 ====================

export interface PromptTemplate {
  id: string;
  tenantId: string | null;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  type: 'TENANT' | 'SYSTEM';
  scenario: string | null;
  subjectCode: string | null;
  tags: string[];
  activeVersionId: string | null;
  latestVersion: number;
  usageCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion: {
    id: string;
    templateId: string;
    version: number;
    systemPrompt: string | null;
    userPromptTpl: string;
    variables: unknown[];
    outputSchema: unknown;
    modelConfig: Record<string, unknown>;
    modelName: string | null;
    changeLog: string | null;
    createdBy: string | null;
    createdAt: string;
  } | null;
}

export interface PromptTemplateListParams {
  category?: string;
  tags?: string;
  includeSystem?: boolean;
  activeOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PromptTemplateListResponse {
  data: PromptTemplate[];
  total: number;
}

// ==================== API ====================

/**
 * 获取提示词模板列表
 */
export async function getPromptTemplates(params?: PromptTemplateListParams) {
  // 转换分页参数: limit/offset -> page/pageSize
  const queryParams: Record<string, any> = { ...params };
  if (params?.limit !== undefined && params?.offset !== undefined) {
    queryParams.page = Math.floor(params.offset / params.limit) + 1;
    queryParams.pageSize = params.limit;
    delete queryParams.limit;
    delete queryParams.offset;
  }

  // 转换参数名: search -> keyword (后端 DTO 使用 keyword)
  if (queryParams.search !== undefined) {
    queryParams.keyword = queryParams.search;
    delete queryParams.search;
  }

  // 转换 includeSystem -> type 筛选
  if (queryParams.includeSystem !== undefined) {
    if (queryParams.includeSystem === true) {
      queryParams.type = 'SYSTEM';
    } else if (queryParams.includeSystem === false) {
      queryParams.type = 'TENANT';
    }
    delete queryParams.includeSystem;
  }

  // activeOnly 后端不支持，移除
  delete queryParams.activeOnly;

  const response = await requestClient.get<{
    items: PromptTemplate[];
    total: number;
    page: number;
    pageSize: number;
  }>('/prompt-templates', {
    params: queryParams,
  });

  // 转换 API 响应格式: items -> data
  // 注意：拦截器已提取 data，所以 response 就是 { items: [...], total: n }
  return {
    data: response.items || [],
    total: response.total || 0,
  };
}

/**
 * 获取提示词模板详情
 */
export async function getPromptTemplate(id: string) {
  return requestClient.get<PromptTemplate>(`/prompt-templates/${id}`);
}

/**
 * 根据 key 获取提示词模板
 */
export async function getPromptTemplateByKey(key: string) {
  return requestClient.get<PromptTemplate>(`/prompt-templates/key/${key}`);
}

// ==================== 提示词管理模块新增接口 ====================

export interface CreatePromptTemplateData {
  key: string;
  name: string;
  description?: string | null;
  category?: string | null;
  templateContent: string;
  variables?: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
    defaultValue?: unknown;
  }>;
  defaultValues?: Record<string, unknown> | null;
  modelConfig?: {
    model?: string;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  } | null;
  tags?: string[];
  isActive?: boolean;
}

export interface UpdatePromptTemplateData extends Partial<CreatePromptTemplateData> {}

export interface PromptTemplateVersion {
  id: string;
  promptTemplateId: string;
  version: number;
  templateContent: string;
  variables: unknown;
  modelConfig: unknown;
  changeLog: string | null;
  createdBy: string;
  createdAt: string;
}

export interface PromptVersionListResponse {
  data: PromptTemplateVersion[];
  total: number;
}

export interface CategoryOption {
  value: string;
  label: string;
  count: number;
}

/**
 * 创建提示词模板
 */
export async function createPromptTemplate(data: CreatePromptTemplateData) {
  return requestClient.post<PromptTemplate>('/prompt-templates', data);
}

/**
 * 更新提示词模板
 */
export async function updatePromptTemplate(
  id: string,
  data: UpdatePromptTemplateData,
) {
  return requestClient.put<PromptTemplate>(`/prompt-templates/${id}`, data);
}

/**
 * 删除提示词模板
 */
export async function deletePromptTemplate(id: string) {
  return requestClient.delete(`/prompt-templates/${id}`);
}

/**
 * 克隆提示词模板
 */
export async function clonePromptTemplate(
  id: string,
  newKey?: string,
  newName?: string,
) {
  return requestClient.post<PromptTemplate>(`/prompt-templates/${id}/clone`, {
    newKey,
    newName,
  });
}

/**
 * 发布提示词模板（创建新版本）
 */
export async function publishPromptTemplate(id: string, changeLog?: string) {
  return requestClient.post<PromptTemplateVersion>(
    `/prompt-templates/${id}/publish`,
    { changeLog },
  );
}

/**
 * 获取提示词模板版本历史
 */
export async function getPromptTemplateVersions(
  id: string,
  params?: { limit?: number; offset?: number },
) {
  return requestClient.get<PromptVersionListResponse>(
    `/prompt-templates/${id}/versions`,
    { params },
  );
}

/**
 * 回滚到指定版本
 */
export async function rollbackPromptTemplate(id: string, versionId: string) {
  return requestClient.post<PromptTemplate>(
    `/prompt-templates/${id}/rollback`,
    { versionId },
  );
}

/**
 * 对比两个版本
 */
export async function comparePromptVersions(
  id: string,
  versionId1: string,
  versionId2: string,
) {
  return requestClient.post<{
    additions: number;
    deletions: number;
    diff: string;
  }>(`/prompt-templates/${id}/compare`, { versionId1, versionId2 });
}

/**
 * 获取所有分类列表
 */
export async function getPromptCategories() {
  return requestClient.get<CategoryOption[]>('/prompt-templates/categories');
}

/**
 * 获取所有标签列表
 */
export async function getPromptTags() {
  return requestClient.get<string[]>('/prompt-templates/tags');
}

/**
 * 批量删除提示词模板
 */
export async function batchDeletePromptTemplates(ids: string[]) {
  return requestClient.post('/prompt-templates/batch-delete', { ids });
}

/**
 * 检查提示词是否被使用
 */
export async function checkPromptUsage(id: string) {
  return requestClient.get<{
    inUse: boolean;
    pipelines: Array<{ id: string; name: string }>;
  }>(`/prompt-templates/${id}/usage`);
}

// ==================== 场景默认模板 ====================

export enum AiScenario {
  LLM_CHAT = 'LLM_CHAT',
  LLM_REASONING = 'LLM_REASONING',
  VISION_OCR = 'VISION_OCR',
  VISION_ANALYSIS = 'VISION_ANALYSIS',
  EMBEDDING = 'EMBEDDING',
  PAPER_RECOGNITION = 'PAPER_RECOGNITION',
  PAPER_GRADING = 'PAPER_GRADING',
}

export const AI_SCENARIO_LABELS: Record<AiScenario, string> = {
  [AiScenario.LLM_CHAT]: '普通对话',
  [AiScenario.LLM_REASONING]: '结构化推理',
  [AiScenario.VISION_OCR]: 'OCR 识别',
  [AiScenario.VISION_ANALYSIS]: '图像分析',
  [AiScenario.EMBEDDING]: '向量嵌入',
  [AiScenario.PAPER_RECOGNITION]: '试卷识别',
  [AiScenario.PAPER_GRADING]: '试卷批改',
};

export interface ScenarioDefault {
  id: string;
  scenario: AiScenario;
  templateId: string;
  templateName: string;
  templateKey: string;
  subjectCode: string | null;
  priority: number;
  isActive: boolean;
}

/**
 * 获取场景默认模板配置
 */
export async function getScenarioDefaults() {
  return requestClient.get<ScenarioDefault[]>('/prompt-templates/defaults');
}

/**
 * 设置场景默认模板
 */
export async function setScenarioDefault(
  scenario: AiScenario,
  data: { templateId: number; subjectCode?: string },
) {
  return requestClient.put(`/prompt-templates/defaults/${scenario}`, data);
}
