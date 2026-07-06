import {
  Controller, Get, Post, Put, Delete, Param, Body, Req, UseGuards,
} from '@nestjs/common';
import { ConnectionsService, CreateConnectionDto, UpdateConnectionDto } from './connections.service';
import { JwtAuthGuard, Roles } from '../auth/auth.guard';

@Controller('documents/:documentId/connections')
@UseGuards(JwtAuthGuard)
@Roles('admin', 'editor')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  /** 获取文档下所有连线 */
  @Get()
  async list(@Param('documentId') documentId: string) {
    const connections = await this.connectionsService.getConnections(documentId);
    return {
      code: 200,
      message: 'ok',
      data: connections,
      requestId: '',
      timestamp: Date.now(),
    };
  }

  /** 创建连线 */
  @Post()
  async create(
    @Param('documentId') documentId: string,
    @Body() dto: CreateConnectionDto,
    @Req() req: any,
  ) {
    const connection = await this.connectionsService.createConnection(
      dto,
      documentId,
      req.user?.userId ?? 'anonymous',
    );

    return {
      code: 201,
      message: '连线已创建',
      data: connection,
      requestId: '',
      timestamp: Date.now(),
    };
  }

  /** 更新连线 */
  @Put(':connectionId')
  async update(
    @Param('connectionId') connectionId: string,
    @Body() dto: UpdateConnectionDto,
  ) {
    const connection = await this.connectionsService.updateConnection(connectionId, dto);
    if (!connection) {
      return {
        code: 404,
        message: '连线不存在',
        data: null,
        requestId: '',
        timestamp: Date.now(),
      };
    }
    return {
      code: 200,
      message: '连线已更新',
      data: connection,
      requestId: '',
      timestamp: Date.now(),
    };
  }

  /** 删除连线 */
  @Delete(':connectionId')
  async delete(@Param('connectionId') connectionId: string) {
    const deleted = await this.connectionsService.deleteConnection(connectionId);
    return {
      code: deleted ? 200 : 404,
      message: deleted ? '连线已删除' : '连线不存在',
      data: null,
      requestId: '',
      timestamp: Date.now(),
    };
  }
}
