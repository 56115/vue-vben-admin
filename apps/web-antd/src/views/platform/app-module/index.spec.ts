import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AppModulePage from './index.vue';

const getMock = vi.fn();
const postMock = vi.fn();
const putMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('#/api/request', () => ({
  requestClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    put: (...args: unknown[]) => putMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

vi.mock('ant-design-vue', async () => {
  const vue = await import('vue');
  return {
    message: { error: vi.fn(), success: vi.fn() },
    Table: {
      name: 'Table',
      props: ['columns', 'dataSource'],
      setup(props: { columns: unknown[]; dataSource: unknown[] }) {
        return () =>
          vue.h(
            'div',
            { 'data-testid': 'table' },
            JSON.stringify({ columns: props.columns, rows: props.dataSource }),
          );
      },
    },
    Tag: { name: 'Tag', template: '<span><slot /></span>' },
  };
});

describe('AppModulePage', () => {
  beforeEach(() => {
    getMock.mockReset().mockResolvedValue({
      items: [
        {
          id: '1',
          code: 'CRM',
          name: '客户管理',
          description: '客户模块',
          icon: 'ant-design:user-outlined',
          sort: 10,
          isActive: true,
          createdAt: '2026-05-12T00:00:00.000Z',
          updatedAt: '2026-05-12T00:00:00.000Z',
        },
      ],
      total: 1,
    });
    postMock.mockReset();
    putMock.mockReset();
    deleteMock.mockReset();
  });

  it('loads the protected system catalog route', async () => {
    mount(AppModulePage);
    await flushPromises();

    expect(getMock).toHaveBeenCalledWith(
      '/platform/app-modules',
      expect.anything(),
    );
  });

  it('does not render create edit or delete actions', async () => {
    const wrapper = mount(AppModulePage);
    await flushPromises();

    expect(wrapper.text()).not.toContain('新增模块');
    expect(wrapper.text()).not.toContain('编辑');
    expect(wrapper.text()).not.toContain('删除');
  });
});
