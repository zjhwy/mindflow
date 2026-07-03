<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <button class="tb-btn" title="新建" @click="$emit('new')">+ 新建</button>
      <button class="tb-btn" :disabled="!isDirty" title="保存" @click="$emit('save')">
        {{ isSaving ? '⏳' : '💾' }} {{ isSaving ? '保存中...' : '保存' }}
      </button>
      <span class="tb-divider" />
      <button class="tb-btn" :disabled="!canUndo" title="撤回 (Ctrl+Z)" @click="$emit('undo')">↩</button>
      <button class="tb-btn" :disabled="!canRedo" title="重做 (Ctrl+Shift+Z)" @click="$emit('redo')">↪</button>
      <span class="tb-divider" />
      <button class="tb-btn" title="导出" @click="showExportMenu = !showExportMenu">⬇ 导出</button>
      <button class="tb-btn" title="导入" @click="$emit('import')">⬆ 导入</button>
      <div v-if="showExportMenu" class="export-dropdown">
        <button class="export-item" @click="$emit('export-markdown'); showExportMenu = false">📝 Markdown</button>
        <button class="export-item" @click="$emit('export-json'); showExportMenu = false">📦 JSON</button>
        <div class="export-divider" />
        <button class="export-item" @click="$emit('export-image', 'png'); showExportMenu = false">🖼 PNG 图片</button>
        <button class="export-item" @click="$emit('export-image', 'svg'); showExportMenu = false">📐 SVG 矢量图</button>
      </div>

      <!-- 布局切换 -->
      <span class="tb-divider" />
      <select class="tb-select" :value="currentLayout" @change="$emit('layout-change', ($event.target as any).value)" title="切换布局">
        <option value="logic-right">→ 逻辑图</option>
        <option value="logic-left">← 左侧图</option>
        <option value="org-structure">⬇ 组织架构</option>
        <option value="timeline">→ 时间线</option>
      </select>
    </div>

    <div class="toolbar-center">
      <input
        class="doc-name-input"
        :value="documentName"
        @change="$emit('update:documentName', ($event.target as any).value)"
        title="双击修改文档名称"
      />
      <span v-if="isDirty" class="dirty-dot" title="未保存">●</span>
    </div>

    <div class="toolbar-right">
      <ViewSwitcher :current-view="currentView" @change="(v: any) => $emit('view-change', v)" />
      <button class="tb-btn" @click="theme.toggleDarkMode()" title="切换主题">
        {{ theme.isDarkMode ? '☀' : '☆' }}
      </button>
      <button class="tb-btn" @click="router.push('/settings')" title="设置">⚙</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useThemeStore } from '../stores/theme.store';
import ViewSwitcher from './ViewSwitcher.vue';

defineProps<{
  documentName: string;
  isDirty: boolean;
  isSaving: boolean;
  statusMessage: string;
  currentView: string;
  canUndo: boolean;
  canRedo: boolean;
  currentLayout?: string;
}>();

defineEmits<{
  save: [];
  new: [];
  undo: [];
  redo: [];
  import: [];
  'export-markdown': [];
  'export-json': [];
  'export-image': [format: string];
  'view-change': [view: string];
  'layout-change': [layout: string];
}>();

const router = useRouter();
const theme = useThemeStore();
const showExportMenu = ref(false);
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 8px;
  border-bottom: 1px solid var(--border-default);
  background: var(--bg-module);
  gap: 4px;
}
.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 4px; }
.toolbar-center { flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; }
.tb-btn {
  padding: 4px 10px;
  border: none;
  background: transparent;
  font-size: 13px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
}
.tb-btn:hover:not(:disabled) { background: var(--bg-secondary); color: var(--text-primary); }
.tb-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tb-divider { width: 1px; height: 20px; background: var(--border-default); margin: 0 4px; }
.tb-select {
  padding: 3px 8px;
  border: 1px solid #d9d9d9;
  border-radius: var(--radius-sm);
  font-size: 12px;
  background: #fff;
  color: var(--text-secondary);
  cursor: pointer;
}
.tb-select:focus { border-color: #1677ff; outline: none; }
.doc-name-input {
  border: none;
  background: transparent;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  width: 180px;
  padding: 2px 4px;
  border-radius: 2px;
}
.doc-name-input:hover, .doc-name-input:focus { background: var(--bg-secondary); outline: none; }
.dirty-dot { color: var(--color-warning, #faad14); font-size: 18px; line-height: 1; }

.export-dropdown {
  position: absolute; top: 100%; left: 120px;
  background: #fff; border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  padding: 4px 0; min-width: 160px; z-index: 100;
}
.export-item {
  display: block; width: 100%; padding: 6px 14px;
  border: none; background: transparent;
  font-size: 13px; text-align: left; cursor: pointer;
}
.export-item:hover { background: #f0f5ff; }
.export-divider { height: 1px; background: #e8e8e8; margin: 4px 0; }
</style>
