/**
 * API Key Management REST Endpoints
 *
 * Routes for managing API keys:
 * - GET /api/keys - List API keys (shows prefix only, not full key)
 * - POST /api/keys - Create new API key (returns full key ONCE)
 * - PUT /api/keys/:id - Update key name/scopes
 * - DELETE /api/keys/:id - Revoke API key
 */

import { Router, Request, Response } from 'express';
import { getApiKeyManager, ApiKeyEnvironment } from '../auth/ApiKeyManager';
import { ApiKeyScope } from '../auth/ApiKeyStore';
import { requireApiKey, requireAdminScope } from '../middleware/auth';

const router = Router();

// ============================================
// Request Validation Helpers
// ============================================

function validateScopes(scopes: any): scopes is ApiKeyScope[] {
  if (!Array.isArray(scopes)) {
    return false;
  }

  const validScopes: ApiKeyScope[] = ['read', 'write', 'admin'];
  return scopes.every(scope => validScopes.includes(scope));
}

function validateEnvironment(env: any): env is ApiKeyEnvironment {
  return env === 'live' || env === 'test';
}

// ============================================
// Routes
// ============================================

/**
 * GET /api/keys
 * List all API keys
 *
 * Returns array of API keys with metadata (no full keys or hashes)
 */
router.get('/keys', requireApiKey, requireAdminScope, (req: Request, res: Response) => {
  try {
    const manager = getApiKeyManager();
    const keys = manager.list();

    res.json({
      success: true,
      data: keys,
    });
  } catch (error: any) {
    console.error('[API Keys] Error listing keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list API keys',
      message: error.message,
    });
  }
});

/**
 * GET /api/keys/active
 * List only active API keys
 */
router.get('/keys/active', requireApiKey, requireAdminScope, (req: Request, res: Response) => {
  try {
    const manager = getApiKeyManager();
    const keys = manager.listActive();

    res.json({
      success: true,
      data: keys,
    });
  } catch (error: any) {
    console.error('[API Keys] Error listing active keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list active API keys',
      message: error.message,
    });
  }
});

/**
 * GET /api/keys/:id
 * Get a specific API key by ID
 */
router.get('/keys/:id', requireApiKey, requireAdminScope, (req: Request, res: Response) => {
  try {
    const manager = getApiKeyManager();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const key = manager.getById(id);

    if (!key) {
      res.status(404).json({
        success: false,
        error: 'API key not found',
      });
      return;
    }

    res.json({
      success: true,
      data: key,
    });
  } catch (error: any) {
    console.error('[API Keys] Error getting key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API key',
      message: error.message,
    });
  }
});

/**
 * POST /api/keys
 * Create a new API key
 *
 * Body:
 * - name: string (required) - Human-readable name for the key
 * - scopes: ApiKeyScope[] (required) - Array of scopes: ['read', 'write', 'admin']
 * - environment: 'live' | 'test' (optional, defaults to 'live')
 *
 * Returns the full API key - THIS IS THE ONLY TIME IT WILL BE SHOWN
 */
router.post('/keys', requireApiKey, requireAdminScope, (req: Request, res: Response) => {
  try {
    const manager = getApiKeyManager();
    const { name, scopes, environment = 'live' } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid or missing "name" field. Must be a non-empty string.',
      });
      return;
    }

    // Validate scopes
    if (!validateScopes(scopes)) {
      res.status(400).json({
        success: false,
        error: 'Invalid "scopes" field. Must be an array containing: read, write, and/or admin.',
      });
      return;
    }

    if (scopes.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one scope is required.',
      });
      return;
    }

    // Validate environment
    if (!validateEnvironment(environment)) {
      res.status(400).json({
        success: false,
        error: 'Invalid "environment" field. Must be "live" or "test".',
      });
      return;
    }

    // Generate the key
    const generatedKey = manager.generate(name, scopes, environment);

    console.log(`[API Keys] Created new ${environment} key:`, {
      id: generatedKey.id,
      name: generatedKey.name,
      prefix: generatedKey.prefix,
      scopes: generatedKey.scopes,
    });

    res.status(201).json({
      success: true,
      data: generatedKey,
      warning: 'Save this API key now. You will not be able to see it again!',
    });
  } catch (error: any) {
    console.error('[API Keys] Error creating key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create API key',
      message: error.message,
    });
  }
});

/**
 * PUT /api/keys/:id
 * Update an API key's metadata
 *
 * Body:
 * - name: string (optional) - New name for the key
 * - scopes: ApiKeyScope[] (optional) - New scopes for the key
 */
router.put('/keys/:id', requireApiKey, requireAdminScope, (req: Request, res: Response) => {
  try {
    const manager = getApiKeyManager();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, scopes } = req.body;

    // Check if key exists
    const existingKey = manager.getById(id);
    if (!existingKey) {
      res.status(404).json({
        success: false,
        error: 'API key not found',
      });
      return;
    }

    // Validate updates
    const updates: { name?: string; scopes?: ApiKeyScope[] } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid "name" field. Must be a non-empty string.',
        });
        return;
      }
      updates.name = name;
    }

    if (scopes !== undefined) {
      if (!validateScopes(scopes)) {
        res.status(400).json({
          success: false,
          error: 'Invalid "scopes" field. Must be an array containing: read, write, and/or admin.',
        });
        return;
      }

      if (scopes.length === 0) {
        res.status(400).json({
          success: false,
          error: 'At least one scope is required.',
        });
        return;
      }

      updates.scopes = scopes;
    }

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        error: 'No updates provided. Specify "name" and/or "scopes".',
      });
      return;
    }

    // Perform the update
    const success = manager.update(id, updates);

    if (!success) {
      res.status(500).json({
        success: false,
        error: 'Failed to update API key',
      });
      return;
    }

    // Get the updated key
    const updatedKey = manager.getById(id);

    console.log(`[API Keys] Updated key ${id}:`, updates);

    res.json({
      success: true,
      data: updatedKey,
    });
  } catch (error: any) {
    console.error('[API Keys] Error updating key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update API key',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/keys/:id
 * Revoke (deactivate) an API key
 *
 * Note: This does not permanently delete the key from the database,
 * it just marks it as inactive. Use DELETE /api/keys/:id/permanent for permanent deletion.
 */
router.delete('/keys/:id', requireApiKey, requireAdminScope, (req: Request, res: Response) => {
  try {
    const manager = getApiKeyManager();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // Check if key exists
    const existingKey = manager.getById(id);
    if (!existingKey) {
      res.status(404).json({
        success: false,
        error: 'API key not found',
      });
      return;
    }

    // Revoke the key
    const success = manager.revoke(id);

    if (!success) {
      res.status(500).json({
        success: false,
        error: 'Failed to revoke API key',
      });
      return;
    }

    console.log(`[API Keys] Revoked key ${id} (${existingKey.name})`);

    res.json({
      success: true,
      message: 'API key revoked successfully',
      data: {
        id,
        name: existingKey.name,
        revokedAt: Date.now(),
      },
    });
  } catch (error: any) {
    console.error('[API Keys] Error revoking key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke API key',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/keys/:id/permanent
 * Permanently delete an API key from the database
 *
 * WARNING: This cannot be undone!
 */
router.delete('/keys/:id/permanent', requireApiKey, requireAdminScope, (req: Request, res: Response) => {
  try {
    const manager = getApiKeyManager();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // Check if key exists
    const existingKey = manager.getById(id);
    if (!existingKey) {
      res.status(404).json({
        success: false,
        error: 'API key not found',
      });
      return;
    }

    // Delete the key
    const success = manager.delete(id);

    if (!success) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete API key',
      });
      return;
    }

    console.log(`[API Keys] Permanently deleted key ${id} (${existingKey.name})`);

    res.json({
      success: true,
      message: 'API key permanently deleted',
      data: {
        id,
        name: existingKey.name,
        deletedAt: Date.now(),
      },
    });
  } catch (error: any) {
    console.error('[API Keys] Error deleting key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete API key',
      message: error.message,
    });
  }
});

/**
 * GET /api/keys/stats
 * Get statistics about API keys
 */
router.get('/keys-stats', requireApiKey, requireAdminScope, (req: Request, res: Response) => {
  try {
    const manager = getApiKeyManager();
    const stats = manager.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[API Keys] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API key statistics',
      message: error.message,
    });
  }
});

export default router;
