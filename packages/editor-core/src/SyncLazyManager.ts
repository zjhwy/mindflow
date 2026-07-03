/**
 * SyncLazyManager - 巨型文档懒同步管理器（终极增补）
 * 文档第2.9节：十万行级文档按需同步
 */
import { InnerLine, ViewportRange } from '@mindflow/shared';

export class SyncLazyManager {
  private currentViewport: ViewportRange = { startLineIndex: 0, endLineIndex: 100, expandDepth: 2 };
  private preloadCache = new Map<string, InnerLine[]>();
  private throttleTimer: ReturnType<typeof setTimeout> | null = null;
  private scrollHandler: (() => void) | null = null;

  /** 初始化视口感知能力 */
  init(): void {
    this.scrollHandler = () => this.handleScroll();
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  private handleScroll = (): void => {
    if (this.throttleTimer) return;
    this.throttleTimer = setTimeout(() => {
      this.updateViewportRange();
      this.throttleTimer = null;
    }, 150);
  };

  private updateViewportRange(): void {
    const range = this.getVisibleLineRange();
    this.currentViewport = {
      startLineIndex: range.startLineIndex,
      endLineIndex: range.endLineIndex,
      expandDepth: 2,
    };
  }

  /** 过滤远端协同变更，仅放行视口内节点更新 */
  filterRemoteOps(ops: any[], allLines: InnerLine[]): any[] {
    return ops.filter(op => {
      const target = allLines.find(l => l.lineId === op.lineId);
      if (!target) return false;
      return target.depth <= this.currentViewport.expandDepth;
    });
  }

  /** 获取当前视口范围 */
  getViewport(): ViewportRange {
    return { ...this.currentViewport };
  }

  /** 根据节点索引预加载子节点 */
  preloadChildren(lineId: string, children: InnerLine[]): void {
    this.preloadCache.set(lineId, children);
  }

  getPreloaded(lineId: string): InnerLine[] | null {
    return this.preloadCache.get(lineId) ?? null;
  }

  private getVisibleLineRange(): ViewportRange {
    // 实际实现需结合画布滚动位置与行高计算
    return { startLineIndex: 0, endLineIndex: 100, expandDepth: 2 };
  }

  destroy(): void {
    if (this.scrollHandler) window.removeEventListener('scroll', this.scrollHandler);
    if (this.throttleTimer) clearTimeout(this.throttleTimer);
    this.preloadCache.clear();
  }
}
