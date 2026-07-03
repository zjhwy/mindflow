/**
 * EditDebounceManager - 协同编辑防抖合并器（终极增补）
 * 文档第2.10节：高频输入协同流量降噪
 */
import { Operation, OperationType } from '@mindflow/shared';

const MERGE_WINDOW = 200; // ms

export class EditDebounceManager {
  private batchOps: Operation[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushCallback: ((ops: Operation[]) => void) | null = null;

  onFlush(callback: (ops: Operation[]) => void): void {
    this.flushCallback = callback;
  }

  addOp(op: Operation): void {
    this.batchOps.push(op);
    this.resetTimer();
  }

  private resetTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), MERGE_WINDOW);
  }

  private flush(): void {
    if (this.batchOps.length === 0) return;
    const merged = this.mergeSameNodeOps(this.batchOps);
    this.flushCallback?.(merged);
    this.batchOps = [];
  }

  /**
   * 合并同一节点多次更新，仅保留最终状态
   */
  private mergeSameNodeOps(ops: Operation[]): Operation[] {
    const map = new Map<string, Operation>();
    const others: Operation[] = [];

    for (const op of ops) {
      if (op.type === OperationType.UPDATE && op.lineId) {
        map.set(op.lineId, op); // 覆盖保留最新
      } else {
        others.push(op);
      }
    }

    return [...others, ...map.values()];
  }

  destroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.flush(); // 强制刷新残留操作
  }
}
