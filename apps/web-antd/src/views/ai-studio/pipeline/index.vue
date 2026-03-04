<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tag,
  Popconfirm,
  Card,
  Drawer,
  Tooltip,
  Upload,
} from 'ant-design-vue';
import {
  PlusOutlined,
  PlayCircleOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  ApartmentOutlined,
  CodeOutlined,
  SlidersOutlined,
  CloudUploadOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';
import {
  getFeatureModules,
  checkDeletePipeline,
  deletePipeline,
  type FeatureModule,
  type DeleteCheckResponse,
} from '#/api/ai-studio/pipeline';
import DeleteConfirmModal from './components/DeleteConfirmModal.vue';
import dayjs from 'dayjs';

interface PipelineItem {
  id: number;
  key: string;
  name: string;
  description: string | null;
  triggerType: string;
  steps: any[];
  isActive: boolean;
  isSystem: boolean;
  version: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const loading = ref(false);
const dataSource = ref<PipelineItem[]>([]);
const pagination = ref({ current: 1, pageSize: 20, total: 0 });
const modalVisible = ref(false);
const modalTitle = ref('新建流程');
const editingKey = ref<string | null>(null);
const formState = ref({
  key: '',
  name: '',
  description: '',
});

// 功能模块筛选
const featureModules = ref<FeatureModule[]>([]);
const selectedFeatureCode = ref<string | undefined>(undefined);
// 只有当用户有功能模块权限时才显示筛选器
const showFeatureFilter = computed(() => featureModules.value.length > 0);

const detailVisible = ref(false);
const detailPipeline = ref<PipelineItem | null>(null);

// 删除确认弹窗状态
const deleteModalVisible = ref(false);
const deleteModalLoading = ref(false);
const deleteCheckData = ref<DeleteCheckResponse | null>(null);
const deletingPipelineKey = ref<string>('');
const deletingPipeline = ref<PipelineItem | null>(null);

// 执行表单状态
const executeVisible = ref(false);
const executePipeline = ref<PipelineItem | null>(null);
const executeFormState = ref<Record<string, any>>({});
const uploadedImageUrls = ref<string[]>([]);
const uploadLoading = ref(false);

const router = useRouter();

const statusOptions = [
  { value: 'DRAFT', label: '草稿', color: 'default' },
  { value: 'PUBLISHED', label: '已发布', color: 'green' },
  { value: 'DEPRECATED', label: '已废弃', color: 'red' },
];

const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: '流程标识',
    dataIndex: 'key',
    key: 'key',
    width: 180,
  },
  {
    title: '流程名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    width: 200,
    ellipsis: true,
  },
  {
    title: '状态',
    dataIndex: 'isActive',
    key: 'isActive',
    width: 100,
  },
  {
    title: '版本',
    dataIndex: 'version',
    key: 'version',
    width: 80,
  },
  {
    title: '步骤数',
    dataIndex: 'steps',
    key: 'steps',
    width: 80,
    customRender: ({ record }: { record: PipelineItem }) => {
      return record.steps?.length || 0;
    },
  },
  {
    title: '发布时间',
    dataIndex: 'publishedAt',
    key: 'publishedAt',
    width: 180,
    customRender: ({ text }: { text: string }) => {
      return text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-';
    },
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 180,
    customRender: ({ text }: { text: string }) => {
      return text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-';
    },
  },
  {
    title: '操作',
    key: 'action',
    width: 280,
    fixed: 'right' as const,
  },
];

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await requestClient.get('/ai-studio/pipelines', {
      params: {
        page: pagination.value.current,
        pageSize: pagination.value.pageSize,
        featureCode: selectedFeatureCode.value || undefined,
      },
    });

    // API returns { data: [...], total, page, pageSize }
    if (response.data) {
      dataSource.value = response.data;
      pagination.value.total = response.total || 0;
    } else if (Array.isArray(response)) {
      dataSource.value = response;
      pagination.value.total = response.length;
    }
  } catch (error) {
    console.error('Failed to fetch pipelines:', error);
    message.error('获取流程列表失败');
  } finally {
    loading.value = false;
  }
};

// 加载功能模块列表（根据用户权限过滤）
const loadFeatureModules = async () => {
  try {
    const modules = await getFeatureModules();
    featureModules.value = modules || [];
  } catch (error: any) {
    // 403 或其他权限错误时不显示筛选器
    if (error?.response?.status === 403) {
      console.warn('No permission to view feature modules');
    } else {
      console.error('Failed to load feature modules:', error);
    }
    featureModules.value = [];
  }
};

// 功能模块筛选变化
const handleFeatureCodeChange = (value: string | undefined) => {
  selectedFeatureCode.value = value;
  pagination.value.current = 1; // 重置到第一页
  fetchData();
};

const handleTableChange = (pag: any) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchData();
};

const showCreate = () => {
  modalTitle.value = '新建流程';
  editingKey.value = null;
  formState.value = {
    key: '',
    name: '',
    description: '',
  };
  modalVisible.value = true;
};

const showEdit = (record: PipelineItem) => {
  modalTitle.value = '编辑流程';
  editingKey.value = record.key;
  formState.value = {
    key: record.key,
    name: record.name,
    description: record.description || '',
  };
  modalVisible.value = true;
};

const showDetail = (record: PipelineItem) => {
  detailPipeline.value = record;
  detailVisible.value = true;
};

const showDesign = (record: PipelineItem) => {
  router.push(`/ai-studio/pipeline/edit/${record.key}`);
};

const handleTune = (record: PipelineItem) => {
  router.push(`/ai-studio/pipeline/tune/${record.key}`);
};

const exportAsCode = async (record: PipelineItem) => {
  try {
    const response = await requestClient.get(
      `/ai-studio/pipelines/${record.key}/export`,
      {
        params: { format: 'yaml' },
      },
    );

    // Create download
    const blob = new Blob([response.data || response], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.key}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.success('已导出为 YAML 代码');
  } catch (error) {
    console.error('Failed to export pipeline:', error);
    message.error('导出失败');
  }
};

const handleOk = async () => {
  try {
    if (editingKey.value) {
      // Update existing pipeline
      await requestClient.put(`/ai-studio/pipelines/${editingKey.value}`, {
        name: formState.value.name,
        description: formState.value.description,
      });
      message.success('更新成功');
    } else {
      // Create new pipeline with default step
      await requestClient.post('/ai-studio/pipelines', {
        key: formState.value.key,
        name: formState.value.name,
        description: formState.value.description,
        steps: [
          {
            stepKey: 'default_step',
            name: '默认步骤',
            type: 'llm',
            componentRef: {
              type: 'MODEL',
              key: 'qwen-vl-plus',
            },
          },
        ],
      });
      message.success('创建成功');
    }
    modalVisible.value = false;
    fetchData();
  } catch (error: any) {
    console.error('Failed to save pipeline:', error);
    const errorMsg = error?.response?.data?.message || '保存失败';
    message.error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
  }
};

const handleExecute = async (record: PipelineItem) => {
  // 检查流程是否已发布
  if (!record.publishedAt) {
    message.warning('流程尚未发布，请先发布流程后再执行');
    return;
  }

  // 打开执行表单弹窗
  executePipeline.value = record;
  executeFormState.value = getDefaultInputData(record.key);
  uploadedImageUrls.value = []; // 清空已上传的图片列表
  executeVisible.value = true;
};

// 获取默认输入数据
const getDefaultInputData = (pipelineKey: string): Record<string, any> => {
  // 为不同的 pipeline 提供默认测试数据
  if (pipelineKey === 'homework-grading-approval') {
    return {
      recordId: '',
      studentId: undefined,
      imageUrls: '',
      subject: 'MATH',
      gradeLevel: 'GRADE_3',
    };
  }
  return {};
};

// 执行流程（提交表单）
const handleExecuteSubmit = async () => {
  if (!executePipeline.value) return;

  try {
    // 转换表单数据
    const inputData = transformExecuteFormData(
      executePipeline.value.key,
      executeFormState.value,
    );

    const response = await requestClient.post(
      `/ai-studio/pipelines/${executePipeline.value.key}/execute`,
      { inputData },
    );
    message.success('流程已开始执行');

    executeVisible.value = false;
    fetchData();
  } catch (error: any) {
    console.error('Failed to execute pipeline:', error);

    // 显示详细错误信息
    const errorMsg =
      error?.response?.data?.message || error?.message || '执行失败';
    const statusCode = error?.response?.status;

    if (statusCode === 404) {
      message.error('执行接口不存在，请检查后端服务是否正常运行');
    } else if (statusCode === 403) {
      message.error('无权限执行流程，请联系管理员分配权限');
    } else if (statusCode === 400) {
      message.error(
        `执行失败：${Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg}`,
      );
    } else {
      message.error(`执行失败：${errorMsg}`);
    }
  }
};

// 转换表单数据为 API 需要的格式
const transformExecuteFormData = (
  pipelineKey: string,
  formData: Record<string, any>,
): Record<string, any> => {
  if (pipelineKey === 'homework-grading-approval') {
    // 合并手动输入的 URL 和上传的图片 URL
    const manualUrls = formData.imageUrls
      ? formData.imageUrls.split('\n').filter((url: string) => url.trim())
      : [];
    const allImageUrls = [...uploadedImageUrls.value, ...manualUrls];

    return {
      recordId: formData.recordId || `test-${Date.now()}`,
      studentId: Number(formData.studentId) || 1,
      imageUrls: allImageUrls,
      subject: formData.subject || 'MATH',
      gradeLevel: formData.gradeLevel || 'GRADE_3',
    };
  }
  return formData;
};

// 处理图片上传
const handleImageUpload = async (options: any) => {
  const { file, onSuccess, onError } = options;

  uploadLoading.value = true;

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await requestClient.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response?.url) {
      uploadedImageUrls.value.push(response.url);
      message.success('图片上传成功');
      onSuccess(response);
    } else {
      throw new Error('上传失败，未返回 URL');
    }
  } catch (error: any) {
    console.error('Upload failed:', error);
    const errorMsg =
      error?.response?.data?.message || error?.message || '上传失败';
    message.error(`上传失败：${errorMsg}`);
    onError(error);
  } finally {
    uploadLoading.value = false;
  }
};

// 删除已上传的图片
const handleRemoveImage = (url: string) => {
  const index = uploadedImageUrls.value.indexOf(url);
  if (index > -1) {
    uploadedImageUrls.value.splice(index, 1);
    message.success('已移除图片');
  }
};

const handlePublish = async (record: PipelineItem) => {
  try {
    await requestClient.post(`/ai-studio/pipelines/${record.key}/publish`);
    message.success('发布成功');
    fetchData();
  } catch (error: any) {
    console.error('Failed to publish pipeline:', error);
    const errorMsg =
      error?.response?.data?.message || error?.message || '发布失败';
    message.error(
      `发布失败：${Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg}`,
    );
  }
};

const handleDuplicate = async (record: PipelineItem) => {
  try {
    const newKey = `${record.key}-copy-${Date.now()}`;
    await requestClient.post(`/ai-studio/pipelines/${record.key}/duplicate`, {
      newKey,
      newName: `${record.name} (副本)`,
    });
    message.success('复制成功');
    fetchData();
  } catch (error) {
    console.error('Failed to duplicate pipeline:', error);
    message.error('复制失败');
  }
};

// 打开删除确认弹窗
const handleDeleteClick = async (record: PipelineItem) => {
  deletingPipeline.value = record;
  deletingPipelineKey.value = record.key;
  deleteModalLoading.value = true;
  deleteModalVisible.value = true;

  try {
    const response = await checkDeletePipeline(record.key);
    deleteCheckData.value = response;
  } catch (error: any) {
    console.error('Failed to check delete prerequisites:', error);
    message.error('获取删除检查信息失败');
    deleteModalVisible.value = false;
  } finally {
    deleteModalLoading.value = false;
  }
};

// 确认删除
const handleDeleteConfirm = async (confirmationText: string) => {
  if (!deletingPipelineKey.value) return;

  deleteModalLoading.value = true;
  try {
    await deletePipeline(deletingPipelineKey.value, confirmationText);
    message.success('删除成功');
    deleteModalVisible.value = false;
    fetchData();
  } catch (error: any) {
    console.error('Failed to delete pipeline:', error);
    const errorMsg = error?.response?.data?.message || error?.message || '删除失败';
    message.error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
  } finally {
    deleteModalLoading.value = false;
  }
};

// 取消删除
const handleDeleteCancel = () => {
  deleteModalVisible.value = false;
  deletingPipeline.value = null;
  deletingPipelineKey.value = '';
  deleteCheckData.value = null;
};

// 旧的删除方法（保留兼容性）
const handleDelete = async (key: string) => {
  try {
    await requestClient.delete(`/ai-studio/pipelines/${key}`);
    message.success('删除成功');
    fetchData();
  } catch (error) {
    console.error('Failed to delete pipeline:', error);
    message.error('删除失败');
  }
};

onMounted(() => {
  loadFeatureModules();
  fetchData();
});
</script>

<template>
  <div class="pipeline-list">
    <Card title="流程管理">
      <template #extra>
        <Space>
          <!-- 只有当用户有功能模块权限时才显示筛选器 -->
          <Select
            v-if="showFeatureFilter"
            v-model:value="selectedFeatureCode"
            placeholder="按功能模块筛选"
            allow-clear
            style="width: 180px"
            @change="handleFeatureCodeChange"
          >
            <Select.Option
              v-for="item in featureModules"
              :key="item.code"
              :value="item.code"
            >
              {{ item.label }} ({{ item.pipelineCount }})
            </Select.Option>
          </Select>
          <Button type="primary" @click="showCreate">
            <template #icon><PlusOutlined /></template>
            新建流程
          </Button>
        </Space>
      </template>

      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1400 }"
        @change="handleTableChange"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'isActive'">
            <Tag :color="record.isActive ? 'green' : 'default'">
              {{ record.isActive ? '已启用' : '已禁用' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Tooltip title="查看详情">
                <Button type="link" size="small" @click="showDetail(record)">
                  <template #icon><EyeOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip v-if="record.isSystem" title="参数调优">
                <Button type="link" size="small" @click="handleTune(record)">
                  <template #icon><SlidersOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip v-else title="设计流程">
                <Button type="link" size="small" @click="showDesign(record)">
                  <template #icon><ApartmentOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip :title="record.publishedAt ? '重新发布' : '发布流程'">
                <Button type="link" size="small" @click="handlePublish(record)">
                  <template #icon><CloudUploadOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="执行流程">
                <Button
                  type="link"
                  size="small"
                  @click="handleExecute(record)"
                  :disabled="!record.publishedAt"
                >
                  <template #icon><PlayCircleOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="编辑">
                <Button type="link" size="small" @click="showEdit(record)">
                  <template #icon><EditOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="复制">
                <Button
                  type="link"
                  size="small"
                  @click="handleDuplicate(record)"
                >
                  <template #icon><CopyOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="导出代码">
                <Button type="link" size="small" @click="exportAsCode(record)">
                  <template #icon><CodeOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="删除">
                <Button
                  type="link"
                  danger
                  size="small"
                  @click="handleDeleteClick(record)"
                >
                  <template #icon><DeleteOutlined /></template>
                </Button>
              </Tooltip>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- Execute Modal -->
    <Modal
      v-model:open="executeVisible"
      title="执行流程"
      @ok="handleExecuteSubmit"
      @cancel="executeVisible = false"
      width="600px"
      ok-text="执行"
      cancel-text="取消"
    >
      <div v-if="executePipeline">
        <p style="margin-bottom: 16px; color: #666">
          流程: <strong>{{ executePipeline.name }}</strong>
        </p>

        <!-- homework-grading-approval 专用表单 -->
        <Form
          v-if="executePipeline.key === 'homework-grading-approval'"
          :model="executeFormState"
          layout="vertical"
        >
          <Form.Item label="批改记录ID" required>
            <Input
              v-model:value="executeFormState.recordId"
              placeholder="留空将自动生成"
            />
            <div style="margin-top: 4px; font-size: 12px; color: #999">
              可以留空，系统会自动生成测试ID
            </div>
          </Form.Item>

          <Form.Item label="学生ID" required>
            <Input
              v-model:value="executeFormState.studentId"
              type="number"
              placeholder="请输入学生ID"
            />
          </Form.Item>

          <Form.Item label="试卷图片" required>
            <!-- 上传按钮 -->
            <Upload
              :custom-request="handleImageUpload"
              :show-upload-list="false"
              accept="image/*"
              :disabled="uploadLoading"
            >
              <Button :loading="uploadLoading" type="primary">
                {{ uploadLoading ? '上传中...' : '上传图片' }}
              </Button>
            </Upload>

            <!-- 已上传的图片列表 -->
            <div v-if="uploadedImageUrls.length > 0" style="margin-top: 12px">
              <div style="margin-bottom: 8px; font-weight: 500">
                已上传图片：
              </div>
              <div
                v-for="(url, index) in uploadedImageUrls"
                :key="index"
                style="
                  display: flex;
                  align-items: center;
                  padding: 8px;
                  margin-bottom: 8px;
                  background: #f5f5f5;
                  border-radius: 4px;
                "
              >
                <img
                  :src="url"
                  style="
                    width: 60px;
                    height: 60px;
                    margin-right: 12px;
                    object-fit: cover;
                    border-radius: 4px;
                  "
                />
                <div style="flex: 1; overflow: hidden">
                  <div
                    style="
                      overflow: hidden;
                      text-overflow: ellipsis;
                      font-size: 12px;
                      color: #666;
                      white-space: nowrap;
                    "
                  >
                    {{ url }}
                  </div>
                </div>
                <Button
                  type="link"
                  danger
                  size="small"
                  @click="handleRemoveImage(url)"
                >
                  删除
                </Button>
              </div>
            </div>

            <!-- 手动输入URL（可选） -->
            <div style="margin-top: 12px">
              <div style="margin-bottom: 4px; font-size: 12px; color: #999">
                或手动输入图片URL（每行一个）
              </div>
              <Input.TextArea
                v-model:value="executeFormState.imageUrls"
                placeholder="可选：手动输入图片URL，每行一个"
                :rows="2"
              />
            </div>
          </Form.Item>

          <Form.Item label="学科" required>
            <Select
              v-model:value="executeFormState.subject"
              placeholder="请选择学科"
            >
              <Select.Option value="MATH">数学</Select.Option>
              <Select.Option value="CHINESE">语文</Select.Option>
              <Select.Option value="ENGLISH">英语</Select.Option>
              <Select.Option value="PHYSICS">物理</Select.Option>
              <Select.Option value="CHEMISTRY">化学</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="年级" required>
            <Select
              v-model:value="executeFormState.gradeLevel"
              placeholder="请选择年级"
            >
              <Select.Option value="GRADE_1">一年级</Select.Option>
              <Select.Option value="GRADE_2">二年级</Select.Option>
              <Select.Option value="GRADE_3">三年级</Select.Option>
              <Select.Option value="GRADE_4">四年级</Select.Option>
              <Select.Option value="GRADE_5">五年级</Select.Option>
              <Select.Option value="GRADE_6">六年级</Select.Option>
              <Select.Option value="GRADE_7">七年级</Select.Option>
              <Select.Option value="GRADE_8">八年级</Select.Option>
              <Select.Option value="GRADE_9">九年级</Select.Option>
            </Select>
          </Form.Item>
        </Form>

        <!-- 通用表单（其他 pipeline） -->
        <Form v-else :model="executeFormState" layout="vertical">
          <Form.Item label="输入数据（JSON格式）">
            <Input.TextArea
              v-model:value="executeFormState.jsonInput"
              placeholder='{"key": "value"}'
              :rows="8"
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>

    <!-- Edit Modal -->
    <Modal
      v-model:open="modalVisible"
      :title="modalTitle"
      @ok="handleOk"
      width="600px"
    >
      <Form :model="formState" layout="vertical">
        <Form.Item label="流程标识" required v-if="!editingKey">
          <Input
            v-model:value="formState.key"
            placeholder="请输入流程标识（英文、数字、下划线、中划线）"
            :disabled="!!editingKey"
          />
          <div class="form-hint">
            流程标识创建后不可修改，建议使用小写字母和中划线
          </div>
        </Form.Item>

        <Form.Item label="流程名称" required>
          <Input v-model:value="formState.name" placeholder="请输入流程名称" />
        </Form.Item>

        <Form.Item label="流程描述">
          <Input.TextArea
            v-model:value="formState.description"
            placeholder="请输入流程描述"
            :rows="4"
          />
        </Form.Item>
      </Form>
    </Modal>

    <!-- Detail Drawer -->
    <Drawer
      v-model:open="detailVisible"
      title="流程详情"
      width="600"
      placement="right"
    >
      <div v-if="detailPipeline" class="pipeline-detail">
        <div class="detail-item">
          <label>流程ID：</label>
          <span>{{ detailPipeline.id }}</span>
        </div>
        <div class="detail-item">
          <label>流程标识：</label>
          <span>{{ detailPipeline.key }}</span>
        </div>
        <div class="detail-item">
          <label>流程名称：</label>
          <span>{{ detailPipeline.name }}</span>
        </div>
        <div class="detail-item">
          <label>状态：</label>
          <span>
            <Tag :color="detailPipeline.isActive ? 'green' : 'default'">
              {{ detailPipeline.isActive ? '已启用' : '已禁用' }}
            </Tag>
          </span>
        </div>
        <div class="detail-item">
          <label>版本：</label>
          <span>v{{ detailPipeline.version }}</span>
        </div>
        <div class="detail-item">
          <label>步骤数：</label>
          <span>{{ detailPipeline.steps?.length || 0 }}</span>
        </div>
        <div class="detail-item">
          <label>描述：</label>
          <span>{{ detailPipeline.description || '-' }}</span>
        </div>
        <div class="detail-item">
          <label>发布时间：</label>
          <span>{{
            detailPipeline.publishedAt
              ? dayjs(detailPipeline.publishedAt).format('YYYY-MM-DD HH:mm:ss')
              : '-'
          }}</span>
        </div>
        <div class="detail-item">
          <label>更新时间：</label>
          <span>{{
            dayjs(detailPipeline.updatedAt).format('YYYY-MM-DD HH:mm:ss')
          }}</span>
        </div>
      </div>
    </Drawer>

    <!-- Delete Confirm Modal -->
    <DeleteConfirmModal
      v-model:visible="deleteModalVisible"
      :pipeline-key="deletingPipelineKey"
      :check-data="deleteCheckData"
      :loading="deleteModalLoading"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    />
  </div>
</template>

<style scoped>
.pipeline-list {
  padding: 20px;
}

.form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: rgb(0 0 0 / 45%);
}

.pipeline-detail {
  .detail-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 16px;

    label {
      min-width: 100px;
      font-weight: 500;
      color: rgb(0 0 0 / 65%);
    }

    span {
      flex: 1;
      color: rgb(0 0 0 / 85%);
    }
  }
}
</style>
