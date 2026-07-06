// ============================================================
// 核心数据类型定义 - 文档第2.2节 InnerLine 数据结构
// 统一定义所有包共享的核心类型、接口、枚举
// ============================================================

/** 节点唯一标识符类型 */
export type LineId = string;

/** 用户唯一标识符类型 */
export type UserId = string;

/** 文件唯一标识符类型 */
export type FileId = string;

/** 视图模式枚举 */
export enum ViewMode {
  CANVAS = 'canvas',
  OUTLINE = 'outline',
  GANTT = 'gantt',
  CALENDAR = 'calendar',
  KANBAN = 'kanban',
  WHITEBOARD = 'whiteboard',
}

/** 思维导图布局类型 */
export enum MindLayoutType {
  LOGIC_LEFT = 'logic-left',
  LOGIC_RIGHT = 'logic-right',
  ORG_STRUCTURE = 'org-structure',
  FISHBONE = 'fishbone',
  TIMELINE = 'timeline',
  FREE = 'free',
}

/** AI内容处理模式 */
export type AiEnhanceMode = 'expand' | 'polish' | 'simplify';

// ============================================================
// WPS 原生图形类型体系（153+ 形状，8 大分类）
// ============================================================

/** WPS 形状分类（严格匹配软件插入→形状下拉面板） */
export enum ShapeCategory {
  LINES = 'lines',               // 线条（20个）
  RECTANGLES = 'rectangles',     // 矩形（9个）
  BASIC_SHAPES = 'basic-shapes', // 基本形状（36个）
  ARROWS = 'arrows',             // 箭头总汇（28个）
  EQUATION = 'equation',         // 公式形状（8个）
  FLOWCHART = 'flowchart',       // 流程图（22个）
  STARS_FLAGS = 'stars-flags',   // 星与旗帜（14个）
  CALLOUTS = 'callouts',         // 标注（16个）
}

/** WPS 原生形状类型标识（对应 153+ 个具体形状） */
export type WpsShapeType =
  // 线条类
  | 'line' | 'line-single-arrow' | 'line-double-arrow'
  | 'curve' | 'free-curve' | 'free-polygon' | 'free-draw'
  | 'connector-elbow' | 'connector-elbow-arrow' | 'connector-elbow-double-arrow'
  | 'connector-curve' | 'connector-curve-arrow' | 'connector-curve-double-arrow'
  | 'connector-elbow-3pt' | 'connector-elbow-3pt-arrow' | 'connector-elbow-3pt-double-arrow'
  | 'arc-3pt' | 'arc' | 'polyline' | 'freehand-line'
  // 矩形类
  | 'rect' | 'square' | 'rounded-rect' | 'chamfered-rect'
  | 'rounded-chamfered-rect' | 'single-rounded-rect' | 'single-chamfered-rect'
  | 'cube' | 'folded-corner'
  // 基本形状类
  | 'ellipse' | 'circle' | 'triangle' | 'right-triangle' | 'isosceles-triangle'
  | 'trapezoid' | 'isosceles-trapezoid' | 'parallelogram' | 'diamond'
  | 'pentagon' | 'hexagon' | 'heptagon' | 'octagon' | 'decagon' | 'dodecagon'
  | 'notched-rect' | 'cross' | 'cross-outline'
  | 'donut' | 'half-circle' | 'quarter-circle' | 'sector'
  | 'crescent' | 'teardrop' | 'heart' | 'lightning' | 'cloud' | 'smile'
  | 'rounded-triangle' | 'convex-polygon' | 'concave-polygon'
  | 'capsule' | 'racetrack' | 'funnel' | 'cylinder' | 'block-arc'
  // 箭头总汇类
  | 'arrow-right' | 'arrow-left' | 'arrow-up' | 'arrow-down'
  | 'arrow-both-h' | 'arrow-both-v' | 'arrow-quad'
  | 'arrow-ne' | 'arrow-se'
  | 'arrow-turn-left' | 'arrow-turn-right' | 'arrow-turn-up' | 'arrow-turn-down'
  | 'arrow-circular' | 'arrow-chevron' | 'arrow-v' | 'arrow-u'
  | 'arrow-steps' | 'arrow-arc'
  | 'arrow-branch' | 'arrow-merge' | 'arrow-multi'
  | 'arrow-rounded' | 'arrow-3d' | 'arrow-expand' | 'arrow-expand-both'
  | 'arrow-bent' | 'arrow-bent-both' | 'arrow-fold'
  // 公式形状类
  | 'plus' | 'minus' | 'multiply' | 'divide' | 'equal' | 'greater-than' | 'less-than' | 'not-equal'
  // 流程图类
  | 'flow-terminator' | 'flow-process' | 'flow-decision' | 'flow-data'
  | 'flow-document' | 'flow-multi-document' | 'flow-stored-data' | 'flow-disk'
  | 'flow-tape' | 'flow-manual-op' | 'flow-manual-input' | 'flow-preparation'
  | 'flow-connector' | 'flow-merge' | 'flow-summary' | 'flow-delay'
  | 'flow-internal-storage' | 'flow-card' | 'flow-note'
  | 'flow-swimlane' | 'flow-terminator-end' | 'flow-subprocess'
  // 星与旗帜类
  | 'star-4' | 'star-5' | 'star-6' | 'star-8' | 'star-12' | 'star-16'
  | 'star-burst' | 'flag-wave' | 'flag-straight' | 'flag-arc'
  | 'ribbon' | 'ribbon-double' | 'badge-5star' | 'badge-circle'
  | 'burst-jagged'
  // 标注类
  | 'callout-rounded-rect' | 'callout-ellipse' | 'callout-cloud'
  | 'callout-straight' | 'callout-chamfered'
  | 'callout-left' | 'callout-right' | 'callout-up' | 'callout-down'
  | 'callout-multi' | 'callout-heart' | 'callout-star'
  | 'callout-3d' | 'callout-narrow' | 'callout-folded' | 'callout-line';

/** WPS 连接符类型（20 种） */
export type WpsConnectorType =
  | 'straight' | 'straight-arrow' | 'straight-double-arrow'
  | 'elbow' | 'elbow-arrow' | 'elbow-double-arrow'
  | 'curve' | 'curve-arrow' | 'curve-double-arrow'
  | 'elbow-3pt' | 'elbow-3pt-arrow' | 'elbow-3pt-double-arrow'
  | 'arc-connector'
  | 'free-curve-connector'
  | 'polyline-connector'
  | 'elbow-single-arrow' | 'elbow-double-arrow'
  | 'curve-single-arrow' | 'curve-double-arrow'
  | 'freehand-connector';

/** 锚点位置 */
export interface AnchorPoint {
  id: string;
  /** 锚点在图形上的相对位置 (0-1) */
  x: number;
  y: number;
  /** 锚点类型 */
  type: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'custom';
  /** 是否已连接 */
  connected?: boolean;
  /** 连接到的节点/连线 ID */
  connectedTo?: LineId;
}

/** 节点内嵌子图形 */
export interface InlineShape {
  id: string;
  shapeType: WpsShapeType;
  /** 相对于节点左上角的偏移 */
  offsetX: number;
  offsetY: number;
  /** 内嵌图形尺寸 */
  width: number;
  height: number;
  /** 颜色/样式 */
  fill?: string;
  stroke?: string;
}

// ============================================================
// 扩展的 InnerLine 元数据（图形化字段）
// ============================================================

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
  // ---- 新增：WPS 原生图形化字段 ----
  /** 节点形状类型（WPS 原生形状） */
  shapeType?: WpsShapeType;
  /** 连线连接符类型 */
  connectorType?: WpsConnectorType;
  /** 节点内的子图形（内嵌图标/标注） */
  inlineShapes?: InlineShape[];
  /** 节点的连接锚点 */
  anchorPoints?: AnchorPoint[];
  /** 顶点编辑自定义 SVG 路径 */
  customPath?: string;
  /** 形状所属分类 */
  shapeCategory?: ShapeCategory;
  /** 连线样式覆盖（颜色、虚线等） */
  edgeStyle?: { color?: string; dashArray?: string };
  /** 用户手动调整的节点尺寸 */
  nodeSize?: { width: number; height: number };
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
  // 各视图扩展字段（按需懒加载）
  gantt?: GanttLineExt;
  calendar?: CalendarLineExt;
}

// ============================================================
// FlowNode：流程图独立数据模型
// ============================================================

/** 流程图节点（独立于 InnerLine 的第二套数据模型） */
export interface FlowNode {
  flowNodeId: string;
  text: string;
  shapeType: WpsShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 关联的 InnerLine ID（双数据关联键） */
  bindLineId: LineId | null;
  /** 父节点 */
  parentFlowNodeId: string | null;
  /** 子节点 */
  childrenFlowNodeIds: string[];
  /** 连线列表 */
  connections: FlowConnection[];
  /** 样式 */
  style?: LineStyle;
  /** 元数据 */
  metadata?: Partial<LineMetadata>;
}

/** 流程图连线 */
export interface FlowConnection {
  connectionId: string;
  fromNodeId: string;
  toNodeId: string;
  connectorType: WpsConnectorType;
  /** 连线标签（如"通过"/"不通过"） */
  label?: string;
  /** 箭头方向 */
  arrowDirection?: 'forward' | 'backward' | 'both' | 'none';
  /** 连线路径（SVG path d-string） */
  path?: string;
  /** 锚点引用 */
  fromAnchor?: string;
  toAnchor?: string;
}

// ============================================================
// Connection：思维导图独立连线系统
// 允许任意两个节点之间创建自由连线，不受父子树形结构限制
// ============================================================

/** 连线样式配置 */
export interface ConnectionStyle {
  color?: string;
  strokeWidth?: number;
  dashArray?: string;     // 如 '5,5' 虚线, '1,3' 点线
  opacity?: number;
}

/** 思维导图节点间独立连线 */
export interface Connection {
  connectionId: string;
  documentId: string;
  fromLineId: LineId;
  toLineId: LineId;
  connectorType: WpsConnectorType;
  /** 连线标签（显示在连线中段） */
  label?: string;
  /** 箭头方向 */
  arrowDirection?: 'forward' | 'backward' | 'both' | 'none';
  /** 来源锚点位置 */
  fromAnchor?: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  /** 目标锚点位置 */
  toAnchor?: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  /** 连线路径（SVG path d-string，由布局引擎计算） */
  path?: string;
  /** 连线样式 */
  style?: ConnectionStyle;
  /** 创建者 */
  userId?: UserId;
  createdAt: number;
  updatedAt: number;
}

/** 连线创建 DTO */
export interface CreateConnectionDto {
  fromLineId: LineId;
  toLineId: LineId;
  connectorType?: WpsConnectorType;
  label?: string;
  arrowDirection?: 'forward' | 'backward' | 'both' | 'none';
  fromAnchor?: string;
  toAnchor?: string;
  style?: ConnectionStyle;
}

/** 连线更新 DTO */
export interface UpdateConnectionDto {
  connectorType?: WpsConnectorType;
  label?: string;
  arrowDirection?: 'forward' | 'backward' | 'both' | 'none';
  fromAnchor?: string;
  toAnchor?: string;
  path?: string;
  style?: ConnectionStyle;
}

/** 流程图文档 */
export interface FlowDocument {
  flowId: string;
  /** 关联的思维导图 fileId */
  bindFileId: string | null;
  /** 流程节点列表 */
  nodes: FlowNode[];
  /** 视图配置 */
  viewConfig?: {
    scale: number;
    panX: number;
    panY: number;
  };
}

// ============================================================
// Sync 中间层
// ============================================================

/** 数据同步方向 */
export type SyncDirection = 'mindmap-to-flow' | 'flow-to-mindmap';

/** 同步变更事件 */
export interface SyncChangeEvent {
  direction: SyncDirection;
  /** 变更的操作类型 */
  action: 'insert' | 'update' | 'delete' | 'move' | 'fold';
  /** 关联的 lineId */
  lineId?: LineId;
  /** 关联的 flowNodeId */
  flowNodeId?: string;
  /** 变更时间戳 */
  timestamp: number;
  /** 变更来源（'user' | 'ai' | 'sync'） */
  source: 'user' | 'ai' | 'sync';
}

// ============================================================
// 形状库条目类型
// ============================================================

/** 形状库条目（静态数据） */
export interface ShapeEntry {
  id: WpsShapeType;
  name: string;
  nameEn: string;
  category: ShapeCategory;
  /** SVG path d 字符串 */
  svgPath: string;
  /** 默认宽高比 width/height */
  aspectRatio: number;
  /** 连接点位置列表（相对坐标 0-1） */
  connectionPoints: Array<{ x: number; y: number }>;
  /** 是否可编辑顶点 */
  editableVertices: boolean;
  /** 是否可包含文字 */
  canContainText: boolean;
  /** 是否有黄色菱形调节控点 */
  hasAdjustHandle: boolean;
  /** 快捷键提示（如 Shift 约束等比例） */
  shortcut?: string;
}

/** WPS 宿主形状数据（动态获取） */
export interface WpsHostShapeData {
  id: string;
  name: string;
  category: string;
  svgData: string;
  connectionPoints: Array<{ x: number; y: number }>;
  editableVertices: boolean;
  canContainText: boolean;
  defaultSize: { width: number; height: number };
  available: boolean;
}

// ============================================================
// AI 双模态生成
// ============================================================

/** AI 生成结果：一输入两输出 */
export interface AiGenerationResult {
  /** 共享逻辑抽象 */
  sharedLogic: {
    entities: Array<{ id: string; name: string; type: 'process' | 'decision' | 'start' | 'end' | 'data' }>;
    relations: Array<{ from: string; to: string; type: 'flow' | 'hierarchy' | 'dependency'; label?: string }>;
    branches: Array<{ entityId: string; conditions: Array<{ label: string; targetEntityId: string }> }>;
  };
  /** 路径1：思维导图 */
  mindmap: {
    lines: InnerLine[];
    rootId: string;
  };
  /** 路径2：流程图 */
  flowchart: FlowDocument;
}

// ============================================================
// 引擎及相关类型（保持不变）
// ============================================================

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
export enum OperationType {
  INSERT = 'insert',
  DELETE = 'delete',
  UPDATE = 'update',
  MOVE = 'move',
  FOLD = 'fold',
  INDENT = 'indent',
  OUTDENT = 'outdent',
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
export type EngineEvent = 'fold-change' | 'content-change' | 'line-move' | 'view-change' | 'data-sync' | 'sync-change';

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
export enum NetworkStatus {
  EXCELLENT = 'excellent',
  NORMAL = 'normal',
  WEAK = 'weak',
  OFFLINE = 'offline',
}

/** 权限角色枚举 */
export enum PermissionRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  GUEST = 'guest',
  SECURE_OPERATOR = 'secure-operator',
}

/** 权限级别 */
export enum PermissionLevel {
  TEAM = 'team',
  DOCUMENT = 'document',
  NODE = 'node',
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
