<template>
  <div class="layout-switcher">
    <button class="switcher-trigger" @click="toggle">
      <span class="trigger-icon">{{ currentIcon }}</span>
      <span class="trigger-text">{{ currentLabel }}</span>
      <span class="trigger-arrow">{{ isOpen ? '▲' : '▼' }}</span>
    </button>

    <Transition name="dropdown">
      <div v-if="isOpen" class="switcher-dropdown">
        <div class="dropdown-section">
          <div class="section-title">布局类型</div>
          <div class="layout-grid">
            <button
              v-for="layout in layoutOptions"
              :key="layout.value"
              :class="['layout-item', { active: currentLayout === layout.value }]"
              @click="selectLayout(layout.value)"
            >
              <div class="layout-icon">{{ layout.icon }}</div>
              <div class="layout-name">{{ layout.name }}</div>
              <div class="layout-desc">{{ layout.desc }}</div>
            </button>
          </div>
        </div>

        <div class="dropdown-divider" />

        <div class="dropdown-section">
          <div class="section-title">快速切换</div>
          <div class="quick-actions">
            <button class="quick-btn" @click="mirrorLayout">
              <span>🔄</span> 左右镜像
            </button>
            <button class="quick-btn" @click="centerLayout">
              <span>🎯</span> 居中显示
            </button>
            <button class="quick-btn" @click="autoArrange">
              <span>📐</span> 自动排列
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <div v-if="isOpen" class="dropdown-backdrop" @click="close" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { MindLayoutType } from '@mindflow/shared';

interface LayoutOption {
  value: MindLayoutType;
  name: string;
  icon: string;
  desc: string;
}

const props = defineProps<{
  currentLayout: MindLayoutType;
}>();

const emit = defineEmits<{
  'update:layout': [layout: MindLayoutType];
  mirror: [];
  center: [];
  autoArrange: [];
}>();

const isOpen = ref(false);

const layoutOptions: LayoutOption[] = [
  {
    value: MindLayoutType.LOGIC_RIGHT,
    name: '逻辑图',
    icon: '→',
    desc: '向右展开',
  },
  {
    value: MindLayoutType.LOGIC_LEFT,
    name: '左侧图',
    icon: '←',
    desc: '向左展开',
  },
  {
    value: MindLayoutType.ORG_STRUCTURE,
    name: '组织架构',
    icon: '⬇',
    desc: '层级树形',
  },
  {
    value: MindLayoutType.TIMELINE,
    name: '时间轴',
    icon: '📅',
    desc: '水平时间线',
  },
  {
    value: MindLayoutType.FISHBONE,
    name: '鱼骨图',
    icon: '🐟',
    desc: '因果分析',
  },
  {
    value: MindLayoutType.FREE,
    name: '自由布局',
    icon: '✨',
    desc: '手动调整',
  },
];

const currentIcon = computed(() => {
  const layout = layoutOptions.find(l => l.value === props.currentLayout);
  return layout?.icon || '→';
});

const currentLabel = computed(() => {
  const layout = layoutOptions.find(l => l.value === props.currentLayout);
  return layout?.name || '布局';
});

function toggle() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

function selectLayout(layout: MindLayoutType) {
  emit('update:layout', layout);
  close();
}

function mirrorLayout() {
  emit('mirror');
  close();
}

function centerLayout() {
  emit('center');
  close();
}

function autoArrange() {
  emit('autoArrange');
  close();
}
</script>

<style scoped>
.layout-switcher {
  position: relative;
}

.switcher-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  color: #333;
  transition: all 0.2s;
}

.switcher-trigger:hover {
  border-color: #1677ff;
  color: #1677ff;
}

.trigger-icon {
  font-size: 14px;
}

.trigger-text {
  font-weight: 500;
}

.trigger-arrow {
  font-size: 10px;
  color: #999;
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}

.switcher-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 340px;
  overflow: hidden;
}

.dropdown-section {
  padding: 14px;
}

.section-title {
  font-size: 12px;
  color: #999;
  margin-bottom: 10px;
  font-weight: 500;
}

.layout-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.layout-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border: 1px solid #eee;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.layout-item:hover {
  border-color: #1677ff;
  background: #f0f5ff;
}

.layout-item.active {
  border-color: #1677ff;
  background: #e6f4ff;
}

.layout-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.layout-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.layout-desc {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.dropdown-divider {
  height: 1px;
  background: #eee;
  margin: 0 14px;
}

.quick-actions {
  display: flex;
  gap: 8px;
}

.quick-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  border: 1px solid #eee;
  background: #fafafa;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.quick-btn:hover {
  border-color: #1677ff;
  color: #1677ff;
  background: #f0f5ff;
}

/* Transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>
