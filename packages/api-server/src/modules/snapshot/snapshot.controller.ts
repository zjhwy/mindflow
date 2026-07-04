import { Controller, Get, Post, Delete, Put, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { SnapshotService } from './snapshot.service';
import { ApiResponse } from '@mindflow/shared';
import { JwtAuthGuard, Roles } from '../auth/auth.guard';

@Controller('documents')
@UseGuards(JwtAuthGuard)
@Roles('admin', 'editor', 'viewer')
export class SnapshotController {
  constructor(private readonly svc: SnapshotService) {}

  @Post(':fileId/snapshots')
  @Roles('admin', 'editor')
  async create(
    @Param('fileId') fileId: string,
    @Body() body: any,
    @Req() req: any,
  ): Promise<ApiResponse<any>> {
    const data = await this.svc.create(fileId, body, req.user?.userId, body.remark);
    return this.ok(data);
  }

  @Get(':fileId/snapshots')
  async list(
    @Param('fileId') fileId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<ApiResponse<any>> {
    const data = await this.svc.list(fileId, page ?? 1, pageSize ?? 20);
    return this.ok(data);
  }

  @Get(':fileId/snapshots/latest')
  async getLatest(@Param('fileId') fileId: string): Promise<ApiResponse<any>> {
    const data = await this.svc.getLatest(fileId);
    return this.ok(data);
  }

  @Post(':fileId/snapshots/:snapshotId/restore')
  @Roles('admin', 'editor')
  async restore(@Param('snapshotId') snapshotId: string): Promise<ApiResponse<any>> {
    const data = await this.svc.restore(snapshotId);
    return this.ok(data);
  }

  @Delete(':fileId/snapshots/:snapshotId')
  @Roles('admin', 'editor')
  async delete(@Param('snapshotId') snapshotId: string): Promise<ApiResponse<boolean>> {
    const data = await this.svc.delete(snapshotId);
    return this.ok(data);
  }

  @Put(':fileId/snapshots/:snapshotId/remark')
  @Roles('admin', 'editor')
  async updateRemark(
    @Param('snapshotId') snapshotId: string,
    @Body() body: { remark: string },
  ): Promise<ApiResponse<boolean>> {
    const data = await this.svc.updateRemark(snapshotId, body.remark);
    return this.ok(data);
  }

  // ==================== 兼容旧路由 ====================

  @Post('file/:fileId/snapshot/create')
  @Roles('admin', 'editor')
  async createLegacy(@Param('fileId') fid: string, @Body() b: any) { return this.ok(await this.svc.create(fid, b)); }
  @Get('file/:fileId/snapshot/list') async listLegacy(@Param('fileId') fid: string) { return this.ok(await this.svc.list(fid)); }
  @Post('file/:fileId/snapshot/restore') async restoreLegacy(@Body() b: { snapshotId: string }) { return this.ok(await this.svc.restore(b.snapshotId)); }
  @Delete('file/:fileId/snapshot/delete') async deleteLegacy(@Body() b: { snapshotId: string }) { return this.ok(await this.svc.delete(b.snapshotId)); }
  @Put('file/:fileId/snapshot/remark') async remarkLegacy(@Body() b: { snapshotId: string; remark: string }) { return this.ok(await this.svc.updateRemark(b.snapshotId, b.remark)); }

  private ok<T>(d: T): ApiResponse<T> {
    return { code: 0, message: '操作成功', data: d, requestId: '', timestamp: Date.now() };
  }
}
