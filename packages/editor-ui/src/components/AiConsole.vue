<template>
  <!-- 展开态 / 紧凑态 -->
  <div
    v-if="!minimized"
    ref="windowRef"
    class="ai-console"
    :class="[{ compact: isCompact }, windowClass]"
    :style="windowStyle"
    @mousedown="onWindowFocus"
  >
    <!-- 拖拽标题栏 -->
    <div class="ai-console-header" @mousedown.prevent="startDrag">
      <span class="ai-header-icon">≡</span>
      <span class="ai-header-title" v-if="!isCompact">MindFlow AI</span>
      <span class="ai-header-subtitle" v-if="!isCompact">思维导图智能助手</span>
      <span class="ai-coop-indicator" v-if="coopUser">👤 {{ coopUser }}</span>
      <span class="ai-status" :class="aiStatus" v-if="!isCompact">{{ statusText }}</span>
      <div class="ai-header-actions">
        <button title="最小化" @click.stop="minimized = true">─</button>
        <button title="展开/紧凑" v-if="!isCompact" @click.stop="toggleExpand" :style="{fontSize:'10px'}">
          {{ maxWidth > 400 ? '⊟' : '⊞' }}
        </button>
        <button title="关闭" @click.stop="$emit('close')">✕</button>
      </div>
    </div>

    <!-- 图形类型 + 参数面板（展开态显示） -->
    <div class="ai-console-config" v-if="!isCompact">
      <div class="ai-config-row">
        <div class="ai-config-field">
          <button class="ai-type-btn" @click="showTypePicker = !showTypePicker">
            {{ selectedGraphicType.icon }} {{ selectedGraphicType.name }}
            <span class="ai-chevron">▼</span>
          </button>
          <!-- 图形类型下拉 -->
          <div v-if="showTypePicker" class="ai-type-dropdown">
            <input v-model="typeSearch" placeholder="🔍 搜索..." class="ai-type-search" />
            <div v-for="group in filteredGraphicTypes" :key="group.category" class="ai-type-group">
              <div class="ai-type-cat">{{ group.category }}</div>
              <button
                v-for="gt in group.types"
                :key="gt.id"
                class="ai-type-item"
                :class="{ active: selectedGraphicType.id === gt.id }"
                @click="selectGraphicType(gt); showTypePicker = false"
              >
                <span>{{ gt.icon }}</span>
                <span>{{ gt.name }}</span>
                <span v-if="gt.id === 'mindmap-radial'" class="ai-recommend">推荐</span>
              </button>
            </div>
          </div>
        </div>
        <div class="ai-config-field">
          <select v-model="selectedStyle" class="ai-style-select">
            <option value="business">🔵 商务简约</option>
            <option value="dark">⚫ 深色模式</option>
            <option value="handdrawn">🖊 手绘风格</option>
            <option value="academic">📐 学术线条</option>
          </select>
        </div>
      </div>

      <!-- 思维导图专属参数 -->
      <div class="ai-mindmap-params" v-if="selectedGraphicType.id.startsWith('mindmap')">
        <div class="ai-param-row">
          <span class="ai-param-label">最大层级：</span>
          <span v-for="lvl in [2,3,4,5]" :key="lvl" class="ai-level-btn"
            :class="{ active: maxDepth === lvl }" @click="maxDepth = lvl">{{ lvl }}</span>
        </div>
        <div class="ai-param-row">
          <span class="ai-param-label">分支数量：</span>
          <span v-for="br in branchOptions" :key="br.value" class="ai-level-btn"
            :class="{ active: branchCount === br.value }" @click="branchCount = br.value">{{ br.label }}</span>
        </div>
        <div class="ai-param-check">
          <label><input type="checkbox" v-model="autoCenter" /> 生成后自动居中画布</label>
        </div>
      </div>
    </div>

    <!-- 对话区域 -->
    <div class="ai-console-chat" ref="chatRef">
      <!-- 历史记录 -->
      <div v-for="(msg, i) in chatHistory" :key="i" class="ai-chat-item" :class="msg.role">
        <span class="ai-chat-role">{{ msg.role === 'user' ? '👤' : '🤖' }}</span>
        <div class="ai-chat-bubble">
          <div class="ai-chat-text">{{ msg.text }}</div>
          <div v-if="msg.outline" class="ai-chat-outline">
            <div class="ai-outline-header" @click="msg.outlineExpanded = !msg.outlineExpanded">
              📋 大纲实时预览 <span class="ai-chevron">{{ msg.outlineExpanded ? '▼' : '▶' }}</span>
            </div>
            <div v-if="msg.outlineExpanded" class="ai-outline-tree">
              <div v-for="line in msg.outline" :key="line.id" :style="{ paddingLeft: (line.depth * 16) + 'px' }" class="ai-outline-item">
                <span class="ai-outline-icon">{{ line.depth === 0 ? '⬤' : line.depth === 1 ? '├─' : '└─' }}</span>
                <span v-if="line.icon" class="ai-outline-emoji">{{ line.icon }}</span>
                <span class="ai-outline-text">{{ line.text }}</span>
                <span v-if="line.priority === 'P0'" class="ai-outline-prio p0">P0</span>
                <span v-else-if="line.priority === 'P1'" class="ai-outline-prio p1">P1</span>
              </div>
            </div>
          </div>
          <!-- 操作按钮 -->
          <div v-if="msg.role === 'ai' && msg.actionText" class="ai-chat-actions">
            <button class="ai-action-btn" @click="applyGenerate(msg)">✅ {{ msg.actionText }}</button>
            <button class="ai-action-btn secondary" @click="retryMessage(msg)">🔄 重试</button>
          </div>
        </div>
      </div>

      <!-- 加载指示器 -->
      <div v-if="loading" class="ai-chat-item ai">
        <span class="ai-chat-role">🤖</span>
        <div class="ai-chat-bubble">
          <div class="ai-loading">
            <span class="ai-dot" :style="{animationDelay:'0s'}">●</span>
            <span class="ai-dot" :style="{animationDelay:'0.2s'}">●</span>
            <span class="ai-dot" :style="{animationDelay:'0.4s'}">●</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="ai-console-input">
      <textarea
        ref="inputRef"
        v-model="inputText"
        class="ai-input-area"
        :placeholder="inputPlaceholder"
        rows="2"
        @keydown.enter.exact.prevent="sendMessage"
        @keydown.enter.shift.exact="inputText += '\n'"
        @input="updateCharCount"
      />
      <div class="ai-input-row">
        <span class="ai-char-count">{{ charCount }} / 500</span>
        <div class="ai-input-actions">
          <button class="ai-send-btn" :disabled="!inputText.trim() || loading" @click="sendMessage" title="发送 (Enter)">
            🚀
          </button>
        </div>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="ai-console-footer" v-if="!isCompact">
      AI生成内容仅供参考，请人工核对信息准确性
    </div>

    <!-- 缩放手柄 -->
    <div v-if="!isCompact" class="ai-resize-handle" @mousedown.prevent="startResize">
      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0,10 L10,0 M4,10 L10,4 M8,10 L10,8" stroke="#ccc" stroke-width="1"/></svg>
    </div>
  </div>

  <!-- 最小化气泡 -->
  <div v-else class="ai-bubble" :class="aiStatus" @dblclick="minimized = false" title="双击恢复AI控制台">
    🟣
    <span class="ai-bubble-text" v-if="loading">工作中...</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { buildFullPrompt, GRAPHIC_TYPES, graphicTypeToLayout } from '@/composables/prompt-engine';
import { aiOutputToInnerLines } from '@/composables/ai-output-converter';
import type { AiMindMapOutput, AiNodeOutput } from '@/composables/prompt-engine';
import type { ConvertedMindMap } from '@/composables/ai-output-converter';

const emit = defineEmits<{
  close: [];
  'generate-mindmap': [data: {
    lines: Array<{ text: string; depth: number; metadata?: any }>;
    layoutType: string;
    style: string;
    centerTopic: string;
    rawAiOutput?: AiMindMapOutput;
  }];
  'modify-mindmap': [instruction: string];
  'apply-style': [style: string];
}>();

// ---- 图形类型定义 ----
interface GraphicType { id: string; name: string; icon: string; category: string; }
const GRAPHIC_TYPES: Array<{ category: string; types: GraphicType[] }> = [
  { category: '🧠 思维导图', types: [
    { id: 'mindmap-radial', name: '放射型思维导图', icon: '🔵', category: 'mindmap' },
    { id: 'mindmap-symmetric', name: '左右对称导图', icon: '🔵', category: 'mindmap' },
    { id: 'mindmap-project', name: '项目拆解导图', icon: '🔵', category: 'mindmap' },
    { id: 'mindmap-study', name: '学习笔记导图', icon: '🔵', category: 'mindmap' },
    { id: 'mindmap-brainstorm', name: '头脑风暴导图', icon: '🔵', category: 'mindmap' },
  ]},
  { category: '📊 分析模型', types: [
    { id: 'swot', name: 'SWOT分析', icon: '🟠', category: 'analysis' },
    { id: 'pest', name: 'PEST分析', icon: '🟠', category: 'analysis' },
    { id: 'fishbone', name: '鱼骨图', icon: '🟠', category: 'analysis' },
    { id: '5w2h', name: '5W2H', icon: '🟠', category: 'analysis' },
  ]},
  { category: '🔄 业务流程', types: [
    { id: 'flowchart', name: '流程图', icon: '🟢', category: 'flow' },
    { id: 'swimlane', name: '泳道图', icon: '🟢', category: 'flow' },
    { id: 'sequence', name: '时序图', icon: '🟢', category: 'flow' },
  ]},
  { category: '⏱ 时间管理', types: [
    { id: 'gantt', name: '甘特图', icon: '🟣', category: 'time' },
    { id: 'timeline', name: '时间轴', icon: '🟣', category: 'time' },
  ]},
  { category: '🏗 系统架构', types: [
    { id: 'er', name: 'ER图', icon: '⚪', category: 'arch' },
    { id: 'orgchart', name: '组织架构图', icon: '⚪', category: 'arch' },
  ]},
];

// ---- 窗口状态 ----
const windowRef = ref<HTMLElement | null>(null);
const chatRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);

const minimized = ref(true);
const isCompact = ref(false);
const windowClass = ref('');
const maxWidth = ref(400);

// 窗口位置和尺寸
const winX = ref(60);
const winY = ref(80);
const winW = ref(380);
const winH = ref(520);

const windowStyle = computed(() => ({
  left: winX.value + 'px',
  top: winY.value + 'px',
  width: isCompact.value ? '280px' : winW.value + 'px',
  height: isCompact.value ? '400px' : winH.value + 'px',
  maxWidth: isCompact.value ? '280px' : '600px',
}));

// ---- 拖拽 ----
let dragStartX = 0, dragStartY = 0, dragWinX = 0, dragWinY = 0;
let isDragging = false;

function startDrag(e: MouseEvent) {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragWinX = winX.value;
  dragWinY = winY.value;
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
}

function onDragMove(e: MouseEvent) {
  if (!isDragging) return;
  let nx = dragWinX + (e.clientX - dragStartX);
  let ny = dragWinY + (e.clientY - dragStartY);
  // 吸附到边距
  const snapDist = 20;
  if (Math.abs(nx) < snapDist) nx = 0;
  if (Math.abs(ny) < snapDist) ny = 0;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ww = isCompact.value ? 280 : winW.value;
  const wh = isCompact.value ? 400 : winH.value;
  if (Math.abs(nx + ww - vw) < snapDist) nx = vw - ww;
  winX.value = Math.max(-ww + 40, Math.min(nx, vw - 40));
  winY.value = Math.max(0, Math.min(ny, vh - 40));
}

function onDragEnd() {
  isDragging = false;
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
}

// ---- 缩放 ----
let resizeStartW = 0, resizeStartH = 0, resizeStartX = 0, resizeStartY = 0;

function startResize(e: MouseEvent) {
  e.stopPropagation();
  resizeStartW = winW.value;
  resizeStartH = winH.value;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup', onResizeEnd);
}

function onResizeMove(e: MouseEvent) {
  const dw = e.clientX - resizeStartX;
  const dh = e.clientY - resizeStartY;
  winW.value = Math.max(300, Math.min(600, resizeStartW + dw));
  winH.value = Math.max(300, Math.min(800, resizeStartH + dh));
  maxWidth.value = winW.value + 20;
}

function onResizeEnd() {
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
}

function toggleExpand() {
  isCompact.value = !isCompact.value;
}

// ---- AI 状态 ----
const loading = ref(false);
const aiStatus = ref<'idle' | 'loading' | 'done' | 'error'>('idle');
const statusText = computed(() => {
  const map: Record<string, string> = { idle: '🟢 就绪', loading: '🟡 分析中...', done: '✅ 完成', error: '🔴 失败' };
  return map[aiStatus.value] ?? '';
});

// ---- 协同 ----
const coopUser = ref<string | null>(null);

// ---- 图形类型 ----
const selectedGraphicType = ref(GRAPHIC_TYPES[0].types[0]);
const showTypePicker = ref(false);
const typeSearch = ref('');
const filteredGraphicTypes = computed(() => {
  if (!typeSearch.value.trim()) return GRAPHIC_TYPES;
  const q = typeSearch.value.toLowerCase();
  return GRAPHIC_TYPES.map(g => ({
    ...g,
    types: g.types.filter(t => t.name.toLowerCase().includes(q))
  })).filter(g => g.types.length > 0);
});

function selectGraphicType(gt: GraphicType) {
  selectedGraphicType.value = gt;
}

// ---- 导图参数 ----
const maxDepth = ref(3);
const branchCount = ref('auto');
const selectedStyle = ref('business');
const autoCenter = ref(true);
const branchOptions = [
  { value: 'auto', label: '自动' },
  { value: '2-4', label: '2-4' },
  { value: '5-8', label: '5-8' },
  { value: '9+', label: '9+' },
];

// ---- 对话 ----
interface OutlineItem { id: string; text: string; depth: number; icon?: string; shape?: string; priority?: string; }
interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  outline?: OutlineItem[];
  outlineExpanded?: boolean;
  actionText?: string;
  rawData?: any;
  rawAiOutput?: AiMindMapOutput;
}
const chatHistory = ref<ChatMessage[]>([]);
const inputText = ref('');
const charCount = ref(0);
const inputPlaceholder = '描述你想要的内容，例如：项目管理导图，含背景、目标、计划';

function updateCharCount() {
  charCount.value = inputText.value.length;
}

// ---- UUID 辅助 ----
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function sendMessage() {
  const text = inputText.value.trim();
  if (!text || loading.value) return;

  // 检测是否为修改指令
  const isModify = /修改|调整|改成|换成|换个|改一下|切换|变换/.test(text);

  chatHistory.value.push({ role: 'user', text });
  inputText.value = '';
  charCount.value = 0;

  loading.value = true;
  aiStatus.value = 'loading';
  scrollToBottom();

  // 模拟延迟（真实接入时替换为 API 调用 + buildFullPrompt）
  setTimeout(() => {
    const result = isModify
      ? mockModifyResponse(text)
      : mockGenerateResponse(text);
    chatHistory.value.push(result);
    loading.value = false;
    aiStatus.value = 'done';
    scrollToBottom();
  }, 1500 + Math.random() * 1000);
}

// ---- 智能生成（模拟 AI，按提示词体系输出 AiMindMapOutput 格式） ----

/** 图标匹配表 */
const ICON_MAP: Record<string, string> = {
  '项目': '🚀', '计划': '🚀', '管理': '🚀', '规划': '🚀',
  '时间': '⏰', '进度': '⏰', '日程': '⏰', '排期': '⏰',
  '人员': '👥', '团队': '👥', '分工': '👥', '组织': '👥',
  '资金': '💰', '预算': '💰', '成本': '💰', '财务': '💰',
  '风险': '⚠️', '问题': '⚠️', '阻塞': '⚠️', '隐患': '⚠️',
  '技术': '💻', '开发': '💻', '编程': '💻', '代码': '💻',
  '设计': '🎨', '创意': '🎨', 'UI': '🎨', '界面': '🎨',
  '测试': '🔍', '验证': '🔍', '检查': '🔍', '审核': '🔍',
  '文档': '📄', '报告': '📄', '方案': '📄', '产出': '📄',
  '目标': '🎯', '成果': '🎯', '指标': '🎯', 'KPI': '🎯',
  '沟通': '💬', '会议': '💬', '汇报': '💬', '讨论': '💬',
  '数据': '📊', '分析': '📊', '统计': '📊', '报表': '📊',
  '学习': '📚', '教育': '📚', '培训': '📚', '课程': '📚',
  '市场': '📈', '营销': '📈', '销售': '📈', '推广': '📈',
  '客户': '🤝', '用户': '🤝', '需求': '🤝', '反馈': '🤝',
  '安全': '🔒', '防护': '🔒', '加密': '🔒', '权限': '🔒',
};

/** 形状匹配表 */
const SHAPE_MAP: Record<string, string> = {
  '开始': 'capsule', '启动': 'capsule', '完成': 'capsule', '结束': 'capsule', '开始': 'capsule',
  '判断': 'flow-decision', '审核': 'flow-decision', '验证': 'flow-decision', '检查': 'flow-decision', '是否': 'flow-decision', '审批': 'flow-decision',
  '文档': 'parallelogram', '报告': 'parallelogram', '方案': 'parallelogram', '产出': 'parallelogram',
  '数据': 'cylinder', '存储': 'cylinder', '仓库': 'cylinder', '数据库': 'cylinder',
  '风险': 'flag-wave', '警告': 'flag-wave', '阻塞': 'flag-wave', '问题': 'flag-wave',
  '里程碑': 'star-5', '交付': 'star-5', '发布': 'star-5', '上线': 'star-5',
  '人员': 'hexagon', '团队': 'hexagon', '部门': 'hexagon',
};

function matchIcon(text: string): string {
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (text.includes(key)) return icon;
  }
  return '';
}

function matchShape(text: string): string {
  for (const [key, shape] of Object.entries(SHAPE_MAP)) {
    if (text.includes(key)) return shape;
  }
  return 'rounded-rect';
}

function matchPriority(text: string): string {
  if (/核心|关键|必须|紧急|最重要|核心/.test(text)) return 'P0';
  if (/重要|主要|次要/.test(text)) return 'P1';
  if (/一般|普通|可选/.test(text)) return 'P2';
  return 'P2';
}

function matchTags(text: string): Array<{ text: string; color: string }> {
  const tags: Array<{ text: string; color: string }> = [];
  if (/技术|开发|代码|编程|架构/.test(text)) tags.push({ text: '技术', color: '#3B82F6' });
  if (/市场|营销|销售|推广|客户/.test(text)) tags.push({ text: '市场', color: '#F59E0B' });
  if (/财务|预算|成本|资金|支出/.test(text)) tags.push({ text: '财务', color: '#10B981' });
  if (/人员|团队|人力|组织/.test(text)) tags.push({ text: '人力', color: '#8B5CF6' });
  if (/风险|安全|问题|隐患/.test(text)) tags.push({ text: '风险', color: '#EF4444' });
  return tags.slice(0, 3);
}

function mockGenerateResponse(userText: string): ChatMessage {
  const center = extractCenterTopic(userText);
  const branches = extractBranches(userText);
  const depthCount = maxDepth.value;

  // 构建完整的 AiMindMapOutput
  const aiOutput: AiMindMapOutput = {
    layoutType: graphicTypeToLayout(selectedGraphicType.value.id),
    style: selectedStyle.value,
    centerTopic: buildAiNode(center, 0, true),
    branches: branches.map(b => buildBranchNode(b, 1, depthCount)),
  };

  // 生成大纲预览
  const outline: OutlineItem[] = [];
  const collectOutline = (node: AiNodeOutput, depth: number) => {
    outline.push({
      id: node.id,
      text: node.text,
      depth,
      icon: node.icon,
      shape: node.shape,
      priority: node.priority,
    });
    if (node.children) {
      for (const child of node.children) {
        collectOutline(child, depth + 1);
      }
    }
  };
  collectOutline(aiOutput.centerTopic, 0);
  for (const branch of aiOutput.branches) {
    collectOutline(branch, 1);
  }

  const branchNames = branches.map(b => `"${b}"`).join('、');
  const typeName = selectedGraphicType.value.name;
  const noteSummary = outline.filter(o => o.depth > 1).length;

  return {
    role: 'ai',
    text: `✅ 已生成「${center}」${typeName}：\n• ${branches.length}个一级模块\n• ${outline.length}个节点（含${noteSummary}个细节项）\n• 自动匹配了图标、形状和优先级\n\n一级分支：${branchNames}\n\n可在画布上直接编辑节点，或继续输入指令调整。`,
    outline,
    outlineExpanded: true,
    actionText: '应用生成结果',
    rawData: { centerTopic: center, branches, outline },
    rawAiOutput: aiOutput,
  };
}

function buildAiNode(text: string, depth: number, isCenter: boolean): AiNodeOutput {
  const icon = isCenter ? '🧠' : (matchIcon(text) || '');
  const shape = matchShape(text);
  const priority = matchPriority(text);
  const tags = matchTags(text);

  return {
    id: uuidv4(),
    text: text.length > 15 ? text.slice(0, 15) : text,
    depth,
    shape: isCenter ? 'rounded-rect' : shape,
    connectors: { inputs: isCenter ? 4 : 2, outputs: isCenter ? 4 : 2 },
    icon,
    priority,
    progress: { value: 0, style: 'bar' },
    tags,
    note: depth >= 1 && text.length > 5 ? `${text}的具体内容和执行细节` : '',
    children: [],
  };
}

function buildBranchNode(branchName: string, depth: number, maxDepth: number): AiNodeOutput {
  const node = buildAiNode(branchName, depth, false);
  if (depth < maxDepth) {
    const subs = generateSubItems(branchName, Math.min(2 + Math.floor(Math.random() * 2), 4));
    for (const sub of subs) {
      const child = buildAiNode(sub, depth + 1, false);
      if (depth + 1 < maxDepth && Math.random() > 0.5) {
        const grandSubs = generateSubItems(sub, Math.min(1 + Math.floor(Math.random() * 2), 2));
        for (const gs of grandSubs) {
          child.children!.push(buildAiNode(gs, depth + 2, false));
        }
      }
      node.children!.push(child);
    }
  }
  return node;
}

function extractCenterTopic(text: string): string {
  const patterns = [
    /中心[是为：:]\s*(.+?)[，,\s]/,
    /主题[是为：:]\s*(.+?)[，,\s]/,
    /关于(.+?)的/,
    /生成.*?(.+?)(?:的|思维导图|导图)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].length > 15 ? m[1].slice(0, 15) : m[1];
  }
  const first = text.split(/[，,。.!！\n]/)[0];
  if (first.length > 15) return first.slice(0, 15) + '…';
  return first || '中心主题';
}

function extractBranches(text: string): string[] {
  const branchMatch = text.match(/(?:分支|模块|方面|部分|包含|包括)[包括含]?[：:]\s*(.+)/);
  if (branchMatch) {
    return branchMatch[1].split(/[，,、\s]+/).filter(Boolean).slice(0, 6);
  }
  const words = text.split(/[，,、。.!！\n]/).filter(w => w.trim().length >= 2 && w.trim().length <= 8);
  const unique = [...new Set(words)];
  if (unique.length >= 3) return unique.slice(0, 6);
  return selectDefaultBranches(text);
}

function selectDefaultBranches(text: string): string[] {
  if (/项目|开发|产品/.test(text)) return ['需求分析', '方案设计', '开发实施', '测试验收', '部署上线'];
  if (/市场|营销|销售/.test(text)) return ['市场调研', '策略制定', '渠道推广', '效果评估', '优化迭代'];
  if (/学习|知识|笔记/.test(text)) return ['核心概念', '知识体系', '应用场景', '拓展阅读', '总结反思'];
  if (/会议|讨论|汇报/.test(text)) return ['背景说明', '核心议题', '讨论要点', '决议事项', '后续行动'];
  if (/风险|安全/.test(text)) return ['风险识别', '影响评估', '应对措施', '监控机制', '应急预案'];
  if (/战略|规划/.test(text)) return ['现状分析', '目标愿景', '战略路径', '关键举措', '资源配置'];
  return ['背景概述', '核心内容', '实施路径', '关键指标', '风险管控'];
}

function generateSubItems(parent: string, count: number): string[] {
  const templates: Record<string, string[]> = {
    '背景': ['行业现状', '政策环境', '竞品分析', '用户画像'],
    '目标': ['短期目标', '中期目标', '长期目标', '量化指标'],
    '计划': ['需求阶段', '开发阶段', '测试阶段', '上线阶段'],
    '风险': ['技术风险', '市场风险', '人员风险', '合规风险'],
    '分工': ['前端团队', '后端团队', '测试团队', '运维团队'],
    '需求分析': ['用户调研', '需求文档', '需求评审', '优先级排布'],
    '方案设计': ['架构设计', '接口设计', '数据库设计', '技术选型'],
    '开发实施': ['编码开发', '代码审查', '持续集成', '版本管理'],
    '测试验收': ['单元测试', '集成测试', '性能测试', '用户验收'],
    '部署上线': ['环境准备', '灰度发布', '监控告警', '全量上线'],
    '市场调研': ['竞品分析', '用户需求', '市场规模', '趋势研判'],
    '策略制定': ['定位策略', '价格策略', '渠道策略', '推广策略'],
    '核心概念': ['定义说明', '关键要素', '基本原理', '常见误区'],
    '现状分析': ['优势分析', '劣势分析', '机会识别', '威胁评估'],
  };
  for (const [key, items] of Object.entries(templates)) {
    if (parent.includes(key)) return items.slice(0, count);
  }
  return [`${parent}-子项1`, `${parent}-子项2`, `${parent}-子项3`].slice(0, count);
}

// ---- 修改指令处理 ----
function mockModifyResponse(userText: string): ChatMessage {
  // 检测指令类型
  let actionType = '修改';
  if (/切换布局/.test(userText)) actionType = '布局切换';
  else if (/换风格|换颜色|换主题/.test(userText)) actionType = '风格变更';
  else if (/加图标|加标签|加进度|加备注/.test(userText)) actionType = '属性更新';
  else if (/增加|添加|新增|加上/.test(userText)) actionType = '节点新增';
  else if (/删除|移除|去掉/.test(userText)) actionType = '节点删除';

  return {
    role: 'ai',
    text: `🔧 已处理${actionType}指令：\n"${userText.substring(0, 50)}${userText.length > 50 ? '...' : ''}"\n\n当前为模拟模式，接入 AI API 后将基于完整提示词体系精确执行修改操作。`,
    outline: [],
    outlineExpanded: false,
    actionText: '应用修改',
    rawData: { type: 'modify', actionType, instruction: userText },
  };
}

// ---- 应用生成 ----
function applyGenerate(msg: ChatMessage) {
  if (!msg.rawData) return;

  // 修改指令
  if (msg.rawData.type === 'modify') {
    emit('modify-mindmap', msg.rawData.instruction);
    return;
  }

  // 生成指令：优先使用 rawAiOutput 通过 converter 转换
  if (msg.rawAiOutput) {
    try {
      const converted = aiOutputToInnerLines(msg.rawAiOutput);
      emit('generate-mindmap', {
        lines: converted.lines.map(l => ({
          text: l.text,
          depth: l.depth,
          metadata: l.metadata,
        })),
        layoutType: converted.layoutType,
        style: converted.style,
        centerTopic: converted.centerTopic,
        rawAiOutput: msg.rawAiOutput,
      });
      return;
    } catch (err) {
      console.error('[AiConsole] Converter error:', err);
    }
  }

  // 兜底：使用旧格式
  const { outline, layoutType, style } = msg.rawData;
  const lines = (outline || []).map((item: OutlineItem) => ({
    text: item.text,
    depth: item.depth,
  }));
  emit('generate-mindmap', {
    lines,
    layoutType: layoutType || graphicTypeToLayout(selectedGraphicType.value.id),
    style: style || selectedStyle.value,
    centerTopic: outline?.[0]?.text ?? '中心主题',
  });
}

function retryMessage(msg: ChatMessage) {
  // 从聊天记录中找到该 AI 消息对应的用户消息并重新发送
  const msgIdx = chatHistory.value.indexOf(msg);
  const userMsg = msgIdx > 0 ? chatHistory.value[msgIdx - 1] : null;
  if (userMsg && userMsg.role === 'user') {
    // 移除旧的 AI 回复，重新生成
    chatHistory.value.splice(msgIdx, 1);
    inputText.value = userMsg.text;
    sendMessage();
  }
}

function onWindowFocus() {
  windowClass.value = 'ai-focused';
  setTimeout(() => { windowClass.value = ''; }, 200);
}

function scrollToBottom() {
  nextTick(() => {
    if (chatRef.value) {
      chatRef.value.scrollTop = chatRef.value.scrollHeight;
    }
  });
}

// ---- 快捷键 ----
function onGlobalKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
    e.preventDefault();
    minimized.value = !minimized.value;
    if (!minimized.value) {
      nextTick(() => inputRef.value?.focus());
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', onGlobalKey);
  // 初始在右下角
  winX.value = window.innerWidth - 420;
  winY.value = window.innerHeight - 560;
});

onUnmounted(() => {
  document.removeEventListener('keydown', onGlobalKey);
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
});

// 暴露控制方法
defineExpose({ open: () => { minimized.value = false; nextTick(() => inputRef.value?.focus()); }, minimized });
</script>

<style scoped>
.ai-console {
  position: fixed;
  z-index: 1000;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-size: 13px;
  transition: box-shadow 0.2s;
  border: 1px solid #e8e8e8;
}
.ai-console.ai-focused { box-shadow: 0 12px 40px rgba(22,119,255,0.25); }
.ai-console.compact { font-size: 12px; }

/* 标题栏 */
.ai-console-header {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  background: linear-gradient(135deg, #1677ff, #597ef7);
  color: #fff;
  cursor: move;
  user-select: none;
  gap: 6px;
  flex-shrink: 0;
}
.ai-header-icon { font-size: 16px; }
.ai-header-title { font-weight: 700; font-size: 14px; }
.ai-header-subtitle { font-size: 10px; opacity: 0.8; margin-left: 4px; }
.ai-coop-indicator { font-size: 10px; background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 10px; }
.ai-status { font-size: 10px; margin-left: auto; padding: 2px 8px; border-radius: 10px; background: rgba(255,255,255,0.2); }
.ai-status.loading { background: rgba(250,173,20,0.3); animation: pulse 1.5s infinite; }
.ai-status.error { background: rgba(255,77,79,0.3); }
.ai-header-actions { display: flex; gap: 2px; margin-left: 8px; }
.ai-header-actions button {
  width: 22px; height: 22px; border: none; background: rgba(255,255,255,0.15);
  color: #fff; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;
}
.ai-header-actions button:hover { background: rgba(255,255,255,0.3); }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }

/* 配置区 */
.ai-console-config {
  padding: 8px 10px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  flex-shrink: 0;
}
.ai-config-row { display: flex; gap: 6px; margin-bottom: 6px; }
.ai-config-field { position: relative; }
.ai-type-btn {
  padding: 4px 10px; border: 1px solid #d9d9d9; border-radius: 6px;
  background: #fff; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px;
}
.ai-type-btn:hover { border-color: #1677ff; }
.ai-chevron { font-size: 8px; color: #999; }
.ai-style-select {
  padding: 4px 8px; border: 1px solid #d9d9d9; border-radius: 6px;
  font-size: 12px; background: #fff; cursor: pointer;
}

/* 类型下拉 */
.ai-type-dropdown {
  position: absolute; top: 100%; left: 0; margin-top: 4px;
  background: #fff; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  width: 260px; max-height: 360px; overflow-y: auto; z-index: 10; padding: 4px 0;
}
.ai-type-search { width: calc(100% - 16px); margin: 4px 8px; padding: 4px 8px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 12px; outline: none; box-sizing: border-box; }
.ai-type-search:focus { border-color: #1677ff; }
.ai-type-cat { padding: 6px 12px 2px; font-size: 11px; font-weight: 600; color: #999; }
.ai-type-item {
  display: flex; align-items: center; gap: 6px;
  width: 100%; text-align: left; padding: 6px 12px; border: none; background: transparent;
  font-size: 12px; cursor: pointer;
}
.ai-type-item:hover { background: #f0f5ff; }
.ai-type-item.active { background: #e6f4ff; color: #1677ff; }
.ai-recommend { font-size: 9px; color: #1677ff; background: #e6f4ff; padding: 0 4px; border-radius: 3px; margin-left: auto; }

/* 导图参数 */
.ai-mindmap-params { margin-top: 4px; }
.ai-param-row { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; }
.ai-param-label { font-size: 10px; color: #666; min-width: 56px; }
.ai-level-btn {
  padding: 1px 8px; border: 1px solid #d9d9d9; border-radius: 4px;
  font-size: 10px; cursor: pointer; background: #fff; color: #666;
}
.ai-level-btn:hover { border-color: #1677ff; color: #1677ff; }
.ai-level-btn.active { background: #1677ff; color: #fff; border-color: #1677ff; }
.ai-param-check { margin-top: 6px; }
.ai-param-check label { font-size: 11px; color: #666; cursor: pointer; display: flex; align-items: center; gap: 4px; }

/* 对话区域 */
.ai-console-chat { flex: 1; overflow-y: auto; padding: 8px 10px; display: flex; flex-direction: column; gap: 8px; }
.ai-chat-item { display: flex; gap: 6px; align-items: flex-start; }
.ai-chat-item.user { flex-direction: row-reverse; }
.ai-chat-role { font-size: 18px; line-height: 1; flex-shrink: 0; }
.ai-chat-bubble {
  max-width: 85%; padding: 8px 12px; border-radius: 10px;
  font-size: 12px; line-height: 1.5;
}
.ai-chat-item.user .ai-chat-bubble { background: #e6f4ff; border-top-right-radius: 4px; }
.ai-chat-item.ai .ai-chat-bubble { background: #f5f5f5; border-top-left-radius: 4px; }
.ai-chat-text { white-space: pre-line; }

/* 大纲预览 */
.ai-chat-outline { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #e0e0e0; }
.ai-outline-header { font-size: 11px; color: #1677ff; cursor: pointer; font-weight: 600; }
.ai-outline-tree { margin-top: 4px; background: #fafafa; border-radius: 6px; padding: 6px; }
.ai-outline-item { font-size: 11px; line-height: 1.6; color: #333; display: flex; align-items: center; gap: 4px; }
.ai-outline-icon { color: #999; margin-right: 2px; flex-shrink: 0; }
.ai-outline-emoji { font-size: 12px; flex-shrink: 0; }
.ai-outline-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-outline-prio {
  font-size: 8px; font-weight: 700; padding: 0 4px; border-radius: 3px;
  flex-shrink: 0; line-height: 1.4;
}
.ai-outline-prio.p0 { background: #fff2f0; color: #ff4d4f; }
.ai-outline-prio.p1 { background: #fff7e6; color: #fa8c16; }

/* 操作按钮 */
.ai-chat-actions { display: flex; gap: 6px; margin-top: 8px; }
.ai-action-btn {
  padding: 3px 10px; border: 1px solid #1677ff; border-radius: 14px;
  font-size: 11px; cursor: pointer; background: #1677ff; color: #fff;
}
.ai-action-btn:hover { background: #4096ff; }
.ai-action-btn.secondary { background: #fff; color: #1677ff; }
.ai-action-btn.secondary:hover { background: #f0f5ff; }

/* 加载动画 */
.ai-loading { display: flex; gap: 4px; }
.ai-dot { font-size: 10px; color: #1677ff; animation: bounce 0.6s infinite alternate; }
@keyframes bounce { from { opacity: 0.2; transform: translateY(2px); } to { opacity: 1; transform: translateY(-2px); } }

/* 输入区 */
.ai-console-input { border-top: 1px solid #f0f0f0; padding: 8px 10px; flex-shrink: 0; }
.ai-input-area {
  width: 100%; border: 1px solid #e0e0e0; border-radius: 8px;
  padding: 6px 10px; font-size: 12px; outline: none; resize: none;
  box-sizing: border-box; font-family: inherit; line-height: 1.5;
}
.ai-input-area:focus { border-color: #1677ff; }
.ai-input-row { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.ai-char-count { font-size: 10px; color: #999; }
.ai-send-btn {
  width: 32px; height: 32px; border: none; border-radius: 50%;
  background: #1677ff; color: #fff; font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.ai-send-btn:hover:not(:disabled) { background: #4096ff; }
.ai-send-btn:disabled { background: #d9d9d9; cursor: not-allowed; }

/* 底部提示 */
.ai-console-footer { padding: 4px 10px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #f0f0f0; }

/* 缩放手柄 */
.ai-resize-handle { position: absolute; bottom: 0; right: 0; width: 14px; height: 14px; cursor: nwse-resize; padding: 2px; }
.ai-resize-handle:hover { background: rgba(22,119,255,0.1); }

/* 气泡 */
.ai-bubble {
  position: fixed; bottom: 24px; right: 24px; z-index: 1001;
  width: 48px; height: 48px; border-radius: 50%;
  background: linear-gradient(135deg, #1677ff, #9254de);
  color: #fff; font-size: 24px; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(22,119,255,0.3); cursor: pointer;
  transition: all 0.3s;
}
.ai-bubble:hover { transform: scale(1.1); }
.ai-bubble.loading { animation: bubblePulse 1.5s infinite; }
.ai-bubble-text { position: absolute; top: -22px; right: 0; font-size: 10px; background: #333; color: #fff; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
@keyframes bubblePulse { 0%,100%{box-shadow:0 4px 16px rgba(22,119,255,0.3)} 50%{box-shadow:0 4px 32px rgba(146,84,222,0.6)} }
</style>
