import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { Operation } from '@mindflow/shared';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '../modules/auth/auth.service';

interface RoomMember {
  socketId: string;
  userId: string;
  username: string;
  connectedAt: number;
}

/**
 * 实时协同同步网关 (Socket.IO)
 * 文档第5.2节 - 协同同步方案
 */
@WebSocketGateway({
  namespace: '/collab',
  cors: { origin: true, credentials: true },
  pingInterval: 10000,
  pingTimeout: 5000,
})
export class SyncGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SyncGateway.name);

  // 房间管理: fileId → Set<RoomMember>
  private rooms = new Map<string, Set<RoomMember>>();

  // 用户映射: socketId → { userId, username, roomId }
  private users = new Map<string, { userId: string; username: string; fileId: string }>();

  // 操作缓存（用于新加入者获取历史）
  private roomHistory = new Map<string, Operation[]>();

  constructor(private readonly config: ConfigService) {}

  afterInit(server: Server): void {
    this.logger.log('SyncGateway 初始化完成');
  }

  // ==================== 连接管理 ====================

  handleConnection(client: Socket): void {
    const token = client.handshake.auth?.token;
    if (!token) {
      this.logger.warn(`客户端 ${client.id} 未提供 token, 拒绝连接`);
      client.disconnect();
      return;
    }

    try {
      const secret = this.config.get<string>('JWT_SECRET', 'mindflow-jwt-secret-key');
      const payload = jwt.verify(token, secret) as JwtPayload;
      const fileId = client.handshake.auth?.fileId;

      if (!fileId) {
        client.disconnect();
        return;
      }

      this.users.set(client.id, { userId: payload.userId, username: payload.username, fileId });
      this.joinRoom(fileId, client, payload);

      this.logger.log(`用户 ${payload.username} (${payload.userId}) 加入协同, 文件: ${fileId}`);
    } catch (err) {
      this.logger.warn(`客户端 ${client.id} token 验证失败:`, err);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const user = this.users.get(client.id);
    if (!user) return;

    const { fileId, userId, username } = user;
    this.leaveRoom(fileId, client);
    this.users.delete(client.id);

    this.logger.log(`用户 ${username} (${userId}) 离开协同, 文件: ${fileId}`);

    // 通知房间其他成员
    this.server.to(`file:${fileId}`).emit('user:leave', {
      userId,
      username,
      roomSize: this.getRoomSize(fileId),
    });
  }

  // ==================== 消息处理 ====================

  @SubscribeMessage('op:apply')
  handleOperation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { operations: Operation[] },
  ): void {
    const user = this.users.get(client.id);
    if (!user) return;

    const { fileId, userId, username } = user;
    const ops = data.operations;

    if (!ops || ops.length === 0) return;

    // 广播给房间内其他成员
    client.to(`file:${fileId}`).emit('op:apply', {
      operations: ops,
      source: userId,
      sourceName: username,
    });

    // 缓存历史操作
    const history = this.roomHistory.get(fileId) ?? [];
    history.push(...ops);
    // 只保留最近 1000 条
    if (history.length > 1000) {
      this.roomHistory.set(fileId, history.slice(-1000));
    } else {
      this.roomHistory.set(fileId, history);
    }
  }

  @SubscribeMessage('op:ack')
  handleAck(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { opTimestamps: number[] },
  ): void {
    const user = this.users.get(client.id);
    if (!user) return;
    // 确认收到 — 可以用于服务端确认同步进度
  }

  @SubscribeMessage('cursor:move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lineId: string; x: number; y: number },
  ): void {
    const user = this.users.get(client.id);
    if (!user) return;

    client.to(`file:${user.fileId}`).emit('cursor:move', {
      userId: user.userId,
      username: user.username,
      ...data,
    });
  }

  @SubscribeMessage('view:state')
  handleViewState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { canvasX: number; canvasY: number; zoom: number },
  ): void {
    const user = this.users.get(client.id);
    if (!user) return;

    client.to(`file:${user.fileId}`).emit('view:state', {
      userId: user.userId,
      ...data,
    });
  }

  @SubscribeMessage('chat:message')
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string },
  ): void {
    const user = this.users.get(client.id);
    if (!user) return;

    this.server.to(`file:${user.fileId}`).emit('chat:message', {
      userId: user.userId,
      username: user.username,
      text: data.text,
      timestamp: Date.now(),
    });
  }

  // ==================== 房间管理 ====================

  private joinRoom(fileId: string, client: Socket, user: JwtPayload): void {
    if (!this.rooms.has(fileId)) {
      this.rooms.set(fileId, new Set());
    }

    const member: RoomMember = {
      socketId: client.id,
      userId: user.userId,
      username: user.username,
      connectedAt: Date.now(),
    };

    this.rooms.get(fileId)!.add(member);
    client.join(`file:${fileId}`);

    // 发送当前房间成员列表
    const members = Array.from(this.rooms.get(fileId)!).map((m) => ({
      userId: m.userId,
      username: m.username,
      connectedAt: m.connectedAt,
    }));

    client.emit('room:joined', {
      fileId,
      members,
      history: this.roomHistory.get(fileId) ?? [],
    });

    // 通知其他成员
    client.to(`file:${fileId}`).emit('user:join', {
      userId: user.userId,
      username: user.username,
      roomSize: members.length,
    });
  }

  private leaveRoom(fileId: string, client: Socket): void {
    const room = this.rooms.get(fileId);
    if (!room) return;

    const toRemove: RoomMember[] = [];
    room.forEach((m) => {
      if (m.socketId === client.id) toRemove.push(m);
    });
    toRemove.forEach((m) => room.delete(m));

    client.leave(`file:${fileId}`);

    if (room.size === 0) {
      this.rooms.delete(fileId);
      // 可选：清理历史
      // this.roomHistory.delete(fileId);
    }
  }

  private getRoomSize(fileId: string): number {
    return this.rooms.get(fileId)?.size ?? 0;
  }

  // ==================== 查询接口 ====================

  /** 获取文件当前的活跃用户列表 */
  getRoomMembers(fileId: string): Array<{ userId: string; username: string; connectedAt: number }> {
    const room = this.rooms.get(fileId);
    if (!room) return [];
    return Array.from(room).map((m) => ({
      userId: m.userId,
      username: m.username,
      connectedAt: m.connectedAt,
    }));
  }

  /** 获取文件的操作历史（支持翻页） */
  getRoomHistory(fileId: string, since?: number): Operation[] {
    const history = this.roomHistory.get(fileId) ?? [];
    if (since) {
      return history.filter((op) => op.timestamp > since);
    }
    return history;
  }
}
