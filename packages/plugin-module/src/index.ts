/**
 * 插件扩展模块 - 文档第1.2节
 * 支持插件注册、生命周期管理、钩子系统、版本管理、沙箱隔离
 */
import { LineId, OperationType } from '@mindflow/shared';

// ==================== 类型定义 ====================

export interface Plugin {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: Record<string, string>; // npm 包依赖
  install(context: PluginContext): void;
  uninstall(): void;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  main: string; // 入口文件路径
  dependencies?: Record<string, string>;
  permissions?: string[]; // 声明需要的权限
  hooks?: string[]; // 监听的钩子
}

export interface PluginContext {
  /** 获取编辑器引擎 */
  getEngine(): any;
  /** 注册钩子监听 */
  onHook(hookName: string, callback: HookCallback): void;
  /** 移除钩子监听 */
  offHook(hookName: string, callback: HookCallback): void;
  /** 获取插件存储（隔离的存储空间） */
  getStorage(): PluginStorage;
  /** 触发事件 */
  emit(event: string, data: any): void;
  /** 记录日志 */
  log(level: 'info' | 'warn' | 'error', message: string): void;
}

export interface PluginStorage {
  get<T = any>(key: string): T | undefined;
  set<T = any>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

export type HookCallback = (...args: any[]) => any;

export type HookName =
  | 'before:line:insert'
  | 'after:line:insert'
  | 'before:line:delete'
  | 'after:line:delete'
  | 'before:line:update'
  | 'after:line:update'
  | 'before:fold:change'
  | 'after:fold:change'
  | 'before:view:change'
  | 'after:view:change'
  | 'before:save'
  | 'after:save'
  | 'before:sync'
  | 'after:sync'
  | 'engine:init'
  | 'engine:destroy';

export interface PluginInfo {
  name: string;
  version: string;
  description?: string;
  active: boolean;
  state: 'loaded' | 'active' | 'error' | 'unloaded';
  errorMessage?: string;
}

// ==================== 插件状态 ====================

interface PluginEntry {
  plugin: Plugin;
  state: 'active' | 'error' | 'unloaded';
  errorMessage?: string;
  storage: PluginStorage;
  hooks: Map<string, Set<HookCallback>>;
}

// ==================== 插件管理器 ====================

export class PluginManager {
  private plugins = new Map<string, PluginEntry>();
  private globalHooks = new Map<string, Set<HookCallback>>(); // 全局钩子执行器
  private engineRef: any = null;
  private contextBase: PluginContext | null = null;

  setEngine(engine: any): void {
    this.engineRef = engine;
  }

  // ==================== 插件注册 ====================

  /**
   * 注册并激活插件
   */
  register(plugin: Plugin): boolean {
    if (this.plugins.has(plugin.name)) {
      console.warn(`[PluginManager] 插件 "${plugin.name}" 已注册，将重新加载`);
      this.unregister(plugin.name);
    }

    const storage = this.createStorage(plugin.name);
    const context = this.createContext(plugin.name, storage);

    const entry: PluginEntry = {
      plugin,
      state: 'active',
      storage,
      hooks: new Map(),
    };

    try {
      plugin.install(context);
      this.plugins.set(plugin.name, entry);
      console.log(`[PluginManager] 插件 "${plugin.name}" v${plugin.version} 已加载`);
      return true;
    } catch (err) {
      entry.state = 'error';
      entry.errorMessage = err instanceof Error ? err.message : String(err);
      this.plugins.set(plugin.name, entry);
      console.error(`[PluginManager] 插件 "${plugin.name}" 加载失败:`, err);
      return false;
    }
  }

  /**
   * 通过 Manifest 加载插件（异步加载外部模块）
   */
  async registerFromManifest(manifest: PluginManifest, moduleLoader: () => Promise<{ default: new () => Plugin }>): Promise<boolean> {
    try {
      const Module = await moduleLoader();
      const plugin = new Module.default();
      if (plugin.name !== manifest.name) {
        console.warn(`[PluginManager] Manifest name "${manifest.name}" 与插件 name "${plugin.name}" 不一致`);
      }
      return this.register(plugin);
    } catch (err) {
      console.error(`[PluginManager] 加载 manifest "${manifest.name}" 失败:`, err);
      return false;
    }
  }

  /**
   * 卸载插件
   */
  unregister(name: string): boolean {
    const entry = this.plugins.get(name);
    if (!entry) return false;

    try {
      entry.plugin.uninstall();
      // 清理该插件的所有钩子
      entry.hooks.forEach((callbacks, hookName) => {
        const globalSet = this.globalHooks.get(hookName);
        if (globalSet) {
          callbacks.forEach((cb) => globalSet.delete(cb));
        }
      });
      this.plugins.delete(name);
      console.log(`[PluginManager] 插件 "${name}" 已卸载`);
      return true;
    } catch (err) {
      console.error(`[PluginManager] 卸载插件 "${name}" 失败:`, err);
      return false;
    }
  }

  // ==================== 查询 ====================

  list(): Plugin[] {
    return Array.from(this.plugins.values()).map((e) => e.plugin);
  }

  listInfo(): PluginInfo[] {
    return Array.from(this.plugins.entries()).map(([name, entry]) => ({
      name,
      version: entry.plugin.version,
      description: entry.plugin.description,
      active: entry.state === 'active',
      state: entry.state,
      errorMessage: entry.errorMessage,
    }));
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name)?.plugin;
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  // ==================== 钩子系统 ====================

  /**
   * 执行指定钩子的所有回调
   */
  async executeHook(hookName: HookName, ...args: any[]): Promise<any[]> {
    const callbacks = this.globalHooks.get(hookName);
    if (!callbacks || callbacks.size === 0) return [];

    const results: any[] = [];
    for (const cb of callbacks) {
      try {
        const result = await cb(...args);
        results.push(result);
      } catch (err) {
        console.error(`[PluginManager] 钩子 "${hookName}" 执行异常:`, err);
      }
    }
    return results;
  }

  /**
   * 同步执行钩子
   */
  executeHookSync(hookName: HookName, ...args: any[]): any[] {
    const callbacks = this.globalHooks.get(hookName);
    if (!callbacks || callbacks.size === 0) return [];

    const results: any[] = [];
    for (const cb of callbacks) {
      try {
        results.push(cb(...args));
      } catch (err) {
        console.error(`[PluginManager] 钩子 "${hookName}" 同步执行异常:`, err);
      }
    }
    return results;
  }

  /**
   * 注册全局钩子
   */
  onHook(hookName: HookName, callback: HookCallback): void {
    if (!this.globalHooks.has(hookName)) {
      this.globalHooks.set(hookName, new Set());
    }
    this.globalHooks.get(hookName)!.add(callback);
  }

  offHook(hookName: HookName, callback: HookCallback): void {
    this.globalHooks.get(hookName)?.delete(callback);
  }

  /**
   * 获取已注册的钩子列表
   */
  getRegisteredHooks(): string[] {
    return Array.from(this.globalHooks.keys());
  }

  // ==================== 内部方法 ====================

  private createContext(pluginName: string, storage: PluginStorage): PluginContext {
    return {
      getEngine: () => this.engineRef,
      onHook: (hookName: string, callback: HookCallback) => {
        const entry = this.plugins.get(pluginName);
        if (!entry) return;

        if (!entry.hooks.has(hookName)) {
          entry.hooks.set(hookName, new Set());
        }
        entry.hooks.get(hookName)!.add(callback);

        // 同时注册到全局
        if (!this.globalHooks.has(hookName)) {
          this.globalHooks.set(hookName, new Set());
        }
        this.globalHooks.get(hookName)!.add(callback);
      },
      offHook: (hookName: string, callback: HookCallback) => {
        this.globalHooks.get(hookName)?.delete(callback);
        const entry = this.plugins.get(pluginName);
        entry?.hooks.get(hookName)?.delete(callback);
      },
      getStorage: () => storage,
      emit: (event: string, data: any) => {
        console.log(`[Plugin:${pluginName}] emit "${event}":`, data);
      },
      log: (level, message) => {
        const prefix = `[Plugin:${pluginName}]`;
        switch (level) {
          case 'error': console.error(prefix, message); break;
          case 'warn': console.warn(prefix, message); break;
          default: console.log(prefix, message);
        }
      },
    };
  }

  private createStorage(pluginName: string): PluginStorage {
    const prefix = `mindflow-plugin:${pluginName}:`;
    const inMemory = new Map<string, any>();

    return {
      get<T = any>(key: string): T | undefined {
        // 优先内存
        if (inMemory.has(key)) return inMemory.get(key);
        // 回退 localStorage
        try {
          const raw = localStorage.getItem(prefix + key);
          return raw ? JSON.parse(raw) : undefined;
        } catch {
          return undefined;
        }
      },
      set<T = any>(key: string, value: T): void {
        inMemory.set(key, value);
        try {
          localStorage.setItem(prefix + key, JSON.stringify(value));
        } catch {
          // localStorage 满或不可用
        }
      },
      remove(key: string): void {
        inMemory.delete(key);
        try {
          localStorage.removeItem(prefix + key);
        } catch {}
      },
      clear(): void {
        inMemory.clear();
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith(prefix)) keysToRemove.push(k);
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch {}
      },
    };
  }

  // ==================== 生命周期 ====================

  destroy(): void {
    const names = Array.from(this.plugins.keys());
    for (const name of names) {
      this.unregister(name);
    }
    this.globalHooks.clear();
    this.engineRef = null;
  }
}
