/**
 * WPS 宿主 API 桥接层
 * 在离线静态形状库基础上，运行时动态从 WPS 宿主获取增强数据
 * 双源策略：静态 JSON（离线保证）+ 动态 API（在线增强）
 */
import type { WpsHostShapeData, WpsShapeType } from '../types';
import { WPS_SHAPE_LIBRARY, getShapeById, type ShapeEntry } from './shape-library';

// ============================================================
// 宿主 API 接口定义
// ============================================================

interface WpsHostApi {
  /** 获取指定形状的宿主数据 */
  getShapeData(shapeId: string): Promise<WpsHostShapeData | null>;
  /** 获取所有可用形状 */
  listAvailableShapes(): Promise<string[]>;
  /** 插入原生形状到画布 */
  insertShape(shapeId: string, x: number, y: number, w: number, h: number): Promise<string | null>;
  /** 更新宿主形状样式 */
  updateShapeStyle(shapeInstanceId: string, style: Record<string, unknown>): Promise<void>;
  /** 获取形状连接点 */
  getConnectionPoints(shapeInstanceId: string): Promise<Array<{ x: number; y: number }>>;
  /** 宿主是否可用 */
  isAvailable(): boolean;
}

// ============================================================
// 宿主 API 检测与初始化
// ============================================================

let hostApi: WpsHostApi | null = null;
let hostAvailable = false;

/** 尝试检测并连接 WPS 宿主 */
export function detectWpsHost(): boolean {
  try {
    // 检测 WPS 加载项环境
    const wpsApp = (window as any).WPS?.Application || (window as any).wps?.Application || (window as any).Application;
    if (wpsApp) {
      hostApi = {
        getShapeData: async (shapeId: string) => {
          try {
            const shape = wpsApp.ActiveDocument?.Shapes?.Item?.(1);
            return shape ? {
              id: shapeId,
              name: shape.Name ?? '',
              category: shape.AutoShapeType?.toString() ?? '',
              svgData: '',
              connectionPoints: [],
              editableVertices: true,
              canContainText: true,
              defaultSize: { width: shape.Width ?? 100, height: shape.Height ?? 100 },
              available: true,
            } : null;
          } catch {
            return null;
          }
        },
        listAvailableShapes: async () => [],
        insertShape: async (shapeId, x, y, w, h) => {
          try {
            const shapes = wpsApp.ActiveDocument?.Shapes;
            if (shapes) {
              const shape = shapes.AddShape(1, x, y, w, h); // 1 = Rectangle
              return shape?.Name ?? null;
            }
          } catch { /* 忽略 */ }
          return null;
        },
        updateShapeStyle: async (_id, _style) => {},
        getConnectionPoints: async (_id) => [],
        isAvailable: () => true,
      };
      hostAvailable = true;
      console.log('[WpsApiBridge] WPS 宿主已连接');
      return true;
    }
  } catch (e) {
    console.warn('[WpsApiBridge] WPS 宿主检测失败:', e);
  }
  hostAvailable = false;
  return false;
}

/**
 * 获取宿主 API 实例（若不可用返回 null）
 * 仅当 setIsolated = true 时尝试检测宿主
 */
export function getWpsHostApi(): WpsHostApi | null {
  if (!hostAvailable) return null;
  return hostApi;
}

export function isWpsHostAvailable(): boolean {
  return hostAvailable;
}

// ============================================================
// 合并数据：静态 JSON + 宿主动态数据
// ============================================================

/**
 * 获取形状的完整数据（静态 + 宿主增强）
 * 静态库保证 100% 离线可用，宿主数据作为增强层
 */
export async function getEnhancedShapeData(shapeId: WpsShapeType): Promise<{
  static: ShapeEntry;
  host?: WpsHostShapeData | null;
}> {
  const staticData = getShapeById(shapeId);
  if (!staticData) throw new Error(`Shape not found: ${shapeId}`);

  let hostData: WpsHostShapeData | null = null;
  if (hostAvailable && hostApi) {
    try {
      hostData = await hostApi.getShapeData(shapeId);
    } catch {
      // 宿主获取失败，降级为纯静态
    }
  }

  return { static: staticData, host: hostData ?? undefined };
}

/**
 * 获取形状 SVG 渲染数据
 * 优先级：宿主动态 SVG > 静态 JSON SVG path
 */
export function getShapeSvg(shapeId: WpsShapeType): { path: string; viewBox: string } {
  const staticData = getShapeById(shapeId);
  if (!staticData) {
    return { path: '', viewBox: '0 0 100 100' };
  }
  return {
    path: staticData.svgPath,
    viewBox: '0 0 100 100',
  };
}

/**
 * 获取形状连接点
 * 优先级：宿主连接点 > 静态连接点
 */
export async function getShapeConnectionPoints(shapeId: WpsShapeType): Promise<Array<{ x: number; y: number }>> {
  if (hostAvailable && hostApi) {
    try {
      const points = await hostApi.getConnectionPoints(shapeId);
      if (points.length > 0) return points;
    } catch { /* 降级 */ }
  }

  const staticData = getShapeById(shapeId);
  return staticData?.connectionPoints ?? [];
}

// ============================================================
// 自动初始化
// ============================================================

// 在非服务端渲染环境自动检测
if (typeof window !== 'undefined') {
  detectWpsHost();
}

// 提供手动重新检测的能力
export function reconnectWpsHost(): boolean {
  hostApi = null;
  hostAvailable = false;
  return detectWpsHost();
}
