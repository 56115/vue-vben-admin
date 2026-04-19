<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, markRaw, ref, onMounted } from 'vue';

// 等待租户加载完成的辅助函数
function waitForTenantsLoading(isLoadingRef: globalThis.Ref<boolean>): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (!isLoadingRef.value) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

import {
  AuthenticationLogin,
  SliderCaptcha,
  z,
  RememberMeHelper,
} from '@vben/common-ui';
import type { RememberMeData } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useAuthStore } from '#/store';
import { getTenantsByUsernameApi } from '#/api';
import type { AuthApi } from '#/api';
import { notification } from 'ant-design-vue';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

// 检查是否禁用验证码（用于自动化测试）
const isCaptchaEnabled = import.meta.env.VITE_ENABLE_CAPTCHA !== 'false';

// 租户相关状态
const tenants = ref<AuthApi.TenantInfo[]>([]);
const selectedTenant = ref<string>('');
const isLoadingTenants = ref(false);
const usernameError = ref<string>('');
const loginFailCount = ref(0);
const isUsernameBlurred = ref(false);

// 上次登录租户的 localStorage key（向后兼容）
const LAST_TENANT_KEY = `LAST_TENANT_${location.hostname}`;

// 登录组件引用
const loginComponentRef = ref();

/**
 * 页面加载时，从加密存储恢复数据
 */
onMounted(() => {
  const rememberedData = RememberMeHelper.decrypt();
  if (rememberedData) {
    // 等待下一个 tick 以确保表单已初始化
    setTimeout(() => {
      // 通过组件 API 设置表单值
      const formApi = loginComponentRef.value?.getFormApi?.();
      if (formApi) {
        formApi.setFieldValue('username', rememberedData.username);
      }

      // 触发用户名失焦逻辑以加载租户
      isUsernameBlurred.value = true;
      handleUsernameBlur(rememberedData.username);
    }, 100);
  }
});

/**
 * 用户名失焦时，查询租户列表
 */
async function handleUsernameBlur(username: string) {
  if (!username?.trim() || !isUsernameBlurred.value) {
    return;
  }

  isLoadingTenants.value = true;
  usernameError.value = '';

  try {
    const result = await getTenantsByUsernameApi(username.trim());
    tenants.value = result.tenants;

    if (tenants.value.length === 0) {
      usernameError.value = $t('authentication.userNotFound');
    } else if (tenants.value.length === 1) {
      // 单租户：不显示任何UI，后端自动匹配
      selectedTenant.value = tenants.value[0].code;
    } else {
      // 多租户（2+）：选择上次登录的租户
      const rememberedData = RememberMeHelper.decrypt();
      const lastTenantFromRemember = rememberedData?.tenantCode;
      const lastTenantFromStorage = localStorage.getItem(LAST_TENANT_KEY);
      const lastTenant = lastTenantFromRemember || lastTenantFromStorage;

      const lastTenantExists = tenants.value.find((t) => t.code === lastTenant);
      selectedTenant.value = lastTenantExists
        ? lastTenant!
        : tenants.value[0].code;

      // 自动设置租户代码到表单
      setTimeout(() => {
        const formApi = loginComponentRef.value?.getFormApi?.();
        if (formApi && selectedTenant.value) {
          formApi.setFieldValue('tenantCode', selectedTenant.value);
        }
      }, 50);
    }
  } catch (error) {
    console.error('查询租户失败:', error);
    tenants.value = [];
  } finally {
    isLoadingTenants.value = false;
  }
}

/**
 * 动态表单 schema
 */
const formSchema = computed((): VbenFormSchema[] => {
  const schemas: VbenFormSchema[] = [
    // 用户名输入框
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
        autocomplete: 'username',
        onBlur: (e: FocusEvent) => {
          isUsernameBlurred.value = true;
          const target = e.target as HTMLInputElement;
          handleUsernameBlur(target.value);
        },
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
      help: usernameError.value,
    },
  ];

  // 仅在多租户（2+）时显示租户选择下拉框
  if (tenants.value.length >= 2) {
    schemas.push({
      component: 'VbenSelect',
      componentProps: {
        options: tenants.value.map((t) => ({
          label: `${t.name} (${t.code})`,
          value: t.code,
        })),
        placeholder: $t('authentication.tenantPlaceholder'),
        onChange: (value: string) => {
          selectedTenant.value = value;
        },
      },
      fieldName: 'tenantCode',
      label: $t('authentication.selectTenant'),
      defaultValue: selectedTenant.value,
      rules: z
        .string()
        .min(1, { message: $t('authentication.tenantPlaceholder') }),
    });
  }

  // 密码输入框（多租户时禁用，需先选择租户）
  schemas.push({
    component: 'VbenInputPassword',
    componentProps: {
      placeholder: $t('authentication.password'),
      disabled: tenants.value.length > 1 && isUsernameBlurred.value,
    },
    fieldName: 'password',
    label: $t('authentication.password'),
    rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
  });

  // 3 次失败后显示验证码（且验证码已启用）
  if (isCaptchaEnabled && loginFailCount.value >= 3) {
    schemas.push({
      component: markRaw(SliderCaptcha),
      fieldName: 'captcha',
      rules: z.boolean().refine((value) => value, {
        message: $t('authentication.verifyRequiredTip'),
      }),
    });
  }

  return schemas;
});

/**
 * 自定义登录提交处理（包装 AuthenticationLogin 的默认行为）
 */
async function handleLogin(values: any) {
  // 如果正在加载租户，等待加载完成，避免表单在提交过程中被重新渲染
  if (isLoadingTenants.value) {
    await waitForTenantsLoading(isLoadingTenants);
  }

  // 如果租户列表为空且未在加载中，主动触发加载
  if (tenants.value.length === 0 && !isLoadingTenants.value && values.username) {
    await handleUsernameBlur(values.username);
    await waitForTenantsLoading(isLoadingTenants);
  }

  try {
    const loginData: any = {
      username: values.username,
      password: values.password,
    };

    // 仅在多租户场景传递 tenantCode
    if (tenants.value.length >= 2 && selectedTenant.value) {
      loginData.tenantCode = selectedTenant.value;
    } else if (tenants.value.length === 1) {
      // 单租户场景，不传 tenantCode（后端自动匹配）
    }

    await authStore.authLogin(loginData);

    // 登录成功后，AuthenticationLogin 组件会自动处理"记住我"
    // 但我们需要额外保存租户代码（如果有的话）
    // 通过更新加密存储来包含租户信息
    const currentRemembered = RememberMeHelper.decrypt();
    if (currentRemembered) {
      // 更新租户代码
      const updatedData: RememberMeData = {
        ...currentRemembered,
        tenantCode: selectedTenant.value || undefined,
      };
      RememberMeHelper.encrypt(updatedData);
    }

    // 向后兼容：保存上次登录的租户
    if (selectedTenant.value) {
      localStorage.setItem(LAST_TENANT_KEY, selectedTenant.value);
    }

    // 重置失败计数
    loginFailCount.value = 0;
  } catch (error: any) {
    loginFailCount.value++;

    // 根据错误码显示友好提示
    const errorCode = error?.response?.data?.error;
    const errorMessage = error?.response?.data?.message;

    const errorMessages: Record<string, string> = {
      TENANT_NOT_FOUND: $t('authentication.tenantNotFound'),
      USER_NOT_FOUND: $t('authentication.userNotFound'),
      INVALID_CREDENTIALS: $t('authentication.invalidCredentials'),
      ACCOUNT_DISABLED: $t('authentication.accountDisabled'),
      TOO_MANY_ATTEMPTS: $t('authentication.tooManyAttempts'),
    };

    const message =
      errorMessages[errorCode] ||
      errorMessage ||
      $t('authentication.loginFailed');

    notification.error({
      message: $t('authentication.loginFailed'),
      description: message,
      duration: 5,
    });

    // 抛出错误以便上层处理
    throw error;
  }
}
</script>

<template>
  <AuthenticationLogin
    ref="loginComponentRef"
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-remember-me="true"
    @submit="handleLogin"
  />
</template>
