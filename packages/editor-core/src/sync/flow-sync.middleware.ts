/**
 * InnerLine ↔ FlowNode 数据同步中间层
 *
 * 架构：
 *   InnerLine[]（思维导图核心数据） ←→ FlowDocument（流程图独立数据）
 *                    ↕
 *           FlowSyncMiddleware
 *                    ↕
 *           SyncChangeEvent[] → UI 更新
 *
 * 规则：
 * 1. InnerLine 是主数据源（CRUD 操作先变更 InnerLine）
 * 2. FlowNode 是由 InnerLine 派生的视图数据
 * 3. sync 中间层监听变更事件，自动将 InnerLine 映射为 FlowNode
 * 4. 支持双向同步（用户在流程图中的修改可回写 InnerLine）
 */
import type {
  InnerLine, FlowNode, FlowDocument, FlowConnection,
  SyncChangeEvent, SyncDirection, WpsShapeType, WpsConnectorType,
} from '../types';

// ============================================================
// 同步规则配置
// ============================================================

export interface SyncConfig {
  /** 默认形状映射规则 */
  shapeMapping: ShapeMappingRule[];
  /** 默认连接符 */
  defaultConnector: WpsConnectorType;
  /** 是否自动同步（数据变更立即触发） */
  autoSync: boolean;
  /** 是否双向同步 */
  bidirectional: boolean;
  /** 节点间距 */
  nodeSpacing: { x: number; y: number };
}

interface ShapeMappingRule {
  /** 匹配条件（检查文本/元数据） */
  condition: (line: InnerLine) => boolean;
  /** 映射到的形状类型 */
  shapeType: WpsShapeType;
  /** 优先级（数字越大越优先） */
  priority: number;
}

const DEFAULT_SYNC_CONFIG: SyncConfig = {
  autoSync: true,
  bidirectional: true,
  defaultConnector: 'elbow-arrow',
  nodeSpacing: { x: 180, y: 60 },
  shapeMapping: [
    // 根节点 → 起止框
    { condition: (l) => l.depth === 0, shapeType: 'flow-terminator', priority: 100 },
    // AI 生成的内容可能是决策
    { condition: (l) => l.metadata?.isAiGenerated === true, shapeType: 'flow-process', priority: 50 },
    // 有子节点且深度=1 → 流程处理框
    { condition: (l) => l.childrenLineIds?.length > 0 && l.depth === 1, shapeType: 'flow-process', priority: 80 },
    // 最后一级叶子节点 → 数据框
    { condition: (l) => l.childrenLineIds?.length === 0 && l.depth > 1, shapeType: 'flow-data', priority: 60 },
    // 含特定关键词 → 判断框
    { condition: (l) => /是否|判断|审核|验证|检查/.test(l.text), shapeType: 'flow-decision', priority: 90 },
    // 默认
    { condition: () => true, shapeType: 'rect', priority: 0 },
  ],
};

// ============================================================
// Sync 引擎
// ============================================================

export class FlowSyncMiddleware {
  private config: SyncConfig;
  private listeners: Array<(event: SyncChangeEvent) => void> = [];
  private lastFlowDoc: FlowDocument | null = null;

  constructor(config?: Partial<SyncConfig>) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
  }

  // ---- 事件 ----

  onChange(callback: (event: SyncChangeEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private emit(event: SyncChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  // ============================================================
  // 核心：InnerLine[] → FlowDocument 转换
  // ============================================================

  /**
   * 将思维导图数据同步到流程图
   */
  syncMindmapToFlow(lines: InnerLine[], existingFlow?: FlowDocument): FlowDocument {
    if (lines.length === 0) {
      return {
        flowId: existingFlow?.flowId ?? this.generateId(),
        bindFileId: existingFlow?.bindFileId ?? null,
        nodes: [],
        viewConfig: existingFlow?.viewConfig ?? { scale: 1, panX: 0, panY: 0 },
      };
    }

    const flowId = existingFlow?.flowId ?? this.generateId();
    const existingNodeMap = new Map<string, FlowNode>();
    if (existingFlow) {
      for (const node of existingFlow.nodes) {
        existingNodeMap.set(node.bindLineId ?? '', node);
      }
    }

    // 构建 FlowNode
    const nodes: FlowNode[] = [];
    const lineToFlowNodeMap = new Map<string, string>(); // lineId → flowNodeId

    // 第1遍：创建所有 FlowNode
    for (const line of lines) {
      const existing = existingNodeMap.get(line.lineId);
      const flowNodeId = existing?.flowNodeId ?? this.generateId();
      const shapeType = line.metadata?.shapeType ?? this.inferShapeType(line);

      lineToFlowNodeMap.set(line.lineId, flowNodeId);

      nodes.push({
        flowNodeId,
        text: line.text,
        shapeType,
        x: existing?.x ?? 0,  // 坐标由布局引擎计算
        y: existing?.y ?? 0,
        width: existing?.width ?? 120,
        height: existing?.height ?? 40,
        bindLineId: line.lineId,
        parentFlowNodeId: line.parentLineId ? (lineToFlowNodeMap.get(line.parentLineId) ?? null) : null,
        childrenFlowNodeIds: [],  // 第2遍填充
        connections: existing?.connections ?? [],
        style: line.metadata?.style,
        metadata: line.metadata,
      });
    }

    // 第2遍：填充 childrenFlowNodeIds
    for (const line of lines) {
      const node = nodes.find(n => n.bindLineId === line.lineId);
      if (!node) continue;
      for (const childId of line.childrenLineIds) {
        const childFlowId = lineToFlowNodeMap.get(childId);
        if (childFlowId && !node.childrenFlowNodeIds.includes(childFlowId)) {
          node.childrenFlowNodeIds.push(childFlowId);
        }
      }
    }

    // 第3遍：计算布局坐标
    this.layoutFlowNodes(nodes);

    // 第4遍：生成连接线
    const connections = this.generateFlowConnections(nodes, existingFlow);

    const flowDoc: FlowDocument = {
      flowId,
      bindFileId: existingFlow?.bindFileId ?? null,
      nodes,
      viewConfig: existingFlow?.viewConfig ?? { scale: 1, panX: 0, panY: 0 },
    };

    // 合并 connections
    const nodeMap = new Map(nodes.map(n => [n.flowNodeId, n]));
    for (const conn of connections) {
      const fromNode = nodeMap.get(conn.fromNodeId);
      if (fromNode && !fromNode.connections.some(c => c.toNodeId === conn.toNodeId)) {
        fromNode.connections.push(conn);
      }
    }

    this.lastFlowDoc = flowDoc;
    this.emit({ direction: 'mindmap-to-flow', action: 'update', timestamp: Date.now(), source: 'sync' });

    return flowDoc;
  }

  /**
   * 将流程图的修改回写到思维导图（双向同步）
   */
  syncFlowToMindmap(flowDoc: FlowDocument, lines: InnerLine[]): InnerLine[] {
    const updatedLines = lines.map(l => ({ ...l }));
    const flowNodeMap = new Map(flowDoc.nodes.map(n => [n.bindLineId, n]));

    for (let i = 0; i < updatedLines.length; i++) {
      const line = updatedLines[i];
      const flowNode = flowNodeMap.get(line.lineId);
      if (!flowNode) continue;

      // 回写文本
      if (flowNode.text !== line.text) {
        updatedLines[i].text = flowNode.text;
      }

      // 回写形状类型
      if (flowNode.shapeType !== line.metadata.shapeType) {
        updatedLines[i].metadata.shapeType = flowNode.shapeType;
      }
    }

    this.emit({ direction: 'flow-to-mindmap', action: 'update', timestamp: Date.now(), source: 'sync' });
    return updatedLines;
  }

  // ---- 布局计算 ----

  private layoutFlowNodes(nodes: FlowNode[]): void {
    if (nodes.length === 0) return;

    const spacing = this.config.nodeSpacing;

    // 找到根节点
    const roots = nodes.filter(n => !n.parentFlowNodeId || n.parentFlowNodeId === null);
    if (roots.length === 0) {
      // 按 depth 排序，取 depth 最小的
      nodes.sort((a, b) => {
        const da = a.bindLineId ? (a.metadata as any)?.depth ?? 0 : 0;
        const db = b.bindLineId ? (b.metadata as any)?.depth ?? 0 : 0;
        return da - db;
      });
    }

    // 自上而下、自左而右布局
    let currentY = 50;
    const nodeMap = new Map(nodes.map(n => [n.flowNodeId, n]));

    const layoutSubtree = (nodeId: string, depth: number, startY: number): number => {
      const node = nodeMap.get(nodeId);
      if (!node) return startY;

      // 水平位置按深度递增
      node.x = 80 + depth * spacing.x;
      node.y = startY + 20;
      node.width = 120;
      node.height = 40;

      let nextY = node.y + node.height + spacing.y;

      // 布局子节点
      const sortedChildren = [...node.childrenFlowNodeIds].sort((a, b) => {
        const na = nodeMap.get(a);
        const nb = nodeMap.get(b);
        return (na?.bindLineId ?? '').localeCompare(nb?.bindLineId ?? '');
      });

      for (const childId of sortedChildren) {
        nextY = layoutSubtree(childId, depth + 1, nextY);
      }

      return Math.max(nextY, startY + node.height + spacing.y);
    };

    // 按树状结构排序根节点
    const rootNodes = roots.length > 0 ? roots : nodes.filter(n => {
      const parents = nodes.filter(other => other.childrenFlowNodeIds.includes(n.flowNodeId));
      return parents.length === 0;
    });

    const visited = new Set<string>();
    for (const root of rootNodes) {
      if (visited.has(root.flowNodeId)) continue;
      currentY = layoutSubtree(root.flowNodeId, 0, currentY);

      // 标记已访问
      const mark = (id: string) => {
        visited.add(id);
        const n = nodeMap.get(id);
        for (const cid of n?.childrenFlowNodeIds ?? []) mark(cid);
      };
      mark(root.flowNodeId);
    }

    // 剩余未布局的节点
    for (const node of nodes) {
      if (visited.has(node.flowNodeId)) continue;
      node.x = 80 + (Math.random() * 200);
      node.y = currentY;
      node.width = 120;
      node.height = 40;
      currentY += node.height + spacing.y;
      visited.add(node.flowNodeId);
    }
  }

  // ---- 连线生成 ----

  private generateFlowConnections(nodes: FlowNode[], existingFlow?: FlowDocument): FlowConnection[] {
    const connections: FlowConnection[] = [];
    const nodeMap = new Map(nodes.map(n => [n.flowNodeId, n]));

    for (const node of nodes) {
      for (const childId of node.childrenFlowNodeIds) {
        const child = nodeMap.get(childId);
        if (!child) continue;

        connections.push({
          connectionId: this.generateId(),
          fromNodeId: node.flowNodeId,
          toNodeId: childId,
          connectorType: this.config.defaultConnector,
          arrowDirection: 'forward',
          label: undefined,
        });
      }
    }

    return connections;
  }

  // ---- 形状推断 ----

  private inferShapeType(line: InnerLine): WpsShapeType {
    const rules = [...this.config.shapeMapping].sort((a, b) => b.priority - a.priority);
    for (const rule of rules) {
      if (rule.condition(line)) {
        return rule.shapeType;
      }
    }
    return 'rect';
  }

  // ---- ID 生成 ----

  private generateId(): string {
    return 'sync_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  // ---- 获取当前状态 ----

  getLastFlowDocument(): FlowDocument | null {
    return this.lastFlowDoc;
  }
}

// ============================================================
// 单例导出
// ============================================================

/** 全局 sync 中间件 */
export const flowSyncMiddleware = new FlowSyncMiddleware();
