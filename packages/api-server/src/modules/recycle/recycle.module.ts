import { Module } from '@nestjs/common';
import { RecycleController } from './recycle.controller';
import { RecycleService } from './recycle.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RecycleController],
  providers: [RecycleService],
  exports: [RecycleService],
})
export class RecycleModule {}
