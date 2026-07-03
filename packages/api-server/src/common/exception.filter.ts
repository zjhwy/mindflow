import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/api.types';

/**
 * 全局异常过滤器
 * 将所有异常转换为统一 ApiResponse 格式
 */
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code = 5000;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as any;
        message = resp.message ?? resp.error ?? exception.message;
        // 处理 class-validator 错误数组
        if (Array.isArray(resp.message)) {
          message = resp.message.join('; ');
        }
      }

      // 映射 HTTP 状态码
      switch (status) {
        case 400: code = 4000; break;
        case 401: code = 4001; break;
        case 403: code = 4003; break;
        case 404: code = 4004; break;
        case 409: code = 4009; break;
        case 422: code = 4022; break;
        case 429: code = 4029; break;
        default: code = 5000 + status;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `[${request.method}] ${request.url} → ${status} ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const body: ApiResponse<null> = {
      code,
      message,
      data: null,
      requestId: (request as any).id ?? '',
      timestamp: Date.now(),
    };

    response.status(status).json(body);
  }
}
