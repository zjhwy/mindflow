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
      useFactory: (config: ConfigService) => {
        const isSSL = config.get<string>('DB_SSL') === 'true';
        const host = config.get<string>('DB_HOST', 'localhost');
        // DB_SNI_HOST: Supabase 项目域名用于 TLS SNI 路由（不同于 DB_HOST 的连接地址）
        const sniHost = config.get<string>('DB_SNI_HOST', host);
        const sslConfig = isSSL
          ? {
              rejectUnauthorized: false,
              servername: sniHost,
            }
          : false;

        return {
          type: 'postgres',
          host,
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USER', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'postgres'),
          database: config.get<string>('DB_NAME', 'mindflow'),
          entities: [UserEntity, DocumentEntity, RecycleItemEntity, SnapshotEntity, OperationLogEntity],
          synchronize: config.get<string>('NODE_ENV') !== 'production',
          logging: config.get<string>('DB_LOGGING') === 'true',
          ssl: sslConfig,
          extra: isSSL ? {
            ssl: {
              rejectUnauthorized: false,
              servername: sniHost,
            },
          } : {},
        };
      },
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
