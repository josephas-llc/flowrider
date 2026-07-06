/**
 * ApiKeyManager - Generate, validate, and manage API keys
 *
 * Features:
 * - Generate secure API keys (fr_live_xxxx or fr_test_xxxx)
 * - Store hashed keys (never store plaintext)
 * - Validate keys on each request
 * - Track usage (last used, request count)
 * - Support key scopes/permissions (read, write, admin)
 */

import * as crypto from 'crypto';
import { getApiKeyStore, ApiKeyScope, ApiKey } from './ApiKeyStore';

// ============================================
// Types
// ============================================

export type ApiKeyEnvironment = 'live' | 'test';

export interface GeneratedApiKey {
  id: string;
  key: string; // Full plaintext key (only shown once!)
  prefix: string;
  name: string;
  scopes: ApiKeyScope[];
  createdAt: number;
}

export interface ApiKeyInfo {
  id: string;
  prefix: string;
  name: string;
  scopes: ApiKeyScope[];
  createdAt: number;
  lastUsedAt: number | null;
  requestCount: number;
  isActive: boolean;
}

export interface ValidationResult {
  valid: boolean;
  key?: ApiKey;
  error?: string;
}

// ============================================
// ApiKeyManager Class
// ============================================

export class ApiKeyManager {
  private store = getApiKeyStore();

  // Key format constants
  private readonly KEY_PREFIX_LIVE = 'fr_live_';
  private readonly KEY_PREFIX_TEST = 'fr_test_';
  private readonly KEY_LENGTH = 32; // 32 bytes = 64 hex chars

  // ============================================
  // Key Generation
  // ============================================

  /**
   * Generate a new API key
   * Format: fr_live_<64 hex chars> or fr_test_<64 hex chars>
   */
  generate(
    name: string,
    scopes: ApiKeyScope[],
    environment: ApiKeyEnvironment = 'live'
  ): GeneratedApiKey {
    // Validate inputs
    if (!name || name.trim().length === 0) {
      throw new Error('API key name is required');
    }

    if (!scopes || scopes.length === 0) {
      throw new Error('At least one scope is required');
    }

    // Validate scopes
    const validScopes: ApiKeyScope[] = ['read', 'write', 'admin'];
    for (const scope of scopes) {
      if (!validScopes.includes(scope)) {
        throw new Error(`Invalid scope: ${scope}`);
      }
    }

    // Generate random bytes for the key
    const randomBytes = crypto.randomBytes(this.KEY_LENGTH);
    const randomHex = randomBytes.toString('hex');

    // Build the full key with prefix
    const prefix = environment === 'live' ? this.KEY_PREFIX_LIVE : this.KEY_PREFIX_TEST;
    const fullKey = `${prefix}${randomHex}`;

    // Hash the key for storage
    const keyHash = this.hashKey(fullKey);

    // Get the display prefix (first 12 chars)
    const displayPrefix = fullKey.substring(0, 12);

    // Store in database
    const apiKey = this.store.create({
      name: name.trim(),
      keyHash,
      prefix: displayPrefix,
      scopes,
    });

    return {
      id: apiKey.id,
      key: fullKey, // ONLY TIME THE FULL KEY IS RETURNED
      prefix: displayPrefix,
      name: apiKey.name,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
    };
  }

  // ============================================
  // Key Validation
  // ============================================

  /**
   * Validate an API key
   * Returns the key info if valid, or an error if invalid
   */
  validate(key: string): ValidationResult {
    // Check basic format
    if (!key || typeof key !== 'string') {
      return {
        valid: false,
        error: 'Invalid API key format',
      };
    }

    // Trim whitespace
    key = key.trim();

    // Check if it starts with correct prefix
    if (!key.startsWith(this.KEY_PREFIX_LIVE) && !key.startsWith(this.KEY_PREFIX_TEST)) {
      return {
        valid: false,
        error: 'Invalid API key prefix',
      };
    }

    // Hash the key
    const keyHash = this.hashKey(key);

    // Look up in database
    const apiKey = this.store.findByHash(keyHash);

    if (!apiKey) {
      return {
        valid: false,
        error: 'API key not found or has been revoked',
      };
    }

    if (!apiKey.isActive) {
      return {
        valid: false,
        error: 'API key has been revoked',
      };
    }

    // Track usage
    this.store.trackUsage(keyHash);

    return {
      valid: true,
      key: apiKey,
    };
  }

  /**
   * Check if a key has a specific scope
   */
  hasScope(key: ApiKey, requiredScope: ApiKeyScope): boolean {
    // Admin scope has all permissions
    if (key.scopes.includes('admin')) {
      return true;
    }

    // Write scope includes read permissions
    if (requiredScope === 'read' && key.scopes.includes('write')) {
      return true;
    }

    // Check for exact scope match
    return key.scopes.includes(requiredScope);
  }

  /**
   * Check if a key has any of the required scopes
   */
  hasAnyScope(key: ApiKey, requiredScopes: ApiKeyScope[]): boolean {
    return requiredScopes.some(scope => this.hasScope(key, scope));
  }

  // ============================================
  // Key Management
  // ============================================

  /**
   * List all API keys (returns safe info without hashes)
   */
  list(): ApiKeyInfo[] {
    const keys = this.store.listAll();
    return keys.map(key => this.toKeyInfo(key));
  }

  /**
   * List only active API keys
   */
  listActive(): ApiKeyInfo[] {
    const keys = this.store.listActive();
    return keys.map(key => this.toKeyInfo(key));
  }

  /**
   * Get API key by ID
   */
  getById(id: string): ApiKeyInfo | null {
    const key = this.store.findById(id);
    if (!key) return null;
    return this.toKeyInfo(key);
  }

  /**
   * Update API key metadata
   */
  update(id: string, updates: { name?: string; scopes?: ApiKeyScope[] }): boolean {
    // Validate scopes if provided
    if (updates.scopes) {
      const validScopes: ApiKeyScope[] = ['read', 'write', 'admin'];
      for (const scope of updates.scopes) {
        if (!validScopes.includes(scope)) {
          throw new Error(`Invalid scope: ${scope}`);
        }
      }

      if (updates.scopes.length === 0) {
        throw new Error('At least one scope is required');
      }
    }

    // Validate name if provided
    if (updates.name !== undefined && updates.name.trim().length === 0) {
      throw new Error('API key name cannot be empty');
    }

    return this.store.update(id, updates);
  }

  /**
   * Revoke (deactivate) an API key
   */
  revoke(id: string): boolean {
    return this.store.revoke(id);
  }

  /**
   * Permanently delete an API key
   */
  delete(id: string): boolean {
    return this.store.delete(id);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Hash an API key using SHA-256
   */
  private hashKey(key: string): string {
    return crypto
      .createHash('sha256')
      .update(key)
      .digest('hex');
  }

  /**
   * Convert ApiKey to safe ApiKeyInfo (without hash)
   */
  private toKeyInfo(key: ApiKey): ApiKeyInfo {
    return {
      id: key.id,
      prefix: key.prefix,
      name: key.name,
      scopes: key.scopes,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      requestCount: key.requestCount,
      isActive: key.isActive,
    };
  }

  /**
   * Get statistics about API keys
   */
  getStats() {
    return this.store.getStats();
  }
}

// ============================================
// Singleton Instance
// ============================================

let managerInstance: ApiKeyManager | null = null;

export function getApiKeyManager(): ApiKeyManager {
  if (!managerInstance) {
    managerInstance = new ApiKeyManager();
  }
  return managerInstance;
}
