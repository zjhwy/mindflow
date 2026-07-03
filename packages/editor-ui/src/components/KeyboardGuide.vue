<template>
  <Teleport to="body">
    <div v-if="visible" class="kg-overlay" @click.self="close">
      <div class="kg-panel">
        <div class="kg-header">
          <h3>快捷键帮助</h3>
          <button class="kg-close" @click="close">✕</button>
        </div>
        <div class="kg-body">
          <div v-for="group in shortcutGroups" :key="group.name" class="kg-group">
            <h4>{{ group.name }}</h4>
            <div v-for="item in group.items" :key="item.keys" class="kg-row">
              <kbd class="kg-keys">{{ item.keys }}</kbd>
              <span class="kg-desc">{{ item.desc }}</span>
            </div>
          </div>
        </div>
        <div class="kg-footer">按 <kbd>?</kbd> 随时打开此面板</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const visible = ref(false);

const shortcutGroups = [
  {
    name: '编辑操作',
    items: [
      { keys: 'Tab', desc: '缩进当前节点' },
      { keys: 'Shift + Tab', desc: '减少缩进' },
      { keys: 'Enter', desc: '添加子节点' },
      { keys: 'Delete', desc: '删除当前节点' },
      { keys: '双击节点', desc: '编辑节点文本' },
    ],
  },
  {
    name: '历史 & 保存',
    items: [
      { keys: 'Ctrl + Z', desc: '撤回' },
      { keys: 'Ctrl + Shift + Z', desc: '重做' },
      { keys: 'Ctrl + S', desc: '保存' },
    ],
  },
  {
    name: '视图 & 导航',
    items: [
      { keys: 'Ctrl + F', desc: '搜索节点' },
      { keys: '?', desc: '显示/隐藏此帮助' },
      { keys: '滚轮', desc: '缩放画布' },
      { keys: '拖拽空白', desc: '平移画布' },
    ],
  },
];

function open() { visible.value = true; }
function close() { visible.value = false; }
function toggle() { visible.value = !visible.value; }

function onKeydown(e: KeyboardEvent) {
  if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    toggle();
  }
  if (e.key === 'Escape' && visible.value) {
    close();
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onUnmounted(() => document.removeEventListener('keydown', onKeydown));

defineExpose({ open, close, toggle });
</script>

<style scoped>
.kg-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.35);
  display: flex; align-items: center; justify-content: center;
}
.kg-panel {
  background: #fff;
  border-radius: 12px;
  width: 460px; max-height: 80vh;
  box-shadow: 0 8px 40px rgba(0,0,0,0.18);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.kg-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #f0f0f0;
}
.kg-header h3 { margin: 0; font-size: 16px; }
.kg-close {
  width: 28px; height: 28px; border: none; background: transparent;
  font-size: 18px; cursor: pointer; border-radius: 4px; color: #999;
}
.kg-close:hover { background: #f0f0f0; color: #333; }
.kg-body { flex: 1; overflow-y: auto; padding: 12px 20px; }
.kg-group { margin-bottom: 16px; }
.kg-group h4 { font-size: 13px; color: #999; margin: 0 0 8px; text-transform: uppercase; letter-spacing: .5px; }
.kg-row { display: flex; align-items: center; padding: 6px 0; }
.kg-keys {
  display: inline-block; padding: 2px 8px; min-width: 100px;
  background: #f5f5f5; border: 1px solid #d9d9d9; border-radius: 4px;
  font-family: monospace; font-size: 12px; text-align: center; margin-right: 12px;
}
.kg-desc { font-size: 13px; color: #555; }
.kg-footer {
  padding: 10px 20px; border-top: 1px solid #f0f0f0;
  font-size: 12px; color: #999; text-align: center;
}
.kg-footer kbd {
  background: #f5f5f5; border: 1px solid #d9d9d9; border-radius: 3px;
  padding: 0 4px; font-family: monospace; font-size: 11px;
}
</style>
