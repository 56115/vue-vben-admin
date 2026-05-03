<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Card,
  Table,
  Tag,
  Progress,
  Button,
  Space,
  message,
} from 'ant-design-vue';
import {
  HistoryOutlined,
  PrinterOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons-vue';
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';
import { getGradingRecords } from '#/api/grading';
import type { GradingRecord } from '#/api/grading';
import { generatePdf } from '#/api/print';

const router = useRouter();

// 状态
const loading = ref(false);
const dataSource = ref<GradingRecord[]>([]);
const pagination = ref<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 条记录`,
});

// 表格列配置
const columns: TableColumnsType = [
  {
    title: '试卷预览',
    dataIndex: 'paperImageUrls',
    width: 120,
    align: 'center',
  },
  {
    title: '批改时间',
    dataIndex: 'createdAt',
    width: 180,
  },
  {
    title: '题目数',
    dataIndex: 'totalQuestions',
    width: 80,
    align: 'center',
  },
  {
    title: '正确数',
    dataIndex: 'correctCount',
    width: 80,
    align: 'center',
  },
  {
    title: '正确率',
    dataIndex: 'accuracy',
    width: 200,
  },
  {
    title: '得分',
    dataIndex: 'totalScore',
    width: 120,
    align: 'center',
  },
  {
    title: '处理耗时',
    dataIndex: 'processingMs',
    width: 100,
    align: 'center',
  },
  {
    title: '操作',
    dataIndex: 'action',
    width: 100,
    align: 'center',
    fixed: 'right',
  },
];

// 获取正确率颜色
const getAccuracyColor = (accuracy: number) => {
  if (accuracy >= 0.8) return '#52c41a';
  if (accuracy >= 0.6) return '#faad14';
  return '#ff4d4f';
};

// 格式化时间
const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 加载数据
const loadData = async () => {
  loading.value = true;

  try {
    const res = await getGradingRecords({
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
    });

    dataSource.value = res.items;
    pagination.value.total = res.total;
  } catch (error: any) {
    message.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

// 处理表格变化
const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  loadData();
};

// 刷新
const handleRefresh = () => {
  pagination.value.current = 1;
  loadData();
};

// 打印记录状态
const printingId = ref<string | null>(null);

// 打印批改报告
const handlePrint = async (record: GradingRecord | Record<string, any>) => {
  printingId.value = record.recordId;
  try {
    const printData = {
      studentName: '学生', // 实际应从学生信息获取
      gradingDate: formatTime(record.createdAt),
      totalScore: record.totalScore,
      maxScore: record.maxScore,
      accuracy: record.accuracy,
      correctCount: record.correctCount,
      totalQuestions: record.totalQuestions,
      processingTime: record.processingMs,
      overallComment: `本次作业共 ${record.totalQuestions} 题，正确 ${record.correctCount} 题，正确率 ${(record.accuracy * 100).toFixed(1)}%`,
      strengthPoints:
        record.accuracy >= 0.8 ? ['整体表现优秀', '答题准确率高'] : [],
      improvementPoints:
        record.accuracy < 0.6 ? ['建议加强基础知识', '多做练习巩固'] : [],
      studySuggestions: ['继续保持良好的学习习惯', '针对错题进行专项练习'],
    };

    await generatePdf({
      templateCode: 'PAPER_GRADING_REPORT',
      data: printData,
      fileName: `批改报告-${formatTime(record.createdAt).replace(/[\/\s:]/g, '-')}`,
    });

    message.success('PDF报告生成成功！');
  } catch (error: any) {
    message.error(`生成PDF失败: ${error.message || '未知错误'}`);
    console.error('Print error:', error);
  } finally {
    printingId.value = null;
  }
};

// 点击图片跳转到详情页
const handleImageClick = (recordId: string) => {
  router.push(`/ai-tutor/grading/${recordId}`);
};

// 初始化
onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="history-page">
    <div class="page-header">
      <h2><HistoryOutlined class="header-icon" /> 批改历史</h2>
      <p>查看作业批改的历史记录</p>
    </div>

    <Card :bordered="false">
      <!-- 工具栏 -->
      <div class="toolbar">
        <Space>
          <Button @click="handleRefresh">
            <template #icon><ReloadOutlined /></template>
            刷新
          </Button>
        </Space>
      </div>

      <!-- 数据表格 -->
      <Table
        :columns="columns"
        :data-source="dataSource"
        :pagination="pagination"
        :loading="loading"
        row-key="recordId"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'paperImageUrls'">
            <div
              v-if="record.paperImageUrls && record.paperImageUrls.length > 0"
              class="paper-thumbnail"
              @click="handleImageClick(record.recordId)"
            >
              <img
                :src="record.paperImageUrls[0].thumbnail"
                :alt="`试卷第${record.paperImageUrls[0].pageIndex}页`"
                loading="lazy"
                class="thumbnail-img"
              />
              <span
                v-if="record.paperImageUrls.length > 1"
                class="page-count-badge"
              >
                {{ record.paperImageUrls.length }}页
              </span>
            </div>
            <span v-else class="no-image">无图片</span>
          </template>
          <template v-if="column.dataIndex === 'createdAt'">
            {{ formatTime(record.createdAt) }}
          </template>
          <template v-if="column.dataIndex === 'totalQuestions'">
            <Tag color="blue">{{ record.totalQuestions }}</Tag>
          </template>
          <template v-if="column.dataIndex === 'correctCount'">
            <Tag color="green">{{ record.correctCount }}</Tag>
          </template>
          <template v-if="column.dataIndex === 'accuracy'">
            <Progress
              :percent="record.accuracy * 100"
              :stroke-color="getAccuracyColor(record.accuracy)"
              :format="(percent) => `${percent?.toFixed(1)}%`"
              size="small"
            />
          </template>
          <template v-if="column.dataIndex === 'totalScore'">
            <span class="score-text">
              {{ record.totalScore }} / {{ record.maxScore }}
            </span>
          </template>
          <template v-if="column.dataIndex === 'processingMs'">
            <span class="time-text">{{ record.processingMs }}ms</span>
          </template>
          <template v-if="column.dataIndex === 'action'">
            <Space>
              <Button
                type="link"
                size="small"
                @click="router.push(`/ai-tutor/grading/${record.recordId}`)"
              >
                <template #icon><EyeOutlined /></template>
                详情
              </Button>
              <Button
                type="link"
                size="small"
                :loading="printingId === record.id"
                @click="handlePrint(record)"
              >
                <template #icon><PrinterOutlined /></template>
                打印
              </Button>
            </Space>
          </template>
        </template>

        <!-- 空状态 -->
        <template #emptyText>
          <div class="empty-state">
            <HistoryOutlined class="empty-icon" />
            <p>暂无批改记录</p>
          </div>
        </template>
      </Table>
    </Card>
  </div>
</template>

<style scoped>
.history-page {
  padding: 16px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0 0 8px;
  font-size: 24px;
}

.header-icon {
  font-size: 20px;
}

.page-header p {
  margin: 0;
  color: #666;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.score-text {
  font-weight: 500;
  color: #1890ff;
}

.time-text {
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  color: #999;
}

.empty-icon {
  margin-bottom: 16px;
  font-size: 48px;
}

.paper-thumbnail {
  position: relative;
  display: inline-block;
  width: 80px;
  height: 100px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  transition: all 0.3s;
}

.paper-thumbnail:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgb(24 144 255 / 20%);
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.page-count-badge {
  position: absolute;
  right: 4px;
  bottom: 4px;
  padding: 2px 6px;
  font-size: 12px;
  color: #fff;
  background: rgb(0 0 0 / 70%);
  border-radius: 2px;
}

.no-image {
  font-size: 12px;
  color: #999;
}
</style>
