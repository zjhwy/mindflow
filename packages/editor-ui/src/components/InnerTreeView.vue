<template>
  <div class="inner-tree" ref="treeRef" @keydown="handleKeydown" tabindex="0">
    <div
      v-for="line in lines"
      :key="line.lineId"
      :class="[
        'tree-node',
        { selected: line.lineId === selectedId, collapsed: line.collapsed }
      ]"
      :style="{ paddingLeft: line.depth * 24 + 'px' }"
      @click="selectNode(line.lineId)"
      @contextmenu.prevent.stop="selectNode(line.lineId); $emit('contextmenu', $event)"
    >
      <!-- 折叠图标 -->
      <FoldIcon
        v-if="line.childrenLineIds.length > 0"
        :collapsed="line.collapsed"
        @click="$emit('toggle-fold', line.lineId)"
      />
      <span v-else class="fold-icon-placeholder" />

      <!-- 节点文本 -->
      <span class="node-text" @dblclick="startEdit(line)">{{ line.text }}</span>
      <AiTagLabel
        v-if="line.metadata?.isAiGenerated"
        :timestamp="line.metadata?.aiGenerateTime"
      />
      <span v-if="line.metadata?.priority" class="priority-badge" :class="`priority-${line.metadata.priority}`">
        P{{ line.metadata.priority }}
      </span>

      <!-- 标签 -->
      <span
        v-for="tag in line.metadata?.tags ?? []"
        :key="tag"
        class="node-tag"
      >{{ tag }}</span>
    </div>

    <!-- 内联编辑框 -->
    <input
      v-if="editing"
      ref="editInput"
      v-model="editText"
      class="inline-editor"
      :style="editStyle"
      @blur="finishEdit"
      @keydown.enter.prevent="finishEdit"
      @keydown.escape.prevent="cancelEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from 'vue';
import type { InnerLine } from '@mindflow/shared';
import FoldIcon from './FoldIcon.vue';
import AiTagLabel from './AiTagLabel.vue';

const props = defineProps<{
  lines: InnerLine[];
  selectedId: string | null;
}>();

const emit = defineEmits<{
  select: [lineId: string];
  edit: [lineId: string, text: string];
  delete: [lineId: string];
  indent: [lineId: string];
  outdent: [lineId: string];
  'toggle-fold': [lineId: string];
  contextmenu: [event: MouseEvent];
}>();

const treeRef = ref<HTMLElement | null>(null);
const editing = ref(false);
const editLineId = ref('');
const editText = ref('');
const editInput = ref<HTMLInputElement | null>(null);

const editStyle = computed(() => {
  if (!editing.value || !treeRef.value) return {};
  const node = treeRef.value.querySelector('.selected') as HTMLElement | null;
  if (!node) return {};
  const rect = node.getBoundingClientRect();
  const container = treeRef.value.getBoundingClientRect();
  return {
    left: rect.left - container.left + 18 + 'px',
    top: rect.top - container.top + 'px',
    width: '200px',
  };
});

function selectNode(lineId: string) {
  emit('select', lineId);
}

function startEdit(line: InnerLine) {
  editLineId.value = line.lineId;
  editText.value = line.text;
  editing.value = true;
  nextTick(() => editInput.value?.focus());
}

function finishEdit() {
  if (editing.value) {
    emit('edit', editLineId.value, editText.value);
  }
  editing.value = false;
  editLineId.value = '';
}

function cancelEdit() {
  editing.value = false;
  editLineId.value = '';
}

function handleKeydown(e: KeyboardEvent) {
  if (editing.value) return;

  const lineId = props.selectedId;
  if (!lineId) return;

  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    emit('delete', lineId);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    startEdit(lines.find((l) => l.lineId === lineId) ?? lines[0]);
  }
}
</script>

<style scoped>
.inner-tree { outline: none; padding: 8px 0; min-height: 200px; position: relative; }
.tree-node {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  margin: 1px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
  position: relative;
}
.tree-node:hover { background: var(--bg-secondary, rgba(0,0,0,0.04)); }
.tree-node.selected { background: rgba(22,119,255,0.1); border: 1px solid var(--color-accent, #1677ff); }
.tree-node.collapsed .node-text { color: var(--text-placeholder, #ccc); }

.fold-icon-placeholder { width: 22px; flex-shrink: 0; }

.node-text { font-size: 14px; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tree-node.selected .node-text { font-weight: 500; }

.priority-badge {
  font-size: 10px;
  padding: 0 4px;
  border-radius: 2px;
  margin-left: 6px;
  flex-shrink: 0;
}
.priority-1 { background: #e6fffb; color: #13c2c2; }
.priority-2 { background: #fff7e6; color: #fa8c16; }
.priority-3 { background: #fff2f0; color: #f5222d; }

.node-tag {
  font-size: 10px;
  padding: 0 6px;
  border-radius: 10px;
  margin-left: 4px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.inline-editor {
  position: absolute;
  padding: 2px 6px;
  border: 2px solid var(--color-accent, #1677ff);
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  background: var(--bg-module);
  z-index: var(--z-index-dropdown, 1000);
}
</style>
