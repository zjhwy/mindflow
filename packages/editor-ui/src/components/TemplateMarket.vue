<template>
  <Teleport to="body">
    <div v-if="visible" class="template-modal-overlay" @click.self="close">
      <div class="template-modal">
        <!-- 头部 -->
        <div class="modal-header">
          <h2>选择模板</h2>
          <button class="close-btn" @click="close">×</button>
        </div>

        <!-- 搜索栏 -->
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索模板..."
            class="search-input"
          />
        </div>

        <!-- 分类标签 -->
        <div class="category-tabs">
          <button
            v-for="cat in categories"
            :key="cat.id"
            :class="['cat-tab', { active: activeCategory === cat.id }]"
            @click="activeCategory = cat.id"
          >
            <span class="cat-icon">{{ cat.icon }}</span>
            <span class="cat-name">{{ cat.name }}</span>
          </button>
        </div>

        <!-- 模板网格 -->
        <div class="template-grid">
          <div
            v-for="template in filteredTemplates"
            :key="template.id"
            :class="['template-card', { selected: selectedId === template.id }]"
            @click="selectedId = template.id"
          >
            <!-- 缩略图 -->
            <div class="card-preview">
              <div class="preview-content" :style="getPreviewStyle(template)">
                <div class="preview-root">{{ template.rootText }}</div>
                <div v-if="template.structure.length > 0" class="preview-branches">
                  <div
                    v-for="(item, idx) in template.structure.slice(0, 4)"
                    :key="idx"
                    class="preview-branch"
                    :style="{ '--branch-angle': `${(idx - 1.5) * 25}deg` }"
                  >
                    {{ item.text }}
                  </div>
                </div>
              </div>
            </div>
            <!-- 卡片信息 -->
            <div class="card-info">
              <div class="card-name">{{ template.name }}</div>
              <div class="card-desc">{{ template.description }}</div>
            </div>
            <!-- 选择标记 -->
            <div v-if="selectedId === template.id" class="selected-badge">✓</div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredTemplates.length === 0" class="empty-state">
          <span class="empty-icon">📭</span>
          <p>未找到匹配的模板</p>
        </div>

        <!-- 底部操作 -->
        <div class="modal-footer">
          <button class="btn-cancel" @click="close">取消</button>
          <button
            class="btn-confirm"
            :disabled="!selectedId"
            @click="confirmSelection"
          >
            使用此模板
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { TEMPLATE_CATEGORIES, TEMPLATES, getTemplatesByCategory, searchTemplates, type Template } from '@/data/templates';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  select: [template: Template];
}>();

const categories = TEMPLATE_CATEGORIES;
const activeCategory = ref('mindmap');
const searchKeyword = ref('');
const selectedId = ref<string | null>(null);

// 筛选模板
const filteredTemplates = computed(() => {
  let templates: Template[];

  if (searchKeyword.value.trim()) {
    templates = searchTemplates(searchKeyword.value);
  } else {
    templates = getTemplatesByCategory(activeCategory.value);
  }

  return templates;
});

// 预览样式
function getPreviewStyle(template: Template) {
  const styleMap: Record<string, { bg: string; text: string }> = {
    mindmap: { bg: '#e8f4fd', text: '#1976d2' },
    flowchart: { bg: '#fff3e0', text: '#f57c00' },
    orgchart: { bg: '#e8f5e9', text: '#388e3c' },
    timeline: { bg: '#fce4ec', text: '#c2185b' },
    fishbone: { bg: '#f3e5f5', text: '#7b1fa2' },
    concept: { bg: '#e0f2f1', text: '#00796b' },
  };

  const colors = styleMap[template.category] || { bg: '#f5f5f5', text: '#666' };

  return {
    background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%)`,
    color: colors.text,
  };
}

function close() {
  emit('close');
}

function confirmSelection() {
  const template = TEMPLATES.find(t => t.id === selectedId.value);
  if (template) {
    emit('select', template);
    close();
  }
}
</script>

<style scoped>
.template-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.template-modal {
  background: #fff;
  border-radius: 12px;
  width: 900px;
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #666;
}

.search-bar {
  display: flex;
  align-items: center;
  margin: 16px 20px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.search-icon {
  margin-right: 8px;
  font-size: 14px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
}

.category-tabs {
  display: flex;
  gap: 8px;
  padding: 0 20px 16px;
  overflow-x: auto;
  border-bottom: 1px solid #eee;
}

.cat-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid #e0e0e0;
  background: #fff;
  border-radius: 20px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.cat-tab:hover {
  border-color: #1677ff;
  color: #1677ff;
}

.cat-tab.active {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}

.cat-icon {
  font-size: 14px;
}

.template-grid {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.template-card {
  position: relative;
  border: 2px solid #eee;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.template-card:hover {
  border-color: #bbb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.template-card.selected {
  border-color: #1677ff;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.2);
}

.card-preview {
  height: 100px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-content {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.preview-root {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
}

.preview-branches {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 4px;
}

.preview-branch {
  font-size: 8px;
  padding: 1px 5px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 3px;
  max-width: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-info {
  padding: 10px;
  background: #fafafa;
  border-top: 1px solid #eee;
}

.card-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}

.card-desc {
  font-size: 11px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  background: #1677ff;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.btn-cancel {
  padding: 8px 20px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  color: #666;
}

.btn-cancel:hover {
  border-color: #bbb;
  color: #333;
}

.btn-confirm {
  padding: 8px 24px;
  border: none;
  background: #1677ff;
  color: #fff;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

.btn-confirm:hover:not(:disabled) {
  background: #4096ff;
}

.btn-confirm:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
