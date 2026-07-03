/**
 * 导入导出工具 — Markdown / JSON 格式互转 + 文件下载
 */
import { useMindmapStore } from '../stores/mindmap.store';
import type { InnerLine } from '@mindflow/shared';

/** 导出 Mindmap 为 Markdown 缩进文本 */
export function exportMarkdown(): string {
  const store = useMindmapStore();
  const lines = store.lines;
  if (lines.length === 0) return '';
  const result: string[] = [];
  for (const line of lines) {
    const indent = '  '.repeat(line.depth);
    result.push(`${indent}- ${line.text}`);
  }
  return result.join('\n');
}

/** 导出为 JSON（完整数据备份） */
export function exportJSON(): string {
  const store = useMindmapStore();
  const data = {
    name: store.documentName,
    lines: store.lines,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

/** 解析 Markdown 缩进文本为 InnerLine[] */
export function parseMarkdown(text: string): InnerLine[] {
  const lines = text.split('\n').filter(l => l.trim());
  const result: InnerLine[] = [];
  const now = Date.now();

  // 用于 tracking parent IDs
  const stack: InnerLine[] = [];

  for (const rawLine of lines) {
    const indentMatch = rawLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    const content = rawLine.replace(/^\s*-\s*/, '').trim();
    if (!content) continue;

    // depth: 2 spaces = 1 level
    const depth = Math.floor(indent / 2);

    const lineId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const line: InnerLine = {
      lineId,
      text: content,
      depth,
      collapsed: false,
      parentLineId: null,
      childrenLineIds: [],
      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy: '',
        priority: 0,
      },
    };

    // Find parent from stack
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    if (stack.length > 0) {
      const parent = stack[stack.length - 1];
      line.parentLineId = parent.lineId;
      parent.childrenLineIds.push(lineId);
    }
    stack.push(line);
    result.push(line);
  }

  return result;
}

/** 解析 JSON 文件 */
export function parseJSON(text: string): { name: string; lines: InnerLine[] } {
  const data = JSON.parse(text);
  const lines = Array.isArray(data.lines) ? data.lines : (Array.isArray(data) ? data : []);
  const name = data.name ?? '导入的导图';
  return { name, lines };
}

/** 触发文件下载 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 使用 FileReader 读取文件 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}
