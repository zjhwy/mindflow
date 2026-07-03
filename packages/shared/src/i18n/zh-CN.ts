/** 简体中文语言包 */
export default {
  app: { name: 'MindFlow' },
  node: { defaultText: '新节点', placeholder: '输入节点内容...' },
  toolbar: { undo: '撤销', redo: '重做', indent: '缩进', outdent: '反向缩进', fold: '折叠', unfold: '展开', delete: '删除' },
  view: { canvas: '树图', outline: '大纲', gantt: '甘特图', calendar: '日历', kanban: '看板' },
  security: { scanTip: '检测到敏感内容' },
  ai: { generate: 'AI生成', generateTip: 'AI生成内容仅供参考，需人工审核确认' },
} as const;
