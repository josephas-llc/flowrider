/**
 * Webhooks REST API Endpoints
 *
 * Provides IPC handlers for webhook CRUD operations and delivery history
 * Uses Electron IPC for communication between renderer and main process
 */

import { ipcMain } from 'electron';
import { getWebhookManager } from '../webhooks/WebhookManager';
import { WebhookEvent } from '../webhooks/WebhookStore';
import { validate, validateWithResponse, createWebhookSchema, updateWebhookSchema, webhookIdSchema } from '../../utils/validation';

// ============================================
// Types
// ============================================

interface CreateWebhookRequest {
  url: string;
  events: WebhookEvent[];
  secret?: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface UpdateWebhookRequest {
  url?: string;
  events?: WebhookEvent[];
  secret?: string;
  active?: boolean;
  description?: string;
  metadata?: Record<string, any>;
}

interface ListDeliveriesRequest {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'success' | 'failed' | 'retrying';
}

// ============================================
// Response Helpers
// ============================================

function successResponse<T>(data: T) {
  return {
    success: true,
    data,
  };
}

function errorResponse(error: string, details?: any) {
  return {
    success: false,
    error,
    details,
  };
}

// ============================================
// Setup IPC Handlers
// ============================================

export function setupWebhookRoutes(): void {
  const manager = getWebhookManager();

  // ============================================
  // GET /api/webhooks - List webhooks
  // ============================================
  ipcMain.handle('webhooks:list', async (_event, options?: { active?: boolean }) => {
    try {
      const webhooks = manager.listWebhooks(options || {});
      return successResponse(webhooks);
    } catch (error) {
      console.error('[Webhooks API] Error listing webhooks:', error);
      return errorResponse(
        'Failed to list webhooks',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  });

  // ============================================
  // GET /api/webhooks/:id - Get webhook by ID
  // ============================================
  ipcMain.handle('webhooks:get', async (_event, id: string) => {
    try {
      const validated = validate(webhookIdSchema, id);
      const webhook = manager.getWebhook(validated);

      if (!webhook) {
        return errorResponse('Webhook not found');
      }

      return successResponse(webhook);
    } catch (error) {
      console.error('[Webhooks API] Error getting webhook:', error);
      return errorResponse(
        'Failed to get webhook',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  });

  // ============================================
  // POST /api/webhooks - Create webhook
  // ============================================
  ipcMain.handle('webhooks:create', async (_event, request: CreateWebhookRequest) => {
    try {
      const validationResult = validateWithResponse(createWebhookSchema, request);
      if (!validationResult.success) {
        return errorResponse(validationResult.error);
      }

      const validated = validationResult.data;

      // Create webhook
      const webhook = manager.registerWebhook(validated.url, validated.events, {
        secret: validated.secret,
        description: validated.description,
        metadata: validated.metadata,
      });

      return successResponse(webhook);
    } catch (error) {
      console.error('[Webhooks API] Error creating webhook:', error);
      return errorResponse(
        'Failed to create webhook',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  });

  // ============================================
  // PATCH /api/webhooks/:id - Update webhook
  // ============================================
  ipcMain.handle('webhooks:update', async (_event, id: string, request: UpdateWebhookRequest) => {
    try {
      const validatedId = validate(webhookIdSchema, id);
      const validationResult = validateWithResponse(updateWebhookSchema, request);
      if (!validationResult.success) {
        return errorResponse(validationResult.error);
      }

      const validated = validationResult.data;
      const success = manager.updateWebhook(validatedId, validated);

      if (!success) {
        return errorResponse('Webhook not found');
      }

      // Return updated webhook
      const webhook = manager.getWebhook(validatedId);
      return successResponse(webhook);
    } catch (error) {
      console.error('[Webhooks API] Error updating webhook:', error);
      return errorResponse(
        'Failed to update webhook',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  });

  // ============================================
  // DELETE /api/webhooks/:id - Delete webhook
  // ============================================
  ipcMain.handle('webhooks:delete', async (_event, id: string) => {
    try {
      const validated = validate(webhookIdSchema, id);
      const success = manager.deleteWebhook(validated);

      if (!success) {
        return errorResponse('Webhook not found');
      }

      return successResponse({ deleted: true });
    } catch (error) {
      console.error('[Webhooks API] Error deleting webhook:', error);
      return errorResponse(
        'Failed to delete webhook',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  });

  // ============================================
  // GET /api/webhooks/:id/deliveries - Get delivery history
  // ============================================
  ipcMain.handle('webhooks:deliveries', async (_event, id: string, options?: ListDeliveriesRequest) => {
    try {
      const validated = validate(webhookIdSchema, id);

      // Verify webhook exists
      const webhook = manager.getWebhook(validated);
      if (!webhook) {
        return errorResponse('Webhook not found');
      }

      const deliveries = manager.getDeliveries(validated, options || {});
      return successResponse(deliveries);
    } catch (error) {
      console.error('[Webhooks API] Error getting deliveries:', error);
      return errorResponse(
        'Failed to get deliveries',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  });

  // ============================================
  // GET /api/webhooks/stats - Get webhook statistics
  // ============================================
  ipcMain.handle('webhooks:stats', async () => {
    try {
      const stats = manager.getStats();
      return successResponse(stats);
    } catch (error) {
      console.error('[Webhooks API] Error getting stats:', error);
      return errorResponse(
        'Failed to get statistics',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  });

  // ============================================
  // POST /api/webhooks/test - Test webhook delivery (for debugging)
  // ============================================
  ipcMain.handle('webhooks:test', async (_event, id: string) => {
    try {
      const validated = validate(webhookIdSchema, id);
      const webhook = manager.getWebhook(validated);
      if (!webhook) {
        return errorResponse('Webhook not found');
      }

      // Fire a test event
      await manager.fireEvent('session.created', {
        sessionId: 'test-session',
        sessionName: 'Test Session',
        faceIndex: 0,
        workingDir: '/test',
        timestamp: Date.now(),
        isTest: true,
      });

      return successResponse({
        message: 'Test webhook fired',
        note: 'Check deliveries to see the result',
      });
    } catch (error) {
      console.error('[Webhooks API] Error testing webhook:', error);
      return errorResponse(
        'Failed to test webhook',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  });

  console.log('[Webhooks API] Routes registered successfully');
}

// ============================================
// Cleanup
// ============================================

export function cleanupWebhookRoutes(): void {
  // Remove all webhook-related IPC handlers
  ipcMain.removeHandler('webhooks:list');
  ipcMain.removeHandler('webhooks:get');
  ipcMain.removeHandler('webhooks:create');
  ipcMain.removeHandler('webhooks:update');
  ipcMain.removeHandler('webhooks:delete');
  ipcMain.removeHandler('webhooks:deliveries');
  ipcMain.removeHandler('webhooks:stats');
  ipcMain.removeHandler('webhooks:test');

  console.log('[Webhooks API] Routes cleaned up');
}
