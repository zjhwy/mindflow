/**
 * 预设模板数据
 * 包含：思维导图、流程图、组织架构、时间轴、鱼骨图等模板
 */
import type { InnerLine, MindLayoutType } from '@mindflow/shared';

export interface TemplateCategory {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
}

export interface Template {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  thumbnail?: string;
  description: string;
  layout: MindLayoutType;
  rootText: string;
  // 模板数据结构：{ text, depth, children? }
  structure: Array<{
    text: string;
    depth: number;
    children?: string[];
  }>;
  // 预设样式
  style?: {
    backgroundColor?: string;
    nodeColor?: string;
    nodeShape?: string;
    lineColor?: string;
    fontFamily?: string;
  };
}

// 模板分类
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'mindmap', name: '思维导图', nameEn: 'Mind Map', icon: '🧠', description: '发散性思维表达工具' },
  { id: 'flowchart', name: '流程图', nameEn: 'Flowchart', icon: '🔄', description: '展示流程步骤' },
  { id: 'orgchart', name: '组织架构', nameEn: 'Org Chart', icon: '👥', description: '层级关系展示' },
  { id: 'timeline', name: '时间轴', nameEn: 'Timeline', icon: '📅', description: '时间序列展示' },
  { id: 'fishbone', name: '鱼骨图', nameEn: 'Fishbone', icon: '🐟', description: '因果分析工具' },
  { id: 'concept', name: '概念图', nameEn: 'Concept Map', icon: '💡', description: '概念关系可视化' },
];

// 预设模板
export const TEMPLATES: Template[] = [
  // ===== 思维导图模板 =====
  {
    id: 'brainstorm',
    name: '头脑风暴',
    nameEn: 'Brainstorm',
    category: 'mindmap',
    description: '用于创意发散和思维整理',
    layout: MindLayoutType.LOGIC_RIGHT,
    rootText: '中心主题',
    structure: [
      { text: '想法一', depth: 1 },
      { text: '想法二', depth: 1 },
      { text: '想法三', depth: 1 },
      { text: '延伸概念', depth: 2 },
      { text: '关键要点', depth: 2 },
    ],
  },
  {
    id: 'book-summary',
    name: '读书笔记',
    nameEn: 'Book Summary',
    category: 'mindmap',
    description: '整理书籍内容结构',
    layout: MindLayoutType.LOGIC_RIGHT,
    rootText: '书名',
    structure: [
      { text: '作者简介', depth: 1 },
      { text: '核心观点', depth: 1 },
      { text: '精彩摘录', depth: 1 },
      { text: '读后感想', depth: 1 },
      { text: '行动计划', depth: 1 },
    ],
  },
  {
    id: 'meeting-notes',
    name: '会议纪要',
    nameEn: 'Meeting Notes',
    category: 'mindmap',
    description: '快速记录会议要点',
    layout: MindLayoutType.LOGIC_RIGHT,
    rootText: '会议主题',
    structure: [
      { text: '参会人员', depth: 1 },
      { text: '议题讨论', depth: 1 },
      { text: '决议事项', depth: 1 },
      { text: '待办任务', depth: 1 },
      { text: '下次安排', depth: 1 },
    ],
  },
  {
    id: 'project-plan',
    name: '项目计划',
    nameEn: 'Project Plan',
    category: 'mindmap',
    description: '规划项目全貌',
    layout: MindLayoutType.LOGIC_RIGHT,
    rootText: '项目名称',
    structure: [
      { text: '项目目标', depth: 1 },
      { text: '项目范围', depth: 1 },
      { text: '时间安排', depth: 1 },
      { text: '资源配置', depth: 1 },
      { text: '风险评估', depth: 1 },
      { text: '里程碑', depth: 2 },
    ],
  },

  // ===== 流程图模板 =====
  {
    id: 'process-basic',
    name: '基本流程',
    nameEn: 'Basic Process',
    category: 'flowchart',
    description: '标准业务流程图',
    layout: MindLayoutType.LOGIC_RIGHT,
    rootText: '开始',
    structure: [
      { text: '步骤1', depth: 1 },
      { text: '步骤2', depth: 1 },
      { text: '条件判断', depth: 1 },
      { text: '是', depth: 2 },
      { text: '否', depth: 2 },
      { text: '结束', depth: 1 },
    ],
  },
  {
    id: 'decision-tree',
    name: '决策树',
    nameEn: 'Decision Tree',
    category: 'flowchart',
    description: '多条件决策分析',
    layout: MindLayoutType.LOGIC_RIGHT,
    rootText: '决策点',
    structure: [
      { text: '选项A', depth: 1 },
      { text: '选项B', depth: 1 },
      { text: '结果1', depth: 2 },
      { text: '结果2', depth: 2 },
      { text: '结果3', depth: 2 },
    ],
  },
  {
    id: 'sop',
    name: '标准作业程序',
    nameEn: 'SOP',
    category: 'flowchart',
    description: '标准化操作流程',
    layout: MindLayoutType.LOGIC_RIGHT,
    rootText: '操作流程',
    structure: [
      { text: '前置检查', depth: 1 },
      { text: '步骤一', depth: 1 },
      { text: '步骤二', depth: 1 },
      { text: '步骤三', depth: 1 },
      { text: '质量检查', depth: 1 },
      { text: '完成记录', depth: 1 },
    ],
  },

  // ===== 组织架构模板 =====
  {
    id: 'company-org',
    name: '公司架构',
    nameEn: 'Company Structure',
    category: 'orgchart',
    description: '企业组织结构图',
    layout: MindLayoutType.ORG_STRUCTURE,
    rootText: '总经理',
    structure: [
      { text: '技术部', depth: 1 },
      { text: '产品部', depth: 1 },
      { text: '市场部', depth: 1 },
      { text: '财务部', depth: 1 },
      { text: '研发组', depth: 2 },
      { text: '测试组', depth: 2 },
    ],
  },
  {
    id: 'team-structure',
    name: '团队结构',
    nameEn: 'Team Structure',
    category: 'orgchart',
    description: '小组团队架构',
    layout: MindLayoutType.ORG_STRUCTURE,
    rootText: '团队负责人',
    structure: [
      { text: '核心成员', depth: 1 },
      { text: '核心成员', depth: 1 },
      { text: '核心成员', depth: 1 },
    ],
  },

  // ===== 时间轴模板 =====
  {
    id: 'project-timeline',
    name: '项目进度',
    nameEn: 'Project Timeline',
    category: 'timeline',
    description: '项目时间线规划',
    layout: MindLayoutType.TIMELINE,
    rootText: '项目周期',
    structure: [
      { text: '需求分析', depth: 1 },
      { text: '设计阶段', depth: 1 },
      { text: '开发阶段', depth: 1 },
      { text: '测试阶段', depth: 1 },
      { text: '上线部署', depth: 1 },
      { text: '运维支持', depth: 1 },
    ],
  },
  {
    id: 'history-timeline',
    name: '发展历程',
    nameEn: 'History',
    category: 'timeline',
    description: '记录重要事件',
    layout: MindLayoutType.TIMELINE,
    rootText: '发展历程',
    structure: [
      { text: '2020年', depth: 1 },
      { text: '2021年', depth: 1 },
      { text: '2022年', depth: 1 },
      { text: '2023年', depth: 1 },
      { text: '2024年', depth: 1 },
    ],
  },

  // ===== 鱼骨图模板 =====
  {
    id: 'cause-analysis',
    name: '问题分析',
    nameEn: 'Cause Analysis',
    category: 'fishbone',
    description: '分析问题根本原因',
    layout: MindLayoutType.FISHBONE,
    rootText: '问题',
    structure: [
      { text: '人员', depth: 1 },
      { text: '机器', depth: 1 },
      { text: '方法', depth: 1 },
      { text: '材料', depth: 1 },
      { text: '环境', depth: 1 },
      { text: '测量', depth: 1 },
    ],
  },
  {
    id: 'swot-analysis',
    name: 'SWOT分析',
    nameEn: 'SWOT Analysis',
    category: 'fishbone',
    description: '战略分析工具',
    layout: MindLayoutType.FISHBONE,
    rootText: 'SWOT分析',
    structure: [
      { text: '优势', depth: 1 },
      { text: '劣势', depth: 1 },
      { text: '机会', depth: 1 },
      { text: '威胁', depth: 1 },
    ],
  },

  // ===== 概念图模板 =====
  {
    id: 'knowledge-graph',
    name: '知识图谱',
    nameEn: 'Knowledge Graph',
    category: 'concept',
    description: '构建知识体系',
    layout: MindLayoutType.LOGIC_RIGHT,
    rootText: '核心概念',
    structure: [
      { text: '定义', depth: 1 },
      { text: '特征', depth: 1 },
      { text: '关联概念', depth: 1 },
      { text: '应用场景', depth: 1 },
      { text: '相关案例', depth: 1 },
    ],
  },
  {
    id: 'theory-framework',
    name: '理论框架',
    nameEn: 'Theory Framework',
    category: 'concept',
    description: '学术研究框架',
    layout: MindLayoutType.LOGIC_RIGHT,
    rootText: '研究主题',
    structure: [
      { text: '理论基础', depth: 1 },
      { text: '研究假设', depth: 1 },
      { text: '变量关系', depth: 1 },
      { text: '研究方法', depth: 1 },
      { text: '预期结论', depth: 1 },
    ],
  },
];

/**
 * 根据分类筛选模板
 */
export function getTemplatesByCategory(categoryId: string): Template[] {
  return TEMPLATES.filter(t => t.category === categoryId);
}

/**
 * 根据ID获取模板
 */
export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find(t => t.id === id);
}

/**
 * 搜索模板
 */
export function searchTemplates(keyword: string): Template[] {
  const kw = keyword.toLowerCase();
  return TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(kw) ||
    t.nameEn.toLowerCase().includes(kw) ||
    t.description.toLowerCase().includes(kw)
  );
}

/**
 * 将模板结构转换为 InnerLine[]
 */
export function templateToLines(template: Template): InnerLine[] {
  const lines: InnerLine[] = [];
  let idCounter = 1;

  // 创建根节点
  const rootId = `line_${idCounter++}`;
  lines.push({
    lineId: rootId,
    text: template.rootText,
    depth: 0,
    childrenLineIds: [],
    parentLineId: null,
    collapsed: false,
    metadata: {
      shapeType: 'rounded-rect',
      style: template.style?.nodeColor ? {
        backgroundColor: template.style.nodeColor,
        color: '#ffffff'
      } : undefined,
    },
  });

  // 构建 childrenLineIds 映射
  const childrenMap = new Map<number, string[]>();
  const idMap = new Map<string, string>(); // text -> lineId

  for (const item of template.structure) {
    if (item.depth === 0) continue;

    const parentItems = template.structure.filter(s => s.depth === item.depth - 1);
    // 简单实现：找到最近的同级父节点
    let parentId = rootId;
    for (const p of parentItems) {
      if (p.text) {
        const pId = idMap.get(p.text);
        if (pId) parentId = pId;
      }
    }

    const lineId = `line_${idCounter++}`;
    idMap.set(item.text, lineId);

    lines.push({
      lineId,
      text: item.text,
      depth: item.depth,
      childrenLineIds: [],
      parentLineId: parentId,
      collapsed: false,
    });

    // 更新父节点的 childrenLineIds
    const parent = lines.find(l => l.lineId === parentId);
    if (parent) {
      parent.childrenLineIds.push(lineId);
    }
  }

  return lines;
}
