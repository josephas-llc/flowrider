/**
 * API IPC Handlers
 *
 * Handles IPC communication for REST API server management:
 * - api:getStatus - Returns {running, port, url}
 * - api:start - Start the API server
 * - api:stop - Stop the API server
 * - api:getConfig - Get API configuration
 * - api:setConfig - Update API configuration
 */

import { ipcMain } from 'electron';
import { z } from 'zod';
import { getApiConfigService } from '../api/ApiConfig';
import { ApiServer } from '../api/ApiServer';
import { validate, portSchema, apiKeySchema } from '../utils/validation';

// ApiServer instance will be managed in main.ts
let apiServer: ApiServer | null = null;

/**
 * Set the API server instance (called from main.ts)
 */
export function setApiServer(server: ApiServer): void {
  apiServer = server;
}

/**
 * Register all API-related IPC handlers
 */
export function registerApiHandlers(): void {
  const configService = getApiConfigService();

  // Get API server status
  ipcMain.handle('api:getStatus', async () => {
    try {
      const config = configService.getConfig();

      if (!apiServer) {
        return {
          success: true,
          data: {
            running: false,
            port: config.port,
            url: null,
          },
        };
      }

      const serverConfig = apiServer.getConfig();
      const running = apiServer.getIsRunning();

      return {
        success: true,
        data: {
          running,
          port: serverConfig.port,
          url: running ? `http://localhost:${serverConfig.port}` : null,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  });

  // Start API server
  ipcMain.handle('api:start', async () => {
    try {
      if (!apiServer) {
        return {
          success: false,
          error: 'API server not initialized',
        };
      }

      const serverConfig = apiServer.getConfig();

      if (apiServer.getIsRunning()) {
        return {
          success: true,
          data: {
            running: true,
            port: serverConfig.port,
            url: `http://localhost:${serverConfig.port}`,
          },
        };
      }

      await apiServer.start();

      return {
        success: true,
        data: {
          running: apiServer.getIsRunning(),
          port: serverConfig.port,
          url: `http://localhost:${serverConfig.port}`,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  });

  // Stop API server
  ipcMain.handle('api:stop', async () => {
    try {
      if (!apiServer) {
        return {
          success: false,
          error: 'API server not initialized',
        };
      }

      if (!apiServer.getIsRunning()) {
        return {
          success: true,
          data: {
            running: false,
          },
        };
      }

      await apiServer.stop();

      return {
        success: true,
        data: {
          running: false,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  });

  // Get API configuration
  ipcMain.handle('api:getConfig', async () => {
    try {
      const config = configService.getConfig();
      return {
        success: true,
        data: config,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  });

  // Update API configuration
  ipcMain.handle('api:setConfig', async (_event, configUpdate: any) => {
    try {
      // Validate the config update object
      const validatedConfig = validate(z.object({
        port: portSchema.optional(),
        enabled: z.boolean().optional(),
        apiKey: apiKeySchema.optional(),
      }).passthrough(), configUpdate);

      configService.setConfig(validatedConfig);
      const updatedConfig = configService.getConfig();

      // If the server is running and port changed, we need to restart it
      if (apiServer && apiServer.getIsRunning() && validatedConfig.port !== undefined) {
        console.log('[API Handlers] Port changed, restarting server...');
        await apiServer.stop();
        await apiServer.start();
      }

      return {
        success: true,
        data: updatedConfig,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  });

  console.log('[API Handlers] IPC handlers registered');
}
