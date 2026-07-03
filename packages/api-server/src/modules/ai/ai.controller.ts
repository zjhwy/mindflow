import { Controller, Get, Post, Body, Req, UseGuards, HttpCode } from '@nestjs/common';
import { AiService } from './ai.service';
import { ApiResponse } from '../../shared/api.types';
import { JwtAuthGuard, Roles } from '../auth/auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
@Roles('admin', 'editor')
export class AiController {
  constructor(private readonly svc: AiService) {}

  /**
   * AI 生成思维导图
   */
  @Post('mind/generate')
  @HttpCode(200)
  async generate(
    @Body() body: { prompt: string; layout?: string },
    @Req() req: any,
  ): Promise<ApiResponse<any>> {
    const userId = req.user?.userId ?? 'default';
    if (!this.svc.checkRate(userId, 10, 60)) {
      return { code: 4001, message: 'AI 调用频率超限，请稍后再试', data: null, requestId: '', timestamp: Date.now() };
    }

    // 内容审核
    const audit = this.svc.auditContent(body.prompt);
    if (!audit.safe) {
      return { code: 4002, message: `内容审核未通过: ${audit.flags.join(', ')}`, data: null, requestId: '', timestamp: Date.now() };
    }

    const data = await this.svc.generate(body.prompt, body.layout);
    return this.ok(data);
  }

  /**
   * OCR 图片转思维导图
   */
  @Post('mind/ocr')
  @HttpCode(200)
  async ocr(@Body() body: { imageBase64: string }, @Req() req: any): Promise<ApiResponse<any>> {
    const userId = req.user?.userId ?? 'default';
    if (!this.svc.checkRate(userId, 5, 60)) {
      return { code: 4001, message: 'OCR 调用频率超限', data: null, requestId: '', timestamp: Date.now() };
    }
    return this.ok(await this.svc.generateOcr(body.imageBase64));
  }

  /**
   * AI 增强节点文本
   */
  @Post('mind/enhance')
  @HttpCode(200)
  async enhance(
    @Body() body: { lineId: string; mode: string; context?: string },
    @Req() req: any,
  ): Promise<ApiResponse<any>> {
    const userId = req.user?.userId ?? 'default';
    if (!this.svc.checkRate(userId, 20, 60)) {
      return { code: 4001, message: '增强调用频率超限', data: null, requestId: '', timestamp: Date.now() };
    }
    return this.ok(await this.svc.enhanceNode(body.lineId, body.mode, body.context));
  }

  /**
   * 布局推荐
   */
  @Post('mind/layout-recommend')
  @HttpCode(200)
  async recommend(@Body() body: { tags: string[] }): Promise<ApiResponse<any>> {
    return this.ok(await this.svc.recommendLayout(body.tags ?? []));
  }

  /**
   * 限流状态查询
   */
  @Get('rate-limit/status')
  async rateLimitStatus(@Req() req: any): Promise<ApiResponse<any>> {
    return this.ok(this.svc.getRateLimitStatus(req.user?.userId ?? 'default'));
  }

  /**
   * 内容审核检测
   */
  @Post('content/audit')
  @HttpCode(200)
  async auditContent(@Body() body: { text: string }): Promise<ApiResponse<any>> {
    return this.ok(this.svc.auditContent(body.text));
  }

  /**
   * 使用统计
   */
  @Get('usage/stats')
  async usageStats(@Req() req: any): Promise<ApiResponse<any>> {
    const userId = req.user?.userId ?? 'default';
    return this.ok({
      userId,
      totalCalls: this.svc.getTotalUsage(userId),
      rateLimit: this.svc.getRateLimitStatus(userId),
    });
  }

  private ok<T>(d: T): ApiResponse<T> {
    return { code: 0, message: '操作成功', data: d, requestId: '', timestamp: Date.now() };
  }
}
