<template>
  <Teleport to="body">
    <div v-if="visible" class="shape-library-overlay" @click.self="close">
      <div class="shape-library">
        <!-- 头部 -->
        <div class="library-header">
          <h3>图形库</h3>
          <button class="close-btn" @click="close">×</button>
        </div>

        <!-- 搜索 -->
        <div class="library-search">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索图形..."
            class="search-input"
          />
        </div>

        <!-- 分类侧边栏 -->
        <div class="library-body">
          <div class="category-sidebar">
            <button
              v-for="cat in categories"
              :key="cat.id"
              :class="['cat-btn', { active: activeCategory === cat.id }]"
              @click="activeCategory = cat.id"
            >
              <span class="cat-icon">{{ cat.icon }}</span>
              <span class="cat-label">{{ cat.name }}</span>
              <span class="cat-count">{{ getCategoryCount(cat.id) }}</span>
            </button>
          </div>

          <!-- 图形网格 -->
          <div class="shape-content">
            <div class="content-header">
              <span class="content-title">{{ currentCategoryName }}</span>
              <span class="shape-count">{{ filteredShapes.length }} 个图形</span>
            </div>

            <div class="shape-grid">
              <button
                v-for="shape in filteredShapes"
                :key="shape.id"
                :class="['shape-item', { selected: selectedShape?.id === shape.id }]"
                @click="selectedShape = shape"
                :title="shape.name"
              >
                <div class="shape-preview">
                  <svg viewBox="0 0 100 100" class="shape-svg">
                    <path :d="shape.svgPath" fill="currentColor" />
                  </svg>
                </div>
                <div class="shape-name">{{ shape.name }}</div>
              </button>
            </div>

            <!-- 空状态 -->
            <div v-if="filteredShapes.length === 0" class="empty-state">
              <span class="empty-icon">📭</span>
              <p>该分类暂无图形</p>
            </div>
          </div>

          <!-- 图形预览 -->
          <div v-if="selectedShape" class="shape-preview-panel">
            <div class="preview-header">图形预览</div>
            <div class="preview-area">
              <div class="preview-svg">
                <svg viewBox="0 0 100 100" class="preview-shape">
                  <path :d="selectedShape.svgPath" fill="#1677ff" />
                </svg>
              </div>
            </div>
            <div class="preview-info">
              <div class="info-row">
                <span class="info-label">名称</span>
                <span class="info-value">{{ selectedShape.name }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">英文</span>
                <span class="info-value">{{ selectedShape.nameEn }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">宽高比</span>
                <span class="info-value">{{ selectedShape.aspectRatio.toFixed(2) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">快捷键</span>
                <span class="info-value">{{ selectedShape.shortcut || '无' }}</span>
              </div>
              <div class="info-tags">
                <span v-if="selectedShape.canContainText" class="info-tag">可填充文字</span>
                <span v-if="selectedShape.hasAdjustHandle" class="info-tag">可调整大小</span>
                <span v-if="selectedShape.editableVertices" class="info-tag">可编辑顶点</span>
              </div>
            </div>
            <div class="preview-actions">
              <button class="btn-insert" @click="insertShape">
                插入图形
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  WPS_SHAPE_LIBRARY,
  getShapesByCategory,
  getShapeCategories,
  SHAPE_CATEGORY_META,
  type ShapeEntry,
} from '@mindflow/shared';
import { ShapeCategory } from '@mindflow/shared';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  select: [shape: ShapeEntry];
}>();

// 分类配置
const categories = [
  { id: 'all', name: '全部', icon: '📦' },
  { id: ShapeCategory.LINES, name: '线条', icon: '〰' },
  { id: ShapeCategory.RECTANGLES, name: '矩形', icon: '▢' },
  { id: ShapeCategory.BASIC_SHAPES, name: '基本形状', icon: '⬡' },
  { id: ShapeCategory.ARROWS, name: '箭头', icon: '→' },
  { id: ShapeCategory.FLOWCHART, name: '流程图', icon: '🔲' },
  { id: ShapeCategory.STARS_FLAGS, name: '星形', icon: '★' },
  { id: ShapeCategory.CALLOUTS, name: '标注', icon: '💬' },
];

const activeCategory = ref('all');
const searchKeyword = ref('');
const selectedShape = ref<ShapeEntry | null>(null);

// 当前分类名称
const currentCategoryName = computed(() => {
  const cat = categories.find(c => c.id === activeCategory.value);
  return cat?.name || '全部';
});

// 获取分类图形数量
function getCategoryCount(categoryId: string): number {
  if (categoryId === 'all') {
    return WPS_SHAPE_LIBRARY.length;
  }
  return getShapesByCategory(categoryId as ShapeCategory).length;
}

// 筛选图形
const filteredShapes = computed(() => {
  let shapes: ShapeEntry[];

  if (activeCategory.value === 'all') {
    shapes = [...WPS_SHAPE_LIBRARY];
  } else {
    shapes = getShapesByCategory(activeCategory.value as ShapeCategory);
  }

  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.toLowerCase();
    shapes = shapes.filter(
      s =>
        s.name.toLowerCase().includes(kw) ||
        s.nameEn.toLowerCase().includes(kw)
    );
  }

  return shapes;
});

function close() {
  emit('close');
}

function insertShape() {
  if (selectedShape.value) {
    emit('select', selectedShape.value);
    close();
  }
}
</script>

<style scoped>
.shape-library-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.shape-library {
  background: #fff;
  border-radius: 12px;
  width: 1000px;
  max-width: 95vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #eee;
}

.library-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #666;
}

.library-search {
  display: flex;
  align-items: center;
  margin: 12px 20px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.search-icon {
  margin-right: 8px;
  font-size: 13px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
}

.library-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.category-sidebar {
  width: 140px;
  border-right: 1px solid #eee;
  padding: 12px;
  overflow-y: auto;
}

.cat-btn {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  margin-bottom: 2px;
  transition: all 0.2s;
  gap: 8px;
}

.cat-btn:hover {
  background: #f5f5f5;
}

.cat-btn.active {
  background: #e6f4ff;
  color: #1677ff;
}

.cat-icon {
  font-size: 14px;
}

.cat-label {
  flex: 1;
  text-align: left;
}

.cat-count {
  font-size: 11px;
  color: #999;
  background: #f0f0f0;
  padding: 1px 6px;
  border-radius: 10px;
}

.cat-btn.active .cat-count {
  background: #bae0ff;
  color: #1677ff;
}

.shape-content {
  flex: 1;
  padding: 12px 16px;
  overflow-y: auto;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.content-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.shape-count {
  font-size: 12px;
  color: #999;
}

.shape-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
}

.shape-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 6px;
  border: 1px solid #eee;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.shape-item:hover {
  border-color: #1677ff;
  background: #f0f5ff;
}

.shape-item.selected {
  border-color: #1677ff;
  background: #e6f4ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.2);
}

.shape-preview {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shape-svg {
  width: 40px;
  height: 40px;
  color: #666;
}

.shape-item:hover .shape-svg,
.shape-item.selected .shape-svg {
  color: #1677ff;
}

.shape-name {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #999;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.shape-preview-panel {
  width: 180px;
  border-left: 1px solid #eee;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.preview-header {
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
  font-weight: 500;
}

.preview-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.preview-svg {
  width: 100px;
  height: 100px;
}

.preview-shape {
  width: 100%;
  height: 100%;
}

.preview-info {
  font-size: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.info-label {
  color: #999;
}

.info-value {
  color: #333;
  font-weight: 500;
}

.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.info-tag {
  font-size: 10px;
  padding: 2px 6px;
  background: #f0f0f0;
  color: #666;
  border-radius: 3px;
}

.preview-actions {
  margin-top: 12px;
}

.btn-insert {
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: #1677ff;
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
}

.btn-insert:hover {
  background: #4096ff;
}
</style>
