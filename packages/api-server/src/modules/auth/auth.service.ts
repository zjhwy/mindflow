import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

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

@Injectable()
export class AuthService {
  // 内存用户存储（正式环境应使用TypeORM User实体）
  private users = new Map<string, { userId: string; username: string; passwordHash: string; role: string }>();
  private refreshTokens = new Map<string, string>(); // token -> userId

  constructor(private readonly config: ConfigService) {
    // 初始化默认管理员
    this.seedDefaultAdmin();
  }

  private async seedDefaultAdmin(): Promise<void> {
    const adminUser = this.config.get<string>('ADMIN_USERNAME', 'admin');
    const adminPass = this.config.get<string>('ADMIN_PASSWORD', 'mindmap123');
    const hash = await bcrypt.hash(adminPass, 10);
    this.users.set(adminUser, {
      userId: 'admin-001',
      username: adminUser,
      passwordHash: hash,
      role: 'admin',
    });
  }

  async register(username: string, password: string): Promise<{ userId: string; username: string }> {
    if (this.users.has(username)) {
      throw new UnauthorizedException('用户名已存在');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.users.set(username, { userId, username, passwordHash, role: 'editor' });
    return { userId, username };
  }

  async login(username: string, password: string): Promise<LoginResult> {
    const user = this.users.get(username);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload: JwtPayload = {
      userId: user.userId,
      username: user.username,
      role: user.role,
    };

    const secret = this.config.get<string>('JWT_SECRET', 'mindflow-jwt-secret-key');
    const expiresIn = this.config.get<number>('JWT_EXPIRES_IN', 3600); // 1 hour

    const accessToken = jwt.sign(payload, secret, { expiresIn });
    const refreshToken = jwt.sign(payload, secret, { expiresIn: 86400 * 7 }); // 7 days

    this.refreshTokens.set(refreshToken, user.userId);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: { userId: user.userId, username: user.username, role: user.role },
    };
  }

  async refreshToken(token: string): Promise<LoginResult> {
    const userId = this.refreshTokens.get(token);
    if (!userId) {
      throw new UnauthorizedException('无效的 refresh token');
    }

    let user: { userId: string; username: string; role: string } | undefined;
    this.users.forEach((u) => {
      if (u.userId === userId) user = { userId: u.userId, username: u.username, role: u.role };
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const secret = this.config.get<string>('JWT_SECRET', 'mindflow-jwt-secret-key');
    const expiresIn = this.config.get<number>('JWT_EXPIRES_IN', 3600);

    const payload: JwtPayload = {
      userId: user.userId,
      username: user.username,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, secret, { expiresIn });
    const newRefreshToken = jwt.sign(payload, secret, { expiresIn: 86400 * 7 });

    this.refreshTokens.delete(token);
    this.refreshTokens.set(newRefreshToken, user.userId);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
      user,
    };
  }

  async validateUser(payload: JwtPayload): Promise<{ userId: string; username: string; role: string } | null> {
    let found: { userId: string; username: string; role: string } | null = null;
    this.users.forEach((u) => {
      if (u.userId === payload.userId) {
        found = { userId: u.userId, username: u.username, role: u.role };
      }
    });
    return found;
  }

  async logout(refreshToken: string): Promise<void> {
    this.refreshTokens.delete(refreshToken);
  }

  getUserById(userId: string): { userId: string; username: string; role: string } | undefined {
    let found: { userId: string; username: string; role: string } | undefined;
    this.users.forEach((u) => {
      if (u.userId === userId) found = { userId: u.userId, username: u.username, role: u.role };
    });
    return found;
  }
}
