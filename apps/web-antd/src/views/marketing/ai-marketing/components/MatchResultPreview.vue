<script setup lang="ts">
import { ref } from 'vue';
import {
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Table,
  Modal,
  Spin,
  Empty,
  Button,
} from 'ant-design-vue';
import {
  TeamOutlined,
  ClusterOutlined,
  EyeOutlined,
} from '@ant-design/icons-vue';
import type {
  AudienceSegment,
  AudienceMatchResult,
} from '#/api/marketing/ai-marketing';

interface Props {
  segments: AudienceSegment[];
  totalMatched: number;
  loading: boolean;
  customers?: AudienceMatchResult[];
}

interface Emits {
  (e: 'viewDetail', segmentId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 客户列表弹窗状态
const customerModalVisible = ref(false);
const selectedSegment = ref<AudienceSegment | null>(null);

// 表格列定义
const customerColumns = [
  { title: '客户名称', dataIndex: 'name', key: 'name' },
  { title: '手机号', dataIndex: 'mobile', key: 'mobile' },
  { title: 'RFM分层', dataIndex: 'rfmSegment', key: 'rfmSegment' },
  { title: '消费金额', dataIndex: 'monetary', key: 'monetary' },
  { title: '匹配度', dataIndex: 'similarityScore', key: 'similarityScore' },
];

// 获取分群颜色
function getSegmentColor(index: number): string {
  const colors = [
    '#52c41a',
    '#1890ff',
    '#722ed1',
    '#faad14',
    '#eb2f96',
    '#13c2c2',
  ];
  return colors[index % colors.length] || '#1890ff';
}

// 打开客户列表弹窗
function openCustomerModal(segment: AudienceSegment) {
  selectedSegment.value = segment;
  customerModalVisible.value = true;
}

// 关闭弹窗
function closeCustomerModal() {
  customerModalVisible.value = false;
  selectedSegment.value = null;
}

// 获取特定分群的客户
function getSegmentCustomers(segmentId: string): AudienceMatchResult[] {
  if (!props.customers) return [];
  return props.customers.filter((c) => c.rfmSegment === segmentId);
}

defineOptions({ name: 'MatchResultPreview' });
</script>

<template>
  <Card class="mb-4" :bordered="false">
    <template #title>
      <div class="flex items-center gap-2">
        <span class="text-lg">📊</span>
        <span>匹配结果预览</span>
      </div>
    </template>

    <Spin :spinning="loading">
      <div v-if="segments.length > 0">
        <!-- 统计概览 -->
        <Row :gutter="16" class="mb-4">
          <Col :span="8">
            <Card>
              <Statistic
                title="总匹配人数"
                :value="totalMatched"
                :value-style="{ color: '#1890ff' }"
              >
                <template #prefix>
                  <TeamOutlined />
                </template>
              </Statistic>
            </Card>
          </Col>
          <Col :span="8">
            <Card>
              <Statistic
                title="分群数量"
                :value="segments.length"
                :value-style="{ color: '#52c41a' }"
              >
                <template #prefix>
                  <ClusterOutlined />
                </template>
              </Statistic>
            </Card>
          </Col>
          <Col :span="8">
            <Card>
              <Statistic
                title="平均每群人数"
                :value="Math.round(totalMatched / segments.length)"
                :value-style="{ color: '#722ed1' }"
              >
                <template #prefix>
                  <TeamOutlined />
                </template>
              </Statistic>
            </Card>
          </Col>
        </Row>

        <!-- 分群卡片 -->
        <div class="mb-4">
          <h4 class="mb-3 font-medium">分群详情</h4>
          <Row :gutter="16">
            <Col
              v-for="(segment, index) in segments"
              :key="segment.segmentId"
              :span="8"
              class="mb-3"
            >
              <Card
                size="small"
                :style="{ borderLeft: `4px solid ${getSegmentColor(index)}` }"
                class="cursor-pointer transition-shadow hover:shadow-md"
                @click="openCustomerModal(segment)"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <Tag :color="getSegmentColor(index)">{{
                      segment.segmentName
                    }}</Tag>
                    <div class="mt-1 text-sm text-gray-500">
                      {{ segment.characteristics }}
                    </div>
                  </div>
                  <div class="text-right">
                    <div
                      class="text-2xl font-bold"
                      :style="{ color: getSegmentColor(index) }"
                    >
                      {{ segment.memberCount }}
                    </div>
                    <div class="text-xs text-gray-400">人</div>
                  </div>
                </div>
                <div class="mt-2 text-right">
                  <Button
                    type="link"
                    size="small"
                    @click.stop="openCustomerModal(segment)"
                  >
                    <EyeOutlined /> 查看客户
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      <Empty v-else description="点击「预览匹配人群」查看匹配结果" />
    </Spin>

    <!-- 客户列表弹窗 -->
    <Modal
      v-model:open="customerModalVisible"
      :title="`${selectedSegment?.segmentName || ''} - 客户列表`"
      width="800px"
      :footer="null"
      @cancel="closeCustomerModal"
    >
      <Table
        :columns="customerColumns"
        :data-source="
          selectedSegment ? getSegmentCustomers(selectedSegment.segmentId) : []
        "
        :pagination="{ pageSize: 10 }"
        row-key="customerId"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'mobile'">
            {{ record.mobile || '-' }}
          </template>
          <template v-else-if="column.key === 'rfmSegment'">
            <Tag>{{ record.rfmSegment }}</Tag>
          </template>
          <template v-else-if="column.key === 'monetary'">
            ¥{{ record.monetary?.toFixed(2) || '0.00' }}
          </template>
          <template v-else-if="column.key === 'similarityScore'">
            <Tag :color="record.similarityScore >= 0.8 ? 'green' : 'blue'">
              {{ (record.similarityScore * 100).toFixed(0) }}%
            </Tag>
          </template>
        </template>
      </Table>
    </Modal>
  </Card>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
