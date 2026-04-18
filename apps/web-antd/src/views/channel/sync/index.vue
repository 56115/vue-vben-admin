<script setup lang="ts">
import { Card } from 'ant-design-vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const syncItems = [
  {
    name: '企微同步',
    icon: '💬',
    desc: '同步企业微信员工、客户、部门等数据',
    path: '/channel/sync/wecom',
  },
  {
    name: '会员同步',
    icon: '👤',
    desc: '同步零售会员数据',
    path: '/channel/sync/member',
  },
];

function goTo(path: string) {
  router.push(path);
}
</script>

<template>
  <div class="channel-sync-page p-6">
    <h1 class="text-2xl font-bold mb-6">数据同步</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card
        v-for="item in syncItems"
        :key="item.name"
        hoverable
        class="sync-card cursor-pointer"
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
.channel-sync-page {
  max-width: 1200px;
  margin: 0 auto;
}
.sync-card {
  transition: all 0.3s;
}
.sync-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}
</style>
