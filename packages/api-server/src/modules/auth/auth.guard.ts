import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from './auth.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 没有角色要求则直接放行
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少认证令牌');
    }

    const token = authHeader.substring(7);
    const secret = this.config.get<string>('JWT_SECRET', 'mindflow-jwt-secret-key');

    try {
      const payload = jwt.verify(token, secret) as JwtPayload;
      request.user = payload;
      return requiredRoles.includes(payload.role);
    } catch (err) {
      throw new UnauthorizedException('认证令牌无效或已过期');
    }
  }
}

/** 可选认证 — 解析 token 但不强制要求 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const secret = this.config.get<string>('JWT_SECRET', 'mindflow-jwt-secret-key');
      try {
        request.user = jwt.verify(token, secret) as JwtPayload;
      } catch {
        request.user = null;
      }
    }

    return true;
  }
}
