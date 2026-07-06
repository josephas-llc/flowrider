/**
 * ApiKeyStore - SQLite storage for API keys
 *
 * Stores API keys with metadata including:
 * - Hashed key values (never plaintext)
 * - Key metadata (name, scopes, creation date)
 * - Usage tracking (last used, request count)
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';

// ============================================
// Data Types
// ============================================

export type ApiKeyScope = 'read' | 'write' | 'admin';

export interface ApiKey {
  id: string;
  name: string;
  keyHash: string;
  prefix: string; // First 12 chars for display (e.g., "fr_live_abc1")
  scopes: ApiKeyScope[];
  createdAt: number;
  lastUsedAt: number | null;
  requestCount: number;
  isActive: boolean;
}

export interface ApiKeyCreateInput {
  name: string;
  keyHash: string;
  prefix: string;
  scopes: ApiKeyScope[];
}

// ============================================
// ApiKeyStore Class
// ============================================

export class ApiKeyStore {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    // Store in user data directory
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'flowrider-apikeys.db');
    this.db = new Database(this.dbPath);

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');

    this.initTables();
  }

  // ============================================
  // Database Initialization
  // ============================================

  private initTables(): void {
    // Create API keys table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        prefix TEXT NOT NULL,
        scopes TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_used_at INTEGER,
        request_count INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
      CREATE INDEX IF NOT EXISTS idx_api_keys_created ON api_keys(created_at DESC);
    `);
  }

  // ============================================
  // CRUD Operations
  // ============================================

  /**
   * Create a new API key
   */
  create(input: ApiKeyCreateInput): ApiKey {
    const id = crypto.randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO api_keys (id, name, key_hash, prefix, scopes, created_at, last_used_at, request_count, is_active)
      VALUES (?, ?, ?, ?, ?, ?, NULL, 0, 1)
    `);

    stmt.run(
      id,
      input.name,
      input.keyHash,
      input.prefix,
      JSON.stringify(input.scopes),
      now
    );

    return {
      id,
      name: input.name,
      keyHash: input.keyHash,
      prefix: input.prefix,
      scopes: input.scopes,
      createdAt: now,
      lastUsedAt: null,
      requestCount: 0,
      isActive: true,
    };
  }

  /**
   * Find API key by hash
   */
  findByHash(keyHash: string): ApiKey | null {
    const stmt = this.db.prepare(`
      SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1
    `);

    const row = stmt.get(keyHash) as any;
    if (!row) return null;

    return this.mapRowToApiKey(row);
  }

  /**
   * Find API key by ID
   */
  findById(id: string): ApiKey | null {
    const stmt = this.db.prepare(`
      SELECT * FROM api_keys WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return this.mapRowToApiKey(row);
  }

  /**
   * List all API keys (active and inactive)
   */
  listAll(): ApiKey[] {
    const stmt = this.db.prepare(`
      SELECT * FROM api_keys ORDER BY created_at DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToApiKey(row));
  }

  /**
   * List only active API keys
   */
  listActive(): ApiKey[] {
    const stmt = this.db.prepare(`
      SELECT * FROM api_keys WHERE is_active = 1 ORDER BY created_at DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToApiKey(row));
  }

  /**
   * Update API key metadata
   */
  update(id: string, updates: { name?: string; scopes?: ApiKeyScope[] }): boolean {
    const key = this.findById(id);
    if (!key) return false;

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fieldsToUpdate.push('name = ?');
      values.push(updates.name);
    }

    if (updates.scopes !== undefined) {
      fieldsToUpdate.push('scopes = ?');
      values.push(JSON.stringify(updates.scopes));
    }

    if (fieldsToUpdate.length === 0) return false;

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE api_keys SET ${fieldsToUpdate.join(', ')} WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * Revoke (deactivate) an API key
   */
  revoke(id: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE api_keys SET is_active = 0 WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Permanently delete an API key
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM api_keys WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Track API key usage
   */
  trackUsage(keyHash: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE api_keys
      SET last_used_at = ?, request_count = request_count + 1
      WHERE key_hash = ? AND is_active = 1
    `);

    const result = stmt.run(Date.now(), keyHash);
    return result.changes > 0;
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Map database row to ApiKey object
   */
  private mapRowToApiKey(row: any): ApiKey {
    return {
      id: row.id,
      name: row.name,
      keyHash: row.key_hash,
      prefix: row.prefix,
      scopes: JSON.parse(row.scopes),
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      requestCount: row.request_count,
      isActive: row.is_active === 1,
    };
  }

  /**
   * Get database statistics
   */
  getStats(): {
    totalKeys: number;
    activeKeys: number;
    totalRequests: number;
  } {
    const totalKeys = this.db.prepare('SELECT COUNT(*) as count FROM api_keys').get() as any;
    const activeKeys = this.db.prepare('SELECT COUNT(*) as count FROM api_keys WHERE is_active = 1').get() as any;
    const totalRequests = this.db.prepare('SELECT SUM(request_count) as total FROM api_keys').get() as any;

    return {
      totalKeys: totalKeys.count,
      activeKeys: activeKeys.count,
      totalRequests: totalRequests.total || 0,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// ============================================
// Singleton Instance
// ============================================

let storeInstance: ApiKeyStore | null = null;

export function getApiKeyStore(): ApiKeyStore {
  if (!storeInstance) {
    storeInstance = new ApiKeyStore();
  }
  return storeInstance;
}

export function closeApiKeyStore(): void {
  if (storeInstance) {
    storeInstance.close();
    storeInstance = null;
  }
}
