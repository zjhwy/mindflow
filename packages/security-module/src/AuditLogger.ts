/** AuditLogger - 审计日志 文档第4节：全操作可溯源日志采集 */
export interface AuditEntry {
  action: string; userId: string; resourceId: string;
  details: Record<string, any>; ip: string; timestamp: number;
}
export class AuditLogger {
  private logs: AuditEntry[] = [];
  log(entry: Omit<AuditEntry, 'timestamp'>) { this.logs.push({ ...entry, timestamp: Date.now() }); }
  query(filter?: Partial<AuditEntry>) { return filter ? this.logs.filter(l => Object.entries(filter).every(([k, v]) => (l as any)[k] === v)) : this.logs; }
  clear() { this.logs = []; }
}
