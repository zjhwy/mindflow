import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@mindflow/shared';

/**
 * 统一响应包裹拦截器
 * 自动将控制器返回数据包装为标准 ApiResponse 格式
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => {
        // 已经是标准格式则不重复包裹
        if (data && typeof data === 'object' && 'code' in data && 'message' in data && 'data' in data) {
          return data;
        }

        return {
          code: 0,
          message: '操作成功',
          data,
          requestId: request.id ?? '',
          timestamp: Date.now(),
        };
      }),
    );
  }
}
