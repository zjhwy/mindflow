<template>
  <Teleport to="body">
    <div v-if="visible" class="cm-overlay" @click.self="close" @contextmenu.prevent="close">
      <div
        class="cm-menu"
        :style="{ left: x + 'px', top: y + 'px' }"
        ref="menuRef"
      >
        <div
          v-for="item in items"
          :key="item.key"
          :class="['cm-item', { 'cm-danger': item.danger, 'cm-disabled': item.disabled }]"
          @click="handleClick(item)"
        >
          <span class="cm-icon" v-if="item.icon">{{ item.icon }}</span>
          <span class="cm-label">{{ item.label }}</span>
          <span class="cm-shortcut" v-if="item.shortcut">{{ item.shortcut }}</span>
        </div>
        <div v-if="items.length === 0" class="cm-empty">无可用操作</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

export interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  action: () => void;
}

const props = defineProps<{
  visible: boolean;
  x: number;
  y: number;
  items: MenuItem[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const menuRef = ref<HTMLElement | null>(null);

function close() { emit('close'); }

function handleClick(item: MenuItem) {
  if (item.disabled) return;
  item.action();
  close();
}

// 防止菜单溢出视口
watch(() => props.visible, async (v) => {
  if (!v) return;
  await nextTick();
  const el = menuRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (rect.right > vw) el.style.left = (vw - rect.width - 8) + 'px';
  if (rect.bottom > vh) el.style.top = (vh - rect.height - 8) + 'px';
});
</script>

<style scoped>
.cm-overlay {
  position: fixed; inset: 0; z-index: 9998;
}
.cm-menu {
  position: fixed;
  min-width: 160px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  padding: 4px 0;
  z-index: 9999;
  font-size: 13px;
}
.cm-item {
  display: flex; align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  gap: 8px;
}
.cm-item:hover:not(.cm-disabled) { background: #f0f5ff; }
.cm-icon { width: 18px; text-align: center; flex-shrink: 0; font-size: 13px; }
.cm-label { flex: 1; }
.cm-shortcut { color: #999; font-size: 11px; margin-left: 16px; }
.cm-danger .cm-label { color: #ff4d4f; }
.cm-disabled { opacity: 0.4; cursor: not-allowed; }
.cm-empty { padding: 16px; text-align: center; color: #999; }
</style>
