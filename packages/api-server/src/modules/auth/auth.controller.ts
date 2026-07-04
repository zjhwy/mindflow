import { Controller, Post, Body, HttpCode, UseGuards, Req, Headers } from '@nestjs/common';
import { IsString, MinLength, MaxLength } from 'class-validator';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../shared/api.types';
import { JwtAuthGuard, Roles } from './auth.guard';

class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

class RefreshDto {
  @IsString()
  refreshToken!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<ApiResponse<any>> {
    const result = await this.authService.register(dto.username, dto.password);
    return this.ok(result);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto): Promise<ApiResponse<any>> {
    const result = await this.authService.login(dto.username, dto.password);
    return this.ok(result);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshDto): Promise<ApiResponse<any>> {
    const result = await this.authService.refreshToken(dto.refreshToken);
    return this.ok(result);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor', 'viewer')
  async logout(@Body() dto: RefreshDto): Promise<ApiResponse<null>> {
    await this.authService.logout(dto.refreshToken);
    return this.ok(null);
  }

  @Post('me')
  @HttpCode(200)
  async me(@Headers('authorization') authHeader: string): Promise<ApiResponse<any>> {
    if (!authHeader?.startsWith('Bearer ')) {
      return { code: 401, message: '未登录', data: null, requestId: '', timestamp: Date.now() };
    }
    try {
      const jwt = await import('jsonwebtoken');
      const secret = process.env.JWT_SECRET ?? 'mindflow-jwt-secret-key';
      const payload: any = jwt.default.verify(authHeader.substring(7), secret);
      const user = this.authService.getUserById(payload.userId);
      if (!user) {
        return { code: 401, message: '用户不存在或已注销', data: null, requestId: '', timestamp: Date.now() };
      }
      return this.ok(user);
    } catch {
      return { code: 401, message: '认证已过期', data: null, requestId: '', timestamp: Date.now() };
    }
  }

  private ok<T>(data: T): ApiResponse<T> {
    return { code: 0, message: '操作成功', data, requestId: '', timestamp: Date.now() };
  }
}
