import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { RecycleService, SoftDeleteDto, RecycleListQuery } from './recycle.service';
import { ApiResponse } from '../../shared/api.types';
import { JwtAuthGuard, Roles } from '../auth/auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
@Roles('admin', 'editor', 'viewer')
export class RecycleController {
  constructor(private readonly svc: RecycleService) {}

  // ==================== 新路由 ====================

  @Post('documents/:fileId/recycle')
  @Roles('admin', 'editor')
  async softDelete(
    @Param('fileId') fileId: string,
    @Body() dto: SoftDeleteDto,
    @Req() req: any,
  ): Promise<ApiResponse<any>> {
    const data = await this.svc.softDelete(req.user?.userId ?? 'anonymous', { ...dto, fileId });
    return this.ok(data);
  }

  @Get('documents/:fileId/recycle')
  async list(
    @Param('fileId') fileId: string,
    @Query() query: RecycleListQuery,
  ): Promise<ApiResponse<any>> {
    const data = await this.svc.list(fileId, query);
    return this.ok(data);
  }

  @Post('documents/:fileId/recycle/restore')
  @Roles('admin', 'editor')
  async restoreItems(
    @Param('fileId') fileId: string,
    @Body() body: { itemIds: string[] },
  ): Promise<ApiResponse<any>> {
    const data = await this.svc.batchRestore(fileId, body.itemIds);
    return this.ok(data);
  }

  @Delete('documents/:fileId/recycle')
  @Roles('admin', 'editor')
  async cleanItems(
    @Param('fileId') fileId: string,
    @Body() body: { itemIds: string[] },
  ): Promise<ApiResponse<any>> {
    const count = await this.svc.batchClean(fileId, body.itemIds ?? []);
    return this.ok({ cleaned: count });
  }

  @Delete('documents/:fileId/recycle/all')
  @Roles('admin')
  async cleanAll(@Param('fileId') fileId: string): Promise<ApiResponse<any>> {
    const count = await this.svc.cleanAll(fileId);
    return this.ok({ cleaned: count });
  }

  @Get('documents/:fileId/recycle/stats')
  async stats(@Param('fileId') fileId: string): Promise<ApiResponse<any>> {
    const data = await this.svc.getStats(fileId);
    return this.ok(data);
  }

  // ==================== 兼容旧路由 ====================

  @Post('file/:fileId/recycle/delete')
  @Roles('admin', 'editor')
  async deleteLegacy(@Param('fileId') fid: string, @Body() b: any, @Req() req: any) {
    return this.ok(await this.svc.softDelete(req.user?.userId ?? 'anonymous', { ...b, fileId: fid }));
  }
  @Get('file/:fileId/recycle/list') async listLegacy(@Param('fileId') fid: string, @Query() q: any) {
    return this.ok(await this.svc.list(fid, q));
  }
  @Post('file/:fileId/recycle/restore') @Roles('admin', 'editor') async restoreLegacy(@Param('fileId') fid: string, @Body() b: any) {
    return this.ok(await this.svc.restore(fid, b.itemId));
  }
  @Delete('file/:fileId/recycle/clean') @Roles('admin', 'editor') async cleanLegacy(@Param('fileId') fid: string, @Body() b: any) {
    return this.ok(await this.svc.clean(fid, b.itemId));
  }

  private ok<T>(d: T): ApiResponse<T> {
    return { code: 0, message: '操作成功', data: d, requestId: '', timestamp: Date.now() };
  }
}
