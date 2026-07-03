/**
 * 移动端性能策略
 * 控制渲染帧率、降低精度、LOD策略
 */
export type PerformanceTier = 'low' | 'medium' | 'high';

export interface PerformanceConfig {
  /** 最大渲染节点数（超出则启用虚拟滚动） */
  maxVisibleNodes?: number;
  /** 折叠动画时长 (ms) */
  animationDuration?: number;
  /** 是否启用阴影 */
  enableShadow?: boolean;
  /** 是否启用模糊效果 */
  enableBlur?: boolean;
  /** 字体简化（移动端减小字号范围） */
  minFontSize?: number;
  maxFontSize?: number;
  /** 防抖间隔 (ms) */
  debounceInterval?: number;
  /** 节流间隔 (ms) */
  throttleInterval?: number;
}

const TIER_CONFIGS: Record<PerformanceTier, Required<PerformanceConfig>> = {
  low: {
    maxVisibleNodes: 200,
    animationDuration: 0,
    enableShadow: false,
    enableBlur: false,
    minFontSize: 12,
    maxFontSize: 20,
    debounceInterval: 200,
    throttleInterval: 100,
  },
  medium: {
    maxVisibleNodes: 500,
    animationDuration: 200,
    enableShadow: false,
    enableBlur: false,
    minFontSize: 10,
    maxFontSize: 28,
    debounceInterval: 150,
    throttleInterval: 50,
  },
  high: {
    maxVisibleNodes: 2000,
    animationDuration: 300,
    enableShadow: true,
    enableBlur: true,
    minFontSize: 8,
    maxFontSize: 40,
    debounceInterval: 100,
    throttleInterval: 16,
  },
};

/**
 * 移动端性能管理器
 * 根据设备和当前网络状况选择最优渲染策略
 */
export class MobilePerformance {
  private tier: PerformanceTier = 'medium';
  private config: Required<PerformanceConfig>;
  private metrics: Array<{ timestamp: number; fps: number }> = [];
  private frameCount = 0;
  private lastFrameTime = Date.now();
  private monitorRaf: ReturnType<typeof requestAnimationFrame> | null = null;
  private onTierChange: ((tier: PerformanceTier) => void) | null = null;

  constructor() {
    this.config = { ...TIER_CONFIGS[TIE_CONFIGS['medium']] };
    this.detectTier();
  }

  /** 自动检测设备性能级别 */
  private detectTier(): void {
    // 基于设备内存 (Navigator.deviceMemory) 和 核心数
    const memory = (navigator as any).deviceMemory ?? 4; // GB
    const cores = navigator.hardwareConcurrency ?? 4;

    // 屏幕像素比
    const dpr = window.devicePixelRatio || 1;

    if (memory <= 2 || cores <= 2) {
      this.setTier('low');
    } else if (memory <= 4 || cores <= 4 || dpr >= 3) {
      this.setTier('medium');
    } else {
      this.setTier('high');
    }

    // 启动 FPS 监控
    this.startFPSMonitor();
  }

  getTier(): PerformanceTier {
    return this.tier;
  }

  getConfig(): Readonly<Required<PerformanceConfig>> {
    return this.config;
  }

  setTier(tier: PerformanceTier): void {
    if (this.tier === tier) return;
    this.tier = tier;
    this.config = { ...TIER_CONFIGS[tier] };
    this.onTierChange?.(tier);
  }

  onTierChanged(callback: (tier: PerformanceTier) => void): void {
    this.onTierChange = callback;
  }

  /**
   * 启动 FPS 监控
   */
  private startFPSMonitor(): void {
    const track = () => {
      this.frameCount++;
      const now = Date.now();
      const elapsed = now - this.lastFrameTime;

      if (elapsed >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / elapsed);
        this.metrics.push({ timestamp: now, fps });

        // 只保留最近 60 秒
        this.metrics = this.metrics.filter((m) => now - m.timestamp < 60000);

        // 根据 FPS 动态调整性能等级
        if (this.metrics.length >= 5) {
          const avgFps = this.metrics.slice(-5).reduce((s, m) => s + m.fps, 0) / 5;
          if (avgFps < 30 && this.tier !== 'low') {
            this.setTier('low');
          } else if (avgFps >= 50 && this.tier === 'low') {
            this.setTier('medium');
          }
        }

        this.frameCount = 0;
        this.lastFrameTime = now;
      }

      this.monitorRaf = requestAnimationFrame(track);
    };

    this.monitorRaf = requestAnimationFrame(track);
  }

  /** 获取平均 FPS */
  getAverageFPS(): number {
    if (this.metrics.length === 0) return 60;
    return this.metrics.reduce((s, m) => s + m.fps, 0) / this.metrics.length;
  }

  /** 获取最低 FPS */
  getMinFPS(): number {
    if (this.metrics.length === 0) return 60;
    return Math.min(...this.metrics.map((m) => m.fps));
  }

  // ---- 工具方法 ----

  /** 防抖 */
  debounce<T extends (...args: any[]) => void>(fn: T): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fn(...args);
        timer = null;
      }, this.config.debounceInterval);
    };
  }

  /** 节流 */
  throttle<T extends (...args: any[]) => void>(fn: T): (...args: Parameters<T>) => void {
    let lastTime = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastTime >= this.config.throttleInterval) {
        lastTime = now;
        fn(...args);
      }
    };
  }

  /** 虚拟滚动 - 可视节点索引范围 */
  getVisibleRange(itemHeight: number, containerHeight: number, scrollTop: number): { start: number; end: number } {
    const buffer = 5; // 上下各多渲染 5 项
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    const end = Math.min(
      Math.floor((scrollTop + containerHeight) / itemHeight) + buffer,
      this.config.maxVisibleNodes
    );
    return { start, end };
  }

  destroy(): void {
    if (this.monitorRaf) {
      cancelAnimationFrame(this.monitorRaf);
      this.monitorRaf = null;
    }
    this.metrics = [];
  }
}
