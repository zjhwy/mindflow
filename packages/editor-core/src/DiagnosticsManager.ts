/**
 * DiagnosticsManager - 客户端性能自诊模块（终极增补）
 * 文档第1.2节：前端性能监控、日志自动上报
 */
interface PerformanceSnapshot {
  fps: number;
  memoryMB: number;
  domCount: number;
  operationLatency: number;
  timestamp: number;
}

interface DiagnosticsConfig {
  snapshotInterval: number;
  reportEndpoint: string;
  enabled: boolean;
}

export class DiagnosticsManager {
  private config: DiagnosticsConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private operationTimes: number[] = [];
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private fps = 60;
  private rafId: number | null = null;

  constructor(config?: Partial<DiagnosticsConfig>) {
    this.config = {
      snapshotInterval: 10_000,
      reportEndpoint: '/api/v1/diagnostics/report',
      enabled: import.meta.env.PROD ?? false,
      ...config,
    };
  }

  start(): void {
    if (!this.config.enabled) return;
    this.startFPSTracking();
    this.intervalId = setInterval(() => this.takeSnapshot(), this.config.snapshotInterval);
  }

  /** 记录单次操作耗时 */
  recordOperationLatency(ms: number): void {
    this.operationTimes.push(ms);
    if (this.operationTimes.length > 100) this.operationTimes.shift();
  }

  /** 采集性能快照 */
  private takeSnapshot(): void {
    const memUsage = (performance as any).memory?.usedJSHeapSize ?? 0;
    const snapshot: PerformanceSnapshot = {
      fps: this.fps,
      memoryMB: Math.round(memUsage / 1024 / 1024),
      domCount: document.querySelectorAll('*').length,
      operationLatency: this.calcAvgLatency(),
      timestamp: Date.now(),
    };
    this.report(snapshot);
  }

  private calcAvgLatency(): number {
    if (this.operationTimes.length === 0) return 0;
    const sum = this.operationTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.operationTimes.length);
  }

  private startFPSTracking(): void {
    const tick = (): void => {
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFrameTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastFrameTime = now;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private async report(snapshot: PerformanceSnapshot): Promise<void> {
    try {
      await fetch(this.config.reportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });
    } catch { /* 静默失败，不干扰主流程 */ }
  }

  destroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.operationTimes = [];
  }
}
