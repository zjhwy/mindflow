<template>
  <div class="shape-picker">
    <div class="sp-header">
      <h4>形状库</h4>
      <span class="sp-count">{{ totalCount }} 个形状</span>
    </div>

    <!-- 分类选项卡 -->
    <div class="sp-categories">
      <button
        v-for="cat in categories"
        :key="cat.category"
        class="sp-cat-btn"
        :class="{ active: activeCategory === cat.category }"
        @click="activeCategory = cat.category"
        :title="cat.name"
      >
        <span class="cat-icon">{{ cat.icon }}</span>
        <span class="cat-count">{{ cat.count }}</span>
      </button>
    </div>

    <!-- 搜索 -->
    <div class="sp-search">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索形状..."
        class="sp-search-input"
        @input="onSearch"
      />
    </div>

    <!-- 形状网格 -->
    <div class="sp-grid-wrap">
      <div class="sp-grid" ref="gridRef">
        <div
          v-for="shape in filteredShapes"
          :key="shape.id"
          class="sp-item"
          :class="{ selected: selectedShapeId === shape.id }"
          :title="shape.name"
          @click="selectShape(shape)"
          @dblclick="applyShape(shape)"
          draggable="true"
          @dragstart="onDragStart($event, shape)"
        >
          <svg viewBox="0 0 100 100" class="sp-svg">
            <path :d="shape.svgPath" fill="#e6f4ff" stroke="#1677ff" stroke-width="2" />
          </svg>
          <span class="sp-name">{{ shape.name.length > 4 ? shape.name.slice(0,4)+'…' : shape.name }}</span>
        </div>

        <div v-if="filteredShapes.length === 0" class="sp-empty">
          未找到匹配的形状
        </div>
      </div>
    </div>

    <!-- 应用按钮 -->
    <div class="sp-actions" v-if="selectedShapeId">
      <button class="btn-apply" @click="applySelected">
        应用形状：{{ selectedShapeName }}
      </button>
      <button class="btn-reset" @click="resetShape">
        重置为默认
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  ShapeCategory, SHAPE_CATEGORY_META, getShapesByCategory,
  WPS_SHAPE_LIBRARY, TOTAL_SHAPE_COUNT,
  type WpsShapeType,
} from '@mindflow/shared';
import type { ShapeLibraryEntry } from '@mindflow/shared';

const props = defineProps<{
  currentShapeType?: WpsShapeType;
}>();

const emit = defineEmits<{
  'apply-shape': [shapeId: WpsShapeType];
  'reset-shape': [];
  'preview-shape': [shapeId: WpsShapeType];
}>();

// 分类
const activeCategory = ref<ShapeCategory>(ShapeCategory.BASIC_SHAPES);
const categories = computed(() => {
  return Object.entries(SHAPE_CATEGORY_META).map(([key, value]) => ({
    category: key as ShapeCategory,
    ...value,
  }));
});
const totalCount = TOTAL_SHAPE_COUNT;

// 搜索
const searchQuery = ref('');
const selectedShapeId = ref<string | null>(props.currentShapeType ?? null);

const selectedShapeName = computed(() => {
  const shape = WPS_SHAPE_LIBRARY.find(s => s.id === selectedShapeId.value);
  return shape?.name ?? '';
});

// 过滤
const filteredShapes = computed(() => {
  let shapes = searchQuery.value.trim()
    ? WPS_SHAPE_LIBRARY.filter(s =>
        s.name.includes(searchQuery.value) ||
        s.nameEn.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    : getShapesByCategory(activeCategory.value);

  return shapes;
});

const gridRef = ref<HTMLElement | null>(null);

function selectShape(shape: ShapeLibraryEntry) {
  selectedShapeId.value = shape.id;
  emit('preview-shape', shape.id);
}

function applyShape(shape: ShapeLibraryEntry) {
  emit('apply-shape', shape.id);
}

function applySelected() {
  if (selectedShapeId.value) {
    emit('apply-shape', selectedShapeId.value as WpsShapeType);
  }
}

function resetShape() {
  selectedShapeId.value = null;
  emit('reset-shape');
}

function onSearch() {
  // 搜索时切换到全部分类显示
}

function onDragStart(e: DragEvent, shape: ShapeLibraryEntry) {
  if (!e.dataTransfer) return;
  e.dataTransfer.setData('application/wps-shape-id', shape.id);
  e.dataTransfer.setData('text/plain', shape.name);
  e.dataTransfer.effectAllowed = 'copy';
}
</script>

<style scoped>
.shape-picker {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-size: 12px;
}
.sp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.sp-header h4 { font-size: 14px; font-weight: 600; margin: 0; }
.sp-count { color: #999; font-size: 11px; }

.sp-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-bottom: 8px;
}
.sp-cat-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 6px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  font-size: 10px;
  cursor: pointer;
  color: #666;
  transition: all 0.15s;
  white-space: nowrap;
}
.sp-cat-btn:hover { border-color: #1677ff; color: #1677ff; }
.sp-cat-btn.active { border-color: #1677ff; background: #e6f4ff; color: #1677ff; }
.cat-icon { font-size: 14px; }
.cat-count { font-size: 9px; color: #999; }

.sp-search { margin-bottom: 8px; }
.sp-search-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
}
.sp-search-input:focus { border-color: #1677ff; }

.sp-grid-wrap {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 8px;
}
.sp-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.sp-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 2px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.sp-item:hover { background: #f0f5ff; border-color: #91caff; }
.sp-item.selected { background: #e6f4ff; border-color: #1677ff; }
.sp-svg {
  width: 32px;
  height: 32px;
  pointer-events: none;
}
.sp-name {
  font-size: 9px;
  color: #666;
  margin-top: 2px;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sp-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: #999;
  padding: 20px 0;
  font-size: 12px;
}

.sp-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid #e8e8e8;
}
.btn-apply {
  width: 100%;
  padding: 6px 12px;
  background: #1677ff;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.btn-apply:hover { background: #4096ff; }
.btn-reset {
  width: 100%;
  padding: 6px 12px;
  background: #fff;
  color: #ff4d4f;
  border: 1px solid #ff4d4f;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.btn-reset:hover { background: #fff2f0; }
</style>
