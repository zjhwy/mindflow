/**
 * 离线同步模块 - 文档第5.3节
 * 支持 IndexedDB 持久化离线队列、网络状态检测、冲突合并策略、增量批量同步
 */
import { Operation, OperationType, LineId, UserId, NetworkStatus } from '@mindflow/shared';

// ==================== 类型定义 ====================

export interface OfflineConfig {
  /** IndexedDB 数据库名称 */
  dbName?: string;
  /** 最大本地队列长度（超出则合并） */
  maxQueueSize?: number;
  /** 网络检测间隔 (ms) */
  checkInterval?: number;
  /** 同步间隔 (ms) */
  syncInterval?: number;
  /** 是否启用冲突合并 */
  enableConflictMerge?: boolean;
  /** 同步 API 端点 */
  syncEndpoint?: string;
  /** 批量同步每批最大操作数 */
  batchSize?: number;
}

export interface SyncRecord {
  id: string;
  operation: Operation & { localTimestamp: number };
  synced: boolean;
  syncAttempts: number;
  lastSyncAttempt?: number;
  errorMessage?: string;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflicts: ConflictRecord[];
  timestamp: number;
}

export interface ConflictRecord {
  localOp: Operation;
  remoteOp?: Operation;
  resolution: 'local-wins' | 'remote-wins' | 'merged';
  resolvedAt: number;
}

export interface NetworkState {
  status: NetworkStatus;
  lastOnlineAt?: number;
  lastOfflineAt?: number;
  pingMs?: number;
  downlink?: number; // bandwidth estimation (Mbps)
  rtt?: number;      // round-trip time (ms)
}

// ==================== IndexedDB 存储 ====================

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private storeName = 'pendingOps';

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<SyncRecord[]> {
    if (!this.db) await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error);
    });
  }

  async put(record: SyncRecord): Promise<void> {
    if (!this.db) await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async delete(id: string): Promise<void> {
    if (!this.db) await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (!this.db) await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      for (const id of ids) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}

// ==================== 离线管理器 ====================

export class OfflineManager {
  // 内存队列（快速读写）
  private pendingOps: (Operation & { localTimestamp: number })[] = [];
  // 冲突记录
  private conflictLog: ConflictRecord[] = [];
  // 网络状态
  private isOnline = true;
  private networkStatus: NetworkStatus = NetworkStatus.NORMAL;
  private lastPingMs = 0;

  // 配置
  private config: Required<OfflineConfig>;
  private storage: OfflineStorage;

  // 定时器
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  // 同步回调
  private syncCallback: ((ops: Operation[]) => Promise<boolean>) | null = null;

  constructor(config: OfflineConfig = {}) {
    this.config = {
      dbName: 'mindflow-offline',
      maxQueueSize: 500,
      checkInterval: 5000,
      syncInterval: 10000,
      enableConflictMerge: true,
      syncEndpoint: '/api/sync/batch',
      batchSize: 50,
      ...config,
    };
    this.storage = new OfflineStorage(this.config.dbName);
  }

  // ==================== 生命周期 ====================

  async init(): Promise<void> {
    await this.storage.open();
    // 从 IndexedDB 恢复未同步的操作
    const stored = await this.storage.getAll();
    this.pendingOps = stored
      .filter((r) => !r.synced)
      .map((r) => r.operation);

    // 启动网络检测
    this.checkTimer = setInterval(() => this.detectNetwork(), this.config.checkInterval);
    // 启动自动同步
    this.syncTimer = setInterval(() => this.syncWhenOnline(), this.config.syncInterval);

    // 监听浏览器在线/离线事件
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }

    console.log(`[OfflineManager] 已初始化, 恢复 ${stored.length} 条记录，其中 ${this.pendingOps.length} 条待同步`);
  }

  destroy(): void {
    if (this.checkTimer) clearInterval(this.checkTimer);
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.storage.close();
  }

  // ==================== 操作记录 ====================

  /**
   * 保存操作到本地队列
   */
  async saveOp(op: Operation): Promise<void> {
    const opWithTimestamp = { ...op, localTimestamp: Date.now() };
    this.pendingOps.push(opWithTimestamp);

    // 超过最大队列长度时进行合并去重
    if (this.pendingOps.length > this.config.maxQueueSize) {
      this.compactQueue();
    }

    // 持久化到 IndexedDB
    const record: SyncRecord = {
      id: `${op.lineId}-${op.timestamp}-${Math.random().toString(36).slice(2)}`,
      operation: opWithTimestamp,
      synced: false,
      syncAttempts: 0,
    };
    await this.storage.put(record);
  }

  /**
   * 批量保存操作
   */
  async saveOpsBatch(ops: Operation[]): Promise<void> {
    for (const op of ops) {
      await this.saveOp(op);
    }
  }

  // ==================== 同步 ====================

  /**
   * 设置同步回调（实际网络请求）
   */
  setSyncCallback(callback: (ops: Operation[]) => Promise<boolean>): void {
    this.syncCallback = callback;
  }

  /**
   * 网络恢复时触发同步
   */
  async syncWhenOnline(): Promise<SyncResult> {
    if (!this.isOnline || this.pendingOps.length === 0) {
      return { success: true, syncedCount: 0, failedCount: 0, conflicts: [], timestamp: Date.now() };
    }

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      conflicts: [],
      timestamp: Date.now(),
    };

    try {
      if (this.syncCallback) {
        const batchSize = this.config.batchSize;
        let offset = 0;

        while (offset < this.pendingOps.length) {
          const batch = this.pendingOps.slice(offset, offset + batchSize);
          const success = await this.syncCallback(batch);

          if (success) {
            result.syncedCount += batch.length;
          } else {
            result.failedCount += batch.length;
          }

          offset += batchSize;
        }
      } else {
        // 使用默认 HTTP 同步
        result.syncedCount = await this.defaultHttpSync();
      }

      // 清理已同步的操作
      if (result.syncedCount > 0) {
        await this.clearSynced();
      }
    } catch (err) {
      result.success = false;
      result.failedCount = this.pendingOps.length;
      console.error('[OfflineManager] 同步失败:', err);
    }

    return result;
  }

  /**
   * 强制全量同步
   */
  async forceSyncAll(): Promise<SyncResult> {
    // 从 IndexedDB 重新加载所有未同步记录
    const stored = await this.storage.getAll();
    const unsynced = stored.filter((r) => !r.synced);
    this.pendingOps = unsynced.map((r) => r.operation);

    return this.syncWhenOnline();
  }

  // ==================== 网络状态 ====================

  setOnlineState(online: boolean): void {
    if (online) {
      this.handleOnline();
    } else {
      this.handleOffline();
    }
  }

  hasPendingOps(): boolean {
    return this.pendingOps.length > 0;
  }

  getPendingCount(): number {
    return this.pendingOps.length;
  }

  getNetworkState(): NetworkState {
    return {
      status: this.networkStatus,
      lastOnlineAt: this.isOnline ? Date.now() : undefined,
      lastOfflineAt: this.isOnline ? undefined : Date.now(),
      pingMs: this.lastPingMs,
      downlink: (navigator as any)?.connection?.downlink,
      rtt: (navigator as any)?.connection?.rtt,
    };
  }

  // ==================== 冲突合并 (文档5.4节) ====================

  /**
   * 检测并解决冲突
   * 策略: 同节点多次操作取最后一次 (LWW - Last Writer Wins)
   */
  resolveConflicts(remoteOps: Operation[]): { merged: Operation[]; conflicts: ConflictRecord[] } {
    const conflicts: ConflictRecord[] = [];
    const remoteMap = new Map<LineId, Operation>();

    // 建立远程操作索引
    for (const op of remoteOps) {
      remoteMap.set(op.lineId, op);
    }

    // 去重: 对同一节点的多次本地操作，取最新的（timestamp + localTimestamp 最大）
    const localByNode = new Map<LineId, (Operation & { localTimestamp: number })[]>();
    for (const op of this.pendingOps) {
      if (!localByNode.has(op.lineId)) {
        localByNode.set(op.lineId, []);
      }
      localByNode.get(op.lineId)!.push(op);
    }

    const merged: Operation[] = [];

    for (const [lineId, localOps] of localByNode) {
      const remoteOp = remoteMap.get(lineId);
      const latestLocal = localOps.reduce((max, op) =>
        (op.timestamp + op.localTimestamp) > (max.timestamp + max.localTimestamp) ? op : max
      );

      if (remoteOp) {
        if (remoteOp.timestamp > latestLocal.timestamp + latestLocal.localTimestamp) {
          // 远程更新，采用远程
          merged.push(remoteOp);
          conflicts.push({
            localOp: latestLocal,
            remoteOp,
            resolution: 'remote-wins',
            resolvedAt: Date.now(),
          });
        } else {
          // 本地更新，保留本地
          merged.push(latestLocal);
          conflicts.push({
            localOp: latestLocal,
            remoteOp,
            resolution: 'local-wins',
            resolvedAt: Date.now(),
          });
        }
      } else {
        // 仅本地有操作
        merged.push(latestLocal);
      }
    }

    // 远程独有的操作
    for (const [lineId, remoteOp] of remoteMap) {
      if (!localByNode.has(lineId)) {
        merged.push(remoteOp);
      }
    }

    this.conflictLog.push(...conflicts);

    return { merged, conflicts };
  }

  getConflictLog(): ConflictRecord[] {
    return [...this.conflictLog];
  }

  clearConflictLog(): void {
    this.conflictLog = [];
  }

  // ==================== 内部方法 ====================

  private async defaultHttpSync(): Promise<number> {
    let syncedCount = 0;
    const batchSize = this.config.batchSize;

    for (let i = 0; i < this.pendingOps.length; i += batchSize) {
      const batch = this.pendingOps.slice(i, i + batchSize);
      try {
        const response = await fetch(this.config.syncEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operations: batch, clientTime: Date.now() }),
        });

        if (response.ok) {
          syncedCount += batch.length;
        } else {
          break; // 失败则停止，等待下一次同步周期
        }
      } catch (err) {
        console.error('[OfflineManager] HTTP 同步批次失败:', err);
        break;
      }
    }

    return syncedCount;
  }

  private async clearSynced(): Promise<void> {
    // 清理内存
    this.pendingOps = [];

    // 清理 IndexedDB — 按批次删除
    const stored = await this.storage.getAll();
    const idsToDelete = stored
      .filter((r) => !r.synced)
      .map((r) => r.id);

    if (idsToDelete.length > 0) {
      await this.storage.deleteMany(idsToDelete);
    }
  }

  private compactQueue(): void {
    // 按节点合并：同一节点的多次操作只保留最后一次
    const byNode = new Map<LineId, (Operation & { localTimestamp: number })[]>();
    for (const op of this.pendingOps) {
      if (!byNode.has(op.lineId)) byNode.set(op.lineId, []);
      byNode.get(op.lineId)!.push(op);
    }

    this.pendingOps = [];
    for (const ops of byNode.values()) {
      // 保留最后一次
      const latest = ops.reduce((max, op) =>
        (op.timestamp + op.localTimestamp) > (max.timestamp + max.localTimestamp) ? op : max
      );
      this.pendingOps.push(latest);
    }
  }

  private async detectNetwork(): Promise<void> {
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      await fetch(this.config.syncEndpoint + '/ping', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      this.lastPingMs = Date.now() - start;

      const wasOffline = !this.isOnline;
      if (wasOffline) {
        this.handleOnline();
      }

      // 评估网络质量
      if (this.lastPingMs < 100) {
        this.networkStatus = NetworkStatus.EXCELLENT;
      } else if (this.lastPingMs < 300) {
        this.networkStatus = NetworkStatus.NORMAL;
      } else {
        this.networkStatus = NetworkStatus.WEAK;
      }
    } catch {
      if (this.isOnline) {
        this.handleOffline();
      }
      this.networkStatus = NetworkStatus.OFFLINE;
    }
  }

  private handleOnline = (): void => {
    if (!this.isOnline) {
      this.isOnline = true;
      console.log('[OfflineManager] 网络已恢复，开始同步...');
      this.syncWhenOnline();
    }
  };

  private handleOffline = (): void => {
    if (this.isOnline) {
      this.isOnline = false;
      this.networkStatus = NetworkStatus.OFFLINE;
      console.log('[OfflineManager] 网络已断开，操作将缓存到本地');
    }
  };
}
