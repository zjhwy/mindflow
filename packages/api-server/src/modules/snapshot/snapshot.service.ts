import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentSnapshot } from '@mindflow/shared';

@Injectable()
export class SnapshotService {
  private snapshots: (DocumentSnapshot & { remark?: string })[] = [];
  private versionCounters = new Map<string, number>();

  async create(fileId: string, data: any, userId: string = 'system', remark?: string): Promise<DocumentSnapshot> {
    const currentVersion = (this.versionCounters.get(fileId) ?? 0) + 1;
    this.versionCounters.set(fileId, currentVersion);

    const snapshot: DocumentSnapshot & { remark?: string } = {
      snapshotId: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      fileId,
      version: currentVersion,
      data,
      createdAt: Date.now(),
      createdBy: userId,
      remark,
    };

    this.snapshots.push(snapshot);

    // 每个文件最多保留 50 个快照
    const fileSnapshots = this.snapshots.filter((s) => s.fileId === fileId);
    if (fileSnapshots.length > 50) {
      const oldest = fileSnapshots.sort((a, b) => a.version - b.version).shift();
      if (oldest) {
        this.snapshots = this.snapshots.filter((s) => s.snapshotId !== oldest.snapshotId);
      }
    }

    return snapshot;
  }

  async list(fileId: string, page: number = 1, pageSize: number = 20): Promise<{ items: DocumentSnapshot[]; total: number; page: number; pageSize: number }> {
    const fileSnapshots = this.snapshots
      .filter((s) => s.fileId === fileId)
      .sort((a, b) => b.version - a.version);

    const total = fileSnapshots.length;
    const start = (page - 1) * pageSize;
    const items = fileSnapshots.slice(start, start + pageSize) as DocumentSnapshot[];

    return { items, total, page, pageSize };
  }

  async get(snapshotId: string): Promise<DocumentSnapshot> {
    const s = this.snapshots.find((s) => s.snapshotId === snapshotId);
    if (!s) throw new NotFoundException(`快照 ${snapshotId} 不存在`);
    return s;
  }

  async restore(snapshotId: string): Promise<DocumentSnapshot> {
    return this.get(snapshotId);
  }

  async getLatest(fileId: string): Promise<DocumentSnapshot | null> {
    const fileSnapshots = this.snapshots
      .filter((s) => s.fileId === fileId)
      .sort((a, b) => b.version - a.version);
    return (fileSnapshots[0] as DocumentSnapshot) ?? null;
  }

  async delete(snapshotId: string): Promise<boolean> {
    const idx = this.snapshots.findIndex((s) => s.snapshotId === snapshotId);
    if (idx === -1) return false;
    this.snapshots.splice(idx, 1);
    return true;
  }

  async updateRemark(snapshotId: string, remark: string): Promise<boolean> {
    const s = this.snapshots.find((s) => s.snapshotId === snapshotId);
    if (!s) return false;
    s.remark = remark;
    return true;
  }

  async getVersionCount(fileId: string): Promise<number> {
    return this.versionCounters.get(fileId) ?? 0;
  }

  async deleteByFileId(fileId: string): Promise<number> {
    const before = this.snapshots.length;
    this.snapshots = this.snapshots.filter((s) => s.fileId !== fileId);
    return before - this.snapshots.length;
  }
}
