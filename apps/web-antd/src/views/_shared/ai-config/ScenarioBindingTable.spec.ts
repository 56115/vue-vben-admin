import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ScenarioBindingTable from './ScenarioBindingTable.vue';

const getScenarioBindingsMock = vi.fn();
const setScenarioBindingsMock = vi.fn();
const putScenarioParamsMock = vi.fn();

vi.mock('./credentials.api', () => ({
  getScenarioBindings: (...args: unknown[]) => getScenarioBindingsMock(...args),
  setScenarioBindings: (...args: unknown[]) => setScenarioBindingsMock(...args),
}));

vi.mock('#/api/request', () => ({
  requestClient: {
    put: (...args: unknown[]) => putScenarioParamsMock(...args),
  },
}));

vi.mock('ant-design-vue', () => ({
  message: { success: vi.fn(), error: vi.fn() },
}));

const CREDS = [
  {
    id: 1,
    provider: 'OPENAI',
    displayName: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyHint: 'sk-...',
    enabledModels: [
      { name: 'gpt-4o', capability: 'LLM' },
      { name: 'gpt-4o', capability: 'VISION' },
      { name: 'text-embedding-3-large', capability: 'EMBEDDING' },
    ],
    isActive: true,
  },
];

describe('ScenarioBindingTable', () => {
  beforeEach(() => {
    getScenarioBindingsMock.mockReset();
    setScenarioBindingsMock.mockReset();
    putScenarioParamsMock.mockReset();
  });

  it('renders 7 rows, one per AiScenario', async () => {
    getScenarioBindingsMock.mockResolvedValue([]);
    const wrapper = mount(ScenarioBindingTable, {
      props: { scope: 'tenant', credentials: CREDS },
    });
    await flushPromises();
    const rows = wrapper.findAll('[data-testid="scenario-row"]');
    expect(rows).toHaveLength(7);
    const scenarios = rows.map((r) => r.attributes('data-scenario'));
    expect(scenarios).toEqual([
      'LLM_CHAT',
      'LLM_REASONING',
      'VISION_OCR',
      'VISION_ANALYSIS',
      'EMBEDDING',
      'PAPER_RECOGNITION',
      'PAPER_GRADING',
    ]);
  });

  it("each row shows the capability expected by capabilityFor()", async () => {
    getScenarioBindingsMock.mockResolvedValue([]);
    const wrapper = mount(ScenarioBindingTable, {
      props: { scope: 'tenant', credentials: CREDS },
    });
    await flushPromises();
    const ocrRow = wrapper.find('[data-scenario="VISION_OCR"]');
    expect(ocrRow.find('[data-testid="scenario-capability"]').text()).toBe('VISION');
    const embedRow = wrapper.find('[data-scenario="EMBEDDING"]');
    expect(embedRow.find('[data-testid="scenario-capability"]').text()).toBe('EMBEDDING');
  });

  it('inline DefaultModelPicker per row receives correct capability filter', async () => {
    getScenarioBindingsMock.mockResolvedValue([]);
    const wrapper = mount(ScenarioBindingTable, {
      props: { scope: 'tenant', credentials: CREDS },
    });
    await flushPromises();
    const pickers = wrapper.findAllComponents({ name: 'DefaultModelPicker' });
    expect(pickers).toHaveLength(7);
    const llmRow = wrapper.find('[data-scenario="LLM_CHAT"]');
    const llmPicker = llmRow.findComponent({ name: 'DefaultModelPicker' });
    expect(llmPicker.props('capability')).toBe('LLM');
  });

  it('save button hits scenarios endpoint with /api/settings/ai-config/scenarios prefix when scope=tenant', async () => {
    getScenarioBindingsMock.mockResolvedValue([]);
    putScenarioParamsMock.mockResolvedValue({});
    const wrapper = mount(ScenarioBindingTable, {
      props: { scope: 'tenant', credentials: CREDS },
    });
    await flushPromises();
    const llmRow = wrapper.find('[data-scenario="LLM_CHAT"]');
    await llmRow.find('[data-testid="scenario-input-temperature"]').setValue('0.5');
    await llmRow.find('[data-testid="scenario-save"]').trigger('click');
    await flushPromises();
    const [path] = putScenarioParamsMock.mock.calls[0] as [string, unknown];
    expect(path).toBe('/settings/ai-config/scenarios/LLM_CHAT');
  });

  it("scope='platform' uses /platform/... path on save", async () => {
    getScenarioBindingsMock.mockResolvedValue([]);
    putScenarioParamsMock.mockResolvedValue({});
    const wrapper = mount(ScenarioBindingTable, {
      props: { scope: 'platform', credentials: CREDS },
    });
    await flushPromises();
    const llmRow = wrapper.find('[data-scenario="LLM_CHAT"]');
    await llmRow.find('[data-testid="scenario-save"]').trigger('click');
    await flushPromises();
    const [path] = putScenarioParamsMock.mock.calls[0] as [string, unknown];
    expect(path).toBe('/platform/ai-config/scenarios/LLM_CHAT');
  });
});
