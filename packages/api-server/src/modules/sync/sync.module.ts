import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SyncGateway } from './sync.gateway';

@Module({
  imports: [ConfigModule],
  providers: [SyncGateway],
  exports: [SyncGateway],
})
export class SyncModule {}
