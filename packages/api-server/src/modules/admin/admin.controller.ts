import {
  Controller, Get, Put, Post, Param, Body, Query, Req, UseGuards,
} from '@nestjs/common';
import {
  AdminService, AdminQueryDto, UpdateUserDto,
  AuditLogQueryDto, SystemConfigDto, PaginatedResult,
} from './admin.service';
import { JwtAuthGuard, Roles } from '../auth/auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== 仪表盘 ====================

  @Get('stats')
  async getStats() {
    const stats = await this.adminService.getStats();
    return { code: 200, message: 'ok', data: stats, requestId: '', timestamp: Date.now() };
  }

  // ==================== 用户管理 ====================

  @Get('users')
  async listUsers(@Query() query: AdminQueryDto) {
    const result = await this.adminService.listUsers(query);
    return { code: 200, message: 'ok', data: result, requestId: '', timestamp: Date.now() };
  }

  @Get('users/:userId')
  async getUser(@Param('userId') userId: string) {
    const user = await this.adminService.getUserById(userId);
    if (!user) {
      return { code: 404, message: '用户不存在', data: null, requestId: '', timestamp: Date.now() };
    }
    return { code: 200, message: 'ok', data: user, requestId: '', timestamp: Date.now() };
  }

  @Put('users/:userId')
  async updateUser(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    // 禁止修改自己的角色
    if (userId === req.user?.userId && dto.role !== undefined) {
      return { code: 403, message: '不能修改自己的角色', data: null, requestId: '', timestamp: Date.now() };
    }

    const user = await this.adminService.updateUser(userId, dto);
    if (!user) {
      return { code: 500, message: '更新失败', data: null, requestId: '', timestamp: Date.now() };
    }
    return { code: 200, message: '用户已更新', data: user, requestId: '', timestamp: Date.now() };
  }

  // ==================== 审计日志 ====================

  @Get('audit-logs')
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    const result = await this.adminService.getAuditLogs(query);
    return { code: 200, message: 'ok', data: result, requestId: '', timestamp: Date.now() };
  }

  // ==================== 系统配置 ====================

  @Get('config')
  async getConfig() {
    const config = await this.adminService.getSystemConfigs();
    return { code: 200, message: 'ok', data: config, requestId: '', timestamp: Date.now() };
  }

  @Put('config/:key')
  async updateConfig(
    @Param('key') key: string,
    @Body() dto: SystemConfigDto,
    @Req() req: any,
  ) {
    const ok = await this.adminService.updateSystemConfig(key, dto, req.user?.userId);
    return {
      code: ok ? 200 : 500,
      message: ok ? '配置已更新' : '更新失败',
      data: null,
      requestId: '',
      timestamp: Date.now(),
    };
  }
}
