/**
 * InnerTreeEngine - 内联层级树核心引擎
 * 文档第2.1节：核心渲染、数据解析、交互调度
 */
import { v4 as uuidv4 } from 'uuid';
import {
  InnerLine, InnerTreeOptions, Operation, OperationType,
  EngineEvent, EngineCallback, FoldStateMap, MindLayoutType,
} from '@mindflow/shared';

/** 撤回/重做命令 */
interface UndoCommand {
  undo: () => void;
  redo: () => void;
}

export interface IInnerTreeEngine {
  init(container: HTMLElement, options: InnerTreeOptions): void;
  setLines(lines: InnerLine[]): void;
  getLines(): InnerLine[];
  insertLine(index: number, text: string, depth: number): InnerLine;
  deleteLine(lineId: string): void;
  updateLine(lineId: string, text: string): void;
  moveLine(lineId: string, newIndex: number): void;
  indent(lineId: string): void;
  outdent(lineId: string): void;
  toggleFold(lineId: string): void;
  foldAll(): void;
  unfoldAll(): void;
  getFoldState(lineId: string): boolean;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  applyRemoteChanges(ops: Operation[]): void;
  getLocalChanges(): Operation[];
  on(event: EngineEvent, callback: EngineCallback): void;
  off(event: EngineEvent, callback: EngineCallback): void;
  destroy(): void;
}

export class InnerTreeEngine implements IInnerTreeEngine {
  private container: HTMLElement | null = null;
  private lines: InnerLine[] = [];
  private options: InnerTreeOptions = {};
  private listeners = new Map<string, Set<EngineCallback>>();
  private localChangeQueue: Operation[] = [];
  private destroyed = false;
  private undoStack: UndoCommand[] = [];
  private redoStack: UndoCommand[] = [];
  private maxUndoSteps = 50;

  // ==================== 生命周期 ====================

  init(container: HTMLElement, options: InnerTreeOptions = {}): void {
    this.container = container;
    this.options = {
      maxUndoSteps: 50,
      layoutType: MindLayoutType.LOGIC_RIGHT,
      enableCollaboration: false,
      enableAutoSave: true,
      autoSaveInterval: 5000,
      ...options,
    };
    this.maxUndoSteps = this.options.maxUndoSteps ?? 50;
    this.destroyed = false;
    this.emit('content-change', { action: 'init' });
  }

  // ==================== 数据基础操作 ====================

  setLines(lines: InnerLine[]): void {
    this.lines = lines.map(l => ({ ...l }));
    this.emit('content-change', { action: 'setAll' });
  }

  getLines(): InnerLine[] {
    return this.lines;
  }

  insertLine(index: number, text: string, depth: number): InnerLine {
    const now = Date.now();
    const line: InnerLine = {
      lineId: uuidv4(),
      text,
      depth: Math.max(0, depth),
      collapsed: false,
      parentLineId: this.findParentId(index, depth),
      childrenLineIds: [],
      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy: '',
        priority: 0,
      },
    };
    this.lines.splice(index, 0, line);
    this.rebuildChildrenIds();
    this.recordLocalChange({ type: OperationType.INSERT, lineId: line.lineId, index, timestamp: now, userId: '' });

    // 撤回/重做
    const insertedId = line.lineId;
    const insertedDepth = line.depth;
    const cloned = this.cloneLine(line);
    this.pushCommand({
      undo: () => {
        const idx = this.lines.findIndex(l => l.lineId === insertedId);
        if (idx === -1) return;
        let end = idx + 1;
        while (end < this.lines.length && this.lines[end].depth > insertedDepth) end++;
        this.lines.splice(idx, end - idx);
      },
      redo: () => {
        this.lines.splice(index, 0, this.cloneLine(cloned));
      },
    });

    this.emit('content-change', { action: 'insert', lineId: line.lineId });
    return line;
  }

  deleteLine(lineId: string): void {
    const idx = this.lines.findIndex(l => l.lineId === lineId);
    if (idx === -1) return;

    // 快照：记录被删除的行及其子节点，用于撤回恢复
    const deletedSnapshot = this.snapshotLinesRange(idx);

    const removed = this.lines.splice(idx, 1)[0];
    // 级联删除子节点
    while (idx < this.lines.length && this.lines[idx].depth > removed.depth) {
      this.lines.splice(idx, 1);
    }
    this.rebuildChildrenIds();
    this.recordLocalChange({ type: OperationType.DELETE, lineId, timestamp: Date.now(), userId: '' });

    // 撤回/重做
    this.pushCommand({
      undo: () => {
        this.lines.splice(idx, 0, ...deletedSnapshot.map(l => this.cloneLine(l)));
      },
      redo: () => {
        const delIdx = this.lines.findIndex(l => l.lineId === lineId);
        if (delIdx === -1) return;
        const d = this.lines[delIdx].depth;
        let end = delIdx + 1;
        while (end < this.lines.length && this.lines[end].depth > d) end++;
        this.lines.splice(delIdx, end - delIdx);
      },
    });

    this.emit('content-change', { action: 'delete', lineId });
  }

  updateLine(lineId: string, text: string): void {
    const line = this.lines.find(l => l.lineId === lineId);
    if (!line) return;
    const oldText = line.text;
    line.text = text;
    line.metadata.updatedAt = Date.now();
    this.recordLocalChange({ type: OperationType.UPDATE, lineId, timestamp: Date.now(), userId: '' });

    // 撤回/重做
    this.pushCommand({
      undo: () => {
        const l = this.lines.find(ln => ln.lineId === lineId);
        if (l) l.text = oldText;
      },
      redo: () => {
        const l = this.lines.find(ln => ln.lineId === lineId);
        if (l) l.text = text;
      },
    });

    this.emit('content-change', { action: 'update', lineId });
  }

  moveLine(lineId: string, newIndex: number): void {
    const idx = this.lines.findIndex(l => l.lineId === lineId);
    if (idx === -1 || newIndex < 0 || newIndex >= this.lines.length) return;
    const oldIndex = idx;
    const [moved] = this.lines.splice(idx, 1);
    this.lines.splice(newIndex, 0, moved);
    this.rebuildChildrenIds();
    this.recordLocalChange({ type: OperationType.MOVE, lineId, index: newIndex, timestamp: Date.now(), userId: '' });

    // 撤回/重做
    this.pushCommand({
      undo: () => {
        const curIdx = this.lines.findIndex(l => l.lineId === lineId);
        if (curIdx === -1) return;
        const [item] = this.lines.splice(curIdx, 1);
        this.lines.splice(oldIndex, 0, item);
      },
      redo: () => {
        const curIdx = this.lines.findIndex(l => l.lineId === lineId);
        if (curIdx === -1) return;
        const [item] = this.lines.splice(curIdx, 1);
        this.lines.splice(newIndex, 0, item);
      },
    });

    this.emit('line-move', { lineId, newIndex });
  }

  // ==================== 层级缩进 ====================

  indent(lineId: string): void {
    const line = this.lines.find(l => l.lineId === lineId);
    if (!line || line.depth === 0) return;
    line.depth += 1;
    line.metadata.updatedAt = Date.now();
    this.recordLocalChange({ type: OperationType.INDENT, lineId, timestamp: Date.now(), userId: '' });
    this.pushCommand({
      undo: () => { const l = this.lines.find(ln => ln.lineId === lineId); if (l && l.depth > 0) l.depth -= 1; },
      redo: () => { const l = this.lines.find(ln => ln.lineId === lineId); if (l) l.depth += 1; },
    });
    this.emit('content-change', { action: 'indent', lineId });
  }

  outdent(lineId: string): void {
    const line = this.lines.find(l => l.lineId === lineId);
    if (!line || line.depth <= 1) return;
    line.depth -= 1;
    line.metadata.updatedAt = Date.now();
    this.recordLocalChange({ type: OperationType.OUTDENT, lineId, timestamp: Date.now(), userId: '' });
    this.pushCommand({
      undo: () => { const l = this.lines.find(ln => ln.lineId === lineId); if (l) l.depth += 1; },
      redo: () => { const l = this.lines.find(ln => ln.lineId === lineId); if (l && l.depth > 0) l.depth -= 1; },
    });
    this.emit('content-change', { action: 'outdent', lineId });
  }

  // ==================== 折叠展开 ====================

  toggleFold(lineId: string): void {
    const line = this.lines.find(l => l.lineId === lineId);
    if (!line || line.childrenLineIds.length === 0) return;
    line.collapsed = !line.collapsed;
    this.emit('fold-change', { lineId, collapsed: line.collapsed });
  }

  foldAll(): void {
    this.lines.forEach(l => { if (l.childrenLineIds.length > 0) l.collapsed = true; });
    this.emit('fold-change', { all: true, collapsed: true });
  }

  unfoldAll(): void {
    this.lines.forEach(l => { l.collapsed = false; });
    this.emit('fold-change', { all: true, collapsed: false });
  }

  getFoldState(lineId: string): boolean {
    return this.lines.find(l => l.lineId === lineId)?.collapsed ?? false;
  }

  // ==================== 撤回/重做 ====================

  undo(): boolean {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;
    cmd.undo();
    this.redoStack.push(cmd);
    this.rebuildChildrenIds();
    this.emit('content-change', { action: 'undo' });
    return true;
  }

  redo(): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;
    cmd.redo();
    this.undoStack.push(cmd);
    this.rebuildChildrenIds();
    this.emit('content-change', { action: 'redo' });
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // ==================== 渲染算法-核心折叠筛选(文档2.3节) ====================

  /**
   * 获取当前可视区域的节点列表
   * 通过精准层级判定实现折叠隐藏节点的过滤
   */
  renderVisibleLines(allLines?: InnerLine[]): InnerLine[] {
    const source = allLines ?? this.lines;
    const visible: InnerLine[] = [];
    let skipDepth: number | null = null;

    for (const line of source) {
      if (skipDepth !== null && line.depth > skipDepth) continue;
      if (skipDepth !== null && line.depth <= skipDepth) skipDepth = null;

      visible.push(line);

      if (line.collapsed && this.hasChildren(line, source)) {
        skipDepth = line.depth;
      }
    }

    return visible;
  }

  /**
   * 检查指定行是否存在子节点 - 文档2.3节核心落地实现
   * 从当前节点下一位遍历，找直接下级节点
   */
  hasChildren(line: InnerLine, allLines: InnerLine[]): boolean {
    const startIndex = allLines.findIndex(l => l.lineId === line.lineId);
    if (startIndex === -1) return false;

    for (let i = startIndex + 1; i < allLines.length; i++) {
      if (allLines[i].depth <= line.depth) return false;
      if (allLines[i].depth === line.depth + 1) return true;
    }
    return false;
  }

  // ==================== 协同数据 ====================

  applyRemoteChanges(ops: Operation[]): void {
    for (const op of ops) {
      switch (op.type) {
        case OperationType.INSERT:
          if (op.index !== undefined && op.data) {
            this.lines.splice(op.index, 0, op.data as unknown as InnerLine);
          }
          break;
        case OperationType.DELETE:
          this.lines = this.lines.filter(l => l.lineId !== op.lineId);
          break;
        case OperationType.UPDATE:
          if (op.data) {
            const line = this.lines.find(l => l.lineId === op.lineId);
            if (line) Object.assign(line, op.data);
          }
          break;
      }
    }
    this.rebuildChildrenIds();
    this.emit('data-sync', { ops });
  }

  getLocalChanges(): Operation[] {
    const ops = [...this.localChangeQueue];
    this.localChangeQueue = [];
    return ops;
  }

  private recordLocalChange(op: Operation): void {
    this.localChangeQueue.push(op);
  }

  // ==================== 事件系统 ====================

  on(event: EngineEvent, callback: EngineCallback): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }

  off(event: EngineEvent, callback: EngineCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: EngineEvent, data: any): void {
    if (this.destroyed) return;
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  // ==================== 内部辅助 ====================

  private findParentId(index: number, depth: number): string | null {
    for (let i = index - 1; i >= 0; i--) {
      if (this.lines[i].depth < depth) return this.lines[i].lineId;
    }
    return null;
  }

  /**
   * 重新构建所有节点的 childrenLineIds
   * 通过深度遍历线性数组重建父子关系
   */
  private rebuildChildrenIds(): void {
    this.lines.forEach(l => (l.childrenLineIds = []));
    const stack: InnerLine[] = [];
    for (const line of this.lines) {
      while (stack.length > 0 && stack[stack.length - 1].depth >= line.depth) {
        stack.pop();
      }
      if (stack.length > 0) {
        const parent = stack[stack.length - 1];
        line.parentLineId = parent.lineId;
        parent.childrenLineIds.push(line.lineId);
      } else {
        line.parentLineId = null;
      }
      stack.push(line);
    }
  }

  /** 深度克隆节点（用于撤回/重做快照） */
  private cloneLine(line: InnerLine): InnerLine {
    return JSON.parse(JSON.stringify(line));
  }

  /** 从给定 index 开始快照连续的行（包括所有 depth > startDepth 的子节点） */
  private snapshotLinesRange(startIdx: number): InnerLine[] {
    if (startIdx < 0 || startIdx >= this.lines.length) return [];
    const startDepth = this.lines[startIdx].depth;
    const result: InnerLine[] = [];
    let i = startIdx;
    while (i < this.lines.length && this.lines[i].depth >= startDepth) {
      result.push(this.cloneLine(this.lines[i]));
      i++;
    }
    return result;
  }

  /** 推入撤回栈，超出上限则移除最旧命令 */
  private pushCommand(cmd: UndoCommand): void {
    this.undoStack.push(cmd);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    // 新操作清空重做栈
    this.redoStack = [];
  }

  destroy(): void {
    this.destroyed = true;
    this.lines = [];
    this.localChangeQueue = [];
    this.undoStack = [];
    this.redoStack = [];
    this.listeners.clear();
    this.container = null;
  }
}
