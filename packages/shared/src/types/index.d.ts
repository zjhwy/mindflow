/** 节点唯一标识符类型 */
export type LineId = string;
/** 用户唯一标识符类型 */
export type UserId = string;
/** 文件唯一标识符类型 */
export type FileId = string;
/** 视图模式枚举 */
export declare enum ViewMode {
    CANVAS = "canvas",
    OUTLINE = "outline",
    GANTT = "gantt",
    CALENDAR = "calendar",
    KANBAN = "kanban"
}
/** 思维导图布局类型 */
export declare enum MindLayoutType {
    LOGIC_LEFT = "logic-left",
    LOGIC_RIGHT = "logic-right",
    ORG_STRUCTURE = "org-structure",
    FISHBONE = "fishbone",
    TIMELINE = "timeline",
    FREE = "free"
}
/** AI内容处理模式 */
export type AiEnhanceMode = 'expand' | 'polish' | 'simplify';
/** 节点自定义样式标记 */
export interface LineStyle {
    color?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    backgroundColor?: string;
    borderColor?: string;
}
/** 甘特图视图扩展字段 */
export interface GanttLineExt {
    startDate?: string;
    endDate?: string;
    progress?: number;
    dependencyIds?: LineId[];
}
/** 日历视图扩展字段 */
export interface CalendarLineExt {
    date?: string;
    time?: string;
    duration?: number;
    reminder?: boolean;
}
/** 节点元数据 */
export interface LineMetadata {
    createdAt: number;
    updatedAt: number;
    createdBy: UserId;
    style?: LineStyle;
    tags?: string[];
    priority?: number;
    assignee?: UserId;
    isAiGenerated?: boolean;
    aiGenerateTime?: number;
}
/**
 * 内联层级节点核心数据结构 - 文档第2.2节
 * 全局唯一节点数据规范
 */
export interface InnerLine {
    lineId: LineId;
    text: string;
    depth: number;
    collapsed: boolean;
    parentLineId: LineId | null;
    childrenLineIds: LineId[];
    metadata: LineMetadata;
    gantt?: GanttLineExt;
    calendar?: CalendarLineExt;
}
/** 引擎初始化配置选项 */
export interface InnerTreeOptions {
    rootId?: LineId;
    defaultDepth?: number;
    maxUndoSteps?: number;
    enableCollaboration?: boolean;
    enableAutoSave?: boolean;
    autoSaveInterval?: number;
    viewMode?: ViewMode;
    layoutType?: MindLayoutType;
    canvasWidth?: number;
    canvasHeight?: number;
    readOnly?: boolean;
    locale?: string;
}
/** 协同操作类型 */
export declare enum OperationType {
    INSERT = "insert",
    DELETE = "delete",
    UPDATE = "update",
    MOVE = "move",
    FOLD = "fold",
    INDENT = "indent",
    OUTDENT = "outdent"
}
/** 协同变更操作结构 */
export interface Operation {
    type: OperationType;
    lineId: LineId;
    data?: Partial<InnerLine>;
    index?: number;
    timestamp: number;
    userId: UserId;
}
/** 引擎事件类型 */
export type EngineEvent = 'fold-change' | 'content-change' | 'line-move' | 'view-change' | 'data-sync';
/** 引擎事件回调 */
export type EngineCallback = (data: any) => void;
/** 折叠状态映射 */
export type FoldStateMap = Record<LineId, boolean>;
/** 视口同步范围 */
export interface ViewportRange {
    startLineIndex: number;
    endLineIndex: number;
    expandDepth: number;
}
/** 历史操作记录 */
export interface HistoryAction {
    type: OperationType;
    before: Partial<InnerLine> | InnerLine[] | null;
    after: Partial<InnerLine> | InnerLine[] | null;
    timestamp: number;
    userId: UserId;
}
/** 数据绑定源类型 */
export type DataSourceType = 'excel' | 'api' | 'db';
/** 网络状态枚举 */
export declare enum NetworkStatus {
    EXCELLENT = "excellent",
    NORMAL = "normal",
    WEAK = "weak",
    OFFLINE = "offline"
}
/** 权限角色枚举 */
export declare enum PermissionRole {
    ADMIN = "admin",
    EDITOR = "editor",
    VIEWER = "viewer",
    GUEST = "guest",
    SECURE_OPERATOR = "secure-operator"
}
/** 权限级别 */
export declare enum PermissionLevel {
    TEAM = "team",
    DOCUMENT = "document",
    NODE = "node"
}
/** 回收站条目 */
export interface RecycleItem {
    itemId: string;
    fileId: FileId;
    originalData: any;
    deletedAt: number;
    deletedBy: UserId;
    itemType: 'node' | 'document';
    location: string;
}
/** 文档快照 */
export interface DocumentSnapshot {
    snapshotId: string;
    fileId: FileId;
    version: number;
    data: any;
    createdAt: number;
    createdBy: UserId;
    remark?: string;
}
/** 规则触发器类型 */
export type RuleTriggerType = 'time' | 'event' | 'condition' | 'webhook';
/** 规则动作类型 */
export type RuleActionType = 'notify' | 'update' | 'lock' | 'archive' | 'webhook';
/** 自动化规则定义 */
export interface AutomationRule {
    ruleId: string;
    name: string;
    triggerType: RuleTriggerType;
    triggerConfig: Record<string, any>;
    actionType: RuleActionType;
    actionConfig: Record<string, any>;
    enabled: boolean;
    createdBy: UserId;
    createdAt: number;
}
//# sourceMappingURL=index.d.ts.map