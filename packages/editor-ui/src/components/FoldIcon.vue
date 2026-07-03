<template>
  <span class="fold-icon" :class="{ 'fold-icon--collapsed': collapsed }" @click="$emit('click')">
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path d="M4 2L8 6L4 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </span>
</template>

<script setup lang="ts">
defineProps<{ collapsed: boolean }>();
defineEmits<{ click: [] }>();
</script>

<style scoped>
.fold-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; cursor: pointer;
  color: var(--text-secondary); transition: transform var(--transition-fast);
}
.fold-icon--collapsed { transform: rotate(0deg); }
.fold-icon:not(.fold-icon--collapsed) { transform: rotate(90deg); }
.fold-icon:hover { color: var(--color-primary); }
</style>
