import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
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
    DatabaseModule,
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
