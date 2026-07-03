/** 用户自助快照管理器 文档第1.2/3.7节 */
export interface SnapshotEntry {
  snapshotId: string; fileId: string; version: number; data: any;
  createdAt: number; createdBy: string; remark?: string;
}

export class SnapshotManager {
  private snapshots: SnapshotEntry[] = [];
  private retentionDays: number;
  private maxSnapshotsPerFile: number;

  constructor(retentionDays = 30, maxSnapshotsPerFile = 50) {
    this.retentionDays = retentionDays;
    this.maxSnapshotsPerFile = maxSnapshotsPerFile;
  }

  create(fileId: string, data: any, createdBy: string, remark?: string): SnapshotEntry {
    const fileSnapshots = this.list(fileId);
    if (fileSnapshots.length >= this.maxSnapshotsPerFile) {
      // 淘汰最旧快照
      const oldest = fileSnapshots.reduce((a, b) => a.createdAt < b.createdAt ? a : b);
      this.delete(oldest.snapshotId);
    }
    const entry: SnapshotEntry = {
      snapshotId: `snap-${Date.now()}`,
      fileId, data, version: fileSnapshots.length + 1,
      createdAt: Date.now(), createdBy, remark,
    };
    this.snapshots.push(entry);
    return entry;
  }

  list(fileId: string): SnapshotEntry[] {
    return this.snapshots
      .filter(s => s.fileId === fileId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  restore(snapshotId: string): SnapshotEntry | null {
    return this.snapshots.find(s => s.snapshotId === snapshotId) ?? null;
  }

  delete(snapshotId: string): boolean {
    const idx = this.snapshots.findIndex(s => s.snapshotId === snapshotId);
    if (idx === -1) return false;
    this.snapshots.splice(idx, 1);
    return true;
  }

  updateRemark(snapshotId: string, remark: string): boolean {
    const s = this.snapshots.find(s => s.snapshotId === snapshotId);
    if (!s) return false;
    s.remark = remark;
    return true;
  }

  /** 自动清理过期快照 */
  purgeExpired(): number {
    const cutoff = Date.now() - this.retentionDays * 86400000;
    const before = this.snapshots.length;
    this.snapshots = this.snapshots.filter(s => s.createdAt > cutoff);
    return before - this.snapshots.length;
  }
}
