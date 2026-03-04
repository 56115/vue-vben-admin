import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        host: '0.0.0.0',
        port: 5667,
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
            // 代理到后端 API 服务 (测试环境使用 5100)
            target: process.env.VITE_API_URL || 'http://localhost:5100',
            ws: true,
          },
        },
      },
    },
  };
});
