<template>
  <div class="mode-switch-demo">
    <!-- 模式切换器（放在页面右上角） -->
    <Card>
      <template #title>
        <Space>
          <span>批改结果</span>
          <UserModeSwitch @change="handleModeChange" />
        </Space>
      </template>

      <!-- 根据模式显示不同内容的示例 -->

      <!-- 示例 1: 使用 ModeContent 组件 -->
      <ModeContent mode="PARENT">
        <template #parent>
          <Alert
            message="家长模式"
            description="您正在查看完整的批改分析和统计数据"
            type="info"
            show-icon
            class="mb-4"
          />
        </template>
      </ModeContent>

      <ModeContent mode="CHILD">
        <template #child>
          <Alert
            message="孩子模式"
            description="继续加油！让我们一起看看这次的表现 🌟"
            type="success"
            show-icon
            class="mb-4"
          />
        </template>
      </ModeContent>

      <!-- 示例 2: 使用 v-if 条件渲染 -->
      <Card title="批改详情" size="small" class="mb-4">
        <!-- 家长模式：显示详细分析 -->
        <div v-if="modeStore.isParentMode">
          <Descriptions bordered size="small">
            <DescriptionsItem label="正确率">85%</DescriptionsItem>
            <DescriptionsItem label="知识点掌握度">78%</DescriptionsItem>
            <DescriptionsItem label="错误类型">计算错误 (3题)</DescriptionsItem>
            <DescriptionsItem label="建议复习时间">30分钟</DescriptionsItem>
          </Descriptions>

          <Divider />

          <Alert
            message="家长指导建议"
            description="孩子在计算步骤上有疏漏，建议引导孩子养成检查的习惯。可以让孩子先自己找出错误，再给予提示。"
            type="warning"
            show-icon
          />
        </div>

        <!-- 孩子模式：显示简化信息和鼓励 -->
        <div v-else>
          <Result status="success" title="太棒了！做对了 17 题！">
            <template #extra>
              <Space direction="vertical" size="large" style="width: 100%">
                <Progress
                  :percent="85"
                  :stroke-color="{
                    '0%': '#87d068',
                    '100%': '#52c41a',
                  }"
                />
                <div class="encouragement">
                  <span class="emoji">⭐</span>
                  <p>继续保持！你已经掌握了大部分知识点</p>
                  <p>有 3 道题可以再练习一下哦~</p>
                </div>
              </Space>
            </template>
          </Result>
        </div>
      </Card>

      <!-- 示例 3: 使用 feature 开关控制 -->
      <ModeContent feature="showStatistics">
        <Card title="统计图表" size="small" class="mb-4">
          <div style="height: 200px; display: flex; align-items: center; justify-content: center;">
            <BarChartOutlined style="font-size: 48px; color: #1890ff;" />
            <span style="margin-left: 16px;">知识点掌握度雷达图</span>
          </div>
        </Card>
      </ModeContent>

      <!-- 示例 4: 动态文本 -->
      <Card title="操作建议" size="small">
        <p>{{ modeStore.getText(
          '建议您陪伴孩子一起分析错题，引导孩子自己发现问题所在。',
          '看看这些题目，想想哪里可以做得更好呢？'
        ) }}</p>
      </Card>
    </Card>

    <!-- 配置面板（开发时用于调试） -->
    <Card title="模式配置" class="mt-4" v-if="showDebugPanel">
      <Space direction="vertical" style="width: 100%">
        <div>
          <span>当前模式：</span>
          <Tag :color="modeStore.isParentMode ? 'blue' : 'green'">
            {{ modeStore.modeLabel }}
          </Tag>
        </div>

        <Divider />

        <Checkbox
          v-model:checked="modeStore.config.showDetailedAnalysis"
          @change="handleConfigChange"
        >
          显示详细分析
        </Checkbox>

        <Checkbox
          v-model:checked="modeStore.config.showStatistics"
          @change="handleConfigChange"
        >
          显示统计数据
        </Checkbox>

        <Checkbox
          v-model:checked="modeStore.config.showAnswers"
          @change="handleConfigChange"
        >
          显示答案
        </Checkbox>

        <Checkbox
          v-model:checked="modeStore.config.showSolutions"
          @change="handleConfigChange"
        >
          显示解析
        </Checkbox>

        <Checkbox
          v-model:checked="modeStore.config.showEncouragement"
          @change="handleConfigChange"
        >
          显示鼓励语
        </Checkbox>

        <Checkbox
          v-model:checked="modeStore.config.showGameElements"
          @change="handleConfigChange"
        >
          显示游戏化元素
        </Checkbox>

        <Divider />

        <Space>
          <Button @click="handleResetConfig">重置配置</Button>
          <Button @click="handleClearStorage">清除存储</Button>
        </Space>
      </Space>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  Card,
  Space,
  Alert,
  Descriptions,
  DescriptionsItem,
  Divider,
  Result,
  Progress,
  Tag,
  Checkbox,
  Button,
  message,
} from 'ant-design-vue';
import { BarChartOutlined } from '@ant-design/icons-vue';
import UserModeSwitch from '#/components/UserModeSwitch/index.vue';
import ModeContent from '#/components/ModeContent/index.vue';
import { useUserModeStore } from '#/store/modules/user-mode';

// ==================== State ====================

const modeStore = useUserModeStore();
const showDebugPanel = ref(true); // 开发时显示，生产环境应该隐藏

// ==================== Methods ====================

function handleModeChange(_mode: 'PARENT' | 'CHILD') {
  // 可以在这里添加额外的逻辑，如重新加载数据等
}

function handleConfigChange() {
  modeStore.saveToStorage();
  message.success('配置已更新');
}

function handleResetConfig() {
  modeStore.resetConfig();
  message.success('配置已重置');
}

function handleClearStorage() {
  modeStore.clearStorage();
  message.success('存储已清除');
}
</script>

<style scoped lang="less">
.mode-switch-demo {
  padding: 24px;

  .encouragement {
    text-align: center;

    .emoji {
      font-size: 48px;
      display: block;
      margin-bottom: 16px;
    }

    p {
      font-size: 16px;
      line-height: 1.6;
      margin: 8px 0;
    }
  }
}
</style>
