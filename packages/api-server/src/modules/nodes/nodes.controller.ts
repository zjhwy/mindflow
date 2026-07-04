import {
  Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, Req, UseGuards,
} from '@nestjs/common';
import { NodesService, CreateDocumentDto, CreateLinesDto, UpdateLineDto, ReorderLinesDto, BatchSyncDto, PaginationDto, PaginatedResult } from './nodes.service';
import { ApiResponse } from '@mindflow/shared';
import { JwtAuthGuard, Roles } from '../auth/auth.guard';

@Controller()
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  // ==================== 文档管理 ====================

  @Post('documents')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor')
  async createDocument(@Body() dto: CreateDocumentDto, @Req() req: any): Promise<ApiResponse<any>> {
    const data = await this.nodesService.createDocument(dto, req.user?.userId ?? 'anonymous');
    return this.ok(data);
  }

  @Get('documents')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor', 'viewer')
  async listDocuments(@Query() pagination: PaginationDto): Promise<ApiResponse<PaginatedResult<any>>> {
    const data = await this.nodesService.listDocuments('', pagination);
    return this.ok(data);
  }

  @Get('documents/:fileId')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor', 'viewer')
  async getDocument(@Param('fileId') fileId: string): Promise<ApiResponse<any>> {
    const data = await this.nodesService.getDocument(fileId);
    return this.ok(data);
  }

  @Delete('documents/:fileId')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor')
  async deleteDocument(@Param('fileId') fileId: string): Promise<ApiResponse<boolean>> {
    const data = await this.nodesService.deleteDocument(fileId);
    return this.ok(data);
  }

  // ==================== 节点 CRUD ====================

  @Get('documents/:fileId/lines')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor', 'viewer')
  async getLines(@Param('fileId') fileId: string): Promise<ApiResponse<any[]>> {
    const data = await this.nodesService.getLines(fileId);
    return this.ok(data);
  }

  @Post('documents/:fileId/lines')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor')
  async createLines(@Param('fileId') fileId: string, @Body() dto: CreateLinesDto): Promise<ApiResponse<any[]>> {
    const data = await this.nodesService.createLines(fileId, dto);
    return this.ok(data);
  }

  @Put('documents/:fileId/lines/:lineId')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor')
  async updateLine(
    @Param('fileId') fileId: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateLineDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.nodesService.updateLine(fileId, lineId, dto);
    return this.ok(data);
  }

  @Delete('documents/:fileId/lines/:lineId')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor')
  async deleteLine(@Param('fileId') fileId: string, @Param('lineId') lineId: string): Promise<ApiResponse<boolean>> {
    const data = await this.nodesService.deleteLine(fileId, lineId);
    return this.ok(data);
  }

  @Patch('documents/:fileId/lines/reorder')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor')
  async reorder(@Param('fileId') fileId: string, @Body() dto: ReorderLinesDto): Promise<ApiResponse<boolean>> {
    const data = await this.nodesService.reorderLines(fileId, dto);
    return this.ok(data);
  }

  // ==================== 批量同步 ====================

  @Post('documents/:fileId/sync/batch')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor')
  async batchSync(@Param('fileId') fileId: string, @Body() dto: BatchSyncDto): Promise<ApiResponse<any>> {
    const data = await this.nodesService.batchSync(fileId, dto);
    return this.ok(data);
  }

  // ==================== 兼容旧路由 ====================

  @Get('nodes/:nodeId/inner-lines')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor', 'viewer')
  async getLinesLegacy(@Param('nodeId') nodeId: string): Promise<ApiResponse<any[]>> {
    const data = await this.nodesService.getLines(nodeId);
    return this.ok(data);
  }

  @Post('nodes/:nodeId/inner-lines')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor')
  async createLinesLegacy(@Param('nodeId') nodeId: string, @Body() body: { lines: any[] }): Promise<ApiResponse<any[]>> {
    const data = await this.nodesService.createLines(nodeId, { lines: body.lines });
    return this.ok(data);
  }

  @Put('nodes/:nodeId/inner-lines/:lineId')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor')
  async updateLineLegacy(
    @Param('nodeId') nodeId: string,
    @Param('lineId') lineId: string,
    @Body() body: any,
  ): Promise<ApiResponse<any>> {
    const data = await this.nodesService.updateLine(nodeId, lineId, body);
    return this.ok(data);
  }

  @Delete('nodes/:nodeId/inner-lines/:lineId')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor')
  async deleteLineLegacy(@Param('nodeId') nodeId: string, @Param('lineId') lineId: string): Promise<ApiResponse<boolean>> {
    const data = await this.nodesService.deleteLine(nodeId, lineId);
    return this.ok(data);
  }

  @Patch('nodes/:nodeId/inner-lines/reorder')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor')
  async reorderLegacy(@Param('nodeId') nodeId: string, @Body() body: { lineIds: string[] }): Promise<ApiResponse<boolean>> {
    const data = await this.nodesService.reorderLines(nodeId, { lineIds: body.lineIds });
    return this.ok(data);
  }

  // ==================== 统计 ====================

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'editor', 'viewer')
  async getStats(@Req() req: any): Promise<ApiResponse<any>> {
    const data = await this.nodesService.getStats(req.user?.userId ?? '');
    return this.ok(data);
  }

  // ==================== 工具 ====================

  private ok<T>(data: T): ApiResponse<T> {
    return { code: 0, message: '操作成功', data, requestId: '', timestamp: Date.now() };
  }
}
