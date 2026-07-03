import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * 请求 ID 中间件
 * 为每个请求生成唯一 ID 用于日志追踪
 */
export function requestIdMiddleware(req: any, res: any, next: () => void): void {
  req.id = req.headers['x-request-id'] ?? uuidv4();
  req.startTime = Date.now();

  // 响应头附加 request-id
  res.setHeader('X-Request-Id', req.id);

  // 记录请求日志
  const logger = new Logger('HTTP');
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
    } else {
      logger.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
    }
  });

  next();
}
