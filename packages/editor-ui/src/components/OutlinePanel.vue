<template>
  <div class="op-panel">
    <div class="op-header">
      <h4>大纲视图</h4>
      <button class="op-btn" @click="unfoldAll" title="全部展开">⊞</button>
      <button class="op-btn" @click="foldAll" title="全部折叠">⊟</button>
    </div>
    <div class="op-list" ref="listRef">
      <div
        v-for="line in visibleLines"
        :key="line.lineId"
        :class="['op-item', { 'op-selected': line.lineId === selectedId }]"
        :style="{ paddingLeft: line.depth * 16 + 8 + 'px' }"
        @click="$emit('select', line.lineId)"
      >
        <span class="op-fold" v-if="line.childrenLineIds?.length" @click.stop="$emit('toggle-fold', line.lineId)">
          {{ line.collapsed ? '▸' : '▾' }}
        </span>
        <span v-else class="op-fold-placeholder" />
        <span class="op-text" :title="line.text">{{ line.text }}</span>
        <span v-if="line.metadata?.priority" class="op-priority" :class="'p' + line.metadata.priority">
          P{{ line.metadata.priority }}
        </span>
      </div>
      <div v-if="visibleLines.length === 0" class="op-empty">暂无节点</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { InnerLine } from '@mindflow/shared';

const props = defineProps<{
  lines: InnerLine[];
  selectedId: string | null;
}>();

const emit = defineEmits<{
  select: [lineId: string];
  'toggle-fold': [lineId: string];
  'fold-all': [];
  'unfold-all': [];
}>();

/** 折叠筛选后的可见行 */
const visibleLines = computed<InnerLine[]>(() => {
  const result: InnerLine[] = [];
  let skipDepth: number | null = null;
  for (const line of props.lines) {
    if (skipDepth !== null && line.depth > skipDepth) continue;
    if (skipDepth !== null && line.depth <= skipDepth) skipDepth = null;
    result.push(line);
    if (line.collapsed) skipDepth = line.depth;
  }
  return result;
});

function foldAll() { emit('fold-all'); }
function unfoldAll() { emit('unfold-all'); }
</script>

<style scoped>
.op-panel {
  display: flex; flex-direction: column;
  width: 240px; height: 100%;
  background: var(--bg-module, #fff);
  border-left: 1px solid var(--border-default, #e8e8e8);
}
.op-header {
  display: flex; align-items: center; gap: 4px;
  padding: 8px 12px; border-bottom: 1px solid var(--border-default, #e8e8e8);
}
.op-header h4 { margin: 0; font-size: 13px; flex: 1; }
.op-btn {
  width: 24px; height: 24px; border: 1px solid #d9d9d9;
  border-radius: 4px; background: #fff; font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.op-btn:hover { border-color: #1677ff; }
.op-list { flex: 1; overflow-y: auto; padding: 4px 0; }
.op-item {
  display: flex; align-items: center;
  padding: 3px 8px; cursor: pointer; font-size: 13px;
  white-space: nowrap;
}
.op-item:hover { background: var(--bg-secondary, rgba(0,0,0,0.04)); }
.op-selected { background: rgba(22,119,255,0.08) !important; }
.op-fold { width: 16px; flex-shrink: 0; color: #999; font-size: 11px; }
.op-fold:hover { color: #1677ff; }
.op-fold-placeholder { width: 16px; flex-shrink: 0; }
.op-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.op-empty { padding: 24px; text-align: center; color: #999; font-size: 13px; }
.op-priority { font-size: 10px; padding: 0 4px; border-radius: 2px; margin-left: 4px; flex-shrink: 0; }
.p1 { background: #e6fffb; color: #13c2c2; }
.p2 { background: #fff7e6; color: #fa8c16; }
.p3 { background: #fff2f0; color: #f5222d; }
</style>
