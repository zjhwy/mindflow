<template>
  <div class="sp-panel">
    <h4>节点样式</h4>

    <div class="sp-field">
      <label>文本颜色</label>
      <input type="color" :value="color" @input="setColor(($event.target as HTMLInputElement).value)" />
    </div>

    <div class="sp-field">
      <label>背景颜色</label>
      <input type="color" :value="bgColor" @input="setBgColor(($event.target as HTMLInputElement).value)" />
    </div>

    <div class="sp-field">
      <label>字号</label>
      <div class="sp-range">
        <input type="range" min="10" max="24" :value="fontSize" @input="setFontSize(Number(($event.target as HTMLInputElement).value))" />
        <span>{{ fontSize }}px</span>
      </div>
    </div>

    <div class="sp-field">
      <label>字重</label>
      <div class="sp-toggles">
        <button :class="{ active: !bold }" @click="setBold(false)">常规</button>
        <button :class="{ active: bold }" @click="setBold(true)">加粗</button>
      </div>
    </div>

    <div class="sp-actions">
      <button class="sp-reset" @click="$emit('reset-style')">重置样式</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LineStyle } from '@mindflow/shared';

const props = defineProps<{
  style: LineStyle | undefined;
}>();

const emit = defineEmits<{
  'update:style': [style: Partial<LineStyle>];
  'reset-style': [];
}>();

const color = computed(() => props.style?.color ?? '#333333');
const bgColor = computed(() => props.style?.backgroundColor ?? '#ffffff');
const fontSize = computed(() => props.style?.fontSize ?? 14);
const bold = computed(() => props.style?.fontWeight === 'bold');

function setColor(v: string) { emit('update:style', { color: v }); }
function setBgColor(v: string) { emit('update:style', { backgroundColor: v }); }
function setFontSize(v: number) { emit('update:style', { fontSize: v }); }
function setBold(v: boolean) { emit('update:style', { fontWeight: v ? 'bold' : 'normal' }); }
</script>

<style scoped>
.sp-panel { padding: 12px 0; }
.sp-panel h4 { font-size: 14px; font-weight: 600; margin: 0 0 12px; }
.sp-field { margin-bottom: 12px; }
.sp-field label { display: block; font-size: 12px; color: var(--text-secondary, #888); margin-bottom: 4px; }
.sp-field input[type="color"] {
  width: 36px; height: 28px; border: 1px solid #d9d9d9; border-radius: 4px; cursor: pointer; padding: 2px;
}
.sp-range { display: flex; align-items: center; gap: 8px; }
.sp-range input[type="range"] { flex: 1; }
.sp-range span { font-size: 12px; color: #888; min-width: 32px; }
.sp-toggles { display: flex; gap: 4px; }
.sp-toggles button {
  flex: 1; padding: 4px 12px; border: 1px solid #d9d9d9;
  border-radius: 4px; background: #fff; font-size: 12px; cursor: pointer;
}
.sp-toggles button.active { border-color: #1677ff; color: #1677ff; background: #e6f4ff; }
.sp-toggles button:hover { border-color: #1677ff; }
.sp-actions { margin-top: 16px; }
.sp-reset {
  width: 100%; padding: 6px 12px; border: 1px solid #ff4d4f; border-radius: 4px;
  background: #fff; color: #ff4d4f; font-size: 12px; cursor: pointer;
}
.sp-reset:hover { background: #fff2f0; }
</style>
