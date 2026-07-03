import { onMounted, onUnmounted } from 'vue';
import { useMindmapStore } from '../stores/mindmap.store';

type ShortcutHandler = (event: KeyboardEvent) => void;

interface ShortcutBinding {
  keys: string[];       // ['Ctrl', 'z']
  handler: ShortcutHandler;
  description: string;
}

/**
 * 键盘快捷键管理
 * 包含通用快捷键 + 画布方向键导航
 */
export function useKeyboard() {
  const bindings: ShortcutBinding[] = [];
  let isBound = false;

  // 默认快捷键
  const defaultBindings: ShortcutBinding[] = [
    // ---- 撤销/重做 ----
    {
      keys: ['Control', 'z'],
      handler: () => {
        const store = useMindmapStore();
        store.undo();
      },
      description: '撤回',
    },
    {
      keys: ['Control', 'Z'],
      handler: () => {
        const store = useMindmapStore();
        store.redo();
      },
      description: '重做 (Ctrl+Shift+Z)',
    },
    {
      keys: ['Control', 'y'],
      handler: () => {
        const store = useMindmapStore();
        store.redo();
      },
      description: '重做 (Ctrl+Y)',
    },

    // ---- 保存 ----
    {
      keys: ['Control', 's'],
      handler: (e) => {
        e.preventDefault();
        const store = useMindmapStore();
        store.setStatus('手动保存');
      },
      description: '保存',
    },

    // ---- Tab 缩进/减少缩进 ----
    {
      keys: ['Tab'],
      handler: (e) => {
        // 仅在画布/大纲视图且有选中节点时生效
        const store = useMindmapStore();
        if (store.selectedLineId) {
          e.preventDefault();
          store.indentLine(store.selectedLineId);
        }
      },
      description: '缩进',
    },
    {
      keys: ['Shift', 'Tab'],
      handler: (e) => {
        const store = useMindmapStore();
        if (store.selectedLineId) {
          e.preventDefault();
          store.outdentLine(store.selectedLineId);
        }
      },
      description: '减少缩进',
    },

    // ---- Enter 添加子节点 ----
    {
      keys: ['Enter'],
      handler: (e) => {
        const store = useMindmapStore();
        if (store.selectedLineId && store.currentView === 'canvas') {
          e.preventDefault();
          const idx = store.lines.findIndex((l) => l.lineId === store.selectedLineId);
          if (idx >= 0) {
            const depth = store.lines[idx].depth + 1;
            store.insertLine(idx + 1, '新节点', depth);
          }
        }
      },
      description: '添加子节点',
    },

    // ---- Delete 删除 ----
    {
      keys: ['Delete'],
      handler: () => {
        const store = useMindmapStore();
        if (store.selectedLineId) {
          store.deleteLine(store.selectedLineId);
        }
      },
      description: '删除节点',
    },

    // ---- 复制粘贴 ----
    {
      keys: ['Control', 'c'],
      handler: (e) => {
        const store = useMindmapStore();
        if (store.selectedLineId) {
          const line = store.lines.find(l => l.lineId === store.selectedLineId);
          if (line) {
            navigator.clipboard.writeText(line.text);
            store.setStatus('已复制节点文本');
          }
        }
      },
      description: '复制节点文本',
    },
    {
      keys: ['Control', 'v'],
      handler: (e) => {
        const store = useMindmapStore();
        if (store.selectedLineId) {
          navigator.clipboard.readText().then(text => {
            if (text.trim()) {
              const idx = store.lines.findIndex(l => l.lineId === store.selectedLineId);
              if (idx >= 0) {
                const depth = store.lines[idx].depth + 1;
                store.insertLine(idx + 1, text.trim(), depth);
              }
            }
          });
        }
      },
      description: '粘贴为子节点',
    },

    // ---- 折叠/展开 ----
    {
      keys: ['['],
      handler: () => {
        const store = useMindmapStore();
        if (store.selectedLineId) {
          store.toggleFold(store.selectedLineId);
        }
      },
      description: '折叠/展开节点',
    },

    // ---- 方向键导航（仅画布视图生效）----
    {
      keys: ['ArrowUp'],
      handler: (e) => {
        const store = useMindmapStore();
        if (store.currentView !== 'canvas' || !store.selectedLineId) return;
        e.preventDefault();
        // 导航由 MindMapCanvas 的 @keydown 处理
        // 此处不拦截，让画布自行处理
      },
      description: '上一个同级节点',
    },
    {
      keys: ['ArrowDown'],
      handler: (e) => {
        const store = useMindmapStore();
        if (store.currentView !== 'canvas' || !store.selectedLineId) return;
        e.preventDefault();
      },
      description: '下一个同级节点',
    },
    {
      keys: ['ArrowLeft'],
      handler: (e) => {
        const store = useMindmapStore();
        if (store.currentView !== 'canvas' || !store.selectedLineId) return;
        e.preventDefault();
      },
      description: '跳转到父节点',
    },
    {
      keys: ['ArrowRight'],
      handler: (e) => {
        const store = useMindmapStore();
        if (store.currentView !== 'canvas' || !store.selectedLineId) return;
        e.preventDefault();
      },
      description: '跳转到第一个子节点',
    },
  ];

  function matchesKeys(event: KeyboardEvent, keys: string[]): boolean {
    const pressed = new Set<string>();
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    if (event.ctrlKey || (isMac && event.metaKey)) pressed.add('Control');
    if (event.shiftKey) pressed.add('Shift');
    if (event.altKey) pressed.add('Alt');

    // 主键
    const mainKey = event.key;
    if (mainKey === 'Control' || mainKey === 'Shift' || mainKey === 'Alt' || mainKey === 'Meta') {
      return false; // 仅修饰键不够
    }

    // 在 input/textarea/select 中不触发快捷键（除了 Escape）
    const tag = (event.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (mainKey !== 'Escape') return false;
    }

    const required = new Set(keys);
    // 检查主键
    const mainRequired = keys.find((k) => !['Control', 'Shift', 'Alt'].includes(k));
    if (!mainRequired) return false;

    // 特殊处理 ArrowUp/Down/Left/Right - 永远匹配
    const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(mainRequired);
    if (!isArrow && mainRequired.toLowerCase() !== mainKey.toLowerCase()) return false;
    if (isArrow && mainRequired !== mainKey) return false;

    // 检查修饰键
    if (required.has('Control') && !pressed.has('Control')) return false;
    if (required.has('Shift') && !pressed.has('Shift')) return false;
    if (required.has('Alt') && !pressed.has('Alt')) return false;

    // 确保没有多余的修饰键
    const modCount = keys.filter((k) => ['Control', 'Shift', 'Alt'].includes(k)).length;
    const pressedModCount = (event.ctrlKey || event.metaKey ? 1 : 0) + (event.shiftKey ? 1 : 0) + (event.altKey ? 1 : 0);
    if (pressedModCount > modCount) return false;

    return true;
  }

  function handleKeyDown(event: KeyboardEvent): void {
    for (const binding of bindings) {
      if (matchesKeys(event, binding.keys)) {
        binding.handler(event);
        return;
      }
    }
  }

  function bind(): void {
    if (isBound) return;
    document.addEventListener('keydown', handleKeyDown);
    isBound = true;
  }

  function unbind(): void {
    document.removeEventListener('keydown', handleKeyDown);
    isBound = false;
  }

  function register(keys: string[], handler: ShortcutHandler, description: string): void {
    bindings.push({ keys, handler, description });
  }

  function getBindings(): Array<{ keys: string; description: string }> {
    return [...bindings, ...defaultBindings].map((b) => ({
      keys: b.keys.join('+'),
      description: b.description,
    }));
  }

  onMounted(() => {
    bindings.push(...defaultBindings);
    bind();
  });

  onUnmounted(() => {
    unbind();
  });

  return { bind, unbind, register, getBindings };
}
