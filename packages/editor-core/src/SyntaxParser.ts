/**
 * SyntaxParser - 语法解析器
 * 文档第1.2节：结构化文本自动转层级导图
 */
import { InnerLine, LineStyle } from '@mindflow/shared';
import { v4 as uuidv4 } from 'uuid';

export class SyntaxParser {
  /** 文本缩进转导图节点 */
  parseIndented(text: string): InnerLine[] {
    const lines = text.split('\n').filter(l => l.trim());
    const nodes: InnerLine[] = [];
    const now = Date.now();
    for (const raw of lines) {
      const indent = raw.search(/\S/);
      const depth = Math.floor(indent / 2);
      const content = raw.trim();
      nodes.push({
        lineId: uuidv4(),
        text: content,
        depth,
        collapsed: false,
        parentLineId: null,
        childrenLineIds: [],
        metadata: { createdAt: now, updatedAt: now, createdBy: '', priority: 0 },
      });
    }
    return nodes;
  }

  /** Markdown标题层级转导图 */
  parseMarkdown(text: string): InnerLine[] {
    const lines = text.split('\n').filter(l => l.trim());
    const nodes: InnerLine[] = [];
    const now = Date.now();
    for (const raw of lines) {
      const match = raw.match(/^(#{1,6})\s+(.+)/);
      if (!match) continue;
      const depth = match[1].length - 1;
      const content = match[2];
      nodes.push({
        lineId: uuidv4(),
        text: content,
        depth,
        collapsed: false,
        parentLineId: null,
        childrenLineIds: [],
        metadata: { createdAt: now, updatedAt: now, createdBy: '', priority: 0 },
      });
    }
    return nodes;
  }

  /** 导图节点导出为缩进文本 */
  exportIndented(nodes: InnerLine[]): string {
    return nodes.map(n => '  '.repeat(n.depth) + n.text).join('\n');
  }

  /** 导图节点导出为 Markdown */
  exportMarkdown(nodes: InnerLine[]): string {
    return nodes.map(n => '#'.repeat(n.depth + 1) + ' ' + n.text).join('\n');
  }
}
