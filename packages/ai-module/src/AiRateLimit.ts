/** AiRateLimit - AI限流熔断管理器 文档第2.5.3节 */
export class AiRateLimit {
  private counters = new Map<string, { count: number; resetAt: number }>();
  constructor(private perMinLimit = 5, private globalQps = 50) {}
  checkLimit(userId: string): boolean {
    const now = Date.now();
    const entry = this.counters.get(userId);
    if (!entry || now > entry.resetAt) { this.counters.set(userId, { count: 1, resetAt: now + 60000 }); return true; }
    if (entry.count >= this.perMinLimit) return false;
    entry.count++; return true;
  }
  reset() { this.counters.clear(); }
}
