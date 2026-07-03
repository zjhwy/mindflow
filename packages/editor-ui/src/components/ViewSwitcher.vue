<template>
  <div class="view-switcher">
    <button
      v-for="v in views"
      :key="v.value"
      class="view-btn"
      :class="{ active: currentView === v.value }"
      @click="$emit('change', v.value)"
    >{{ v.label }}</button>
  </div>
</template>

<script setup lang="ts">
import { ViewMode } from '@mindflow/shared';
defineProps<{ currentView: string }>();
defineEmits<{ change: [view: string] }>();

const views = [
  { label: '树图', value: ViewMode.CANVAS },
  { label: '大纲', value: ViewMode.OUTLINE },
  { label: '甘特图', value: ViewMode.GANTT },
  { label: '日历', value: ViewMode.CALENDAR },
  { label: '看板', value: ViewMode.KANBAN },
];
</script>

<style scoped>
.view-switcher { display: flex; gap: 2px; background: var(--bg-module); border-radius: var(--radius-sm); padding: 2px; }
.view-btn { border: none; background: none; padding: 4px 10px; border-radius: 4px; font-size: var(--font-size-sm); color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); }
.view-btn.active { background: #fff; color: var(--color-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
</style>
