import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { mockPlugin } from './vite-plugin-mock';

export default defineConfig({
  plugins: [vue(), mockPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@mindflow/editor-core': resolve(__dirname, '../editor-core/src'),
      '@mindflow/shared': resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          core: ['@mindflow/editor-core'],
        },
      },
    },
  },
});
