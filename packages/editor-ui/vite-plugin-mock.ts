/**
 * Vite 本地 Mock 插件
 * 在开发模式下拦截 /api/* 请求，返回模拟数据
 * 无需启动后端服务器即可进行前端开发调试
 */
import type { Plugin, ViteDevServer } from 'vite';

export function mockPlugin(): Plugin {
  return {
    name: 'vite-plugin-local-mock',
    apply: 'serve', // 仅在 dev server 模式下生效

    configureServer(server: ViteDevServer) {
      // 在 Vite 内置中间件之前拦截 API 请求
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        try {
          // 动态导入 handlers（支持 HMR）
          const { dispatch } = await server.ssrLoadModule('/src/mock/handlers.ts');
          const result = await dispatch(req, res);

          if (result) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } else {
            next();
          }
        } catch (err) {
          console.error('[mock] 处理请求失败:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            code: 500,
            message: 'Mock 内部错误',
            data: null,
            requestId: 'mock_err',
            timestamp: Date.now(),
          }));
        }
      });
    },
  };
}
