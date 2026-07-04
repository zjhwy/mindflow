import { Injectable, UnauthorizedException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '../../database/supabase.service';

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { userId: string; username: string; role: string };
}

interface UserRecord {
  userId: string;
  username: string;
  passwordHash: string;
  role: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private memoryMode = false;
  private memoryUsers = new Map<string, UserRecord>();
  private memoryRefreshTokens = new Map<string, string>();

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultAdmin();
  }

  private async seedDefaultAdmin(): Promise<void> {
    const adminUser = this.config.get<string>('ADMIN_USERNAME', 'admin');
    const adminPass = this.config.get<string>('ADMIN_PASSWORD', 'mindmap123');
    const hash = await bcrypt.hash(adminPass, 10);

    if (!this.supabase.isAvailable()) {
      this.logger.warn('[Auth] Supabase unavailable → running in memory mode (data lost on restart)');
      this.memoryMode = true;
      this.memoryUsers.set(adminUser, { userId: 'admin-001', username: adminUser, passwordHash: hash, role: 'admin' });
      return;
    }

    try {
      const { data: existing } = await this.supabase.fromUsers()
        .select('id').eq('username', adminUser).maybeSingle();

      if (existing) return;

      await this.supabase.fromUsers().insert({
        username: adminUser, password_hash: hash, role: 'admin',
      });
      this.logger.log('[Auth] Default admin user seeded to Supabase');
    } catch (err: any) {
      this.logger.warn(`[Auth] Supabase seed failed: ${err.message} → falling back to memory mode`);
      this.memoryMode = true;
      this.memoryUsers.set(adminUser, { userId: 'admin-001', username: adminUser, passwordHash: hash, role: 'admin' });
    }
  }

  // ==================== Register ====================

  async register(username: string, password: string): Promise<{ userId: string; username: string }> {
    if (this.memoryMode) {
      if (this.memoryUsers.has(username)) throw new UnauthorizedException('用户名已存在');
      const pHash = await bcrypt.hash(password, 10);
      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      this.memoryUsers.set(username, { userId, username, passwordHash: pHash, role: 'editor' });
      return { userId, username };
    }

    // Check duplicate
    const { data: dup } = await this.supabase.fromUsers()
      .select('id').eq('username', username).maybeSingle();
    if (dup) throw new UnauthorizedException('用户名已存在');

    const passwordHash = await bcrypt.hash(password, 10);
    const { data, error } = await this.supabase.fromUsers()
      .insert({ username, password_hash: passwordHash, role: 'editor' })
      .select('id, username').single();

    if (error) throw new UnauthorizedException(`注册失败: ${error.message}`);
    return { userId: data.id, username: data.username };
  }

  // ==================== Login ====================

  async login(username: string, password: string): Promise<LoginResult> {
    if (this.memoryMode) return this.loginMemory(username, password);

    const { data: user } = await this.supabase.fromUsers()
      .select('id, username, password_hash, role')
      .eq('username', username).maybeSingle();

    if (!user) throw new UnauthorizedException('用户名或密码错误');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedException('用户名或密码错误');

    return this.issueTokens({ userId: user.id, username: user.username, role: user.role });
  }

  private async loginMemory(username: string, password: string): Promise<LoginResult> {
    const user = this.memoryUsers.get(username);
    if (!user) throw new UnauthorizedException('用户名或密码错误');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('用户名或密码错误');
    return this.issueTokensMemory(user);
  }

  // ==================== Refresh ====================

  async refreshToken(token: string): Promise<LoginResult> {
    if (this.memoryMode) {
      const userId = this.memoryRefreshTokens.get(token);
      if (!userId) throw new UnauthorizedException('无效的 refresh token');
      const user = this.findMemoryUserById(userId);
      if (!user) throw new UnauthorizedException('用户不存在');
      this.memoryRefreshTokens.delete(token);
      return this.issueTokensMemory(user);
    }

    // Verify token exists in DB
    const { data: rt } = await this.supabase.fromRefreshTokens()
      .select('user_id').eq('token', token).maybeSingle();
    if (!rt) throw new UnauthorizedException('无效的 refresh token');

    const { data: user } = await this.supabase.fromUsers()
      .select('id, username, role').eq('id', rt.user_id).maybeSingle();
    if (!user) throw new UnauthorizedException('用户不存在');

    // Delete old, create new
    await this.supabase.fromRefreshTokens().delete().eq('token', token);

    return this.issueTokens({ userId: user.id, username: user.username, role: user.role });
  }

  // ==================== Validate ====================

  async validateUser(payload: JwtPayload): Promise<{ userId: string; username: string; role: string } | null> {
    if (this.memoryMode) return this.findMemoryUserById(payload.userId) ?? null;

    const { data } = await this.supabase.fromUsers()
      .select('id, username, role').eq('id', payload.userId).maybeSingle();
    if (!data) return null;
    return { userId: data.id, username: data.username, role: data.role };
  }

  // ==================== Logout ====================

  async logout(refreshToken: string): Promise<void> {
    if (this.memoryMode) {
      this.memoryRefreshTokens.delete(refreshToken);
      return;
    }
    await this.supabase.fromRefreshTokens().delete().eq('token', refreshToken);
  }

  // ==================== Get User ====================

  getUserById(userId: string): { userId: string; username: string; role: string } | undefined {
    // This is sync, memo from memory mode only. Supabase path uses async.
    // Called by auth.controller.ts /me endpoint — which already fetches from DB.
    // For Supabase mode, this is a best-effort sync lookup (returns undefined, callers should use validateUser).
    if (this.memoryMode) return this.findMemoryUserById(userId);
    return undefined;
  }

  // ==================== Private Helpers ====================

  private async issueTokens(user: { userId: string; username: string; role: string }): Promise<LoginResult> {
    const payload: JwtPayload = { userId: user.userId, username: user.username, role: user.role };
    const secret = this.config.get<string>('JWT_SECRET', 'mindflow-jwt-secret-key');
    const expiresIn = this.config.get<number>('JWT_EXPIRES_IN', 3600);

    const accessToken = jwt.sign(payload, secret, { expiresIn });
    const refreshToken = jwt.sign(payload, secret, { expiresIn: 86400 * 7 });

    // Store refresh token
    if (!this.memoryMode) {
      await this.supabase.fromRefreshTokens().insert({
        user_id: user.userId, token: refreshToken,
      });
    } else {
      this.memoryRefreshTokens.set(refreshToken, user.userId);
    }

    return {
      accessToken, refreshToken, expiresIn,
      user: { userId: user.userId, username: user.username, role: user.role },
    };
  }

  private issueTokensMemory(user: { userId: string; username: string; role: string }): Promise<LoginResult> {
    return this.issueTokens({ userId: user.userId, username: user.username, role: user.role });
  }

  private findMemoryUserById(userId: string): { userId: string; username: string; role: string } | undefined {
    for (const u of this.memoryUsers.values()) {
      if (u.userId === userId) return { userId: u.userId, username: u.username, role: u.role };
    }
    return undefined;
  }
}
