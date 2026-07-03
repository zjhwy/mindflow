<template>
  <Teleport to="body">
    <div v-if="visible" class="sb-overlay" @click.self="close">
      <div class="sb-panel">
        <div class="sb-input-wrap">
          <span class="sb-icon">🔍</span>
          <input
            ref="inputRef"
            v-model="query"
            class="sb-input"
            placeholder="搜索节点..."
            @keydown.escape="close"
            @keydown.enter.prevent="goToNext"
            @keydown.up.prevent="goToPrev"
            @keydown.down.prevent="goToNext"
          />
          <span class="sb-count" v-if="results.length">{{ currentIdx + 1 }}/{{ results.length }}</span>
        </div>
        <div class="sb-results" v-if="results.length && query">
          <div
            v-for="(item, i) in results"
            :key="item.lineId"
            :class="['sb-item', { active: i === currentIdx }]"
            @click="selectAndClose(item, i)"
          >
            <span class="sb-indent" :style="{ width: item.depth * 12 + 'px' }" />
            <span class="sb-text" v-html="highlight(item.text)" />
          </div>
        </div>
        <div class="sb-empty" v-else-if="query && results.length === 0">
          未找到匹配节点
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import type { InnerLine } from '@mindflow/shared';

const props = defineProps<{
  visible: boolean;
  lines: InnerLine[];
}>();

const emit = defineEmits<{
  close: [];
  'go-to': [lineId: string];
}>();

const query = ref('');
const currentIdx = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

const results = ref<InnerLine[]>([]);

function close() {
  emit('close');
  query.value = '';
  results.value = [];
  currentIdx.value = 0;
}

watch(() => props.visible, (v) => {
  if (v) {
    query.value = '';
    results.value = [];
    currentIdx.value = 0;
    nextTick(() => inputRef.value?.focus());
  }
});

watch(query, (q) => {
  if (!q.trim()) {
    results.value = [];
    return;
  }
  const lower = q.toLowerCase();
  results.value = props.lines.filter(l => l.text.toLowerCase().includes(lower));
  currentIdx.value = 0;
});

function goToNext() {
  if (results.value.length === 0) return;
  currentIdx.value = (currentIdx.value + 1) % results.value.length;
  emit('go-to', results.value[currentIdx.value].lineId);
}

function goToPrev() {
  if (results.value.length === 0) return;
  currentIdx.value = (currentIdx.value - 1 + results.value.length) % results.value.length;
  emit('go-to', results.value[currentIdx.value].lineId);
}

function selectAndClose(item: InnerLine, idx: number) {
  currentIdx.value = idx;
  emit('go-to', item.lineId);
  close();
}

function highlight(text: string): string {
  if (!query.value.trim()) return text;
  const escaped = query.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'gi');
  return text.replace(re, '<mark>$1</mark>');
}
</script>

<style scoped>
.sb-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; justify-content: center; padding-top: 80px;
  background: rgba(0,0,0,0.2);
}
.sb-panel {
  width: 420px; max-height: 320px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 6px 30px rgba(0,0,0,0.18);
  overflow: hidden;
  display: flex; flex-direction: column;
}
.sb-input-wrap {
  display: flex; align-items: center;
  padding: 10px 14px; border-bottom: 1px solid #f0f0f0; gap: 8px;
}
.sb-icon { font-size: 14px; flex-shrink: 0; }
.sb-input {
  flex: 1; border: none; outline: none; font-size: 14px;
  background: transparent;
}
.sb-count { font-size: 12px; color: #999; flex-shrink: 0; }
.sb-results { flex: 1; overflow-y: auto; }
.sb-item {
  display: flex; align-items: center;
  padding: 6px 14px; cursor: pointer; font-size: 13px;
}
.sb-item:hover, .sb-item.active { background: #e6f4ff; }
.sb-indent { flex-shrink: 0; }
.sb-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-text :deep(mark) { background: #fff1b8; border-radius: 2px; padding: 0 1px; }
.sb-empty { padding: 24px; text-align: center; color: #999; font-size: 13px; }
</style>
