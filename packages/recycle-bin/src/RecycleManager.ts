/** 回收站核心管理器 文档第1.2/3.7节 */
export interface DeletedItem<T = any> {
  itemId: string; fileId: string; data: T; deletedAt: number; deletedBy: string; location: string;
}

export class RecycleManager<T = any> {
  private items: DeletedItem<T>[] = [];

  softDelete(item: Omit<DeletedItem<T>, 'deletedAt'>): void {
    this.items.push({ ...item, deletedAt: Date.now() });
  }

  list(fileId?: string): DeletedItem<T>[] {
    return fileId ? this.items.filter(i => i.fileId === fileId) : this.items;
  }

  restore(itemId: string): DeletedItem<T> | null {
    const idx = this.items.findIndex(i => i.itemId === itemId);
    if (idx === -1) return null;
    return this.items.splice(idx, 1)[0];
  }

  purge(itemId: string): boolean {
    const idx = this.items.findIndex(i => i.itemId === itemId);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }

  purgeAll(fileId?: string): void {
    if (fileId) this.items = this.items.filter(i => i.fileId !== fileId);
    else this.items = [];
  }
}
