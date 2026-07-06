import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

// ==================== DTOs ====================

export class AdminQueryDto {
  page?: number = 1;
  pageSize?: number = 20;
  search?: string;
  role?: string;
  isActive?: boolean;
}

export class UpdateUserDto {
  role?: string;
  isActive?: boolean;
  isLocked?: boolean;
  nickname?: string;
  department?: string;
}

export class AuditLogQueryDto {
  page?: number = 1;
  pageSize?: number = 50;
  userId?: string;
  operationType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export class SystemConfigDto {
  value: any;
  description?: string;
}

// ==================== Types ====================

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  isLocked: boolean;
  nickname?: string;
  department?: string;
  organizationId?: string;
  lastLoginAt?: string;
  loginFailCount: number;
  createdAt?: string;
  documentCount: number;
}

export interface AuditLogEntry {
  id: number;
  userId: string;
  username?: string;
  fileId?: string;
  operationType: string;
  operationData: any;
  ipAddress?: string;
  userAgent?: string;
  result: string;
  durationMs?: number;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  totalDocuments: number;
  totalNodes: number;
  totalConnections: number;
  recentLogins: number;
  usersByRole: Record<string, number>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // ==================== 用户管理 ====================

  async listUsers(query: AdminQueryDto): Promise<PaginatedResult<AdminUser>> {
    const { page = 1, pageSize = 20, search, role, isActive } = query;
    const offset = (page - 1) * pageSize;

    if (!this.supabase.isAvailable()) {
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }

    try {
      let qb = this.supabase.getClient()
        .from('users')
        .select('id, username, email, role, is_active, is_locked, nickname, department, organization_id, last_login_at, login_fail_count, created_at', { count: 'exact' });

      if (search) qb = qb.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
      if (role) qb = qb.eq('role', role);
      if (isActive !== undefined) qb = qb.eq('is_active', isActive);

      qb = qb.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);

      const { data, count, error } = await qb;
      if (error) throw error;

      // 获取每个用户的文档数量
      const items: AdminUser[] = [];
      for (const u of (data || [])) {
        const { count: docCount } = await this.supabase.getClient()
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', u.id);

        items.push({
          id: u.id,
          username: u.username || u.email?.split('@')[0] || 'unknown',
          email: u.email || '',
          role: u.role || 'editor',
          isActive: u.is_active !== false,
          isLocked: u.is_locked === true,
          nickname: u.nickname,
          department: u.department,
          organizationId: u.organization_id,
          lastLoginAt: u.last_login_at,
          loginFailCount: u.login_fail_count || 0,
          createdAt: u.created_at,
          documentCount: docCount || 0,
        });
      }

      return { items, total: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
    } catch (err: any) {
      this.logger.error(`listUsers failed: ${err.message}`);
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }
  }

  async getUserById(userId: string): Promise<AdminUser | null> {
    if (!this.supabase.isAvailable()) return null;
    try {
      const { data, error } = await this.supabase.getClient()
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      const { count: docCount } = await this.supabase.getClient()
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      return {
        id: data.id,
        username: data.username || data.email?.split('@')[0] || 'unknown',
        email: data.email || '',
        role: data.role || 'editor',
        isActive: data.is_active !== false,
        isLocked: data.is_locked === true,
        nickname: data.nickname,
        department: data.department,
        organizationId: data.organization_id,
        lastLoginAt: data.last_login_at,
        loginFailCount: data.login_fail_count || 0,
        createdAt: data.created_at,
        documentCount: docCount || 0,
      };
    } catch {
      return null;
    }
  }

  async updateUser(userId: string, dto: UpdateUserDto): Promise<AdminUser | null> {
    if (!this.supabase.isAvailable()) return null;
    try {
      const updates: Record<string, any> = {};
      if (dto.role !== undefined) updates.role = dto.role;
      if (dto.isActive !== undefined) updates.is_active = dto.isActive;
      if (dto.isLocked !== undefined) updates.is_locked = dto.isLocked;
      if (dto.nickname !== undefined) updates.nickname = dto.nickname;
      if (dto.department !== undefined) updates.department = dto.department;

      if (dto.isLocked === false) {
        updates.login_fail_count = 0;
      }

      const { data, error } = await this.supabase.getClient()
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return this.getUserById(data.id);
    } catch (err: any) {
      this.logger.error(`updateUser failed: ${err.message}`);
      return null;
    }
  }

  // ==================== 统计仪表盘 ====================

  async getStats(): Promise<AdminStats> {
    const stats: AdminStats = {
      totalUsers: 0, activeUsers: 0, lockedUsers: 0,
      totalDocuments: 0, totalNodes: 0, totalConnections: 0,
      recentLogins: 0, usersByRole: {},
    };

    if (!this.supabase.isAvailable()) return stats;

    try {
      const client = this.supabase.getClient();

      // 用户统计
      const { count: totalUsers } = await client.from('users').select('*', { count: 'exact', head: true });
      const { count: activeUsers } = await client.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true);
      const { count: lockedUsers } = await client.from('users').select('*', { count: 'exact', head: true }).eq('is_locked', true);

      // 角色分布
      const { data: roles } = await client.from('users').select('role');
      const usersByRole: Record<string, number> = {};
      (roles || []).forEach(u => {
        const r = u.role || 'editor';
        usersByRole[r] = (usersByRole[r] || 0) + 1;
      });

      // 文档统计
      const { count: totalDocuments } = await client.from('documents').select('*', { count: 'exact', head: true });
      const { count: totalNodes } = await client.from('nodes').select('*', { count: 'exact', head: true });

      // 连线统计
      let totalConnections = 0;
      try { const { count: cc } = await client.from('connections').select('*', { count: 'exact', head: true }); totalConnections = cc || 0; } catch {}

      // 最近登录（今天）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: recentLogins } = await client.from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_login_at', today.toISOString());

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        lockedUsers: lockedUsers || 0,
        totalDocuments: totalDocuments || 0,
        totalNodes: totalNodes || 0,
        totalConnections,
        recentLogins: recentLogins || 0,
        usersByRole,
      };
    } catch (err: any) {
      this.logger.error(`getStats failed: ${err.message}`);
      return stats;
    }
  }

  // ==================== 审计日志 ====================

  async getAuditLogs(query: AuditLogQueryDto): Promise<PaginatedResult<AuditLogEntry>> {
    const { page = 1, pageSize = 50, userId, operationType, startDate, endDate, search } = query;
    const offset = (page - 1) * pageSize;

    if (!this.supabase.isAvailable()) {
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }

    try {
      let qb = this.supabase.getClient()
        .from('operation_logs')
        .select('*', { count: 'exact' });

      if (userId) qb = qb.eq('user_id', userId);
      if (operationType) qb = qb.eq('operation_type', operationType);
      if (startDate) qb = qb.gte('created_at', startDate);
      if (endDate) qb = qb.lte('created_at', endDate);
      if (search) qb = qb.or(`operation_type.ilike.%${search}%,operation_data::text.ilike.%${search}%`);

      qb = qb.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);

      const { data, count, error } = await qb;
      if (error) throw error;

      // 批量获取用户名
      const userNameMap = new Map<string, string>();
      const userIds = [...new Set((data || []).map(d => d.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: users } = await this.supabase.getClient()
          .from('users')
          .select('id, username, email')
          .in('id', userIds);
        (users || []).forEach(u => userNameMap.set(u.id, u.username || u.email?.split('@')[0] || 'unknown'));
      }

      const items: AuditLogEntry[] = (data || []).map(d => ({
        id: d.id,
        userId: d.user_id,
        username: d.user_id ? (userNameMap.get(d.user_id) || d.user_id) : 'system',
        fileId: d.file_id,
        operationType: d.operation_type,
        operationData: d.operation_data,
        ipAddress: d.ip_address,
        userAgent: d.user_agent,
        result: d.result || 'success',
        durationMs: d.duration_ms,
        createdAt: d.created_at,
      }));

      return { items, total: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
    } catch (err: any) {
      this.logger.error(`getAuditLogs failed: ${err.message}`);
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }
  }

  // ==================== 系统配置 ====================

  async getSystemConfigs(): Promise<Record<string, any>> {
    if (!this.supabase.isAvailable()) return {};
    try {
      const { data, error } = await this.supabase.getClient()
        .from('system_config')
        .select('key, value');

      if (error) throw error;
      const config: Record<string, any> = {};
      (data || []).forEach(row => { config[row.key] = row.value; });
      return config;
    } catch {
      return {};
    }
  }

  async updateSystemConfig(key: string, dto: SystemConfigDto, userId: string): Promise<boolean> {
    if (!this.supabase.isAvailable()) return false;
    try {
      const { error } = await this.supabase.getClient()
        .from('system_config')
        .upsert({
          key,
          value: dto.value,
          description: dto.description,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      return !error;
    } catch {
      return false;
    }
  }
}
