/**
 * CollaborativeAdapter - 协同适配器
 * 文档第2.4节：Yjs协同与本地引擎数据双向适配
 */
import * as Y from 'yjs';
import { InnerLine, Operation, OperationType, ViewportRange } from '@mindflow/shared';

export class CollaborativeAdapter {
  public ydoc: Y.Doc;
  public yLines: Y.Array<Y.Map<any>>;
  private remoteObserver: ((event: Y.YArrayEvent<Y.Map<any>>) => void) | null = null;

  constructor(doc?: Y.Doc) {
    this.ydoc = doc ?? new Y.Doc();
    this.yLines = this.ydoc.getArray('mindLines');
  }

  /** 将本地 InnerLine 数组映射为 Yjs 共享数据 */
  toYjs(lines: InnerLine[]): void {
    this.ydoc.transact(() => {
      this.yLines.delete(0, this.yLines.length);
      lines.forEach(line => {
        const map = new Y.Map();
        map.set('lineId', line.lineId);
        map.set('text', line.text);
        map.set('depth', line.depth);
        map.set('collapsed', line.collapsed);
        map.set('parentLineId', line.parentLineId);
        map.set('childrenLineIds', line.childrenLineIds);
        map.set('metadata', line.metadata);
        this.yLines.push([map]);
      });
    });
  }

  /** 将 Yjs 共享数据解析为本地 InnerLine 数组 */
  fromYjs(): InnerLine[] {
    return this.yLines.toArray().map(map => ({
      lineId: map.get('lineId'),
      text: map.get('text'),
      depth: map.get('depth'),
      collapsed: map.get('collapsed'),
      parentLineId: map.get('parentLineId'),
      childrenLineIds: map.get('childrenLineIds'),
      metadata: map.get('metadata'),
    }));
  }

  /** 监听远程用户协同变更 */
  onRemoteChange(callback: (ops: Operation[]) => void): void {
    this.remoteObserver = (event: Y.YArrayEvent<Y.Map<any>>) => {
      const ops = this.parseYjsEvent(event);
      if (ops.length > 0) callback(ops);
    };
    this.yLines.observe(this.remoteObserver);
  }

  /** 解析 Yjs 变更事件为本地 Operation 数组 */
  private parseYjsEvent(event: Y.YArrayEvent<Y.Map<any>>): Operation[] {
    const ops: Operation[] = [];
    const now = Date.now();

    for (const delta of event.changes.delta) {
      if (delta.insert) {
        for (const item of delta.insert as Y.Map<any>[]) {
          ops.push({
            type: OperationType.INSERT,
            lineId: item.get('lineId'),
            data: {
              lineId: item.get('lineId'),
              text: item.get('text'),
              depth: item.get('depth'),
              collapsed: item.get('collapsed'),
              parentLineId: item.get('parentLineId'),
              childrenLineIds: item.get('childrenLineIds'),
              metadata: item.get('metadata'),
            } as unknown as Partial<InnerLine>,
            timestamp: now,
            userId: '',
          });
        }
      }
      if (delta.delete !== undefined) {
        // 删除操作的精确追溯需结合具体实现
        ops.push({
          type: OperationType.DELETE,
          lineId: '',
          timestamp: now,
          userId: '',
        });
      }
    }
    return ops;
  }

  /** 更新当前用户的视口 Awareness 状态 */
  updateViewportState(viewport: ViewportRange): void {
    const awareness = (this.ydoc as any).awareness;
    if (awareness) {
      awareness.setLocalStateField('viewport', viewport);
    }
  }

  /** 清理 */
  destroy(): void {
    if (this.remoteObserver) {
      this.yLines.unobserve(this.remoteObserver);
      this.remoteObserver = null;
    }
    this.ydoc.destroy();
  }
}
