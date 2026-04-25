<template>
  <Page title="系统设置" description="配置品牌信息、企业联系方式">
    <Spin :spinning="loading">
      <Form
        :model="formState"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 16 }"
        @finish="onSave"
      >
        <!-- 品牌信息 -->
        <Card title="品牌信息" class="mb-6">
          <FormItem label="系统名称" name="systemName">
            <Input
              v-model:value="formState.systemName"
              placeholder="请输入系统名称"
              :maxlength="100"
            />
          </FormItem>

          <FormItem label="正色 Logo" name="logoUrl">
            <div class="flex items-center gap-4">
              <Upload
                name="file"
                list-type="picture-card"
                :show-upload-list="false"
                :before-upload="() => false"
                @change="(info) => handleLogoUpload(info, 'logoUrl')"
              >
                <div v-if="formState.logoUrl">
                  <img
                    :src="formState.logoUrl"
                    alt="正色logo"
                    class="h-16 w-auto object-contain"
                  />
                </div>
                <div v-else>
                  <PlusOutlined />
                  <div>上传</div>
                </div>
              </Upload>
              <Input
                v-model:value="formState.logoUrl"
                placeholder="或直接粘贴图片 URL"
                class="flex-1"
              />
            </div>
          </FormItem>

          <FormItem label="反色 Logo" name="logoInvertedUrl">
            <div class="flex items-center gap-4">
              <Upload
                name="file"
                list-type="picture-card"
                :show-upload-list="false"
                :before-upload="() => false"
                @change="(info) => handleLogoUpload(info, 'logoInvertedUrl')"
              >
                <div v-if="formState.logoInvertedUrl">
                  <img
                    :src="formState.logoInvertedUrl"
                    alt="反色logo"
                    class="h-16 w-auto object-contain bg-gray-800 p-2"
                  />
                </div>
                <div v-else>
                  <PlusOutlined />
                  <div>上传</div>
                </div>
              </Upload>
              <Input
                v-model:value="formState.logoInvertedUrl"
                placeholder="或直接粘贴图片 URL"
                class="flex-1"
              />
            </div>
          </FormItem>
        </Card>

        <!-- 企业信息 -->
        <Card title="企业信息" class="mb-6">
          <FormItem label="企业全称" name="companyName">
            <Input
              v-model:value="formState.companyName"
              placeholder="请输入企业全称"
              :maxlength="200"
            />
          </FormItem>

          <FormItem label="企业简称" name="companyShortName">
            <Input
              v-model:value="formState.companyShortName"
              placeholder="请输入企业简称"
              :maxlength="50"
            />
          </FormItem>

          <FormItem label="联系邮箱" name="contactEmail">
            <Input
              v-model:value="formState.contactEmail"
              placeholder="请输入联系邮箱"
              :maxlength="200"
            />
          </FormItem>

          <FormItem label="联系电话" name="contactPhone">
            <Input
              v-model:value="formState.contactPhone"
              placeholder="请输入联系电话"
              :maxlength="50"
            />
          </FormItem>

          <FormItem label="企业地址" name="address">
            <Input
              v-model:value="formState.address"
              placeholder="请输入企业地址"
              :maxlength="500"
            />
          </FormItem>
        </Card>

        <FormItem :wrapper-col="{ offset: 4 }">
          <Button type="primary" html-type="submit" :loading="saving">
            保存
          </Button>
        </FormItem>
      </Form>
    </Spin>
  </Page>
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

onMounted(async () => {
  loading.value = true;
  try {
    const data = await getBrandingApi();
    if (data) {
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
    brandingStore.setBranding(result);
    message.success('保存成功');
  } catch {
    message.error('保存失败，请重试');
  } finally {
    saving.value = false;
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
  } catch {
    message.error('图片上传失败，可直接在输入框粘贴图片 URL');
  }
}
</script>