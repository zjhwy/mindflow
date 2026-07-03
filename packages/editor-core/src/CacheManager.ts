/**
 * CacheManager - 分层缓存管理器（新增）
 * 文档第5.2节：视图、节点、状态分层缓存优化
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const DEFAULT_TTL = {
  VIEW: 60_000,      // 视图缓存 1分钟
  NODE: 300_000,     // 节点缓存 5分钟
  STATE: 120_000,    // 状态缓存 2分钟
  TEMPLATE: 3600_000, // 模板缓存 1小时
} as const;

export class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  set<T>(key: string, data: T, ttl = DEFAULT_TTL.NODE): void {
    if (this.memoryCache.size >= this.maxEntries) this.evictOldest();
    this.memoryCache.set(key, { data, timestamp: Date.now(), ttl });
  }

  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /** 本地持久化缓存 */
  setPersistent<T>(key: string, data: T): void {
    try {
      localStorage.setItem(`mindmap-cache:${key}`, JSON.stringify({ data, timestamp: Date.now() }));
    } catch { /* 配额满则忽略 */ }
  }

  getPersistent<T>(key: string, maxAge = DEFAULT_TTL.TEMPLATE): T | null {
    try {
      const raw = localStorage.getItem(`mindmap-cache:${key}`);
      if (!raw) return null;
      const { data, timestamp }: { data: T; timestamp: number } = JSON.parse(raw);
      if (Date.now() - timestamp > maxAge) {
        localStorage.removeItem(`mindmap-cache:${key}`);
        return null;
      }
      return data;
    } catch { return null; }
  }

  invalidate(prefix?: string): void {
    if (!prefix) {
      this.memoryCache.clear();
      return;
    }
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) this.memoryCache.delete(key);
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of this.memoryCache) {
      if (v.timestamp < oldestTime) { oldestTime = v.timestamp; oldestKey = k; }
    }
    if (oldestKey) this.memoryCache.delete(oldestKey);
  }

  destroy(): void {
    this.memoryCache.clear();
  }
}
