import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TestConnectionButton from './TestConnectionButton.vue';

const testCredentialMock = vi.fn();

vi.mock('./credentials.api', () => ({
  testCredential: (scope: string, id: number) => testCredentialMock(scope, id),
}));

const messageSuccess = vi.fn();
const messageError = vi.fn();
const messageWarning = vi.fn();

vi.mock('ant-design-vue', () => ({
  message: {
    success: (...args: unknown[]) => messageSuccess(...args),
    error: (...args: unknown[]) => messageError(...args),
    warning: (...args: unknown[]) => messageWarning(...args),
  },
}));

describe('TestConnectionButton', () => {
  beforeEach(() => {
    testCredentialMock.mockReset();
    messageSuccess.mockReset();
    messageError.mockReset();
    messageWarning.mockReset();
  });

  it('shows loading state while request is in flight', async () => {
    let resolve!: (v: { status: string }) => void;
    testCredentialMock.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r as never;
        }),
    );
    const wrapper = mount(TestConnectionButton, {
      props: { credentialId: 42, scope: 'tenant' },
    });
    await wrapper.find('[data-testid="test-connection-btn"]').trigger('click');
    expect(
      wrapper
        .find('[data-testid="test-connection-btn"]')
        .attributes('disabled'),
    ).toBeDefined();
    expect(wrapper.text()).toContain('测试中');
    resolve({ status: 'OK' });
    await flushPromises();
    expect(
      wrapper
        .find('[data-testid="test-connection-btn"]')
        .attributes('disabled'),
    ).toBeUndefined();
  });

  it('on OK status: emits update:status and shows success toast', async () => {
    testCredentialMock.mockResolvedValue({ status: 'OK' });
    const wrapper = mount(TestConnectionButton, {
      props: { credentialId: 7, scope: 'tenant' },
    });
    await wrapper.find('[data-testid="test-connection-btn"]').trigger('click');
    await flushPromises();
    expect(testCredentialMock).toHaveBeenCalledWith('tenant', 7);
    const events = wrapper.emitted('update:status');
    expect(events?.[0]?.[0]).toBe('OK');
    expect(messageSuccess).toHaveBeenCalled();
  });

  it('on AUTH_FAILED: shows failure toast containing AUTH_FAILED', async () => {
    testCredentialMock.mockResolvedValue({
      status: 'AUTH_FAILED',
      message: 'invalid key',
    });
    const wrapper = mount(TestConnectionButton, {
      props: { credentialId: 9, scope: 'tenant' },
    });
    await wrapper.find('[data-testid="test-connection-btn"]').trigger('click');
    await flushPromises();
    expect(messageError).toHaveBeenCalled();
    const errArg = messageError.mock.calls[0]?.[0] as string;
    expect(errArg).toContain('AUTH_FAILED');
  });

  it('handles raw status string responses from backend', async () => {
    testCredentialMock.mockResolvedValue('AUTH_FAILED');
    const wrapper = mount(TestConnectionButton, {
      props: { credentialId: 9, scope: 'tenant' },
    });
    await wrapper.find('[data-testid="test-connection-btn"]').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('update:status')?.[0]?.[0]).toBe('AUTH_FAILED');
    const errArg = messageError.mock.calls[0]?.[0] as string;
    expect(errArg).toContain('AUTH_FAILED');
  });

  it('on axios reject: shows network-error toast', async () => {
    testCredentialMock.mockRejectedValue(new Error('Network down'));
    const wrapper = mount(TestConnectionButton, {
      props: { credentialId: 9, scope: 'tenant' },
    });
    await wrapper.find('[data-testid="test-connection-btn"]').trigger('click');
    await flushPromises();
    expect(messageError).toHaveBeenCalled();
    const errArg = messageError.mock.calls[0]?.[0] as string;
    expect(errArg).toMatch(/网络|Network/i);
  });

  it("when scope='platform' it forwards 'platform' to testCredential", async () => {
    testCredentialMock.mockResolvedValue({ status: 'OK' });
    const wrapper = mount(TestConnectionButton, {
      props: { credentialId: 3, scope: 'platform' },
    });
    await wrapper.find('[data-testid="test-connection-btn"]').trigger('click');
    await flushPromises();
    expect(testCredentialMock).toHaveBeenCalledWith('platform', 3);
  });
});
