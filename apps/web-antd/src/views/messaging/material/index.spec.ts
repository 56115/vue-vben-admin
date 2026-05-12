import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MaterialPage from './index.vue';

const getMock = vi.fn();
const postMock = vi.fn();
const putMock = vi.fn();
const deleteMock = vi.fn();
const pushMock = vi.fn();
const confirmMock = vi.fn();
const messageMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('#/api/request', () => ({
  requestClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    put: (...args: unknown[]) => putMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

vi.mock('#/composables', async () => {
  const vue = await import('vue');

  return {
    useModalForm: () => ({
      visible: vue.ref(false),
      formState: vue.ref({
        name: '',
        description: '',
        type: 'TEXT',
        content: '',
        mediaIds: [],
        linkUrl: '',
        linkTitle: '',
        categoryId: null,
        tags: [],
        isPublic: true,
      }),
      isEditing: vue.ref(false),
      openCreate: vi.fn(),
      openEdit: vi.fn(),
      submit: vi.fn(),
    }),
  };
});

vi.mock('ant-design-vue', async () => {
  const vue = await import('vue');
  const Button = {
    name: 'Button',
    props: ['danger', 'type', 'size', 'title'],
    template: '<button :title="title"><slot /></button>',
  };

  const Tree = {
    name: 'Tree',
    props: ['treeData', 'selectedKeys'],
    emits: ['select'],
    setup(props: any, { emit, slots }: any) {
      const renderNode = (node: any) =>
        vue.h('li', { 'data-tree-key': String(node.key) }, [
          vue.h(
            'button',
            {
              type: 'button',
              'data-testid': `select-category-${node.key}`,
              onClick: () => emit('select', [node.key]),
            },
            'select',
          ),
          slots.title?.(node),
          node.children?.length
            ? vue.h('ul', {}, node.children.map(renderNode))
            : null,
        ]);

      return () =>
        vue.h(
          'ul',
          { 'data-testid': 'category-tree' },
          props.treeData.map(renderNode),
        );
    },
  };

  const Select = Object.assign(
    { name: 'Select', template: '<select><slot /></select>' },
    { Option: { name: 'SelectOption', template: '<option><slot /></option>' } },
  );

  return {
    Button,
    Card: {
      name: 'Card',
      template:
        '<section><slot name="title" /><slot name="extra" /><slot /></section>',
    },
    Empty: { name: 'Empty', template: '<div />' },
    Form: Object.assign(
      { name: 'Form', template: '<form><slot /></form>' },
      { Item: { name: 'FormItem', template: '<div><slot /></div>' } },
    ),
    Input: Object.assign(
      { name: 'Input', template: '<input />' },
      { TextArea: { name: 'InputTextArea', template: '<textarea />' } },
    ),
    message: messageMock,
    Modal: Object.assign(
      { name: 'Modal', template: '<div><slot /></div>' },
      { confirm: (...args: unknown[]) => confirmMock(...args) },
    ),
    Pagination: { name: 'Pagination', template: '<div />' },
    Radio: Object.assign(
      { name: 'Radio', template: '<label><slot /></label>' },
      {
        Group: { name: 'RadioGroup', template: '<div><slot /></div>' },
        Button: { name: 'RadioButton', template: '<button><slot /></button>' },
      },
    ),
    Select,
    Space: { name: 'Space', template: '<span><slot /></span>' },
    Tooltip: { name: 'Tooltip', template: '<span><slot /></span>' },
    Tree,
  };
});

vi.mock('@ant-design/icons-vue', () => {
  const icon = (name: string) => ({
    name,
    template: `<span data-icon="${name}" />`,
  });
  return {
    AppstoreOutlined: icon('AppstoreOutlined'),
    BarChartOutlined: icon('BarChartOutlined'),
    CheckSquareOutlined: icon('CheckSquareOutlined'),
    DeleteOutlined: icon('DeleteOutlined'),
    ExportOutlined: icon('ExportOutlined'),
    FileOutlined: icon('FileOutlined'),
    FileTextOutlined: icon('FileTextOutlined'),
    FolderOpenOutlined: icon('FolderOpenOutlined'),
    FolderOutlined: icon('FolderOutlined'),
    HistoryOutlined: icon('HistoryOutlined'),
    ImportOutlined: icon('ImportOutlined'),
    LinkOutlined: icon('LinkOutlined'),
    PictureOutlined: icon('PictureOutlined'),
    PlusOutlined: icon('PlusOutlined'),
    UnorderedListOutlined: icon('UnorderedListOutlined'),
    VideoCameraOutlined: icon('VideoCameraOutlined'),
  };
});

vi.mock('./components/MaterialCard.vue', () => ({
  default: {
    name: 'MaterialCard',
    props: ['material'],
    template: '<article class="material-card">{{ material.name }}</article>',
  },
}));
vi.mock('./components/BatchToolbar.vue', () => ({
  default: { name: 'BatchToolbar', template: '<div />' },
}));
vi.mock('./components/FilterPanel.vue', () => ({
  default: { name: 'FilterPanel', template: '<div />' },
}));
vi.mock('./components/MaterialDetailDrawer.vue', () => ({
  default: { name: 'MaterialDetailDrawer', template: '<div />' },
}));
vi.mock('./components/ImportExportModal.vue', () => ({
  default: { name: 'ImportExportModal', template: '<div />' },
}));
vi.mock('./components/VersionManager.vue', () => ({
  default: { name: 'VersionManager', template: '<div />' },
}));
vi.mock('./components/AIAssistant.vue', () => ({
  default: { name: 'AIAssistant', template: '<div />' },
}));

describe('MaterialPage category management', () => {
  beforeEach(() => {
    getMock.mockReset().mockImplementation((path: string) => {
      if (path === '/messaging/material/categories/tree') {
        return Promise.resolve([
          {
            id: 1,
            name: '产品图片',
            parentId: null,
            sort: 1,
            materialCount: 0,
            children: [],
          },
        ]);
      }

      if (path === '/messaging/material') {
        return Promise.resolve({ items: [], total: 0 });
      }

      return Promise.resolve({});
    });
    postMock.mockReset().mockResolvedValue({});
    putMock.mockReset().mockResolvedValue({});
    deleteMock.mockReset().mockResolvedValue({});
    pushMock.mockReset();
    confirmMock
      .mockReset()
      .mockImplementation(({ onOk }: { onOk?: () => unknown }) => onOk?.());
    messageMock.error.mockReset();
    messageMock.success.mockReset();
    messageMock.warning.mockReset();
    messageMock.info.mockReset();
  });

  it('deletes the selected category, refreshes data, and returns to all categories', async () => {
    const wrapper = mount(MaterialPage);
    await flushPromises();

    await wrapper.get('[data-testid="select-category-1"]').trigger('click');
    await flushPromises();
    expect(
      wrapper.findComponent({ name: 'Tree' }).props('selectedKeys'),
    ).toEqual([1]);

    await wrapper.get('[data-testid="delete-category-1"]').trigger('click');
    await flushPromises();

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '确认删除分类',
      }),
    );
    expect(deleteMock).toHaveBeenCalledWith('/messaging/material/categories/1');
    expect(getMock).toHaveBeenCalledWith('/messaging/material/categories/tree');
    expect(getMock).toHaveBeenCalledWith(
      '/messaging/material',
      expect.objectContaining({
        params: expect.objectContaining({ page: 1, pageSize: 20 }),
      }),
    );
    expect(
      wrapper.findComponent({ name: 'Tree' }).props('selectedKeys'),
    ).toEqual(['all']);
  });

  it('shows the backend reason when a category cannot be deleted', async () => {
    deleteMock.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Cannot delete category with materials',
        },
      },
    });

    const wrapper = mount(MaterialPage);
    await flushPromises();

    await wrapper.get('[data-testid="select-category-1"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="delete-category-1"]').trigger('click');
    await flushPromises();

    expect(messageMock.error).toHaveBeenCalledWith(
      'Cannot delete category with materials',
    );
    expect(
      wrapper.findComponent({ name: 'Tree' }).props('selectedKeys'),
    ).toEqual([1]);
  });

  it('keeps the all categories tree node visible when no categories exist', async () => {
    getMock.mockImplementation((path: string) => {
      if (path === '/messaging/material/categories/tree') {
        return Promise.resolve([]);
      }

      if (path === '/messaging/material') {
        return Promise.resolve({ items: [], total: 0 });
      }

      return Promise.resolve({});
    });

    const wrapper = mount(MaterialPage);
    await flushPromises();

    expect(wrapper.get('[data-testid="select-category-all"]').exists()).toBe(
      true,
    );
    expect(
      wrapper.findComponent({ name: 'Tree' }).props('selectedKeys'),
    ).toEqual(['all']);
  });
});
