/**
 * 思维导图布局引擎 — 将 InnerLine[] 转换为带坐标的布局节点
 * 支持 6 种拓扑：logic-right / logic-left / org-structure / timeline / fishbone / free
 */
import { InnerLine, MindLayoutType } from '@mindflow/shared';

// ---- 布局节点 ----

export interface LayoutNode {
  lineId: string;
  text: string;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  childrenLineIds: string[];
  parentLineId: string | null;
  metadata: InnerLine['metadata'];
  subtreeSize: number; // 子树叶子节点数（不含折叠隐藏的）
}

// ---- 配置 ----

export interface LayoutConfig {
  /** 横向间距（每层深度） */
  hGap: number;
  /** 纵向间距（同级节点） */
  vGap: number;
  /** 节点最小宽度 */
  minNodeWidth: number;
  /** 节点内边距 */
  nodePaddingH: number;
  nodePaddingV: number;
  /** 字体大小（用于估算文本宽度） */
  fontSize: number;
  /** 根节点起始 X */
  rootX: number;
  /** 根节点起始 Y */
  rootY: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  hGap: 160,
  vGap: 12,
  minNodeWidth: 80,
  nodePaddingH: 14,
  nodePaddingV: 6,
  fontSize: 14,
  rootX: 60,
  rootY: 300,
};

// ---- 文本宽度估算（中文约 1em，英文约 0.6em）----

function estimateTextWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) {
    w += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? fontSize : fontSize * 0.6;
  }
  return Math.max(w, 20);
}

/** 估算节点尺寸 */
function estimateNodeSize(line: InnerLine, cfg: LayoutConfig, extraHeight = 0): { w: number; h: number } {
  // 用户手动调整的尺寸优先
  if (line.metadata?.nodeSize) {
    return { w: line.metadata.nodeSize.width, h: line.metadata.nodeSize.height + extraHeight };
  }
  const textW = estimateTextWidth(line.text, cfg.fontSize);
  const w = Math.max(textW + cfg.nodePaddingH * 2, cfg.minNodeWidth);
  const h = cfg.fontSize + cfg.nodePaddingV * 2 + 4 + extraHeight;
  return { w, h };
}

// ---- 树节点 ----

interface TreeNode {
  line: InnerLine;
  children: TreeNode[];
  parent: TreeNode | null;
  subtreeSize: number;
}

function buildTree(lines: InnerLine[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const line of lines) {
    map.set(line.lineId, { line: { ...line }, children: [], parent: null, subtreeSize: 1 });
  }

  for (const line of lines) {
    const node = map.get(line.lineId)!;
    if (line.parentLineId && map.has(line.parentLineId)) {
      const parent = map.get(line.parentLineId)!;
      parent.children.push(node);
      node.parent = parent;
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** 递归计算 subtreeSize */
function calcSubtreeSizes(root: TreeNode): number {
  if (root.children.length === 0 || root.line.collapsed) {
    root.subtreeSize = 1;
    return 1;
  }
  let total = 0;
  for (const child of root.children) {
    total += calcSubtreeSizes(child);
  }
  root.subtreeSize = Math.max(total, 1);
  return root.subtreeSize;
}

// ---- 布局：logic-right / logic-left ----

function assignPositions(
  node: TreeNode,
  x: number,
  yTop: number,
  cfg: LayoutConfig,
  result: LayoutNode[],
  isLeft: boolean,
): number {
  const { w, h } = estimateNodeSize(node.line, cfg, getExtraHeight(node.line));

  const nodeY = yTop + (node.subtreeSize - 1) * (h + cfg.vGap) / 2;

  result.push({
    lineId: node.line.lineId,
    text: node.line.text,
    depth: node.line.depth,
    x: isLeft ? x - w : x,
    y: nodeY,
    width: w,
    height: h,
    collapsed: node.line.collapsed,
    childrenLineIds: node.line.childrenLineIds,
    parentLineId: node.line.parentLineId,
    metadata: node.line.metadata,
    subtreeSize: node.subtreeSize,
  });

  let currentY = yTop;
  const childX = isLeft ? x - w - cfg.hGap : x + w + cfg.hGap;

  for (const child of node.children) {
    const nextY = assignPositions(child, childX, currentY, cfg, result, isLeft);
    currentY = nextY;
  }

  return yTop + node.subtreeSize * (h + cfg.vGap);
}

// ---- 布局：组织结构图 (org-structure) ----

function computeOrgLayout(
  root: TreeNode,
  cfg: LayoutConfig,
  result: LayoutNode[],
): void {
  // 根节点：顶部居中
  const rootSize = estimateNodeSize(root.line, cfg);
  const rootX = cfg.rootX;
  const rootY = cfg.rootY;

  result.push({
    lineId: root.line.lineId,
    text: root.line.text,
    depth: root.line.depth,
    x: rootX,
    y: rootY,
    width: rootSize.w,
    height: rootSize.h,
    collapsed: root.line.collapsed,
    childrenLineIds: root.line.childrenLineIds,
    parentLineId: root.line.parentLineId,
    metadata: root.line.metadata,
    subtreeSize: root.subtreeSize,
  });

  if (root.children.length === 0 || root.line.collapsed) return;

  // 递归放置子节点（自上而下）
  orgLayoutChildren(root, rootX, rootY + rootSize.h + cfg.vGap * 3, cfg, result);
}

function orgLayoutChildren(
  node: TreeNode,
  parentCenterX: number,
  startY: number,
  cfg: LayoutConfig,
  result: LayoutNode[],
): number {
  const children = node.children;
  if (children.length === 0 || node.line.collapsed) return startY;

  // 计算所有子节点的宽度
  const childSizes = children.map(c => estimateNodeSize(c.line, cfg, getExtraHeight(c.line)));
  const totalChildWidth = childSizes.reduce((sum, s) => sum + s.w, 0) + (children.length - 1) * cfg.vGap * 2;

  // 子节点中心对齐到父节点中心
  let currentX = parentCenterX - totalChildWidth / 2 + (node.line.depth > 0 ? node.line.depth * 20 : 0);
  let maxHeight = 0;
  let nextY = startY;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childSize = childSizes[i];
    const childX = currentX;
    const childY = startY;

    result.push({
      lineId: child.line.lineId,
      text: child.line.text,
      depth: child.line.depth,
      x: childX,
      y: childY,
      width: childSize.w,
      height: childSize.h,
      collapsed: child.line.collapsed,
      childrenLineIds: child.line.childrenLineIds,
      parentLineId: child.line.parentLineId,
      metadata: child.line.metadata,
      subtreeSize: child.subtreeSize,
    });

    currentX += childSize.w + cfg.vGap * 2;
    maxHeight = Math.max(maxHeight, childSize.h);
  }

  // 递归下一层
  nextY = startY + maxHeight + cfg.vGap * 3;
  for (const child of children) {
    if (child.children.length > 0 && !child.line.collapsed) {
      const childNode = result.find(r => r.lineId === child.line.lineId);
      if (childNode) {
        nextY = orgLayoutChildren(child, childNode.x + childNode.width / 2, nextY, cfg, result);
      }
    }
  }

  return nextY;
}

// ---- 布局：时间线 (timeline) ----

function computeTimelineLayout(
  root: TreeNode,
  cfg: LayoutConfig,
  result: LayoutNode[],
): void {
  const rootSize = estimateNodeSize(root.line, cfg);
  const rootX = cfg.rootX;
  const rootY = cfg.rootY;

  result.push({
    lineId: root.line.lineId,
    text: root.line.text,
    depth: root.line.depth,
    x: rootX,
    y: rootY,
    width: rootSize.w,
    height: rootSize.h,
    collapsed: root.line.collapsed,
    childrenLineIds: root.line.childrenLineIds,
    parentLineId: root.line.parentLineId,
    metadata: root.line.metadata,
    subtreeSize: root.subtreeSize,
  });

  if (root.children.length === 0 || root.line.collapsed) return;

  // 时间线：每个深度一层，水平排列
  let currentDepth = 1;
  let currentX = rootX + rootSize.w + cfg.hGap;

  // 收集每层节点
  const depthMap = new Map<number, TreeNode[]>();
  const collectByDepth = (nodes: TreeNode[], depth: number) => {
    for (const n of nodes) {
      if (!depthMap.has(depth)) depthMap.set(depth, []);
      depthMap.get(depth)!.push(n);
      if (!n.line.collapsed) {
        collectByDepth(n.children, depth + 1);
      }
    }
  };
  collectByDepth(root.children, currentDepth);

  // 按深度排列
  let yOffset = cfg.rootY;
  const sortedDepths = [...depthMap.keys()].sort((a, b) => a - b);

  for (const depth of sortedDepths) {
    const nodesAtDepth = depthMap.get(depth)!;
    const x = rootX + rootSize.w + cfg.hGap * depth;

    for (const node of nodesAtDepth) {
      const size = estimateNodeSize(node.line, cfg, getExtraHeight(node.line));
      const nodeY = yOffset;

      result.push({
        lineId: node.line.lineId,
        text: node.line.text,
        depth: node.line.depth,
        x,
        y: nodeY,
        width: size.w,
        height: size.h,
        collapsed: node.line.collapsed,
        childrenLineIds: node.line.childrenLineIds,
        parentLineId: node.line.parentLineId,
        metadata: node.line.metadata,
        subtreeSize: node.subtreeSize,
      });

      yOffset += size.h + cfg.vGap;
    }

    yOffset += cfg.vGap * 2; // 层级间距
  }
}

// ---- 布局：鱼骨图 (fishbone / Ishikawa diagram) ----

function computeFishboneLayout(
  root: TreeNode,
  cfg: LayoutConfig,
  result: LayoutNode[],
): void {
  // 鱼骨图：主干水平，分支斜向两侧
  const rootSize = estimateNodeSize(root.line, cfg);
  const rootX = cfg.rootX;
  const rootY = cfg.rootY;

  result.push({
    lineId: root.line.lineId,
    text: root.line.text,
    depth: root.line.depth,
    x: rootX,
    y: rootY,
    width: rootSize.w,
    height: rootSize.h,
    collapsed: root.line.collapsed,
    childrenLineIds: root.line.childrenLineIds,
    parentLineId: root.line.parentLineId,
    metadata: root.line.metadata,
    subtreeSize: root.subtreeSize,
  });

  if (root.children.length === 0 || root.line.collapsed) return;

  // 主干从根节点延伸到右侧
  const spineLength = cfg.hGap * 3;
  const spineY = rootY + rootSize.h / 2;

  // 大骨（大类别）：斜向45度，上下交替
  const categories = root.children;
  const upperCategories = categories.filter((_, i) => i % 2 === 0);
  const lowerCategories = categories.filter((_, i) => i % 2 === 1);

  const bigBoneLength = 80;
  const bigBoneGap = 30;

  // 上侧大骨（向右上方）
  upperCategories.forEach((cat, idx) => {
    const startX = rootX + rootSize.w + bigBoneGap + idx * bigBoneLength;
    const startY = spineY;
    const endX = startX + bigBoneLength * 0.7;
    const endY = startY - bigBoneLength * 0.7;

    const catSize = estimateNodeSize(cat.line, cfg, getExtraHeight(cat.line));
    const nodeX = endX - catSize.w / 2;
    const nodeY = endY - catSize.h / 2;

    result.push({
      lineId: cat.line.lineId,
      text: cat.line.text,
      depth: cat.line.depth,
      x: nodeX,
      y: nodeY,
      width: catSize.w,
      height: catSize.h,
      collapsed: cat.line.collapsed,
      childrenLineIds: cat.line.childrenLineIds,
      parentLineId: cat.line.parentLineId,
      metadata: cat.line.metadata,
      subtreeSize: cat.subtreeSize,
    });

    // 中骨和小骨
    if (cat.children.length > 0 && !cat.line.collapsed) {
      const smallBoneLength = 40;
      const smallBoneGap = 25;

      cat.children.forEach((child, cidx) => {
        const childSize = estimateNodeSize(child.line, cfg, getExtraHeight(child.line));
        const cStartX = endX + smallBoneGap + cidx * smallBoneLength;
        const cStartY = endY;
        const cEndX = cStartX + smallBoneLength * 0.5;
        const cEndY = cStartY + (cidx % 2 === 0 ? -smallBoneLength * 0.5 : smallBoneLength * 0.5);

        const cNodeX = cEndX - childSize.w / 2;
        const cNodeY = cEndY - childSize.h / 2;

        result.push({
          lineId: child.line.lineId,
          text: child.line.text,
          depth: child.line.depth,
          x: cNodeX,
          y: cNodeY,
          width: childSize.w,
          height: childSize.h,
          collapsed: child.line.collapsed,
          childrenLineIds: child.line.childrenLineIds,
          parentLineId: child.line.parentLineId,
          metadata: child.line.metadata,
          subtreeSize: child.subtreeSize,
        });

        // 递归处理更深的节点
        layoutFishboneChildren(child, cEndX, cEndY, childSize, cfg, result);
      });
    }
  });

  // 下侧大骨（向右下方）
  lowerCategories.forEach((cat, idx) => {
    const startX = rootX + rootSize.w + bigBoneGap + idx * bigBoneLength;
    const startY = spineY;
    const endX = startX + bigBoneLength * 0.7;
    const endY = startY + bigBoneLength * 0.7;

    const catSize = estimateNodeSize(cat.line, cfg, getExtraHeight(cat.line));
    const nodeX = endX - catSize.w / 2;
    const nodeY = endY - catSize.h / 2;

    result.push({
      lineId: cat.line.lineId,
      text: cat.line.text,
      depth: cat.line.depth,
      x: nodeX,
      y: nodeY,
      width: catSize.w,
      height: catSize.h,
      collapsed: cat.line.collapsed,
      childrenLineIds: cat.line.childrenLineIds,
      parentLineId: cat.line.parentLineId,
      metadata: cat.line.metadata,
      subtreeSize: cat.subtreeSize,
    });

    // 中骨和小骨
    if (cat.children.length > 0 && !cat.line.collapsed) {
      const smallBoneLength = 40;
      const smallBoneGap = 25;

      cat.children.forEach((child, cidx) => {
        const childSize = estimateNodeSize(child.line, cfg, getExtraHeight(child.line));
        const cStartX = endX + smallBoneGap + cidx * smallBoneLength;
        const cStartY = endY;
        const cEndX = cStartX + smallBoneLength * 0.5;
        const cEndY = cStartY + (cidx % 2 === 0 ? smallBoneLength * 0.5 : -smallBoneLength * 0.5);

        const cNodeX = cEndX - childSize.w / 2;
        const cNodeY = cEndY - childSize.h / 2;

        result.push({
          lineId: child.line.lineId,
          text: child.line.text,
          depth: child.line.depth,
          x: cNodeX,
          y: cNodeY,
          width: childSize.w,
          height: childSize.h,
          collapsed: child.line.collapsed,
          childrenLineIds: child.line.childrenLineIds,
          parentLineId: child.line.parentLineId,
          metadata: child.line.metadata,
          subtreeSize: child.subtreeSize,
        });

        layoutFishboneChildren(child, cEndX, cEndY, childSize, cfg, result);
      });
    }
  });
}

function layoutFishboneChildren(
  node: TreeNode,
  parentX: number,
  parentY: number,
  parentSize: { w: number; h: number },
  cfg: LayoutConfig,
  result: LayoutNode[],
): void {
  if (node.children.length === 0 || node.line.collapsed) return;

  const smallBoneLength = 35;
  const smallBoneGap = 20;
  const isUpperSide = parentY < cfg.rootY + 100; // 简单判断上下侧

  node.children.forEach((child, idx) => {
    const childSize = estimateNodeSize(child.line, cfg, getExtraHeight(child.line));
    const cStartX = parentX + smallBoneGap;
    const cStartY = parentY;
    const yOffset = isUpperSide
      ? (idx % 2 === 0 ? -smallBoneLength * 0.4 : smallBoneLength * 0.4)
      : (idx % 2 === 0 ? smallBoneLength * 0.4 : -smallBoneLength * 0.4);
    const cEndX = cStartX + smallBoneLength * 0.5;
    const cEndY = cStartY + yOffset;

    const cNodeX = cEndX - childSize.w / 2;
    const cNodeY = cEndY - childSize.h / 2;

    result.push({
      lineId: child.line.lineId,
      text: child.line.text,
      depth: child.line.depth,
      x: cNodeX,
      y: cNodeY,
      width: childSize.w,
      height: childSize.h,
      collapsed: child.line.collapsed,
      childrenLineIds: child.line.childrenLineIds,
      parentLineId: child.line.parentLineId,
      metadata: child.line.metadata,
      subtreeSize: child.subtreeSize,
    });

    layoutFishboneChildren(child, cEndX, cEndY, childSize, cfg, result);
  });
}

// ---- 布局：放射状 (radial) ----

function computeRadialLayout(
  roots: TreeNode[],
  cfg: LayoutConfig,
  result: LayoutNode[],
): void {
  if (roots.length === 0) return;

  const root = roots[0];
  const rootSize = estimateNodeSize(root.line, cfg);
  const centerX = cfg.rootX + 400;
  const centerY = cfg.rootY + 300;

  result.push({
    lineId: root.line.lineId,
    text: root.line.text,
    depth: root.line.depth,
    x: centerX - rootSize.w / 2,
    y: centerY - rootSize.h / 2,
    width: rootSize.w,
    height: rootSize.h,
    collapsed: root.line.collapsed,
    childrenLineIds: root.line.childrenLineIds,
    parentLineId: root.line.parentLineId,
    metadata: root.line.metadata,
    subtreeSize: root.subtreeSize,
  });

  if (root.children.length === 0 || root.line.collapsed) return;

  // 圆形排列子节点
  const childCount = root.children.length;
  const radius = cfg.hGap * 1.5;
  const startAngle = -Math.PI / 2; // 从顶部开始

  root.children.forEach((child, idx) => {
    const angle = startAngle + (2 * Math.PI * idx) / childCount;
    const childSize = estimateNodeSize(child.line, cfg, getExtraHeight(child.line));

    const childX = centerX + radius * Math.cos(angle) - childSize.w / 2;
    const childY = centerY + radius * Math.sin(angle) - childSize.h / 2;

    result.push({
      lineId: child.line.lineId,
      text: child.line.text,
      depth: child.line.depth,
      x: childX,
      y: childY,
      width: childSize.w,
      height: childSize.h,
      collapsed: child.line.collapsed,
      childrenLineIds: child.line.childrenLineIds,
      parentLineId: child.line.parentLineId,
      metadata: child.line.metadata,
      subtreeSize: child.subtreeSize,
    });

    // 递归放置孙节点
    layoutRadialChildren(child, centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle), cfg, result);
  });
}

function layoutRadialChildren(
  node: TreeNode,
  parentX: number,
  parentY: number,
  cfg: LayoutConfig,
  result: LayoutNode[],
): void {
  if (node.children.length === 0 || node.line.collapsed) return;

  const childCount = node.children.length;
  const radius = cfg.hGap * 0.8;
  const startAngle = Math.atan2(parentY - cfg.rootY - 300, parentX - cfg.rootX - 400) - Math.PI / 4;

  node.children.forEach((child, idx) => {
    const angle = startAngle + (Math.PI / 2) * (idx / Math.max(childCount - 1, 1) - 0.5);
    const childSize = estimateNodeSize(child.line, cfg, getExtraHeight(child.line));

    const childX = parentX + radius * Math.cos(angle) - childSize.w / 2;
    const childY = parentY + radius * Math.sin(angle) - childSize.h / 2;

    result.push({
      lineId: child.line.lineId,
      text: child.line.text,
      depth: child.line.depth,
      x: childX,
      y: childY,
      width: childSize.w,
      height: childSize.h,
      collapsed: child.line.collapsed,
      childrenLineIds: child.line.childrenLineIds,
      parentLineId: child.line.parentLineId,
      metadata: child.line.metadata,
      subtreeSize: child.subtreeSize,
    });

    layoutRadialChildren(child, parentX + radius * Math.cos(angle), parentY + radius * Math.sin(angle), cfg, result);
  });
}

// ---- 计算节点额外高度（用于 tags、priority 等标记）----

function getExtraHeight(line: InnerLine): number {
  let h = 0;
  if (line.metadata?.tags?.length) h += 18;
  if (line.metadata?.priority) h += 4;
  if (line.metadata?.isAiGenerated) h += 4;
  return h;
}

// ---- 公开 API ----

/**
 * 计算布局，返回带坐标的 LayoutNode[]
 */
export function calculateLayout(
  lines: InnerLine[],
  layoutType: MindLayoutType = MindLayoutType.LOGIC_RIGHT,
  config: Partial<LayoutConfig> = {},
): LayoutNode[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const roots = buildTree(lines);

  const result: LayoutNode[] = [];

  switch (layoutType) {
    case MindLayoutType.ORG_STRUCTURE:
      for (const root of roots) {
        calcSubtreeSizes(root);
        computeOrgLayout(root, cfg, result);
      }
      break;

    case MindLayoutType.TIMELINE:
      for (const root of roots) {
        calcSubtreeSizes(root);
        computeTimelineLayout(root, cfg, result);
      }
      break;

    case MindLayoutType.FISHBONE:
      for (const root of roots) {
        calcSubtreeSizes(root);
        computeFishboneLayout(root, cfg, result);
      }
      break;

    case MindLayoutType.LOGIC_LEFT:
      // 左侧布局：根在最右，子节点向左生长
      for (const root of roots) {
        calcSubtreeSizes(root);
        assignPositions(root, cfg.rootX + 400, 0, cfg, result, true);
      }
      break;

    case MindLayoutType.LOGIC_RIGHT:
    case MindLayoutType.FREE:
    default:
      // 默认右侧布局
      for (const root of roots) {
        calcSubtreeSizes(root);
        assignPositions(root, cfg.rootX, 0, cfg, result, false);
      }
      break;
  }

  return result;
}

/**
 * 获取布局的边界框
 */
export function getBounds(nodes: LayoutNode[]): { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number } {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600, w: 800, h: 600 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX + 100, h: maxY - minY + 100 };
}
