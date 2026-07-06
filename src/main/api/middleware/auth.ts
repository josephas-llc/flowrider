/**
 * API Key Authentication Middleware
 *
 * Express middleware for validating API keys on REST endpoints.
 *
 * Features:
 * - Check for API key in header: X-API-Key or Authorization: Bearer
 * - Reject requests without valid key (401)
 * - Reject requests without proper scope (403)
 * - Attach key info to request for logging
 * - Conditional authentication based on ApiConfig.apiKeyRequired
 */

import { Request, Response, NextFunction } from 'express';
import { getApiKeyManager } from '../auth/ApiKeyManager';
import { ApiKeyScope, ApiKey } from '../auth/ApiKeyStore';
import { getApiConfigService } from '../ApiConfig';

// ============================================
// Type Extensions
// ============================================

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
    }
  }
}

// ============================================
// Middleware Functions
// ============================================

/**
 * Extract API key from request headers
 * Checks both X-API-Key and Authorization: Bearer headers
 */
function extractApiKey(req: Request): string | null {
  // Check X-API-Key header
  const xApiKey = req.headers['x-api-key'] as string;
  if (xApiKey) {
    return xApiKey.trim();
  }

  // Check Authorization header (Bearer token)
  const authHeader = req.headers['authorization'] as string;
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Main authentication middleware
 * Validates API key and attaches it to the request
 * Checks ApiConfig.apiKeyRequired to determine if authentication is needed
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const configService = getApiConfigService();
  const config = configService.getConfig();

  // If API key is not required, skip authentication
  if (!config.apiKeyRequired) {
    next();
    return;
  }

  const manager = getApiKeyManager();

  // Extract API key from headers
  const key = extractApiKey(req);

  if (!key) {
    res.status(401).json({
      success: false,
      error: 'Missing API key. Provide via X-API-Key header or Authorization: Bearer header.',
    });
    return;
  }

  // Validate the API key
  const validation = manager.validate(key);

  if (!validation.valid || !validation.key) {
    res.status(401).json({
      success: false,
      error: validation.error || 'Invalid API key',
    });
    return;
  }

  // Attach the API key to the request for use in route handlers
  req.apiKey = validation.key;

  next();
}

/**
 * Scope-based authorization middleware factory
 * Creates middleware that checks for specific scopes
 *
 * @param requiredScopes - One or more scopes required to access the endpoint
 */
export function requireScope(...requiredScopes: ApiKeyScope[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const manager = getApiKeyManager();

    // API key should already be attached by requireApiKey middleware
    if (!req.apiKey) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Use requireApiKey middleware first.',
      });
      return;
    }

    // Check if key has any of the required scopes
    const hasPermission = manager.hasAnyScope(req.apiKey, requiredScopes);

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`,
        requiredScopes,
        yourScopes: req.apiKey.scopes,
      });
      return;
    }

    next();
  };
}

/**
 * Convenience middleware for read-only endpoints
 */
export const requireReadScope = requireScope('read');

/**
 * Convenience middleware for write endpoints
 */
export const requireWriteScope = requireScope('write');

/**
 * Convenience middleware for admin endpoints
 */
export const requireAdminScope = requireScope('admin');

/**
 * Optional API key middleware
 * Attaches API key if present, but doesn't reject if missing
 * Useful for endpoints that have different behavior for authenticated vs unauthenticated requests
 */
export function optionalApiKey(req: Request, res: Response, next: NextFunction): void {
  const manager = getApiKeyManager();

  // Extract API key from headers
  const key = extractApiKey(req);

  if (!key) {
    // No API key provided - that's okay for optional auth
    next();
    return;
  }

  // Validate the API key if provided
  const validation = manager.validate(key);

  if (validation.valid && validation.key) {
    // Attach the API key to the request
    req.apiKey = validation.key;
  }
  // If invalid, we still continue (since it's optional)
  // but we don't attach the key

  next();
}

/**
 * Request logging middleware (logs authenticated requests)
 * Useful for debugging and auditing
 */
export function logApiRequest(req: Request, res: Response, next: NextFunction): void {
  if (req.apiKey) {
    console.log(`[API Request] ${req.method} ${req.path}`, {
      keyId: req.apiKey.id,
      keyName: req.apiKey.name,
      keyPrefix: req.apiKey.prefix,
      scopes: req.apiKey.scopes,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  next();
}
