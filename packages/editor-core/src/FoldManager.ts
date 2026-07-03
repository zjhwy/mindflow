/**
 * FoldManager - 折叠状态管理器
 * 文档第1.2节：全局折叠/展开状态统一管控、缓存更新
 */
import { FoldStateMap, InnerLine } from '@mindflow/shared';

export class FoldManager {
  private foldState: FoldStateMap = {};
  private readonly CACHE_KEY = 'mindmap-fold-state';

  /** 从本地缓存恢复折叠状态 */
  restore(): FoldStateMap {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        this.foldState = JSON.parse(cached);
      }
    } catch { /* 缓存损坏则忽略 */ }
    return { ...this.foldState };
  }

  /** 持久化折叠状态到本地缓存 */
  persist(): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.foldState));
    } catch { /* 配额满则忽略 */ }
  }

  /** 设置节点折叠状态 */
  setFold(lineId: string, collapsed: boolean): void {
    this.foldState[lineId] = collapsed;
    this.persist();
  }

  /** 获取节点折叠状态 */
  isFolded(lineId: string): boolean {
    return this.foldState[lineId] ?? false;
  }

  /** 全部折叠 */
  foldAll(lines: InnerLine[]): void {
    for (const line of lines) {
      if (line.childrenLineIds.length > 0) {
        this.foldState[line.lineId] = true;
      }
    }
    this.persist();
  }

  /** 全部展开 */
  unfoldAll(): void {
    this.foldState = {};
    this.persist();
  }

  /** 获取所有折叠节点的ID列表 */
  getFoldedIds(): string[] {
    return Object.entries(this.foldState)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }

  /** 清除缓存 */
  clear(): void {
    this.foldState = {};
    localStorage.removeItem(this.CACHE_KEY);
  }
}
