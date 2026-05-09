import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TenantAiConfigPage from './index.vue';

const listCredentialsMock = vi.fn();
const getDefaultModelsMock = vi.fn();
const setDefaultModelsMock = vi.fn();
const getScenarioBindingsMock = vi.fn();

vi.mock('../../_shared/ai-config/credentials.api', () => ({
  listCredentials: (...args: unknown[]) => listCredentialsMock(...args),
  getDefaultModels: (...args: unknown[]) => getDefaultModelsMock(...args),
  setDefaultModels: (...args: unknown[]) => setDefaultModelsMock(...args),
  getScenarioBindings: (...args: unknown[]) => getScenarioBindingsMock(...args),
  testCredential: vi.fn(),
  deleteCredential: vi.fn(),
  createCredential: vi.fn(),
  updateCredential: vi.fn(),
  setScenarioBindings: vi.fn(),
}));

vi.mock('#/api/request', () => ({
  requestClient: { put: vi.fn().mockResolvedValue({}) },
}));

vi.mock('ant-design-vue', () => ({
  message: { success: vi.fn(), error: vi.fn() },
}));

describe('TenantAiConfigPage (settings/ai-config)', () => {
  beforeEach(() => {
    listCredentialsMock.mockReset().mockResolvedValue([]);
    getDefaultModelsMock.mockReset().mockResolvedValue([]);
    setDefaultModelsMock.mockReset().mockResolvedValue([]);
    getScenarioBindingsMock.mockReset().mockResolvedValue([]);
  });

  it('renders 3 tabs: 凭据管理 / 默认模型 / 场景覆盖（高级）', async () => {
    const wrapper = mount(TenantAiConfigPage);
    await flushPromises();
    const tabs = wrapper.findAll('[data-testid^="tab-"]');
    const labels = tabs.map((t) => t.text());
    expect(labels).toContain('凭据管理');
    expect(labels).toContain('默认模型');
    expect(labels).toContain('场景覆盖（高级）');
  });

  it("tab1 renders CredentialList scope='tenant' and opens CredentialDialog when 新增 clicked", async () => {
    const wrapper = mount(TenantAiConfigPage);
    await flushPromises();
    const list = wrapper.findComponent({ name: 'CredentialList' });
    expect(list.exists()).toBe(true);
    expect(list.props('scope')).toBe('tenant');
    list.vm.$emit('add');
    await flushPromises();
    const dialog = wrapper.findComponent({ name: 'CredentialDialog' });
    expect(dialog.exists()).toBe(true);
    expect(dialog.props('visible')).toBe(true);
  });

  it('tab2 renders 3 DefaultModelPickers (LLM/VISION/EMBEDDING) and save hits PUT /settings/ai-config/defaults', async () => {
    const wrapper = mount(TenantAiConfigPage);
    await flushPromises();
    await wrapper.find('[data-testid="tab-defaults"]').trigger('click');
    await flushPromises();
    const pickers = wrapper.findAllComponents({ name: 'DefaultModelPicker' });
    expect(pickers).toHaveLength(3);
    const caps = pickers.map((p) => p.props('capability'));
    expect(caps.sort()).toEqual(['EMBEDDING', 'LLM', 'VISION']);
    await wrapper.find('[data-testid="defaults-save"]').trigger('click');
    await flushPromises();
    expect(setDefaultModelsMock).toHaveBeenCalled();
    expect(setDefaultModelsMock.mock.calls[0]?.[0]).toBe('tenant');
  });

  it("tab3 renders ScenarioBindingTable with scope='tenant'", async () => {
    const wrapper = mount(TenantAiConfigPage);
    await flushPromises();
    await wrapper.find('[data-testid="tab-scenarios"]').trigger('click');
    await flushPromises();
    const table = wrapper.findComponent({ name: 'ScenarioBindingTable' });
    expect(table.exists()).toBe(true);
    expect(table.props('scope')).toBe('tenant');
  });

  it('on mount triggers listCredentials and getDefaultModels for tenant scope', async () => {
    mount(TenantAiConfigPage);
    await flushPromises();
    expect(listCredentialsMock).toHaveBeenCalledWith('tenant');
    expect(getDefaultModelsMock).toHaveBeenCalledWith('tenant');
  });
});
