/**
 * API Module Exports
 *
 * Central export point for all API-related modules in Flowrider.
 * This provides a clean interface for importing API functionality
 * throughout the application.
 */

export {
  ApiServer,
  getApiServer,
  startApiServer,
  stopApiServer,
  type ApiServerConfig,
  type ErrorResponse,
  type SuccessResponse,
  type HealthResponse,
  type VersionResponse,
} from './ApiServer';

// API Key Authentication
export { ApiKeyManager, getApiKeyManager } from './auth/ApiKeyManager';
export type { GeneratedApiKey, ApiKeyInfo, ApiKeyEnvironment } from './auth/ApiKeyManager';

export { ApiKeyStore, getApiKeyStore, closeApiKeyStore } from './auth/ApiKeyStore';
export type { ApiKey, ApiKeyScope, ApiKeyCreateInput } from './auth/ApiKeyStore';

export {
  requireApiKey,
  requireScope,
  requireReadScope,
  requireWriteScope,
  requireAdminScope,
  optionalApiKey,
  logApiRequest,
} from './middleware/auth';

export { default as apiKeyRoutes } from './routes/apikeys';

// Bootstrap utilities
export { createFirstAdminKey, createTestKey } from './bootstrap';

// Add additional API module exports here as they are created
// Example:
// export { SessionRouter } from './routes/SessionRouter';
// export { ProjectRouter } from './routes/ProjectRouter';
