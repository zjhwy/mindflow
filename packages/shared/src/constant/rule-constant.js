"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RULE_THRESHOLDS = exports.RULE_TEMPLATES = exports.RULE_ACTION_TYPES = exports.RULE_TRIGGER_TYPES = void 0;
/** 自动化规则常量 */
exports.RULE_TRIGGER_TYPES = ['time', 'event', 'condition', 'webhook'];
exports.RULE_ACTION_TYPES = ['notify', 'update', 'lock', 'archive', 'webhook'];
exports.RULE_TEMPLATES = {
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
};
exports.RULE_THRESHOLDS = {
    MAX_RULES_PER_FILE: 20,
    MAX_ACTIONS_PER_RULE: 5,
    MIN_TRIGGER_INTERVAL_MS: 60000,
};
//# sourceMappingURL=rule-constant.js.map