import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TenantPage from './index.vue';

const getMock = vi.fn();
const putMock = vi.fn();
const postMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('#/api/request', () => ({
  requestClient: {
    get: (...args: unknown[]) => getMock(...args),
    put: (...args: unknown[]) => putMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

vi.mock('ant-design-vue', async () => {
  return {
    message: { error: vi.fn(), success: vi.fn() },
    Button: { name: 'Button', template: '<button><slot /></button>' },
    Checkbox: Object.assign(
      { name: 'Checkbox', template: '<label><slot /></label>' },
      { Group: { name: 'CheckboxGroup', template: '<div><slot /></div>' } },
    ),
    Form: Object.assign(
      { name: 'Form', template: '<form><slot /></form>' },
      { Item: { name: 'FormItem', template: '<div><slot /></div>' } },
    ),
    Input: Object.assign(
      { name: 'Input', template: '<input />' },
      { TextArea: { name: 'InputTextArea', template: '<textarea />' } },
    ),
    Modal: { name: 'Modal', template: '<div><slot /></div>' },
    Popconfirm: { name: 'Popconfirm', template: '<span><slot /></span>' },
    Select: Object.assign(
      { name: 'Select', template: '<select><slot /></select>' },
      {
        Option: { name: 'SelectOption', template: '<option><slot /></option>' },
      },
    ),
    Space: { name: 'Space', template: '<span><slot /></span>' },
    Table: { name: 'Table', template: '<div />' },
    Tag: { name: 'Tag', template: '<span><slot /></span>' },
  };
});

describe('TenantPage subscription module options', () => {
  beforeEach(() => {
    getMock.mockReset().mockImplementation((path: string) => {
      if (path === '/platform/tenants')
        return Promise.resolve({ items: [], total: 0 });
      if (path === '/platform/app-modules/subscription-options')
        return Promise.resolve({ items: [], total: 0 });
      if (path === '/platform/tenants/1/subscriptions')
        return Promise.resolve([]);
      return Promise.resolve({ items: [], total: 0 });
    });
    putMock.mockReset().mockResolvedValue({});
    postMock.mockReset().mockResolvedValue({});
    deleteMock.mockReset().mockResolvedValue({});
  });

  it('loads module choices from the subscription-options endpoint', async () => {
    mount(TenantPage);
    await flushPromises();

    expect(getMock).toHaveBeenCalledWith(
      '/platform/app-modules/subscription-options',
    );
    expect(getMock).not.toHaveBeenCalledWith('/platform/app-modules');
  });
});
