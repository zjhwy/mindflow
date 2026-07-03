/**
 * 规则触发器 - 文档第1.2节
 * 支持时间触发、事件触发、条件触发、Webhook触发
 */
import { AutomationRule, RuleTriggerType } from '@mindflow/shared';

export interface TriggerContext {
  rule: AutomationRule;
  eventType?: string;
  eventPayload?: Record<string, any>;
  currentTime?: number;
  nodeData?: Record<string, any>;
  fileData?: Record<string, any>;
}

export type TriggerCallback = (context: TriggerContext) => void;

export class RuleTrigger {
  private listeners = new Map<string, Set<TriggerCallback>>();
  private timeIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private eventHooks = new Map<string, Set<string>>(); // eventType -> ruleIds
  private conditionCache = new Map<string, boolean>();
  private rulesStore = new Map<string, AutomationRule>();

  // ==================== 规则注册 ====================

  register(rule: AutomationRule, callback: TriggerCallback): void {
    this.rulesStore.set(rule.ruleId, rule);

    if (!this.listeners.has(rule.ruleId)) {
      this.listeners.set(rule.ruleId, new Set());
    }
    this.listeners.get(rule.ruleId)!.add(callback);

    // 根据触发类型设置自动检测
    switch (rule.triggerType) {
      case 'time':
        this.scheduleTimeTrigger(rule, callback);
        break;
      case 'event':
        this.bindEventTrigger(rule);
        break;
      case 'webhook':
        // Webhook由外部HTTP触发器调用，仅注册映射
        break;
      case 'condition':
        // 条件触发在 evaluateConditions 时逐一检查
        break;
    }
  }

  unregister(ruleId: string): void {
    const rule = this.rulesStore.get(ruleId);
    this.listeners.delete(ruleId);
    this.rulesStore.delete(ruleId);

    // 清理定时器
    const timer = this.timeIntervals.get(ruleId);
    if (timer) {
      clearInterval(timer);
      this.timeIntervals.delete(ruleId);
    }

    // 清理事件绑定
    if (rule) {
      this.eventHooks.forEach((ruleIds, eventType) => {
        ruleIds.delete(ruleId);
        if (ruleIds.size === 0) this.eventHooks.delete(eventType);
      });
    }
  }

  clear(): void {
    this.timeIntervals.forEach((timer) => clearInterval(timer));
    this.timeIntervals.clear();
    this.listeners.clear();
    this.rulesStore.clear();
    this.eventHooks.clear();
    this.conditionCache.clear();
  }

  // ==================== 触发执行 ====================

  /** 按 ruleId 触发（兼容旧接口） */
  fire(ruleId: string, extra?: Record<string, any>): void {
    const rule = this.rulesStore.get(ruleId);
    if (!rule || !rule.enabled) return;

    const context: TriggerContext = {
      rule,
      currentTime: Date.now(),
      ...extra,
    };

    this.listeners.get(ruleId)?.forEach((cb) => {
      try {
        cb(context);
      } catch (err) {
        console.error(`[RuleTrigger] 规则 ${ruleId} 回调异常:`, err);
      }
    });
  }

  /** 按事件类型触发关联的所有规则 */
  fireByEvent(eventType: string, eventPayload?: Record<string, any>): void {
    const ruleIds = this.eventHooks.get(eventType);
    if (!ruleIds) return;

    const ctx = { eventType, eventPayload, currentTime: Date.now() };
    for (const ruleId of ruleIds) {
      const rule = this.rulesStore.get(ruleId);
      if (rule && rule.enabled) {
        this.fire(ruleId, ctx);
      }
    }
  }

  // ==================== 条件匹配 ====================

  /**
   * 条件触发检测 - 文档第1.2节核心
   * 支持节点级和文件级条件判断
   */
  evaluateConditions(context: TriggerContext): boolean {
    const { rule, nodeData, fileData, currentTime } = context;
    if (!rule || !rule.triggerConfig) return false;

    const config = rule.triggerConfig;

    // 时间条件
    if (config.timeRange) {
      const { start, end } = config.timeRange;
      const now = new Date(currentTime ?? Date.now());
      const hours = now.getHours() * 60 + now.getMinutes();
      if (!this.isTimeInRange(hours, start, end)) return false;
    }

    // 节点条件
    if (nodeData && config.nodeCondition) {
      if (!this.matchCondition(config.nodeCondition, nodeData)) return false;
    }

    // 文件条件
    if (fileData && config.fileCondition) {
      if (!this.matchCondition(config.fileCondition, fileData)) return false;
    }

    // 数字比较
    if (config.threshold !== undefined) {
      const target = nodeData?.[config.targetField] ?? fileData?.[config.targetField];
      if (target === undefined) return false;
      if (!this.compareThreshold(Number(target), config.threshold, config.comparator ?? 'gte')) return false;
    }

    return true;
  }

  /** 对外暴露条件检测 */
  testConditions(ruleId: string, context: Omit<TriggerContext, 'rule'>): boolean {
    const rule = this.rulesStore.get(ruleId);
    if (!rule) return false;
    return this.evaluateConditions({ ...context, rule });
  }

  // ---- 内部条件匹配方法 ----

  private matchCondition(condition: Record<string, any>, target: Record<string, any>): boolean {
    for (const [key, expected] of Object.entries(condition)) {
      const actual = target[key];
      if (expected instanceof Object && typeof expected === 'object' && !Array.isArray(expected)) {
        // 嵌套条件
        if (typeof actual === 'object' && actual !== null) {
          if (!this.matchCondition(expected, actual)) return false;
        } else {
          return false;
        }
      } else if (actual !== expected) {
        return false;
      }
    }
    return true;
  }

  private compareThreshold(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      default: return value >= threshold;
    }
  }

  private isTimeInRange(minutes: number, startMin: number, endMin: number): boolean {
    if (startMin <= endMin) {
      return minutes >= startMin && minutes <= endMin;
    }
    // 跨天 (如 22:00 - 06:00)
    return minutes >= startMin || minutes <= endMin;
  }

  // ---- 调度器 ----

  private scheduleTimeTrigger(rule: AutomationRule, callback: TriggerCallback): void {
    const interval = rule.triggerConfig?.intervalMs ?? 60000; // 默认每分钟
    const timer = setInterval(() => {
      if (!rule.enabled) return;
      const context: TriggerContext = {
        rule,
        currentTime: Date.now(),
      };
      if (this.evaluateConditions(context)) {
        callback(context);
      }
    }, interval);
    this.timeIntervals.set(rule.ruleId, timer);
  }

  private bindEventTrigger(rule: AutomationRule): void {
    const eventTypes: string[] = rule.triggerConfig?.eventTypes ?? [];
    for (const et of eventTypes) {
      if (!this.eventHooks.has(et)) {
        this.eventHooks.set(et, new Set());
      }
      this.eventHooks.get(et)!.add(rule.ruleId);
    }
  }

  // ==================== 查询接口 ====================

  getRegisteredRules(): AutomationRule[] {
    return Array.from(this.rulesStore.values());
  }

  getRule(ruleId: string): AutomationRule | undefined {
    return this.rulesStore.get(ruleId);
  }

  enableRule(ruleId: string): void {
    const rule = this.rulesStore.get(ruleId);
    if (rule) rule.enabled = true;
  }

  disableRule(ruleId: string): void {
    const rule = this.rulesStore.get(ruleId);
    if (rule) rule.enabled = false;
  }

  /** 获取当前活跃的定时任务数 */
  getActiveTimerCount(): number {
    return this.timeIntervals.size;
  }

  /** 获取当前绑定事件类型数 */
  getActiveEventCount(): number {
    return this.eventHooks.size;
  }
}
