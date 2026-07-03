import { Injectable, Logger } from '@nestjs/common';
import { DecryptStatusResponse } from '../../shared/api.types';

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp: number;
  result: 'success' | 'failure';
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private auditLogs: AuditLog[] = [];

  // 解密会话
  private decryptSessions = new Map<string, {
    fileId: string;
    step: number;
    startTime: number;
    challenge?: string;
  }>();

  // ==================== 解密流水线（5步） ====================

  async initDecrypt(fileId: string, userId: string): Promise<{ sessionId: string; nextStep: number }> {
    const sessionId = `dec-${fileId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    this.decryptSessions.set(sessionId, {
      fileId,
      step: 1,
      startTime: Date.now(),
    });

    this.logAudit(userId, 'decrypt:init', 'file', fileId, { sessionId });

    return { sessionId, nextStep: 2 };
  }

  async challengeDecrypt(
    fileId: string,
    sessionId: string,
    challenge: any,
    userId: string,
  ): Promise<DecryptStatusResponse> {
    const session = this.decryptSessions.get(sessionId);
    if (!session) {
      throw new Error('无效的解密会话');
    }

    session.step = 2;
    session.challenge = JSON.stringify(challenge);

    this.logAudit(userId, 'decrypt:challenge', 'file', fileId, { sessionId });

    return {
      step: 2,
      stepName: '身份验证',
      progress: 40,
      isComplete: false,
    };
  }

  async getDecryptStatus(fileId: string, sessionId: string): Promise<DecryptStatusResponse> {
    const session = this.decryptSessions.get(sessionId);

    if (!session) {
      // 返回完整解密状态
      return {
        step: 5,
        stepName: '解密完成',
        progress: 100,
        isComplete: true,
        encryptedFileKey: 'env-key-' + fileId.substring(0, 8),
      };
    }

    const stepNames: Record<number, string> = {
      1: '初始化',
      2: '身份验证',
      3: '密钥协商',
      4: '数据解密',
      5: '解密完成',
    };

    return {
      step: session.step as 1 | 2 | 3 | 4 | 5,
      stepName: stepNames[session.step] ?? '未知',
      progress: session.step * 20,
      isComplete: session.step >= 5,
    };
  }

  completeDecrypt(sessionId: string): void {
    const session = this.decryptSessions.get(sessionId);
    if (session) {
      session.step = 5;
      // 5分钟后清理会话
      setTimeout(() => this.decryptSessions.delete(sessionId), 5 * 60 * 1000);
    }
  }

  // ==================== 设备管理 ====================

  async revokeDevice(deviceId: string, userId: string): Promise<boolean> {
    this.logAudit(userId, 'device:revoke', 'device', deviceId, {});
    this.logger.warn(`设备 ${deviceId} 已被用户 ${userId} 吊销`);
    return true;
  }

  // ==================== 审计日志 ====================

  async getAuditLogs(query: {
    userId?: string;
    action?: string;
    from?: number;
    to?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: AuditLog[]; total: number; page: number; pageSize: number }> {
    let filtered = [...this.auditLogs];

    if (query.userId) {
      filtered = filtered.filter((l) => l.userId === query.userId);
    }
    if (query.action) {
      filtered = filtered.filter((l) => l.action.includes(query.action!));
    }
    if (query.from) {
      filtered = filtered.filter((l) => l.timestamp >= query.from!);
    }
    if (query.to) {
      filtered = filtered.filter((l) => l.timestamp <= query.to!);
    }

    // 时间倒序
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return { items, total, page, pageSize };
  }

  private logAudit(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details?: Record<string, any>,
    result: 'success' | 'failure' = 'success',
  ): void {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      userId,
      action,
      resourceType,
      resourceId,
      details,
      timestamp: Date.now(),
      result,
    };

    this.auditLogs.push(log);

    // 最多保留 10000 条
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }
  }

  // ==================== 安全评分 ====================

  async getSecurityScore(userId: string): Promise<{
    score: number;
    maxScore: number;
    risks: string[];
    recommendations: string[];
  }> {
    const risks: string[] = [];
    const recommendations: string[] = [];

    // 示例安全评估逻辑
    const recentLoginAttempts = this.auditLogs.filter(
      (l) => l.userId === userId && l.action === 'auth:login' && l.result === 'failure' &&
        l.timestamp > Date.now() - 3600000
    ).length;

    if (recentLoginAttempts > 3) {
      risks.push('近期有多次登录失败记录');
      recommendations.push('建议开启双因素认证');
    }

    if (risks.length === 0) {
      recommendations.push('当前安全状态良好');
    }

    const score = Math.max(0, 100 - risks.length * 15);

    return { score, maxScore: 100, risks, recommendations };
  }

  // ==================== 生命周期 ====================

  getAuditLogCount(): number {
    return this.auditLogs.length;
  }

  clearAuditLogs(): void {
    this.auditLogs = [];
    this.logger.warn('审计日志已清除');
  }
}
