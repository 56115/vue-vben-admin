<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Modal,
  Tabs,
  TabPane,
  Upload,
  Button,
  Table,
  Progress,
  Alert,
  Space,
  message,
} from 'ant-design-vue';
import {
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';

const props = defineProps<{
  visible: boolean;
  selectedIds?: number[];
}>();

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void;
  (e: 'success'): void;
}>();

const activeTab = ref('import');
const importLoading = ref(false);
const importProgress = ref(0);
const importResult = ref<{
  success: number;
  failed: number;
  errors: string[];
} | null>(null);

const exportLoading = ref(false);

// 下载导入模板
async function downloadTemplate() {
  try {
    const res = await requestClient.get('/messaging/material/import/template', {
      responseType: 'blob',
    });

    const blob = new Blob([res], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'material-import-template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success('模板下载成功');
  } catch (e) {
    message.error('模板下载失败');
  }
}

// 上传导入文件
async function handleImport(file: File) {
  importLoading.value = true;
  importProgress.value = 0;
  importResult.value = null;

  try {
    const formData = new FormData();
    formData.append('file', file);

    // 模拟进度
    const progressInterval = setInterval(() => {
      if (importProgress.value < 90) {
        importProgress.value += 10;
      }
    }, 200);

    const res = await requestClient.post(
      '/messaging/material/import',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );

    clearInterval(progressInterval);
    importProgress.value = 100;

    importResult.value = {
      success: res.successCount || 0,
      failed: res.failedCount || 0,
      errors: res.errors || [],
    };

    if (importResult.value.success > 0) {
      message.success(`成功导入 ${importResult.value.success} 个素材`);
      emit('success');
    }

    if (importResult.value.failed > 0) {
      message.warning(`${importResult.value.failed} 个素材导入失败`);
    }
  } catch (e: any) {
    message.error(e.message || '导入失败');
  } finally {
    importLoading.value = false;
  }

  return false; // 阻止自动上传
}

// 导出素材
async function handleExport() {
  exportLoading.value = true;

  try {
    const params = props.selectedIds?.length ? { ids: props.selectedIds } : {};

    const res = await requestClient.post('/messaging/material/export', params, {
      responseType: 'blob',
    });

    const blob = new Blob([res], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `materials-export-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success('导出成功');
    close();
  } catch (e) {
    message.error('导出失败');
  } finally {
    exportLoading.value = false;
  }
}

function close() {
  emit('update:visible', false);
  importResult.value = null;
  importProgress.value = 0;
}

const importColumns = [
  { title: '行号', dataIndex: 'row', width: 80 },
  { title: '错误信息', dataIndex: 'error' },
];
</script>

<template>
  <Modal
    :visible="visible"
    :title="null"
    :footer="null"
    width="640px"
    @cancel="close"
  >
    <Tabs v-model:activeKey="activeTab" class="import-export-tabs">
      <!-- 导入 -->
      <TabPane key="import" tab="导入素材">
        <div class="import-section">
          <Alert
            message="导入说明"
            description="支持 Excel 文件导入，文件大小不超过 10MB。请使用模板格式导入，确保数据正确性。"
            type="info"
            show-icon
            class="mb-4"
          />

          <div class="template-download">
            <span class="label">导入模板：</span>
            <Button type="link" @click="downloadTemplate">
              <DownloadOutlined />
              下载模板
            </Button>
          </div>

          <Upload.Dragger
            name="file"
            :show-upload-list="false"
            :before-upload="handleImport"
            accept=".xlsx,.xls"
            class="upload-area"
          >
            <p class="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p class="ant-upload-hint">
              支持 .xlsx, .xls 格式，文件大小不超过 10MB
            </p>
          </Upload.Dragger>

          <!-- 导入进度 -->
          <div
            v-if="importLoading || importProgress > 0"
            class="import-progress"
          >
            <Progress
              :percent="importProgress"
              :status="
                importLoading
                  ? 'active'
                  : importResult?.failed
                    ? 'exception'
                    : 'success'
              "
            />
            <p v-if="importLoading" class="progress-text">
              正在导入，请稍候...
            </p>
          </div>

          <!-- 导入结果 -->
          <div v-if="importResult" class="import-result">
            <Alert
              :message="importResult.failed === 0 ? '导入成功' : '导入完成'"
              :type="importResult.failed === 0 ? 'success' : 'warning'"
              show-icon
            >
              <template #description>
                <div class="result-stats">
                  <span class="success">
                    <CheckCircleOutlined />
                    成功：{{ importResult.success }} 个
                  </span>
                  <span v-if="importResult.failed > 0" class="failed">
                    <CloseCircleOutlined />
                    失败：{{ importResult.failed }} 个
                  </span>
                </div>
              </template>
            </Alert>

            <Table
              v-if="importResult.errors?.length"
              :columns="importColumns"
              :data-source="
                importResult.errors.map((e, i) => ({ row: i + 1, error: e }))
              "
              size="small"
              class="error-table"
            />
          </div>
        </div>
      </TabPane>

      <!-- 导出 -->
      <TabPane key="export" tab="导出素材">
        <div class="export-section">
          <Alert
            :message="
              selectedIds?.length
                ? `将导出选中的 ${selectedIds.length} 个素材`
                : '将导出所有素材（根据当前筛选条件）'
            "
            type="info"
            show-icon
            class="mb-4"
          />

          <div class="export-info">
            <h4>导出内容包括：</h4>
            <ul>
              <li>素材基本信息（名称、描述、类型）</li>
              <li>分类和标签</li>
              <li>使用统计数据</li>
              <li>创建和更新时间</li>
            </ul>
          </div>

          <div class="export-actions">
            <Button @click="close">取消</Button>
            <Button
              type="primary"
              :loading="exportLoading"
              @click="handleExport"
            >
              <FileExcelOutlined />
              确认导出
            </Button>
          </div>
        </div>
      </TabPane>
    </Tabs>
  </Modal>
</template>

<style scoped>
.import-export-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 24px;
}

.import-section,
.export-section {
  padding: 0 8px;
}

.template-download {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.template-download .label {
  color: var(--text-color-secondary, rgb(0 0 0 / 65%));
}

.upload-area {
  padding: 32px;
  text-align: center;
  background: var(--background-mute, #fafafa);
  border: 2px dashed var(--border-color, #d9d9d9);
  border-radius: 8px;
  transition: border-color 0.3s;
}

.upload-area:hover {
  border-color: var(--primary-color, #1890ff);
}

.import-progress {
  margin-top: 24px;
}

.progress-text {
  margin-top: 8px;
  color: var(--text-color-secondary, rgb(0 0 0 / 45%));
  text-align: center;
}

.import-result {
  margin-top: 24px;
}

.result-stats {
  display: flex;
  gap: 24px;
  margin-top: 8px;
}

.result-stats .success {
  color: var(--success-color, #52c41a);
}

.result-stats .failed {
  color: var(--error-color, #ff4d4f);
}

.error-table {
  max-height: 200px;
  margin-top: 16px;
  overflow-y: auto;
}

.export-info {
  padding: 16px;
  margin-bottom: 24px;
  background: var(--success-bg-color, #f6ffed);
  border: 1px solid var(--success-border-color, #b7eb8f);
  border-radius: 8px;
}

.export-info h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--text-color, rgb(0 0 0 / 85%));
}

.export-info ul {
  padding-left: 20px;
  margin: 0;
  color: var(--text-color-secondary, rgb(0 0 0 / 65%));
}

.export-info li {
  margin-bottom: 4px;
}

.export-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
