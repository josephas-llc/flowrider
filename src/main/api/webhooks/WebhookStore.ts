/**
 * WebhookStore - SQLite storage for webhooks and delivery history
 *
 * Manages persistent storage of:
 * - Webhook registrations (URL, events, secrets)
 * - Delivery history with status tracking
 * - Retry metadata
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { app, safeStorage } from 'electron';
import * as crypto from 'crypto';

// ============================================
// Data Types
// ============================================

export type WebhookEvent =
  | 'session.created'
  | 'session.completed'
  | 'session.error'
  | 'session.output'
  | 'project.created'
  | 'project.updated';

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string | null; // For HMAC-SHA256 signing
  active: boolean;
  createdAt: number;
  updatedAt: number;
  description: string | null;
  metadata: Record<string, any>; // Additional user metadata
}

export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, any>;
  status: DeliveryStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: number | null;
  nextRetryAt: number | null;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  createdAt: number;
  completedAt: number | null;
  duration: number | null; // milliseconds
}

export interface WebhookStats {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageDeliveryTime: number;
  deliveriesByEvent: Record<WebhookEvent, number>;
}

// ============================================
// WebhookStore Class
// ============================================

export class WebhookStore {
  private db: Database.Database;
  private dbPath: string;
  private migrationCompleted: boolean = false;

  constructor(customPath?: string) {
    if (customPath) {
      this.dbPath = customPath;
    } else {
      const userDataPath = app.getPath('userData');
      this.dbPath = path.join(userDataPath, 'webhooks.db');
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL'); // Better concurrency
    this.initTables();
    this.migrateExistingSecrets();
  }

  private initTables(): void {
    // Webhooks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        events TEXT NOT NULL, -- JSON array of event names
        secret TEXT, -- ENCRYPTED secret (base64-encoded encrypted data)
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        description TEXT,
        metadata TEXT -- JSON object
      );

      CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
      CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON webhooks(created_at);
    `);

    // Deliveries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id TEXT PRIMARY KEY,
        webhook_id TEXT NOT NULL,
        event TEXT NOT NULL,
        payload TEXT NOT NULL, -- JSON payload
        status TEXT NOT NULL, -- pending, success, failed, retrying
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        last_attempt_at INTEGER,
        next_retry_at INTEGER,
        response_status INTEGER,
        response_body TEXT,
        error_message TEXT,
        created_at INTEGER NOT NULL,
        completed_at INTEGER,
        duration INTEGER,
        FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_deliveries_webhook_id ON webhook_deliveries(webhook_id);
      CREATE INDEX IF NOT EXISTS idx_deliveries_status ON webhook_deliveries(status);
      CREATE INDEX IF NOT EXISTS idx_deliveries_event ON webhook_deliveries(event);
      CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON webhook_deliveries(created_at);
      CREATE INDEX IF NOT EXISTS idx_deliveries_next_retry ON webhook_deliveries(next_retry_at);
    `);
  }

  // ============================================
  // Secret Encryption/Decryption
  // ============================================

  /**
   * Encrypts a webhook secret using Electron's safeStorage
   * @param secret - The plaintext secret to encrypt
   * @returns Base64-encoded encrypted secret
   * @throws Error if encryption is not available
   */
  private encryptSecret(secret: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Secure storage not available');
    }
    const encrypted = safeStorage.encryptString(secret);
    return encrypted.toString('base64');
  }

  /**
   * Decrypts a webhook secret using Electron's safeStorage
   * @param encryptedSecret - Base64-encoded encrypted secret
   * @returns Decrypted plaintext secret
   * @throws Error if encryption is not available
   */
  private decryptSecret(encryptedSecret: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Secure storage not available');
    }
    const buffer = Buffer.from(encryptedSecret, 'base64');
    return safeStorage.decryptString(buffer);
  }

  /**
   * Checks if a secret appears to be encrypted (base64-encoded)
   * @param secret - The secret to check
   * @returns true if the secret appears to be encrypted
   */
  private isSecretEncrypted(secret: string): boolean {
    // Check if the string is valid base64
    // Encrypted secrets will be base64-encoded and typically longer
    try {
      const decoded = Buffer.from(secret, 'base64').toString('base64');
      return decoded === secret && secret.length > 40; // Encrypted data is typically longer
    } catch {
      return false;
    }
  }

  /**
   * Migrates existing plaintext secrets to encrypted format
   * This runs once on initialization to encrypt any legacy plaintext secrets
   */
  private migrateExistingSecrets(): void {
    if (this.migrationCompleted) {
      return;
    }

    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('Secure storage not available - skipping secret migration');
      this.migrationCompleted = true;
      return;
    }

    try {
      // Get all webhooks with secrets
      const stmt = this.db.prepare('SELECT id, secret FROM webhooks WHERE secret IS NOT NULL');
      const rows = stmt.all() as Array<{ id: string; secret: string }>;

      let migratedCount = 0;

      for (const row of rows) {
        // Skip if already encrypted
        if (this.isSecretEncrypted(row.secret)) {
          continue;
        }

        // Encrypt the plaintext secret
        const encryptedSecret = this.encryptSecret(row.secret);

        // Update the database with the encrypted secret
        const updateStmt = this.db.prepare('UPDATE webhooks SET secret = ? WHERE id = ?');
        updateStmt.run(encryptedSecret, row.id);

        migratedCount++;
      }

      if (migratedCount > 0) {
        console.log(`Migrated ${migratedCount} webhook secret(s) to encrypted format`);
      }

      this.migrationCompleted = true;
    } catch (error) {
      console.error('Error migrating webhook secrets:', error);
      // Don't throw - allow the app to continue even if migration fails
      this.migrationCompleted = true;
    }
  }

  // ============================================
  // Webhook CRUD Operations
  // ============================================

  createWebhook(
    url: string,
    events: WebhookEvent[],
    options: {
      secret?: string;
      description?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Webhook {
    const id = crypto.randomUUID();
    const now = Date.now();

    // Encrypt the secret before storing (if provided)
    const encryptedSecret = options.secret ? this.encryptSecret(options.secret) : null;

    const webhook: Webhook = {
      id,
      url,
      events,
      secret: options.secret || null, // Return plaintext in the object
      active: true,
      createdAt: now,
      updatedAt: now,
      description: options.description || null,
      metadata: options.metadata || {},
    };

    const stmt = this.db.prepare(`
      INSERT INTO webhooks (id, url, events, secret, active, created_at, updated_at, description, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      webhook.id,
      webhook.url,
      JSON.stringify(webhook.events),
      encryptedSecret, // Store encrypted secret
      webhook.active ? 1 : 0,
      webhook.createdAt,
      webhook.updatedAt,
      webhook.description,
      JSON.stringify(webhook.metadata)
    );

    return webhook;
  }

  getWebhook(id: string): Webhook | null {
    const stmt = this.db.prepare('SELECT * FROM webhooks WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.rowToWebhook(row);
  }

  listWebhooks(options: { active?: boolean } = {}): Webhook[] {
    let query = 'SELECT * FROM webhooks';
    const params: any[] = [];

    if (options.active !== undefined) {
      query += ' WHERE active = ?';
      params.push(options.active ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.rowToWebhook(row));
  }

  updateWebhook(
    id: string,
    updates: {
      url?: string;
      events?: WebhookEvent[];
      secret?: string;
      active?: boolean;
      description?: string;
      metadata?: Record<string, any>;
    }
  ): boolean {
    const webhook = this.getWebhook(id);
    if (!webhook) return false;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.url !== undefined) {
      fields.push('url = ?');
      values.push(updates.url);
    }
    if (updates.events !== undefined) {
      fields.push('events = ?');
      values.push(JSON.stringify(updates.events));
    }
    if (updates.secret !== undefined) {
      fields.push('secret = ?');
      // Encrypt the secret before storing (if provided)
      const encryptedSecret = updates.secret ? this.encryptSecret(updates.secret) : null;
      values.push(encryptedSecret);
    }
    if (updates.active !== undefined) {
      fields.push('active = ?');
      values.push(updates.active ? 1 : 0);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = ?');
    values.push(Date.now());

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE webhooks SET ${fields.join(', ')} WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteWebhook(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM webhooks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ============================================
  // Delivery Operations
  // ============================================

  createDelivery(
    webhookId: string,
    event: WebhookEvent,
    payload: Record<string, any>,
    maxAttempts: number = 3
  ): WebhookDelivery {
    const id = crypto.randomUUID();
    const now = Date.now();

    const delivery: WebhookDelivery = {
      id,
      webhookId,
      event,
      payload,
      status: 'pending',
      attempts: 0,
      maxAttempts,
      lastAttemptAt: null,
      nextRetryAt: null,
      responseStatus: null,
      responseBody: null,
      errorMessage: null,
      createdAt: now,
      completedAt: null,
      duration: null,
    };

    const stmt = this.db.prepare(`
      INSERT INTO webhook_deliveries (
        id, webhook_id, event, payload, status, attempts, max_attempts,
        last_attempt_at, next_retry_at, response_status, response_body,
        error_message, created_at, completed_at, duration
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      delivery.id,
      delivery.webhookId,
      delivery.event,
      JSON.stringify(delivery.payload),
      delivery.status,
      delivery.attempts,
      delivery.maxAttempts,
      delivery.lastAttemptAt,
      delivery.nextRetryAt,
      delivery.responseStatus,
      delivery.responseBody,
      delivery.errorMessage,
      delivery.createdAt,
      delivery.completedAt,
      delivery.duration
    );

    return delivery;
  }

  getDelivery(id: string): WebhookDelivery | null {
    const stmt = this.db.prepare('SELECT * FROM webhook_deliveries WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.rowToDelivery(row);
  }

  listDeliveries(
    webhookId?: string,
    options: {
      limit?: number;
      offset?: number;
      status?: DeliveryStatus;
    } = {}
  ): WebhookDelivery[] {
    let query = 'SELECT * FROM webhook_deliveries';
    const params: any[] = [];
    const conditions: string[] = [];

    if (webhookId) {
      conditions.push('webhook_id = ?');
      params.push(webhookId);
    }

    if (options.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.rowToDelivery(row));
  }

  updateDelivery(
    id: string,
    updates: {
      status?: DeliveryStatus;
      attempts?: number;
      lastAttemptAt?: number;
      nextRetryAt?: number;
      responseStatus?: number;
      responseBody?: string;
      errorMessage?: string;
      completedAt?: number;
      duration?: number;
    }
  ): boolean {
    const delivery = this.getDelivery(id);
    if (!delivery) return false;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.attempts !== undefined) {
      fields.push('attempts = ?');
      values.push(updates.attempts);
    }
    if (updates.lastAttemptAt !== undefined) {
      fields.push('last_attempt_at = ?');
      values.push(updates.lastAttemptAt);
    }
    if (updates.nextRetryAt !== undefined) {
      fields.push('next_retry_at = ?');
      values.push(updates.nextRetryAt);
    }
    if (updates.responseStatus !== undefined) {
      fields.push('response_status = ?');
      values.push(updates.responseStatus);
    }
    if (updates.responseBody !== undefined) {
      fields.push('response_body = ?');
      values.push(updates.responseBody);
    }
    if (updates.errorMessage !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.errorMessage);
    }
    if (updates.completedAt !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completedAt);
    }
    if (updates.duration !== undefined) {
      fields.push('duration = ?');
      values.push(updates.duration);
    }

    if (fields.length === 0) return false;

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE webhook_deliveries SET ${fields.join(', ')} WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  getPendingRetries(): WebhookDelivery[] {
    const now = Date.now();
    const stmt = this.db.prepare(`
      SELECT * FROM webhook_deliveries
      WHERE status IN ('pending', 'retrying')
        AND (next_retry_at IS NULL OR next_retry_at <= ?)
        AND attempts < max_attempts
      ORDER BY next_retry_at ASC
    `);

    const rows = stmt.all(now) as any[];
    return rows.map(row => this.rowToDelivery(row));
  }

  // ============================================
  // Statistics
  // ============================================

  getStats(): WebhookStats {
    const totalWebhooks = this.db.prepare('SELECT COUNT(*) as count FROM webhooks').get() as any;
    const activeWebhooks = this.db.prepare('SELECT COUNT(*) as count FROM webhooks WHERE active = 1').get() as any;
    const totalDeliveries = this.db.prepare('SELECT COUNT(*) as count FROM webhook_deliveries').get() as any;
    const successfulDeliveries = this.db.prepare('SELECT COUNT(*) as count FROM webhook_deliveries WHERE status = "success"').get() as any;
    const failedDeliveries = this.db.prepare('SELECT COUNT(*) as count FROM webhook_deliveries WHERE status = "failed"').get() as any;

    const avgDuration = this.db.prepare(`
      SELECT AVG(duration) as avg FROM webhook_deliveries WHERE duration IS NOT NULL
    `).get() as any;

    const deliveriesByEvent = this.db.prepare(`
      SELECT event, COUNT(*) as count FROM webhook_deliveries GROUP BY event
    `).all() as any[];

    const deliveriesByEventMap: Record<WebhookEvent, number> = {} as any;
    deliveriesByEvent.forEach((row: any) => {
      deliveriesByEventMap[row.event as WebhookEvent] = row.count;
    });

    return {
      totalWebhooks: totalWebhooks.count,
      activeWebhooks: activeWebhooks.count,
      totalDeliveries: totalDeliveries.count,
      successfulDeliveries: successfulDeliveries.count,
      failedDeliveries: failedDeliveries.count,
      averageDeliveryTime: avgDuration.avg || 0,
      deliveriesByEvent: deliveriesByEventMap,
    };
  }

  // ============================================
  // Cleanup
  // ============================================

  deleteOldDeliveries(olderThanDays: number = 30): number {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const stmt = this.db.prepare('DELETE FROM webhook_deliveries WHERE created_at < ?');
    const result = stmt.run(cutoffTime);
    return result.changes;
  }

  // ============================================
  // Helper Methods
  // ============================================

  private rowToWebhook(row: any): Webhook {
    // Decrypt the secret when retrieving from database
    let decryptedSecret: string | null = null;
    if (row.secret) {
      try {
        decryptedSecret = this.decryptSecret(row.secret);
      } catch (error) {
        console.error('Error decrypting webhook secret:', error);
        // If decryption fails, treat as null secret
        decryptedSecret = null;
      }
    }

    return {
      id: row.id,
      url: row.url,
      events: JSON.parse(row.events),
      secret: decryptedSecret,
      active: row.active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    };
  }

  private rowToDelivery(row: any): WebhookDelivery {
    return {
      id: row.id,
      webhookId: row.webhook_id,
      event: row.event,
      payload: JSON.parse(row.payload),
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      lastAttemptAt: row.last_attempt_at,
      nextRetryAt: row.next_retry_at,
      responseStatus: row.response_status,
      responseBody: row.response_body,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      duration: row.duration,
    };
  }

  // ============================================
  // Database Management
  // ============================================

  close(): void {
    this.db.close();
  }

  getDbPath(): string {
    return this.dbPath;
  }
}

// ============================================
// Singleton Instance
// ============================================

let webhookStoreInstance: WebhookStore | null = null;

export function getWebhookStore(): WebhookStore {
  if (!webhookStoreInstance) {
    webhookStoreInstance = new WebhookStore();
  }
  return webhookStoreInstance;
}

export function shutdownWebhookStore(): void {
  if (webhookStoreInstance) {
    webhookStoreInstance.close();
    webhookStoreInstance = null;
  }
}
