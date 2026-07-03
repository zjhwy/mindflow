/** 自动化规则常量 */
export const RULE_TRIGGER_TYPES = ['time', 'event', 'condition', 'webhook'] as const;
export const RULE_ACTION_TYPES = ['notify', 'update', 'lock', 'archive', 'webhook'] as const;

export const RULE_TEMPLATES = {
  AUTO_LOCK: {
    name: '自动锁定过期节点',
    trigger: { type: 'time', cron: '0 0 * * *' },
    action: { type: 'lock', daysOld: 30 },
  },
  PROGRESS_SYNC: {
    name: '进度同步通知',
    trigger: { type: 'event', event: 'node-update' },
    action: { type: 'notify', channel: 'webhook' },
  },
} as const;

export const RULE_THRESHOLDS = {
  MAX_RULES_PER_FILE: 20,
  MAX_ACTIONS_PER_RULE: 5,
  MIN_TRIGGER_INTERVAL_MS: 60_000,
} as const;
