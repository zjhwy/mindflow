import { Injectable } from '@nestjs/common';
import { RecycleItem } from '@mindflow/shared';

export class SoftDeleteDto {
  fileId!: string;
  itemId?: string;
  itemType!: 'node' | 'document';
  originalData!: any;
  location?: string;
  itemName?: string;
}

export class RecycleListQuery {
  page?: number = 1;
  pageSize?: number = 20;
  itemType?: 'node' | 'document';
}

@Injectable()
export class RecycleService {
  private recycleBin: (RecycleItem & { itemName?: string })[] = [];

  // 回收站保留天数 (默认 30)
  private retentionDays = 30;
  // 自动清理定时器
  private autoCleanTimer: ReturnType<typeof setInterval> | null = null;

  onModuleInit(): void {
    // 每小时自动清理过期条目
    this.autoCleanTimer = setInterval(() => this.purgeExpired(), 60 * 60 * 1000);
  }

  onModuleDestroy(): void {
    if (this.autoCleanTimer) clearInterval(this.autoCleanTimer);
  }

  async softDelete(userId: string, dto: SoftDeleteDto): Promise<RecycleItem> {
    const item: RecycleItem & { itemName?: string } = {
      itemId: dto.itemId ?? `item-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      fileId: dto.fileId,
      originalData: dto.originalData,
      deletedAt: Date.now(),
      deletedBy: userId,
      itemType: dto.itemType,
      location: dto.location ?? 'root',
      itemName: dto.itemName,
    };

    this.recycleBin.push(item);
    return item;
  }

  async list(fileId: string, query: RecycleListQuery): Promise<{ items: RecycleItem[]; total: number; page: number; pageSize: number }> {
    let filtered = this.recycleBin.filter((i) => i.fileId === fileId);

    if (query.itemType && query.itemType !== ('all' as any)) {
      filtered = filtered.filter((i) => i.itemType === query.itemType);
    }

    // 按删除时间倒序
    filtered.sort((a, b) => b.deletedAt - a.deletedAt);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize) as RecycleItem[];

    return { items, total, page, pageSize };
  }

  async getItem(itemId: string): Promise<RecycleItem | null> {
    return (this.recycleBin.find((i) => i.itemId === itemId) as RecycleItem) ?? null;
  }

  async restore(fileId: string, itemId: string): Promise<RecycleItem | null> {
    const idx = this.recycleBin.findIndex((i) => i.fileId === fileId && i.itemId === itemId);
    if (idx === -1) return null;

    const item = this.recycleBin[idx];
    this.recycleBin.splice(idx, 1);
    return item as RecycleItem;
  }

  async clean(fileId: string, itemId: string): Promise<boolean> {
    const idx = this.recycleBin.findIndex((i) => i.fileId === fileId && i.itemId === itemId);
    if (idx === -1) return false;

    this.recycleBin.splice(idx, 1);
    return true;
  }

  async cleanAll(fileId: string): Promise<number> {
    const before = this.recycleBin.length;
    this.recycleBin = this.recycleBin.filter((i) => i.fileId !== fileId);
    return before - this.recycleBin.length;
  }

  async batchRestore(fileId: string, itemIds: string[]): Promise<{ restored: number; failed: number }> {
    let restored = 0;
    let failed = 0;

    for (const itemId of itemIds) {
      const result = await this.restore(fileId, itemId);
      result ? restored++ : failed++;
    }

    return { restored, failed };
  }

  async batchClean(fileId: string, itemIds: string[]): Promise<number> {
    const before = this.recycleBin.length;
    this.recycleBin = this.recycleBin.filter(
      (i) => !(i.fileId === fileId && itemIds.includes(i.itemId))
    );
    return before - this.recycleBin.length;
  }

  /**
   * 清理过期条目(超过保留天数)
   */
  async purgeExpired(): Promise<number> {
    const cutoff = Date.now() - this.retentionDays * 86400 * 1000;
    const before = this.recycleBin.length;
    this.recycleBin = this.recycleBin.filter((i) => i.deletedAt > cutoff);
    const purged = before - this.recycleBin.length;
    if (purged > 0) {
      console.log(`[RecycleService] 已自动清理 ${purged} 条过期回收站记录`);
    }
    return purged;
  }

  getStats(fileId: string): { total: number; nodeCount: number; documentCount: number; oldestItem?: number } {
    const items = this.recycleBin.filter((i) => i.fileId === fileId);
    const nodeCount = items.filter((i) => i.itemType === 'node').length;
    const documentCount = items.filter((i) => i.itemType === 'document').length;
    const oldestItem = items.length > 0 ? Math.min(...items.map((i) => i.deletedAt)) : undefined;

    return { total: items.length, nodeCount, documentCount, oldestItem };
  }
}
