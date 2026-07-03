export declare const ERROR_CODE: {
    readonly SUCCESS: 0;
    readonly PARAM_ERROR: 1001;
    readonly NETWORK_ERROR: 1002;
    readonly TIMEOUT: 1003;
    readonly PERMISSION_DENY: 2001;
    readonly TOKEN_EXPIRE: 2002;
    readonly DEVICE_REVOKED: 2003;
    readonly DATA_BORDER_BLOCK: 2004;
    readonly DECRYPT_STEP_ERROR: 3001;
    readonly KEY_INVALID: 3002;
    readonly REPLAY_ATTACK: 3003;
    readonly CONTENT_SECURITY_DANGER: 3004;
    readonly AI_LIMIT: 4001;
    readonly AI_AUDIT_FAIL: 4002;
    readonly AI_SERVICE_DOWN: 4003;
    readonly COLLAB_CONFLICT: 5001;
    readonly OFFLINE_SYNC_FAIL: 5002;
    readonly SYNC_VIEWPORT_LIMIT: 5003;
};
export declare const ERROR_MESSAGE: Record<number, string>;
//# sourceMappingURL=error-code.d.ts.map