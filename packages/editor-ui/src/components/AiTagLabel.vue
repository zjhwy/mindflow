<template>
  <span class="ai-tag" :title="'AI 生成于 ' + formattedTime">AI</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ timestamp?: number }>();
const formattedTime = computed(() =>
  props.timestamp ? new Date(props.timestamp).toLocaleString() : '未知时间'
);
</script>

<style scoped>
.ai-tag {
  font-size: 10px; color: #85A2AD; background: rgba(133,162,173,0.1);
  padding: 1px 4px; border-radius: 3px; margin-left: 4px;
  vertical-align: middle; user-select: none;
}
</style>
