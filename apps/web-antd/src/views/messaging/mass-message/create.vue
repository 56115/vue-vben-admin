<script lang="ts" setup>
import { ref, onMounted, computed, watch } from 'vue';
import {
  Button,
  Space,
  message,
  Tag,
  Card,
  Form,
  Input,
  Select,
  Row,
  Col,
  Checkbox,
  Modal,
  Tree,
  Steps,
  Step,
  Result,
  Alert,
  Image,
} from 'ant-design-vue';
import type { TreeProps } from 'ant-design-vue';
import {
  SendOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LinkOutlined,
  AppstoreOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';
import { refreshWecomMediaId } from '#/api/crm';
import AttachmentEditor from './components/AttachmentEditor.vue';
import type { Attachment } from './components/AttachmentEditor.vue';

// Types
interface Department {
  id: string;
  name: string;
  children?: Department[];
}

interface TagItem {
  id: number;
  name: string;
  customerCount?: number;
}

// State
const currentStep = ref(0);
const loading = ref(false);
const previewLoading = ref(false);
const sendSuccess = ref(false);

// Data
const departments = ref<Department[]>([]);
const tags = ref<TagItem[]>([]);
const previewCount = ref(0);

// Modal
const deptSelectVisible = ref(false);
const selectedDeptKeys = ref<string[]>([]);
const expandedDeptKeys = ref<string[]>([]);

// Form state
const formState = ref({
  // Target selection
  targetMode: 'ALL' as 'ALL' | 'FILTERED' | 'CUSTOM',
  sendToDepts: [] as string[],
  sendToDeptNames: [] as string[],
  excludeDepts: [] as string[],
  excludeDeptNames: [] as string[],

  // Tag filters
  selectedTags: [] as string[],

  // Additional filters
  filterByMonth: [] as string[],
  filterByRegion: [] as string[],
  filterBySource: [] as string[],

  // Custom filters
  ageRange: '' as string,
  region: '' as string,

  // Permission
  allowMemberEditRange: true,

  // Content
  textContent: '',
  attachments: [] as Attachment[],
});

// Filter options
const monthOptions = ['10月', '11月', '12月'];
const regionOptions = ['本地', '外地'];
const sourceOptions = ['公众号', '导购', '活动引入'];
const ageRangeOptions = [
  { value: '重要,25-40', label: '重要,25-40' },
  { value: '一般,18-25', label: '一般,18-25' },
  { value: '潜在,40+', label: '潜在,40+' },
];

// Tree data for department selection
const treeData = computed<TreeProps['treeData']>(() => {
  const convert = (items: Department[]): TreeProps['treeData'] => {
    return items.map((item) => ({
      key: item.id,
      title: item.name,
      children: item.children ? convert(item.children) : undefined,
    }));
  };
  return convert(departments.value);
});

// Computed preview text
const targetDescription = computed(() => {
  const parts: string[] = [];

  if (formState.value.sendToDeptNames.length) {
    parts.push(
      `发送给"${formState.value.sendToDeptNames.join(', ')}"等部门下成员添加的客户`,
    );
  }

  if (formState.value.excludeDeptNames.length) {
    parts.push(
      `排除"${formState.value.excludeDeptNames.join(', ')}"等部门的客户`,
    );
  }

  if (formState.value.selectedTags.length) {
    parts.push(`且满足"${formState.value.selectedTags.join(', ')}"等标签`);
  }

  if (parts.length === 0) {
    return '将通知成员发送消息给所选客户';
  }

  return parts.join('，') + '的所选客户，并排除其中"不发送给"的所选客户';
});

// API calls
async function fetchDepartments() {
  try {
    const res = await requestClient.get<{ items: Department[] }>(
      '/departments/tree',
    );
    departments.value = res.items || [];
  } catch (e) {
    console.error(e);
  }
}

async function fetchTags() {
  try {
    const res = await requestClient.get<{ items: TagItem[] }>(
      '/customer/tag',
      {
        params: { pageSize: 100 },
      },
    );
    tags.value = res.items || [];
  } catch (e) {
    console.error(e);
  }
}

async function fetchPreviewCount() {
  previewLoading.value = true;
  try {
    const res = await requestClient.post<{ count: number }>(
      '/mass-message/preview-count',
      {
        sendToDepts: formState.value.sendToDepts,
        excludeDepts: formState.value.excludeDepts,
        tags: formState.value.selectedTags,
        filters: {
          month: formState.value.filterByMonth,
          region: formState.value.filterByRegion,
          source: formState.value.filterBySource,
        },
      },
    );
    previewCount.value = res.count || 0;
  } catch (e) {
    console.error(e);
  } finally {
    previewLoading.value = false;
  }
}

function handleOpenDeptSelect(type: 'send' | 'exclude') {
  if (type === 'send') {
    selectedDeptKeys.value = [...formState.value.sendToDepts];
  } else {
    selectedDeptKeys.value = [...formState.value.excludeDepts];
  }
  deptSelectVisible.value = true;
}

function handleDeptSelectConfirm(type: 'send' | 'exclude') {
  const getNames = (keys: string[], items: Department[]): string[] => {
    const names: string[] = [];
    const findNames = (depts: Department[]) => {
      for (const dept of depts) {
        if (keys.includes(dept.id)) {
          names.push(dept.name);
        }
        if (dept.children) {
          findNames(dept.children);
        }
      }
    };
    findNames(items);
    return names;
  };

  if (type === 'send') {
    formState.value.sendToDepts = [...selectedDeptKeys.value];
    formState.value.sendToDeptNames = getNames(
      selectedDeptKeys.value,
      departments.value,
    );
  } else {
    formState.value.excludeDepts = [...selectedDeptKeys.value];
    formState.value.excludeDeptNames = getNames(
      selectedDeptKeys.value,
      departments.value,
    );
  }

  deptSelectVisible.value = false;
  fetchPreviewCount();
}

function handleNext() {
  if (currentStep.value === 0) {
    if (
      formState.value.targetMode === 'FILTERED' &&
      formState.value.sendToDepts.length === 0
    ) {
      message.warning('请选择发送范围');
      return;
    }
    currentStep.value = 1;
  } else if (currentStep.value === 1) {
    if (!formState.value.textContent) {
      message.warning('请输入消息内容');
      return;
    }
    currentStep.value = 2;
  }
}

function handlePrev() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

async function handleSend() {
  loading.value = true;
  try {
    // Convert attachments to API format
    const apiAttachments = await Promise.all(
      formState.value.attachments.map(async (att) => {
        if (att.type === 'link') {
          return {
            type: 'link' as const,
            link: att.link,
          };
        }

        if (att.type === 'miniprogram') {
          // Refresh miniprogram cover media ID if needed
          let picMediaId = att.miniprogram?.picMediaId;
          if (picMediaId) {
            try {
              const refreshed = await refreshWecomMediaId(picMediaId);
              picMediaId = refreshed.mediaId;
            } catch (e) {
              console.warn('Failed to refresh miniprogram cover:', e);
            }
          }
          return {
            type: 'miniprogram' as const,
            miniprogram: {
              title: att.miniprogram?.title || '',
              appid: att.miniprogram?.appid || '',
              page: att.miniprogram?.page || '',
              picMediaId,
            },
          };
        }

        // For image/video/file, refresh the media ID
        if (att.mediaId) {
          try {
            const refreshed = await refreshWecomMediaId(att.mediaId);
            return {
              type: att.type,
              mediaId: att.mediaId,
              wecomMediaId: refreshed.wecomMediaId,
            };
          } catch (e) {
            console.warn('Failed to refresh media ID:', e);
            return {
              type: att.type,
              mediaId: att.mediaId,
            };
          }
        }

        return {
          type: att.type,
          mediaId: att.mediaId,
        };
      }),
    );

    await requestClient.post('/mass-message/send', {
      sendToDepts: formState.value.sendToDepts,
      excludeDepts: formState.value.excludeDepts,
      tags: formState.value.selectedTags,
      filters: {
        month: formState.value.filterByMonth,
        region: formState.value.filterByRegion,
        source: formState.value.filterBySource,
      },
      content: {
        text: formState.value.textContent,
        attachments: apiAttachments,
      },
      allowMemberEditRange: formState.value.allowMemberEditRange,
    });

    sendSuccess.value = true;
    currentStep.value = 3;
  } catch (e: any) {
    message.error(e.message || '发送失败');
  } finally {
    loading.value = false;
  }
}

function handleReset() {
  currentStep.value = 0;
  sendSuccess.value = false;
  formState.value = {
    targetMode: 'ALL',
    sendToDepts: [],
    sendToDeptNames: [],
    excludeDepts: [],
    excludeDeptNames: [],
    selectedTags: [],
    filterByMonth: [],
    filterByRegion: [],
    filterBySource: [],
    ageRange: '',
    region: '',
    allowMemberEditRange: true,
    textContent: '',
    attachments: [],
  };
}

watch(
  () => [
    formState.value.sendToDepts,
    formState.value.excludeDepts,
    formState.value.selectedTags,
    formState.value.filterByMonth,
    formState.value.filterByRegion,
    formState.value.filterBySource,
  ],
  () => {
    fetchPreviewCount();
  },
  { deep: true },
);

onMounted(() => {
  fetchDepartments();
  fetchTags();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4">
      <h2 class="text-xl font-bold">新建消息</h2>
      <p class="text-gray-500">
        选择发送给的客户，通知成员，给客户发送以下内容
      </p>
    </div>

    <!-- Steps -->
    <Card class="mb-4">
      <Steps :current="currentStep" size="small">
        <Step title="选择发送给的客户" />
        <Step title="编辑消息内容" />
        <Step title="确认发送" />
        <Step title="发送完成" />
      </Steps>
    </Card>

    <!-- Step 1: Select Target -->
    <Card v-show="currentStep === 0" title="选择发送给的客户">
      <Form layout="vertical">
        <!-- Target Mode -->
        <Form.Item>
          <div class="mb-4 flex items-center gap-4">
            <span>通知成员发送给</span>
            <Select v-model:value="formState.targetMode" style="width: 160px">
              <Select.Option value="ALL">全部客户</Select.Option>
              <Select.Option value="FILTERED">按条件筛选的客户</Select.Option>
              <Select.Option value="CUSTOM">自定义发送</Select.Option>
            </Select>
          </div>
        </Form.Item>

        <!-- Filtered Mode -->
        <template v-if="formState.targetMode === 'FILTERED'">
          <Row :gutter="16">
            <!-- Send To -->
            <Col :span="12">
              <Form.Item label="发送给">
                <div class="flex items-center gap-2">
                  <Select
                    v-model:value="formState.sendToDepts"
                    mode="multiple"
                    placeholder="02购物中心,0..."
                    style="flex: 1"
                    :max-tag-count="2"
                    @click="handleOpenDeptSelect('send')"
                  />
                  <Button type="link" @click="handleOpenDeptSelect('send')">
                    自定义发送
                  </Button>
                </div>
              </Form.Item>
            </Col>

            <!-- Age Range -->
            <Col :span="12">
              <Form.Item label=" ">
                <Select
                  v-model:value="formState.ageRange"
                  placeholder="重要,25-40"
                  style="width: 100%"
                  :options="ageRangeOptions"
                  allow-clear
                />
              </Form.Item>
            </Col>

            <!-- Exclude -->
            <Col :span="12">
              <Form.Item label="不发送给">
                <Select
                  v-model:value="formState.excludeDepts"
                  mode="multiple"
                  placeholder="迟晓蕾,后勤部"
                  style="width: 100%"
                  :max-tag-count="2"
                  @click="handleOpenDeptSelect('exclude')"
                />
              </Form.Item>
            </Col>

            <!-- Region -->
            <Col :span="12">
              <Form.Item label=" ">
                <Select
                  v-model:value="formState.region"
                  placeholder="外地"
                  style="width: 100%"
                  allow-clear
                >
                  <Select.Option value="本地">本地</Select.Option>
                  <Select.Option value="外地">外地</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <!-- Description -->
          <div class="mb-4 rounded bg-gray-50 p-3 text-sm text-gray-600">
            {{ targetDescription }}
            <span class="ml-2 text-gray-400">{{ previewCount }}</span>
          </div>

          <!-- Permission -->
          <Form.Item>
            <Checkbox v-model:checked="formState.allowMemberEditRange">
              成员可调整发送范围
            </Checkbox>
          </Form.Item>
        </template>

        <!-- Tag Filters -->
        <Form.Item label="选择标签">
          <div class="flex flex-wrap gap-2">
            <Tag
              v-for="month in monthOptions"
              :key="month"
              :color="
                formState.filterByMonth.includes(month) ? 'blue' : 'default'
              "
              class="cursor-pointer"
              @click="
                formState.filterByMonth.includes(month)
                  ? formState.filterByMonth.splice(
                      formState.filterByMonth.indexOf(month),
                      1,
                    )
                  : formState.filterByMonth.push(month)
              "
            >
              {{ month }}
            </Tag>
          </div>
        </Form.Item>

        <Form.Item label="地区">
          <div class="flex flex-wrap gap-2">
            <Tag
              v-for="region in regionOptions"
              :key="region"
              :color="
                formState.filterByRegion.includes(region) ? 'blue' : 'default'
              "
              class="cursor-pointer"
              @click="
                formState.filterByRegion.includes(region)
                  ? formState.filterByRegion.splice(
                      formState.filterByRegion.indexOf(region),
                      1,
                    )
                  : formState.filterByRegion.push(region)
              "
            >
              {{ region }}
            </Tag>
          </div>
        </Form.Item>

        <Form.Item label="入会路径">
          <div class="flex flex-wrap gap-2">
            <Tag
              v-for="source in sourceOptions"
              :key="source"
              :color="
                formState.filterBySource.includes(source) ? 'blue' : 'default'
              "
              class="cursor-pointer"
              @click="
                formState.filterBySource.includes(source)
                  ? formState.filterBySource.splice(
                      formState.filterBySource.indexOf(source),
                      1,
                    )
                  : formState.filterBySource.push(source)
              "
            >
              {{ source }}
            </Tag>
          </div>
        </Form.Item>

        <div class="mt-2 text-xs text-gray-400">
          ③的定制说明：支持文本、表格文件的导入
        </div>
      </Form>

      <div class="mt-4 flex justify-end">
        <Button type="primary" @click="handleNext">
          下一步 <ArrowRightOutlined />
        </Button>
      </div>
    </Card>

    <!-- Step 2: Edit Content -->
    <Card v-show="currentStep === 1" title="编辑消息内容">
      <Row :gutter="24">
        <!-- Left: Form -->
        <Col :span="14">
          <Form layout="vertical">
            <Form.Item label="选择发送给的客户">
              <Button type="link" class="px-0">
                <PlusOutlined /> 选择发送给的客户
              </Button>
            </Form.Item>

            <Form.Item label="消息内容">
              <Input.TextArea
                v-model:value="formState.textContent"
                placeholder="输入消息内容...
支持文本输入，支持特殊字符"
                :rows="6"
                :maxlength="2048"
                show-count
              />
            </Form.Item>

            <Form.Item label="添加附件">
              <AttachmentEditor
                v-model="formState.attachments"
                :max-count="9"
              />
            </Form.Item>
          </Form>
        </Col>

        <!-- Right: Preview -->
        <Col :span="10">
          <Card title="预览" size="small">
            <div class="rounded bg-gray-100 p-4">
              <div class="flex items-start gap-2">
                <div class="h-10 w-10 rounded-full bg-blue-500"></div>
                <div class="flex-1">
                  <div class="font-medium">企业员工</div>
                  <div class="text-xs text-gray-400">即将发送</div>
                </div>
              </div>
              <div class="mt-3 rounded bg-white p-3 text-sm">
                <div v-if="formState.textContent" class="whitespace-pre-wrap">
                  {{ formState.textContent }}
                </div>
                <div v-else class="text-gray-400">输入消息内容</div>

                <!-- Attachment Preview -->
                <div v-if="formState.attachments.length > 0" class="mt-3">
                  <div class="flex flex-wrap gap-2">
                    <template
                      v-for="att in formState.attachments"
                      :key="att.id"
                    >
                      <!-- Image/Video Preview -->
                      <Image
                        v-if="
                          (att.type === 'image' || att.type === 'video') &&
                          att.ossUrl
                        "
                        :src="att.ossUrl"
                        :width="60"
                        :height="60"
                        class="rounded object-cover"
                      />
                      <!-- Link Preview -->
                      <div
                        v-else-if="att.type === 'link'"
                        class="flex w-full items-center gap-2 rounded border p-2"
                      >
                        <LinkOutlined class="text-blue-500" />
                        <div class="flex-1 truncate text-xs">
                          {{ att.link?.title }}
                        </div>
                      </div>
                      <!-- Miniprogram Preview -->
                      <div
                        v-else-if="att.type === 'miniprogram'"
                        class="flex w-full items-center gap-2 rounded border p-2"
                      >
                        <AppstoreOutlined class="text-green-500" />
                        <div class="flex-1 truncate text-xs">
                          {{ att.miniprogram?.title }}
                        </div>
                      </div>
                      <!-- File Preview -->
                      <div
                        v-else-if="att.type === 'file'"
                        class="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs"
                      >
                        <span class="max-w-20 truncate">{{ att.name }}</span>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <div class="mt-4 flex justify-between">
        <Button @click="handlePrev"> <ArrowLeftOutlined /> 上一步 </Button>
        <Button type="primary" @click="handleNext">
          下一步 <ArrowRightOutlined />
        </Button>
      </div>
    </Card>

    <!-- Step 3: Confirm -->
    <Card v-show="currentStep === 2" title="确认发送">
      <Alert
        message="请确认以下信息无误后，点击发送"
        type="info"
        show-icon
        class="mb-4"
      />

      <Row :gutter="24">
        <Col :span="12">
          <Card title="目标信息" size="small">
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-500">预计发送人数</span>
                <span class="font-bold text-blue-500"
                  >{{ previewCount }} 人</span
                >
              </div>
              <div
                v-if="formState.sendToDeptNames.length"
                class="flex justify-between"
              >
                <span class="text-gray-500">发送给</span>
                <span>
                  <Tag
                    v-for="name in formState.sendToDeptNames"
                    :key="name"
                    size="small"
                  >
                    {{ name }}
                  </Tag>
                </span>
              </div>
              <div
                v-if="formState.excludeDeptNames.length"
                class="flex justify-between"
              >
                <span class="text-gray-500">不发送给</span>
                <span>
                  <Tag
                    v-for="name in formState.excludeDeptNames"
                    :key="name"
                    size="small"
                  >
                    {{ name }}
                  </Tag>
                </span>
              </div>
            </div>
          </Card>
        </Col>
        <Col :span="12">
          <Card title="消息内容" size="small">
            <div class="whitespace-pre-wrap rounded bg-gray-50 p-3">
              {{ formState.textContent || '(无内容)' }}
            </div>
            <div v-if="formState.attachments.length > 0" class="mt-2">
              <div class="text-sm text-gray-500">
                附件：{{ formState.attachments.length }} 个
              </div>
              <div class="mt-1 flex flex-wrap gap-1">
                <Tag
                  v-for="att in formState.attachments"
                  :key="att.id"
                  size="small"
                >
                  {{
                    att.type === 'image'
                      ? '图片'
                      : att.type === 'video'
                        ? '视频'
                        : att.type === 'file'
                          ? '文件'
                          : att.type === 'link'
                            ? '网页'
                            : '小程序'
                  }}
                </Tag>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <div class="mt-4 flex justify-between">
        <Button @click="handlePrev"> <ArrowLeftOutlined /> 上一步 </Button>
        <Button type="primary" :loading="loading" @click="handleSend">
          <SendOutlined /> 通知成员发送
        </Button>
      </div>
    </Card>

    <!-- Step 4: Result -->
    <Card v-show="currentStep === 3">
      <Result
        :status="sendSuccess ? 'success' : 'error'"
        :title="sendSuccess ? '发送成功' : '发送失败'"
        :sub-title="sendSuccess ? '已通知成员发送消息' : '请稍后重试'"
      >
        <template #extra>
          <Space>
            <Button type="primary" @click="handleReset">继续发送</Button>
          </Space>
        </template>
      </Result>
    </Card>

    <!-- Department Select Modal -->
    <Modal
      v-model:open="deptSelectVisible"
      title="选择发送范围"
      width="600px"
      @ok="handleDeptSelectConfirm('send')"
    >
      <div class="py-4">
        <Tree
          v-model:checkedKeys="selectedDeptKeys"
          v-model:expandedKeys="expandedDeptKeys"
          :tree-data="treeData"
          checkable
          :selectable="false"
        />
      </div>
    </Modal>
  </div>
</template>
