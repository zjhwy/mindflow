<template>
  <div class="watermark-layer" :style="{ opacity: opacity }">
    <span v-for="i in repeatCount" :key="i" class="watermark-text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
const props = withDefaults(defineProps<{
  username?: string;
  deviceId?: string;
  opacity?: number;
  repeatCount?: number;
}>(), { username: 'User', deviceId: '-', opacity: 0.08, repeatCount: 80 });

const text = computed(() => `${props.username} ${new Date().toLocaleDateString()} ${props.deviceId}`);
</script>

<style scoped>
.watermark-layer {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none; z-index: 9999; overflow: hidden;
  display: flex; flex-wrap: wrap; align-content: flex-start;
  transform: rotate(-45deg); user-select: none;
}
.watermark-text {
  font-size: 10px; line-height: 16px; color: var(--text-placeholder);
  padding: 24px 48px; white-space: nowrap;
}
</style>
