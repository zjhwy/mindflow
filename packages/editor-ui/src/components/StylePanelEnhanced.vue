<template>
  <div class="style-panel">
    <!-- Tab 切换 -->
    <div class="panel-tabs">
      <button
        :class="['tab-btn', { active: activeTab === 'canvas' }]"
        @click="activeTab = 'canvas'"
      >
        画布样式
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'theme' }]"
        @click="activeTab = 'theme'"
      >
        主题配色
      </button>
    </div>

    <!-- 画布样式 -->
    <div v-if="activeTab === 'canvas'" class="tab-content">
      <!-- 背景颜色 -->
      <div class="style-field">
        <label>画布背景</label>
        <div class="color-row">
          <input
            type="color"
            :value="canvasBg"
            @input="setCanvasBg(($event.target as HTMLInputElement).value)"
          />
          <input
            type="text"
            :value="canvasBg"
            @change="setCanvasBg(($event.target as HTMLInputElement).value)"
            class="color-text"
          />
        </div>
      </div>

      <!-- 网格线 -->
      <div class="style-field">
        <label>网格线</label>
        <div class="grid-options">
          <button
            v-for="opt in gridOptions"
            :key="opt.value"
            :class="['grid-btn', { active: gridType === opt.value }]"
            @click="setGridType(opt.value)"
          >
            {{ opt.icon }}
          </button>
        </div>
      </div>

      <!-- 画布尺寸预设 -->
      <div class="style-field">
        <label>画布尺寸</label>
        <div class="size-presets">
          <button
            v-for="size in sizePresets"
            :key="size.label"
            :class="['size-btn', { active: currentSize === size.label }]"
            @click="setCanvasSize(size)"
          >
            {{ size.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 主题配色 -->
    <div v-if="activeTab === 'theme'" class="tab-content">
      <div class="theme-section">
        <div class="section-label">预设主题</div>
        <div class="theme-grid">
          <button
            v-for="theme in themes"
            :key="theme.id"
            :class="['theme-card', { active: currentTheme === theme.id }]"
            @click="applyTheme(theme)"
          >
            <div class="theme-preview" :style="{ background: theme.preview }">
              <div class="preview-node" :style="{ background: theme.nodeColor }">
                <span :style="{ color: theme.textColor }">文</span>
              </div>
              <div class="preview-line" :style="{ borderColor: theme.lineColor }" />
            </div>
            <div class="theme-name">{{ theme.name }}</div>
          </button>
        </div>
      </div>

      <!-- 节点样式 -->
      <div class="style-field">
        <label>节点背景</label>
        <div class="color-row">
          <input type="color" :value="nodeBg" @input="setNodeBg(($event.target as HTMLInputElement).value)" />
          <input
            type="text"
            :value="nodeBg"
            @change="setNodeBg(($event.target as HTMLInputElement).value)"
            class="color-text"
          />
        </div>
      </div>

      <!-- 节点文字颜色 -->
      <div class="style-field">
        <label>文字颜色</label>
        <div class="color-row">
          <input type="color" :value="textColor" @input="setTextColor(($event.target as HTMLInputElement).value)" />
          <input
            type="text"
            :value="textColor"
            @change="setTextColor(($event.target as HTMLInputElement).value)"
            class="color-text"
          />
        </div>
      </div>

      <!-- 节点边框 -->
      <div class="style-field">
        <label>边框颜色</label>
        <div class="color-row">
          <input type="color" :value="borderColor" @input="setBorderColor(($event.target as HTMLInputElement).value)" />
          <input
            type="text"
            :value="borderColor"
            @change="setBorderColor(($event.target as HTMLInputElement).value)"
            class="color-text"
          />
        </div>
      </div>

      <!-- 连线颜色 -->
      <div class="style-field">
        <label>连线颜色</label>
        <div class="color-row">
          <input type="color" :value="lineColor" @input="setLineColor(($event.target as HTMLInputElement).value)" />
          <input
            type="text"
            :value="lineColor"
            @change="setLineColor(($event.target as HTMLInputElement).value)"
            class="color-text"
          />
        </div>
      </div>

      <!-- 预设颜色方案 -->
      <div class="style-field">
        <label>快速配色</label>
        <div class="color-presets">
          <button
            v-for="preset in colorPresets"
            :key="preset.name"
            class="preset-btn"
            :style="{ background: preset.bg, color: preset.text }"
            @click="applyColorPreset(preset)"
          >
            Aa
          </button>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="panel-actions">
      <button class="btn-reset" @click="resetStyles">重置样式</button>
      <button class="btn-apply" @click="applyStyles">应用</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface ColorPreset {
  name: string;
  bg: string;
  text: string;
  border: string;
  line: string;
}

interface ThemePreset {
  id: string;
  name: string;
  preview: string;
  nodeColor: string;
  textColor: string;
  lineColor: string;
  borderColor: string;
  bgColor: string;
}

defineProps<{
  style?: Record<string, any>;
}>();

const emit = defineEmits<{
  'update:canvas': [settings: Record<string, any>];
  'update:theme': [theme: ThemePreset];
  'apply': [];
  'reset': [];
}>();

const activeTab = ref('canvas');

// 画布样式
const canvasBg = ref('#ffffff');
const gridType = ref('none');

const gridOptions = [
  { value: 'none', icon: '⬜' },
  { value: 'dots', icon: '▦' },
  { value: 'lines', icon: '▤' },
  { value: 'graph', icon: '▧' },
];

const sizePresets = [
  { label: 'A4', width: 794, height: 1123 },
  { label: '16:9', width: 1920, height: 1080 },
  { label: '4:3', width: 1024, height: 768 },
  { label: '方形', width: 800, height: 800 },
];

const currentSize = ref('A4');

// 主题预设
const currentTheme = ref('default');

const themes: ThemePreset[] = [
  {
    id: 'default',
    name: '默认',
    preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    nodeColor: '#ffffff',
    textColor: '#333333',
    lineColor: '#764ba2',
    borderColor: '#667eea',
    bgColor: '#f8f9fa',
  },
  {
    id: 'ocean',
    name: '海洋蓝',
    preview: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
    nodeColor: '#ffffff',
    textColor: '#ffffff',
    lineColor: '#6dd5ed',
    borderColor: '#2193b0',
    bgColor: '#f0f9ff',
  },
  {
    id: 'forest',
    name: '森林绿',
    preview: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    nodeColor: '#ffffff',
    textColor: '#333333',
    lineColor: '#38ef7d',
    borderColor: '#11998e',
    bgColor: '#f0fdf4',
  },
  {
    id: 'sunset',
    name: '晚霞',
    preview: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    nodeColor: '#ffffff',
    textColor: '#ffffff',
    lineColor: '#f5576c',
    borderColor: '#f093fb',
    bgColor: '#fdf2f8',
  },
  {
    id: 'dark',
    name: '深色',
    preview: 'linear-gradient(135deg, #2d3436 0%, #000000 100%)',
    nodeColor: '#2d3436',
    textColor: '#ffffff',
    lineColor: '#636e72',
    borderColor: '#636e72',
    bgColor: '#1a1a2e',
  },
  {
    id: 'minimal',
    name: '简约白',
    preview: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
    nodeColor: '#ffffff',
    textColor: '#333333',
    lineColor: '#cccccc',
    borderColor: '#e0e0e0',
    bgColor: '#ffffff',
  },
];

// 节点样式
const nodeBg = ref('#ffffff');
const textColor = ref('#333333');
const borderColor = ref('#d9d9d9');
const lineColor = ref('#999999');

// 快速配色方案
const colorPresets: ColorPreset[] = [
  { name: '商务蓝', bg: '#1890ff', text: '#ffffff', border: '#096dd9', line: '#69c0ff' },
  { name: '活力橙', bg: '#fa8c16', text: '#ffffff', border: '#d46b08', line: '#ffc069' },
  { name: '清新绿', bg: '#52c41a', text: '#ffffff', border: '#389e0d', line: '#95de64' },
  { name: '优雅紫', bg: '#722ed1', text: '#ffffff', border: '#531dab', line: '#b37feb' },
  { name: '热情红', bg: '#f5222d', text: '#ffffff', border: '#cf1322', line: '#ff7875' },
  { name: '经典灰', bg: '#8c8c8c', text: '#ffffff', border: '#595959', line: '#bfbfbf' },
];

function setCanvasBg(color: string) {
  canvasBg.value = color;
}

function setGridType(type: string) {
  gridType.value = type;
}

function setCanvasSize(size: { label: string; width: number; height: number }) {
  currentSize.value = size.label;
  emit('update:canvas', { width: size.width, height: size.height });
}

function applyTheme(theme: ThemePreset) {
  currentTheme.value = theme.id;
  nodeBg.value = theme.nodeColor;
  textColor.value = theme.textColor;
  borderColor.value = theme.borderColor;
  lineColor.value = theme.lineColor;
  canvasBg.value = theme.bgColor;
  emit('update:theme', theme);
}

function setNodeBg(color: string) {
  nodeBg.value = color;
}

function setTextColor(color: string) {
  textColor.value = color;
}

function setBorderColor(color: string) {
  borderColor.value = color;
}

function setLineColor(color: string) {
  lineColor.value = color;
}

function applyColorPreset(preset: ColorPreset) {
  nodeBg.value = preset.bg;
  textColor.value = preset.text;
  borderColor.value = preset.border;
  lineColor.value = preset.line;
}

function resetStyles() {
  nodeBg.value = '#ffffff';
  textColor.value = '#333333';
  borderColor.value = '#d9d9d9';
  lineColor.value = '#999999';
  canvasBg.value = '#ffffff';
  gridType.value = 'none';
  emit('reset');
}

function applyStyles() {
  emit('apply');
}
</script>

<style scoped>
.style-panel {
  padding: 12px;
}

.panel-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.tab-btn {
  flex: 1;
  padding: 6px 12px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #f5f5f5;
}

.tab-btn.active {
  background: #e6f4ff;
  color: #1677ff;
  font-weight: 500;
}

.tab-content {
  min-height: 200px;
}

.style-field {
  margin-bottom: 14px;
}

.style-field label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-row input[type="color"] {
  width: 32px;
  height: 28px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  padding: 2px;
}

.color-text {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.grid-options,
.size-presets,
.color-presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.grid-btn,
.size-btn,
.preset-btn {
  padding: 4px 10px;
  border: 1px solid #e0e0e0;
  background: #fafafa;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.grid-btn:hover,
.size-btn:hover,
.preset-btn:hover {
  border-color: #1677ff;
}

.grid-btn.active,
.size-btn.active {
  background: #e6f4ff;
  border-color: #1677ff;
  color: #1677ff;
}

.preset-btn {
  min-width: 36px;
  font-weight: 600;
}

.theme-section {
  margin-bottom: 16px;
}

.section-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.theme-card {
  border: 2px solid #eee;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}

.theme-card:hover {
  border-color: #bbb;
}

.theme-card.active {
  border-color: #1677ff;
}

.theme-preview {
  height: 40px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 6px;
}

.preview-node {
  width: 20px;
  height: 14px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: bold;
}

.preview-line {
  width: 16px;
  border-top: 2px solid;
}

.theme-name {
  font-size: 11px;
  text-align: center;
  color: #666;
}

.panel-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.btn-reset,
.btn-apply {
  flex: 1;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-reset {
  border: 1px solid #d9d9d9;
  background: #fff;
  color: #666;
}

.btn-reset:hover {
  border-color: #f5222d;
  color: #f5222d;
}

.btn-apply {
  border: none;
  background: #1677ff;
  color: #fff;
}

.btn-apply:hover {
  background: #4096ff;
}
</style>
