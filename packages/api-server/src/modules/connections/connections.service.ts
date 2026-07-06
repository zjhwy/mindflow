import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../../database/supabase.service';
import type { Connection, WpsConnectorType } from '@mindflow/shared';

/** 连线创建 DTO（适配 NestJS 验证） */
export class CreateConnectionDto {
  fromLineId!: string;
  toLineId!: string;
  connectorType?: WpsConnectorType;
  label?: string;
  arrowDirection?: 'forward' | 'backward' | 'both' | 'none';
  fromAnchor?: string;
  toAnchor?: string;
  style?: { color?: string; strokeWidth?: number; dashArray?: string; opacity?: number };
}

/** 连线更新 DTO（适配 NestJS 验证） */
export class UpdateConnectionDto {
  connectorType?: WpsConnectorType;
  label?: string;
  arrowDirection?: 'forward' | 'backward' | 'both' | 'none';
  fromAnchor?: string;
  toAnchor?: string;
  path?: string;
  style?: { color?: string; strokeWidth?: number; dashArray?: string; opacity?: number };
}

/** 批量创建连线 DTO */
export class BatchCreateConnectionsDto {
  connections!: CreateConnectionDto[];
}

// ---- 内存存储降级 ----
interface ConnectionRecord {
  id: string;
  document_id: string;
  from_line_id: string;
  to_line_id: string;
  connector_type: string;
  label?: string;
  arrow_direction: string;
  from_anchor?: string;
  to_anchor?: string;
  path?: string;
  style: Record<string, any>;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);
  private readonly memoryStore = new Map<string, ConnectionRecord[]>();

  constructor(private readonly supabase: SupabaseService) {}

  /** 将 DB 行映射为 Connection 类型 */
  private mapConnection(row: ConnectionRecord): Connection {
    return {
      connectionId: row.id,
      documentId: row.document_id,
      fromLineId: row.from_line_id,
      toLineId: row.to_line_id,
      connectorType: (row.connector_type || 'curved') as WpsConnectorType,
      label: row.label,
      arrowDirection: (row.arrow_direction || 'none') as Connection['arrowDirection'],
      fromAnchor: row.from_anchor as Connection['fromAnchor'],
      toAnchor: row.to_anchor as Connection['toAnchor'],
      path: row.path,
      style: row.style || {},
      userId: row.user_id,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    };
  }

  // ==================== 创建连线 ====================

  async createConnection(dto: CreateConnectionDto, documentId: string, userId: string): Promise<Connection> {
    if (dto.fromLineId === dto.toLineId) {
      throw new Error('不能创建自身连线');
    }

    const record: ConnectionRecord = {
      id: randomUUID(),
      document_id: documentId,
      from_line_id: dto.fromLineId,
      to_line_id: dto.toLineId,
      connector_type: dto.connectorType || 'curved',
      label: dto.label,
      arrow_direction: dto.arrowDirection || 'none',
      from_anchor: dto.fromAnchor,
      to_anchor: dto.toAnchor,
      style: dto.style || {},
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this.supabase.isAvailable()) {
      try {
        const { data, error } = await this.supabase.fromConnections()
          .insert({
            id: record.id,
            document_id: record.document_id,
            from_line_id: record.from_line_id,
            to_line_id: record.to_line_id,
            connector_type: record.connector_type,
            label: record.label,
            arrow_direction: record.arrow_direction,
            from_anchor: record.from_anchor,
            to_anchor: record.to_anchor,
            style: record.style,
            user_id: record.user_id,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);
        return this.mapConnection(data as ConnectionRecord);
      } catch (err: any) {
        this.logger.warn(`Supabase createConnection failed: ${err.message}, using memory`);
      }
    }

    // 内存降级
    const key = record.document_id;
    if (!this.memoryStore.has(key)) this.memoryStore.set(key, []);
    this.memoryStore.get(key)!.push(record);
    return this.mapConnection(record);
  }

  // ==================== 查询连线列表 ====================

  async getConnections(documentId: string): Promise<Connection[]> {
    if (this.supabase.isAvailable()) {
      try {
        const { data, error } = await this.supabase.fromConnections()
          .select('*')
          .eq('document_id', documentId)
          .order('created_at', { ascending: true });

        if (error) throw new Error(error.message);
        return (data as ConnectionRecord[]).map(r => this.mapConnection(r));
      } catch (err: any) {
        this.logger.warn(`Supabase getConnections failed: ${err.message}, using memory`);
      }
    }

    return (this.memoryStore.get(documentId) ?? []).map(r => this.mapConnection(r));
  }

  // ==================== 更新连线 ====================

  async updateConnection(connectionId: string, dto: UpdateConnectionDto): Promise<Connection | null> {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (dto.connectorType !== undefined) updates.connector_type = dto.connectorType;
    if (dto.label !== undefined) updates.label = dto.label;
    if (dto.arrowDirection !== undefined) updates.arrow_direction = dto.arrowDirection;
    if (dto.fromAnchor !== undefined) updates.from_anchor = dto.fromAnchor;
    if (dto.toAnchor !== undefined) updates.to_anchor = dto.toAnchor;
    if (dto.path !== undefined) updates.path = dto.path;
    if (dto.style !== undefined) updates.style = dto.style;

    if (this.supabase.isAvailable()) {
      try {
        const { data, error } = await this.supabase.fromConnections()
          .update(updates)
          .eq('id', connectionId)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return this.mapConnection(data as ConnectionRecord);
      } catch (err: any) {
        this.logger.warn(`Supabase updateConnection failed: ${err.message}, using memory`);
      }
    }

    // 内存降级
    for (const records of this.memoryStore.values()) {
      const idx = records.findIndex(r => r.id === connectionId);
      if (idx !== -1) {
        records[idx] = { ...records[idx], ...updates };
        return this.mapConnection(records[idx]);
      }
    }
    return null;
  }

  // ==================== 删除连线 ====================

  async deleteConnection(connectionId: string): Promise<boolean> {
    if (this.supabase.isAvailable()) {
      try {
        const { error } = await this.supabase.fromConnections()
          .delete()
          .eq('id', connectionId);

        if (error) throw new Error(error.message);
        return true;
      } catch (err: any) {
        this.logger.warn(`Supabase deleteConnection failed: ${err.message}, using memory`);
      }
    }

    for (const [key, records] of this.memoryStore.entries()) {
      const before = records.length;
      this.memoryStore.set(key, records.filter(r => r.id !== connectionId));
      if (this.memoryStore.get(key)!.length < before) return true;
    }
    return false;
  }

  // ==================== 删除文档下全部连线 ====================

  async deleteDocumentConnections(documentId: string): Promise<number> {
    if (this.supabase.isAvailable()) {
      try {
        const { count, error } = await this.supabase.fromConnections()
          .delete({ count: 'exact' })
          .eq('document_id', documentId);

        if (error) throw new Error(error.message);
        return count ?? 0;
      } catch (err: any) {
        this.logger.warn(`Supabase deleteDocumentConnections failed: ${err.message}, using memory`);
      }
    }

    const records = this.memoryStore.get(documentId) ?? [];
    this.memoryStore.delete(documentId);
    return records.length;
  }
}
