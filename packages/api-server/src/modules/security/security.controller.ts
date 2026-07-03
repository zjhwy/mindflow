import { Controller, Get, Post, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { SecurityService } from './security.service';
import { ApiResponse } from '../../shared/api.types';
import { JwtAuthGuard, Roles } from '../auth/auth.guard';

@Controller('security')
@UseGuards(JwtAuthGuard)
@Roles('admin', 'editor', 'viewer')
export class SecurityController {
  constructor(private readonly svc: SecurityService) {}

  @Post('files/:fileId/decrypt/init')
  @Roles('admin', 'editor')
  async initDecrypt(@Param('fileId') fileId: string, @Req() req: any): Promise<ApiResponse<any>> {
    return this.ok(await this.svc.initDecrypt(fileId, req.user?.userId ?? 'anonymous'));
  }

  @Post('files/:fileId/decrypt/challenge')
  @Roles('admin', 'editor')
  async challenge(
    @Param('fileId') fileId: string,
    @Body() body: { sessionId: string; challenge: any },
    @Req() req: any,
  ): Promise<ApiResponse<any>> {
    return this.ok(
      await this.svc.challengeDecrypt(fileId, body.sessionId, body.challenge, req.user?.userId ?? 'anonymous'),
    );
  }

  @Get('files/:fileId/decrypt/status')
  async status(
    @Param('fileId') fileId: string,
    @Query('sessionId') sessionId: string,
  ): Promise<ApiResponse<any>> {
    return this.ok(await this.svc.getDecryptStatus(fileId, sessionId ?? ''));
  }

  @Post('decrypt/complete')
  @Roles('admin', 'editor')
  async completeDecrypt(@Body() body: { sessionId: string }): Promise<ApiResponse<any>> {
    this.svc.completeDecrypt(body.sessionId);
    return this.ok({ completed: true });
  }

  @Post('devices/:deviceId/revoke')
  @Roles('admin')
  async revoke(@Param('deviceId') deviceId: string, @Req() req: any): Promise<ApiResponse<boolean>> {
    return this.ok(await this.svc.revokeDevice(deviceId, req.user?.userId ?? 'anonymous'));
  }

  @Get('audit-log')
  @Roles('admin')
  async auditLog(@Query() q: any): Promise<ApiResponse<any>> {
    return this.ok(await this.svc.getAuditLogs(q));
  }

  @Get('score')
  async score(@Req() req: any): Promise<ApiResponse<any>> {
    return this.ok(await this.svc.getSecurityScore(req.user?.userId ?? 'anonymous'));
  }

  private ok<T>(d: T): ApiResponse<T> {
    return { code: 0, message: '操作成功', data: d, requestId: '', timestamp: Date.now() };
  }
}
