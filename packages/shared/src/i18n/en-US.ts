/** English language pack */
export default {
  app: { name: 'MindFlow' },
  node: { defaultText: 'New Node', placeholder: 'Enter node content...' },
  toolbar: { undo: 'Undo', redo: 'Redo', indent: 'Indent', outdent: 'Outdent', fold: 'Fold', unfold: 'Unfold', delete: 'Delete' },
  view: { canvas: 'Tree', outline: 'Outline', gantt: 'Gantt', calendar: 'Calendar', kanban: 'Kanban' },
  security: { scanTip: 'Sensitive content detected' },
  ai: { generate: 'AI Generate', generateTip: 'AI-generated content for reference only, manual review required' },
} as const;
