# MindFlow - UI 组件扩展设计文档 (zjhdml.online)

## 一、项目概述

本扩展基于 MindFlow 项目，新增了模板市场、图形库、样式面板增强、布局切换等 UI 组件，扩展了布局引擎以支持鱼骨图等更多布局类型。

---

## 二、新增组件

### 2.1 模板市场 (`TemplateMarket.vue`)

**功能描述**：提供预设模板选择，支持分类浏览和搜索。

**组件结构**：
```
├── 头部（标题 + 关闭按钮）
├── 搜索栏
├── 分类标签（6个分类）
│   ├── 思维导图
│   ├── 流程图
│   ├── 组织架构
│   ├── 时间轴
│   ├── 鱼骨图
│   └── 概念图
├── 模板网格（卡片式布局）
│   ├── 缩略图预览
│   ├── 模板名称
│   └── 模板描述
├── 空状态提示
└── 底部操作栏
```

**交互流程**：
1. 用户点击「模板」按钮打开弹窗
2. 支持按分类筛选或搜索关键词
3. 单击卡片选中，再次单击取消选中
4. 点击「使用此模板」按钮加载模板内容
5. 新文档将使用选中的模板结构初始化

**数据结构** (`templates.ts`)：
```typescript
interface Template {
  id: string;
  name: string;           // 中文名称
  nameEn: string;        // 英文名称
  category: string;       // 所属分类
  description: string;    // 模板描述
  layout: MindLayoutType; // 布局类型
  rootText: string;       // 根节点文本
  structure: Array<{      // 节点结构
    text: string;
    depth: number;
  }>;
  style?: {               // 预设样式
    backgroundColor?: string;
    nodeColor?: string;
    nodeShape?: string;
    lineColor?: string;
  };
}
```

**预设模板清单**：
| ID | 名称 | 分类 | 布局 | 描述 |
|----|------|------|------|------|
| brainstorm | 头脑风暴 | 思维导图 | logic-right | 创意发散和思维整理 |
| book-summary | 读书笔记 | 思维导图 | logic-right | 整理书籍内容结构 |
| meeting-notes | 会议纪要 | 思维导图 | logic-right | 快速记录会议要点 |
| project-plan | 项目计划 | 思维导图 | logic-right | 规划项目全貌 |
| process-basic | 基本流程 | 流程图 | logic-right | 标准业务流程图 |
| decision-tree | 决策树 | 流程图 | logic-right | 多条件决策分析 |
| company-org | 公司架构 | 组织架构 | org-structure | 企业组织结构图 |
| project-timeline | 项目进度 | 时间轴 | timeline | 项目时间线规划 |
| cause-analysis | 问题分析 | 鱼骨图 | fishbone | 分析问题根本原因 |
| swot-analysis | SWOT分析 | 鱼骨图 | fishbone | 战略分析工具 |
| knowledge-graph | 知识图谱 | 概念图 | logic-right | 构建知识体系 |

---

### 2.2 图形库 (`ShapeLibrary.vue`)

**功能描述**：展示 MindFlow 形状库，支持分类浏览和搜索。

**组件结构**：
```
├── 头部（标题 + 关闭按钮）
├── 搜索栏
├── 左侧分类边栏
│   ├── 全部（计数）
│   ├── 线条（20个）
│   ├── 矩形（9个）
│   ├── 基本形状（36个）
│   ├── 箭头
│   ├── 流程图
│   ├── 星形
│   └── 标注
├── 主图形网格
│   ├── 图形 SVG 预览
│   ├── 图形名称
│   └── 选中态高亮
├── 空状态提示
└── 右侧图形详情面板（选中时显示）
    ├── 大尺寸预览
    ├── 基本信息（名称、英文名、宽高比、快捷键）
    ├── 特性标签（可填充文字/可调整大小/可编辑顶点）
    └── 插入按钮
```

**数据来源**：复用 `@mindflow/shared` 的 `WPS_SHAPE_LIBRARY`，包含 153+ 预定义形状。

**形状分类** (`ShapeCategory` 枚举)：
| 枚举值 | 名称 | 数量 |
|--------|------|------|
| LINES | 线条 | 20 |
| RECTANGLES | 矩形 | 9 |
| BASIC_SHAPES | 基本形状 | 36 |
| ARROWS | 箭头 | ~20 |
| FLOWCHART | 流程图 | ~25 |
| STARS | 星形 | ~10 |
| CALLOUTS | 标注 | ~10 |

---

### 2.3 样式面板增强 (`StylePanelEnhanced.vue`)

**功能描述**：扩展节点样式配置，支持画布样式和主题配色。

**组件结构**：
```
├── Tab 切换
│   ├── 画布样式
│   └── 主题配色
├── 画布样式面板
│   ├── 背景颜色（颜色选择器 + 十六进制输入）
│   ├── 网格线（无/点/线/方格 4种）
│   └── 画布尺寸预设（A4/16:9/4:3/方形）
├── 主题配色面板
│   ├── 预设主题网格（6种）
│   │   ├── 默认（蓝紫渐变）
│   │   ├── 海洋蓝
│   │   ├── 森林绿
│   │   ├── 晚霞
│   │   ├── 深色
│   │   └── 简约白
│   ├── 节点背景色
│   ├── 文字颜色
│   ├── 边框颜色
│   ├── 连线颜色
│   └── 快速配色方案（6种）
└── 底部操作栏（重置/应用）
```

**主题预设结构**：
```typescript
interface ThemePreset {
  id: string;
  name: string;
  preview: string;      // 渐变色预览
  nodeColor: string;   // 节点背景色
  textColor: string;   // 文字颜色
  lineColor: string;   // 连线颜色
  borderColor: string; // 边框颜色
  bgColor: string;     // 画布背景色
}
```

---

### 2.4 结构切换器 (`LayoutSwitcher.vue`)

**功能描述**：下拉式布局切换器，支持快速切换和操作。

**组件结构**：
```
├── 触发按钮（图标 + 当前布局名 + 展开箭头）
└── 下拉面板
    ├── 布局类型网格（6种）
    │   ├── 逻辑图 →
    │   ├── 左侧图 ←
    │   ├── 组织架构 ⬇
    │   ├── 时间轴 📅
    │   ├── 鱼骨图 🐟
    │   └── 自由布局 ✨
    ├── 分隔线
    └── 快速操作
        ├── 左右镜像
        ├── 居中显示
        └── 自动排列
```

---

## 三、布局引擎扩展

### 3.1 新增布局算法

#### 鱼骨图布局 (`computeFishboneLayout`)

**设计原理**：鱼骨图（Ishikawa diagram）是一种因果分析工具，主干水平放置，分支斜向两侧展开。

**布局规则**：
```
                    ┌─ 小骨
               ┌─ 中骨
         ┌─ 大骨 ← 根节点
   ──────┤
         └─ 大骨 ← 小骨
               └─ 中骨
```

**实现要点**：
1. 根节点水平居中放置
2. 子节点（大骨）沿主干间隔分布，上下交替
3. 大骨的子节点（中骨）斜向45度展开
4. 中骨的子节点（小骨）进一步细分
5. 支持递归处理多层深度

#### 放射状布局 (`computeRadialLayout`)

**设计原理**：节点以根节点为中心，圆形向外辐射排列。

**布局规则**：
```
        子节点2
    子节点1   子节点3
        根节点
    子节点4   子节点5
        子节点6
```

**实现要点**：
1. 根节点居中
2. 一级子节点沿圆形均匀分布
3. 二级及更深节点沿弧线排列

---

### 3.2 布局类型映射

| MindLayoutType | 布局描述 | 适用场景 |
|----------------|----------|----------|
| `logic-right` | 右侧逻辑图 | 常规思维导图 |
| `logic-left` | 左侧逻辑图 | 从右向左的思维导图 |
| `org-structure` | 组织架构图 | 公司结构、人员架构 |
| `timeline` | 时间轴 | 项目进度、历史事件 |
| `fishbone` | 鱼骨图 | 原因分析、问题诊断 |
| `free` | 自由布局 | 手动调整位置 |

---

## 四、编辑器集成

### 4.1 新增功能入口

**底部快捷工具栏**：
```
┌─────────────────────────────────────────────┐
│  📋 模板    ⬡ 图形    🔄 布局              │
└─────────────────────────────────────────────┘
```

**功能说明**：
- 📋 **模板**：打开模板市场弹窗
- ⬡ **图形**：打开图形库弹窗
- 🔄 **布局**：循环切换布局类型

### 4.2 事件处理

| 事件 | 处理函数 | 说明 |
|------|----------|------|
| 模板选择 | `handleTemplateSelect` | 加载模板结构，设置布局 |
| 图形选择 | `handleShapeSelect` | 应用形状到选中节点 |
| 布局切换 | `handleLayoutSwitch` | 循环切换布局类型 |

### 4.3 模板加载流程

```typescript
function handleTemplateSelect(template: Template) {
  // 1. 将模板结构转换为 InnerLine[]
  const lines = templateToLines(template);

  // 2. 加载到编辑器
  mindmap.loadDocument(lines, undefined, template.name);

  // 3. 设置对应的布局类型
  mindmap.setLayout(template.layout);

  // 4. 提示用户
  mindmap.setStatus(`已应用模板: ${template.name}`);
}
```

---

## 五、文件清单

### 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/data/templates.ts` | 模板数据定义 |
| `src/components/TemplateMarket.vue` | 模板市场组件 |
| `src/components/ShapeLibrary.vue` | 图形库组件 |
| `src/components/StylePanelEnhanced.vue` | 增强样式面板 |
| `src/components/LayoutSwitcher.vue` | 布局切换器 |
| `docs/design/extended-components.md` | 本文档 |

### 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `src/views/EditorView.vue` | 集成新组件，添加底部工具栏 |
| `src/utils/layout.ts` | 添加鱼骨图和放射状布局算法 |

---

## 六、交互设计规范

### 6.1 弹窗设计

- 居中显示，半透明遮罩
- 圆角 12px
- 阴影：`0 20px 60px rgba(0,0,0,0.2)`
- 关闭方式：点击遮罩 / 按 ESC / 点击关闭按钮

### 6.2 按钮状态

| 状态 | 样式 |
|------|------|
| 默认 | 白底 + 灰色边框 |
| 悬停 | 蓝色边框 + 浅蓝背景 |
| 激活/选中 | 蓝色边框 + 浅蓝背景 + 蓝色文字 |
| 禁用 | 灰色背景 + 降低透明度 |

### 6.3 动画

- 弹窗展开：`0.2s ease` 淡入 + 位移
- 卡片悬停：`0.2s` 轻微上浮 + 阴影加深
- 按钮点击：缩放 `scale(1.05)`

---

## 七、后续优化建议

1. **模板编辑**：允许用户创建、编辑、保存自定义模板
2. **图形收藏**：用户可收藏常用图形
3. **主题分享**：导出/导入主题配色方案
4. **布局预设保存**：保存自定义布局配置
5. **快捷键支持**：
   - `Ctrl+T`：打开模板市场
   - `Ctrl+G`：打开图形库
   - `Ctrl+L`：切换布局

---

## 八、参考截图说明

本文档参考了思维导图产品的以下 UI：

| 截图 | 对应组件 | 说明 |
|------|----------|------|
| 屏幕截图 2026-06-30 185708.png | TemplateMarket | 模板市场界面 |
| 屏幕截图 2026-07-02 171057.png | StylePanel | 样式面板基础样式 |
| 屏幕截图 2026-07-02 171111.png | StylePanelEnhanced | 画布/主题样式切换 |
| 屏幕截图 2026-07-02 171122.png | StylePanelEnhanced | 主题配色预设 |
| 屏幕截图 2026-07-02 171147.png | LayoutSwitcher | 结构切换下拉菜单 |
| 屏幕截图 2026-07-02 171153.png | AiConsole | AI 创作面板 |
| 屏幕截图 2026-07-02 171159.png | ShapeLibrary | 图形库弹窗 |
| 屏幕截图 2026-07-02 171207.png | ShapeLibrary | 基础图形分类 |
| 屏幕截图 2026-07-02 171218.png | ShapeLibrary | 流程图图形 |
| 屏幕截图 2026-07-02 171238.png | ShapeLibrary | 图形预览面板 |

---

*文档版本：1.0*
*创建日期：2026-07-02*
