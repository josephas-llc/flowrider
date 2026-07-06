/**
 * Example Express Server with API Key Authentication
 *
 * This is an example of how to set up an Express server with the API key authentication system.
 * You can adapt this to your Electron app's REST API needs.
 *
 * Usage:
 * 1. Import this in your main.ts or create a separate API server
 * 2. Call createApiServer() to get an Express app
 * 3. Start listening on a port
 */

import express, { Express, Request, Response } from 'express';
import apiKeyRoutes from './routes/apikeys';
import {
  requireApiKey,
  requireReadScope,
  requireWriteScope,
  requireAdminScope,
  logApiRequest,
} from './middleware/auth';

/**
 * Create and configure the Express API server
 */
export function createApiServer(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Enable CORS if needed (adjust for your security requirements)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Change '*' to specific origin in production
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Health check endpoint (no auth required)
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: Date.now(),
    });
  });

  // API Key Management Routes (requires admin scope)
  // Mount at /api
  app.use('/api', apiKeyRoutes);

  // ============================================
  // Example Protected Routes
  // ============================================

  // Public endpoint (no authentication)
  app.get('/api/public', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'This is a public endpoint',
    });
  });

  // Read-only endpoint (requires 'read' scope)
  app.get('/api/sessions', requireApiKey, requireReadScope, logApiRequest, (req: Request, res: Response) => {
    res.json({
      success: true,
      data: [
        { id: 1, name: 'Session 1' },
        { id: 2, name: 'Session 2' },
      ],
      message: 'List of sessions (read-only)',
    });
  });

  // Write endpoint (requires 'write' scope)
  app.post('/api/sessions', requireApiKey, requireWriteScope, logApiRequest, (req: Request, res: Response) => {
    const { name } = req.body;

    res.json({
      success: true,
      data: { id: 3, name },
      message: 'Session created',
    });
  });

  // Admin endpoint (requires 'admin' scope)
  app.delete('/api/sessions/:id', requireApiKey, requireAdminScope, logApiRequest, (req: Request, res: Response) => {
    const { id } = req.params;

    res.json({
      success: true,
      message: `Session ${id} deleted (admin action)`,
    });
  });

  // ============================================
  // Error Handling
  // ============================================

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.path,
    });
  });

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('[API Error]', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: err.message,
    });
  });

  return app;
}

/**
 * Start the API server on a specific port
 *
 * Example usage:
 * ```typescript
 * import { startApiServer } from './api/server.example';
 *
 * const server = startApiServer(3000);
 * console.log('API server running on port 3000');
 * ```
 */
export function startApiServer(port: number = 3000) {
  const app = createApiServer();
  return app.listen(port, () => {
    console.log(`[API Server] Listening on port ${port}`);
    console.log(`[API Server] Health check: http://localhost:${port}/health`);
    console.log(`[API Server] API Key management: http://localhost:${port}/api/keys`);
  });
}

// ============================================
// CLI Script (for testing)
// ============================================

// If this file is run directly (not imported), start the server
if (require.main === module) {
  const port = parseInt(process.env.PORT || '3000', 10);
  startApiServer(port);
}
