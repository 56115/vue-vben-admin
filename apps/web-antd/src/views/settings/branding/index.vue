<template>
  <div class="p-6">
    <Page
      title="系统设置"
      description="配置品牌信息、企业联系方式，打造专属企业形象"
    >
      <Spin :spinning="loading">
        <Form
          :model="formState"
          layout="vertical"
          @finish="onSave"
        >
          <!-- 品牌信息卡片 -->
          <Card
            title="品牌信息"
            class="mb-6 overflow-hidden rounded-lg shadow-sm"
            :bordered="false"
          >
            <template #extra>
              <span class="text-sm text-gray-400">
                自定义系统品牌标识
              </span>
            </template>

            <div class="grid grid-cols-1 gap-6">
              <!-- 系统名称 -->
              <FormItem
                label="系统名称"
                name="systemName"
                class="mb-0"
              >
                <Input
                  v-model:value="formState.systemName"
                  placeholder="请输入系统名称，如：我的企业平台"
                  :maxlength="100"
                  size="large"
                  class="rounded-lg"
                />
                <div class="mt-2 text-xs text-gray-400">
                  该名称将显示在浏览器标题栏和系统顶部导航栏
                </div>
              </FormItem>

              <!-- Logo 上传区域 -->
              <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                <!-- 正色 Logo -->
                <FormItem
                  label="正色 Logo"
                  name="logoUrl"
                  class="mb-0"
                >
                  <div class="space-y-3">
                    <Upload
                      name="file"
                      list-type="picture-card"
                      :show-upload-list="false"
                      :before-upload="() => false"
                      @change="(info) => handleLogoUpload(info, 'logoUrl')"
                      class="logo-uploader"
                    >
                      <div
                        v-if="formState.logoUrl"
                        class="flex h-full items-center justify-center p-4"
                      >
                        <img
                          :src="formState.logoUrl"
                          alt="正色logo"
                          class="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div
                        v-else
                        class="flex h-32 flex-col items-center justify-center text-gray-400"
                      >
                        <PlusOutlined class="mb-2 text-2xl" />
                        <div class="text-sm">点击上传 Logo</div>
                        <div class="mt-1 text-xs">建议尺寸：200×60px</div>
                      </div>
                    </Upload>
                    <Input
                      v-model:value="formState.logoUrl"
                      placeholder="或直接粘贴图片 URL"
                      class="rounded-lg"
                    />
                  </div>
                  <div class="mt-2 text-xs text-gray-400">
                    适用于浅色背景，建议使用透明背景 PNG
                  </div>
                </FormItem>

                <!-- 反色 Logo -->
                <FormItem
                  label="反色 Logo"
                  name="logoInvertedUrl"
                  class="mb-0"
                >
                  <div class="space-y-3">
                    <Upload
                      name="file"
                      list-type="picture-card"
                      :show-upload-list="false"
                      :before-upload="() => false"
                      @change="(info) => handleLogoUpload(info, 'logoInvertedUrl')"
                      class="logo-uploader"
                    >
                      <div
                        v-if="formState.logoInvertedUrl"
                        class="flex h-full items-center justify-center bg-gray-800 p-4"
                      >
                        <img
                          :src="formState.logoInvertedUrl"
                          alt="反色logo"
                          class="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div
                        v-else
                        class="flex h-32 flex-col items-center justify-center bg-gray-800 text-gray-400"
                      >
                        <PlusOutlined class="mb-2 text-2xl" />
                        <div class="text-sm">点击上传 Logo</div>
                        <div class="mt-1 text-xs">建议尺寸：200×60px</div>
                      </div>
                    </Upload>
                    <Input
                      v-model:value="formState.logoInvertedUrl"
                      placeholder="或直接粘贴图片 URL"
                      class="rounded-lg"
                    />
                  </div>
                  <div class="mt-2 text-xs text-gray-400">
                    适用于深色背景，建议使用白色或浅色 Logo
                  </div>
                </FormItem>
              </div>
            </div>
          </Card>

          <!-- 企业信息卡片 -->
          <Card
            title="企业信息"
            class="mb-6 overflow-hidden rounded-lg shadow-sm"
            :bordered="false"
          >
            <template #extra>
              <span class="text-sm text-gray-400">
                展示企业详细信息
              </span>
            </template>

            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormItem
                label="企业全称"
                name="companyName"
                class="mb-0"
              >
                <Input
                  v-model:value="formState.companyName"
                  placeholder="请输入企业营业执照全称"
                  :maxlength="200"
                  class="rounded-lg"
                />
              </FormItem>

              <FormItem
                label="企业简称"
                name="companyShortName"
                class="mb-0"
              >
                <Input
                  v-model:value="formState.companyShortName"
                  placeholder="请输入企业简称或品牌名"
                  :maxlength="50"
                  class="rounded-lg"
                />
              </FormItem>

              <FormItem
                label="联系邮箱"
                name="contactEmail"
                class="mb-0"
              >
                <Input
                  v-model:value="formState.contactEmail"
                  placeholder="example@company.com"
                  :maxlength="200"
                  class="rounded-lg"
                />
              </FormItem>

              <FormItem
                label="联系电话"
                name="contactPhone"
                class="mb-0"
              >
                <Input
                  v-model:value="formState.contactPhone"
                  placeholder="400-xxx-xxxx"
                  :maxlength="50"
                  class="rounded-lg"
                />
              </FormItem>

              <FormItem
                label="企业地址"
                name="address"
                class="mb-0 md:col-span-2"
              >
                <Input.TextArea
                  v-model:value="formState.address"
                  placeholder="请输入企业详细地址"
                  :maxlength="500"
                  :rows="3"
                  class="rounded-lg"
                />
              </FormItem>
            </div>
          </Card>

          <!-- 操作按钮 -->
          <div class="flex justify-end gap-3">
            <Button
              size="large"
              class="rounded-lg px-8"
              @click="handleReset"
            >
              重置
            </Button>
            <Button
              type="primary"
              html-type="submit"
              :loading="saving"
              size="large"
              class="rounded-lg px-8"
            >
              保存设置
            </Button>
          </div>
        </Form>
      </Spin>
    </Page>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import type { UploadFile } from 'ant-design-vue';
import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  Spin,
  Upload,
} from 'ant-design-vue';
import { Page } from '@vben/common-ui';
import { requestClient } from '#/api/request';
import {
  getBrandingApi,
  updateBrandingApi,
  type BrandingSetting,
} from '#/api/settings/branding';
import { useBrandingStore } from '#/store/branding';

const brandingStore = useBrandingStore();
const loading = ref(false);
const saving = ref(false);

const formState = reactive<BrandingSetting>({
  systemName: undefined,
  logoUrl: undefined,
  logoInvertedUrl: undefined,
  companyName: undefined,
  companyShortName: undefined,
  contactEmail: undefined,
  contactPhone: undefined,
  address: undefined,
});

// 保存原始数据用于重置
const originalData = ref<BrandingSetting | null>(null);

onMounted(async () => {
  loading.value = true;
  try {
    const data = await getBrandingApi();
    if (data) {
      originalData.value = { ...data };
      Object.assign(formState, {
        systemName: data.systemName ?? undefined,
        logoUrl: data.logoUrl ?? undefined,
        logoInvertedUrl: data.logoInvertedUrl ?? undefined,
        companyName: data.companyName ?? undefined,
        companyShortName: data.companyShortName ?? undefined,
        contactEmail: data.contactEmail ?? undefined,
        contactPhone: data.contactPhone ?? undefined,
        address: data.address ?? undefined,
      });
    }
  } finally {
    loading.value = false;
  }
});

async function onSave() {
  saving.value = true;
  try {
    const result = await updateBrandingApi(formState);
    originalData.value = { ...result };
    brandingStore.setBranding(result);
    message.success('保存成功');
  } catch {
    message.error('保存失败，请重试');
  } finally {
    saving.value = false;
  }
}

function handleReset() {
  if (originalData.value) {
    Object.assign(formState, {
      systemName: originalData.value.systemName ?? undefined,
      logoUrl: originalData.value.logoUrl ?? undefined,
      logoInvertedUrl: originalData.value.logoInvertedUrl ?? undefined,
      companyName: originalData.value.companyName ?? undefined,
      companyShortName: originalData.value.companyShortName ?? undefined,
      contactEmail: originalData.value.contactEmail ?? undefined,
      contactPhone: originalData.value.contactPhone ?? undefined,
      address: originalData.value.address ?? undefined,
    });
    message.info('已重置为保存的数据');
  } else {
    Object.assign(formState, {
      systemName: undefined,
      logoUrl: undefined,
      logoInvertedUrl: undefined,
      companyName: undefined,
      companyShortName: undefined,
      contactEmail: undefined,
      contactPhone: undefined,
      address: undefined,
    });
    message.info('已清空所有字段');
  }
}

/**
 * 处理 logo 文件上传
 * ADV Upload @change 事件传入 UploadChangeParam，原始 File 在 originFileObj
 */
async function handleLogoUpload(
  info: { file: UploadFile; fileList: UploadFile[] },
  field: 'logoUrl' | 'logoInvertedUrl',
) {
  const file = info.file.originFileObj;
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    // MediaController: @Controller(['messaging/media', 'crm/media']) + @Post('upload')
    // 注意：该端点有 @Auth('MESSAGING') 守卫，需租户订阅 MESSAGING 模块。
    // 若租户无此订阅，logo 上传会返回 403；用户可改用下方 URL 输入框直接粘贴地址。
    const result = await requestClient.post<{ url: string }>(
      '/messaging/media/upload',
      formData,
    );
    formState[field] = result.url;
    message.success('图片上传成功');
  } catch {
    message.error('图片上传失败，可直接在输入框粘贴图片 URL');
  }
}
</script>

<style scoped>
.logo-uploader :deep(.ant-upload) {
  width: 100%;
  height: auto;
  min-height: 160px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  transition: all 0.3s;
}

.logo-uploader :deep(.ant-upload:hover) {
  border-color: #1890ff;
}

.logo-uploader :deep(.ant-upload-select-picture-card) {
  background-color: #fafafa;
}
</style>
