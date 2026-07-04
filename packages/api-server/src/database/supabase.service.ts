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

  isAvailable(): boolean {
    return this.client !== null;
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    return this.client;
  }

  // --- Users ---
  fromUsers() {
    return this.getClient().from('users');
  }

  // --- Refresh Tokens ---
  fromRefreshTokens() {
    return this.getClient().from('refresh_tokens');
  }

  // --- Documents ---
  fromDocuments() {
    return this.getClient().from('documents');
  }

  // --- Nodes ---
  fromNodes() {
    return this.getClient().from('nodes');
  }

  // --- Recycle ---
  fromRecycle() {
    return this.getClient().from('recycle_items');
  }

  // --- Snapshots ---
  fromSnapshots() {
    return this.getClient().from('snapshots');
  }

  // --- Operations Log ---
  fromOperationLogs() {
    return this.getClient().from('operation_logs');
  }
}
