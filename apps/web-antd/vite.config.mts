import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        host: '0.0.0.0',
        port: 5666,
        strictPort: false, // 如果端口被占用则自动切换
        // SPA 回退支持 - 所有路由返回 index.html
        historyApiFallback: {
          rewrites: [
            { from: /^\/api/, to: '/api' },
            { from: /./, to: '/index.html' },
          ],
        },
        proxy: {
          '/api': {
            changeOrigin: true,
            // 代理到后端 API 服务
            target: process.env.VITE_API_URL || 'http://127.0.0.1:5100',
            ws: true,
          },
        },
      },
    },
  };
});
