import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CredentialDialog from './CredentialDialog.vue';

const createCredentialMock = vi.fn();
const updateCredentialMock = vi.fn();

vi.mock('./credentials.api', () => ({
  createCredential: (...args: unknown[]) => createCredentialMock(...args),
  updateCredential: (...args: unknown[]) => updateCredentialMock(...args),
}));

vi.mock('ant-design-vue', () => ({
  message: { success: vi.fn(), error: vi.fn() },
}));

describe('CredentialDialog', () => {
  beforeEach(() => {
    createCredentialMock.mockReset();
    updateCredentialMock.mockReset();
  });

  it("create mode: apiKey is required, blank submit shows validation error", async () => {
    const wrapper = mount(CredentialDialog, {
      props: { mode: 'create', scope: 'tenant', visible: true },
    });
    await wrapper.find('[data-testid="cred-input-baseUrl"]').setValue('https://api.openai.com/v1');
    await wrapper.find('[data-testid="cred-input-displayName"]').setValue('OpenAI Default');
    await wrapper.find('[data-testid="cred-submit"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="cred-error-apiKey"]').exists()).toBe(true);
    expect(createCredentialMock).not.toHaveBeenCalled();
  });

  it("edit mode: apiKey placeholder hints '留空表示不变' and blank submit omits apiKey", async () => {
    updateCredentialMock.mockResolvedValue({ id: 1 });
    const wrapper = mount(CredentialDialog, {
      props: {
        mode: 'edit',
        scope: 'tenant',
        visible: true,
        initialValue: {
          id: 1,
          provider: 'OPENAI',
          displayName: 'My OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          apiKeyHint: 'sk-...abc',
          enabledModels: [{ name: 'gpt-4o', capability: 'LLM' }],
          isActive: true,
        },
      },
    });
    const input = wrapper.find('[data-testid="cred-input-apiKey"]');
    expect(input.attributes('placeholder')).toContain('留空表示不变');
    await wrapper.find('[data-testid="cred-submit"]').trigger('click');
    await flushPromises();
    expect(updateCredentialMock).toHaveBeenCalled();
    const [, , dto] = updateCredentialMock.mock.calls[0] as [string, number, Record<string, unknown>];
    expect('apiKey' in dto).toBe(false);
  });

  it('baseUrl is required and must be http(s)://', async () => {
    const wrapper = mount(CredentialDialog, {
      props: { mode: 'create', scope: 'tenant', visible: true },
    });
    await wrapper.find('[data-testid="cred-input-apiKey"]').setValue('sk-test');
    await wrapper.find('[data-testid="cred-input-displayName"]').setValue('Test');
    await wrapper.find('[data-testid="cred-input-baseUrl"]').setValue('not-a-url');
    await wrapper.find('[data-testid="cred-submit"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="cred-error-baseUrl"]').exists()).toBe(true);
    expect(createCredentialMock).not.toHaveBeenCalled();
  });

  it('switching provider auto-fills baseUrl from PROVIDER_PRESETS', async () => {
    const wrapper = mount(CredentialDialog, {
      props: { mode: 'create', scope: 'tenant', visible: true },
    });
    const select = wrapper.find('[data-testid="cred-select-provider"]');
    await select.setValue('DEEPSEEK');
    const baseUrl = wrapper.find<HTMLInputElement>('[data-testid="cred-input-baseUrl"]');
    expect((baseUrl.element as HTMLInputElement).value).toBe('https://api.deepseek.com/v1');
  });

  it('embeds ModelChipsEditor and forwards enabledModels two-way binding', async () => {
    const wrapper = mount(CredentialDialog, {
      props: {
        mode: 'create',
        scope: 'tenant',
        visible: true,
      },
    });
    const editor = wrapper.findComponent({ name: 'ModelChipsEditor' });
    expect(editor.exists()).toBe(true);
    expect(editor.props('modelValue')).toEqual([]);
    editor.vm.$emit('update:modelValue', [{ name: 'gpt-4o', capability: 'LLM' }]);
    await flushPromises();
    expect(editor.props('modelValue')).toEqual([{ name: 'gpt-4o', capability: 'LLM' }]);
  });
});
