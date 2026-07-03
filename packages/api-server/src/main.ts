import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/response.interceptor';
import { AllExceptionFilter } from './common/exception.filter';
import { requestIdMiddleware } from './common/request-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // 全局中间件 (请求ID)
  app.use(requestIdMiddleware);

  // CORS 跨域
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  // API 前缀
  app.setGlobalPrefix('api/v1');

  // 全局管道 (DTO 验证)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // 过滤未声明的字段
      transform: true,       // 自动类型转换
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 全局响应拦截器 (统一包装)
  app.useGlobalInterceptors(new ResponseInterceptor());

  // 全局异常过滤器 (统一错误格式)
  app.useGlobalFilters(new AllExceptionFilter());

  const port = process.env.APP_PORT ?? 3000;
  await app.listen(port);

  Logger.log(`🚀 API Server 已启动: http://localhost:${port}`);
  Logger.log(`📡 WebSocket 协同网关: ws://localhost:${port}/collab`);
  Logger.log(`📖 API 文档基路径: /api/v1`);
}
bootstrap();
