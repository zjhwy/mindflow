import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// 数据库（生产环境启用，开发环境可选）
// import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { NodesModule } from './modules/nodes/nodes.module';
import { SecurityModule } from './modules/security/security.module';
import { AiModule } from './modules/ai/ai.module';
import { RecycleModule } from './modules/recycle/recycle.module';
import { SnapshotModule } from './modules/snapshot/snapshot.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // DatabaseModule,  // 取消注释启用 PostgreSQL
    AuthModule,
    NodesModule,
    SecurityModule,
    AiModule,
    RecycleModule,
    SnapshotModule,
    SyncModule,
  ],
})
export class AppModule {}
