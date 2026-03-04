<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  Card,
  Button,
  Collapse,
  CollapsePanel,
  message,
  Space,
  Divider,
} from 'ant-design-vue';
import {
  BarChartOutlined,
  RocketOutlined,
  EyeOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue';
import GuideCard from './components/GuideCard.vue';
import CampaignForm from './components/CampaignForm.vue';
import TargetRulesForm from './components/TargetRulesForm.vue';
import MatchResultPreview from './components/MatchResultPreview.vue';
import CopyPreview from './components/CopyPreview.vue';
import RecentCampaigns from './components/RecentCampaigns.vue';
import {
  createAiCampaign,
  matchAudience,
  type CreateAiCampaignRequest,
  type TargetRules,
  type AudienceSegment,
  type AudienceMatchResult,
  type PersonalizedCopy,
} from '#/api/marketing/ai-marketing';

const router = useRouter();

// ==================== 状态定义 ====================

// 页面状态
const activeCollapseKeys = ref<string[]>(['campaign', 'rules']);
const showPreview = ref(false);
const loading = ref({
  preview: false,
  create: false,
});

// 活动表单
const campaignForm = reactive({
  name: '',
  description: '',
  offer: '',
});

// 目标规则
const targetRules = reactive<TargetRules>({
  rfmSegments: [],
  minMonetary: undefined,
  maxRecencyDays: undefined,
});

// 人群上限
const audienceLimit = ref(1000);

// 匹配结果
const matchResult = ref<{
  segments: AudienceSegment[];
  results: AudienceMatchResult[];
  totalMatched: number;
} | null>(null);

// 文案预览
const copyPreview = ref<PersonalizedCopy[]>([]);

// 创建结果
const createResult = ref<{
  campaignId: string;
  success: boolean;
} | null>(null);

// ==================== 计算属性 ====================

const canPreview = computed(() => {
  return campaignForm.name.trim() && campaignForm.description.trim();
});

const canCreate = computed(() => {
  return canPreview.value && matchResult.value !== null;
});

// ==================== 方法 ====================

// 预览匹配人群
async function handlePreviewMatch() {
  if (!campaignForm.description.trim()) {
    message.error('请输入活动描述');
    return;
  }

  loading.value.preview = true;
  try {
    const result = await matchAudience({
      targetPersonaDescription: campaignForm.description,
      targetRules: {
        rfmSegments: targetRules.rfmSegments && targetRules.rfmSegments.length > 0 ? targetRules.rfmSegments : undefined,
        minMonetary: targetRules.minMonetary,
        maxRecencyDays: targetRules.maxRecencyDays,
      },
      limit: audienceLimit.value,
    });

    matchResult.value = {
      segments: result.segments,
      results: result.results,
      totalMatched: result.results.length,
    };

    // 生成模拟文案（实际应该从API获取）
    copyPreview.value = result.segments.map((segment) => ({
      segmentId: segment.segmentId,
      textContent: generateMockCopy(segment.segmentName, campaignForm.offer),
      linkTitle: campaignForm.name,
      linkDesc: campaignForm.offer || '点击查看详情',
      callToAction: '立即参与',
    }));

    showPreview.value = true;
    message.success(`成功匹配 ${result.results.length} 人，分为 ${result.segments.length} 个群体`);
  } catch (error) {
    message.error('匹配人群失败，请稍后重试');
    console.error('Match audience error:', error);
  } finally {
    loading.value.preview = false;
  }
}

// 生成模拟文案（实际项目中应从后端获取）
function generateMockCopy(segmentName: string, offer: string | undefined): string {
  const offers = offer ? `，${offer}` : '';
  const templates: string[] = [
    `尊敬的${segmentName}，感谢您一直以来的支持！我们为您准备了专属优惠活动${offers}，期待您的参与！`,
    `亲爱的${segmentName}，好久不见！我们推出了新品${offers}，特别适合您，快来看看吧！`,
    `您好！作为我们的${segmentName}，您享有优先体验权${offers}，名额有限，先到先得！`,
  ];
  return templates[Math.floor(Math.random() * templates.length)] || '';
}

// 创建活动
async function handleCreateCampaign() {
  if (!canCreate.value) {
    message.error('请先预览匹配人群');
    return;
  }

  loading.value.create = true;
  try {
    const requestData: CreateAiCampaignRequest = {
      campaignDescription: campaignForm.description,
      campaignInfo: {
        name: campaignForm.name,
        description: campaignForm.description,
        offer: campaignForm.offer,
      },
      targetRules: {
        rfmSegments: targetRules.rfmSegments && targetRules.rfmSegments.length > 0 ? targetRules.rfmSegments : undefined,
        minMonetary: targetRules.minMonetary,
        maxRecencyDays: targetRules.maxRecencyDays,
      },
      audienceLimit: audienceLimit.value,
      autoCreateAudience: true,
      autoGenerateCopy: true,
    };

    const result = await createAiCampaign(requestData);

    if (result.success) {
      createResult.value = {
        campaignId: result.campaignId,
        success: true,
      };
      message.success('活动创建成功！');

      // 询问用户下一步操作
      setTimeout(() => {
        router.push('/marketing/ai-marketing/statistics');
      }, 1500);
    } else {
      message.error(result.error || '创建活动失败');
    }
  } catch (error) {
    message.error('创建活动失败，请稍后重试');
    console.error('Create campaign error:', error);
  } finally {
    loading.value.create = false;
  }
}

// 重新生成文案
async function handleRegenerateCopy(segmentId?: string) {
  message.info('文案重新生成中...');
  // 实际项目中调用重新生成API
  setTimeout(() => {
    if (segmentId) {
      if (matchResult.value) {
        const segment = matchResult.value.segments.find((s) => s.segmentId === segmentId);
        if (segment) {
          const index = copyPreview.value.findIndex((c) => c.segmentId === segmentId);
          if (index >= 0 && copyPreview.value[index]) {
            copyPreview.value[index].textContent = generateMockCopy(
              segment.segmentName,
              campaignForm.offer,
            );
          }
        }
      }
    } else {
      // 重新生成全部
      if (matchResult.value) {
        copyPreview.value = matchResult.value.segments.map((segment) => ({
          segmentId: segment.segmentId,
          textContent: generateMockCopy(segment.segmentName, campaignForm.offer),
          linkTitle: campaignForm.name,
          linkDesc: campaignForm.offer || '点击查看详情',
          callToAction: '立即参与',
        }));
      }
    }
    message.success('文案已更新');
  }, 500);
}

// 跳转到统计页面
function goToStatistics() {
  router.push('/marketing/ai-marketing/statistics');
}

// 跳转到人群包页面
function goToAudiences() {
  router.push('/marketing/audience');
}

defineOptions({ name: 'AiMarketing' });
</script>

<template>
  <div class="p-4">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">AI 定向营销</h2>
      <Space>
        <Button type="link" @click="goToAudiences">
          <TeamOutlined /> 前往人群包
        </Button>
        <Button type="link" @click="goToStatistics">
          <BarChartOutlined /> 查看统计
        </Button>
      </Space>
    </div>

    <!-- 使用指南 -->
    <GuideCard />

    <!-- 活动设置 -->
    <Collapse v-model:activeKey="activeCollapseKeys" class="mb-4">
      <!-- 活动基本信息 -->
      <CollapsePanel key="campaign" header="📋 活动设置">
        <CampaignForm
          v-model:form-state="campaignForm"
        />
      </CollapsePanel>

      <!-- 目标人群规则 -->
      <CollapsePanel key="rules" header="🎯 目标人群规则（可选）">
        <TargetRulesForm
          v-model:rules="targetRules"
          v-model:audience-limit="audienceLimit"
        />
        <div class="mt-4 flex justify-center">
          <Button
            type="primary"
            size="large"
            :disabled="!canPreview"
            :loading="loading.preview"
            @click="handlePreviewMatch"
          >
            <EyeOutlined />
            {{ matchResult ? '重新预览' : '预览匹配人群' }}
          </Button>
        </div>
      </CollapsePanel>
    </Collapse>

    <!-- 匹配结果预览 -->
    <MatchResultPreview
      v-if="showPreview"
      :segments="matchResult?.segments || []"
      :total-matched="matchResult?.totalMatched || 0"
      :loading="loading.preview"
      :customers="matchResult?.results || []"
    />

    <!-- 个性化文案预览 -->
    <CopyPreview
      v-if="showPreview"
      :copies="copyPreview"
      :segments="matchResult?.segments || []"
      :loading="false"
      @regenerate="handleRegenerateCopy"
    />

    <!-- 创建活动按钮 -->
    <Card v-if="showPreview" class="mb-4" :bordered="false">
      <div class="flex justify-end">
        <Button
          type="primary"
          size="large"
          :disabled="!canCreate"
          :loading="loading.create"
          @click="handleCreateCampaign"
        >
          <RocketOutlined />
          创建营销活动
        </Button>
      </div>
    </Card>

    <Divider />

    <!-- 最近活动 -->
    <RecentCampaigns />
  </div>
</template>

<style scoped>
:deep(.ant-collapse-header) {
  font-weight: 500;
}
</style>
