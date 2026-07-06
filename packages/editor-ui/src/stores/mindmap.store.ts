import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { InnerTreeEngine } from '@mindflow/editor-core';
import type { InnerLine, ViewMode, MindLayoutType, Connection, CreateConnectionDto, UpdateConnectionDto } from '@mindflow/shared';
import { api } from '@/api/client';

export const useMindmapStore = defineStore('mindmap', () => {
  // --- 引擎 ---
  const engine = ref<InnerTreeEngine | null>(null);

  // --- 文档 ---
  const currentFileId = ref<string>('');
  const documentName = ref<string>('未命名导图');
  const isDirty = ref(false);
  const isReadOnly = ref(false);

  // --- 视图 ---
  const currentView = ref<ViewMode>('canvas');
  const currentLayout = ref<MindLayoutType>('logic-right');

  // --- 选择 ---
  const selectedLineId = ref<string | null>(null);
  const selectedIds = ref<string[]>([]);

  // --- 保存状态 ---
  const lastSavedAt = ref<number>(0);
  const isSaving = ref(false);

  // --- 状态栏 ---
  const statusMessage = ref('就绪');

  // --- 视口动画 ---
  const viewportTransform = ref({ x: 0, y: 0, scale: 1 });
  const targetTransform = ref({ x: 0, y: 0, scale: 1 });
  const isAnimating = ref(false);

  // --- 连线系统 ---
  /** 当前文档的独立连线列表（非父子关系） */
  const connections = ref<Connection[]>([]);

  // ==================== Getters ====================

  const lines = computed<InnerLine[]>(() => engine.value?.getLines() ?? []);
  const totalLines = computed(() => lines.value.length);
  const visibleLines = computed<InnerLine[]>(() => engine.value?.renderVisibleLines() ?? []);
  const selectedLine = computed<InnerLine | null>(() =>
    selectedLineId.value ? lines.value.find((l) => l.lineId === selectedLineId.value) ?? null : null
  );
  const canUndo = computed(() => engine.value?.canUndo() ?? false);
  const canRedo = computed(() => engine.value?.canRedo() ?? false);

  // ==================== Actions: Engine ====================

  function initEngine(container: HTMLElement) {
    const eng = new InnerTreeEngine();
    eng.init(container, {
      layoutType: currentLayout.value,
      readOnly: isReadOnly.value,
      enableAutoSave: true,
      autoSaveInterval: 5000,
    });
    engine.value = eng;
    return eng;
  }

  function destroyEngine() {
    engine.value?.destroy();
    engine.value = null;
  }

  // ==================== Actions: CRUD ====================

  function insertLine(index: number, text: string, depth: number): InnerLine | null {
    const line = engine.value?.insertLine(index, text, depth);
    if (line) { isDirty.value = true; setStatus(`已插入节点: ${text}`); }
    return line ?? null;
  }

  function deleteLine(lineId: string): void {
    engine.value?.deleteLine(lineId);
    if (selectedLineId.value === lineId) selectedLineId.value = null;
    selectedIds.value = selectedIds.value.filter(id => id !== lineId);
    isDirty.value = true;
    setStatus('已删除节点');
  }

  /** 批量删除选中节点 */
  function deleteSelectedLines(): void {
    if (selectedIds.value.length === 0) return;
    // 按索引倒序删除，避免索引偏移
    const toDelete = [...selectedIds.value];
    selectedIds.value = [];
    selectedLineId.value = null;
    for (const id of toDelete) {
      engine.value?.deleteLine(id);
    }
    isDirty.value = true;
    setStatus(`已删除 ${toDelete.length} 个节点`);
  }

  function updateLine(lineId: string, text: string): void {
    engine.value?.updateLine(lineId, text);
    isDirty.value = true;
    setStatus('已更新节点');
  }

  function moveLine(lineId: string, newIndex: number): void {
    engine.value?.moveLine(lineId, newIndex);
    isDirty.value = true;
  }

  function indentLine(lineId: string): void {
    engine.value?.indent(lineId);
    isDirty.value = true;
  }

  function outdentLine(lineId: string): void {
    engine.value?.outdent(lineId);
    isDirty.value = true;
  }

  function toggleFold(lineId: string): void {
    engine.value?.toggleFold(lineId);
  }

  function foldAll(): void {
    engine.value?.foldAll();
  }

  function unfoldAll(): void {
    engine.value?.unfoldAll();
  }

  // ==================== Actions: Undo/Redo ====================

  function undo(): void {
    if (engine.value?.undo()) {
      isDirty.value = true;
      setStatus('已撤回');
    }
  }

  function redo(): void {
    if (engine.value?.redo()) {
      isDirty.value = true;
      setStatus('已重做');
    }
  }

  function selectLine(lineId: string | null): void {
    selectedLineId.value = lineId;
    if (lineId) {
      selectedIds.value = [lineId];
    }
  }

  function setSelectedIds(ids: string[]): void {
    selectedIds.value = ids;
  }

  // ==================== Actions: View ====================

  function setView(view: ViewMode): void {
    currentView.value = view;
  }

  function setLayout(layout: MindLayoutType): void {
    currentLayout.value = layout;
    setStatus(`已切换为 ${layout} 布局`);
  }

  // ==================== Actions: Save ====================

  function markSaved(): void {
    isDirty.value = false;
    lastSavedAt.value = Date.now();
    setStatus('已保存');
  }

  function setSaving(saving: boolean): void {
    isSaving.value = saving;
    if (saving) setStatus('保存中...');
  }

  // ==================== Actions: Utils ====================

  function setStatus(msg: string): void {
    statusMessage.value = msg;
  }

  function loadDocument(lines: InnerLine[], fileId?: string, name?: string): void {
    engine.value?.setLines(lines);
    if (fileId) currentFileId.value = fileId;
    if (name) documentName.value = name;
    isDirty.value = false;
    selectedLineId.value = null;
    selectedIds.value = [];
    setStatus(`已加载 ${lines.length} 个节点`);
  }

  function clear(): void {
    engine.value?.setLines([]);
    currentFileId.value = '';
    documentName.value = '未命名导图';
    isDirty.value = false;
    selectedLineId.value = null;
    selectedIds.value = [];
  }

  // ==================== Actions: Connections ====================

  /** 从后端加载文档的所有连线 */
  async function loadConnections(documentId: string): Promise<void> {
    if (!documentId) return;
    try {
      const res = await api.get<Connection[]>(`/documents/${documentId}/connections`);
      if (res.code === 200) {
        connections.value = res.data;
      }
    } catch {
      // 静默失败，连线不是核心功能
    }
  }

  /** 创建一条新连线 */
  async function addConnection(dto: CreateConnectionDto): Promise<Connection | null> {
    if (!currentFileId.value) return null;
    try {
      const res = await api.post<Connection>(`/documents/${currentFileId.value}/connections`, dto);
      if (res.code === 201 && res.data) {
        connections.value.push(res.data);
        isDirty.value = true;
        setStatus('已创建连线');
        return res.data;
      }
    } catch {
      setStatus('连线创建失败');
    }
    return null;
  }

  /** 更新连线样式/属性 */
  async function updateConnection(connectionId: string, dto: UpdateConnectionDto): Promise<void> {
    if (!currentFileId.value) return;
    try {
      const res = await api.put<Connection>(`/documents/${currentFileId.value}/connections/${connectionId}`, dto);
      if (res.code === 200 && res.data) {
        const idx = connections.value.findIndex(c => c.connectionId === connectionId);
        if (idx !== -1) connections.value[idx] = res.data;
        isDirty.value = true;
        setStatus('连线已更新');
      }
    } catch {
      setStatus('连线更新失败');
    }
  }

  /** 删除连线 */
  async function removeConnection(connectionId: string): Promise<void> {
    if (!currentFileId.value) return;
    try {
      const res = await api.delete(`/documents/${currentFileId.value}/connections/${connectionId}`);
      if (res.code === 200) {
        connections.value = connections.value.filter(c => c.connectionId !== connectionId);
        isDirty.value = true;
        setStatus('已删除连线');
      }
    } catch {
      setStatus('连线删除失败');
    }
  }

  /** 初始化/清空连线列表 */
  function setConnections(conns: Connection[]): void {
    connections.value = conns;
  }

  function clearConnections(): void {
    connections.value = [];
  }

  function moveLineAsChild(lineId: string, newParentId: string): void {
    const allLines = engine.value?.getLines();
    if (!allLines) return;
    const target = allLines.find(l => l.lineId === lineId);
    const newParent = allLines.find(l => l.lineId === newParentId);
    if (!target || !newParent) return;
    if (lineId === newParentId) return;

    // 防止循环引用：新父节点不能是目标的后代
    const isAncestor = (parentId: string | undefined, childId: string): boolean => {
      let current = allLines.find(l => l.lineId === parentId);
      while (current) {
        if (!current.parentLineId) return false;
        if (current.parentLineId === childId) return true;
        current = allLines.find(l => l.lineId === current!.parentLineId);
      }
      return false;
    };
    if (isAncestor(newParentId, lineId)) return;

    // 从旧父节点移除
    if (target.parentLineId) {
      const oldParent = allLines.find(l => l.lineId === target.parentLineId);
      if (oldParent?.childrenLineIds) {
        oldParent.childrenLineIds = oldParent.childrenLineIds.filter(id => id !== lineId);
      }
    }

    // 设置新父节点
    target.parentLineId = newParentId;
    if (!newParent.childrenLineIds) {
      newParent.childrenLineIds = [];
    }
    newParent.childrenLineIds.push(lineId);

    // 更新深度
    function updateDepthRecursive(line: InnerLine, parentDepth: number) {
      line.depth = parentDepth + 1;
      if (line.childrenLineIds) {
        for (const childId of line.childrenLineIds) {
          const child = allLines.find(l => l.lineId === childId);
          if (child) updateDepthRecursive(child, line.depth);
        }
      }
    }
    updateDepthRecursive(target, newParent.depth);

    engine.value?.setLines([...allLines]);
    isDirty.value = true;
    setStatus('已连接节点');
  }

  return {
    // state
    engine,
    currentFileId,
    documentName,
    isDirty,
    isReadOnly,
    currentView,
    currentLayout,
    selectedLineId,
    selectedIds,
    lastSavedAt,
    isSaving,
    statusMessage,
    viewportTransform,
    targetTransform,
    isAnimating,
    connections,
    // getters
    lines,
    totalLines,
    visibleLines,
    selectedLine,
    canUndo,
    canRedo,
    // actions
    initEngine,
    destroyEngine,
    insertLine,
    deleteLine,
    deleteSelectedLines,
    updateLine,
    moveLine,
    indentLine,
    outdentLine,
    toggleFold,
    foldAll,
    unfoldAll,
    undo,
    redo,
    selectLine,
    setSelectedIds,
    setView,
    setLayout,
    markSaved,
    setSaving,
    setStatus,
    loadDocument,
    clear,
    moveLineAsChild,
    // connection actions
    loadConnections,
    addConnection,
    updateConnection,
    removeConnection,
    setConnections,
    clearConnections,
  };
});
