export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  requestId: string;
  timestamp: number;
}

export type {
  InnerLine, InnerTreeOptions, LineStyle, Operation, ViewportRange,
  HistoryAction, GanttLineExt, CalendarLineExt, LineMetadata,
  DataSourceType, AiEnhanceMode, FoldStateMap,
  RecycleItem, DocumentSnapshot, AutomationRule,
  RuleTriggerType, RuleActionType, EngineEvent, EngineCallback,
  // 新增：WPS 原生图形类型
  FlowNode, FlowConnection, FlowDocument,
  Connection, ConnectionStyle, CreateConnectionDto, UpdateConnectionDto,
  ShapeEntry, WpsHostShapeData, AnchorPoint, InlineShape,
  SyncChangeEvent, SyncDirection, AiGenerationResult,
} from './types';
export {
  ViewMode, MindLayoutType, OperationType, NetworkStatus,
  PermissionRole, PermissionLevel,
  // 新增：形状分类
  ShapeCategory,
} from './types';
export type { WpsShapeType, WpsConnectorType } from './types';
export { ERROR_CODE, ERROR_MESSAGE } from './constant/error-code';
export { Z_INDEX } from './constant/z-index';
export { RULE_TRIGGER_TYPES, RULE_ACTION_TYPES, RULE_TEMPLATES, RULE_THRESHOLDS } from './constant/rule-constant';
export { locales, t } from './i18n/index';
export type { Locale } from './i18n/index';
// 新增：形状库与 API 桥接
export {
  WPS_SHAPE_LIBRARY,
  getShapesByCategory,
  getShapeById,
  getShapeCategories,
  SHAPE_CATEGORY_META,
  TOTAL_SHAPE_COUNT,
} from './shapes/shape-library';
export type { ShapeEntry as ShapeLibraryEntry } from './shapes/shape-library';
export {
  detectWpsHost,
  getWpsHostApi,
  isWpsHostAvailable,
  getEnhancedShapeData,
  getShapeSvg,
  getShapeConnectionPoints,
  reconnectWpsHost,
} from './shapes/wps-api-bridge';
// Supabase 客户端（依赖 Vite env，由 editor-ui 独立导入）
// export { supabase } from './supabase/client';
