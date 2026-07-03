/**
 * AI 输出转换器
 *
 * 将 AI 生成的富元数据 JSON（符合 prompt-engine.ts 中的 Schema）
 * 转换为 InnerLine 格式，完整保留形状、图标、进度、优先级、标签、备注等元数据。
 */

import type { InnerLine, LineMetadata, WpsShapeType } from '@mindflow/shared';
import type { AiNodeOutput, AiMindMapOutput, AiConnectionOutput } from './prompt-engine';

/** 转换后的完整结果 */
export interface ConvertedMindMap {
  lines: InnerLine[];
  centerTopic: string;
  layoutType: string;
  style: string;
  /** 跨节点连线（非父子关系） */
  crossConnections: ConvertedConnection[];
}

export interface ConvertedConnection {
  id: string;
  sourceLineId: string;
  targetLineId: string;
  label?: string;
  type: string;
  color: string;
  width: number;
  dash: string;
}

/** 生成唯一 ID */
function genId(prefix = 'ai'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

/** UUID v4 生成 */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ==================== 形状映射 ====================

const SHAPE_MAP: Record<string, WpsShapeType> = {
  'roundedRect': 'rounded-rect',
  'rounded-rect': 'rounded-rect',
  'rect': 'rect',
  'pill': 'capsule',
  'capsule': 'capsule',
  'diamond': 'flow-decision',
  'parallelogram': 'parallelogram',
  'cylinder': 'cylinder',
  'flag': 'flag-wave',
  'cloud': 'cloud',
  'star': 'star-5',
  'hexagon': 'hexagon',
  'circle': 'circle',
  'ellipse': 'ellipse',
  'triangle': 'triangle',
};

function mapShape(aiShape: string): WpsShapeType {
  return SHAPE_MAP[aiShape] ?? 'rounded-rect';
}

// ==================== 优先级映射 ====================

function mapPriority(aiPriority: string): number {
  switch (aiPriority) {
    case 'P0': return 4;
    case 'P1': return 3;
    case 'P2': return 2;
    case 'P3': return 1;
    default: return 0;
  }
}

// ==================== 标签映射 ====================

function mapTags(aiTags: Array<string | { text: string; color: string }>): string[] {
  return aiTags.map(t => (typeof t === 'string' ? t : t.text)).filter(Boolean);
}

// ==================== 主转换函数 ====================

export function aiOutputToInnerLines(output: AiMindMapOutput): ConvertedMindMap {
  const lines: InnerLine[] = [];
  const crossConnections: ConvertedConnection[] = [];
  const idMap = new Map<string, string>(); // AI ID → 内部 lineId
  const nodeIdReverseMap = new Map<string, string>(); // 内部 lineId → AI ID

  // 1. 转换根节点
  const rootAiId = output.centerTopic.id || uuidv4();
  const rootLineId = genId('root');
  idMap.set(rootAiId, rootLineId);
  nodeIdReverseMap.set(rootLineId, rootAiId);

  const rootMetadata = buildMetadata(output.centerTopic, 0, output.style, true);
  lines.push({
    lineId: rootLineId,
    text: output.centerTopic.text,
    depth: 0,
    collapsed: false,
    parentLineId: null,
    childrenLineIds: [],
    metadata: rootMetadata,
  });

  // 2. 递归转换分支
  const branchIndex = ref(1);
  for (const branch of output.branches) {
    convertNode(branch, 1, rootLineId, lines, crossConnections, idMap, branchIndex, output.centerTopic);
  }

  // 3. 设置父子关系
  const lineMap = new Map(lines.map(l => [l.lineId, l]));
  for (const line of lines) {
    if (line.parentLineId) {
      const parent = lineMap.get(line.parentLineId);
      if (parent) {
        if (!parent.childrenLineIds.includes(line.lineId)) {
          parent.childrenLineIds.push(line.lineId);
        }
      }
    }
  }

  return {
    lines,
    centerTopic: output.centerTopic.text,
    layoutType: output.layoutType ?? 'radial',
    style: output.style ?? 'business',
    crossConnections,
  };
}

// 引用计数器（用于生成索引）
function ref(initial: number): { value: number } {
  return { value: initial };
}

/** 递归转换节点 */
function convertNode(
  aiNode: AiNodeOutput,
  depth: number,
  parentLineId: string,
  lines: InnerLine[],
  crossConnections: ConvertedConnection[],
  idMap: Map<string, string>,
  index: { value: number },
  rootNode?: AiNodeOutput,
): string {
  const aiId = aiNode.id || uuidv4();
  const lineId = genId('nd');
  idMap.set(aiId, lineId);

  const metadata = buildMetadata(aiNode, depth, undefined, false);
  // 子节点索引 = 在 lines 中的插入位置
  const line: InnerLine = {
    lineId,
    text: aiNode.text,
    depth,
    collapsed: false,
    parentLineId,
    childrenLineIds: [],
    metadata,
  };
  lines.push(line);
  index.value++;

  // 处理跨节点连线
  if (aiNode.connections?.length) {
    for (const conn of aiNode.connections) {
      crossConnections.push({
        id: conn.id || uuidv4(),
        sourceLineId: lineId, // 临时存储 AI ID，后续会替换
        targetLineId: conn.targetId,
        label: conn.label,
        type: conn.type,
        color: conn.style?.color ?? '#3B82F6',
        width: conn.style?.width ?? 2,
        dash: conn.style?.dash ?? 'solid',
      });
    }
  }

  // 递归处理子节点
  if (aiNode.children?.length) {
    for (const child of aiNode.children) {
      const childId = convertNode(child, depth + 1, lineId, lines, crossConnections, idMap, index);
      line.childrenLineIds.push(childId);
    }
  }

  return lineId;
}

/** 构建 LineMetadata */
function buildMetadata(
  aiNode: AiNodeOutput,
  depth: number,
  style?: string,
  isRoot?: boolean,
): LineMetadata {
  const metadata: LineMetadata = {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'ai',
    isAiGenerated: true,
    aiGenerateTime: Date.now(),
  };

  // 形状
  const shape = mapShape(aiNode.shape);
  if (shape && shape !== 'rounded-rect') {
    metadata.shapeType = shape;
  }

  // 优先级
  const priority = mapPriority(aiNode.priority);
  if (priority > 0) {
    metadata.priority = priority;
  }

  // 标签
  const tags = mapTags(aiNode.tags);
  if (tags.length > 0) {
    metadata.tags = tags;
  }

  // 风格样式
  if (style || isRoot) {
    if (!metadata.style) metadata.style = {};
    if (isRoot) {
      metadata.style.fontSize = 16;
      metadata.style.fontWeight = 'bold';
    }
    if (depth === 1) {
      metadata.style.fontWeight = '600';
      metadata.style.fontSize = 14;
    }
    // 深色模式
    if (style === 'dark') {
      metadata.style.backgroundColor = '#1E293B';
      metadata.style.color = '#ffffff';
      metadata.style.borderColor = '#334155';
    }
    // 学术模式
    if (style === 'academic') {
      metadata.shapeType = 'rect';
      metadata.style.backgroundColor = '#ffffff';
      metadata.style.borderColor = '#000000';
      metadata.style.color = '#000000';
      metadata.style.fontWeight = 'bold';
    }
  }

  // 内联图形（备注视作 inlineShape 标记）
  if (aiNode.note) {
    metadata.inlineShapes = [{
      type: 'note' as any,
      data: { text: aiNode.note },
    }];
  }

  // 连线样式
  if (style === 'handdrawn') {
    if (!metadata.edgeStyle) metadata.edgeStyle = {};
    metadata.edgeStyle.color = '#E07B39';
    metadata.edgeStyle.pathType = 'curved';
  }

  return metadata;
}

/**
 * 将已有 InnerLine[] 序列化为提示词可用的数组格式
 */
export function innerLinesToAiFormat(lines: InnerLine[]): AiNodeOutput[] {
  const map = new Map(lines.map(l => [l.lineId, l]));
  const roots = lines.filter(l => !l.parentLineId);

  return roots.map(root => {
    return lineToAiNode(root, map);
  });
}

function lineToAiNode(line: InnerLine, map: Map<string, InnerLine>): AiNodeOutput {
  return {
    id: line.lineId,
    text: line.text,
    depth: line.depth,
    shape: line.metadata?.shapeType ?? 'roundedRect',
    connectors: { inputs: 2, outputs: 2 },
    icon: '',
    priority: line.metadata?.priority ? `P${4 - line.metadata.priority}` : 'P2',
    progress: { value: 0, style: 'bar' },
    tags: line.metadata?.tags?.map(t => ({ text: t, color: '#3B82F6' })) ?? [],
    note: '',
    children: line.childrenLineIds?.map(cid => {
      const child = map.get(cid);
      return child ? lineToAiNode(child, map) : null;
    }).filter(Boolean) as AiNodeOutput[],
  };
}
