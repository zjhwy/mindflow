import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client!: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>(
      'SUPABASE_URL',
    );
    const key = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!url || !key) {
      this.logger.warn(
        'Supabase URL or Service Role Key not configured, skipping client initialization',
      );
      return;
    }

    this.client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    this.logger.log(`Supabase client ready: ${url}`);
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  // --- Users ---
  fromUsers() {
    return this.client.from('users');
  }

  // --- Documents ---
  fromDocuments() {
    return this.client.from('documents');
  }

  // --- Nodes ---
  fromNodes() {
    return this.client.from('nodes');
  }

  // --- Recycle ---
  fromRecycle() {
    return this.client.from('recycle_items');
  }

  // --- Snapshots ---
  fromSnapshots() {
    return this.client.from('snapshots');
  }

  // --- Operations Log ---
  fromOperationLogs() {
    return this.client.from('operation_logs');
  }
}
