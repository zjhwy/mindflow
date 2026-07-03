/**
 * UndoRedoManager - 撤销/重做事务管理器
 * 文档第2.8节：全操作事务回溯、批量合并
 */
import { HistoryAction, InnerLine, OperationType } from '@mindflow/shared';

export class UndoRedoManager {
  private history: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];
  private readonly maxStep: number;

  constructor(maxStep = 50) {
    this.maxStep = maxStep;
  }

  record(action: HistoryAction): void {
    this.history.push(action);
    this.redoStack = []; // 新操作清空重做栈
    if (this.history.length > this.maxStep) {
      this.history.shift(); // 淘汰最早记录
    }
  }

  /** 记录批量操作合并为单条事务 */
  recordBatch(actions: HistoryAction[]): void {
    if (actions.length === 0) return;
    const merged: HistoryAction = {
      type: OperationType.UPDATE,
      before: actions.map(a => a.before as Partial<InnerLine>),
      after: actions.map(a => a.after as Partial<InnerLine>),
      timestamp: Date.now(),
      userId: '',
    };
    this.record(merged);
  }

  undo(): HistoryAction | null {
    const action = this.history.pop();
    if (!action) return null;
    this.redoStack.push(action);
    return action;
  }

  redo(): HistoryAction | null {
    const action = this.redoStack.pop();
    if (!action) return null;
    this.history.push(action);
    return action;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoCount(): number {
    return this.history.length;
  }

  getRedoCount(): number {
    return this.redoStack.length;
  }

  clear(): void {
    this.history = [];
    this.redoStack = [];
  }
}
