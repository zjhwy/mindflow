export declare const locales: {
    readonly 'zh-CN': {
        readonly app: {
            readonly name: "思维导图增强版";
        };
        readonly node: {
            readonly defaultText: "新节点";
            readonly placeholder: "输入节点内容...";
        };
        readonly toolbar: {
            readonly undo: "撤销";
            readonly redo: "重做";
            readonly indent: "缩进";
            readonly outdent: "反向缩进";
            readonly fold: "折叠";
            readonly unfold: "展开";
            readonly delete: "删除";
        };
        readonly view: {
            readonly canvas: "树图";
            readonly outline: "大纲";
            readonly gantt: "甘特图";
            readonly calendar: "日历";
            readonly kanban: "看板";
        };
        readonly security: {
            readonly scanTip: "检测到敏感内容";
        };
        readonly ai: {
            readonly generate: "AI生成";
            readonly generateTip: "AI生成内容仅供参考，需人工审核确认";
        };
    };
    readonly 'en-US': {
        readonly app: {
            readonly name: "MindMap Enhanced";
        };
        readonly node: {
            readonly defaultText: "New Node";
            readonly placeholder: "Enter node content...";
        };
        readonly toolbar: {
            readonly undo: "Undo";
            readonly redo: "Redo";
            readonly indent: "Indent";
            readonly outdent: "Outdent";
            readonly fold: "Fold";
            readonly unfold: "Unfold";
            readonly delete: "Delete";
        };
        readonly view: {
            readonly canvas: "Tree";
            readonly outline: "Outline";
            readonly gantt: "Gantt";
            readonly calendar: "Calendar";
            readonly kanban: "Kanban";
        };
        readonly security: {
            readonly scanTip: "Sensitive content detected";
        };
        readonly ai: {
            readonly generate: "AI Generate";
            readonly generateTip: "AI-generated content for reference only, manual review required";
        };
    };
};
export type Locale = keyof typeof locales;
export declare function t(key: string, locale?: Locale): string;
//# sourceMappingURL=index.d.ts.map