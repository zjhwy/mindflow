/**
 * 数据联动引擎 - 文档第2.6节
 * 支持 Excel / API / DB 三种数据源的绑定、刷新、写回和条件样式
 */
import {
  DataSourceType, InnerLine, LineId, LineStyle,
} from '@mindflow/shared';

// ==================== 接口定义 ====================

export interface IDataLinkEngine {
  bindSource(lineId: LineId, sourceType: DataSourceType, sourceUrl: string, options?: SourceOptions): void;
  refreshSource(lineId: LineId): Promise<RefreshResult>;
  refreshAll(sink: SinkCallback): Promise<RefreshResult[]>;
  writeBackSource(lineId: LineId, newVal: string | number): Promise<WriteBackResult>;
  applyConditionStyle(lineId: LineId): LineStyle | null;
  unbindSource(lineId: LineId): void;
  getBinding(lineId: LineId): SourceBinding | undefined;
  getAllBindings(): Map<LineId, SourceBinding>;
}

export interface SourceOptions {
  sheetName?: string;       // Excel sheet 名称
  cellRef?: string;          // Excel 单元格引用 (如 "A1")
  headers?: Record<string, string>;  // 自定义 HTTP headers
  method?: string;          // HTTP method
  body?: any;               // 请求体
  transformFn?: (data: any) => string;     // 数据转换函数
  conditionRules?: ConditionRule[];        // 条件样式规则
  refreshInterval?: number;                // 自动刷新间隔 (ms)
  sqlQuery?: string;                       // 数据库查询语句
}

export interface SourceBinding {
  lineId: LineId;
  sourceType: DataSourceType;
  sourceUrl: string;
  options: SourceOptions;
  lastRefreshed?: number;
  lastValue?: string;
  refreshTimer?: ReturnType<typeof setInterval>;
}

export interface RefreshResult {
  lineId: LineId;
  success: boolean;
  value?: string;
  error?: string;
  sourceType: DataSourceType;
}

export interface WriteBackResult {
  lineId: LineId;
  success: boolean;
  newVal: string | number;
  sourceResponse?: any;
  error?: string;
}

export interface ConditionRule {
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'isEmpty' | 'regex';
  value: any;
  style: LineStyle;
}

export type SinkCallback = (result: RefreshResult) => void;

// ==================== 引擎实现 ====================

export class DataLinkEngine implements IDataLinkEngine {
  private bindings = new Map<LineId, SourceBinding>();
  private engineRef: any = null; // InnerTreeEngine 引用

  /** 注入编辑器引擎引用，用于写回 updateLine */
  setEngine(engine: any): void {
    this.engineRef = engine;
  }

  // ==================== 数据源绑定 ====================

  bindSource(lineId: LineId, sourceType: DataSourceType, sourceUrl: string, options: SourceOptions = {}): void {
    // 清理已有定时器
    const existing = this.bindings.get(lineId);
    if (existing?.refreshTimer) {
      clearInterval(existing.refreshTimer);
    }

    const binding: SourceBinding = {
      lineId,
      sourceType,
      sourceUrl,
      options,
    };

    // 设置自动刷新
    if (options.refreshInterval && options.refreshInterval > 0) {
      binding.refreshTimer = setInterval(() => {
        this.refreshSource(lineId).catch(console.error);
      }, options.refreshInterval);
    }

    this.bindings.set(lineId, binding);
  }

  unbindSource(lineId: LineId): void {
    const binding = this.bindings.get(lineId);
    if (binding?.refreshTimer) {
      clearInterval(binding.refreshTimer);
    }
    this.bindings.delete(lineId);
  }

  getBinding(lineId: LineId): SourceBinding | undefined {
    return this.bindings.get(lineId);
  }

  getAllBindings(): Map<LineId, SourceBinding> {
    return new Map(this.bindings);
  }

  // ==================== 数据刷新 ====================

  async refreshSource(lineId: LineId): Promise<RefreshResult> {
    const binding = this.bindings.get(lineId);
    if (!binding) {
      return { lineId, success: false, error: `节点 ${lineId} 未绑定数据源`, sourceType: 'api' as DataSourceType };
    }

    try {
      const rawData = await this.fetchSource(binding);
      const displayValue = binding.options.transformFn
        ? binding.options.transformFn(rawData)
        : this.extractDisplayValue(rawData, binding);

      // 写入引擎节点
      if (this.engineRef && displayValue !== undefined) {
        this.engineRef.updateLine(lineId, String(displayValue));
      }

      binding.lastRefreshed = Date.now();
      binding.lastValue = String(displayValue);

      return {
        lineId,
        success: true,
        value: String(displayValue),
        sourceType: binding.sourceType,
      };
    } catch (err) {
      return {
        lineId,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        sourceType: binding.sourceType,
      };
    }
  }

  async refreshAll(sink?: SinkCallback): Promise<RefreshResult[]> {
    const ids = Array.from(this.bindings.keys());
    const results: RefreshResult[] = [];

    // 并行刷新，限制最大并发 10
    const batchSize = 10;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (lineId) => {
          const result = await this.refreshSource(lineId);
          sink?.(result);
          return result;
        })
      );
      results.push(...batchResults);
    }

    return results;
  }

  // ==================== 数据写回 ====================

  async writeBackSource(lineId: LineId, newVal: string | number): Promise<WriteBackResult> {
    const binding = this.bindings.get(lineId);
    if (!binding) {
      return { lineId, success: false, newVal, error: `节点 ${lineId} 未绑定数据源` };
    }

    try {
      const response = await this.writeBackToSource(binding, newVal);

      if (this.engineRef) {
        this.engineRef.updateLine(lineId, String(newVal));
      }

      binding.lastValue = String(newVal);
      binding.lastRefreshed = Date.now();

      return { lineId, success: true, newVal, sourceResponse: response };
    } catch (err) {
      return {
        lineId,
        success: false,
        newVal,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ==================== 条件样式 ====================

  applyConditionStyle(lineId: LineId): LineStyle | null {
    const binding = this.bindings.get(lineId);
    if (!binding?.options.conditionRules || !binding.lastValue) {
      return null;
    }

    const value = binding.lastValue;
    for (const rule of binding.options.conditionRules) {
      if (this.evaluateConditionRule(value, rule)) {
        return rule.style;
      }
    }

    return null;
  }

  /**
   * 评估所有绑定的条件样式，返回需要更新的 (lineId -> style) 映射
   */
  evaluateAllConditionStyles(): Map<LineId, LineStyle> {
    const styleMap = new Map<LineId, LineStyle>();
    for (const lineId of this.bindings.keys()) {
      const style = this.applyConditionStyle(lineId);
      if (style) {
        styleMap.set(lineId, style);
      }
    }
    return styleMap;
  }

  // ==================== 数据源连接实现 ====================

  private async fetchSource(binding: SourceBinding): Promise<any> {
    switch (binding.sourceType) {
      case 'api':
        return this.fetchApi(binding.sourceUrl, binding.options);
      case 'excel':
        return this.fetchExcel(binding.sourceUrl, binding.options);
      case 'db':
        return this.fetchDatabase(binding.sourceUrl, binding.options);
      default:
        throw new Error(`不支持的数据源类型: ${binding.sourceType}`);
    }
  }

  private async fetchApi(url: string, options: SourceOptions): Promise<any> {
    const method = options.method ?? 'GET';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers ?? {}),
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (method !== 'GET' && method !== 'HEAD' && options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`API 请求失败: HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  private async fetchExcel(url: string, options: SourceOptions): Promise<any> {
    // Excel 数据源 - 通过后端代理读取
    const proxyUrl = `/api/datasource/excel?url=${encodeURIComponent(url)}` +
      (options.sheetName ? `&sheet=${encodeURIComponent(options.sheetName)}` : '') +
      (options.cellRef ? `&cell=${encodeURIComponent(options.cellRef)}` : '');

    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Excel 数据读取失败: HTTP ${response.status}`);
    }

    const data = await response.json();
    // 返回指定单元格的值
    if (options.cellRef && data.cells) {
      return data.cells[options.cellRef] ?? null;
    }
    return data;
  }

  private async fetchDatabase(url: string, options: SourceOptions): Promise<any> {
    // 数据库查询 - 通过后端代理
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: options.sqlQuery,
        params: options.body,
      }),
    });

    if (!response.ok) {
      throw new Error(`数据库查询失败: HTTP ${response.status}`);
    }

    const data = await response.json();
    // 返回第一行第一列（标量查询）或完整结果集
    if (Array.isArray(data) && data.length > 0) {
      const firstRow = data[0];
      const firstKey = Object.keys(firstRow)[0];
      return firstRow[firstKey];
    }
    return data;
  }

  private async writeBackToSource(binding: SourceBinding, newVal: string | number): Promise<any> {
    switch (binding.sourceType) {
      case 'api':
        return this.writeBackApi(binding.sourceUrl, newVal, binding.options);
      case 'excel':
        return this.writeBackExcel(binding.sourceUrl, newVal, binding.options);
      case 'db':
        return this.writeBackDatabase(binding.sourceUrl, newVal, binding.options);
      default:
        throw new Error(`不支持的数据源类型: ${binding.sourceType}`);
    }
  }

  private async writeBackApi(url: string, newVal: string | number, options: SourceOptions): Promise<any> {
    const response = await fetch(url, {
      method: options.method ?? 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      body: JSON.stringify({ value: newVal }),
    });

    if (!response.ok) {
      throw new Error(`API 写回失败: HTTP ${response.status}`);
    }
    return response.json().catch(() => null);
  }

  private async writeBackExcel(url: string, newVal: string | number, options: SourceOptions): Promise<any> {
    const proxyUrl = `/api/datasource/excel/writeback`;
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        sheet: options.sheetName,
        cell: options.cellRef,
        value: newVal,
      }),
    });

    if (!response.ok) {
      throw new Error(`Excel 写回失败: HTTP ${response.status}`);
    }
    return response.json().catch(() => null);
  }

  private async writeBackDatabase(url: string, newVal: string | number, options: SourceOptions): Promise<any> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: options.sqlQuery,
        value: newVal,
      }),
    });

    if (!response.ok) {
      throw new Error(`数据库写回失败: HTTP ${response.status}`);
    }
    return response.json().catch(() => null);
  }

  // ==================== 数据处理工具 ====================

  private extractDisplayValue(data: any, binding: SourceBinding): string {
    // 标量值直接转字符串
    if (typeof data === 'string') return data;
    if (typeof data === 'number' || typeof data === 'boolean') return String(data);

    // 对象提取有意义的字段
    if (typeof data === 'object' && data !== null) {
      if (data.value !== undefined) return String(data.value);
      if (data.text !== undefined) return String(data.text);
      if (data.name !== undefined) return String(data.name);
      if (data.total !== undefined) return String(data.total);
      // 回退到 JSON 序列化
      return JSON.stringify(data);
    }

    return String(data ?? '');
  }

  private evaluateConditionRule(value: string, rule: ConditionRule): boolean {
    switch (rule.operator) {
      case 'eq': return value === String(rule.value);
      case 'neq': return value !== String(rule.value);
      case 'gt': return Number(value) > Number(rule.value);
      case 'lt': return Number(value) < Number(rule.value);
      case 'gte': return Number(value) >= Number(rule.value);
      case 'lte': return Number(value) <= Number(rule.value);
      case 'contains': return value.includes(String(rule.value));
      case 'startsWith': return value.startsWith(String(rule.value));
      case 'endsWith': return value.endsWith(String(rule.value));
      case 'isEmpty': return !value || value.trim() === '';
      case 'regex':
        try {
          return new RegExp(String(rule.value)).test(value);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  // ==================== 生命周期 ====================

  destroy(): void {
    for (const binding of this.bindings.values()) {
      if (binding.refreshTimer) {
        clearInterval(binding.refreshTimer);
      }
    }
    this.bindings.clear();
    this.engineRef = null;
  }
}
