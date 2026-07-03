import { Injectable } from '@nestjs/common';

/** 分页查询 DTO */
export class PaginationDto {
  page?: number = 1;
  pageSize?: number = 20;
}

/** 分页查询结果 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 文档创建 DTO */
export class CreateDocumentDto {
  name?: string;
  description?: string;
  layoutType?: string;
  linesData?: any[];
}

/** 节点批量创建 DTO */
export class CreateLinesDto {
  lines!: any[];
}

/** 节点更新 DTO */
export class UpdateLineDto {
  text?: string;
  depth?: number;
  collapsed?: boolean;
  parentLineId?: string | null;
  metadata?: Record<string, any>;
}

/** 节点排序 DTO */
export class ReorderLinesDto {
  lineIds!: string[];
}

/** 批量同步 DTO */
export class BatchSyncDto {
  operations!: Array<{
    type: string;
    lineId: string;
    data?: any;
    index?: number;
    timestamp: number;
    userId: string;
  }>;
}

@Injectable()
export class NodesService {
  // 内存存储 (生产环境使用 TypeORM/PostgreSQL)
  private store = new Map<string, any[]>();

  // 文件元数据
  private fileMeta = new Map<string, { name: string; description?: string; layoutType?: string; ownerId?: string; createdAt: number; updatedAt: number; totalNodes: number }>();

  // ==================== 文件/文档 ====================

  async createDocument(dto: CreateDocumentDto, userId: string): Promise<any> {
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.store.set(fileId, []);

    const meta = {
      name: dto.name ?? '未命名导图',
      description: dto.description,
      layoutType: dto.layoutType ?? 'logic-right',
      ownerId: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalNodes: 0,
    };
    this.fileMeta.set(fileId, meta);

    // 如果有初始数据，创建节点
    if (dto.linesData && dto.linesData.length > 0) {
      const lines = dto.linesData.map((l: any, i: number) => ({
        ...l,
        lineId: l.lineId ?? `${fileId}-line-${i}`,
      }));
      this.store.set(fileId, lines);
      meta.totalNodes = lines.length;
      meta.updatedAt = Date.now();
    }

    return { fileId, ...meta };
  }

  async getDocument(fileId: string): Promise<any> {
    const meta = this.fileMeta.get(fileId);
    if (!meta) return null;
    return { fileId, ...meta };
  }

  async listDocuments(userId: string, pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const allDocs: any[] = [];
    this.fileMeta.forEach((meta, fileId) => {
      allDocs.push({ fileId, ...meta });
    });

    const page = pagination.page ?? 1;
    const pageSize = pagination.pageSize ?? 20;
    const total = allDocs.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const items = allDocs.slice(start, start + pageSize);

    return { items, total, page, pageSize, totalPages };
  }

  async deleteDocument(fileId: string): Promise<boolean> {
    const existed = this.store.has(fileId);
    this.store.delete(fileId);
    this.fileMeta.delete(fileId);
    return existed;
  }

  // ==================== 节点 CRUD ====================

  async getLines(fileId: string): Promise<any[]> {
    return this.store.get(fileId) ?? [];
  }

  async createLines(fileId: string, dto: CreateLinesDto): Promise<any[]> {
    const existing = this.store.get(fileId) ?? [];

    const created = dto.lines.map((l: any) => ({
      ...l,
      lineId: l.lineId ?? crypto.randomUUID(),
    }));
    existing.push(...created);
    this.store.set(fileId, existing);

    // 更新文件元数据
    const meta = this.fileMeta.get(fileId);
    if (meta) {
      meta.totalNodes = existing.length;
      meta.updatedAt = Date.now();
    }

    return created;
  }

  async updateLine(fileId: string, lineId: string, dto: UpdateLineDto): Promise<any | null> {
    const lines = this.store.get(fileId);
    if (!lines) return null;

    const line = lines.find((l: any) => l.lineId === lineId);
    if (!line) return null;

    if (dto.text !== undefined) line.text = dto.text;
    if (dto.depth !== undefined) line.depth = dto.depth;
    if (dto.collapsed !== undefined) line.collapsed = dto.collapsed;
    if (dto.parentLineId !== undefined) line.parentLineId = dto.parentLineId;
    if (dto.metadata) {
      line.metadata = { ...(line.metadata ?? {}), ...dto.metadata };
    }
    line.metadata = { ...(line.metadata ?? {}), updatedAt: Date.now() };

    const meta = this.fileMeta.get(fileId);
    if (meta) meta.updatedAt = Date.now();

    return line;
  }

  async deleteLine(fileId: string, lineId: string): Promise<boolean> {
    const lines = this.store.get(fileId);
    if (!lines) return false;

    const idx = lines.findIndex((l: any) => l.lineId === lineId);
    if (idx === -1) return false;

    const removed = lines[idx];
    // 级联删除子节点
    while (idx < lines.length && lines[idx]?.depth > removed.depth) {
      lines.splice(idx, 1);
    }

    if (!removed?.depth) {
      lines.splice(idx, 1);
    }

    const meta = this.fileMeta.get(fileId);
    if (meta) {
      meta.totalNodes = lines.length;
      meta.updatedAt = Date.now();
    }

    return true;
  }

  async reorderLines(fileId: string, dto: ReorderLinesDto): Promise<boolean> {
    const lines = this.store.get(fileId);
    if (!lines) return false;

    const sorted = dto.lineIds
      .map((id) => lines.find((l: any) => l.lineId === id))
      .filter(Boolean);
    const remaining = lines.filter((l: any) => !dto.lineIds.includes(l.lineId));
    this.store.set(fileId, [...sorted, ...remaining]);

    const meta = this.fileMeta.get(fileId);
    if (meta) meta.updatedAt = Date.now();

    return true;
  }

  // ==================== 批量同步 ====================

  async batchSync(fileId: string, dto: BatchSyncDto): Promise<{ applied: number; failed: number }> {
    let applied = 0;
    let failed = 0;

    for (const op of dto.operations) {
      try {
        switch (op.type) {
          case 'insert':
            if (op.data) {
              await this.createLines(fileId, { lines: [op.data] });
              applied++;
            }
            break;
          case 'update':
            const updated = await this.updateLine(fileId, op.lineId, op.data ?? {});
            updated ? applied++ : failed++;
            break;
          case 'delete':
            const deleted = await this.deleteLine(fileId, op.lineId);
            deleted ? applied++ : failed++;
            break;
          default:
            failed++;
        }
      } catch {
        failed++;
      }
    }

    return { applied, failed };
  }

  // ==================== 查询/统计 ====================

  async getNodeCount(fileId: string): Promise<number> {
    return this.store.get(fileId)?.length ?? 0;
  }

  async getStats(userId: string): Promise<any> {
    let totalNodes = 0;
    let totalDocs = 0;
    this.store.forEach((lines) => { totalNodes += lines.length; });
    this.fileMeta.forEach(() => totalDocs++);

    return { totalDocs, totalNodes, userId };
  }
}
