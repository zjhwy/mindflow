/**
 * 细粒度权限模块 - 文档第4.2节
 * 支持团队级、文档级、节点级三级权限控制和数据边界控制
 */
import { PermissionRole, PermissionLevel, LineId, UserId, FileId } from '@mindflow/shared';

// ==================== 接口定义 ====================

export interface UserPermission {
  userId: UserId;
  role: PermissionRole;
  level: PermissionLevel;
  scope: string; // teamId / docId / nodeId
  grantedBy?: UserId;
  grantedAt?: number;
  expiresAt?: number; // 过期时间戳
}

export interface AccessRequest {
  userId: UserId;
  resourceId: string; // teamId / docId / nodeId
  level: PermissionLevel;
  action: 'read' | 'write' | 'delete' | 'admin';
  context?: Record<string, any>;
}

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: PermissionRole;
  currentRole?: PermissionRole;
}

export interface DataBorderRule {
  field: string;
  operator: 'include' | 'exclude' | 'range';
  value: any;
  scope: 'team' | 'department' | 'region';
}

export interface DataBorderConfig {
  enabled: boolean;
  rules: DataBorderRule[];
  defaultPolicy: 'allow' | 'deny';
}

export const PERMISSION_HIERARCHY: Record<PermissionRole, number> = {
  [PermissionRole.ADMIN]: 100,
  [PermissionRole.SECURE_OPERATOR]: 90,
  [PermissionRole.EDITOR]: 70,
  [PermissionRole.VIEWER]: 40,
  [PermissionRole.GUEST]: 10,
};

export const ROLE_PERMISSIONS: Record<PermissionRole, string[]> = {
  [PermissionRole.ADMIN]: ['read', 'write', 'delete', 'admin', 'invite', 'export', 'lock'],
  [PermissionRole.SECURE_OPERATOR]: ['read', 'write', 'delete', 'lock'],
  [PermissionRole.EDITOR]: ['read', 'write'],
  [PermissionRole.VIEWER]: ['read'],
  [PermissionRole.GUEST]: ['read'],
};

// ==================== 权限管理器 ====================

export class PermissionManager {
  // 用户权限映射: key = `${userId}:${level}:${scope}`, value = UserPermission
  private permissions = new Map<string, UserPermission>();
  // 所有角色分配记录（用于审计）
  private roleHistory: Array<{ userId: UserId; role: PermissionRole; scope: string; timestamp: number; action: 'grant' | 'revoke' }> = [];
  // 数据边界控制规则（按文档）
  private dataBorders = new Map<FileId, DataBorderConfig>();

  // ==================== 角色管理 ====================

  /** 兼容旧接口 */
  getRole(userId: UserId): PermissionRole {
    const allPerms = Array.from(this.permissions.values()).filter((p) => p.userId === userId);
    if (allPerms.length === 0) return PermissionRole.GUEST;

    let highest = PermissionRole.GUEST;
    let highestVal = PERMISSION_HIERARCHY[PermissionRole.GUEST];
    for (const p of allPerms) {
      if (PERMISSION_HIERARCHY[p.role] > highestVal) {
        highest = p.role;
        highestVal = PERMISSION_HIERARCHY[p.role];
      }
    }
    return highest;
  }

  setRole(userId: UserId, role: PermissionRole): void {
    this.grantPermission({
      userId,
      role,
      level: PermissionLevel.DOCUMENT,
      scope: '__default__',
      grantedAt: Date.now(),
    });
  }

  canEdit(userId: UserId): boolean {
    return [PermissionRole.ADMIN, PermissionRole.EDITOR, PermissionRole.SECURE_OPERATOR].includes(
      this.getRole(userId)
    );
  }

  // ==================== 完整权限管理 ====================

  /**
   * 授予权限
   */
  grantPermission(perm: UserPermission): void {
    const key = this.buildKey(perm.userId, perm.level, perm.scope);
    this.permissions.set(key, { ...perm, grantedAt: perm.grantedAt ?? Date.now() });

    this.roleHistory.push({
      userId: perm.userId,
      role: perm.role,
      scope: perm.scope,
      timestamp: Date.now(),
      action: 'grant',
    });
  }

  /**
   * 撤销指定范围的权限
   */
  revokePermission(userId: UserId, level: PermissionLevel, scope: string): void {
    const key = this.buildKey(userId, level, scope);
    const perm = this.permissions.get(key);
    if (perm) {
      this.permissions.delete(key);
      this.roleHistory.push({
        userId,
        role: perm.role,
        scope,
        timestamp: Date.now(),
        action: 'revoke',
      });
    }
  }

  /**
   * 在指定级别获取用户角色
   */
  getRoleAtLevel(userId: UserId, level: PermissionLevel, scope: string): PermissionRole {
    const key = this.buildKey(userId, level, scope);
    const perm = this.permissions.get(key);
    return perm?.role ?? PermissionRole.GUEST;
  }

  /**
   * 获取用户在某个资源上的有效角色（逐层向下继承）
   * TEAM -> DOCUMENT -> NODE，取最高
   */
  getEffectiveRole(userId: UserId, scope: string): PermissionRole {
    const levels = [PermissionLevel.TEAM, PermissionLevel.DOCUMENT, PermissionLevel.NODE];
    let highestRole = PermissionRole.GUEST;
    let highest = PERMISSION_HIERARCHY[PermissionRole.GUEST];

    for (const level of levels) {
      const key = this.buildKey(userId, level, scope);
      const perm = this.permissions.get(key);
      if (perm && PERMISSION_HIERARCHY[perm.role] > highest) {
        highestRole = perm.role;
        highest = PERMISSION_HIERARCHY[perm.role];
      }
    }

    return highestRole;
  }

  // ==================== 访问控制 ====================

  /**
   * 检查用户是否有执行指定操作
   */
  checkAccess(request: AccessRequest): AccessResult {
    // 检查权限过期
    const key = this.buildKey(request.userId, request.level, request.resourceId);
    const perm = this.permissions.get(key);

    if (!perm) {
      return {
        allowed: false,
        reason: `用户 ${request.userId} 在 ${request.level} 级资源 ${request.resourceId} 上无权限`,
        requiredRole: this.getRequiredRoleForAction(request.action),
        currentRole: PermissionRole.GUEST,
      };
    }

    // 检查过期
    if (perm.expiresAt && perm.expiresAt < Date.now()) {
      return {
        allowed: false,
        reason: `权限已过期 (过期时间: ${new Date(perm.expiresAt).toISOString()})`,
        currentRole: perm.role,
      };
    }

    // 检查角色是否有此操作权限
    const allowedActions = ROLE_PERMISSIONS[perm.role] ?? [];
    if (!allowedActions.includes(request.action)) {
      return {
        allowed: false,
        reason: `角色 ${perm.role} 无 ${request.action} 权限`,
        requiredRole: this.getRequiredRoleForAction(request.action),
        currentRole: perm.role,
      };
    }

    return {
      allowed: true,
      currentRole: perm.role,
    };
  }

  /**
   * 批量检查多个资源的访问权限
   */
  checkBatchAccess(requests: AccessRequest[]): Map<string, AccessResult> {
    const results = new Map<string, AccessResult>();
    for (const req of requests) {
      const key = `${req.userId}:${req.resourceId}:${req.action}`;
      results.set(key, this.checkAccess(req));
    }
    return results;
  }

  // ==================== 数据边界控制 (DataBorderControl) ====================

  /**
   * 设置文档的数据边界规则
   */
  setDataBorder(fileId: FileId, config: DataBorderConfig): void {
    this.dataBorders.set(fileId, config);
  }

  /**
   * 检查数据操作是否在边界内
   * @param fileId 文件ID
   * @param dataFields 操作涉及的数据字段值
   * @param userContext 用户的组织信息 (team, department, region)
   */
  checkDataBorder(
    fileId: FileId,
    dataFields: Record<string, any>,
    userContext: { team?: string; department?: string; region?: string }
  ): { within: boolean; violations: string[] } {
    const config = this.dataBorders.get(fileId);

    // 未配置边界 — 默认允许
    if (!config || !config.enabled) {
      return { within: true, violations: [] };
    }

    const violations: string[] = [];

    for (const rule of config.rules) {
      const dataValue = dataFields[rule.field];
      const userAttr = userContext[rule.scope as keyof typeof userContext];

      if (dataValue === undefined || userAttr === undefined) {
        if (config.defaultPolicy === 'deny') {
          violations.push(`缺少字段 ${rule.field} 或用户属性 ${rule.scope}`);
        }
        continue;
      }

      let matches: boolean;
      switch (rule.operator) {
        case 'include':
          matches = Array.isArray(rule.value)
            ? rule.value.includes(dataValue)
            : String(dataValue) === String(rule.value);
          break;
        case 'exclude':
          matches = Array.isArray(rule.value)
            ? !rule.value.includes(dataValue)
            : String(dataValue) !== String(rule.value);
          break;
        case 'range':
          matches =
            Array.isArray(rule.value) && rule.value.length === 2 &&
            dataValue >= rule.value[0] && dataValue <= rule.value[1];
          break;
        default:
          matches = false;
      }

      if (!matches) {
        violations.push(
          `字段 ${rule.field} 的值 "${dataValue}" 不满足 ${rule.operator} ${JSON.stringify(rule.value)} (scope: ${rule.scope})`
        );
      }
    }

    if (violations.length > 0 && config.defaultPolicy === 'deny') {
      return { within: false, violations };
    }

    return { within: true, violations };
  }

  // ==================== 节点级权限 ====================

  /**
   * 设置节点级权限（控制谁可以编辑/查看特定节点）
   */
  setNodePermission(nodeId: LineId, userId: UserId, role: PermissionRole): void {
    this.grantPermission({
      userId,
      role,
      level: PermissionLevel.NODE,
      scope: nodeId,
      grantedAt: Date.now(),
    });
  }

  /**
   * 检查用户是否可以编辑指定节点
   */
  canEditNode(userId: UserId, nodeId: LineId): boolean {
    const role = this.getRoleAtLevel(userId, PermissionLevel.NODE, nodeId);
    if (role === PermissionRole.GUEST) {
      // 回退到文档级权限
      return this.canEdit(userId);
    }
    return [PermissionRole.ADMIN, PermissionRole.EDITOR, PermissionRole.SECURE_OPERATOR].includes(role);
  }

  /**
   * 获取有特定节点访问权限的用户列表
   */
  getNodeAccessList(nodeId: LineId): UserPermission[] {
    return Array.from(this.permissions.values()).filter(
      (p) => p.level === PermissionLevel.NODE && p.scope === nodeId
    );
  }

  // ==================== 查询与审计 ====================

  /**
   * 获取用户的所有权限记录
   */
  getUserPermissions(userId: UserId): UserPermission[] {
    return Array.from(this.permissions.values()).filter((p) => p.userId === userId);
  }

  /**
   * 获取资源的权限分配
   */
  getResourcePermissions(level: PermissionLevel, scope: string): UserPermission[] {
    return Array.from(this.permissions.values()).filter((p) => p.level === level && p.scope === scope);
  }

  /**
   * 获取角色变更审计日志
   */
  getAuditLog(limit = 100): typeof this.roleHistory {
    return this.roleHistory.slice(-limit);
  }

  /**
   * 批量撤销用户所有权限
   */
  revokeAllUserPermissions(userId: UserId): number {
    let count = 0;
    for (const [key, perm] of this.permissions) {
      if (perm.userId === userId) {
        this.permissions.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * 获取在安全性上不弱于给定角色的最小角色
   */
  getRequiredRoleForAction(action: string): PermissionRole {
    for (const [role, actions] of Object.entries(ROLE_PERMISSIONS)) {
      if (actions.includes(action)) return role as PermissionRole;
    }
    return PermissionRole.ADMIN;
  }

  // ==================== 序列化 ====================

  /** 导出权限快照（用于持久化到 localStorage / DB） */
  exportSnapshot(): { permissions: UserPermission[]; dataBorders: Array<[FileId, DataBorderConfig]> } {
    return {
      permissions: Array.from(this.permissions.values()),
      dataBorders: Array.from(this.dataBorders.entries()),
    };
  }

  /** 从快照恢复 */
  importSnapshot(snapshot: ReturnType<this['exportSnapshot']>): void {
    this.permissions.clear();
    this.dataBorders.clear();
    for (const perm of snapshot.permissions) {
      const key = this.buildKey(perm.userId, perm.level, perm.scope);
      this.permissions.set(key, perm);
    }
    for (const [fileId, config] of snapshot.dataBorders) {
      this.dataBorders.set(fileId, config);
    }
  }

  // ==================== 内部工具 ====================

  private buildKey(userId: UserId, level: PermissionLevel, scope: string): string {
    return `${userId}:${level}:${scope}`;
  }

  /** 清理过期权限 */
  purgeExpired(): number {
    let count = 0;
    const now = Date.now();
    for (const [key, perm] of this.permissions) {
      if (perm.expiresAt && perm.expiresAt < now) {
        this.permissions.delete(key);
        count++;
      }
    }
    return count;
  }

  destroy(): void {
    this.permissions.clear();
    this.roleHistory = [];
    this.dataBorders.clear();
  }
}
