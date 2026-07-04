import { Module, Global } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * DatabaseModule - 数据持久化模块
 * 使用 Supabase REST API (supabase-js) 进行数据持久化
 */
@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class DatabaseModule {}
