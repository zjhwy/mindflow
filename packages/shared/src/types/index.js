"use strict";
// ============================================================
// 核心数据类型定义 - 文档第2.2节 InnerLine 数据结构
// 统一定义所有包共享的核心类型、接口、枚举
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionLevel = exports.PermissionRole = exports.NetworkStatus = exports.OperationType = exports.MindLayoutType = exports.ViewMode = void 0;
/** 视图模式枚举 */
var ViewMode;
(function (ViewMode) {
    ViewMode["CANVAS"] = "canvas";
    ViewMode["OUTLINE"] = "outline";
    ViewMode["GANTT"] = "gantt";
    ViewMode["CALENDAR"] = "calendar";
    ViewMode["KANBAN"] = "kanban";
})(ViewMode || (exports.ViewMode = ViewMode = {}));
/** 思维导图布局类型 */
var MindLayoutType;
(function (MindLayoutType) {
    MindLayoutType["LOGIC_LEFT"] = "logic-left";
    MindLayoutType["LOGIC_RIGHT"] = "logic-right";
    MindLayoutType["ORG_STRUCTURE"] = "org-structure";
    MindLayoutType["FISHBONE"] = "fishbone";
    MindLayoutType["TIMELINE"] = "timeline";
    MindLayoutType["FREE"] = "free";
})(MindLayoutType || (exports.MindLayoutType = MindLayoutType = {}));
/** 协同操作类型 */
var OperationType;
(function (OperationType) {
    OperationType["INSERT"] = "insert";
    OperationType["DELETE"] = "delete";
    OperationType["UPDATE"] = "update";
    OperationType["MOVE"] = "move";
    OperationType["FOLD"] = "fold";
    OperationType["INDENT"] = "indent";
    OperationType["OUTDENT"] = "outdent";
})(OperationType || (exports.OperationType = OperationType = {}));
/** 网络状态枚举 */
var NetworkStatus;
(function (NetworkStatus) {
    NetworkStatus["EXCELLENT"] = "excellent";
    NetworkStatus["NORMAL"] = "normal";
    NetworkStatus["WEAK"] = "weak";
    NetworkStatus["OFFLINE"] = "offline";
})(NetworkStatus || (exports.NetworkStatus = NetworkStatus = {}));
/** 权限角色枚举 */
var PermissionRole;
(function (PermissionRole) {
    PermissionRole["ADMIN"] = "admin";
    PermissionRole["EDITOR"] = "editor";
    PermissionRole["VIEWER"] = "viewer";
    PermissionRole["GUEST"] = "guest";
    PermissionRole["SECURE_OPERATOR"] = "secure-operator";
})(PermissionRole || (exports.PermissionRole = PermissionRole = {}));
/** 权限级别 */
var PermissionLevel;
(function (PermissionLevel) {
    PermissionLevel["TEAM"] = "team";
    PermissionLevel["DOCUMENT"] = "document";
    PermissionLevel["NODE"] = "node";
})(PermissionLevel || (exports.PermissionLevel = PermissionLevel = {}));
//# sourceMappingURL=index.js.map