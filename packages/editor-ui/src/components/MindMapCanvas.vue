<template>
  <div
    class="mm-canvas-wrap"
    ref="wrapRef"
    @wheel.prevent="onWheel"
    @mousedown="onCanvasMouseDown"
    @mousemove="onCanvasMouseMove"
    @mouseup="onCanvasMouseUp"
    @mouseleave="onCanvasMouseUp"
    tabindex="0"
    @keydown="onKeydown"
  >
    <svg ref="svgRef" class="mm-svg" :style="{ cursor: dragMode ? dragCursor : 'grab' }">
      <g :transform="`translate(${panX},${panY}) scale(${scale})`">
        <!-- 连线 -->
        <path
          v-for="edge in visibleEdges"
          :key="edge.key"
          :d="edge.path"
          :stroke="edge.key === editingEdgeKey ? '#1677ff' : edge.color"
          :stroke-width="(edge.key === editingEdgeKey ? 3 : edge.strokeWidth ?? 2)"
          :stroke-dasharray="edge.key === editingEdgeKey ? 'none' : edge.dashArray"
          fill="none"
          stroke-linecap="round"
          class="edge-path"
          :class="{ 'edge-selected': edge.key === editingEdgeKey }"
          :marker-end="edge.arrow ? `url(#arrow-${edge.key})` : undefined"
        />
        <!-- 连线点击热区（透明宽线，便于点击选中连线） -->
        <path
          v-for="edge in visibleEdges"
          :key="'hit-' + edge.key"
          :d="edge.path"
          stroke="transparent"
          stroke-width="16"
          fill="none"
          class="edge-hit-path"
          @click.stop="onEdgeClick(edge)"
          @dblclick.stop="onEdgeDblClick(edge)"
          @contextmenu.prevent.stop="onEdgeContextMenu($event, edge)"
        />
        <!-- 连线箭头定义 -->
        <defs>
          <marker
            v-for="edge in visibleEdges.filter(e => e.arrow)"
            :key="'arrow-def-' + edge.key"
            :id="'arrow-' + edge.key"
            viewBox="0 0 10 10"
            refX="9" refY="5"
            markerWidth="6" markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" :fill="edge.color" />
          </marker>
        </defs>

        <!-- 连线标签 -->
        <text
          v-for="edge in visibleEdges.filter(e => e.label)"
          :key="'label-' + edge.key"
          :x="edge.labelX"
          :y="edge.labelY"
          text-anchor="middle"
          dominant-baseline="central"
          font-size="11"
          :fill="edge.color"
          style="pointer-events:none"
        >{{ edge.label }}</text>

        <!-- 连线编辑手柄（选中连线时显示） -->
        <g v-if="editingEdgeData" style="pointer-events:auto">
          <!-- 起点手柄 -->
          <circle
            :cx="editingEdgeData.startX" :cy="editingEdgeData.startY"
            r="9" fill="transparent"
            class="edge-handle-hit"
          />
          <circle
            :cx="editingEdgeData.startX" :cy="editingEdgeData.startY"
            r="5" fill="#1677ff" stroke="#fff" stroke-width="2"
            class="edge-handle-dot"
            @mousedown.stop="onEdgeStartHandleDrag($event)"
          />
          <!-- 终点手柄 -->
          <circle
            :cx="editingEdgeData.endX" :cy="editingEdgeData.endY"
            r="9" fill="transparent"
            class="edge-handle-hit"
          />
          <circle
            :cx="editingEdgeData.endX" :cy="editingEdgeData.endY"
            r="5" fill="#1677ff" stroke="#fff" stroke-width="2"
            class="edge-handle-dot"
            @mousedown.stop="onEdgeEndHandleDrag($event)"
          />
        </g>

        <!-- 节点 -->
        <g
          v-for="node in visibleLayoutNodes"
          :key="node.lineId"
          :transform="`translate(${node.x},${node.y})`"
          class="mm-node-group"
          :class="{
            'node-selected': node.lineId === selectedId,
            'node-multi-selected': selectedIds.includes(node.lineId) && node.lineId !== selectedId,
            'node-dragging': draggingNodeId === node.lineId,
            'node-new': node.lineId === newlyAddedId,
          }"
          @mousedown.stop="onNodeMouseDown($event, node)"
          @dblclick.stop="onNodeDblClick(node)"
          @contextmenu.prevent.stop="onNodeContextMenu($event, node)"
          @mouseenter="onNodeMouseEnter(node)"
          @mouseleave="onNodeMouseLeave"
        >
          <!-- 节点背景（支持 shapeType 条件渲染） -->
          <g
            :transform="`scale(${nodeShapeScaleX(node)},${nodeShapeScaleY(node)})`"
            :fill="nodeFill(node)"
            :stroke="node.lineId === selectedId ? '#1677ff' : (selectedIds.includes(node.lineId) ? '#91caff' : nodeBorder(node))"
            :stroke-width="(node.lineId === selectedId ? 2.5 : (selectedIds.includes(node.lineId) ? 1.5 : 0.5)) / nodeShapeScaleX(node)"
            :filter="draggingNodeId === node.lineId ? 'url(#drag-shadow)' : undefined"
            style="transition: stroke 0.2s, fill 0.2s; transform-origin: top left"
          >
            <!-- 自定义顶点路径 -->
            <path v-if="node.metadata?.customPath" :d="node.metadata.customPath" />
            <!-- 菱形 -->
            <polygon
              v-else-if="node.metadata?.shapeType === 'diamond' || node.metadata?.shapeType === 'flow-decision'"
              :points="`${node.width/2},0 ${node.width},${node.height/2} ${node.width/2},${node.height} 0,${node.height/2}`"
            />
            <!-- 椭圆/圆形 -->
            <ellipse
              v-else-if="node.metadata?.shapeType === 'ellipse' || node.metadata?.shapeType === 'circle' || node.metadata?.shapeType === 'flow-connector'"
              :cx="node.width/2" :cy="node.height/2" :rx="node.width/2" :ry="node.height/2"
            />
            <!-- 起止框 -->
            <rect
              v-else-if="node.metadata?.shapeType === 'flow-terminator' || node.metadata?.shapeType === 'flow-terminator-end'"
              :x="0" :y="0" :width="node.width" :height="node.height"
              :rx="node.height/2" :ry="node.height/2"
            />
            <!-- 平行四边形 -->
            <polygon
              v-else-if="node.metadata?.shapeType === 'parallelogram' || node.metadata?.shapeType === 'flow-data'"
              :points="`${node.width*0.15},0 ${node.width},0 ${node.width*0.85},${node.height} 0,${node.height}`"
            />
            <!-- 六边形 -->
            <polygon
              v-else-if="node.metadata?.shapeType === 'hexagon'"
              :points="`${node.width*0.15},0 ${node.width*0.85},0 ${node.width},${node.height/2} ${node.width*0.85},${node.height} ${node.width*0.15},${node.height} 0,${node.height/2}`"
            />
            <!-- 三角形 -->
            <polygon
              v-else-if="node.metadata?.shapeType === 'triangle' || node.metadata?.shapeType === 'isosceles-triangle'"
              :points="`${node.width/2},0 ${node.width},${node.height} 0,${node.height}`"
            />
            <!-- 圆角矩形或默认矩形 -->
            <rect v-else :x="0" :y="0" :width="node.width" :height="node.height"
              :rx="node.metadata?.shapeType === 'rounded-rect' ? 10 : 6" :ry="node.metadata?.shapeType === 'rounded-rect' ? 10 : 6"
            />
          </g>

          <!-- 顶部装饰栏：AI标记 + 进度条 -->
          <g style="pointer-events:none; user-select:none">
            <!-- AI 生成徽章 -->
            <g v-if="node.metadata?.isAiGenerated" :transform="`translate(${effectiveNodeWidth(node) - 28}, 3)`">
              <rect x="0" y="0" width="22" height="14" rx="3" fill="#e6f4ff" stroke="#91caff" stroke-width="0.5"/>
              <text x="11" y="10" text-anchor="middle" font-size="9" fill="#1677ff">AI</text>
            </g>
            <!-- 优先度进度指示（水平进度条） -->
            <g v-if="node.metadata?.priority && node.metadata.priority > 0"
              :transform="`translate(${node.metadata?.isAiGenerated ? effectiveNodeWidth(node) - 54 : effectiveNodeWidth(node) - 24}, 5)`">
              <rect x="0" y="0" width="18" height="8" rx="4" fill="#f0f0f0" stroke="#e8e8e8" stroke-width="0.5"/>
              <rect x="1" y="1" :width="node.metadata.priority * 4" height="6" rx="3"
                :fill="priorityColor(node.metadata.priority)" opacity="0.85"/>
            </g>
          </g>

          <!-- 图标/emoji（节点左侧） -->
          <text
            v-if="node.depth === 0"
            x="8" y="18"
            font-size="16"
            style="pointer-events:none; user-select:none"
            dominant-baseline="central"
          >🧠</text>

          <!-- 标题文本 -->
          <text
            :x="effectiveNodeWidth(node) / 2"
            :y="textYOffset(node)"
            text-anchor="middle"
            dominant-baseline="central"
            :font-size="node.metadata?.style?.fontSize ?? depthTextSize(node)"
            :font-weight="node.metadata?.style?.fontWeight ?? (node.depth === 0 ? 'bold' : 'normal')"
            :fill="node.metadata?.style?.color ?? (node.metadata?.priority ? priorityColor(node.metadata.priority) : '#333')"
            style="pointer-events:none; user-select:none"
          >{{ node.text }}</text>

          <!-- Tags 标签（支持多行布局） -->
          <g v-if="node.metadata?.tags?.length" :transform="`translate(3, ${tagRowY(node, 0)})`">
            <template v-for="(tag, ti) in node.metadata.tags.slice(0, 8)" :key="'tag-' + ti">
              <!-- 换行判断：每行最多4个 -->
              <g v-if="ti > 0 && ti % 4 === 0" :transform="`translate(${-3}, ${tagRowHeight(node, Math.floor(ti / 4))})`">
                <!-- 空组用于布局重置 -->
              </g>
              <rect
                :x="tagX(node, ti % 4)"
                y="1"
                :width="tagWidth(node, tag)"
                height="13"
                rx="6" ry="6"
                :fill="tagBgColor(ti)"
                stroke="transparent"
                opacity="0.85"
              />
              <text
                :x="tagX(node, ti % 4) + tagWidth(node, tag) / 2"
                y="10"
                text-anchor="middle"
                font-size="8"
                :fill="tagFgColor(ti)"
                style="pointer-events:none"
              >{{ tag.length > 6 ? tag.slice(0,6)+'…' : tag }}</text>
            </template>
            <!-- 更多 tags 提示 -->
            <text
              v-if="node.metadata.tags.length > 8"
              :x="effectiveNodeWidth(node) / 2 - 3"
              :y="tagRowHeight(node, 2) + 6"
              text-anchor="middle"
              font-size="8"
              fill="#bfbfbf"
              style="pointer-events:none"
            >+{{ node.metadata.tags.length - 8 }}</text>
          </g>

          <!-- 内联编辑框（迷你富文本编辑器） -->
          <foreignObject
            v-if="editingNodeId === node.lineId"
            :x="1" :y="1"
            :width="effectiveNodeWidth(node) - 2"
            :height="effectiveNodeHeight(node) - 2"
          >
            <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;">
              <textarea
                ref="inlineInputRef"
                :value="editingText"
                @input="editingText = ($event.target as HTMLTextAreaElement).value"
                @keydown.enter.exact="commitEdit"
                @keydown.escape="cancelEdit"
                @keydown="(e: KeyboardEvent) => e.stopPropagation()"
                style="
                  width: calc(100% - 12px);
                  height: calc(100% - 12px);
                  margin: 4px;
                  border: 1.5px solid #1677ff;
                  border-radius: 4px;
                  padding: 6px 8px;
                  font-size: 13px;
                  line-height: 1.5;
                  outline: none;
                  resize: none;
                  box-sizing: border-box;
                  font-family: inherit;
                  background: rgba(255,255,255,0.95);
                  box-shadow: 0 0 0 3px rgba(22,119,255,0.12);
                "
              />
            </div>
          </foreignObject>

          <!-- 备注/附件指示点 -->
          <circle
            v-if="node.metadata?.inlineShapes?.length"
            :cx="effectiveNodeWidth(node) - 5"
            :cy="effectiveNodeHeight(node) - 5"
            r="3.5"
            fill="#faad14"
            stroke="#fff"
            stroke-width="0.5"
            style="pointer-events:none"
          />

          <!-- 折叠/展开切换 -->
          <g
            v-if="node.childrenLineIds?.length"
            class="fold-toggle"
            :transform="`translate(${effectiveNodeWidth(node) + 4},${effectiveNodeHeight(node) / 2 - 7})`"
            @mousedown.stop="$emit('toggle-fold', node.lineId)"
            style="cursor:pointer; transition: opacity 0.3s"
          >
            <circle r="8" :fill="node.collapsed ? '#faad14' : '#52c41a'" />
            <text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#fff">
              {{ node.collapsed ? '+' : '−' }}
            </text>
          </g>

          <!-- 添加子节点按钮（仅选中节点显示） -->
          <g
            v-if="node.lineId === selectedId"
            class="add-child-btn"
            :transform="`translate(${effectiveNodeWidth(node) + 24},${effectiveNodeHeight(node) / 2 - 7})`"
            @mousedown.stop="$emit('add-child', node.lineId)"
            style="cursor:pointer"
          >
            <circle r="8" fill="#1677ff" />
            <text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="bold" fill="#fff">+</text>
          </g>

          <!-- 连接点（hover/选中时显示 8 个锚点） -->
          <g
            v-if="hoveredNodeId === node.lineId || selectedId === node.lineId"
            class="anchor-points"
          >
            <g
              v-for="(ap, ai) in getAnchorPoints(node)"
              :key="'ap-' + ai"
              :transform="`translate(${ap.x},${ap.y})`"
              class="anchor-point-group"
              @mousedown.stop="onAnchorMouseDown($event, node, ai)"
              @mouseenter="onAnchorMouseEnter($event, node, ai)"
              @mouseleave="onAnchorMouseLeave($event)"
              @mouseup.stop="onAnchorMouseUp($event, node, ai)"
            >
              <!-- 8px 透明热区 -->
              <circle r="9" fill="transparent" class="anchor-hit" />
              <!-- 可见锚点圆 -->
              <circle r="4" fill="#fff" stroke="#1677ff" stroke-width="1.5" class="anchor-dot" />
              <!-- hover 高亮 -->
              <circle r="4" fill="#1677ff" stroke="#1677ff" stroke-width="1.5" class="anchor-hover" />
            </g>
          </g>

          <!-- 节点八点 resize 句柄（选中时显示） -->
          <g v-if="node.lineId === selectedId" class="resize-handles">
            <g
              v-for="(rh, ri) in getResizeHandles(node)"
              :key="'rh-' + ri"
              :transform="`translate(${rh.x},${rh.y})`"
              :class="'resize-handle-' + rh.cursor"
              @mousedown.stop="onResizeHandleMouseDown($event, node, ri)"
            >
              <rect x="-4" y="-4" width="8" height="8" fill="#fff" stroke="#1677ff" stroke-width="1.5" rx="1" />
            </g>
          </g>

          <!-- 像素级光标映射层（透明热区，控制不同区域光标） -->
          <rect
            class="cursor-zone-text"
            :x="4" :y="2"
            :width="Math.max(4, effectiveNodeWidth(node) - 8)"
            :height="Math.max(4, effectiveNodeHeight(node) - 4)"
            fill="transparent"
          />
          <!-- 上边缘 → ns-resize -->
          <rect class="cursor-zone-n" :x="4" :y="0" :width="Math.max(4, effectiveNodeWidth(node) - 8)" height="4" fill="transparent" />
          <!-- 下边缘 → ns-resize -->
          <rect class="cursor-zone-s" :x="4" :y="effectiveNodeHeight(node) - 4" :width="Math.max(4, effectiveNodeWidth(node) - 8)" height="4" fill="transparent" />
          <!-- 右边缘 → ew-resize -->
          <rect class="cursor-zone-e" :x="effectiveNodeWidth(node) - 4" :y="4" width="4" :height="Math.max(4, effectiveNodeHeight(node) - 8)" fill="transparent" />
          <!-- 左边缘 → ew-resize -->
          <rect class="cursor-zone-w" :x="0" :y="4" width="4" :height="Math.max(4, effectiveNodeHeight(node) - 8)" fill="transparent" />
          <!-- 左上角 → nwse-resize -->
          <rect class="cursor-zone-nw" :x="0" :y="0" width="6" height="6" fill="transparent" />
          <!-- 右上角 → nesw-resize -->
          <rect class="cursor-zone-ne" :x="effectiveNodeWidth(node) - 6" :y="0" width="6" height="6" fill="transparent" />
          <!-- 左下角 → nesw-resize -->
          <rect class="cursor-zone-sw" :x="0" :y="effectiveNodeHeight(node) - 6" width="6" height="6" fill="transparent" />
          <!-- 右下角 → nwse-resize -->
          <rect class="cursor-zone-se" :x="effectiveNodeWidth(node) - 6" :y="effectiveNodeHeight(node) - 6" width="6" height="6" fill="transparent" />
        </g>

        <!-- 临时连线（拖拽连接锚点时显示） -->
        <line
          v-if="tempConnectionLine"
          :x1="tempConnectionLine.x1" :y1="tempConnectionLine.y1"
          :x2="tempConnectionLine.x2" :y2="tempConnectionLine.y2"
          stroke="#1677ff"
          stroke-width="2"
          stroke-dasharray="6 4"
          style="pointer-events:none"
        />
        <!-- 对齐引导线（拖拽节点时显示） -->
        <line
          v-for="(gl, gi) in guideLines"
          :key="'gl-' + gi"
          :x1="gl.type === 'v' ? gl.pos : gl.start"
          :y1="gl.type === 'h' ? gl.pos : gl.start"
          :x2="gl.type === 'v' ? gl.pos : gl.end"
          :y2="gl.type === 'h' ? gl.pos : gl.end"
          stroke="#ff4d4f"
          stroke-width="1"
          stroke-dasharray="3 3"
          style="pointer-events:none"
        />
        <!-- 框选矩形 -->
        <rect
          v-if="selectingBox.visible"
          :x="selectingBox.x"
          :y="selectingBox.y"
          :width="selectingBox.w"
          :height="selectingBox.h"
          fill="rgba(22,119,255,0.1)"
          stroke="#1677ff"
          stroke-width="1"
          stroke-dasharray="4 2"
          style="pointer-events:none"
        />

        <!-- 拖拽阴影滤镜 -->
        <defs>
          <filter id="drag-shadow">
            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.2"/>
          </filter>
        </defs>
      </g>
    </svg>

    <!-- 迷你地图 -->
    <div class="mm-minimap" :class="{ 'mm-minimap-hidden': !minimapVisible }">
      <svg :width="160" :height="120" class="minimap-svg" v-if="minimapVisible">
        <rect width="160" height="120" fill="rgba(255,255,255,0.85)" rx="4" />
        <g v-if="minimapNodes.length > 0">
          <rect
            v-for="mn in minimapNodes"
            :key="mn.id"
            :x="mn.x"
            :y="mn.y"
            :width="mn.w"
            :height="mn.h"
            :fill="mn.id === selectedId ? '#1677ff' : '#ccc'"
            rx="2"
          />
          <!-- 视口框 -->
          <rect
            :x="viewportRect.x"
            :y="viewportRect.y"
            :width="viewportRect.w"
            :height="viewportRect.h"
            fill="none"
            stroke="#1677ff"
            stroke-width="1.5"
            rx="2"
          />
        </g>
      </svg>
    </div>

    <!-- 缩放控制 -->
    <div class="mm-zoom-ctrl">
      <button @click="zoomIn" title="放大 (Ctrl+=)">+</button>
      <span>{{ Math.round(scale * 100) }}%</span>
      <button @click="zoomOut" title="缩小 (Ctrl+-)">−</button>
      <button @click="fitView" title="适应窗口">⊡</button>
      <button @click="minimapVisible = !minimapVisible" :title="minimapVisible ? '隐藏迷你地图' : '显示迷你地图'" style="font-size:12px">
        {{ minimapVisible ? '🗺' : '🗺' }}
      </button>
    </div>

    <!-- 连线右键菜单 -->
    <div
      v-if="edgeContextMenu.visible"
      class="edge-context-menu"
      :style="{ left: edgeContextMenu.x + 'px', top: edgeContextMenu.y + 'px' }"
      @click.stop
      @mouseleave="closeEdgeContextMenu"
    >
      <div class="ecm-item" @click="handleEdgeDelete">🗑 删除连线</div>
      <div class="ecm-sep" />
      <div class="ecm-label">连接线型</div>
      <div class="ecm-item" :class="{ active: edgeContextMenu.pathType === 'curved' }" @click="handleEdgePathType('curved')">╰ 曲线</div>
      <div class="ecm-item" :class="{ active: edgeContextMenu.pathType === 'elbow' }" @click="handleEdgePathType('elbow')">└ 折线</div>
      <div class="ecm-item" :class="{ active: edgeContextMenu.pathType === 'straight' }" @click="handleEdgePathType('straight')">╌ 直线</div>
      <div class="ecm-sep" />
      <div class="ecm-label">外观</div>
      <div class="ecm-item" :class="{ active: edgeContextMenu.style === 'solid' }" @click="handleEdgeStyle('solid')">─ 实线</div>
      <div class="ecm-item" :class="{ active: edgeContextMenu.style === 'dashed' }" @click="handleEdgeStyle('dashed')">┅ 虚线</div>
      <div class="ecm-item" :class="{ active: edgeContextMenu.style === 'dotted' }" @click="handleEdgeStyle('dotted')">⋯ 点线</div>
      <div class="ecm-sep" />
      <div class="ecm-label">颜色</div>
      <div class="ecm-colors">
        <span v-for="c in DEPTH_COLORS" :key="c" class="ecm-color-swatch"
          :style="{ background: c }"
          :class="{ active: edgeContextMenu.color === c }"
          @click="handleEdgeColor(c)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { calculateLayout, getBounds, computeSmartElbowPath } from '@mindflow/editor-core';
import type { LayoutNode } from '@mindflow/editor-core';
import type { InnerLine, MindLayoutType } from '@mindflow/shared';

const props = defineProps<{
  lines: InnerLine[];
  selectedId: string | null;
  layoutType: MindLayoutType;
}>();

const emit = defineEmits<{
  select: [lineId: string];
  edit: [lineId: string, text: string];
  'add-child': [parentId: string];
  'toggle-fold': [lineId: string];
  contextmenu: [payload: { lineId: string; x: number; y: number }];
  'update-selected-ids': [ids: string[]];
  'move-node': [lineId: string, newParentId: string | null, newDepth: number];
  'connect-nodes': [payload: { fromLineId: string; fromAnchorIdx: number; toLineId: string; toAnchorIdx: number }];
  'reconnect-edge': [payload: { edgeKey: string; newFromLineId?: string; newFromAnchorIdx?: number; newToLineId?: string; newToAnchorIdx?: number }];
  'delete-edge': [edgeKey: string];
  'update-edge-style': [payload: { edgeKey: string; dashArray?: string; color?: string; pathType?: string }];
  'resize-node': [payload: { lineId: string; width: number; height: number }];
}>();

// ---- 视口 ----
const wrapRef = ref<HTMLElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const inlineInputRef = ref<HTMLTextAreaElement | null>(null);
const scale = ref(1);
const panX = ref(0);
const panY = ref(0);

// ---- 视口裁剪 ----
const VIEWPORT_PADDING = 400; // 视口外扩展区域

/** 获取当前画布可见矩形（画布坐标系） */
function getViewportBounds(): { left: number; right: number; top: number; bottom: number } {
  if (!wrapRef.value) return { left: -9999, right: 9999, top: -9999, bottom: 9999 };
  const cw = wrapRef.value.clientWidth;
  const ch = wrapRef.value.clientHeight;
  const left = -panX.value / scale.value - VIEWPORT_PADDING;
  const top = -panY.value / scale.value - VIEWPORT_PADDING;
  const right = (cw - panX.value) / scale.value + VIEWPORT_PADDING;
  const bottom = (ch - panY.value) / scale.value + VIEWPORT_PADDING;
  return { left, right, top, bottom };
}

/** 判断节点是否在视口内 */
function isNodeVisible(node: LayoutNode): boolean {
  const vb = getViewportBounds();
  return node.x + node.width > vb.left && node.x < vb.right
      && node.y + node.height > vb.top && node.y < vb.bottom;
}

/** 缩小时控制 UI 元素可见性 */
const showDetails = computed(() => scale.value > 0.4);
const showAnchors = computed(() => scale.value > 0.5);

// ---- 鼠标节流（RAF 限制高频 mousemove） ----
let rafPending = false;
let pendingMouseEvent: MouseEvent | null = null;

function scheduleMouseMove(e: MouseEvent) {
  pendingMouseEvent = e;
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (pendingMouseEvent) {
        processMouseMove(pendingMouseEvent);
        pendingMouseEvent = null;
      }
    });
  }
}

// ---- 视口动画 ----
let animTargetScale = 0;
let animTargetPanX = 0;
let animTargetPanY = 0;
let animStartScale = 0;
let animStartPanX = 0;
let animStartPanY = 0;
let animStartTime = 0;
const ANIM_DURATION = 300;
let animRafId: number | null = null;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animateToViewport(targetScale: number, targetX: number, targetY: number) {
  cancelAnimation();
  animStartScale = scale.value;
  animStartPanX = panX.value;
  animStartPanY = panY.value;
  animTargetScale = targetScale;
  animTargetPanX = targetX;
  animTargetPanY = targetY;
  animStartTime = performance.now();

  function step(now: number) {
    const elapsed = now - animStartTime;
    const progress = Math.min(elapsed / ANIM_DURATION, 1);
    const t = easeInOutCubic(progress);
    scale.value = animStartScale + (animTargetScale - animStartScale) * t;
    panX.value = animStartPanX + (animTargetPanX - animStartPanX) * t;
    panY.value = animStartPanY + (animTargetPanY - animStartPanY) * t;
    if (progress < 1) {
      animRafId = requestAnimationFrame(step);
    }
  }
  animRafId = requestAnimationFrame(step);
}

function cancelAnimation() {
  if (animRafId !== null) {
    cancelAnimationFrame(animRafId);
    animRafId = null;
  }
}

// ---- 平移 ----
const panning = ref(false);
let panStartX = 0, panStartY = 0, panStartPX = 0, panStartPY = 0;

// ---- 拖拽模式 ----
const dragMode = ref<'none' | 'pan' | 'node' | 'box' | 'connect' | 'resize'>('none');
const dragCursor = computed(() => {
  if (dragMode.value === 'node') return 'grabbing';
  if (dragMode.value === 'box') return 'crosshair';
  return 'grabbing';
});

// ---- 节点拖拽 ----
const draggingNodeId = ref<string | null>(null);
let dragNodeStartX = 0;
let dragNodeStartY = 0;
let dragNodeOrigX = 0;
let dragNodeOrigY = 0;
let dragNodeLayoutNode: LayoutNode | null = null;

// ---- 对齐引导线 ----
const SNAP_THRESHOLD = 6; // 吸附阈值 (px)
const guideLines = ref<{ type: 'h' | 'v'; pos: number; start: number; end: number; snapOffset: number }[]>([]);

/** 计算对齐线：找出当前节点与其他节点的中心/边缘对齐点 */
function computeGuideLines(movedNode: LayoutNode): { lines: typeof guideLines.value; snapX: number; snapY: number } {
  const lines: typeof guideLines.value = [];
  let snapX = 0;
  let snapY = 0;
  const ALIGN_POINTS = ['center', 'left', 'right', 'top', 'bottom'] as const;

  const getPoint = (n: LayoutNode, pt: string): { x: number; y: number } => {
    switch (pt) {
      case 'center': return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
      case 'left':   return { x: n.x, y: n.y + n.height / 2 };
      case 'right':  return { x: n.x + n.width, y: n.y + n.height / 2 };
      case 'top':    return { x: n.x + n.width / 2, y: n.y };
      case 'bottom': return { x: n.x + n.width / 2, y: n.y + n.height };
      default:       return { x: 0, y: 0 };
    }
  };

  for (const other of layoutNodes.value) {
    if (other.lineId === movedNode.lineId) continue;

    for (const ap of ALIGN_POINTS) {
      const movedPt = getPoint(movedNode, ap);
      const otherPt = getPoint(other, ap);

      // 水平对齐线（Y 相同）
      const hDiff = Math.abs(movedPt.y - otherPt.y);
      if (hDiff < SNAP_THRESHOLD && hDiff > 0.01) {
        const minX = Math.min(movedPt.x, otherPt.x);
        const maxX = Math.max(movedPt.x, otherPt.x);
        lines.push({ type: 'h', pos: otherPt.y, start: minX, end: maxX, snapOffset: otherPt.y - movedPt.y });
      }

      // 垂直对齐线（X 相同）
      const vDiff = Math.abs(movedPt.x - otherPt.x);
      if (vDiff < SNAP_THRESHOLD && vDiff > 0.01) {
        const minY = Math.min(movedPt.y, otherPt.y);
        const maxY = Math.max(movedPt.y, otherPt.y);
        lines.push({ type: 'v', pos: otherPt.x, start: minY, end: maxY, snapOffset: otherPt.x - movedPt.x });
      }
    }
  }

  // 计算聚合吸附量（去重后取平均偏移）
  const hSnaps = lines.filter(l => l.type === 'h');
  const vSnaps = lines.filter(l => l.type === 'v');
  if (hSnaps.length > 0) snapY = hSnaps.reduce((s, l) => s + l.snapOffset, 0) / hSnaps.length;
  if (vSnaps.length > 0) snapX = vSnaps.reduce((s, l) => s + l.snapOffset, 0) / vSnaps.length;

  return { lines, snapX, snapY };
}

// ---- 内联编辑 ----
const editingNodeId = ref<string | null>(null);
const editingText = ref('');

// ---- 多选 ----
const selectedIds = ref<string[]>([]);

// ---- 框选 ----
const selectingBox = ref({ visible: false, x: 0, y: 0, w: 0, h: 0 });
let boxStartX = 0, boxStartY = 0;

// ---- 迷你地图 ----
const minimapVisible = ref(true);

// ---- 新节点动画 ----
const newlyAddedId = ref<string | null>(null);

// ---- 连接点系统 ----
const hoveredNodeId = ref<string | null>(null);
const hoveredAnchorIndex = ref<number>(-1);

/** 8 个锚点相对于节点左上角的位置 */
function getAnchorPoints(node: LayoutNode): { x: number; y: number }[] {
  const w = effectiveNodeWidth(node);
  const h = effectiveNodeHeight(node);
  return [
    { x: w * 0.25, y: 0 },           // 0: top-left
    { x: w * 0.5,  y: 0 },           // 1: top-center
    { x: w * 0.75, y: 0 },           // 2: top-right
    { x: w,        y: h * 0.5 },     // 3: right-center
    { x: w * 0.75, y: h },           // 4: bottom-right
    { x: w * 0.5,  y: h },           // 5: bottom-center
    { x: w * 0.25, y: h },           // 6: bottom-left
    { x: 0,        y: h * 0.5 },     // 7: left-center
  ];
}

function onNodeMouseEnter(node: LayoutNode) {
  hoveredNodeId.value = node.lineId;
}

function onNodeMouseLeave() {
  hoveredNodeId.value = null;
  hoveredAnchorIndex.value = -1;
}

function onAnchorMouseEnter(_e: MouseEvent, _node: LayoutNode, ai: number) {
  hoveredAnchorIndex.value = ai;
}

function onAnchorMouseLeave(_e: MouseEvent) {
  hoveredAnchorIndex.value = -1;
}

// ---- 连线创建（从锚点拖拽出新连线） ----
interface ConnectFrom { lineId: string; anchorIndex: number; x: number; y: number; node: LayoutNode }
const connectingFrom = ref<ConnectFrom | null>(null);

const tempConnectionEnd = ref({ x: 0, y: 0 });
const tempConnectionLine = computed(() => {
  if (!connectingFrom.value) return null;
  return {
    x1: connectingFrom.value.x,
    y1: connectingFrom.value.y,
    x2: tempConnectionEnd.value.x,
    y2: tempConnectionEnd.value.y,
  };
});

function onAnchorMouseDown(e: MouseEvent, node: LayoutNode, ai: number) {
  const aps = getAnchorPoints(node);
  const ap = aps[ai];
  connectingFrom.value = {
    lineId: node.lineId,
    anchorIndex: ai,
    x: node.x + ap.x,
    y: node.y + ap.y,
    node,
  };
  // mousemove / mouseup 由 canvas 级别全局处理
  dragMode.value = 'connect';
  e.stopPropagation();
}

function onAnchorMouseUp(e: MouseEvent, targetNode: LayoutNode, targetAi: number) {
  // 锚点上松开 → 完成连线
  if (connectingFrom.value && connectingFrom.value.lineId !== targetNode.lineId) {
    const from = connectingFrom.value;
    const srcAps = getAnchorPoints(from.node);
    const tgtAps = getAnchorPoints(targetNode);
    // 触发射出面事件，由父组件处理新建连线逻辑
    emit('connect-nodes', {
      fromLineId: from.lineId,
      fromAnchorIdx: from.anchorIndex,
      toLineId: targetNode.lineId,
      toAnchorIdx: targetAi,
    });
  }
  connectingFrom.value = null;
  dragMode.value = 'none';
  e.stopPropagation();
}

// ---- 连线编辑（选中连线后编辑） ----
const editingEdgeKey = ref<string | null>(null);
const editingEdgeData = ref<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
const draggingEdgeHandle = ref<'start' | 'end' | null>(null);
let dragEdgeHandleStartX = 0;
let dragEdgeHandleStartY = 0;

function onEdgeClick(edge: EdgeData) {
  if (dragMode.value === 'connect') return;
  if (editingEdgeKey.value === edge.key) {
    // 再次点击同一连线 → 取消选中
    clearEdgeEditing();
  } else {
    editingEdgeKey.value = edge.key;
    editingEdgeData.value = {
      startX: edge.startX,
      startY: edge.startY,
      endX: edge.endX,
      endY: edge.endY,
    };
  }
}

function onEdgeDblClick(edge: EdgeData) {
  // 双击连线 → 触发连线标签编辑（预留）
  console.log('[MindMapCanvas] 双击连线:', edge.key);
}

function onEdgeContextMenu(e: MouseEvent, edge: EdgeData) {
  clearEdgeEditing();
  showEdgeContextMenu(e, edge);
}

function clearEdgeEditing() {
  editingEdgeKey.value = null;
  editingEdgeData.value = null;
  draggingEdgeHandle.value = null;
}

function onEdgeStartHandleDrag(e: MouseEvent) {
  draggingEdgeHandle.value = 'start';
  dragEdgeHandleStartX = e.clientX;
  dragEdgeHandleStartY = e.clientY;
  e.stopPropagation();
}

function onEdgeEndHandleDrag(e: MouseEvent) {
  draggingEdgeHandle.value = 'end';
  dragEdgeHandleStartX = e.clientX;
  dragEdgeHandleStartY = e.clientY;
  e.stopPropagation();
}

// ---- Resize 句柄 ----
interface ResizeHandle { x: number; y: number; cursor: string }
function getResizeHandles(node: LayoutNode): ResizeHandle[] {
  const w = effectiveNodeWidth(node);
  const h = effectiveNodeHeight(node);
  return [
    { x: 0, y: 0, cursor: 'nwse' },           // 左上
    { x: w * 0.5, y: 0, cursor: 'ns' },        // 上中
    { x: w, y: 0, cursor: 'nesw' },            // 右上
    { x: w, y: h * 0.5, cursor: 'ew' },        // 右中
    { x: w, y: h, cursor: 'nwse' },            // 右下
    { x: w * 0.5, y: h, cursor: 'ns' },        // 下中
    { x: 0, y: h, cursor: 'nesw' },            // 左下
    { x: 0, y: h * 0.5, cursor: 'ew' },        // 左中
  ];
}
let resizeHandleIdx = -1;
let resizeStartW = 0;
let resizeStartH = 0;
let resizeStartMouseX = 0;
let resizeStartMouseY = 0;

function onResizeHandleMouseDown(e: MouseEvent, node: LayoutNode, ri: number) {
  resizeHandleIdx = ri;
  resizeStartW = effectiveNodeWidth(node);
  resizeStartH = effectiveNodeHeight(node);
  resizeStartMouseX = e.clientX;
  resizeStartMouseY = e.clientY;
  dragMode.value = 'resize';
  e.stopPropagation();
}

// ---- 连线右键菜单 ----
const edgeContextMenu = ref<{
  visible: boolean;
  x: number;
  y: number;
  edgeKey: string | null;
  color: string;
  style: string;
  pathType: string;
}>({ visible: false, x: 0, y: 0, edgeKey: null, color: '', style: 'solid', pathType: 'curved' });

function showEdgeContextMenu(e: MouseEvent, edge: EdgeData) {
  if (!wrapRef.value) return;
  const rect = wrapRef.value.getBoundingClientRect();
  // 从父节点 metadata 读取当前连线类型
  const [fromId] = edge.key.split('-');
  const fromNode = layoutNodes.value.find(n => n.lineId === fromId);
  const pathType = fromNode?.metadata?.edgeStyle?.pathType ?? 'curved';
  edgeContextMenu.value = {
    visible: true,
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    edgeKey: edge.key,
    color: edge.color,
    style: edge.dashArray === '6 4' ? 'dashed' : edge.dashArray === '2 2' ? 'dotted' : 'solid',
    pathType,
  };
}

function closeEdgeContextMenu() {
  edgeContextMenu.value.visible = false;
}

function handleEdgeDelete() {
  if (edgeContextMenu.value.edgeKey) {
    emit('delete-edge', edgeContextMenu.value.edgeKey);
  }
  closeEdgeContextMenu();
}

function handleEdgePathType(pathType: string) {
  if (!edgeContextMenu.value.edgeKey) return;
  emit('update-edge-style', {
    edgeKey: edgeContextMenu.value.edgeKey,
    pathType,
  });
  edgeContextMenu.value.pathType = pathType;
  closeEdgeContextMenu();
}

function handleEdgeStyle(style: string) {
  if (!edgeContextMenu.value.edgeKey) return;
  const dashMap: Record<string, string | undefined> = {
    solid: undefined,
    dashed: '6 4',
    dotted: '2 2',
  };
  emit('update-edge-style', {
    edgeKey: edgeContextMenu.value.edgeKey,
    dashArray: dashMap[style],
  });
  edgeContextMenu.value.style = style;
  closeEdgeContextMenu();
}

function handleEdgeColor(color: string) {
  if (!edgeContextMenu.value.edgeKey) return;
  emit('update-edge-style', {
    edgeKey: edgeContextMenu.value.edgeKey,
    color,
  });
  edgeContextMenu.value.color = color;
  closeEdgeContextMenu();
}

// ---- 布局 ----
const layoutNodes = computed<LayoutNode[]>(() => {
  if (props.lines.length === 0) return [];
  const nodes = calculateLayout(props.lines, props.layoutType);
  // 拖拽中的节点：使用临时坐标
  if (draggingNodeId.value) {
    const dn = nodes.find(n => n.lineId === draggingNodeId.value);
    if (dn) {
      dn.x = dragNodeOrigX + (0); // 实际更新在 mousemove
    }
  }
  return nodes;
});

// ---- 节点尺寸辅助 ----
const TAGS_PER_ROW = 4;       // 每行标签数
const TAG_ROW_HEIGHT = 14;    // 每行标签高度
const TAG_GAP = 4;            // 标签间距
const NODE_TAGS_HEIGHT = 26;  // 默认标签区高度（两行）

function effectiveNodeWidth(node: LayoutNode): number {
  return node.width;
}

function effectiveNodeHeight(node: LayoutNode): number {
  return node.height;
}

/** 标签行 Y 偏移（从节点底部向上） */
function tagRowY(node: LayoutNode, row: number): number {
  const tagCount = node.metadata?.tags?.length ?? 0;
  const rows = Math.ceil(Math.min(tagCount, 8) / TAGS_PER_ROW);
  return node.height - (rows - row) * TAG_ROW_HEIGHT - 4;
}

/** 多行标签的垂直偏移量 */
function tagRowHeight(_node: LayoutNode, rows: number): number {
  return rows * TAG_ROW_HEIGHT;
}

/** 标签 X 位置（按列） */
function tagX(node: LayoutNode, col: number): number {
  const w = effectiveNodeWidth(node);
  const tagCount = Math.min(node.metadata?.tags?.length ?? 0, TAGS_PER_ROW);
  const totalW = tagCount * 40 + (tagCount - 1) * TAG_GAP;
  const startX = Math.max(4, (w - totalW) / 2);
  return startX + col * (40 + TAG_GAP);
}

/** 标签宽度（动态按文本长度） */
function tagWidth(node: LayoutNode, tag: string): number {
  return Math.min(40, tag.length * 8 + 10);
}

function textYOffset(node: LayoutNode): number {
  let y = node.height / 2;
  // 如果有 tags，标题上移
  if (node.metadata?.tags?.length) y -= 8;
  if (node.metadata?.priority) y -= 2;
  // 如果节点较矮，微调
  if (node.height < 40) y += 2;
  return y;
}

function tagStartY(node: LayoutNode): number {
  const tagCount = node.metadata?.tags?.length ?? 0;
  if (tagCount === 0) return node.height;
  const rows = Math.ceil(Math.min(tagCount, 8) / TAGS_PER_ROW);
  return node.height - rows * TAG_ROW_HEIGHT - 2;
}

function tagBgColor(index: number): string {
  const colors = ['#e6f4ff', '#f0f5ff', '#e6fffb', '#fff7e6', '#fff2f0', '#f9f0ff', '#e6fffb', '#fcffe6'];
  return colors[index % colors.length];
}

function tagFgColor(index: number): string {
  const colors = ['#1677ff', '#597ef7', '#13c2c2', '#fa8c16', '#ff4d4f', '#722ed1', '#52c41a', '#fadb14'];
  return colors[index % colors.length];
}

function depthTextSize(node: LayoutNode): number {
  if (node.depth === 0) return 15;
  if (node.depth === 1) return 13;
  return 12;
}

function nodeShapeScaleX(node: LayoutNode): number {
  return 1;
}

function nodeShapeScaleY(node: LayoutNode): number {
  return 1;
}

// ---- 虚拟化渲染：只渲染视口内的节点 ----
const visibleNodeIds = computed<Set<string>>(() => {
  if (scale.value < 0.3) return new Set(layoutNodes.value.map(n => n.lineId)); // 非常小时全渲染
  const set = new Set<string>();
  for (const n of layoutNodes.value) {
    if (isNodeVisible(n)) set.add(n.lineId);
  }
  return set;
});

const visibleLayoutNodes = computed<LayoutNode[]>(() => {
  return layoutNodes.value.filter(n => visibleNodeIds.value.has(n.lineId));
});

// ---- 连线计算 ----
interface EdgeData {
  key: string;
  path: string;
  color: string;
  strokeWidth?: number;
  dashArray?: string;
  arrow?: boolean;
  label?: string;
  labelX?: number;
  labelY?: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const DEPTH_COLORS = ['#1677ff', '#597ef7', '#9254de', '#52c41a', '#fa8c16', '#ff4d4f'];

const edges = computed<EdgeData[]>(() => {
  const result: EdgeData[] = [];
  const map = new Map<string, LayoutNode>();
  for (const n of layoutNodes.value) map.set(n.lineId, n);

  for (const node of layoutNodes.value) {
    if (!node.childrenLineIds?.length || node.collapsed) continue;
    for (const childId of node.childrenLineIds) {
      const child = map.get(childId);
      if (!child) continue;

      const isOrgLayout = props.layoutType === 'org-structure';
      const isTimeline = props.layoutType === 'timeline';
      const depthColor = DEPTH_COLORS[node.depth % DEPTH_COLORS.length];
      // 读取用户自定义连线类型（优先级 > 布局默认）
      const pathType = node.metadata?.edgeStyle?.pathType ?? (isOrgLayout ? 'elbow' : 'curved');

      let path: string;
      let labelX: number | undefined;
      let labelY: number | undefined;

      // 计算起点、终点坐标
      if (isOrgLayout) {
        const px = node.x + node.width / 2;
        const py = node.y + node.height;
        const cx = child.x + child.width / 2;
        const cy = child.y;
        const obstacles = pathType === 'elbow'
          ? layoutNodes.value
              .filter(n => n.lineId !== node.lineId && n.lineId !== childId)
              .map(n => ({ x: n.x, y: n.y, width: n.width, height: n.height }))
          : [];

        if (pathType === 'straight') {
          path = `M${px},${py} L${cx},${cy}`;
        } else if (pathType === 'elbow') {
          path = computeSmartElbowPath(px, py, cx, cy, obstacles);
        } else {
          // curved: 贝塞尔曲线
          const cpx1 = px + (cx - px) * 0.4;
          const cpx2 = px + (cx - px) * 0.6;
          path = `M${px},${py} C${cpx1},${py} ${cpx2},${cy} ${cx},${cy}`;
        }
        labelX = (px + cx) / 2;
        labelY = (py + cy) / 2;
      } else if (isTimeline) {
        const x1 = node.x + node.width;
        const y1 = node.y + node.height / 2;
        const x2 = child.x;
        const y2 = child.y + child.height / 2;

        if (pathType === 'straight') {
          path = `M${x1},${y1} L${x2},${y2}`;
        } else {
          const midX = (x1 + x2) / 2;
          path = `M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`;
        }
        labelX = pathType === 'straight' ? (x1 + x2) / 2 : ((x1 + x2) / 2 + x2) / 2;
        labelY = (y1 + y2) / 2;
      } else {
        const x1 = node.x + node.width;
        const y1 = node.y + node.height / 2;
        const x2 = child.x;
        const y2 = child.y + child.height / 2;

        if (pathType === 'straight') {
          path = `M${x1},${y1} L${x2},${y2}`;
        } else if (pathType === 'elbow') {
          const midX = (x1 + x2) / 2;
          path = `M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`;
        } else {
          // curved (default): 贝塞尔曲线
          const cx1 = x1 + (x2 - x1) * 0.4;
          const cx2 = x1 + (x2 - x1) * 0.6;
          path = `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`;
        }
        labelX = (x1 + x2) / 2;
        labelY = (y1 + y2) / 2;
      }

      // 连线粗细按层级递减
      const strokeW = Math.max(1, 3 - node.depth * 0.4);
      // 从 metadata.edgeStyle 读取自定义连线样式
      const edgeStyleColor = node.metadata?.edgeStyle?.color ?? depthColor;
      const edgeStyleDash = node.metadata?.edgeStyle?.dashArray ?? undefined;

      result.push({
        key: `${node.lineId}-${childId}`,
        path,
        color: edgeStyleColor,
        strokeWidth: strokeW,
        dashArray: edgeStyleDash,
        labelX,
        labelY,
        startX: isOrgLayout ? (node.x + node.width / 2) : (isTimeline ? (node.x + node.width) : (node.x + node.width)),
        startY: isOrgLayout ? (node.y + node.height) : (isTimeline ? (node.y + node.height / 2) : (node.y + node.height / 2)),
        endX: isOrgLayout ? (child.x + child.width / 2) : child.x,
        endY: isOrgLayout ? child.y : (isTimeline ? (child.y + child.height / 2) : (child.y + child.height / 2)),
      });
    }
  }
  return result;
});

// ---- 虚拟化渲染：只渲染视口内的连线 ----
const visibleEdges = computed<EdgeData[]>(() => {
  if (scale.value < 0.3) return edges.value; // 极小缩放全渲染
  return edges.value.filter(e => {
    const [fromId, toId] = e.key.split('-');
    return visibleNodeIds.value.has(fromId) || visibleNodeIds.value.has(toId);
  });
});

// ---- 节点颜色 ----
function nodeFill(node: LayoutNode): string {
  if (node.metadata?.style?.backgroundColor) return node.metadata.style.backgroundColor;
  if (node.lineId === props.selectedId) return '#e6f4ff';
  if (selectedIds.value.includes(node.lineId)) return '#f0f5ff';
  if (node.depth === 0) return '#fff7e6';
  if (node.metadata?.isAiGenerated) return '#f6ffed';
  return '#fff';
}

function nodeBorder(node: LayoutNode): string {
  if (node.metadata?.style?.borderColor) return node.metadata.style.borderColor;
  return '#e8e8e8';
}

function priorityColor(p: number): string {
  return ['', '#13c2c2', '#fa8c16', '#f5222d', '#722ed1'][p] ?? '#333';
}

// ---- 缩放 ----
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;

function zoomIn() { zoomTo(scale.value + 0.15); }
function zoomOut() { zoomTo(scale.value - 0.15); }

function zoomTo(s: number) {
  const target = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
  animateToViewport(target, panX.value, panY.value);
}

function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.08 : 0.08;
  const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.value + delta));
  if (!wrapRef.value) return;
  const rect = wrapRef.value.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const ratio = newScale / scale.value;
  const targetX = mx - ratio * (mx - panX.value);
  const targetY = my - ratio * (my - panY.value);
  animateToViewport(newScale, targetX, targetY);
}

// ---- 鼠标事件（平移/框选） ----
function screenToCanvas(clientX: number, clientY: number): { x: number; y: number } {
  if (!wrapRef.value) return { x: 0, y: 0 };
  const rect = wrapRef.value.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  // 逆变换：(canvasX, canvasY) = (screenX - panX) / scale
  return {
    x: (sx - panX.value) / scale.value,
    y: (sy - panY.value) / scale.value,
  };
}

function onCanvasMouseDown(e: MouseEvent) {
  // 框选模式：Shift + 左键
  if (e.shiftKey && e.button === 0) {
    dragMode.value = 'box';
    const pt = screenToCanvas(e.clientX, e.clientY);
    boxStartX = pt.x;
    boxStartY = pt.y;
    selectingBox.value = { visible: true, x: pt.x, y: pt.y, w: 0, h: 0 };
    return;
  }

  // 点击空白处平移 / 取消选中
  if (e.target === svgRef.value || (e.target as SVGElement).tagName === 'svg') {
    dragMode.value = 'pan';
    panStartX = e.clientX; panStartY = e.clientY;
    panStartPX = panX.value; panStartPY = panY.value;
    // 取消所有选中
    emit('select', '' as any);
    selectedIds.value = [];
    emit('update-selected-ids', []);
  }
}

// 入口：平移实时，其余 RAF 节流
function onCanvasMouseMove(e: MouseEvent) {
  if (dragMode.value === 'pan') {
    panX.value = panStartPX + (e.clientX - panStartX);
    panY.value = panStartPY + (e.clientY - panStartY);
    return;
  }
  scheduleMouseMove(e);
}

// 节流后的鼠标移动处理
function processMouseMove(e: MouseEvent) {
  if (dragMode.value === 'box') {
    const pt = screenToCanvas(e.clientX, e.clientY);
    const x = Math.min(boxStartX, pt.x);
    const y = Math.min(boxStartY, pt.y);
    const w = Math.abs(pt.x - boxStartX);
    const h = Math.abs(pt.y - boxStartY);
    selectingBox.value = { visible: true, x, y, w, h };
    return;
  }

  // 连线创建：从锚点拖出临时线
  if (dragMode.value === 'connect' && connectingFrom.value) {
    const pt = screenToCanvas(e.clientX, e.clientY);
    tempConnectionEnd.value = { x: pt.x, y: pt.y };
    return;
  }

  // 连线手柄拖拽
  if (draggingEdgeHandle.value && editingEdgeData.value) {
    const pt = screenToCanvas(e.clientX, e.clientY);
    if (draggingEdgeHandle.value === 'start') {
      editingEdgeData.value.startX = pt.x;
      editingEdgeData.value.startY = pt.y;
    } else {
      editingEdgeData.value.endX = pt.x;
      editingEdgeData.value.endY = pt.y;
    }
    dragEdgeHandleStartX = e.clientX;
    dragEdgeHandleStartY = e.clientY;
    return;
  }

  // 节点拖拽（含对齐引导线 + 吸附）
  if (dragMode.value === 'node' && draggingNodeId.value && dragNodeLayoutNode) {
    const dx = (e.clientX - dragNodeStartX) / scale.value;
    const dy = (e.clientY - dragNodeStartY) / scale.value;
    const node = layoutNodes.value.find(n => n.lineId === draggingNodeId.value);
    if (node) {
      node.x = dragNodeOrigX + dx;
      node.y = dragNodeOrigY + dy;
      // 计算对齐引导线
      const { lines, snapX, snapY } = computeGuideLines(node);
      guideLines.value = lines;
      // 应用吸附
      if (Math.abs(snapX) < SNAP_THRESHOLD) node.x += snapX;
      if (Math.abs(snapY) < SNAP_THRESHOLD) node.y += snapY;
    }
  }

  // 节点 resize
  if (dragMode.value === 'resize' && resizeHandleIdx >= 0) {
    const pt = screenToCanvas(e.clientX, e.clientY);
    const node = layoutNodes.value.find(n => n.lineId === props.selectedId);
    if (node) {
      const dx = pt.x - node.x;
      const dy = pt.y - node.y;
      const handles = getResizeHandles(node);
      const h = handles[resizeHandleIdx];
      if (h.cursor.includes('e')) node.width = Math.max(40, dx);
      if (h.cursor.includes('s')) node.height = Math.max(24, dy);
      if (h.cursor.includes('w')) {
        const oldW = node.width;
        node.width = Math.max(40, oldW - dx);
        if (node.width !== oldW) node.x = pt.x;
      }
      if (h.cursor.includes('n')) {
        const oldH = node.height;
        node.height = Math.max(24, oldH - dy);
        if (node.height !== oldH) node.y = pt.y;
      }
    }
  }
}

function onCanvasMouseUp(e: MouseEvent) {
  if (dragMode.value === 'box') {
    // 完成框选：检测哪些节点在选框内
    const box = selectingBox.value;
    if (box.w > 5 || box.h > 5) {
      const ids: string[] = [];
      for (const node of layoutNodes.value) {
        const nx = node.x;
        const ny = node.y;
        const nw = effectiveNodeWidth(node);
        const nh = effectiveNodeHeight(node);
        if (nx + nw > box.x && nx < box.x + box.w && ny + nh > box.y && ny < box.y + box.h) {
          ids.push(node.lineId);
        }
      }
      selectedIds.value = ids;
      emit('update-selected-ids', ids);
      if (ids.length > 0) emit('select', ids[0]);
    }
    selectingBox.value = { visible: false, x: 0, y: 0, w: 0, h: 0 };
    dragMode.value = 'none';
    return;
  }

  // 连线创建：在空白区域松开 → 取消连线
  if (dragMode.value === 'connect') {
    connectingFrom.value = null;
    dragMode.value = 'none';
    return;
  }

  // 连线手柄拖拽结束
  if (draggingEdgeHandle.value) {
    if (editingEdgeData.value) {
      // 找到最近的锚点自动吸附
      const endPt = draggingEdgeHandle.value === 'end'
        ? { x: editingEdgeData.value.endX, y: editingEdgeData.value.endY }
        : { x: editingEdgeData.value.startX, y: editingEdgeData.value.startY };

      let bestNode: LayoutNode | null = null;
      let bestAi = -1;
      let bestDist = 20; // 吸附阈值 20px

      for (const node of layoutNodes.value) {
        const aps = getAnchorPoints(node);
        for (let i = 0; i < aps.length; i++) {
          const ap = aps[i];
          const ax = node.x + ap.x;
          const ay = node.y + ap.y;
          const dist = Math.sqrt((endPt.x - ax) ** 2 + (endPt.y - ay) ** 2);
          if (dist < bestDist) {
            bestDist = dist;
            bestNode = node;
            bestAi = i;
          }
        }
      }

      if (bestNode && editingEdgeKey.value) {
        // 找到匹配 edge key 中的 from/to lineId
        const [fromId, toId] = editingEdgeKey.value.split('-');
        if (draggingEdgeHandle.value === 'start') {
          emit('reconnect-edge', { edgeKey: editingEdgeKey.value, newFromLineId: bestNode.lineId, newFromAnchorIdx: bestAi });
        } else {
          emit('reconnect-edge', { edgeKey: editingEdgeKey.value, newToLineId: bestNode.lineId, newToAnchorIdx: bestAi });
        }
      }
    }
    draggingEdgeHandle.value = null;
    dragMode.value = 'none';
    return;
  }

  // 节点拖拽结束
  if (dragMode.value === 'node' && draggingNodeId.value) {
    const node = layoutNodes.value.find(n => n.lineId === draggingNodeId.value);
    if (node) {
      emit('move-node', draggingNodeId.value, node.parentLineId, node.depth);
    }
    draggingNodeId.value = null;
    dragNodeLayoutNode = null;
    guideLines.value = [];
    dragMode.value = 'none';
    return;
  }

  // resize 结束
  if (dragMode.value === 'resize') {
    const node = layoutNodes.value.find(n => n.lineId === props.selectedId);
    if (node) {
      emit('resize-node', { lineId: node.lineId, width: node.width, height: node.height });
    }
    resizeHandleIdx = -1;
    dragMode.value = 'none';
    return;
  }

  dragMode.value = 'none';
  selectingBox.value = { visible: false, x: 0, y: 0, w: 0, h: 0 };
}

// ---- 节点交互 ----
function onNodeMouseDown(e: MouseEvent, node: LayoutNode) {
  // Shift+点击：多选切换
  if (e.shiftKey) {
    const idx = selectedIds.value.indexOf(node.lineId);
    if (idx >= 0) {
      selectedIds.value = selectedIds.value.filter(id => id !== node.lineId);
    } else {
      selectedIds.value = [...selectedIds.value, node.lineId];
    }
    emit('update-selected-ids', selectedIds.value);
    if (selectedIds.value.length > 0) emit('select', selectedIds.value[0]);
    return;
  }

  // 普通点击：选中
  emit('select', node.lineId);
  selectedIds.value = [node.lineId];
  emit('update-selected-ids', [node.lineId]);

  // 按住 Alt 键：拖拽节点
  if (e.altKey) {
    dragMode.value = 'node';
    draggingNodeId.value = node.lineId;
    dragNodeStartX = e.clientX;
    dragNodeStartY = e.clientY;
    dragNodeOrigX = node.x;
    dragNodeOrigY = node.y;
    dragNodeLayoutNode = node;
    e.preventDefault();
  }
}

function onNodeDblClick(node: LayoutNode) {
  // 开始内联编辑
  editingNodeId.value = node.lineId;
  editingText.value = node.text;
  nextTick(() => {
    const input = inlineInputRef.value;
    if (input) {
      input.focus();
      input.select();
    }
  });
}

function commitEdit() {
  if (editingNodeId.value && editingText.value.trim()) {
    emit('edit', editingNodeId.value, editingText.value.trim());
  }
  editingNodeId.value = null;
  editingText.value = '';
  // 聚焦画布
  wrapRef.value?.focus();
}

function cancelEdit() {
  editingNodeId.value = null;
  editingText.value = '';
  wrapRef.value?.focus();
}

function onNodeContextMenu(e: MouseEvent, node: LayoutNode) {
  emit('select', node.lineId);
  selectedIds.value = [node.lineId];
  emit('update-selected-ids', [node.lineId]);
  emit('contextmenu', { lineId: node.lineId, x: e.clientX, y: e.clientY });
}

// ---- 键盘导航 ----
function onKeydown(e: KeyboardEvent) {
  // 编辑中不处理
  if (editingNodeId.value) return;
  if (!props.selectedId) return;

  const currentId = props.selectedId;
  const node = layoutNodes.value.find(n => n.lineId === currentId);
  if (!node) return;

  // 方向键导航
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    const siblings = layoutNodes.value.filter(n => n.parentLineId === node.parentLineId && n.depth === node.depth);
    siblings.sort((a, b) => a.y - b.y);
    const idx = siblings.findIndex(n => n.lineId === currentId);
    let nextIdx: number;
    if (e.key === 'ArrowUp') {
      nextIdx = idx > 0 ? idx - 1 : siblings.length - 1;
    } else {
      nextIdx = idx < siblings.length - 1 ? idx + 1 : 0;
    }
    if (siblings[nextIdx]) {
      emit('select', siblings[nextIdx].lineId);
      selectedIds.value = [siblings[nextIdx].lineId];
      emit('update-selected-ids', [siblings[nextIdx].lineId]);
      scrollToNode(siblings[nextIdx]);
    }
    return;
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    const parent = layoutNodes.value.find(n => n.lineId === node.parentLineId);
    if (parent) {
      emit('select', parent.lineId);
      selectedIds.value = [parent.lineId];
      emit('update-selected-ids', [parent.lineId]);
      scrollToNode(parent);
    }
    return;
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (node.childrenLineIds?.length && !node.collapsed) {
      const firstChild = layoutNodes.value.find(n => n.lineId === node.childrenLineIds[0]);
      if (firstChild) {
        emit('select', firstChild.lineId);
        selectedIds.value = [firstChild.lineId];
        emit('update-selected-ids', [firstChild.lineId]);
        scrollToNode(firstChild);
      }
    }
    return;
  }

  // Enter 添加子节点
  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    e.preventDefault();
    emit('add-child', currentId);
    return;
  }

  // Tab 缩进
  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    emit('move-node', currentId, node.parentLineId, Math.max(0, node.depth + 1));
    return;
  }

  // Shift+Tab 减少缩进
  if (e.key === 'Tab' && e.shiftKey) {
    e.preventDefault();
    emit('move-node', currentId, node.parentLineId, Math.max(1, node.depth - 1));
    return;
  }

  // Ctrl+Z / Ctrl+Shift+Z 由 EditorView 全局处理
  // Ctrl+/ 等号放大
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    zoomIn();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === '-') {
    e.preventDefault();
    zoomOut();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === '0') {
    e.preventDefault();
    fitView();
  }
}

function scrollToNode(node: LayoutNode) {
  // 将节点滚动到视口中央
  if (!wrapRef.value) return;
  const cw = wrapRef.value.clientWidth;
  const ch = wrapRef.value.clientHeight;
  const targetX = cw / 2 - (node.x + effectiveNodeWidth(node) / 2) * scale.value;
  const targetY = ch / 2 - (node.y + effectiveNodeHeight(node) / 2) * scale.value;
  animateToViewport(scale.value, targetX, targetY);
}

// ---- 适应窗口 ----
function fitView() {
  const nodes = layoutNodes.value;
  if (nodes.length === 0) return;
  const bounds = getBounds(nodes);
  if (!wrapRef.value) return;
  const cw = wrapRef.value.clientWidth - 40;
  const ch = wrapRef.value.clientHeight - 40;
  const s = Math.min(cw / bounds.w, ch / bounds.h, 1.5);
  const targetScale = Math.max(MIN_SCALE, s);
  const targetX = (cw - bounds.w * targetScale) / 2 - bounds.minX * targetScale + 20;
  const targetY = (ch - bounds.h * targetScale) / 2 - bounds.minY * targetScale + 20;
  animateToViewport(targetScale, targetX, targetY);
}

// ---- 迷你地图计算 ----
const minimapMARGIN = 8;

const minimapNodes = computed(() => {
  const nodes = layoutNodes.value;
  if (nodes.length === 0) return [];
  const bounds = getBounds(nodes);
  const mmW = 160 - minimapMARGIN * 2;
  const mmH = 120 - minimapMARGIN * 2;
  const scaleX = mmW / bounds.w;
  const scaleY = mmH / bounds.h;
  const mmScale = Math.min(scaleX, scaleY, 1);

  return nodes.map(n => ({
    id: n.lineId,
    x: minimapMARGIN + (n.x - bounds.minX) * mmScale,
    y: minimapMARGIN + (n.y - bounds.minY) * mmScale,
    w: Math.max(3, effectiveNodeWidth(n) * mmScale),
    h: Math.max(2, effectiveNodeHeight(n) * mmScale),
  }));
});

const viewportRect = computed(() => {
  if (!wrapRef.value) return { x: 0, y: 0, w: 0, h: 0 };
  const cw = wrapRef.value.clientWidth;
  const ch = wrapRef.value.clientHeight;
  const nodes = layoutNodes.value;
  if (nodes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const bounds = getBounds(nodes);
  const mmW = 160 - minimapMARGIN * 2;
  const mmH = 120 - minimapMARGIN * 2;
  const mmScale = Math.min(mmW / bounds.w, mmH / bounds.h, 1);

  // 视口左上角在画布中的坐标
  const vpLeft = -panX.value / scale.value;
  const vpTop = -panY.value / scale.value;
  const vpW = cw / scale.value;
  const vpH = ch / scale.value;

  return {
    x: minimapMARGIN + Math.max(0, (vpLeft - bounds.minX) * mmScale),
    y: minimapMARGIN + Math.max(0, (vpTop - bounds.minY) * mmScale),
    w: Math.min(vpW * mmScale, mmW),
    h: Math.min(vpH * mmScale, mmH),
  };
});

// ---- 节点动画标记 ----
watch(() => props.lines.length, (newLen, oldLen) => {
  if (newLen > oldLen && props.lines.length > 0) {
    // 找到新添加的节点（最后一个）
    const lastLine = props.lines[props.lines.length - 1];
    newlyAddedId.value = lastLine.lineId;
    setTimeout(() => { newlyAddedId.value = null; }, 600);
  }
});

// ---- 生命周期 ----
onMounted(() => {
  nextTick(() => fitView());
  wrapRef.value?.focus();
});

onUnmounted(() => {
  cancelAnimation();
});

watch(() => props.lines, () => {
  // 数据变更时不自动重置视口，保持用户当前视角
}, { deep: true });

// 暴露方法给父组件
defineExpose({
  fitView,
  zoomTo,
  scrollToNode,
  getScale: () => scale.value,
});
</script>

<style scoped>
.mm-canvas-wrap {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  outline: none;
  background: #fafafa;
  background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
  background-size: 20px 20px;
}
.mm-svg {
  width: 100%;
  height: 100%;
  display: block;
  /* GPU 加速 */
  will-change: transform;
  backface-visibility: hidden;
}
/* 主变换组 GPU 加速 */
.mm-svg > g {
  will-change: transform;
}
.mm-node-group {
  cursor: pointer;
  transition: opacity 0.15s;
  /* GPU 加速 */
  will-change: transform;
  contain: layout style paint;
}
.mm-node-group:hover rect {
  filter: brightness(0.96);
}
.node-selected {
  cursor: default;
}
.node-dragging {
  cursor: grabbing;
  opacity: 0.85;
}
.node-new {
  animation: nodeAppear 0.4s ease-out;
}
@keyframes nodeAppear {
  from { opacity: 0; transform-origin: center; }
  to { opacity: 1; }
}

.mm-zoom-ctrl {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fff;
  border-radius: 6px;
  padding: 4px 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  font-size: 12px;
  user-select: none;
  z-index: 10;
}
.mm-zoom-ctrl button {
  width: 28px; height: 28px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.mm-zoom-ctrl button:hover { border-color: #1677ff; color: #1677ff; }
.mm-zoom-ctrl span { min-width: 40px; text-align: center; color: #666; }

/* 迷你地图 */
.mm-minimap {
  position: absolute;
  bottom: 56px;
  right: 12px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  border: 1px solid #e8e8e8;
  cursor: pointer;
  z-index: 9;
  transition: opacity 0.25s;
}
.mm-minimap-hidden {
  opacity: 0;
  pointer-events: none;
}
.minimap-svg {
  display: block;
}

/* ---- 连线样式 ---- */
.edge-path {
  transition: stroke 0.2s, stroke-width 0.2s;
}
.edge-selected {
  filter: drop-shadow(0 0 3px rgba(22,119,255,0.4));
}
.edge-hit-path {
  cursor: pointer;
}
.edge-hit-path:hover + .edge-path {
  stroke: #1677ff !important;
}

/* 连线编辑手柄 */
.edge-handle-hit {
  cursor: grab;
}
.edge-handle-dot {
  cursor: grab;
  transition: r 0.15s;
}
.edge-handle-dot:hover {
  r: 7;
}

/* ---- 连接点锚点 ---- */
.anchor-points {
  pointer-events: auto;
}
.anchor-point-group {
  cursor: crosshair;
}
.anchor-hit {
  cursor: crosshair;
}
.anchor-dot {
  transition: r 0.15s, fill 0.15s;
}
.anchor-hover {
  opacity: 0;
  transition: opacity 0.15s;
}
.anchor-point-group:hover .anchor-hover {
  opacity: 1;
}
.anchor-point-group:hover .anchor-dot {
  opacity: 0;
}
.anchor-point-group:hover .anchor-hit {
  fill: rgba(22,119,255,0.1);
}

/* ---- 像素级光标映射 ---- */
/* 文本中心区 → text 光标 */
.cursor-zone-text { cursor: text; }
/* 边缘 → resize 光标 */
.cursor-zone-n  { cursor: ns-resize; }
.cursor-zone-s  { cursor: ns-resize; }
.cursor-zone-e  { cursor: ew-resize; }
.cursor-zone-w  { cursor: ew-resize; }
.cursor-zone-nw { cursor: nwse-resize; }
.cursor-zone-se { cursor: nwse-resize; }
.cursor-zone-ne { cursor: nesw-resize; }
.cursor-zone-sw { cursor: nesw-resize; }

/* ---- Resize 句柄 ---- */
.resize-handles {
  pointer-events: auto;
}
.resize-handle-nwse { cursor: nwse-resize; }
.resize-handle-ns   { cursor: ns-resize; }
.resize-handle-nesw { cursor: nesw-resize; }
.resize-handle-ew   { cursor: ew-resize; }

.resize-handles rect {
  transition: width 0.1s, height 0.1s;
}
.resize-handles g:hover rect {
  fill: #1677ff;
  width: 9px;
  height: 9px;
  x: -4.5px;
  y: -4.5px;
}

/* ---- 连线右键菜单 ---- */
.edge-context-menu {
  position: absolute;
  z-index: 100;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  border: 1px solid #e8e8e8;
  padding: 4px 0;
  min-width: 140px;
  font-size: 12px;
  user-select: none;
}
.ecm-item {
  padding: 6px 14px;
  cursor: pointer;
  color: #333;
  transition: background 0.15s;
}
.ecm-item:hover { background: #f0f5ff; color: #1677ff; }
.ecm-item.active { color: #1677ff; font-weight: bold; }
.ecm-sep {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 8px;
}
.ecm-label {
  padding: 4px 14px 2px;
  font-size: 10px;
  color: #999;
  text-transform: uppercase;
}
.ecm-colors {
  display: flex;
  gap: 6px;
  padding: 6px 14px;
}
.ecm-color-swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.15s, transform 0.15s;
}
.ecm-color-swatch:hover { transform: scale(1.15); }
.ecm-color-swatch.active { border-color: #1677ff; transform: scale(1.1); }
</style>
