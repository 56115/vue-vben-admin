<template>
  <div class="mistake-list-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h2>错题管理</h2>
        <Space>
          <Button @click="refreshData" :loading="loading">
            <ReloadOutlined />
            刷新
          </Button>
          <Button type="primary" @click="showImportModal">
            <UploadOutlined />
            导入错题
          </Button>
          <Button @click="exportMistakes" :loading="exporting">
            <DownloadOutlined />
            导出
          </Button>
        </Space>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <Row :gutter="16">
        <Col :span="6">
          <Card :bordered="false" class="stat-card">
            <Statistic
              title="错题总数"
              :value="stats.total"
              :value-style="{ color: '#ff4d4f' }"
            >
              <template #prefix>
                <FileTextOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :span="6">
          <Card :bordered="false" class="stat-card">
            <Statistic
              title="待复习"
              :value="stats.pending"
              :value-style="{ color: '#faad14' }"
            >
              <template #prefix>
                <ClockCircleOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :span="6">
          <Card :bordered="false" class="stat-card">
            <Statistic
              title="已掌握"
              :value="stats.mastered"
              :value-style="{ color: '#52c41a' }"
            >
              <template #prefix>
                <CheckCircleOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :span="6">
          <Card :bordered="false" class="stat-card">
            <Statistic
              title="掌握率"
              :value="stats.masteryRate"
              suffix="%"
              :precision="1"
              :value-style="{ color: getMasteryColor(stats.masteryRate) }"
            >
              <template #prefix>
                <TrophyOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
      </Row>
    </div>

    <!-- 筛选器 -->
    <Card :bordered="false" class="filter-card">
      <Form layout="inline">
        <FormItem label="学科">
          <Select
            v-model:value="filters.subject"
            style="width: 120px"
            placeholder="全部学科"
            allow-clear
            @change="handleFilterChange"
          >
            <SelectOption value="">全部</SelectOption>
            <SelectOption value="MATH">数学</SelectOption>
            <SelectOption value="CHINESE">语文</SelectOption>
            <SelectOption value="ENGLISH">英语</SelectOption>
            <SelectOption value="PHYSICS">物理</SelectOption>
            <SelectOption value="CHEMISTRY">化学</SelectOption>
          </Select>
        </FormItem>

        <FormItem label="错误类型">
          <Select
            v-model:value="filters.errorType"
            style="width: 140px"
            placeholder="全部类型"
            allow-clear
            @change="handleFilterChange"
          >
            <SelectOption value="">全部</SelectOption>
            <SelectOption value="CALCULATION_ERROR"
              >计算错误</SelectOption
            >
            <SelectOption value="CONCEPT_ERROR">概念错误</SelectOption>
            <SelectOption value="CARELESS_ERROR">粗心错误</SelectOption>
            <SelectOption value="METHOD_ERROR">方法错误</SelectOption>
          </Select>
        </FormItem>

        <FormItem label="掌握状态">
          <Select
            v-model:value="filters.masteryStatus"
            style="width: 120px"
            placeholder="全部状态"
            allow-clear
            @change="handleFilterChange"
          >
            <SelectOption value="">全部</SelectOption>
            <SelectOption value="pending">待复习</SelectOption>
            <SelectOption value="reviewing">复习中</SelectOption>
            <SelectOption value="mastered">已掌握</SelectOption>
          </Select>
        </FormItem>

        <FormItem label="难度">
          <Select
            v-model:value="filters.difficulty"
            style="width: 120px"
            placeholder="全部难度"
            allow-clear
            @change="handleFilterChange"
          >
            <SelectOption value="">全部</SelectOption>
            <SelectOption :value="1">简单</SelectOption>
            <SelectOption :value="2">较简单</SelectOption>
            <SelectOption :value="3">中等</SelectOption>
            <SelectOption :value="4">较难</SelectOption>
            <SelectOption :value="5">困难</SelectOption>
          </Select>
        </FormItem>

        <FormItem label="关键词">
          <Input
            v-model:value="filters.keyword"
            style="width: 200px"
            placeholder="搜索题目内容"
            allow-clear
            @press-enter="handleFilterChange"
          >
            <template #suffix>
              <SearchOutlined />
            </template>
          </Input>
        </FormItem>

        <FormItem>
          <Button type="primary" @click="handleFilterChange">
            <SearchOutlined />
            搜索
          </Button>
        </FormItem>

        <FormItem>
          <Button @click="resetFilters"> 重置 </Button>
        </FormItem>
      </Form>
    </Card>

    <!-- 视图切换 -->
    <div class="view-controls">
      <Space>
        <span class="view-label">视图模式：</span>
        <RadioGroup v-model:value="viewMode" button-style="solid">
          <RadioButton value="card">
            <AppstoreOutlined />
            卡片
          </RadioButton>
          <RadioButton value="list">
            <UnorderedListOutlined />
            列表
          </RadioButton>
          <RadioButton value="table">
            <TableOutlined />
            表格
          </RadioButton>
        </RadioGroup>

        <Divider type="vertical" />

        <span class="sort-label">排序：</span>
        <Select
          v-model:value="sortBy"
          style="width: 150px"
          @change="handleSortChange"
        >
          <SelectOption value="createdAt_desc">最新创建</SelectOption>
          <SelectOption value="createdAt_asc">最早创建</SelectOption>
          <SelectOption value="difficulty_desc"
            >难度从高到低</SelectOption
          >
          <SelectOption value="difficulty_asc">难度从低到高</SelectOption>
          <SelectOption value="score_asc">得分从低到高</SelectOption>
          <SelectOption value="score_desc">得分从高到低</SelectOption>
        </Select>
      </Space>
    </div>

    <!-- 数据列表 -->
    <Spin :spinning="loading" tip="加载中...">
      <!-- 卡片视图 -->
      <div v-if="viewMode === 'card'" class="card-view">
        <Row :gutter="[16, 16]">
          <Col
            v-for="mistake in mistakes"
            :key="mistake.id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
            :xl="6"
          >
            <Card
              :bordered="false"
              hoverable
              class="mistake-card"
              @click="viewMistakeDetail(mistake)"
            >
              <template #cover>
                <div class="card-cover">
                  <img
                    v-if="mistake.thumbnailUrl"
                    :src="mistake.thumbnailUrl"
                    :alt="mistake.questionNumber"
                  />
                  <div v-else class="no-image">
                    <FileImageOutlined
                      style="font-size: 48px; color: #d9d9d9"
                    />
                  </div>
                  <div class="card-overlay">
                    <Tag :color="getSubjectColor(mistake.subject)">
                      {{ getSubjectText(mistake.subject) }}
                    </Tag>
                  </div>
                </div>
              </template>

              <Card-meta>
                <template #title>
                  <div class="card-title">
                    第 {{ mistake.questionNumber }} 题
                    <Tag
                      v-if="mistake.masteryStatus === 'mastered'"
                      color="success"
                      size="small"
                    >
                      已掌握
                    </Tag>
                  </div>
                </template>
                <template #description>
                  <div class="card-description">
                    {{ truncateText(mistake.questionContent, 60) }}
                  </div>
                </template>
              </Card-meta>

              <div class="card-footer">
                <div class="footer-item">
                  <Rate
                    :value="mistake.difficulty"
                    disabled
                    :count="5"
                    style="font-size: 12px"
                  />
                </div>
                <div class="footer-item">
                  <Tag
                    :color="getErrorTypeColor(mistake.errorType)"
                    size="small"
                  >
                    {{ getErrorTypeText(mistake.errorType) }}
                  </Tag>
                </div>
              </div>

              <template #actions>
                <Tooltip title="查看详情">
                  <EyeOutlined @click.stop="viewMistakeDetail(mistake)" />
                </Tooltip>
                <Tooltip title="开始练习">
                  <EditOutlined @click.stop="practiceMistake(mistake)" />
                </Tooltip>
                <Dropdown>
                  <MoreOutlined @click.stop />
                  <template #overlay>
                    <Menu>
                      <MenuItem @click="markAsMastered(mistake)">
                        <CheckCircleOutlined />
                        标记为已掌握
                      </MenuItem>
                      <MenuItem @click="addToErrorBook(mistake)">
                        <BookOutlined />
                        加入错题本
                      </MenuItem>
                      <MenuDivider />
                      <MenuItem danger @click="deleteMistake(mistake)">
                        <DeleteOutlined />
                        删除
                      </MenuItem>
                    </Menu>
                  </template>
                </Dropdown>
              </template>
            </Card>
          </Col>
        </Row>
      </div>

      <!-- 列表视图 -->
      <List
        v-else-if="viewMode === 'list'"
        :data-source="mistakes"
        class="list-view"
        item-layout="vertical"
      >
        <template #renderItem="{ item }">
          <List-item @click="viewMistakeDetail(item)">
            <template #actions>
              <Button type="link" @click.stop="viewMistakeDetail(item)">
                查看详情
              </Button>
              <Button type="link" @click.stop="practiceMistake(item)">
                开始练习
              </Button>
              <Dropdown>
                <Button type="link">
                  更多
                  <DownOutlined />
                </Button>
                <template #overlay>
                  <Menu>
                    <MenuItem @click="markAsMastered(item)">
                      标记为已掌握
                    </MenuItem>
                    <MenuItem @click="addToErrorBook(item)">
                      加入错题本
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem danger @click="deleteMistake(item)">
                      删除
                    </MenuItem>
                  </Menu>
                </template>
              </Dropdown>
            </template>

            <List-item-meta>
              <template #title>
                <div class="list-item-title">
                  <Tag :color="getSubjectColor(item.subject)">
                    {{ getSubjectText(item.subject) }}
                  </Tag>
                  <span>第 {{ item.questionNumber }} 题</span>
                  <Tag
                    v-if="item.masteryStatus === 'mastered'"
                    color="success"
                    size="small"
                  >
                    已掌握
                  </Tag>
                </div>
              </template>
              <template #description>
                <div class="list-item-description">
                  {{ item.questionContent }}
                </div>
              </template>
            </List-item-meta>

            <template #extra>
              <img
                v-if="item.thumbnailUrl"
                :src="item.thumbnailUrl"
                :alt="item.questionNumber"
                style="width: 200px; border-radius: 4px"
              />
            </template>

            <div class="list-item-footer">
              <Space :size="16">
                <span>
                  <StarOutlined />
                  难度:
                  <Rate
                    :value="item.difficulty"
                    disabled
                    :count="5"
                    style="margin-left: 4px; font-size: 12px"
                  />
                </span>
                <span>
                  <TagOutlined />
                  {{ getErrorTypeText(item.errorType) }}
                </span>
                <span>
                  <ClockCircleOutlined />
                  {{ formatTime(item.createdAt) }}
                </span>
                <span> 得分: {{ item.score }} / {{ item.maxScore }} </span>
              </Space>
            </div>
          </List-item>
        </template>
      </List>

      <!-- 表格视图 -->
      <Spin
        v-else
        :columns="tableColumns"
        :data-source="mistakes"
        :row-key="(record) => record.id"
        :pagination="false"
        :scroll="{ x: 1200 }"
        class="table-view"
        @row-click="(record) => viewMistakeDetail(record)"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'questionNumber'">
            <a @click.stop="viewMistakeDetail(record)">
              第 {{ record.questionNumber }} 题
            </a>
          </template>

          <template v-if="column.key === 'subject'">
            <Tag :color="getSubjectColor(record.subject)">
              {{ getSubjectText(record.subject) }}
            </Tag>
          </template>

          <template v-if="column.key === 'questionContent'">
            {{ truncateText(record.questionContent, 50) }}
          </template>

          <template v-if="column.key === 'errorType'">
            <Tag :color="getErrorTypeColor(record.errorType)">
              {{ getErrorTypeText(record.errorType) }}
            </Tag>
          </template>

          <template v-if="column.key === 'difficulty'">
            <Rate
              :value="record.difficulty"
              disabled
              :count="5"
              style="font-size: 12px"
            />
          </template>

          <template v-if="column.key === 'score'">
            <span
              :style="{ color: getScoreColor(record.score, record.maxScore) }"
            >
              {{ record.score }} / {{ record.maxScore }}
            </span>
          </template>

          <template v-if="column.key === 'masteryStatus'">
            <Tag :color="getMasteryStatusColor(record.masteryStatus)">
              {{ getMasteryStatusText(record.masteryStatus) }}
            </Tag>
          </template>

          <template v-if="column.key === 'createdAt'">
            {{ formatTime(record.createdAt) }}
          </template>

          <template v-if="column.key === 'action'">
            <Space>
              <Button
                type="link"
                size="small"
                @click.stop="viewMistakeDetail(record)"
              >
                查看
              </Button>
              <Button
                type="link"
                size="small"
                @click.stop="practiceMistake(record)"
              >
                练习
              </Button>
              <Dropdown>
                <Button type="link" size="small" @click.stop>
                  更多
                  <DownOutlined />
                </Button>
                <template #overlay>
                  <Menu>
                    <MenuItem @click="markAsMastered(record)">
                      标记为已掌握
                    </MenuItem>
                    <MenuItem @click="addToErrorBook(record)">
                      加入错题本
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem danger @click="deleteMistake(record)">
                      删除
                    </MenuItem>
                  </Menu>
                </template>
              </Dropdown>
            </Space>
          </template>
        </template>
      </Spin>

      <!-- 空状态 -->
      <Empty
        v-if="mistakes.length === 0 && !loading"
        description="暂无错题数据"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
        style="margin: 60px 0"
      >
        <Button type="primary" @click="showImportModal">
          <UploadOutlined />
          导入错题
        </Button>
      </Empty>
    </Spin>

    <!-- 分页 -->
    <div v-if="total > 0" class="pagination">
      <Pagination
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        :total="total"
        :show-total="(total) => `共 ${total} 条错题`"
        :show-size-changer="true"
        :page-size-options="['10', '20', '50', '100']"
        @change="handlePageChange"
        @show-size-change="handlePageChange"
      />
    </div>

    <!-- 导入弹窗 -->
    <Modal
      v-model:open="importModalVisible"
      title="导入错题"
      width="600px"
      :footer="null"
    >
      <UploadDragger
        :file-list="fileList"
        :before-upload="beforeUpload"
        :remove="handleRemove"
        @change="handleUploadChange"
      >
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p class="ant-upload-hint">支持 Excel、CSV 格式，单次上传不超过 10MB</p>
      </UploadDragger>

      <div style="margin-top: 16px; text-align: right">
        <Space>
          <Button @click="importModalVisible = false"> 取消 </Button>
          <Button
            type="primary"
            :loading="uploading"
            :disabled="fileList.length === 0"
            @click="handleUpload"
          >
            开始导入
          </Button>
        </Space>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Button,
  Card,
  Col,
  Divider,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Menu,
  message,
  Modal,
  Pagination,
  Radio,
  Rate,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Upload,
} from 'ant-design-vue';
import type { UploadFile } from 'ant-design-vue';
import {
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  TableOutlined,
  EyeOutlined,
  EditOutlined,
  MoreOutlined,
  BookOutlined,
  DeleteOutlined,
  DownOutlined,
  FileImageOutlined,
  StarOutlined,
  TagOutlined,
  InboxOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';
import axios from 'axios';
// PageHeader component removed - using plain div instead

// 类型定义
interface MistakeItem {
  id: string;
  questionItemId: string;
  questionNumber: string;
  subject: string;
  questionType: string;
  questionContent: string;
  studentAnswer: string;
  correctAnswer: string;
  errorType: string;
  difficulty: number;
  score: number;
  maxScore: number;
  masteryStatus: string;
  thumbnailUrl: string;
  createdAt: string;
}

interface Stats {
  total: number;
  pending: number;
  mastered: number;
  masteryRate: number;
}

// Hooks
const router = useRouter();

// State
const loading = ref(false);
const exporting = ref(false);
const uploading = ref(false);

const mistakes = ref<MistakeItem[]>([]);
const stats = reactive<Stats>({
  total: 0,
  pending: 0,
  mastered: 0,
  masteryRate: 0,
});

const filters = reactive({
  subject: '',
  errorType: '',
  masteryStatus: '',
  difficulty: '',
  keyword: '',
});

const viewMode = ref<'card' | 'list' | 'table'>('card');
const sortBy = ref('createdAt_desc');

const pagination = reactive({
  current: 1,
  pageSize: 20,
});

const total = ref(0);

// 导入相关
const importModalVisible = ref(false);
const fileList = ref<UploadFile[]>([]);

// 表格列配置
const tableColumns = [
  {
    title: '题号',
    key: 'questionNumber',
    width: 100,
    fixed: 'left',
  },
  {
    title: '学科',
    key: 'subject',
    width: 100,
  },
  {
    title: '题目内容',
    key: 'questionContent',
    width: 300,
  },
  {
    title: '错误类型',
    key: 'errorType',
    width: 120,
  },
  {
    title: '难度',
    key: 'difficulty',
    width: 150,
  },
  {
    title: '得分',
    key: 'score',
    width: 100,
  },
  {
    title: '掌握状态',
    key: 'masteryStatus',
    width: 120,
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 180,
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
    fixed: 'right',
  },
];

// 加载数据
async function loadMistakes() {
  loading.value = true;
  try {
    const params = {
      ...filters,
      page: pagination.current,
      pageSize: pagination.pageSize,
      sortBy: sortBy.value,
    };

    const response = await axios.get('/api/education/mistakes', { params });

    mistakes.value = response.data.data.items || [];
    total.value = response.data.data.total || 0;

    // 加载统计数据
    await loadStats();
  } catch (error: any) {
    console.error('Failed to load mistakes:', error);
    message.error(error.response?.data?.message || '加载错题列表失败');
  } finally {
    loading.value = false;
  }
}

// 加载统计数据
async function loadStats() {
  try {
    const response = await axios.get('/api/education/mistakes/stats');
    Object.assign(stats, response.data.data);
  } catch (error: any) {
    console.error('Failed to load stats:', error);
  }
}

// 刷新数据
function refreshData() {
  loadMistakes();
}

// 筛选变化
function handleFilterChange() {
  pagination.current = 1;
  loadMistakes();
}

// 重置筛选
function resetFilters() {
  Object.assign(filters, {
    subject: '',
    errorType: '',
    masteryStatus: '',
    difficulty: '',
    keyword: '',
  });
  handleFilterChange();
}

// 排序变化
function handleSortChange() {
  loadMistakes();
}

// 分页变化
function handlePageChange() {
  loadMistakes();
}

// 查看详情
function viewMistakeDetail(mistake: MistakeItem) {
  router.push(`/education/mistakes/${mistake.id}`);
}

// 开始练习
function practiceMistake(mistake: MistakeItem) {
  message.info('练习功能待实现');
  // TODO: 跳转到练习页面
}

// 标记为已掌握
function markAsMastered(mistake: MistakeItem) {
  Modal.confirm({
    title: '确认标记为已掌握',
    content: '标记后此题将从待复习列表中移除',
    onOk: async () => {
      try {
        await axios.patch(`/api/education/mistakes/${mistake.id}/mastered`);
        message.success('已标记为已掌握');
        loadMistakes();
      } catch (error: any) {
        message.error(error.response?.data?.message || '操作失败');
      }
    },
  });
}

// 加入错题本
function addToErrorBook(mistake: MistakeItem) {
  message.info('加入错题本功能待实现');
}

// 删除错题
function deleteMistake(mistake: MistakeItem) {
  Modal.confirm({
    title: '确认删除',
    content: '删除后无法恢复，确认删除此错题吗？',
    okType: 'danger',
    onOk: async () => {
      try {
        await axios.delete(`/api/education/mistakes/${mistake.id}`);
        message.success('删除成功');
        loadMistakes();
      } catch (error: any) {
        message.error(error.response?.data?.message || '删除失败');
      }
    },
  });
}

// 导出错题
function exportMistakes() {
  exporting.value = true;
  message.info('导出功能待实现');
  setTimeout(() => {
    exporting.value = false;
  }, 1000);
}

// 显示导入弹窗
function showImportModal() {
  importModalVisible.value = true;
}

// 文件上传
function beforeUpload(file: UploadFile) {
  const isExcel =
    file.type === 'application/vnd.ms-excel' ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const isCSV = file.type === 'text/csv';

  if (!isExcel && !isCSV) {
    message.error('只能上传 Excel 或 CSV 文件！');
    return false;
  }

  const isLt10M = (file.size || 0) / 1024 / 1024 < 10;
  if (!isLt10M) {
    message.error('文件大小不能超过 10MB！');
    return false;
  }

  return false; // 手动上传
}

function handleUploadChange(info: any) {
  fileList.value = info.fileList;
}

function handleRemove() {
  fileList.value = [];
}

async function handleUpload() {
  if (fileList.value.length === 0) {
    message.warning('请选择文件');
    return;
  }

  uploading.value = true;
  try {
    const formData = new FormData();
    fileList.value.forEach((file) => {
      formData.append('file', file.originFileObj as File);
    });

    await axios.post('/api/education/mistakes/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    message.success('导入成功');
    importModalVisible.value = false;
    fileList.value = [];
    loadMistakes();
  } catch (error: any) {
    message.error(error.response?.data?.message || '导入失败');
  } finally {
    uploading.value = false;
  }
}

// 工具函数
function getSubjectColor(subject: string): string {
  const colors: Record<string, string> = {
    MATH: 'blue',
    CHINESE: 'red',
    ENGLISH: 'green',
    PHYSICS: 'purple',
    CHEMISTRY: 'orange',
  };
  return colors[subject] || 'default';
}

function getSubjectText(subject: string): string {
  const texts: Record<string, string> = {
    MATH: '数学',
    CHINESE: '语文',
    ENGLISH: '英语',
    PHYSICS: '物理',
    CHEMISTRY: '化学',
  };
  return texts[subject] || subject;
}

function getErrorTypeColor(type: string): string {
  const colors: Record<string, string> = {
    CALCULATION_ERROR: 'red',
    CONCEPT_ERROR: 'orange',
    CARELESS_ERROR: 'blue',
    METHOD_ERROR: 'purple',
  };
  return colors[type] || 'default';
}

function getErrorTypeText(type: string): string {
  const texts: Record<string, string> = {
    CALCULATION_ERROR: '计算错误',
    CONCEPT_ERROR: '概念错误',
    CARELESS_ERROR: '粗心错误',
    METHOD_ERROR: '方法错误',
  };
  return texts[type] || type;
}

function getMasteryStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'default',
    reviewing: 'processing',
    mastered: 'success',
  };
  return colors[status] || 'default';
}

function getMasteryStatusText(status: string): string {
  const texts: Record<string, string> = {
    pending: '待复习',
    reviewing: '复习中',
    mastered: '已掌握',
  };
  return texts[status] || status;
}

function getScoreColor(score: number, maxScore: number): string {
  const rate = score / maxScore;
  if (rate >= 0.9) return '#52c41a';
  if (rate >= 0.7) return '#faad14';
  return '#ff4d4f';
}

function getMasteryColor(rate: number): string {
  if (rate >= 80) return '#52c41a';
  if (rate >= 60) return '#faad14';
  return '#ff4d4f';
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function formatTime(time: string): string {
  return dayjs(time).format('YYYY-MM-DD HH:mm');
}

// 初始化
onMounted(() => {
  loadMistakes();
});
</script>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'MistakeListPage',
});
</script>

<style scoped lang="less">
.mistake-list-page {
  padding: 16px;
  background: #f0f2f5;
  min-height: 100vh;

  .page-header {
    background: #fff;
    padding: 16px 24px;
    margin-bottom: 16px;
    border-radius: 4px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.85);
      }
    }
  }

  .stats-section {
    margin-bottom: 16px;

    .stat-card {
      :deep(.ant-card-body) {
        padding: 20px;
      }
    }
  }

  .filter-card {
    margin-bottom: 16px;
  }

  .view-controls {
    margin-bottom: 16px;
    padding: 12px 16px;
    background: #fff;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .view-label,
    .sort-label {
      font-size: 14px;
      color: #595959;
    }
  }

  // 卡片视图
  .card-view {
    margin-bottom: 16px;

    .mistake-card {
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      }

      .card-cover {
        position: relative;
        height: 200px;
        background: #fafafa;
        display: flex;
        align-items: center;
        justify-content: center;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-image {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }

        .card-overlay {
          position: absolute;
          top: 8px;
          left: 8px;
        }
      }

      .card-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 14px;
        font-weight: 600;
      }

      .card-description {
        font-size: 13px;
        color: #8c8c8c;
        line-height: 1.6;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .card-footer {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }
  }

  // 列表视图
  .list-view {
    background: #fff;
    border-radius: 4px;
    margin-bottom: 16px;

    :deep(.ant-list-item) {
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        background: #fafafa;
      }
    }

    .list-item-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 16px;
      font-weight: 600;
    }

    .list-item-description {
      font-size: 14px;
      color: #595959;
      line-height: 1.8;
      margin-top: 8px;
    }

    .list-item-footer {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
      font-size: 13px;
      color: #8c8c8c;
    }
  }

  // 表格视图
  .table-view {
    background: #fff;
    border-radius: 4px;
    margin-bottom: 16px;

    :deep(.ant-table-row) {
      cursor: pointer;

      &:hover {
        background: #fafafa;
      }
    }
  }

  // 分页
  .pagination {
    display: flex;
    justify-content: center;
    padding: 16px;
    background: #fff;
    border-radius: 4px;
  }
}
</style>
