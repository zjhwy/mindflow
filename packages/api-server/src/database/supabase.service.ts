import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClient | null = null;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    try {
      const url = this.configService.get<string>('SUPABASE_URL');
      const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

      if (!url || !key) {
        this.logger.warn('Supabase credentials not configured, running in memory-only mode');
        return;
      }

      this.client = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      this.logger.log(`Supabase client ready: ${url}`);
    } catch (err: any) {
      this.logger.warn(`Supabase init failed: ${err.message}. Running in memory-only mode.`);
    }
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
