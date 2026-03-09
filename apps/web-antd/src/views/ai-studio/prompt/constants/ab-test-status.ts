import { AbTestStatus } from '#/api/ai-studio/prompt-ab-testing';

export const AB_TEST_STATUS_CONFIG: Record<
  string,
  { color: string; label: string }
> = {
  [AbTestStatus.DRAFT]: { color: 'default', label: '草稿' },
  [AbTestStatus.ACTIVE]: { color: 'processing', label: '运行中' },
  [AbTestStatus.PAUSED]: { color: 'warning', label: '已暂停' },
  [AbTestStatus.COMPLETED]: { color: 'success', label: '已完成' },
};
