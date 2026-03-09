import { requestClient } from '#/api/request';
import type { PaginatedResponse } from '#/typings/shared';

// ==================== Types ====================

export type { PaginatedResponse };

export interface Customer {
  id: number;
  name: string;
  nickname?: string;
  phone?: string;
  email?: string;
  avatar?: string;
  gender: string;
  company?: string;
  position?: string;
  status: string;
  lifecycleStage: string;
  source: string;
  customerLevel: string;
  rfmScore: number;
  churnRisk: string;
  totalAmount: number;
  orderCount: number;
  totalInteractions: number;
  lastActiveAt?: string;
  lastContactAt?: string;
  ownerName?: string;
  channelCount: number;
  createdAt: string;
}

export interface CustomerChannel {
  id: number;
  channelType: string;
  channelUserId: string;
  channelUsername?: string;
  channelAvatar?: string;
  isFollowing: boolean;
  messageCount: number;
  lastMessageAt?: string;
  followedAt?: string;
  createdAt: string;
}

export interface CustomerActivity {
  id: number;
  customerId: number;
  activityType: string;
  channelType?: string;
  title: string;
  content?: string;
  metadata?: Record<string, unknown>;
  operatorName?: string;
  createdAt: string;
}

export interface FollowUp {
  id: number;
  customerId: number;
  customerName?: string;
  customerPhone?: string;
  userId: number;
  userName?: string;
  type: string;
  content: string;
  nextPlanAt?: string;
  status: 'PENDING' | 'OVERDUE' | 'COMPLETED';
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpStats {
  total: number;
  todayCount: number;
  pendingCount: number;
  overdueCount: number;
  byType: Record<string, number>;
  recentDays: { date: string; count: number }[];
}

export interface TodayFollowUp {
  today: FollowUp[];
  overdue: FollowUp[];
  upcoming: FollowUp[];
  stats: {
    todayCount: number;
    overdueCount: number;
    upcomingCount: number;
  };
}

export interface ActivityStats {
  total: number;
  byType: Record<string, number>;
  byChannel: Record<string, number>;
  recentCount: number;
  todayCount: number;
}

// ==================== Customer API ====================

export async function getCustomers(params?: Record<string, unknown>) {
  return requestClient.get<PaginatedResponse<Customer>>('/customer/list', {
    params,
  });
}

export async function getCustomer(id: number) {
  return requestClient.get<Customer>(`/customer/list/${id}`);
}

export async function createCustomer(data: Partial<Customer>) {
  return requestClient.post<Customer>('/customer/list', data);
}

export async function updateCustomer(id: number, data: Partial<Customer>) {
  return requestClient.put<Customer>(`/customer/list/${id}`, data);
}

export async function deleteCustomer(id: number) {
  return requestClient.delete(`/customer/list/${id}`);
}

// ==================== Customer Channel API ====================

export async function getCustomerChannels(customerId: number) {
  return requestClient.get<CustomerChannel[]>(
    `/customer-channels/customer/${customerId}`,
  );
}

export async function getChannelStats() {
  return requestClient.get<Record<string, unknown>>('/customer-channels/stats');
}

// ==================== Customer Activity API ====================

export async function getCustomerTimeline(
  customerId: number,
  params?: { limit?: number; offset?: number },
) {
  return requestClient.get<{
    customerId: number;
    activities: CustomerActivity[];
    total: number;
    hasMore: boolean;
  }>(`/customer-activities/customer/${customerId}/timeline`, { params });
}

export async function getActivityStats(customerId?: number) {
  const params = customerId ? { customerId } : {};
  return requestClient.get<ActivityStats>('/customer-activities/stats', {
    params,
  });
}

export async function createActivity(data: {
  customerId: number;
  activityType: string;
  title: string;
  content?: string;
  channelType?: string;
  metadata?: Record<string, unknown>;
}) {
  return requestClient.post<CustomerActivity>('/customer-activities', data);
}

// ==================== Follow-up API ====================

export async function getFollowUps(params?: Record<string, unknown>) {
  return requestClient.get<PaginatedResponse<FollowUp>>('/customer/follow-up', {
    params,
  });
}

export async function getFollowUp(id: number) {
  return requestClient.get<FollowUp>(`/customer/follow-up/${id}`);
}

export async function getCustomerFollowUps(
  customerId: number,
  params?: { page?: number; pageSize?: number },
) {
  return requestClient.get<PaginatedResponse<FollowUp>>(
    `/customer/follow-up/customer/${customerId}`,
    { params },
  );
}

export async function getTodayFollowUps() {
  return requestClient.get<TodayFollowUp>('/customer/follow-up/today');
}

export async function getPendingFollowUps(params?: {
  includeOverdue?: boolean;
  daysAhead?: number;
  limit?: number;
}) {
  return requestClient.get<FollowUp[]>('/customer/follow-up/pending', {
    params,
  });
}

export async function getFollowUpStats(customerId?: number) {
  const params = customerId ? { customerId } : {};
  return requestClient.get<FollowUpStats>('/customer/follow-up/stats', {
    params,
  });
}

export async function createFollowUp(data: {
  customerId: number;
  type?: string;
  content: string;
  nextPlanAt?: string;
}) {
  return requestClient.post<FollowUp>('/customer/follow-up', data);
}

export async function updateFollowUp(
  id: number,
  data: {
    type?: string;
    content?: string;
    nextPlanAt?: string | null;
  },
) {
  return requestClient.put<FollowUp>(`/customer/follow-up/${id}`, data);
}

export async function markFollowUpCompleted(id: number) {
  return requestClient.put<FollowUp>(`/customer/follow-up/${id}/complete`);
}

export async function deleteFollowUp(id: number) {
  return requestClient.delete(`/customer/follow-up/${id}`);
}

// ==================== Direct Message Types ====================

export interface DirectMessageAttachment {
  type: 'image' | 'link' | 'miniprogram' | 'video' | 'file';
  mediaId?: number;
  imageUrl?: string;
  link?: {
    title: string;
    desc?: string;
    url: string;
    picurl?: string;
  };
  miniprogram?: {
    title: string;
    appid: string;
    page: string;
    picMediaId: number;
  };
}

export interface DirectMessage {
  id: number;
  customerId: number;
  customerName?: string;
  externalUserid: string;
  wecomUserId: string;
  senderId: number;
  messageType: string;
  status: 'PENDING' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  wecomMsgid?: string;
  content: {
    text?: string;
    attachments?: DirectMessageAttachment[];
  };
  failReason?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface SendDirectMessageDto {
  customerId: number;
  textContent?: string;
  attachments?: DirectMessageAttachment[];
  templateId?: number;
}

export interface SendBatchDirectMessageDto {
  customerIds: number[];
  textContent?: string;
  attachments?: DirectMessageAttachment[];
  templateId?: number;
}

export interface BatchSendResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  failedCount: number;
  messageIds: number[];
}

// ==================== Direct Message API ====================

export async function getDirectMessages(params?: Record<string, unknown>) {
  return requestClient.get<PaginatedResponse<DirectMessage>>(
    '/messaging/direct',
    { params },
  );
}

export async function getDirectMessage(id: number) {
  return requestClient.get<DirectMessage>(`/messaging/direct/${id}`);
}

export async function getCustomerMessages(
  customerId: number,
  params?: { page?: number; pageSize?: number },
) {
  return requestClient.get<PaginatedResponse<DirectMessage>>(
    `/customer/list/${customerId}/messages`,
    { params },
  );
}

export async function sendDirectMessage(data: SendDirectMessageDto) {
  return requestClient.post<DirectMessage>('/messaging/direct/send', data);
}

export async function sendBatchDirectMessages(data: SendBatchDirectMessageDto) {
  return requestClient.post<BatchSendResult>('/messaging/direct/batch', data);
}

// ==================== Message Template Types ====================

export interface MessageTemplateContent {
  text?: string;
  attachments?: DirectMessageAttachment[];
}

export interface MessageTemplate {
  id: number;
  name: string;
  category?: string;
  content: MessageTemplateContent;
  isActive: boolean;
  usageCount: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageTemplateDto {
  name: string;
  category?: string;
  content: MessageTemplateContent;
}

export interface UpdateMessageTemplateDto {
  name?: string;
  category?: string;
  content?: MessageTemplateContent;
  isActive?: boolean;
}

// ==================== Message Template API ====================

export async function getMessageTemplates(params?: Record<string, unknown>) {
  return requestClient.get<PaginatedResponse<MessageTemplate>>(
    '/messaging/template',
    { params },
  );
}

export async function getMessageTemplate(id: number) {
  return requestClient.get<MessageTemplate>(`/messaging/template/${id}`);
}

export async function createMessageTemplate(data: CreateMessageTemplateDto) {
  return requestClient.post<MessageTemplate>('/messaging/template', data);
}

export async function updateMessageTemplate(
  id: number,
  data: UpdateMessageTemplateDto,
) {
  return requestClient.put<MessageTemplate>(`/messaging/template/${id}`, data);
}

export async function deleteMessageTemplate(id: number) {
  return requestClient.delete(`/messaging/template/${id}`);
}

// ==================== Media Types ====================

export interface WecomMedia {
  id: number;
  type: 'IMAGE' | 'VIDEO' | 'FILE' | 'MINIPROGRAM_COVER';
  name: string;
  ossUrl?: string;
  fileSize: number;
  contentType?: string;
  wecomMediaId?: string;
  wecomExpiresAt?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadMediaDto {
  type?: 'IMAGE' | 'VIDEO' | 'FILE';
  name?: string;
}

export interface PresignedUrlResponse {
  signedUrl: string;
  key: string;
  expiresIn: number;
}

// ==================== Media API ====================

export async function getMediaList(params?: Record<string, unknown>) {
  return requestClient.get<PaginatedResponse<WecomMedia>>('/messaging/media', {
    params,
  });
}

export async function getMedia(id: number) {
  return requestClient.get<WecomMedia>(`/messaging/media/${id}`);
}

export async function uploadMedia(file: File, data?: UploadMediaDto) {
  const formData = new FormData();
  formData.append('file', file);
  if (data?.type) formData.append('type', data.type);
  if (data?.name) formData.append('name', data.name);

  return requestClient.post<WecomMedia>('/messaging/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function deleteMedia(id: number) {
  return requestClient.delete(`/messaging/media/${id}`);
}

export async function getPresignedUrl(filename: string, contentType: string) {
  return requestClient.post<PresignedUrlResponse>(
    '/messaging/media/presigned-url',
    {
      filename,
      contentType,
    },
  );
}

export async function refreshWecomMediaId(id: number) {
  return requestClient.post<{
    mediaId: number;
    wecomMediaId: string;
    expiresAt: string;
  }>(`/messaging/media/${id}/refresh`);
}

// ==================== Mass Message Types ====================

export interface QuickSendDto {
  name?: string;
  customerIds?: number[];
  tagIds?: number[];
  ownerId?: number;
  status?: string;
  lifecycleStage?: string;
  textContent?: string;
}

export interface QuickSendResponse {
  success: boolean;
  campaignId: number;
  audienceId: number;
  totalTarget: number;
  message: string;
}

export interface PreviewMassMessageDto {
  tagIds?: number[];
  ownerId?: number;
  status?: string;
  lifecycleStage?: string;
}

export interface PreviewMassMessageResponse {
  totalCount: number;
  sampleCustomers: {
    id: number;
    name: string;
    wecomExternalUserid?: string;
    ownerName?: string;
  }[];
  byOwner: {
    ownerId?: number;
    ownerName?: string;
    count: number;
  }[];
}

// ==================== Mass Message API ====================

export async function quickSendMassMessage(data: QuickSendDto) {
  return requestClient.post<QuickSendResponse>(
    '/messaging/mass-message/quick-send',
    data,
  );
}

export async function previewMassMessage(data: PreviewMassMessageDto) {
  return requestClient.post<PreviewMassMessageResponse>(
    '/messaging/mass-message/preview',
    data,
  );
}

// ==================== Employee Message Types ====================

export interface WecomEmployee {
  id: string;
  wecomUserId: string;
  userName: string | null;
  mobile: string;
  headImageUrl: string | null;
  department: unknown;
  customerCount: number;
}

export interface EmployeeCustomer {
  id: number;
  name: string;
  phone: string | null;
  wecomExternalUserid: string | null;
  addTime: string | null;
}

export interface SendToEmployeesDto {
  wecomUserIds: string[];
  textContent?: string;
  attachments?: DirectMessageAttachment[];
  templateId?: number;
  allowSelect?: boolean;
}

export interface EmployeeSendResult {
  wecomUserId: string;
  wecomUserName: string | null;
  customerCount: number;
  status: 'PENDING' | 'SENT' | 'FAILED';
  wecomMsgid?: string;
  failReason?: string;
}

export interface SendToEmployeesResponse {
  success: boolean;
  totalEmployees: number;
  totalCustomers: number;
  results: EmployeeSendResult[];
  messageIds: number[];
}

export interface SendTestMessageDto {
  customerId: number;
  textContent?: string;
  attachments?: DirectMessageAttachment[];
  templateId?: number;
}

// ==================== Employee Message API ====================

export async function getEmployees(params?: Record<string, unknown>) {
  return requestClient.get<PaginatedResponse<WecomEmployee>>(
    '/messaging/direct/employees',
    { params },
  );
}

export async function getEmployeeCustomers(
  wecomUserId: string,
  params?: Record<string, unknown>,
) {
  return requestClient.get<PaginatedResponse<EmployeeCustomer>>(
    `/messaging/direct/employees/${wecomUserId}/customers`,
    { params },
  );
}

export async function sendToEmployees(data: SendToEmployeesDto) {
  return requestClient.post<SendToEmployeesResponse>(
    '/messaging/direct/send-to-employees',
    data,
  );
}

export async function sendTestMessage(data: SendTestMessageDto) {
  return requestClient.post<DirectMessage>('/messaging/direct/test', data);
}
