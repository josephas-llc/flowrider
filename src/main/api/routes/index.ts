/**
 * API Routes Index
 *
 * Central registration point for all API routes.
 * This file imports and registers all route modules with the Express app.
 */

import { Express } from 'express';
import docsRouter from './docs';
import projectsRouter from './projects';
import apiKeysRouter from './apikeys';
import { requireApiKey } from '../middleware/auth';

/**
 * Register all API routes with the Express app
 *
 * @param app - Express application instance
 */
export function registerRoutes(app: Express): void {
  // API Documentation (Swagger UI) - No authentication required
  // Accessible at: http://localhost:3737/api/docs
  app.use('/api/docs', docsRouter);

  // Apply authentication middleware to all routes below this point
  // This checks ApiConfig.apiKeyRequired and uses ApiKeyManager for validation
  app.use('/api', requireApiKey);

  // Project Management Routes (protected by authentication middleware)
  // - GET    /api/projects          - List all projects
  // - GET    /api/projects/:id      - Get project details
  // - POST   /api/projects          - Create new project
  // - PUT    /api/projects/:id      - Update project
  // - DELETE /api/projects/:id      - Delete project
  app.use('/api/projects', projectsRouter);

  // API Key Management Routes (protected by authentication + requires admin scope)
  // - GET    /api/keys              - List all API keys
  // - GET    /api/keys/active       - List active API keys
  // - GET    /api/keys/:id          - Get specific API key
  // - POST   /api/keys              - Create new API key (returns full key once)
  // - PUT    /api/keys/:id          - Update API key name/scopes
  // - DELETE /api/keys/:id          - Revoke API key
  // - DELETE /api/keys/:id/permanent - Permanently delete API key
  // - GET    /api/keys-stats        - Get API key usage statistics
  app.use('/api', apiKeysRouter);

  console.log('[API] Routes registered: /api/docs, /api/projects, /api/keys');
  console.log('[API] Authentication middleware enabled (conditional based on ApiConfig.apiKeyRequired)');
  console.log('[API] Documentation available at: http://localhost:3737/api/docs');
  console.log('[API] Note: Session and Webhook routes are available via IPC handlers');
}

/**
 * Get a summary of all registered routes
 */
export function getRouteSummary() {
  return {
    docs: {
      base: '/api/docs',
      description: 'Interactive API documentation (Swagger UI)',
      available: true,
      endpoints: {
        ui: 'GET /api/docs',
        json: 'GET /api/docs/openapi.json',
        yaml: 'GET /api/docs/openapi.yaml',
      },
    },
    projects: {
      base: '/api/projects',
      description: 'Manage project workspaces',
      available: true,
      endpoints: {
        list: 'GET /api/projects',
        get: 'GET /api/projects/:id',
        create: 'POST /api/projects',
        update: 'PUT /api/projects/:id',
        delete: 'DELETE /api/projects/:id',
      },
    },
    apiKeys: {
      base: '/api/keys',
      description: 'Manage API authentication keys (requires admin scope)',
      available: true,
      authentication: 'X-API-Key header or Authorization: Bearer header',
      scopes: ['admin'],
      endpoints: {
        list: 'GET /api/keys',
        listActive: 'GET /api/keys/active',
        get: 'GET /api/keys/:id',
        create: 'POST /api/keys',
        update: 'PUT /api/keys/:id',
        revoke: 'DELETE /api/keys/:id',
        deletePermanent: 'DELETE /api/keys/:id/permanent',
        stats: 'GET /api/keys-stats',
      },
    },
    health: {
      base: '/api/health',
      description: 'Health check and version info',
      available: true,
      endpoints: {
        health: 'GET /api/health',
        version: 'GET /api/version',
      },
    },
    sessions: {
      base: 'IPC: tmux:*',
      description: 'Manage AI terminal sessions (via IPC)',
      available: false,
      note: 'Session management is available via Electron IPC, not REST API. See OpenAPI spec for planned REST endpoints.',
    },
    webhooks: {
      base: 'IPC: webhooks:*',
      description: 'Manage webhook integrations (via IPC)',
      available: false,
      note: 'Webhook management is available via Electron IPC, not REST API. See OpenAPI spec for planned REST endpoints.',
    },
  };
}

export default registerRoutes;
