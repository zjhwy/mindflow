<template>
  <div class="app-root" :class="{ 'dark-mode': theme.isDarkMode }">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { useThemeStore } from './stores/theme.store';
const theme = useThemeStore();
</script>

<style>
/* 全局基础重置 */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
html, body, #app {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  font-size: var(--font-size-md, 14px);
  color: var(--text-primary, #1d1d1f);
  background: var(--bg-canvas, #ffffff);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 滚动条样式 */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--text-placeholder, #ccc); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-secondary, #999); }

/* 选区颜色 */
::selection { background: rgba(22, 119, 255, 0.2); }
</style>
