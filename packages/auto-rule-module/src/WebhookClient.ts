/**
 * 第三方Webhook客户端 - 文档第1.2节
 * 支持重试、超时、签名验证、批量发送
 */
import { createHmac } from 'crypto';

export interface WebhookConfig {
  url: string;
  secret?: string;
  timeout?: number;       // ms, default 10000
  maxRetries?: number;    // default 3
  retryDelay?: number;    // ms, backoff base, default 1000
  headers?: Record<string, string>;
}

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: number;
  ruleId?: string;
  signature?: string;
}

export interface WebhookResult {
  success: boolean;
  url: string;
  status?: number;
  response?: any;
  error?: string;
  retries: number;
  duration: number;
}

export class WebhookClient {
  private defaultTimeout = 10000;
  private defaultMaxRetries = 3;
  private defaultRetryDelay = 1000;

  /**
   * 发送单条 Webhook（带重试）
   */
  async send(
    url: string,
    data: Record<string, any>,
    options?: Partial<Pick<WebhookConfig, 'secret' | 'timeout' | 'maxRetries' | 'retryDelay' | 'headers'>>
  ): Promise<WebhookResult> {
    const startTime = Date.now();
    const maxRetries = options?.maxRetries ?? this.defaultMaxRetries;
    const timeout = options?.timeout ?? this.defaultTimeout;
    const retryDelay = options?.retryDelay ?? this.defaultRetryDelay;

    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'MindFlow-Rule-Engine/1.0',
          ...(options?.headers ?? {}),
        };

        // HMAC 签名（如果提供了 secret）
        if (options?.secret) {
          const timestamp = Date.now().toString();
          const payload = JSON.stringify(data);
          const signature = this.generateSignature(payload, timestamp, options.secret);
          headers['X-Signature'] = signature;
          headers['X-Timestamp'] = timestamp;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseBody = await response.text();
        let parsed: any;
        try {
          parsed = JSON.parse(responseBody);
        } catch {
          parsed = responseBody;
        }

        if (response.ok) {
          return {
            success: true,
            url,
            status: response.status,
            response: parsed,
            retries: attempt,
            duration: Date.now() - startTime,
          };
        }

        // 4xx 不重试（客户端错误）
        if (response.status >= 400 && response.status < 500 && attempt < maxRetries) {
          lastError = `HTTP ${response.status}: ${responseBody.substring(0, 200)}`;
          continue;
        }

        // 5xx 重试
        if (attempt < maxRetries) {
          lastError = `HTTP ${response.status}: ${responseBody.substring(0, 200)}`;
          await this.delay(retryDelay * Math.pow(2, attempt)); // 指数退避
          continue;
        }

        return {
          success: false,
          url,
          status: response.status,
          response: parsed,
          error: `HTTP ${response.status}: ${responseBody.substring(0, 200)}`,
          retries: attempt,
          duration: Date.now() - startTime,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);

        // 超时或网络错误可重试
        if (attempt < maxRetries) {
          await this.delay(retryDelay * Math.pow(2, attempt));
          continue;
        }
      }
    }

    return {
      success: false,
      url,
      error: lastError ?? '未知错误',
      retries: maxRetries,
      duration: Date.now() - startTime,
    };
  }

  /**
   * 批量发送 Webhook（并行）
   */
  async sendBatch(urls: Array<{ url: string; data: Record<string, any>; secret?: string }>): Promise<WebhookResult[]> {
    const results = await Promise.allSettled(
      urls.map(({ url, data, secret }) => this.send(url, data, { secret }))
    );

    return results.map((r, i) => {
      if (r.status === 'rejected') {
        return {
          success: false,
          url: urls[i].url,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
          retries: 0,
          duration: 0,
        };
      }
      return r.value;
    });
  }

  /**
   * 构造标准格式的 Webhook Payload
   */
  buildPayload(event: string, data: any, ruleId?: string): WebhookPayload {
    return {
      event,
      data,
      timestamp: Date.now(),
      ruleId,
    };
  }

  /**
   * 签名构造（带时间戳防重放）
   */
  generateSignature(payload: string, timestamp: string, secret: string): string {
    const message = `${timestamp}.${payload}`;
    return createHmac('sha256', secret).update(message).digest('hex');
  }

  /**
   * 验证收到的 Webhook 签名（供服务端使用）
   */
  verifySignature(payload: string, timestamp: string, signature: string, secret: string, maxAgeMs = 300000): boolean {
    // 防重放：检查时间戳是否在允许范围内
    const now = Date.now();
    const ts = Number(timestamp);
    if (isNaN(ts) || Math.abs(now - ts) > maxAgeMs) {
      return false;
    }

    const expected = this.generateSignature(payload, timestamp, secret);
    // 常量时间比较防时序攻击
    if (expected.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ (signature.charCodeAt(i) || 0);
    }
    return result === 0;
  }

  // ---- 工具方法 ----

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
