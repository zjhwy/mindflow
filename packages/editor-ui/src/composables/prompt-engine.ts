/**
 * MindFlow AI 提示词引擎
 *
 * 完整的提示词体系：主系统提示词、增量修改、风格化、跨类型转换等。
 * 可直接配置到 AI 引擎中，实现从自然语言到完整交互元数据的结构化导图生成。
 */

/** 图形类型定义 */
export interface GraphicTypeInfo {
  id: string;
  name: string;
  icon: string;
  category: string;
  layoutType: string;
}

/** 风格参数 */
export interface StyleParams {
  maxDepth: number;
  maxBranches: number;
  style: string;
  layoutType: string;
  generateNotes: boolean;
  generateTags: boolean;
}

/** AI 输出格式定义（与提示词中的 JSON Schema 一致） */
export interface AiNodeOutput {
  id: string;
  text: string;
  depth?: number;
  shape: string;
  connectors: { inputs: number; outputs: number };
  icon: string;
  priority: string;
  progress: { value: number; style: string };
  tags: Array<string | { text: string; color: string }>;
  note: string;
  connections?: AiConnectionOutput[];
  children?: AiNodeOutput[];
}

export interface AiConnectionOutput {
  id: string;
  sourceId: string;
  targetId: string;
  sourceAnchor: { side: string; offset: number };
  targetAnchor: { side: string; offset: number };
  type: string;
  label: string;
  style: {
    color: string;
    width: number;
    dash: string;
    arrowStart: boolean;
    arrowEnd: boolean;
  };
}

export interface AiMindMapOutput {
  layoutType: string;
  style: string;
  centerTopic: AiNodeOutput;
  branches: AiNodeOutput[];
}

export interface AiErrorOutput {
  error: string;
  message: string;
  suggestion?: string;
  currentLimit?: number;
}

// ==================== 预设参数 ====================

export const GRAPHIC_TYPES: Array<{ category: string; types: GraphicTypeInfo[] }> = [
  {
    category: '🧠 思维导图',
    types: [
      { id: 'mindmap-radial', name: '放射型思维导图', icon: '🔵', category: 'mindmap', layoutType: 'radial' },
      { id: 'mindmap-symmetric', name: '左右对称导图', icon: '🟢', category: 'mindmap', layoutType: 'symmetric' },
      { id: 'mindmap-project', name: '项目拆解导图', icon: '🟠', category: 'mindmap', layoutType: 'radial' },
      { id: 'mindmap-study', name: '学习笔记导图', icon: '🟣', category: 'mindmap', layoutType: 'radial' },
      { id: 'mindmap-brainstorm', name: '头脑风暴导图', icon: '🟡', category: 'mindmap', layoutType: 'radial' },
    ],
  },
  {
    category: '📊 分析模型',
    types: [
      { id: 'swot', name: 'SWOT分析', icon: '🟠', category: 'analysis', layoutType: 'symmetric' },
      { id: 'fishbone', name: '鱼骨图', icon: '🟠', category: 'analysis', layoutType: 'fishbone' },
      { id: 'pest', name: 'PEST分析', icon: '🟠', category: 'analysis', layoutType: 'radial' },
      { id: '5w2h', name: '5W2H分析', icon: '🟠', category: 'analysis', layoutType: 'radial' },
    ],
  },
  {
    category: '🔄 业务流程',
    types: [
      { id: 'flowchart', name: '流程图', icon: '🟢', category: 'flow', layoutType: 'flowchart' },
      { id: 'swimlane', name: '泳道图', icon: '🟢', category: 'flow', layoutType: 'swimlane' },
      { id: 'sequence', name: '时序图', icon: '🟢', category: 'flow', layoutType: 'sequence' },
    ],
  },
  {
    category: '⏱ 时间管理',
    types: [
      { id: 'gantt', name: '甘特图', icon: '🟣', category: 'time', layoutType: 'gantt' },
      { id: 'timeline', name: '时间轴', icon: '🟣', category: 'time', layoutType: 'timeline' },
    ],
  },
  {
    category: '🏗 系统架构',
    types: [
      { id: 'orgchart', name: '组织架构图', icon: '⚪', category: 'arch', layoutType: 'org-structure' },
      { id: 'er', name: 'ER图', icon: '⚪', category: 'arch', layoutType: 'radial' },
    ],
  },
];

// ==================== 主系统提示词 ====================

export const SYSTEM_PROMPT = `
【角色定义】
你是MindFlow思维导图AI引擎。你的唯一任务是将用户的自然语言需求转化为一份携带完整编辑元数据的结构化思维导图JSON。这份JSON将被直接渲染到画布上，成为用户可编辑、可拖拽、可连线的原生导图节点。

【核心输出要求】
1. 必须输出合法JSON，不含任何解释性文字
2. 每个节点包含：文本、形状、图标、进度、优先级、标签、备注、连接点、连线
3. 层级深度：一级分支3-6个，总深度不超过4级
4. 所有节点文本简洁，每个不超过15个汉字
5. 所有id为唯一UUID格式

【标准输出格式】
{
  "layoutType": "radial",
  "style": "business",
  "centerTopic": {
    "id": "uuid",
    "text": "中心主题（≤15字）",
    "shape": "roundedRect",
    "connectors": {"inputs": 4, "outputs": 4},
    "icon": "🚀",
    "priority": "P1",
    "progress": {"value": 0, "style": "bar"},
    "tags": [],
    "note": ""
  },
  "branches": [
    {
      "id": "uuid",
      "text": "一级分支（≤15字）",
      "depth": 1,
      "shape": "roundedRect",
      "connectors": {"inputs": 2, "outputs": 2},
      "icon": "📋",
      "priority": "P1",
      "progress": {"value": 0, "style": "bar"},
      "tags": [],
      "note": "",
      "connections": [],
      "children": []
    }
  ]
}

【形状自动匹配规则】
根据节点文本语义，自动选择形状：
- 开始/启动/完成/结束 → "pill"
- 是否/判断/审核/验证/检查/审批 → "diamond"
- 文档/报告/方案/产出 → "parallelogram"
- 数据/存储/仓库/数据库 → "cylinder"
- 风险/警告/阻塞/问题 → "flag"
- 想法/灵感/头脑风暴/创意 → "cloud"
- 里程碑/交付/发布/上线 → "star"
- 人员/团队/部门 → "hexagon"
- 其他默认 → "roundedRect"

【图标自动匹配规则】
根据节点文本语义匹配emoji：
- 项目/计划/管理 → 🚀, 时间/进度/日程 → ⏰, 人员/团队/分工 → 👥
- 资金/预算/成本 → 💰, 风险/问题/阻塞 → ⚠️, 技术/开发/编程 → 💻
- 设计/创意/UI → 🎨, 测试/验证/检查 → 🔍, 文档/报告/方案 → 📄
- 目标/成果/指标 → 🎯, 沟通/会议/汇报 → 💬, 数据/分析/统计 → 📊
- 学习/教育/培训 → 📚, 市场/营销/销售 → 📈, 客户/用户/需求 → 🤝
- 安全/防护/加密 → 🔒

【优先级自动判断规则】
- 包含"核心/关键/必须/紧急/最重要" → "P0"
- 包含"重要/主要/次要" → "P1"
- 包含"一般/普通/可选" → "P2"
- 默认 → "P2"

【标签自动生成规则】
- 识别节点文本中的类别关键词，生成标签（颜色随机但不重复）
- 技术类：蓝色系，市场类：橙色系，财务类：绿色系，人力类：紫色系，风险类：红色系
- 每个节点最多3个标签

【备注自动生成规则】
对于抽象或概括性强的节点，自动生成简短备注（20-40字），解释具体含义或注意事项。

【连线自动生成规则】
1. 如果某节点下有两个子节点存在"通过/驳回"、"是/否"的关系，自动添加连线
2. 如果存在"依赖/前置/阻塞"关系，在connections中生成连线
3. 连线type：流程类用"elbow"，层级类用"curved"，平行关联用"straight"
4. 多个连线从同一侧出发时，自动错开offset（0.3, 0.5, 0.7）

【输出严格要求】
- 仅输出JSON，不要包含\`\`\`json标记或任何其他文本
- 确保JSON格式完全合法，可被JSON.parse解析
- 所有text字段不超过15个汉字
- 所有id字段为唯一UUID
`.trim();

// ==================== 增量修改提示词 ====================

export function buildIncrementalEditPrompt(currentJSON: string, userInput: string): string {
  return `
【当前画布状态】
已有导图数据：
${currentJSON}

【用户新指令】
${userInput}

【修改规则】
根据用户指令类型执行相应操作：
1. 指令包含"增加/添加/新增/加上" → 在指定位置插入新节点，返回完整JSON
2. 指令包含"删除/移除/去掉/不要" → 移除指定节点及其所有子节点，返回完整JSON
3. 指令包含"修改/改成/调整/换" → 仅修改指定节点的指定属性，保持结构和id不变
4. 指令包含"切换布局" → 修改layoutType字段，所有节点数据不变
5. 指令包含"换风格/换颜色/换主题" → 修改style字段，节点数据不变
6. 指令包含"加图标/加标签/加进度/加备注/加连线" → 修改对应节点的对应字段
7. 指令包含"连线/关联/依赖" → 在connections数组中添加新连线

【重要约束】
- 修改现有节点时，保持其原有id不变
- 新增节点时，生成新的UUID作为id
- 保持已有节点的其他属性不变，只修改指令涉及的字段
- 输出完整的更新后JSON（不是增量补丁），仅输出JSON
`.trim();
}

// ==================== 风格化提示词 ====================

export const STYLE_PRESETS: Record<string, string> = {
  business: `
【商务简约风格】
- 所有节点shape默认"roundedRect"
- 连线type默认"curved"，颜色#3B82F6，宽度2px
- 中心主题shape强制"roundedRect"，字体加粗
- 配色：白色背景，蓝色边框，无阴影
`.trim(),
  handdrawn: `
【手绘风格】
- 节点shape全部"roundedRect"
- 连线type强制"curved"，颜色暖色系（#E07B39），宽度2.5px
- 标签使用柔和的粉色/黄色/绿色
- 整体配色温暖轻松
`.trim(),
  dark: `
【深色模式】
- 节点背景深灰#1E293B，文字白色
- 连线颜色#94A3B8，宽度2px
- 中心主题有外发光效果
- 标签背景半透明
`.trim(),
  academic: `
【学术线条风格】
- 节点shape默认"rect"（直角矩形），无填充
- 连线type默认"straight"，颜色纯黑#000000，宽度1px
- 无阴影、无渐变，适合打印
`.trim(),
};

export function buildStylePrompt(style: string): string {
  const preset = STYLE_PRESETS[style] ?? STYLE_PRESETS['business'];
  return `
【风格参数注入】
当前选中风格：${style}
${preset}
在生成JSON时，将上述风格预设应用到所有节点的shape、连线的type和style字段中。
`.trim();
}

// ==================== 跨类型转换提示词 ====================

export function buildTypeConversionPrompt(
  currentJSON: string,
  targetType: string,
  targetTypeName: string
): string {
  const conversionRules: Record<string, string> = {
    flowchart: `
思维导图→流程图：
- centerTopic → 流程开始节点（shape: "pill"）
- 一级分支 → 主流程步骤（shape: "roundedRect"）
- 含判断语义的子节点 → 判断节点（shape: "diamond"）
- 含输出语义的子节点 → 输出节点（shape: "parallelogram"）
- 连线type统一改为"elbow"
- 判断节点的两个分支自动添加连线标签"是/否"
`.trim(),
    orgchart: `
思维导图→组织架构图：
- layoutType改为"orgchart"
- centerTopic → 根节点，居中顶部
- 一级分支 → 部门/模块，水平排列
- 子节点 → 岗位/子模块，逐级向下
- 连线type改为"elbow"
`.trim(),
    timeline: `
思维导图→时间轴：
- layoutType改为"timeline"
- 一级分支按从左到右排列（自动分配顺序）
- 子节点作为每个时间点的展开详情
- 节点shape改为"roundedRect"
- 连线type改为"elbow"
`.trim(),
    fishbone: `
思维导图→鱼骨图：
- layoutType改为"fishbone"
- centerTopic → 鱼头（问题/主题）
- 一级分支 → 鱼骨主干（主要原因）
- 子节点 → 细因
- 节点shape改为"roundedRect"
`.trim(),
    gantt: `
思维导图→甘特图：
- layoutType改为"gantt"
- 每个节点需包含startDate和endDate
- 按时间轴从左到右排列
`.trim(),
  };

  const rule = conversionRules[targetType] ?? '';
  return `
【图形类型转换】
当前数据类型：思维导图JSON
目标类型：${targetTypeName}
当前完整数据：${currentJSON}

【转换规则】
${rule}

输出转换后的完整JSON，仅输出JSON。
`.trim();
}

// ==================== 用户参数注入 ====================

export function buildUserParamsPrompt(params: StyleParams): string {
  return `
【用户自定义参数】
最大层级深度：${params.maxDepth}（范围2-5）
分支数量限制：${params.maxBranches}（范围2-10）
风格选择：${params.style}（business/handdrawn/dark/academic）
布局类型：${params.layoutType}（radial/symmetric/timeline/orgchart）
是否生成备注：${params.generateNotes}
是否生成标签：${params.generateTags}
`.trim();
}

// ==================== 错误处理提示词 ====================

export const ERROR_HANDLING_PROMPT = `
【错误处理规则】
1. 无法理解指令时返回：{"error":"unclear_intent","message":"抱歉，我没有完全理解你的需求。你可以尝试这样描述：'生成一个XX主题的思维导图，包含A、B、C三个分支'","suggestion":"试试更具体的描述，包含主题和分支名称"}
2. 输入内容为空时返回：{"error":"empty_input","message":"请描述你想要生成的思维导图内容，例如：'帮我做一个项目管理的思维导图'"}
3. 请求超出最大节点数限制时返回：{"error":"too_many_nodes","message":"你请求的节点数量超过了限制（最大50个）。请简化需求或分多次生成。","currentLimit":50}
`.trim();

// ==================== 组合完整提示词 ====================

export interface PromptContext {
  userInput: string;
  style: string;
  layoutType: string;
  maxDepth: number;
  maxBranches: number;
  generateNotes: boolean;
  generateTags: boolean;
  /** 如果是增量修改，提供当前画布的 JSON */
  currentMindMapJSON?: string;
  /** 如果是跨类型转换，提供目标类型 */
  targetType?: string;
  targetTypeName?: string;
}

export function buildFullPrompt(ctx: PromptContext): string {
  const parts: string[] = [SYSTEM_PROMPT];
  const isGraphicType = ctx.targetType && ctx.targetType !== 'mindmap-radial';

  if (isGraphicType) {
    parts.push('\n【当前图形类型】');
    const gt = GRAPHIC_TYPES.flatMap(g => g.types).find(t => t.id === ctx.targetType);
    if (gt) {
      parts.push(`当前选中的图形类型：${gt.name}（${gt.id}）`);
    }
  }

  // 构建图形类型特定规则
  if (ctx.targetType) {
    const typeRules = buildGraphicTypeRules(ctx.targetType);
    if (typeRules) parts.push(typeRules);
  }

  // 风格参数
  parts.push(buildStylePrompt(ctx.style));

  // 用户参数
  parts.push(buildUserParamsPrompt({
    maxDepth: ctx.maxDepth,
    maxBranches: ctx.maxBranches,
    style: ctx.style,
    layoutType: ctx.layoutType,
    generateNotes: ctx.generateNotes,
    generateTags: ctx.generateTags,
  }));

  // 增量修改
  if (ctx.currentMindMapJSON) {
    parts.push(buildIncrementalEditPrompt(ctx.currentMindMapJSON, ctx.userInput));
  }

  // 跨类型转换
  if (ctx.targetType && ctx.currentMindMapJSON && ctx.targetType !== 'mindmap-radial') {
    parts.push(buildTypeConversionPrompt(ctx.currentMindMapJSON, ctx.targetType, ctx.targetTypeName ?? ctx.targetType));
  }

  // 错误处理
  parts.push(ERROR_HANDLING_PROMPT);

  // 用户指令
  if (!ctx.currentMindMapJSON) {
    parts.push(`\n【用户当前指令】\n${ctx.userInput}`);
  }

  return parts.join('\n\n---\n\n');
}

function buildGraphicTypeRules(typeId: string): string {
  const rules: Record<string, string> = {
    'flowchart': `
流程图生成规则：
- 节点shape按语义匹配：开始/结束用pill，步骤用roundedRect，判断用diamond，输出用parallelogram
- 连线type统一用"elbow"
- layoutType设为"flowchart"
- 一级分支横向排列，判断节点产生分支
`.trim(),
    'sequence': `
时序图生成规则：
- 节点按时间从上到下排列
- 连线为带箭头的直线，标注交互内容
- layoutType设为"sequence"
`.trim(),
    'swimlane': `
泳道图生成规则：
- 一级分支作为泳道（横向或纵向）
- 每个泳道内节点独立排列
- 连线可在泳道间交叉
- layoutType设为"swimlane"
`.trim(),
    'orgchart': `
组织架构图生成规则：
- 根节点顶部居中
- 下级水平展开
- layoutType设为"orgchart"
`.trim(),
    'gantt': `
甘特图生成规则：
- 每个节点需包含startDate和endDate
- 按时间轴从左到右排列
- layoutType设为"gantt"
`.trim(),
    'timeline': `
时间轴生成规则：
- 一级分支按从左到右顺序排列
- 子节点作为展开详情
- 连线type改为"elbow"
- layoutType设为"timeline"
`.trim(),
  };
  return rules[typeId] ?? '';
}

// ==================== 图形类型 → 布局映射 ====================

export function graphicTypeToLayout(typeId: string): string {
  const gt = GRAPHIC_TYPES.flatMap(g => g.types).find(t => t.id === typeId);
  return gt?.layoutType ?? 'radial';
}
