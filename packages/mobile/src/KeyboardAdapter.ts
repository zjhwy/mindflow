/**
 * 虚拟键盘适配器
 * 处理键盘弹出/收起时的视口变化、工具栏重定位、输入框聚焦
 */
export type KeyboardState = 'hidden' | 'visible' | 'transitioning';

export interface KeyboardInfo {
  state: KeyboardState;
  /** 键盘高度估计 (px) */
  estimatedHeight: number;
  /** 可视区域高度 (window.innerHeight) */
  viewportHeight: number;
  /** 键盘导致的视口偏移 */
  offsetY: number;
}

export type KeyboardCallback = (info: KeyboardInfo) => void;

/**
 * 虚拟键盘适配器
 *
 * 使用 VisualViewport API (Chrome 62+, Safari 13+)
 * 回退方案: window resize + focusin/focusout 事件
 */
export class KeyboardAdapter {
  private currentState: KeyboardState = 'hidden';
  private estimatedHeight = 0;
  private listeners = new Set<KeyboardCallback>();
  private initialHeight = window.innerHeight;

  // 兼容检测
  private useVisualViewport = typeof (window as any).visualViewport !== 'undefined';

  private boundResizeHandler: () => void;
  private boundFocusInHandler: () => void;
  private boundFocusOutHandler: () => void;

  constructor() {
    this.boundResizeHandler = this.handleResize.bind(this);
    this.boundFocusInHandler = this.handleFocusIn.bind(this);
    this.boundFocusOutHandler = this.handleFocusOut.bind(this);

    if (this.useVisualViewport) {
      const vv = (window as any).visualViewport;
      vv.addEventListener('resize', this.boundResizeHandler);
      vv.addEventListener('scroll', this.boundResizeHandler);
    } else {
      // 回退方案
      window.addEventListener('resize', this.boundResizeHandler);
      document.addEventListener('focusin', this.boundFocusInHandler);
      document.addEventListener('focusout', this.boundFocusOutHandler);
    }
  }

  onChange(callback: KeyboardCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getState(): KeyboardInfo {
    return {
      state: this.currentState,
      estimatedHeight: this.estimatedHeight,
      viewportHeight: window.innerHeight,
      offsetY: this.initialHeight - window.innerHeight,
    };
  }

  /** 键盘是否可见 */
  isVisible(): boolean {
    return this.currentState === 'visible';
  }

  /** 获取键盘高度 */
  getKeyboardHeight(): number {
    return this.estimatedHeight;
  }

  /**
   * 获取输入框在键盘弹出后应滚动到的位置
   */
  getScrollOffset(inputElement: HTMLElement): number {
    const rect = inputElement.getBoundingClientRect();
    const visibleBottom = window.innerHeight - this.estimatedHeight;
    if (rect.bottom > visibleBottom) {
      return rect.bottom - visibleBottom + 16; // 16px padding
    }
    return 0;
  }

  /**
   * 自动滚动到输入元素可见位置
   */
  scrollToVisible(inputElement: HTMLElement): void {
    const offset = this.getScrollOffset(inputElement);
    if (offset > 0) {
      window.scrollBy({ top: offset, behavior: 'smooth' });
    }
  }

  destroy(): void {
    if (this.useVisualViewport) {
      const vv = (window as any).visualViewport;
      vv?.removeEventListener('resize', this.boundResizeHandler);
      vv?.removeEventListener('scroll', this.boundResizeHandler);
    } else {
      window.removeEventListener('resize', this.boundResizeHandler);
      document.removeEventListener('focusin', this.boundFocusInHandler);
      document.removeEventListener('focusout', this.boundFocusOutHandler);
    }
    this.listeners.clear();
  }

  // ---- 事件处理 ----

  private handleResize(): void {
    // 键盘弹出/收起的启发式判断
    const heightDiff = this.initialHeight - window.innerHeight;

    if (heightDiff > 150) {
      // 键盘弹出
      if (this.currentState !== 'visible') {
        this.currentState = 'visible';
        this.estimatedHeight = heightDiff;
        this.notify();
      } else if (Math.abs(heightDiff - this.estimatedHeight) > 20) {
        // 键盘高度变化（如切换输入法）
        this.estimatedHeight = heightDiff;
        this.currentState = 'transitioning';
        this.notify();
        this.currentState = 'visible';
      }
    } else {
      // 键盘收起
      if (this.currentState !== 'hidden') {
        this.currentState = 'hidden';
        this.estimatedHeight = 0;
        this.notify();
        // 恢复初始高度（横竖屏切换可能导致变化）
        this.initialHeight = window.innerHeight;
      }
    }
  }

  private handleFocusIn(): void {
    // 回退方案：输入聚焦后延迟检测
    setTimeout(() => this.handleResize(), 300);
  }

  private handleFocusOut(): void {
    setTimeout(() => this.handleResize(), 100);
  }

  private notify(): void {
    const info = this.getState();
    this.listeners.forEach((cb) => {
      try {
        cb(info);
      } catch (err) {
        console.error('[KeyboardAdapter] 回调异常:', err);
      }
    });
  }
}
