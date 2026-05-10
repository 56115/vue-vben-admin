import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CredentialList from './CredentialList.vue';

const listCredentialsMock = vi.fn();
const deleteCredentialMock = vi.fn();

vi.mock('./credentials.api', () => ({
  listCredentials: (...args: unknown[]) => listCredentialsMock(...args),
  deleteCredential: (...args: unknown[]) => deleteCredentialMock(...args),
  testCredential: vi.fn(),
}));

vi.mock('ant-design-vue', () => ({
  message: { success: vi.fn(), error: vi.fn() },
}));

const SAMPLE = [
  {
    id: 1,
    provider: 'OPENAI',
    displayName: 'OpenAI Default',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyHint: 'sk-...abc',
    enabledModels: [
      { name: 'gpt-4o', capability: 'LLM' },
      { name: 'text-embedding-3-large', capability: 'EMBEDDING' },
    ],
    isActive: true,
    lastTestStatus: 'OK',
    lastTestedAt: '2026-05-09T12:00:00Z',
  },
];

describe('CredentialList', () => {
  beforeEach(() => {
    listCredentialsMock.mockReset();
    deleteCredentialMock.mockReset();
  });

  it('renders one card per credential with displayName, hint, model count, status badge', async () => {
    listCredentialsMock.mockResolvedValue(SAMPLE);
    const wrapper = mount(CredentialList, { props: { scope: 'tenant' } });
    await flushPromises();
    const cards = wrapper.findAll('[data-testid="credential-card"]');
    expect(cards).toHaveLength(1);
    const card = cards[0]!;
    expect(card.text()).toContain('OpenAI Default');
    expect(card.text()).toContain('sk-...abc');
    expect(card.text()).toContain('2'); // model count
    expect(card.find('[data-testid="cred-status-badge"]').text()).toContain(
      'OK',
    );
  });

  it("emits 'edit' event with credential id when 编辑 clicked", async () => {
    listCredentialsMock.mockResolvedValue(SAMPLE);
    const wrapper = mount(CredentialList, { props: { scope: 'tenant' } });
    await flushPromises();
    await wrapper.find('[data-testid="cred-edit-1"]').trigger('click');
    const events = wrapper.emitted('edit');
    expect(events?.[0]?.[0]).toBe(1);
  });

  it('on delete 409 with occupied[]: shows occupied list dialog', async () => {
    listCredentialsMock.mockResolvedValue(SAMPLE);
    const err = Object.assign(new Error('Conflict'), {
      response: {
        status: 409,
        data: { occupied: ['LLM_CHAT', 'PAPER_GRADING'] },
      },
    });
    deleteCredentialMock.mockRejectedValue(err);
    const wrapper = mount(CredentialList, { props: { scope: 'tenant' } });
    await flushPromises();
    await wrapper.find('[data-testid="cred-delete-1"]').trigger('click');
    await wrapper
      .find('[data-testid="cred-delete-confirm-1"]')
      .trigger('click');
    await flushPromises();
    const dlg = wrapper.find('[data-testid="cred-occupied-dialog"]');
    expect(dlg.exists()).toBe(true);
    expect(dlg.text()).toContain('LLM_CHAT');
    expect(dlg.text()).toContain('PAPER_GRADING');
  });

  it('renders TestConnectionButton inside each card', async () => {
    listCredentialsMock.mockResolvedValue(SAMPLE);
    const wrapper = mount(CredentialList, { props: { scope: 'tenant' } });
    await flushPromises();
    const tcb = wrapper.findComponent({ name: 'TestConnectionButton' });
    expect(tcb.exists()).toBe(true);
    expect(tcb.props('credentialId')).toBe(1);
    expect(tcb.props('scope')).toBe('tenant');
  });

  it('updates status badge after connection test event', async () => {
    listCredentialsMock.mockResolvedValue(SAMPLE);
    const wrapper = mount(CredentialList, { props: { scope: 'tenant' } });
    await flushPromises();
    wrapper
      .findComponent({ name: 'TestConnectionButton' })
      .vm.$emit('update:status', 'AUTH_FAILED');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="cred-status-badge"]').text()).toContain(
      'AUTH_FAILED',
    );
  });

  it("forwards scope='platform' into listCredentials", async () => {
    listCredentialsMock.mockResolvedValue([]);
    mount(CredentialList, { props: { scope: 'platform' } });
    await flushPromises();
    expect(listCredentialsMock).toHaveBeenCalledWith('platform');
  });
});
