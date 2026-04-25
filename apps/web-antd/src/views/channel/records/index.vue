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
    desc: '查看同步任务执行记录',
    path: '/channel/records/tasks',
  },
];

function goTo(path: string) {
  router.push(path);
}
</script>

<template>
  <div class="channel-records-page p-6">
    <h1 class="mb-6 text-2xl font-bold">同步记录</h1>
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <div class="mt-1 text-sm text-gray-500">{{ item.desc }}</div>
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
  box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
  transform: translateY(-4px);
}
</style>
