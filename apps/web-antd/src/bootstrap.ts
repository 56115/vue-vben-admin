import { createApp, watchEffect } from 'vue';

import { registerAccessDirective } from '@vben/access';
import { registerLoadingDirective } from '@vben/common-ui/es/loading';
import { preferences } from '@vben/preferences';
import { initStores } from '@vben/stores';
import '@vben/styles';
import '@vben/styles/antd';

import { useTitle } from '@vueuse/core';

import { $t, setupI18n } from '#/locales';

import { initComponentAdapter } from './adapter/component';
import { initSetupVbenForm } from './adapter/form';
import App from './app.vue';
import { router } from './router';

// 导入需要全局注册的 Ant Design Vue 组件
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Menu,
  Modal,
  Pagination,
  Radio,
  Rate,
  Result,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Tree,
  Upload,
} from 'ant-design-vue';

async function bootstrap(namespace: string) {
  // 初始化组件适配器
  await initComponentAdapter();

  // 初始化表单组件
  await initSetupVbenForm();

  // // 设置弹窗的默认配置
  // setDefaultModalProps({
  //   fullscreenButton: false,
  // });
  // // 设置抽屉的默认配置
  // setDefaultDrawerProps({
  //   zIndex: 1020,
  // });

  const app = createApp(App);

  // 全局注册常用的 Ant Design Vue 组件（支持 a- 前缀）
  app.component('AAlert', Alert);
  app.component('AButton', Button);
  app.component('ABreadcrumb', Breadcrumb);
  app.component('ABreadcrumbItem', Breadcrumb.Item);
  app.component('ACard', Card);
  app.component('ACheckbox', Checkbox);
  app.component('ACheckboxGroup', Checkbox.Group);
  app.component('ACol', Col);
  app.component('ADescriptions', Descriptions);
  app.component('ADescriptionsItem', Descriptions.Item);
  app.component('ADivider', Divider);
  app.component('ADropdown', Dropdown);
  app.component('AEmpty', Empty);
  app.component('AForm', Form);
  app.component('AFormItem', Form.Item);
  app.component('AInput', Input);
  app.component('AInputNumber', InputNumber);
  app.component('AList', List);
  app.component('AListItem', List.Item);
  app.component('AListItemMeta', List.Item.Meta);
  app.component('AMenu', Menu);
  app.component('AMenuItem', Menu.Item);
  app.component('AModal', Modal);
  app.component('APagination', Pagination);
  app.component('ARadio', Radio);
  app.component('ARadioButton', Radio.Button);
  app.component('ARadioGroup', Radio.Group);
  app.component('ARate', Rate);
  app.component('AResult', Result);
  app.component('ARow', Row);
  app.component('ASelect', Select);
  app.component('ASelectOption', Select.Option);
  app.component('ASpace', Space);
  app.component('ASpin', Spin);
  app.component('AStatistic', Statistic);
  app.component('ASwitch', Switch);
  app.component('ATable', Table);
  app.component('ATabPane', Tabs.TabPane);
  app.component('ATabs', Tabs);
  app.component('ATag', Tag);
  app.component('ATimeline', Timeline);
  app.component('ATimelineItem', Timeline.Item);
  app.component('ATooltip', Tooltip);
  app.component('ATree', Tree);
  app.component('AUpload', Upload);

  // 注册v-loading指令
  registerLoadingDirective(app, {
    loading: 'loading', // 在这里可以自定义指令名称，也可以明确提供false表示不注册这个指令
    spinning: 'spinning',
  });

  // 国际化 i18n 配置
  await setupI18n(app);

  // 配置 pinia-tore
  await initStores(app, { namespace });

  // 安装权限指令
  registerAccessDirective(app);

  // 初始化 tippy
  const { initTippy } = await import('@vben/common-ui/es/tippy');
  initTippy(app);

  // 配置路由及路由守卫
  app.use(router);

  // 配置Motion插件
  const { MotionPlugin } = await import('@vben/plugins/motion');
  app.use(MotionPlugin);

  // 动态更新标题
  watchEffect(() => {
    if (preferences.app.dynamicTitle) {
      const routeTitle = router.currentRoute.value.meta?.title;
      const pageTitle =
        (routeTitle ? `${$t(routeTitle)} - ` : '') + preferences.app.name;
      useTitle(pageTitle);
    }
  });

  app.mount('#app');
}

export { bootstrap };
