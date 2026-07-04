import { Module, Global } from '@nestjs/common';

/**
 * DatabaseModule - 数据持久化模块
 *
 * 当前阶段：使用内存存储（Map），业务逻辑层不依赖 TypeORM。
 * TypeORM 的实体定义（entities/）保留以备将来切换到 PostgreSQL。
 *
 * TODO: 集成 Supabase REST API (supabase-js) 进行数据持久化
 */
@Global()
@Module({
  imports: [],
  exports: [],
})
export class DatabaseModule {}
