import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import DefaultModelPicker from './DefaultModelPicker.vue';

const CREDS = [
  {
    id: 12,
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
  {
    id: 13,
    provider: 'DEEPSEEK',
    displayName: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyHint: 'sk-...',
    enabledModels: [{ name: 'deepseek-chat', capability: 'LLM' }],
    isActive: false, // inactive — should be filtered out
  },
];

describe('DefaultModelPicker', () => {
  it('renders options sourced from active credentials filtered by capability', () => {
    const wrapper = mount(DefaultModelPicker, {
      props: { credentials: CREDS, capability: 'LLM', modelValue: '' },
    });
    const opts = wrapper.findAll('option');
    const values = opts.map((o) => o.attributes('value'));
    // Should include gpt-4o LLM from active credential 12
    expect(values).toContain('12:gpt-4o');
    // Should NOT include deepseek-chat (credential 13 is inactive)
    expect(values).not.toContain('13:deepseek-chat');
    // Should NOT include EMBEDDING entries when capability=LLM
    expect(values).not.toContain('12:text-embedding-3-large');
  });

  it('emits update:modelValue when selection changes', async () => {
    const wrapper = mount(DefaultModelPicker, {
      props: { credentials: CREDS, capability: 'LLM', modelValue: '' },
    });
    const select = wrapper.find('select');
    await select.setValue('12:gpt-4o');
    const events = wrapper.emitted('update:modelValue');
    expect(events?.[0]?.[0]).toBe('12:gpt-4o');
  });

  it('shows hint when credentials list is empty', () => {
    const wrapper = mount(DefaultModelPicker, {
      props: { credentials: [], capability: 'LLM', modelValue: '' },
    });
    expect(wrapper.text()).toContain('请先创建凭据');
  });

  it("highlights selected option matching modelValue '12:gpt-4o'", () => {
    const wrapper = mount(DefaultModelPicker, {
      props: { credentials: CREDS, capability: 'LLM', modelValue: '12:gpt-4o' },
    });
    const select = wrapper.find<HTMLSelectElement>('select');
    expect((select.element as HTMLSelectElement).value).toBe('12:gpt-4o');
  });

  it('formats option label as "displayName / modelName"', () => {
    const wrapper = mount(DefaultModelPicker, {
      props: { credentials: CREDS, capability: 'LLM', modelValue: '' },
    });
    const opt = wrapper
      .findAll('option')
      .find((o) => o.attributes('value') === '12:gpt-4o');
    expect(opt?.text()).toBe('OpenAI / gpt-4o');
  });
});
