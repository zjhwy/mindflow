/**
 * 本地测试 Mock 数据
 * 提供模拟的用户、文档、思维导图数据，用于脱离后端独立开发调试
 */
import type { InnerLine } from '@mindflow/shared';

// ========================= 模拟用户 =========================

export interface MockUser {
  userId: string;
  username: string;
  nickname: string;
  role: string;
  avatar?: string;
}

export const mockUser: MockUser = {
  userId: 'u_dev_001',
  username: 'devuser',
  nickname: '开发者',
  role: 'admin',
};

export const mockTokens = {
  accessToken: 'mock_access_token_dev',
  refreshToken: 'mock_refresh_token_dev',
};

// ========================= 模拟文档列表 =========================

export interface MockDocument {
  fileId: string;
  name: string;
  totalNodes: number;
  createdAt: number;
  updatedAt: number;
}

export const mockDocuments: MockDocument[] = [
  {
    fileId: 'doc_project_plan',
    name: '项目计划',
    totalNodes: 8,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 3600000,
  },
  {
    fileId: 'doc_meeting_notes',
    name: '周会纪要',
    totalNodes: 12,
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000,
  },
  {
    fileId: 'doc_knowledge_map',
    name: '前端知识体系',
    totalNodes: 25,
    createdAt: Date.now() - 86400000 * 14,
    updatedAt: Date.now() - 43200000,
  },
];

// ========================= 模拟思维导图数据 =========================

function makeLine(
  lineId: string,
  text: string,
  depth: number,
  parentLineId: string | null = null,
  childrenLineIds: string[] = [],
  collapsed = false,
  extraMeta: Partial<Record<string, any>> = {},
): InnerLine {
  return {
    lineId,
    text,
    depth,
    parentLineId,
    childrenLineIds,
    collapsed,
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'mock',
      ...extraMeta,
    },
  } as unknown as InnerLine;
}

/**
 * "项目计划" 导图数据
 */
export const mockProjectPlanLines: InnerLine[] = [
  makeLine('root_1', '2026 Q3 产品规划', 0, null, ['l1', 'l2', 'l3']),
  makeLine('l1', '用户增长', 1, 'root_1', ['l1_1', 'l1_2']),
  makeLine('l1_1', 'SEO 优化', 2, 'l1'),
  makeLine('l1_2', '社交媒体推广', 2, 'l1'),
  makeLine('l2', '功能迭代', 1, 'root_1', ['l2_1', 'l2_2', 'l2_3']),
  makeLine('l2_1', '实时协作', 2, 'l2'),
  makeLine('l2_2', 'Markdown导出', 2, 'l2'),
  makeLine('l2_3', '移动端适配', 2, 'l2', [], false, { priority: 3, isAiGenerated: true, aiGenerateTime: Date.now() }),
  makeLine('l3', '技术债偿还', 1, 'root_1', ['l3_1']),
  makeLine('l3_1', 'TypeScript 严格模式迁移', 2, 'l3'),
];

/**
 * "周会纪要" 导图数据
 */
export const mockMeetingNotesLines: InnerLine[] = [
  makeLine('root_m', '第26周例会', 0, null, ['m1', 'm2', 'm3']),
  makeLine('m1', '上周回顾', 1, 'root_m', ['m1_1', 'm1_2']),
  makeLine('m1_1', '发布 v2.3.0 完成', 2, 'm1'),
  makeLine('m1_2', '修复 4 个 P0 缺陷', 2, 'm1'),
  makeLine('m2', '本周计划', 1, 'root_m', ['m2_1', 'm2_2']),
  makeLine('m2_1', '性能优化专项', 2, 'm2'),
  makeLine('m2_2', '文档补全', 2, 'm2'),
  makeLine('m3', '待讨论事项', 1, 'root_m', ['m3_1', 'm3_2', 'm3_3']),
  makeLine('m3_1', '技术选型: 状态管理方案', 2, 'm3'),
  makeLine('m3_2', '上线时间节点确认', 2, 'm3'),
  makeLine('m3_3', '是否需要增加 Code Review 环节', 2, 'm3'),
];

/**
 * "前端知识体系" 导图数据
 */
export const mockKnowledgeMapLines: InnerLine[] = [
  makeLine('root_k', '前端知识体系', 0, null, ['k1', 'k2', 'k3', 'k4']),
  makeLine('k1', '基础', 1, 'root_k', ['k1_1', 'k1_2', 'k1_3']),
  makeLine('k1_1', 'HTML5 / CSS3', 2, 'k1'),
  makeLine('k1_2', 'JavaScript ES6+', 2, 'k1'),
  makeLine('k1_3', 'TypeScript', 2, 'k1'),
  makeLine('k2', '框架', 1, 'root_k', ['k2_1', 'k2_2', 'k2_3']),
  makeLine('k2_1', 'Vue 3 生态', 2, 'k2'),
  makeLine('k2_2', 'React 生态', 2, 'k2'),
  makeLine('k2_3', 'Next.js / Nuxt', 2, 'k2'),
  makeLine('k3', '工程化', 1, 'root_k', ['k3_1', 'k3_2', 'k3_3']),
  makeLine('k3_1', 'Webpack / Vite', 2, 'k3'),
  makeLine('k3_2', 'ESLint / Prettier', 2, 'k3'),
  makeLine('k3_3', 'CI/CD / Docker', 2, 'k3'),
  makeLine('k4', '进阶', 1, 'root_k', ['k4_1', 'k4_2']),
  makeLine('k4_1', '性能优化', 2, 'k4'),
  makeLine('k4_2', '设计模式', 2, 'k4'),
];

/** 按 fileId 索引的导图数据 */
export const mockLinesMap: Record<string, InnerLine[]> = {
  doc_project_plan: mockProjectPlanLines,
  doc_meeting_notes: mockMeetingNotesLines,
  doc_knowledge_map: mockKnowledgeMapLines,
};
