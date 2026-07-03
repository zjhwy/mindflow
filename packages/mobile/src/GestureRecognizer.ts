/**
 * 触摸手势识别系统
 * 支持: tap(点击), doubletap(双击), longpress(长按), pan(拖拽), pinch(捏合), swipe(滑动)
 */
export type GestureType = 'tap' | 'doubletap' | 'longpress' | 'pan' | 'pinch' | 'swipe';

export interface TouchPoint {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  identifier: number;
}

export interface GestureEvent {
  type: GestureType;
  /** 当前触摸点 */
  center: TouchPoint;
  /** 手势起始点 */
  startPoint: TouchPoint;
  /** 位移 (仅 pan/swipe) */
  deltaX?: number;
  deltaY?: number;
  /** 速度 (px/ms, 仅 swipe) */
  velocityX?: number;
  velocityY?: number;
  /** 缩放增量 (仅 pinch) */
  scale?: number;
  /** 旋转角度 (仅 pinch) */
  rotation?: number;
  /** 持续时间 (ms) */
  duration: number;
  /** 手指数量 */
  touches: number;
  /** 原始 DOM 事件（可选） */
  originalEvent?: TouchEvent;
  /** 阻止后续事件 */
  preventDefault: () => void;
}

export type GestureCallback = (event: GestureEvent) => void;

/**
 * 手势配置
 */
export interface GestureConfig {
  /** 双击最大间隔 (ms) */
  doubleTapMaxInterval?: number;
  /** 双击最大位移 (px) */
  doubleTapMaxDistance?: number;
  /** 长按触发时间 (ms) */
  longPressDuration?: number;
  /** 长按最大位移 (px) */
  longPressMaxDistance?: number;
  /** 滑动最小速度 (px/ms) */
  swipeMinVelocity?: number;
  /** 滑动最小位移 (px) */
  swipeMinDistance?: number;
  /** 是否阻止默认行为 */
  preventDefault?: boolean;
  /** 是否阻止滚动 */
  preventScroll?: boolean;
}

const defaultConfig: Required<GestureConfig> = {
  doubleTapMaxInterval: 300,
  doubleTapMaxDistance: 20,
  longPressDuration: 600,
  longPressMaxDistance: 10,
  swipeMinVelocity: 0.3,
  swipeMinDistance: 30,
  preventDefault: false,
  preventScroll: false,
};

/**
 * 触摸手势识别器
 *
 * 使用示例:
 * ```ts
 * const recognizer = new GestureRecognizer(element, { preventScroll: true });
 * recognizer.on('longpress', (e) => console.log('长按', e.center));
 * recognizer.on('pinch', (e) => console.log('缩放', e.scale));
 * recognizer.destroy();
 * ```
 */
export class GestureRecognizer {
  private element: HTMLElement;
  private config: Required<GestureConfig>;
  private listeners = new Map<GestureType, Set<GestureCallback>>();

  // 运行时状态
  private startTime = 0;
  private startPoint: TouchPoint | null = null;
  private lastPoint: TouchPoint | null = null;
  private lastTapTime = 0;
  private lastTapPoint: TouchPoint | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private isLongPress = false;
  private isPanning = false;
  private initialPinchDistance = 0;
  private initialScale = 1;
  private activeTouchCount = 0;
  // 速度追踪
  private velocityTracker: Array<{ time: number; x: number; y: number }> = [];

  constructor(element: HTMLElement, config: GestureConfig = {}) {
    this.element = element;
    this.config = { ...defaultConfig, ...config };

    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    element.addEventListener('touchend', this.handleTouchEnd);
    element.addEventListener('touchcancel', this.handleTouchEnd);
  }

  on(type: GestureType, callback: GestureCallback): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
  }

  off(type: GestureType, callback: GestureCallback): void {
    this.listeners.get(type)?.delete(callback);
  }

  destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchEnd);
    this.clearLongPress();
    this.listeners.clear();
  }

  // ---- 事件处理 ----

  private handleTouchStart(e: TouchEvent): void {
    if (this.config.preventDefault) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const point = this.getTouchPoint(touch);

    this.startTime = Date.now();
    this.startPoint = point;
    this.lastPoint = point;
    this.isLongPress = false;
    this.isPanning = false;
    this.activeTouchCount = e.touches.length;

    // 速度追踪
    this.velocityTracker = [{ time: this.startTime, x: point.x, y: point.y }];

    // 长按定时器
    this.clearLongPress();
    this.longPressTimer = setTimeout(() => {
      this.isLongPress = true;
      this.emit('longpress', this.buildEvent('longpress', point));
    }, this.config.longPressDuration);

    // 双指手势初始化
    if (e.touches.length === 2) {
      this.initialPinchDistance = this.getPinchDistance(e.touches);
      this.initialScale = 1;
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (this.config.preventDefault || this.config.preventScroll) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const point = this.getTouchPoint(touch);

    if (!this.startPoint) return;

    const dx = point.x - this.startPoint.x;
    const dy = point.y - this.startPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 取消长按（移动过大）
    if (this.longPressTimer && dist > this.config.longPressMaxDistance) {
      this.clearLongPress();
    }

    // 速度追踪
    this.velocityTracker.push({ time: Date.now(), x: point.x, y: point.y });
    // 只保留最近 100ms
    const now = Date.now();
    this.velocityTracker = this.velocityTracker.filter((v) => now - v.time < 100);

    // Pan 检测
    if (dist > 10 && !this.isPanning && !this.isLongPress) {
      this.isPanning = true;
      this.clearLongPress();
    }

    if (this.isPanning) {
      this.emit('pan', this.buildEvent('pan', point, dx, dy, dist));
    }

    // 双指缩放/旋转
    if (e.touches.length === 2 && this.initialPinchDistance > 0) {
      const currentDist = this.getPinchDistance(e.touches);
      const scale = currentDist / this.initialPinchDistance;
      const rotation = this.getPinchRotation(e.touches);

      this.emit('pinch', {
        ...this.buildEvent('pinch', point),
        scale: scale / this.initialScale,
        rotation,
      });

      this.initialScale = scale;
    }

    this.lastPoint = point;
  }

  private handleTouchEnd(e: TouchEvent): void {
    this.clearLongPress();
    this.activeTouchCount = e.touches.length;

    if (!this.startPoint || !this.lastPoint) return;

    const now = Date.now();
    const duration = now - this.startTime;
    const dx = this.lastPoint.x - this.startPoint.x;
    const dy = this.lastPoint.y - this.startPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 计算速度
    const { velocityX, velocityY } = this.calculateVelocity();

    if (this.isLongPress) {
      return; // 长按已处理
    }

    if (this.isPanning) {
      // Swipe 检测
      if (
        duration > 0 &&
        dist >= this.config.swipeMinDistance &&
        (Math.abs(velocityX) >= this.config.swipeMinVelocity || Math.abs(velocityY) >= this.config.swipeMinVelocity)
      ) {
        this.emit('swipe', {
          ...this.buildEvent('swipe', this.lastPoint, dx, dy, dist),
          velocityX,
          velocityY,
          duration,
        });
      }
      return;
    }

    // Tap 检测
    if (dist < 10 && duration < 300) {
      const tapPoint = this.lastPoint;

      // Double tap 检测
      if (
        this.lastTapTime > 0 &&
        this.lastTapPoint &&
        now - this.lastTapTime <= this.config.doubleTapMaxInterval &&
        Math.abs(tapPoint.x - this.lastTapPoint.x) < this.config.doubleTapMaxDistance &&
        Math.abs(tapPoint.y - this.lastTapPoint.y) < this.config.doubleTapMaxDistance
      ) {
        this.emit('doubletap', this.buildEvent('doubletap', tapPoint));
        this.lastTapTime = 0;
        this.lastTapPoint = null;
      } else {
        // 延迟 tap 触发（等待可能的双击）
        const point = tapPoint;
        const self = this;
        setTimeout(() => {
          if (self.lastTapTime === 0) return; // 已经被双击消费
          self.emit('tap', self.buildEvent('tap', point));
        }, this.config.doubleTapMaxInterval + 10);

        this.lastTapTime = now;
        this.lastTapPoint = tapPoint;
      }
    }

    // 重置
    this.isPanning = false;
    this.initialPinchDistance = 0;
  }

  // ---- 工具方法 ----

  private getTouchPoint(touch: Touch): TouchPoint {
    return {
      x: touch.pageX,
      y: touch.pageY,
      clientX: touch.clientX,
      clientY: touch.clientY,
      identifier: touch.identifier,
    };
  }

  private getPinchDistance(touches: TouchList): number {
    if (touches.length < 2) return 0;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getPinchRotation(touches: TouchList): number {
    if (touches.length < 2) return 0;
    return Math.atan2(
      touches[1].pageY - touches[0].pageY,
      touches[1].pageX - touches[0].pageX
    ) * (180 / Math.PI);
  }

  private calculateVelocity(): { velocityX: number; velocityY: number } {
    const tracker = this.velocityTracker;
    if (tracker.length < 2) return { velocityX: 0, velocityY: 0 };

    const first = tracker[0];
    const last = tracker[tracker.length - 1];
    const dt = last.time - first.time;

    if (dt === 0) return { velocityX: 0, velocityY: 0 };

    return {
      velocityX: (last.x - first.x) / dt,
      velocityY: (last.y - first.y) / dt,
    };
  }

  private buildEvent(
    type: GestureType,
    point: TouchPoint,
    deltaX = 0,
    deltaY = 0,
    deltaDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  ): GestureEvent {
    const blocked = { prevented: false };
    return {
      type,
      center: point,
      startPoint: this.startPoint!,
      deltaX,
      deltaY,
      duration: Date.now() - this.startTime,
      touches: this.activeTouchCount,
      preventDefault: () => { blocked.prevented = true; },
    };
  }

  private emit(type: GestureType, event: GestureEvent): void {
    this.listeners.get(type)?.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error(`[GestureRecognizer] ${type} handler error:`, err);
      }
    });
  }

  private clearLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}
