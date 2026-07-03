import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiRateLimitRule {
  userId: string;
  count: number;
  windowStart: number;
  windowSeconds: number;
  limit: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private rateMap = new Map<string, AiRateLimitRule>();
  private totalQuotaMap = new Map<string, number>(); // userId -> 总调用次数

  constructor(private readonly config: ConfigService) {}

  // ==================== AI 生成 ====================

  /**
   * AI 生成思维导图结构
   * 实际环境调用 OpenAI / Claude API
   */
  async generate(prompt: string, layout?: string): Promise<any[]> {
    const apiKey = this.config.get<string>('AI_API_KEY');
    const useRealAPI = !!apiKey && apiKey !== 'your-api-key-here';

    if (useRealAPI) {
      try {
        return await this.callAIAPI(prompt, layout);
      } catch (err) {
        this.logger.error('AI API 调用失败, 使用模拟数据:', err);
      }
    }

    // 模拟 AI 生成结果
    return this.generateMock(prompt, layout);
  }

  private async callAIAPI(prompt: string, layout?: string): Promise<any[]> {
    const apiKey = this.config.get<string>('AI_API_KEY');
    const baseUrl = this.config.get<string>('AI_BASE_URL', 'https://api.openai.com/v1');
    const model = this.config.get<string>('AI_MODEL', 'gpt-4o-mini');

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `你是一个思维导图专家。根据用户主题生成思维导图的JSON结构。每行包含 text(文本), depth(层级0为根), children(子节点数组)。返回格式: [{ text: "根节点", depth: 0 }, { text: "子节点", depth: 1 }]`,
          },
          { role: 'user', content: `主题: ${prompt}${layout ? `, 布局: ${layout}` : ''}` },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API 返回错误: HTTP ${response.status}`);
    }

    const result: any = await response.json();
    const content = result.choices?.[0]?.message?.content ?? '[]';

    try {
      return JSON.parse(content);
    } catch {
      // 尝试从文本中提取 JSON
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error('无法解析 AI 返回结果');
    }
  }

  private generateMock(prompt: string, layout?: string): any[] {
    const topics = prompt.split(/[,，\s]+/).filter(Boolean);
    const nodes: any[] = [{ text: prompt.trim() || 'AI 生成思维导图', depth: 0 }];

    if (topics.length > 1) {
      topics.forEach((topic, i) => {
        if (i === 0) return; // 跳过已用的主题
        nodes.push({ text: topic.trim(), depth: 1 });
      });
    } else {
      // 默认生成分支
      nodes.push(
        { text: '核心概念', depth: 1 },
        { text: '应用场景', depth: 1 },
        { text: '技术原理', depth: 1 },
        { text: '发展趋势', depth: 1 },
        { text: '核心概念 - 定义', depth: 2 },
        { text: '核心概念 - 特征', depth: 2 },
        { text: '应用场景 - 案例1', depth: 2 },
        { text: '技术原理 - 基础架构', depth: 2 },
      );
    }

    return nodes;
  }

  // ==================== OCR 图片识别 ====================

  async generateOcr(imageBase64: string): Promise<any[]> {
    // 实际环境调用 OCR API (如 Azure Cognitive Services, Tesseract, PaddleOCR)
    this.logger.log(`OCR 请求, 图片大小: ${imageBase64.length} 字符`);

    // 模拟 OCR 结果
    return [
      { text: 'OCR 识别结果', depth: 0 },
      { text: '段落1: 检测到的文本内容', depth: 1 },
      { text: '段落2: 第二部分文本内容', depth: 1 },
      { text: '关键术语1', depth: 1 },
    ];
  }

  // ==================== 节点增强 ====================

  async enhanceNode(lineId: string, mode: string, context?: string): Promise<string> {
    const apiKey = this.config.get<string>('AI_API_KEY');

    if (apiKey && apiKey !== 'your-api-key-here') {
      try {
        return await this.callEnhanceAPI(context ?? lineId, mode);
      } catch (err) {
        this.logger.error('AI 增强失败:', err);
      }
    }

    // 模拟增强
    const templates: Record<string, string[]> = {
      expand: ['这是一个重要的知识点，涉及多个维度', '进一步细化: 这包括理论基础和实践应用两个方面'],
      polish: ['优化后的表述更加专业和清晰', '经过重新梳理，逻辑更加通顺'],
      simplify: ['简化理解: 核心要点概括', '一句话总结: 关键概念'],
      summarize: ['总结: 上文讲述了相关的核心概念和应用场景'],
      translate: ['Translated content in English', '译文: 这是翻译后的内容'],
    };

    const options = templates[mode] ?? ['处理后的文本内容'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private async callEnhanceAPI(content: string, mode: string): Promise<string> {
    const apiKey = this.config.get<string>('AI_API_KEY');
    const baseUrl = this.config.get<string>('AI_BASE_URL', 'https://api.openai.com/v1');
    const model = this.config.get<string>('AI_MODEL', 'gpt-4o-mini');

    const modePrompts: Record<string, string> = {
      expand: '请将以下内容展开为更详细的表述，增加细节和示例:',
      polish: '请润色以下文本，使其更加专业流畅:',
      simplify: '请将以下内容简化为易于理解的表述:',
      summarize: '请总结以下内容的要点:',
      translate: '请将以下内容翻译为英文:',
    };

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一个专业的文本处理助手。' },
          { role: 'user', content: `${modePrompts[mode] ?? '请处理以下文本:'}\n\n${content}` },
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    });

    const result: any = await response.json();
    return result.choices?.[0]?.message?.content ?? content;
  }

  // ==================== 布局推荐 ====================

  async recommendLayout(tags: string[]): Promise<{ recommended: string; reason: string; alternatives: string[] }> {
    // 基于标签的规则推荐
    const tagBasedLayouts: Record<string, string> = {
      '组织': 'org-structure',
      '流程': 'logic-right',
      '时间线': 'timeline',
      '原因分析': 'fishbone',
      '头脑风暴': 'free',
      '项目管理': 'gantt',
      '日程': 'calendar',
    };

    let recommended = 'logic-right';
    let reason = '默认推荐逻辑图布局';

    for (const [keyword, layout] of Object.entries(tagBasedLayouts)) {
      const found = tags.some((t) => t.includes(keyword));
      if (found) {
        recommended = layout;
        reason = `检测到 "${keyword}" 相关内容，推荐该布局`;
        break;
      }
    }

    return {
      recommended,
      reason,
      alternatives: ['logic-right', 'logic-left', 'org-structure'],
    };
  }

  // ==================== 限流 ====================

  checkRate(userId: string, limit = 5, windowSeconds = 60): boolean {
    const now = Date.now();
    const rule = this.rateMap.get(userId);

    if (!rule || now - rule.windowStart > rule.windowSeconds * 1000) {
      // 重置窗口
      this.rateMap.set(userId, {
        userId,
        count: 1,
        windowStart: now,
        windowSeconds,
        limit,
      });
      this.incrementTotalQuota(userId);
      return true;
    }

    if (rule.count >= rule.limit) {
      return false;
    }

    rule.count++;
    this.incrementTotalQuota(userId);
    return true;
  }

  getRateLimitStatus(userId: string): { remaining: number; limit: number; resetAt: number } {
    const rule = this.rateMap.get(userId);
    if (!rule) {
      return { remaining: 5, limit: 5, resetAt: Date.now() + 60000 };
    }
    return {
      remaining: Math.max(0, rule.limit - rule.count),
      limit: rule.limit,
      resetAt: rule.windowStart + rule.windowSeconds * 1000,
    };
  }

  private incrementTotalQuota(userId: string): void {
    const current = this.totalQuotaMap.get(userId) ?? 0;
    this.totalQuotaMap.set(userId, current + 1);
  }

  getTotalUsage(userId: string): number {
    return this.totalQuotaMap.get(userId) ?? 0;
  }

  // ==================== 内容审核 ====================

  /**
   * AI 内容审核 - 敏感词过滤
   */
  auditContent(text: string): { safe: boolean; flags: string[] } {
    const flags: string[] = [];

    // 简单的敏感词检测
    const sensitivePatterns = [
      { pattern: /(密码|口令)\s*[:：]\s*\S+/, reason: '可能包含密码信息' },
      { pattern: /\b(\d{15}|\d{18})\b/, reason: '可能包含身份证号' },
      { pattern: /\b1[3-9]\d{9}\b/, reason: '可能包含手机号' },
    ];

    for (const { pattern, reason } of sensitivePatterns) {
      if (pattern.test(text)) {
        flags.push(reason);
      }
    }

    return {
      safe: flags.length === 0,
      flags,
    };
  }
}
