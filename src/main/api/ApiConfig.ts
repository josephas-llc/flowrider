/**
 * ApiConfig - Manages API server configuration
 *
 * Stores configuration in SQLite with defaults:
 * - Port: 3847
 * - Enabled: true (localhost only by default)
 * - Remote access: disabled by default
 * - API key: optional
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';

// ============================================
// Configuration Types
// ============================================

export interface ApiConfig {
  port: number;
  enabled: boolean;
  allowRemote: boolean;
  apiKeyRequired: boolean;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_API_CONFIG: ApiConfig = {
  port: 3847,
  enabled: true,
  allowRemote: false,
  apiKeyRequired: false,
};

// ============================================
// ApiConfigService - Manages API configuration
// ============================================

export class ApiConfigService {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    // Store in app's user data directory
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'flowrider-api-config.db');
    this.db = new Database(this.dbPath);
    this.initDatabase();
    this.ensureDefaultConfig();
  }

  /**
   * Initialize the database schema
   */
  private initDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        port INTEGER NOT NULL DEFAULT 3847,
        enabled INTEGER NOT NULL DEFAULT 1,
        allow_remote INTEGER NOT NULL DEFAULT 0,
        api_key_required INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_api_config_updated
        ON api_config(updated_at);
    `);

    console.log('[ApiConfig] Database initialized at:', this.dbPath);
  }

  /**
   * Ensure default configuration exists
   */
  private ensureDefaultConfig(): void {
    const stmt = this.db.prepare('SELECT id FROM api_config WHERE id = 1');
    const exists = stmt.get();

    if (!exists) {
      const insertStmt = this.db.prepare(`
        INSERT INTO api_config (id, port, enabled, allow_remote, api_key_required)
        VALUES (1, ?, ?, ?, ?)
      `);
      insertStmt.run(
        DEFAULT_API_CONFIG.port,
        DEFAULT_API_CONFIG.enabled ? 1 : 0,
        DEFAULT_API_CONFIG.allowRemote ? 1 : 0,
        DEFAULT_API_CONFIG.apiKeyRequired ? 1 : 0
      );
      console.log('[ApiConfig] Default configuration created');
    }
  }

  /**
   * Get current API configuration
   */
  getConfig(): ApiConfig {
    const stmt = this.db.prepare(`
      SELECT port, enabled, allow_remote, api_key_required
      FROM api_config
      WHERE id = 1
    `);
    const row = stmt.get() as any;

    if (!row) {
      return DEFAULT_API_CONFIG;
    }

    return {
      port: row.port,
      enabled: Boolean(row.enabled),
      allowRemote: Boolean(row.allow_remote),
      apiKeyRequired: Boolean(row.api_key_required),
    };
  }

  /**
   * Update API configuration
   */
  setConfig(config: Partial<ApiConfig>): void {
    const current = this.getConfig();
    const updated: ApiConfig = { ...current, ...config };

    // Auto-enable API key requirement when enabling remote access
    if (updated.allowRemote && !updated.apiKeyRequired) {
      updated.apiKeyRequired = true;
      console.log('[ApiConfig] Auto-enabled API key requirement for remote access');
    }

    const stmt = this.db.prepare(`
      UPDATE api_config
      SET port = ?,
          enabled = ?,
          allow_remote = ?,
          api_key_required = ?,
          updated_at = strftime('%s', 'now')
      WHERE id = 1
    `);

    stmt.run(
      updated.port,
      updated.enabled ? 1 : 0,
      updated.allowRemote ? 1 : 0,
      updated.apiKeyRequired ? 1 : 0
    );

    console.log('[ApiConfig] Configuration updated:', updated);
  }

  /**
   * Cleanup - close database connection
   */
  shutdown(): void {
    this.db.close();
    console.log('[ApiConfig] Database closed');
  }
}

// ============================================
// Singleton Instance
// ============================================

let apiConfigService: ApiConfigService | null = null;

export function getApiConfigService(): ApiConfigService {
  if (!apiConfigService) {
    apiConfigService = new ApiConfigService();
  }
  return apiConfigService;
}

export function shutdownApiConfigService(): void {
  if (apiConfigService) {
    apiConfigService.shutdown();
    apiConfigService = null;
  }
}
