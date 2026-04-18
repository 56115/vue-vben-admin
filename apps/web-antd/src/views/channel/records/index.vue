<script setup lang="ts">
import { Card } from 'ant-design-vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const recordItems = [
  {
    name: '统计分析',
    icon: '📊',
    desc: '查看各渠道同步数据统计',
    path: '/channel/records/statistics',
  },
  {
    name: '任务记录',
    icon: '📋',
    desc: '查看同步任务执行记录（开发中）',
    path: '/channel/records/tasks',
  },
];

function goTo(path: string) {
  router.push(path);
}
</script>

<template>
  <div class="channel-records-page p-6">
    <h1 class="text-2xl font-bold mb-6">同步记录</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card
        v-for="item in recordItems"
        :key="item.name"
        hoverable
        class="record-card cursor-pointer"
        @click="goTo(item.path)"
      >
        <div class="flex items-center gap-4">
          <span class="text-4xl">{{ item.icon }}</span>
          <div>
            <div class="text-lg font-semibold">{{ item.name }}</div>
            <div class="text-gray-500 text-sm mt-1">{{ item.desc }}</div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.channel-records-page {
  max-width: 1200px;
  margin: 0 auto;
}
.record-card {
  transition: all 0.3s;
}
.record-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}
</style>
