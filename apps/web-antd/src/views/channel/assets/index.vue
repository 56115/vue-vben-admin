<script setup lang="ts">
import { Card } from 'ant-design-vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const assetItems = [
  {
    name: '员工管理',
    icon: '👥',
    desc: '管理同步过来的企微员工数据',
    path: '/channel/assets/users',
  },
  {
    name: '群聊管理',
    icon: '💬',
    desc: '管理同步过来的企微群聊（开发中）',
    path: '/channel/assets/groups',
  },
];

function goTo(path: string) {
  router.push(path);
}
</script>

<template>
  <div class="channel-assets-page p-6">
    <h1 class="text-2xl font-bold mb-6">渠道资产</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card
        v-for="item in assetItems"
        :key="item.name"
        hoverable
        class="asset-card cursor-pointer"
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
.channel-assets-page {
  max-width: 1200px;
  margin: 0 auto;
}
.asset-card {
  transition: all 0.3s;
}
.asset-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}
</style>
