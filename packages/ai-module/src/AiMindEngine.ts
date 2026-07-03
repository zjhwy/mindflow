/**
 * AiMindEngine - AI核心引擎
 * 文档第2.5节：各类AI生成能力统一调度
 */
import type { InnerLine, MindLayoutType, AiEnhanceMode } from '@mindflow/shared';

export interface IAiMindEngine {
  generateByText(prompt: string, layoutType: MindLayoutType): Promise<InnerLine[]>;
  streamGenerateByAudio(asrTextStream: string[]): Promise<void>;
  generateByImage(imageBase64: string): Promise<InnerLine[]>;
  enhanceNodeContent(lineId: string, mode: AiEnhanceMode): Promise<string>;
  recommendLayout(contentTags: string[]): MindLayoutType;
}

export class AiMindEngine implements IAiMindEngine {
  private apiEndpoint: string;
  private apiKey: string;

  constructor(endpoint: string, apiKey: string) {
    this.apiEndpoint = endpoint;
    this.apiKey = apiKey;
  }

  async generateByText(prompt: string, layoutType: MindLayoutType): Promise<InnerLine[]> {
    const structuredPrompt = this.buildMindMapPrompt(prompt, layoutType);
    const resp = await fetch(`${this.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: 'gpt-4', messages: [{ role: 'user', content: structuredPrompt }] }),
    });
    const json: any = await resp.json();
    return this.parseAIResponse(json.choices?.[0]?.message?.content ?? '[]');
  }

  async streamGenerateByAudio(asrTextStream: string[]): Promise<void> { /* 流式渲染 */ }

  async generateByImage(imageBase64: string): Promise<InnerLine[]> {
    return this.generateByText('OCR文字转导图', 'logic-left' as any);
  }

  async enhanceNodeContent(lineId: string, mode: AiEnhanceMode): Promise<string> {
    return `enhanced-${mode}-content`;
  }

  recommendLayout(contentTags: string[]): MindLayoutType {
    return contentTags.includes('timeline') ? 'timeline' as any : 'logic-left' as any;
  }

  /** 文档第2.5.2节：AI思维导图结构化Prompt组装 */
  buildMindMapPrompt(userPrompt: string, _layout: MindLayoutType): string {
    return `请将以下内容转换为标准思维导图节点结构化数据。必须严格遵循JSON格式输出：[{ "text": "节点文本", "depth": 0 }]。核心主题为depth:0根节点，子内容逐级递增depth。单个节点文本最大30字。仅输出纯净JSON数组。用户待结构化内容：${userPrompt}`;
  }

  private parseAIResponse(content: string): InnerLine[] {
    try {
      const arr = JSON.parse(content.trim());
      return arr.map((item: any, i: number) => ({
        lineId: `ai-${Date.now()}-${i}`,
        text: String(item.text ?? ''),
        depth: Math.max(0, Number(item.depth ?? 0)),
        collapsed: false,
        parentLineId: null,
        childrenLineIds: [],
        metadata: { createdAt: Date.now(), updatedAt: Date.now(), createdBy: 'ai', isAiGenerated: true, aiGenerateTime: Date.now(), priority: 0 },
      }));
    } catch { return []; }
  }
}
