import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../../database/supabase.service';

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
export class NodesService implements OnModuleInit {
  private readonly logger = new Logger(NodesService.name);
  private memoryMode = false;

  // ====== Memory fallback ======
  private store = new Map<string, any[]>();
  private fileMeta = new Map<string, any>();

  constructor(private readonly supabase: SupabaseService) {}

  onModuleInit() {
    if (!this.supabase.isAvailable()) {
      this.logger.warn('[Nodes] Supabase unavailable → running in memory mode (data lost on restart)');
      this.memoryMode = true;
    }
  }

  // ==================== 文件/文档 ====================

  async createDocument(dto: CreateDocumentDto, userId: string): Promise<any> {
    if (this.memoryMode) return this.createDocumentMem(dto, userId);

    const fileId = randomUUID();
    const { error } = await this.supabase.fromDocuments().insert({
      id: fileId,
      title: dto.name ?? '未命名导图',
      description: dto.description ?? null,
      layout_type: dto.layoutType ?? 'logic-right',
      user_id: userId,
      total_nodes: 0,
    });

    if (error) throw new Error(`创建文档失败: ${error.message}`);

    // 初始节点数据
    if (dto.linesData && dto.linesData.length > 0) {
      await this.insertNodes(fileId, userId, dto.linesData);
    }

    return {
      fileId,
      name: dto.name ?? '未命名导图',
      description: dto.description,
      layoutType: dto.layoutType ?? 'logic-right',
      ownerId: userId,
    };
  }

  async getDocument(fileId: string): Promise<any> {
    if (this.memoryMode) return this.getDocumentMem(fileId);

    const { data, error } = await this.supabase.fromDocuments()
      .select('*').eq('id', fileId).maybeSingle();

    if (error || !data) return null;
    return this.mapDocument(data);
  }

  async listDocuments(userId: string, pagination: PaginationDto): Promise<PaginatedResult<any>> {
    if (this.memoryMode) return this.listDocumentsMem(userId, pagination);

    const page = pagination.page ?? 1;
    const pageSize = pagination.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, count, error } = await this.supabase.fromDocuments()
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw new Error(`查询文档列表失败: ${error.message}`);

    return {
      items: (data ?? []).map(this.mapDocument),
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  }

  async deleteDocument(fileId: string): Promise<boolean> {
    if (this.memoryMode) return this.deleteDocumentMem(fileId);

    // Delete nodes first (foreign key cascade may not be set up)
    await this.supabase.fromNodes().delete().eq('document_id', fileId);
    const { error } = await this.supabase.fromDocuments().delete().eq('id', fileId);
    return !error;
  }

  // ==================== 节点 CRUD ====================

  async getLines(fileId: string): Promise<any[]> {
    if (this.memoryMode) return this.getLinesMem(fileId);

    const { data, error } = await this.supabase.fromNodes()
      .select('*').eq('document_id', fileId).order('order_index', { ascending: true });

    if (error) throw new Error(`查询节点失败: ${error.message}`);
    return (data ?? []).map(this.mapNode);
  }

  async createLines(fileId: string, dto: CreateLinesDto): Promise<any[]> {
    if (this.memoryMode) return this.createLinesMem(fileId, dto);

    const { data: doc } = await this.supabase.fromDocuments()
      .select('user_id').eq('id', fileId).maybeSingle();
    const userId = doc?.user_id ?? 'anonymous';

    return this.insertNodes(fileId, userId, dto.lines);
  }

  async updateLine(fileId: string, lineId: string, dto: UpdateLineDto): Promise<any | null> {
    if (this.memoryMode) return this.updateLineMem(fileId, lineId, dto);

    const updates: Record<string, any> = {};
    if (dto.text !== undefined) updates.text = dto.text;
    if (dto.depth !== undefined) updates.depth = dto.depth;
    if (dto.collapsed !== undefined) updates.collapsed = dto.collapsed;
    if (dto.parentLineId !== undefined) updates.parent_id = dto.parentLineId;

    if (dto.metadata) {
      // Merge metadata with existing
      const { data: existing } = await this.supabase.fromNodes()
        .select('metadata').eq('id', lineId).maybeSingle();
      const merged = { ...(existing?.metadata ?? {}), ...dto.metadata };
      updates.metadata = merged;
    }

    if (Object.keys(updates).length === 0) {
      // Nothing to update, return existing
      const { data } = await this.supabase.fromNodes()
        .select('*').eq('id', lineId).maybeSingle();
      return data ? this.mapNode(data) : null;
    }

    const { data, error } = await this.supabase.fromNodes()
      .update(updates).eq('id', lineId).select('*').maybeSingle();

    if (error) throw new Error(`更新节点失败: ${error.message}`);
    if (!data) return null;

    // Update document timestamp
    await this.supabase.fromDocuments()
      .update({ updated_at: new Date().toISOString() }).eq('id', fileId);

    return this.mapNode(data);
  }

  async deleteLine(fileId: string, lineId: string): Promise<boolean> {
    if (this.memoryMode) return this.deleteLineMem(fileId, lineId);

    const { data: node } = await this.supabase.fromNodes()
      .select('depth').eq('id', lineId).maybeSingle();
    if (!node) return false;

    // Delete the node itself
    const { error } = await this.supabase.fromNodes().delete().eq('id', lineId);
    if (error) return false;

    // Delete children (nodes with depth > node.depth that come after in order)
    // In Supabase, we need a different approach for cascading delete
    // For simplicity, just delete the single node. Full cascade requires recursive CTE.
    // TODO: implement recursive child deletion if needed

    // Update document metadata
    await this.updateDocumentNodeCount(fileId);

    return true;
  }

  async reorderLines(fileId: string, dto: ReorderLinesDto): Promise<boolean> {
    if (this.memoryMode) return this.reorderLinesMem(fileId, dto);

    // Update order_index for each node
    for (let i = 0; i < dto.lineIds.length; i++) {
      await this.supabase.fromNodes()
        .update({ order_index: i }).eq('id', dto.lineIds[i]);
    }

    return true;
  }

  // ==================== 批量同步 ====================

  async batchSync(fileId: string, dto: BatchSyncDto): Promise<{ applied: number; failed: number }> {
    if (this.memoryMode) return this.batchSyncMem(fileId, dto);

    const { data: doc } = await this.supabase.fromDocuments()
      .select('user_id').eq('id', fileId).maybeSingle();
    const userId = doc?.user_id ?? 'anonymous';

    let applied = 0;
    let failed = 0;

    for (const op of dto.operations) {
      try {
        switch (op.type) {
          case 'insert':
            if (op.data) {
              const [created] = await this.insertNodes(fileId, userId, [op.data]);
              created ? applied++ : failed++;
            }
            break;
          case 'update': {
            const updated = await this.updateLine(fileId, op.lineId, op.data ?? {});
            updated ? applied++ : failed++;
            break;
          }
          case 'delete': {
            const deleted = await this.deleteLine(fileId, op.lineId);
            deleted ? applied++ : failed++;
            break;
          }
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
    if (this.memoryMode) return this.getNodeCountMem(fileId);

    const { count, error } = await this.supabase.fromNodes()
      .select('*', { count: 'exact', head: true }).eq('document_id', fileId);
    if (error) return 0;
    return count ?? 0;
  }

  async getStats(userId: string): Promise<any> {
    if (this.memoryMode) return this.getStatsMem(userId);

    const { count: totalDocs, error: docErr } = await this.supabase.fromDocuments()
      .select('*', { count: 'exact', head: true });
    const { count: totalNodes, error: nodeErr } = await this.supabase.fromNodes()
      .select('*', { count: 'exact', head: true });

    return {
      totalDocs: totalDocs ?? 0,
      totalNodes: totalNodes ?? 0,
      userId,
    };
  }

  // ==================== Private Helpers (Supabase) ====================

  private async insertNodes(fileId: string, userId: string, lines: any[]): Promise<any[]> {
    const { data: existing } = await this.supabase.fromNodes()
      .select('order_index').eq('document_id', fileId)
      .order('order_index', { ascending: false }).limit(1);

    let nextIndex = (existing?.[0]?.order_index ?? -1) + 1;

    const nodes = lines.map((l: any) => ({
      id: l.lineId ?? randomUUID(),
      document_id: fileId,
      user_id: userId,
      parent_id: l.parentLineId ?? null,
      text: l.text ?? '',
      depth: l.depth ?? 0,
      collapsed: l.collapsed ?? false,
      order_index: nextIndex++,
      metadata: l.metadata ?? {},
    }));

    const { error } = await this.supabase.fromNodes().insert(nodes);
    if (error) throw new Error(`插入节点失败: ${error.message}`);

    await this.updateDocumentNodeCount(fileId);

    return nodes.map(n => ({
      lineId: n.id,
      parentLineId: n.parent_id,
      text: n.text,
      depth: n.depth,
      collapsed: n.collapsed,
      metadata: n.metadata,
      orderIndex: n.order_index,
    }));
  }

  private async updateDocumentNodeCount(fileId: string): Promise<void> {
    const { count } = await this.supabase.fromNodes()
      .select('*', { count: 'exact', head: true }).eq('document_id', fileId);
    await this.supabase.fromDocuments()
      .update({ total_nodes: count ?? 0, updated_at: new Date().toISOString() })
      .eq('id', fileId);
  }

  private mapDocument(row: any) {
    return {
      fileId: row.id,
      name: row.title,
      description: row.description,
      layoutType: row.layout_type,
      ownerId: row.user_id,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
      totalNodes: row.total_nodes ?? 0,
    };
  }

  private mapNode(row: any) {
    return {
      lineId: row.id,
      parentLineId: row.parent_id,
      text: row.text,
      depth: row.depth,
      collapsed: row.collapsed,
      orderIndex: row.order_index,
      metadata: row.metadata ?? {},
    };
  }

  // ==================== Memory Mode Fallback (原内存实现) ====================

  private async createDocumentMem(dto: CreateDocumentDto, userId: string): Promise<any> {
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

  private async getDocumentMem(fileId: string): Promise<any> {
    const meta = this.fileMeta.get(fileId);
    if (!meta) return null;
    return { fileId, ...meta };
  }

  private async listDocumentsMem(userId: string, pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const allDocs: any[] = [];
    this.fileMeta.forEach((meta, fileId) => allDocs.push({ fileId, ...meta }));
    const page = pagination.page ?? 1;
    const pageSize = pagination.pageSize ?? 20;
    const total = allDocs.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const items = allDocs.slice(start, start + pageSize);
    return { items, total, page, pageSize, totalPages };
  }

  private async deleteDocumentMem(fileId: string): Promise<boolean> {
    const existed = this.store.has(fileId);
    this.store.delete(fileId);
    this.fileMeta.delete(fileId);
    return existed;
  }

  private async getLinesMem(fileId: string): Promise<any[]> {
    return this.store.get(fileId) ?? [];
  }

  private async createLinesMem(fileId: string, dto: CreateLinesDto): Promise<any[]> {
    const existing = this.store.get(fileId) ?? [];
    const created = dto.lines.map((l: any) => ({
      ...l,
      lineId: l.lineId ?? crypto.randomUUID(),
    }));
    existing.push(...created);
    this.store.set(fileId, existing);
    const meta = this.fileMeta.get(fileId);
    if (meta) {
      meta.totalNodes = existing.length;
      meta.updatedAt = Date.now();
    }
    return created;
  }

  private async updateLineMem(fileId: string, lineId: string, dto: UpdateLineDto): Promise<any | null> {
    const lines = this.store.get(fileId);
    if (!lines) return null;
    const line = lines.find((l: any) => l.lineId === lineId);
    if (!line) return null;
    if (dto.text !== undefined) line.text = dto.text;
    if (dto.depth !== undefined) line.depth = dto.depth;
    if (dto.collapsed !== undefined) line.collapsed = dto.collapsed;
    if (dto.parentLineId !== undefined) line.parentLineId = dto.parentLineId;
    if (dto.metadata) line.metadata = { ...(line.metadata ?? {}), ...dto.metadata };
    line.metadata = { ...(line.metadata ?? {}), updatedAt: Date.now() };
    const meta = this.fileMeta.get(fileId);
    if (meta) meta.updatedAt = Date.now();
    return line;
  }

  private async deleteLineMem(fileId: string, lineId: string): Promise<boolean> {
    const lines = this.store.get(fileId);
    if (!lines) return false;
    const idx = lines.findIndex((l: any) => l.lineId === lineId);
    if (idx === -1) return false;
    const removed = lines[idx];
    while (idx < lines.length && lines[idx]?.depth > removed.depth) {
      lines.splice(idx, 1);
    }
    if (!removed?.depth) lines.splice(idx, 1);
    const meta = this.fileMeta.get(fileId);
    if (meta) {
      meta.totalNodes = lines.length;
      meta.updatedAt = Date.now();
    }
    return true;
  }

  private async reorderLinesMem(fileId: string, dto: ReorderLinesDto): Promise<boolean> {
    const lines = this.store.get(fileId);
    if (!lines) return false;
    const sorted = dto.lineIds.map(id => lines.find((l: any) => l.lineId === id)).filter(Boolean);
    const remaining = lines.filter((l: any) => !dto.lineIds.includes(l.lineId));
    this.store.set(fileId, [...sorted, ...remaining]);
    const meta = this.fileMeta.get(fileId);
    if (meta) meta.updatedAt = Date.now();
    return true;
  }

  private async batchSyncMem(fileId: string, dto: BatchSyncDto): Promise<{ applied: number; failed: number }> {
    let applied = 0;
    let failed = 0;
    for (const op of dto.operations) {
      try {
        switch (op.type) {
          case 'insert':
            if (op.data) { await this.createLinesMem(fileId, { lines: [op.data] }); applied++; }
            break;
          case 'update':
            (await this.updateLineMem(fileId, op.lineId, op.data ?? {})) ? applied++ : failed++;
            break;
          case 'delete':
            (await this.deleteLineMem(fileId, op.lineId)) ? applied++ : failed++;
            break;
          default: failed++;
        }
      } catch { failed++; }
    }
    return { applied, failed };
  }

  private async getNodeCountMem(fileId: string): Promise<number> {
    return this.store.get(fileId)?.length ?? 0;
  }

  private async getStatsMem(userId: string): Promise<any> {
    let totalNodes = 0;
    let totalDocs = 0;
    this.store.forEach(lines => { totalNodes += lines.length; });
    this.fileMeta.forEach(() => totalDocs++);
    return { totalDocs, totalNodes, userId };
  }
}
