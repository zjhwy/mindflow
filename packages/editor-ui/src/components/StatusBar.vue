<template>
  <div class="statusbar">
    <div class="statusbar-left">
      <span>{{ totalLines }} 节点 (显示 {{ totalVisible }})</span>
      <span v-if="hasUnsaved" class="unsaved">● 未保存</span>
    </div>
    <div class="statusbar-right">
      <span>{{ status }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  totalLines: number;
  totalVisible: number;
  hasUnsaved: boolean;
  status: string;
}>();
</script>

<style scoped>
.statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 22px;
  padding: 0 12px;
  font-size: 11px;
  color: var(--text-secondary);
  border-top: 1px solid var(--border-default);
  background: var(--bg-module);
}
.statusbar-left { display: flex; gap: 12px; }
.statusbar-right { font-size: 11px; }
.unsaved { color: var(--color-warning, #faad14); }
</style>
