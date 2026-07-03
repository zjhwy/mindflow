/** ContentSecurityScan - 手动内容安全扫描 文档第4.3节 */
const DEFAULT_SENSITIVE_WORDS = ['违规词汇示例1', '违规词汇示例2'];
export class ContentSecurityScan {
  private sensitiveWords: string[];
  constructor(words?: string[]) { this.sensitiveWords = words ?? DEFAULT_SENSITIVE_WORDS; }
  scan(text: string): { safe: boolean; matchedWords: string[] } {
    const matched = this.sensitiveWords.filter(w => text.includes(w));
    return { safe: matched.length === 0, matchedWords: matched };
  }
  addWord(word: string) { this.sensitiveWords.push(word); }
}
