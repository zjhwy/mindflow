<template>
  <div class="editor-container" ref="containerRef">
    <Toolbar
      :document-name="mindmap.documentName"
      :is-dirty="mindmap.isDirty"
      :is-saving="mindmap.isSaving"
      :status-message="mindmap.statusMessage"
      :current-view="mindmap.currentView"
      :can-undo="mindmap.canUndo"
      :can-redo="mindmap.canRedo"
      :current-layout="mindmap.currentLayout"
      @save="handleSave"
      @new="handleNew"
      @undo="mindmap.undo()"
      @redo="mindmap.redo()"
      @export-markdown="handleExportMarkdown"
      @export-json="handleExportJSON"
      @export-image="(fmt: string) => handleExportImage(fmt as 'png' | 'svg')"
      @import="handleImport"
      @view-change="mindmap.setView"
      @layout-change="(l: string) => mindmap.setLayout(l as any)"
    />

    <div class="editor-body">
      <!-- 主画布 -->
      <div class="editor-canvas" ref="canvasRef">
        <div v-if="mindmap.totalLines === 0" class="editor-empty">
          <p>空白导图 — 按 Enter 添加根节点</p>
          <button class="btn-primary" @click="addRootNode">创建根节点</button>
        </div>

        <!-- SVG 思维导图画布 -->
        <MindMapCanvas
          v-else-if="mindmap.currentView === 'canvas'"
          ref="canvasCmpRef"
          :lines="mindmap.lines"
          :selected-id="mindmap.selectedLineId"
          :layout-type="mindmap.currentLayout"
          @select="mindmap.selectLine"
          @edit="handleEditNode"
          @add-child="handleAddChild"
          @contextmenu="onNodeContextMenu"
          @toggle-fold="mindmap.toggleFold"
          @update-selected-ids="(ids: string[]) => mindmap.setSelectedIds(ids)"
          @move-node="handleMoveNode"
          @connect-nodes="handleConnectNodes"
          @reconnect-edge="handleReconnectEdge"
          @delete-edge="handleDeleteEdge"
          @update-edge-style="handleUpdateEdgeStyle"
          @resize-node="handleResizeNode"
        />

        <!-- 大纲文本视图 -->
        <InnerTreeView
          v-else-if="mindmap.currentView === 'outline'"
          :lines="mindmap.visibleLines"
          :selected-id="mindmap.selectedLineId"
          @select="mindmap.selectLine"
          @edit="handleEditNode"
          @delete="mindmap.deleteLine"
          @indent="mindmap.indentLine"
          @outdent="mindmap.outdentLine"
          @toggle-fold="mindmap.toggleFold"
          @contextmenu.prevent="onTreeContextMenu"
        />
      </div>

      <!-- 右侧面板 -->
      <aside class="editor-panel" v-if="mindmap.selectedLine">
        <!-- 标签切换 -->
        <div class="panel-tabs">
          <button :class="{ active: panelTab === 'props' }" @click="panelTab = 'props'">属性</button>
          <button :class="{ active: panelTab === 'style' }" @click="panelTab = 'style'">样式</button>
          <button :class="{ active: panelTab === 'shape' }" @click="panelTab = 'shape'">形状</button>
        </div>

        <template v-if="panelTab === 'props'">
          <div class="panel-field">
            <label>文本</label>
            <textarea
              :value="mindmap.selectedLine.text"
              @input="handleTextChange"
              rows="3"
            />
          </div>
          <div class="panel-field">
            <label>层级: {{ mindmap.selectedLine.depth }}</label>
          </div>
          <div class="panel-field">
            <label>优先度</label>
            <select :value="mindmap.selectedLine.metadata?.priority ?? 0" @change="handlePriorityChange">
              <option :value="0">无</option>
              <option :value="1">低</option>
              <option :value="2">中</option>
              <option :value="3">高</option>
            </select>
          </div>
          <div class="panel-actions">
            <button class="btn-sm" @click="mindmap.indentLine(mindmap.selectedLine!.lineId)">缩进</button>
            <button class="btn-sm" @click="mindmap.outdentLine(mindmap.selectedLine!.lineId)">减少缩进</button>
            <button class="btn-sm btn-danger" @click="mindmap.deleteLine(mindmap.selectedLine!.lineId)">删除</button>
          </div>
        </template>

        <StylePanel
          v-else-if="panelTab === 'style'"
          :style="mindmap.selectedLine.metadata?.style"
          @update:style="handleStyleUpdate"
          @reset-style="handleStyleReset"
        />

        <div v-else-if="panelTab === 'shape'" class="panel-shape">
          <ShapePicker
            :current-shape-type="mindmap.selectedLine.metadata?.shapeType"
            @apply-shape="handleShapeApply"
            @reset-shape="handleShapeReset"
          />
        </div>
      </aside>
    </div>

    <StatusBar
      :total-lines="mindmap.totalLines"
      :total-visible="mindmap.visibleLines.length"
      :has-unsaved="mindmap.isDirty"
      :status="mindmap.statusMessage"
    />

    <!-- 水印层 -->
    <WatermarkLayer
      v-if="auth.user"
      :username="auth.user.nickname ?? auth.user.username"
      :device-id="deviceId"
      :opacity="0.06"
    />

    <!-- 安全扫描提示 -->
    <SecurityScanTip ref="securityTipRef" />

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="ctxVisible"
      :x="ctxX"
      :y="ctxY"
      :items="ctxItems"
      @close="ctxVisible = false"
    />

    <!-- 快捷键帮助 -->
    <KeyboardGuide ref="keyboardGuideRef" />

    <!-- 搜索栏 -->
    <SearchBar
      :visible="searchVisible"
      :lines="mindmap.lines"
      @close="searchVisible = false"
      @go-to="handleSearchGoTo"
    />

    <!-- AI 浮动控制台 -->
    <AiConsole
      ref="aiConsoleRef"
      @close="aiConsoleVisible = false"
      @generate-mindmap="handleAiGenerate"
      @modify-mindmap="handleAiModify"
      @apply-style="handleAiStyle"
    />

    <!-- 模板市场 -->
    <TemplateMarket
      :visible="templateMarketVisible"
      @close="templateMarketVisible = false"
      @select="handleTemplateSelect"
    />

    <!-- 图形库 -->
    <ShapeLibrary
      :visible="shapeLibraryVisible"
      @close="shapeLibraryVisible = false"
      @select="handleShapeSelect"
    />

    <!-- 画布上 AI 控制台入口按钮 -->
    <button
      v-if="!aiConsoleVisible && !aiConsoleRef?.minimized"
      class="ai-fab"
      title="AI 思维导图助手 (Ctrl+Space)"
      @click="aiConsoleRef?.open()"
    >🤖</button>

    <!-- 底部快捷工具栏 -->
    <div class="bottom-toolbar">
      <button class="toolbar-btn" @click="templateMarketVisible = true" title="模板市场">
        📋 模板
      </button>
      <button class="toolbar-btn" @click="shapeLibraryVisible = true" title="图形库">
        ⬡ 图形
      </button>
      <button class="toolbar-btn" @click="handleLayoutSwitch" title="布局切换">
        🔄 布局
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMindmapStore, useAuthStore, useSyncStore } from '@/stores';
import Toolbar from '@/components/Toolbar';
import InnerTreeView from '@/components/InnerTreeView';
import MindMapCanvas from '@/components/MindMapCanvas';
import StylePanel from '@/components/StylePanel';
import ShapePicker from '@/components/ShapePicker';
import AiConsole from '@/components/AiConsole';
import ContextMenu from '@/components/ContextMenu';
import type { MenuItem } from '@/components/ContextMenu';
import KeyboardGuide from '@/components/KeyboardGuide';
import SearchBar from '@/components/SearchBar';
import StatusBar from '@/components/StatusBar';
import WatermarkLayer from '@/components/WatermarkLayer';
import SecurityScanTip from '@/components/SecurityScanTip';
import TemplateMarket from '@/components/TemplateMarket.vue';
import ShapeLibrary from '@/components/ShapeLibrary.vue';
import { useKeyboard } from '@/composables/useKeyboard';
import { exportMarkdown, exportJSON, parseMarkdown, parseJSON, downloadFile, readFileAsText } from '@/composables/useExport';
import { api } from '@/api/client';
import type { LineStyle, WpsShapeType } from '@mindflow/shared';

const route = useRoute();
const mindmap = useMindmapStore();
const auth = useAuthStore();
const sync = useSyncStore();
const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLElement | null>(null);
const canvasCmpRef = ref<InstanceType<typeof MindMapCanvas> | null>(null);
const securityTipRef = ref<InstanceType<typeof SecurityScanTip> | null>(null);
const keyboardGuideRef = ref<InstanceType<typeof KeyboardGuide> | null>(null);

// 右侧面板 Tab
const panelTab = ref<'props' | 'style' | 'shape'>('props');

// 右键菜单
const ctxVisible = ref(false);
const ctxX = ref(0);
const ctxY = ref(0);
const ctxLineId = ref<string | null>(null);

// 搜索
const searchVisible = ref(false);

function handleSearchGoTo(lineId: string) {
  mindmap.selectLine(lineId);
  mindmap.setStatus(`已定位到节点`);
}

const deviceId = computed(() => {
  let id = localStorage.getItem('wm-device-id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem('wm-device-id', id);
  }
  return id;
});

// 键盘快捷键（Ctrl+Z 撤回、Ctrl+Shift+Z 重做、Tab 缩进、方向键导航等）
useKeyboard();

// 右键菜单项
const ctxItems = computed<MenuItem[]>(() => {
  if (!ctxLineId.value) return [];
  const line = mindmap.lines.find(l => l.lineId === ctxLineId.value);
  if (!line) return [];
  return [
    { key: 'add-child', label: '添加子节点', icon: '＋', shortcut: 'Enter', action: () => handleAddChild(ctxLineId.value!) },
    { key: 'add-sibling', label: '添加同级节点', icon: '↘', action: () => handleAddSibling(ctxLineId.value!) },
    { key: 'div1', label: '────────', action: () => {}, disabled: true },
    { key: 'edit', label: '编辑', icon: '✎', shortcut: '双击', action: () => { /* 双击触发 */ } },
    { key: 'indent', label: '缩进', icon: '→', shortcut: 'Tab', action: () => mindmap.indentLine(ctxLineId.value!), disabled: line.depth === 0 },
    { key: 'outdent', label: '减少缩进', icon: '←', shortcut: 'Shift+Tab', action: () => mindmap.outdentLine(ctxLineId.value!), disabled: line.depth <= 1 },
    { key: 'div2', label: '────────', action: () => {}, disabled: true },
    { key: 'div3', label: '导出当前节点为图片', icon: '📷', action: () => handleExportImage('png') },
    { key: 'delete', label: '删除节点', icon: '✕', shortcut: 'Del', danger: true, action: () => mindmap.deleteLine(ctxLineId.value!) },
  ];
});

function onNodeContextMenu(payload: { lineId: string; x: number; y: number }) {
  ctxLineId.value = payload.lineId;
  ctxX.value = payload.x;
  ctxY.value = payload.y;
  ctxVisible.value = true;
}

function onTreeContextMenu(e: MouseEvent) {
  if (mindmap.selectedLineId) {
    ctxLineId.value = mindmap.selectedLineId;
    ctxX.value = e.clientX;
    ctxY.value = e.clientY;
    ctxVisible.value = true;
  }
}

function handleAddSibling(lineId: string) {
  const idx = mindmap.lines.findIndex(l => l.lineId === lineId);
  if (idx < 0) return;
  const depth = mindmap.lines[idx].depth;
  let insertAt = idx + 1;
  while (insertAt < mindmap.lines.length && mindmap.lines[insertAt].depth > depth) {
    insertAt++;
  }
  mindmap.insertLine(insertAt, '新节点', depth);
}

// 节点移动
function handleMoveNode(lineId: string, newParentId: string | null, newDepth: number) {
  // 简单实现：通过缩进/减少缩进改变
  const line = mindmap.lines.find(l => l.lineId === lineId);
  if (!line) return;
  if (newDepth > line.depth) {
    mindmap.indentLine(lineId);
  } else if (newDepth < line.depth) {
    mindmap.outdentLine(lineId);
  }
}

// 连接点系统：拖拽锚点创建连线
function handleConnectNodes(payload: { fromLineId: string; fromAnchorIdx: number; toLineId: string; toAnchorIdx: number }) {
  console.log('[EditorView] connect-nodes:', payload);
  // 将 toLineId 作为 fromLineId 的子节点添加
  mindmap.moveLineAsChild(payload.toLineId, payload.fromLineId);
  mindmap.setStatus(`已连接节点`);
}

// 连线编辑：拖拽手柄重新连接
function handleReconnectEdge(payload: { edgeKey: string; newFromLineId?: string; newFromAnchorIdx?: number; newToLineId?: string; newToAnchorIdx?: number }) {
  console.log('[EditorView] reconnect-edge:', payload);
  // 更新连线连接的节点
  const [oldFromId, oldToId] = payload.edgeKey.split('-');
  if (payload.newToLineId && payload.newToLineId !== oldToId) {
    mindmap.moveLineAsChild(oldToId, payload.newToLineId);
  }
  if (payload.newFromLineId && payload.newFromLineId !== oldFromId) {
    mindmap.moveLineAsChild(oldToId, payload.newFromLineId);
  }
  mindmap.setStatus('连线已重新连接');
}

// 连线右键菜单：删除连线（将子节点独立为一个新分支）
function handleDeleteEdge(edgeKey: string) {
  const [, toId] = edgeKey.split('-');
  // 使用引擎删除目标节点（会同时断开与父节点的连线）
  mindmap.deleteLine(toId);
  mindmap.setStatus('连线已删除');
}

// 连线右键菜单：更新样式（含连线类型切换）
function handleUpdateEdgeStyle(payload: { edgeKey: string; dashArray?: string; color?: string; pathType?: string }) {
  console.log('[EditorView] update-edge-style:', payload);
  const [fromId] = payload.edgeKey.split('-');
  const line = mindmap.lines.find(l => l.lineId === fromId);
  if (line) {
    if (!line.metadata) line.metadata = {};
    if (!line.metadata.edgeStyle) line.metadata.edgeStyle = {};
    if (payload.dashArray !== undefined) line.metadata.edgeStyle.dashArray = payload.dashArray;
    if (payload.color !== undefined) line.metadata.edgeStyle.color = payload.color;
    if (payload.pathType !== undefined) (line.metadata.edgeStyle as any).pathType = payload.pathType;
  }
  const labelMap: Record<string, string> = { curved: '曲线', elbow: '折线', straight: '直线' };
  mindmap.setStatus(payload.pathType ? `连线已切换为${labelMap[payload.pathType] || payload.pathType}` : '连线样式已更新');
}

// 节点 resize
function handleResizeNode(payload: { lineId: string; width: number; height: number }) {
  const line = mindmap.lines.find(l => l.lineId === payload.lineId);
  if (line?.metadata) {
    line.metadata.nodeSize = { width: payload.width, height: payload.height };
  }
  mindmap.setStatus('节点大小已更新');
}

// 样式更新
function handleStyleUpdate(style: Partial<LineStyle>) {
  if (!mindmap.selectedLineId) return;
  const line = mindmap.lines.find(l => l.lineId === mindmap.selectedLineId);
  if (line?.metadata) {
    line.metadata.style = { ...line.metadata.style, ...style };
    mindmap.setStatus('已更新样式');
  }
}

function handleStyleReset() {
  if (!mindmap.selectedLineId) return;
  const line = mindmap.lines.find(l => l.lineId === mindmap.selectedLineId);
  if (line?.metadata) {
    line.metadata.style = undefined;
    mindmap.setStatus('已重置样式');
  }
}

// 形状处理
function handleShapeApply(shapeId: WpsShapeType) {
  if (!mindmap.selectedLineId) return;
  const line = mindmap.lines.find(l => l.lineId === mindmap.selectedLineId);
  if (line?.metadata) {
    line.metadata.shapeType = shapeId;
    mindmap.setStatus(`已应用形状`);
  }
}

function handleShapeReset() {
  if (!mindmap.selectedLineId) return;
  const line = mindmap.lines.find(l => l.lineId === mindmap.selectedLineId);
  if (line?.metadata) {
    line.metadata.shapeType = undefined;
    mindmap.setStatus('已重置为默认形状');
  }
}

// 导入导出
function handleExportMarkdown() {
  const md = exportMarkdown();
  if (!md) { mindmap.setStatus('没有可导出的内容'); return; }
  downloadFile(md, `${mindmap.documentName}.md`, 'text/markdown');
  mindmap.setStatus('已导出 Markdown');
}

function handleExportJSON() {
  const json = exportJSON();
  downloadFile(json, `${mindmap.documentName}.json`, 'application/json');
  mindmap.setStatus('已导出 JSON');
}

function handleExportImage(format: 'png' | 'svg' = 'png') {
  const svgEl = canvasRef.value?.querySelector('.mm-svg') as SVGSVGElement | null;
  if (!svgEl) {
    mindmap.setStatus('画布未就绪，无法导出');
    return;
  }

  if (format === 'svg') {
    // 导出 SVG
    const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${mindmap.documentName}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    mindmap.setStatus('已导出 SVG');
  } else {
    // 导出 PNG
    const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
    // 设置白色背景
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', '#ffffff');
    svgClone.insertBefore(bgRect, svgClone.firstChild);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // 获取 SVG 实际渲染尺寸
      const bbox = svgEl.getBBox();
      const w = Math.max(800, bbox.width + bbox.x + 100);
      const h = Math.max(600, bbox.height + bbox.y + 100);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${mindmap.documentName}.png`;
          link.click();
          URL.revokeObjectURL(url);
          mindmap.setStatus('已导出 PNG');
        }
      }, 'image/png');
    };
    img.onerror = () => {
      mindmap.setStatus('PNG 导出失败（可能是 foreignObject 跨域）');
    };
    img.src = svgDataUrl;
  }
}

async function handleImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md,.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      if (file.name.endsWith('.json')) {
        const { name, lines } = parseJSON(text);
        mindmap.loadDocument(lines, undefined, name);
      } else {
        const lines = parseMarkdown(text);
        mindmap.loadDocument(lines, undefined, file.name.replace(/\.md$/, ''));
      }
      mindmap.setStatus(`已导入 ${file.name}`);
    } catch (err: any) {
      mindmap.setStatus(`导入失败: ${err.message}`);
    }
  };
  input.click();
}

// AI 控制台
const aiConsoleRef = ref<InstanceType<typeof AiConsole> | null>(null);
const aiConsoleVisible = ref(true);

// 模板市场
const templateMarketVisible = ref(false);

// 图形库
const shapeLibraryVisible = ref(false);

function handleAiGenerate(data: {
  lines: Array<{ text: string; depth: number; metadata?: any }>;
  layoutType: string;
  style: string;
  centerTopic: string;
}) {
  // 构建 lines：支持完整 AI 元数据
  const lines = data.lines.map((item) => {
    const lineId = 'ai_' + Math.random().toString(36).slice(2, 10);
    return {
      lineId,
      text: item.text,
      depth: item.depth,
      collapsed: false,
      parentLineId: null as string | null,
      childrenLineIds: [] as string[],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'ai',
        isAiGenerated: true,
        aiGenerateTime: Date.now(),
        // AI 富元数据透传（形状/优先级/标签/备注等）
        ...(item.metadata ?? {}),
      },
    };
  });

  mindmap.loadDocument(lines, undefined, data.centerTopic || 'AI生成的导图');

  // 布局映射（支持多种格式）
  const layoutMap: Record<string, string> = {
    'radial': 'logic-right',
    'symmetric': 'logic-right',
    'logic-right': 'logic-right',
    'logic-left': 'logic-left',
    'org-structure': 'org-structure',
    'orgchart': 'org-structure',
    'timeline': 'timeline',
    'fishbone': 'fishbone',
    'flowchart': 'org-structure',
    'gantt': 'timeline',
    'swimlane': 'logic-right',
    'sequence': 'timeline',
  };
  const targetLayout = layoutMap[data.layoutType] ?? 'logic-right';
  mindmap.setLayout(targetLayout as any);

  // 风格预设应用（深色/手绘/学术 → 应用到所有节点背景色/边框）
  applyStylePreset(lines, data.style);

  mindmap.setStatus(`AI 已生成 ${lines.length} 个节点`);
}

/** 应用风格预设到所有节点 */
function applyStylePreset(lines: any[], style: string) {
  if (!style || style === 'business') return;

  for (const line of lines) {
    if (!line.metadata) line.metadata = {};
    if (!line.metadata.style) line.metadata.style = {};

    switch (style) {
      case 'dark':
        line.metadata.style.backgroundColor = '#1E293B';
        line.metadata.style.color = '#f1f5f9';
        line.metadata.style.borderColor = '#334155';
        break;
      case 'handdrawn':
        line.metadata.style.backgroundColor = '#fffbf0';
        line.metadata.style.borderColor = '#d4a574';
        if (!line.metadata.edgeStyle) line.metadata.edgeStyle = {};
        line.metadata.edgeStyle.color = '#E07B39';
        break;
      case 'academic':
        line.metadata.style.backgroundColor = '#ffffff';
        line.metadata.style.color = '#000000';
        line.metadata.style.borderColor = '#000000';
        line.metadata.shapeType = 'rect';
        break;
    }
  }
}

function handleAiModify(instruction: string) {
  mindmap.setStatus(`AI修改指令: ${instruction}`);
}

function handleAiStyle(style: string) {
  mindmap.setStatus(`AI风格切换: ${style}`);
}

// 模板市场处理
function handleTemplateSelect(template: any) {
  // 导入模板数据
  const { templateToLines } = require('@/data/templates');
  const lines = templateToLines(template);
  mindmap.loadDocument(lines, undefined, template.name);
  mindmap.setLayout(template.layout);
  mindmap.setStatus(`已应用模板: ${template.name}`);
}

// 图形库处理
function handleShapeSelect(shape: any) {
  if (mindmap.selectedLineId) {
    const line = mindmap.lines.find((l) => l.lineId === mindmap.selectedLineId);
    if (line?.metadata) {
      line.metadata.shapeType = shape.id;
      mindmap.setStatus(`已应用形状: ${shape.name}`);
    }
  }
}

// 布局切换
function handleLayoutSwitch() {
  const layouts = ['logic-right', 'logic-left', 'org-structure', 'timeline', 'fishbone'];
  const currentIndex = layouts.indexOf(mindmap.currentLayout);
  const nextIndex = (currentIndex + 1) % layouts.length;
  mindmap.setLayout(layouts[nextIndex] as any);
  mindmap.setStatus(`已切换布局`);
}

onMounted(async () => {
  if (canvasRef.value) {
    mindmap.initEngine(canvasRef.value);
  }

  const fileId = route.params.fileId as string;
  if (fileId) {
    await loadDocument(fileId);
    sync.connect(fileId);
  }

  // Ctrl+F / Ctrl+S 全局快捷键
  document.addEventListener('keydown', onGlobalKeydown);
});

function onGlobalKeydown(e: KeyboardEvent) {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === 'f') {
    e.preventDefault();
    searchVisible.value = true;
  }
  if (ctrl && e.key === 's') {
    e.preventDefault();
    if (mindmap.isDirty) handleSave();
  }
}

onUnmounted(() => {
  mindmap.destroyEngine();
  sync.disconnect();
  document.removeEventListener('keydown', onGlobalKeydown);
});

async function loadDocument(fileId: string) {
  try {
    const result = await api.get<any>(`/documents/${fileId}`);
    if (result.code === 0 && result.data) {
      mindmap.loadDocument(
        result.data.linesData ?? [],
        fileId,
        result.data.name,
      );
    }
  } catch (err) {
    mindmap.setStatus('加载文档失败');
    console.error(err);
  }
}

async function handleSave() {
  mindmap.setSaving(true);
  try {
    const result = await api.put(`/documents/${mindmap.currentFileId || 'new'}`, {
      linesData: mindmap.lines,
      name: mindmap.documentName,
    });
    if (result.code === 0) {
      mindmap.markSaved();
    }
  } catch (err) {
    mindmap.setStatus('保存失败');
  } finally {
    mindmap.setSaving(false);
  }
}

function handleNew() {
  mindmap.clear();
}

function addRootNode() {
  mindmap.insertLine(0, '中心主题', 0);
}

function handleAddChild(parentId: string) {
  const parentIdx = mindmap.lines.findIndex((l) => l.lineId === parentId);
  if (parentIdx >= 0) {
    const parentDepth = mindmap.lines[parentIdx].depth;
    mindmap.insertLine(parentIdx + 1, '新节点', parentDepth + 1);
  }
}

function handleEditNode(lineId: string, text: string) {
  mindmap.updateLine(lineId, text);
}

function handleTextChange(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  if (mindmap.selectedLineId) {
    mindmap.updateLine(mindmap.selectedLineId, target.value);
  }
}

function handlePriorityChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  if (mindmap.selectedLineId) {
    const line = mindmap.lines.find((l) => l.lineId === mindmap.selectedLineId);
    if (line?.metadata) {
      line.metadata.priority = Number(target.value);
      mindmap.setStatus('已更新优先级');
    }
  }
}
</script>

<style scoped>
.editor-container { display: flex; flex-direction: column; height: 100vh; }
.editor-body { flex: 1; display: flex; overflow: hidden; }
.editor-canvas { flex: 1; overflow: auto; padding: 0; }
.editor-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-placeholder); gap: 16px; }

.editor-panel {
  width: 260px;
  border-left: 1px solid var(--border-default);
  padding: 16px;
  overflow-y: auto;
  background: var(--bg-module);
}
.editor-panel h4 { font-size: 14px; font-weight: 600; margin-bottom: 16px; }
.panel-field { margin-bottom: 12px; }
.panel-field label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.panel-field textarea,
.panel-field select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  font-size: 13px;
  resize: vertical;
  box-sizing: border-box;
}
.panel-actions { display: flex; gap: 8px; margin-top: 12px; }
.panel-tabs { display: flex; gap: 0; margin-bottom: 16px; border-bottom: 2px solid #e8e8e8; }
.panel-tabs button {
  flex: 1; padding: 8px 0; border: none; background: transparent;
  font-size: 13px; cursor: pointer; color: #666;
  border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s;
}
.panel-tabs button.active { color: #1677ff; border-bottom-color: #1677ff; }
.btn-sm { padding: 4px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--bg-module); font-size: 12px; cursor: pointer; }
.btn-sm:hover { border-color: var(--color-accent); color: var(--color-accent); }
.btn-danger { color: #ff4d4f; border-color: #ff4d4f; }
.btn-danger:hover { background: #fff2f0; }

.btn-primary {
  padding: 10px 24px;
  background: var(--color-accent, #1677ff);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  cursor: pointer;
}
.btn-primary:hover { opacity: 0.9; }

/* AI 浮动按钮 */
.ai-fab {
  position: fixed;
  bottom: 24px;
  right: 80px;
  z-index: 999;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #1677ff, #9254de);
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(22,119,255,0.3);
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-fab:hover { transform: scale(1.1); box-shadow: 0 6px 24px rgba(22,119,255,0.45); }

/* 底部快捷工具栏 */
.bottom-toolbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 998;
}
.toolbar-btn {
  padding: 6px 16px;
  border: 1px solid #e8e8e8;
  background: #fff;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}
.toolbar-btn:hover {
  border-color: #1677ff;
  color: #1677ff;
  background: #f0f5ff;
}
</style>
