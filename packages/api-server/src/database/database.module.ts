import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  UserEntity,
  DocumentEntity,
  RecycleItemEntity,
  SnapshotEntity,
  OperationLogEntity,
} from './entities';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'mindflow'),
        entities: [UserEntity, DocumentEntity, RecycleItemEntity, SnapshotEntity, OperationLogEntity],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging: config.get<string>('DB_LOGGING') === 'true',
        ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      DocumentEntity,
      RecycleItemEntity,
      SnapshotEntity,
      OperationLogEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
