/** 自动化规则常量 */
export declare const RULE_TRIGGER_TYPES: readonly ["time", "event", "condition", "webhook"];
export declare const RULE_ACTION_TYPES: readonly ["notify", "update", "lock", "archive", "webhook"];
export declare const RULE_TEMPLATES: {
    readonly AUTO_LOCK: {
        readonly name: "自动锁定过期节点";
        readonly trigger: {
            readonly type: "time";
            readonly cron: "0 0 * * *";
        };
        readonly action: {
            readonly type: "lock";
            readonly daysOld: 30;
        };
    };
    readonly PROGRESS_SYNC: {
        readonly name: "进度同步通知";
        readonly trigger: {
            readonly type: "event";
            readonly event: "node-update";
        };
        readonly action: {
            readonly type: "notify";
            readonly channel: "webhook";
        };
    };
};
export declare const RULE_THRESHOLDS: {
    readonly MAX_RULES_PER_FILE: 20;
    readonly MAX_ACTIONS_PER_RULE: 5;
    readonly MIN_TRIGGER_INTERVAL_MS: 60000;
};
//# sourceMappingURL=rule-constant.d.ts.map