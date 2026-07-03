"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_MESSAGE = exports.ERROR_CODE = void 0;
exports.ERROR_CODE = {
    SUCCESS: 0,
    PARAM_ERROR: 1001,
    NETWORK_ERROR: 1002,
    TIMEOUT: 1003,
    PERMISSION_DENY: 2001,
    TOKEN_EXPIRE: 2002,
    DEVICE_REVOKED: 2003,
    DATA_BORDER_BLOCK: 2004,
    DECRYPT_STEP_ERROR: 3001,
    KEY_INVALID: 3002,
    REPLAY_ATTACK: 3003,
    CONTENT_SECURITY_DANGER: 3004,
    AI_LIMIT: 4001,
    AI_AUDIT_FAIL: 4002,
    AI_SERVICE_DOWN: 4003,
    COLLAB_CONFLICT: 5001,
    OFFLINE_SYNC_FAIL: 5002,
    SYNC_VIEWPORT_LIMIT: 5003,
};
exports.ERROR_MESSAGE = {
    0: '操作成功',
    1001: '请求参数非法或缺失',
    1002: '网络连接异常',
    1003: '请求超时',
    2001: '无对应操作权限',
    2002: '登录已过期',
    2003: '设备已被撤销权限',
    2004: '数据跨境访问被阻断',
    3001: '解密步骤错乱',
    3002: '密钥失效',
    3003: '检测到重放攻击',
    3004: '内容安全检测违规',
    4001: 'AI调用超出限流阈值',
    4002: 'AI内容审核不通过',
    4003: 'AI服务降级，暂不可用',
    5001: '协同数据冲突',
    5002: '离线同步失败',
    5003: '视口同步范围超限',
};
//# sourceMappingURL=error-code.js.map