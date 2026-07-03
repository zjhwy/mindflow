/**
 * InnerTreeModel - 数据模型
 * 文档第1.2节：统一节点数据结构、类型约束、数据校验
 */
import { InnerLine, LineStyle } from '@mindflow/shared';
import { v4 as uuidv4 } from 'uuid';

export class InnerTreeModel {
  /** 创建新节点 */
  static createLine(
    text: string,
    depth: number,
    parentId: string | null,
    userId = '',
    style?: LineStyle,
  ): InnerLine {
    const now = Date.now();
    return {
      lineId: uuidv4(),
      text,
      depth,
      collapsed: false,
      parentLineId: parentId,
      childrenLineIds: [],
      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        style,
        priority: 0,
      },
    };
  }

  /** 校验节点数据合法性 */
  static validate(lines: InnerLine[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const ids = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.lineId) errors.push(`行${i}: 缺少 lineId`);
      if (ids.has(l.lineId)) errors.push(`行${i}: lineId "${l.lineId}" 重复`);
      ids.add(l.lineId);
      if (typeof l.text !== 'string') errors.push(`行${i}: text 非字符串`);
      if (typeof l.depth !== 'number' || l.depth < 0) errors.push(`行${i}: depth 非法`);
      if (l.text.length > 10_000) errors.push(`行${i}: text 超长`);
    }
    return { valid: errors.length === 0, errors };
  }

  /** 深拷贝节点数组 */
  static clone(lines: InnerLine[]): InnerLine[] {
    return JSON.parse(JSON.stringify(lines));
  }

  /** 获取指定节点的所有子节点 */
  static getChildren(lineId: string, lines: InnerLine[]): InnerLine[] {
    const line = lines.find(l => l.lineId === lineId);
    if (!line) return [];
    return line.childrenLineIds
      .map(id => lines.find(l => l.lineId === id))
      .filter(Boolean) as InnerLine[];
  }

  /** 获取所有后代节点（递归） */
  static getDescendants(lineId: string, lines: InnerLine[]): InnerLine[] {
    const result: InnerLine[] = [];
    const stack = [...this.getChildren(lineId, lines)];
    while (stack.length > 0) {
      const current = stack.pop()!;
      result.push(current);
      stack.push(...this.getChildren(current.lineId, lines));
    }
    return result;
  }
}
