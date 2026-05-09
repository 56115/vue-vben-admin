import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ModelChipsEditor from './ModelChipsEditor.vue';

describe('ModelChipsEditor', () => {
  it('renders modelValue as chip list', () => {
    const wrapper = mount(ModelChipsEditor, {
      props: {
        modelValue: [
          { name: 'gpt-4o', capability: 'LLM' },
          { name: 'text-embedding-3-large', capability: 'EMBEDDING' },
        ],
        provider: 'OPENAI',
      },
    });
    const chips = wrapper.findAll('[data-testid="model-chip"]');
    expect(chips).toHaveLength(2);
    expect(chips[0]?.text()).toContain('gpt-4o');
    expect(chips[1]?.text()).toContain('text-embedding-3-large');
  });

  it('renders empty-state hint when modelValue is empty', () => {
    const wrapper = mount(ModelChipsEditor, {
      props: { modelValue: [], provider: 'OPENAI' },
    });
    expect(wrapper.text()).toContain('还没添加任何模型');
  });

  it('emits update:modelValue without removed item when chip remove is clicked', async () => {
    const wrapper = mount(ModelChipsEditor, {
      props: {
        modelValue: [
          { name: 'gpt-4o', capability: 'LLM' },
          { name: 'gpt-4o-mini', capability: 'LLM' },
        ],
        provider: 'OPENAI',
      },
    });
    await wrapper.find('[data-testid="model-chip-remove-gpt-4o"]').trigger('click');
    const events = wrapper.emitted('update:modelValue');
    expect(events).toBeTruthy();
    expect(events?.[0]?.[0]).toEqual([{ name: 'gpt-4o-mini', capability: 'LLM' }]);
  });

  it('opens preset picker showing PROVIDER_PRESETS[provider].models when quick-add clicked', async () => {
    const wrapper = mount(ModelChipsEditor, {
      props: { modelValue: [], provider: 'DEEPSEEK' },
    });
    await wrapper.find('[data-testid="model-quick-add"]').trigger('click');
    const picker = wrapper.find('[data-testid="model-preset-picker"]');
    expect(picker.exists()).toBe(true);
    expect(picker.text()).toContain('deepseek-chat');
    expect(picker.text()).toContain('deepseek-reasoner');
  });

  it('emits merged + de-duplicated array after preset confirm', async () => {
    const wrapper = mount(ModelChipsEditor, {
      props: {
        modelValue: [{ name: 'deepseek-chat', capability: 'LLM' }],
        provider: 'DEEPSEEK',
      },
    });
    await wrapper.find('[data-testid="model-quick-add"]').trigger('click');
    await wrapper
      .find('[data-testid="preset-checkbox-deepseek-chat-LLM"]')
      .setValue(true);
    await wrapper
      .find('[data-testid="preset-checkbox-deepseek-reasoner-LLM"]')
      .setValue(true);
    await wrapper.find('[data-testid="preset-confirm"]').trigger('click');

    const events = wrapper.emitted('update:modelValue');
    expect(events).toBeTruthy();
    const merged = events?.at(-1)?.[0] as Array<{ capability: string; name: string }>;
    const names = merged.map((m) => m.name);
    expect(names).toContain('deepseek-chat');
    expect(names).toContain('deepseek-reasoner');
    // De-duplication: deepseek-chat should appear only once
    expect(names.filter((n) => n === 'deepseek-chat')).toHaveLength(1);
  });
});
