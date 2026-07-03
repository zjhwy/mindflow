import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Operation, NetworkStatus } from '@mindflow/shared';
import { useAuthStore } from './auth.store';
import { useMindmapStore } from './mindmap.store';

/** 模块级标志：一旦检测到协作服务器不可用，本次会话永久静默，不再尝试 */
let collabUnavailable = false;

export const useSyncStore = defineStore('sync', () => {
  const networkStatus = ref<NetworkStatus>('normal');
  const isConnected = ref(false);
  const pendingOpsCount = ref(0);
  const lastSyncAt = ref<number>(0);
  const syncError = ref<string | null>(null);
  const roomMembers = ref<Array<{ userId: string; username: string; connectedAt: number }>>([]);

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  const isOnline = computed(() => networkStatus.value !== 'offline');
  const hasPendingOps = computed(() => pendingOpsCount.value > 0);

  // ==================== WebSocket 连接 ====================

  function connect(fileId: string): void {
    // 已确认协作服务器不可用，本次会话永久跳过
    if (collabUnavailable) return;

    const auth = useAuthStore();
    const token = auth.accessToken;
    if (!token) return;

    const baseUrl = (import.meta as any).env?.VITE_WS_URL ?? 'ws://localhost:3000';
    const wsUrl = `${baseUrl}/collab?token=${encodeURIComponent(token)}&fileId=${encodeURIComponent(fileId)}`;

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      isConnected.value = true;
      reconnectAttempts = 0;
      networkStatus.value = 'normal';
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (err) {
        console.error('WebSocket 消息解析失败:', err);
      }
    };

    socket.onclose = (event) => {
      isConnected.value = false;
      if (!event.wasClean && !collabUnavailable && reconnectAttempts < maxReconnectAttempts) {
        scheduleReconnect(fileId);
      }
    };

    socket.onerror = () => {
      if (!collabUnavailable) {
        console.warn('[Sync] WebSocket 无法连接（协作服务器未启动，本地编辑不受影响）');
        collabUnavailable = true;
      }
      networkStatus.value = 'offline';
    };
  }

  function disconnect(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      socket.close(1000, '客户端主动断开');
      socket = null;
    }
    isConnected.value = false;
    roomMembers.value = [];
  }

  // ==================== 消息发送 ====================

  function sendOperation(ops: Operation[]): void {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      pendingOpsCount.value += ops.length;
      return;
    }
    socket.send(JSON.stringify({ type: 'op:apply', operations: ops }));
    pendingOpsCount.value = Math.max(0, pendingOpsCount.value - ops.length);
  }

  function sendCursorMove(lineId: string, x: number, y: number): void {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'cursor:move', lineId, x, y }));
  }

  function sendViewState(canvasX: number, canvasY: number, zoom: number): void {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'view:state', canvasX, canvasY, zoom }));
  }

  // ==================== 消息处理 ====================

  function handleMessage(message: any): void {
    const mindmap = useMindmapStore();

    switch (message.type) {
      case 'op:apply': {
        mindmap.engine.value?.applyRemoteChanges(message.operations);
        mindmap.setStatus(`收到 ${message.sourceName} 的 ${message.operations.length} 个操作`);
        break;
      }
      case 'room:joined': {
        roomMembers.value = message.members;
        break;
      }
      case 'user:join': {
        roomMembers.value = [...roomMembers.value, {
          userId: message.userId,
          username: message.username,
          connectedAt: Date.now(),
        }];
        mindmap.setStatus(`${message.username} 加入了协作`);
        break;
      }
      case 'user:leave': {
        roomMembers.value = roomMembers.value.filter(
          (m) => m.userId !== message.userId
        );
        mindmap.setStatus(`${message.username} 离开了协作`);
        break;
      }
      case 'error': {
        syncError.value = message.message;
        break;
      }
    }
  }

  function scheduleReconnect(fileId: string): void {
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    networkStatus.value = 'weak';
    reconnectTimer = setTimeout(() => connect(fileId), delay);
  }

  // ==================== Utils ====================

  function setNetworkStatus(status: NetworkStatus): void {
    networkStatus.value = status;
  }

  return {
    networkStatus,
    isConnected,
    pendingOpsCount,
    lastSyncAt,
    syncError,
    roomMembers,
    isOnline,
    hasPendingOps,
    connect,
    disconnect,
    sendOperation,
    sendCursorMove,
    sendViewState,
    setNetworkStatus,
  };
});
