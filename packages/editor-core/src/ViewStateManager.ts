/**
 * ViewStateManager - 全局视图状态管理器（新增）
 * 文档第2.7节：多视图数据统一同步中枢，所有视图组件通过本中心化状态管理器读写数据
 */
import { InnerLine, ViewMode, MindLayoutType } from '@mindflow/shared';
import { IInnerTreeEngine } from './InnerTreeEngine';

export interface ViewState {
  lines: InnerLine[];
  visibleLines: InnerLine[];
  selectedLineId: string | null;
  currentView: ViewMode;
  layoutType: MindLayoutType;
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  isReadOnly: boolean;
  isDirty: boolean;
}

const STORAGE_KEY = 'mind-view-state';

export class ViewStateManager {
  public state: ViewState;
  private subscribers = new Set<(state: ViewState) => void>();

  constructor(private engine: IInnerTreeEngine) {
    this.state = this.createInitialState();
    this.syncFromEngine();
  }

  private createInitialState(): ViewState {
    return {
      lines: this.engine.getLines(),
      visibleLines: this.engine.getLines(),
      selectedLineId: null,
      currentView: ViewMode.CANVAS,
      layoutType: MindLayoutType.LOGIC_RIGHT,
      canvasScale: 1,
      canvasOffset: { x: 0, y: 0 },
      isReadOnly: false,
      isDirty: false,
    };
  }

  syncFromEngine(): void {
    const lines = this.engine.getLines();
    this.state.lines = lines;
    this.state.visibleLines = this.engine.hasChildren
      ? lines // InnerTreeEngine 上有 renderVisibleLines 方法
      : lines;
    this.notifySubscribers();
  }

  toggleFold(lineId: string): void {
    this.engine.toggleFold(lineId);
    this.state.visibleLines = (this.engine as any).renderVisibleLines
      ? (this.engine as any).renderVisibleLines()
      : this.state.visibleLines;
    this.state.isDirty = true;
    this.notifySubscribers();
  }

  updateLine(lineId: string, text: string): void {
    this.engine.updateLine(lineId, text);
    this.state.isDirty = true;
    this.syncFromEngine();
  }

  selectLine(lineId: string | null): void {
    this.state.selectedLineId = lineId;
    this.notifySubscribers();
  }

  setView(view: ViewMode): void {
    this.state.currentView = view;
    this.saveViewState();
    this.notifySubscribers();
  }

  setLayout(layout: MindLayoutType): void {
    this.state.layoutType = layout;
    this.notifySubscribers();
  }

  setCanvasTransform(scale: number, offset: { x: number; y: number }): void {
    this.state.canvasScale = scale;
    this.state.canvasOffset = offset;
    this.notifySubscribers();
  }

  saveViewState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentView: this.state.currentView,
        canvasScale: this.state.canvasScale,
        layoutType: this.state.layoutType,
      }));
    } catch { /* ignore */ }
  }

  restoreViewState(): void {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const { currentView, canvasScale, layoutType } = JSON.parse(cached);
        if (currentView) this.state.currentView = currentView;
        if (canvasScale) this.state.canvasScale = canvasScale;
        if (layoutType) this.state.layoutType = layoutType;
        this.notifySubscribers();
      }
    } catch { /* 缓存损坏忽略 */ }
  }

  subscribe(callback: (state: ViewState) => void): () => void {
    this.subscribers.add(callback);
    callback(this.state);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(cb => cb({ ...this.state }));
  }

  destroy(): void {
    this.subscribers.clear();
  }
}
