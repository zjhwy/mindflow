/** PromptBuilder - AI指令组装器 文档第2.5.2节 */
export class PromptBuilder {
  buildStructurePrompt(userInput: string): string {
    return `层级关键词识别：匹配首先/其次/第一/步骤/要点等结构化词汇自动划分节点深度。冗余过滤：自动剔除语气词和重复。语义聚类：合并主题一致的零散内容。空值过滤：自动去除空和重复节点。以下内容转换为JSON:${userInput}`;
  }
}
