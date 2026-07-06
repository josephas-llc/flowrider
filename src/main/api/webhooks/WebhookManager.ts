/**
 * WebhookManager - Core webhook management and delivery
 *
 * Features:
 * - Event-driven webhook firing (async, non-blocking)
 * - Automatic retries with exponential backoff
 * - HMAC-SHA256 payload signing
 * - Delivery status tracking
 * - Background retry processor
 */

import * as crypto from 'crypto';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import {
  getWebhookStore,
  Webhook,
  WebhookEvent,
  WebhookDelivery,
  DeliveryStatus,
} from './WebhookStore';

// ============================================
// Types
// ============================================

export interface WebhookPayload {
  id: string; // Unique event ID
  event: WebhookEvent;
  timestamp: number;
  data: Record<string, any>;
}

export interface DeliveryResult {
  success: boolean;
  status?: number;
  body?: string;
  error?: string;
  duration: number;
}

// ============================================
// WebhookManager Class
// ============================================

export class WebhookManager {
  private store = getWebhookStore();
  private retryInterval: NodeJS.Timeout | null = null;
  private maxConcurrentDeliveries = 5;
  private activeDeliveries = 0;

  constructor() {
    this.startRetryProcessor();
  }

  // ============================================
  // Event Firing
  // ============================================

  /**
   * Fire webhooks for a specific event
   * This is async and non-blocking - fires and forgets
   */
  async fireEvent(event: WebhookEvent, data: Record<string, any>): Promise<void> {
    // Get all active webhooks subscribed to this event
    const allWebhooks = this.store.listWebhooks({ active: true });
    const subscribedWebhooks = allWebhooks.filter(webhook =>
      webhook.events.includes(event)
    );

    if (subscribedWebhooks.length === 0) {
      return; // No webhooks to fire
    }

    // Create payload
    const payload: WebhookPayload = {
      id: crypto.randomUUID(),
      event,
      timestamp: Date.now(),
      data,
    };

    // Create deliveries for each webhook
    const deliveries = subscribedWebhooks.map(webhook =>
      this.store.createDelivery(webhook.id, event, payload)
    );

    // Attempt immediate delivery (async, don't wait)
    deliveries.forEach(delivery => {
      this.attemptDelivery(delivery.id).catch(err => {
        console.error(`[WebhookManager] Error delivering webhook ${delivery.id}:`, err);
      });
    });
  }

  // ============================================
  // Delivery
  // ============================================

  /**
   * Attempt to deliver a webhook
   */
  private async attemptDelivery(deliveryId: string): Promise<void> {
    // Rate limiting
    while (this.activeDeliveries >= this.maxConcurrentDeliveries) {
      await this.sleep(100);
    }

    this.activeDeliveries++;

    try {
      const delivery = this.store.getDelivery(deliveryId);
      if (!delivery) {
        console.error(`[WebhookManager] Delivery ${deliveryId} not found`);
        return;
      }

      const webhook = this.store.getWebhook(delivery.webhookId);
      if (!webhook || !webhook.active) {
        console.log(`[WebhookManager] Webhook ${delivery.webhookId} inactive or not found`);
        this.store.updateDelivery(deliveryId, {
          status: 'failed',
          errorMessage: 'Webhook inactive or deleted',
          completedAt: Date.now(),
        });
        return;
      }

      // Update attempt count
      const attempts = delivery.attempts + 1;
      this.store.updateDelivery(deliveryId, {
        attempts,
        lastAttemptAt: Date.now(),
        status: 'retrying',
      });

      // Deliver webhook
      const result = await this.deliverWebhook(webhook, delivery.payload);

      // Update delivery status
      if (result.success) {
        this.store.updateDelivery(deliveryId, {
          status: 'success',
          responseStatus: result.status,
          responseBody: result.body,
          completedAt: Date.now(),
          duration: result.duration,
        });
      } else {
        // Check if we should retry
        const shouldRetry = attempts < delivery.maxAttempts;

        if (shouldRetry) {
          // Calculate next retry time with exponential backoff
          const backoffMs = this.calculateBackoff(attempts);
          const nextRetryAt = Date.now() + backoffMs;

          this.store.updateDelivery(deliveryId, {
            status: 'retrying',
            responseStatus: result.status,
            responseBody: result.body,
            errorMessage: result.error,
            nextRetryAt,
          });

          console.log(
            `[WebhookManager] Delivery ${deliveryId} failed (attempt ${attempts}/${delivery.maxAttempts}), retrying in ${backoffMs}ms`
          );
        } else {
          // Max retries reached
          this.store.updateDelivery(deliveryId, {
            status: 'failed',
            responseStatus: result.status,
            responseBody: result.body,
            errorMessage: result.error,
            completedAt: Date.now(),
            duration: result.duration,
          });

          console.error(
            `[WebhookManager] Delivery ${deliveryId} failed after ${attempts} attempts: ${result.error}`
          );
        }
      }
    } catch (error) {
      console.error(`[WebhookManager] Unexpected error delivering webhook ${deliveryId}:`, error);
      const delivery = this.store.getDelivery(deliveryId);
      if (delivery) {
        this.store.updateDelivery(deliveryId, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: Date.now(),
        });
      }
    } finally {
      this.activeDeliveries--;
    }
  }

  /**
   * Deliver webhook via HTTP POST
   */
  private async deliverWebhook(
    webhook: Webhook,
    payload: Record<string, any>
  ): Promise<DeliveryResult> {
    const startTime = Date.now();

    try {
      const url = new URL(webhook.url);
      const payloadJson = JSON.stringify(payload);

      // Generate signature if secret is provided
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Flowrider-Webhooks/1.0',
        'X-Webhook-Event': payload.event,
        'X-Webhook-Id': payload.id,
        'X-Webhook-Timestamp': payload.timestamp.toString(),
      };

      if (webhook.secret) {
        const signature = this.generateSignature(payloadJson, webhook.secret);
        headers['X-Webhook-Signature'] = signature;
      }

      // Choose http or https based on URL
      const client = url.protocol === 'https:' ? https : http;

      const result = await new Promise<DeliveryResult>((resolve) => {
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            ...headers,
            'Content-Length': Buffer.byteLength(payloadJson),
          },
          timeout: 30000, // 30 second timeout
        };

        const req = client.request(options, (res) => {
          let body = '';

          res.on('data', (chunk) => {
            body += chunk;
            // Limit response body to 10KB
            if (body.length > 10240) {
              req.destroy();
            }
          });

          res.on('end', () => {
            const duration = Date.now() - startTime;
            const statusCode = res.statusCode || 0;

            if (statusCode >= 200 && statusCode < 300) {
              resolve({
                success: true,
                status: statusCode,
                body: body.substring(0, 1000), // Store first 1KB
                duration,
              });
            } else {
              resolve({
                success: false,
                status: statusCode,
                body: body.substring(0, 1000),
                error: `HTTP ${statusCode}`,
                duration,
              });
            }
          });
        });

        req.on('error', (error) => {
          const duration = Date.now() - startTime;
          resolve({
            success: false,
            error: error.message,
            duration,
          });
        });

        req.on('timeout', () => {
          req.destroy();
          const duration = Date.now() - startTime;
          resolve({
            success: false,
            error: 'Request timeout',
            duration,
          });
        });

        req.write(payloadJson);
        req.end();
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      };
    }
  }

  // ============================================
  // HMAC Signing
  // ============================================

  /**
   * Generate HMAC-SHA256 signature for payload
   */
  private generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify HMAC-SHA256 signature (for testing/validation)
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // ============================================
  // Retry Processing
  // ============================================

  /**
   * Start background retry processor
   */
  private startRetryProcessor(): void {
    if (this.retryInterval) {
      return; // Already running
    }

    // Check for pending retries every 10 seconds
    this.retryInterval = setInterval(() => {
      this.processRetries().catch(err => {
        console.error('[WebhookManager] Error processing retries:', err);
      });
    }, 10000);

    // Initial check
    this.processRetries().catch(err => {
      console.error('[WebhookManager] Error processing retries:', err);
    });
  }

  /**
   * Process pending retries
   */
  private async processRetries(): Promise<void> {
    const pendingDeliveries = this.store.getPendingRetries();

    if (pendingDeliveries.length === 0) {
      return;
    }

    console.log(`[WebhookManager] Processing ${pendingDeliveries.length} pending deliveries`);

    // Process deliveries
    for (const delivery of pendingDeliveries) {
      this.attemptDelivery(delivery.id).catch(err => {
        console.error(`[WebhookManager] Error retrying delivery ${delivery.id}:`, err);
      });
    }
  }

  /**
   * Calculate exponential backoff delay
   * Attempt 1: 5 seconds
   * Attempt 2: 25 seconds
   * Attempt 3: 125 seconds (2 minutes)
   */
  private calculateBackoff(attemptNumber: number): number {
    const baseDelay = 5000; // 5 seconds
    const exponent = attemptNumber;
    return baseDelay * Math.pow(5, exponent - 1);
  }

  // ============================================
  // Webhook Management
  // ============================================

  /**
   * Register a new webhook
   */
  registerWebhook(
    url: string,
    events: WebhookEvent[],
    options: {
      secret?: string;
      description?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Webhook {
    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`Invalid webhook URL: ${url}`);
    }

    // Validate events
    if (!events || events.length === 0) {
      throw new Error('At least one event must be specified');
    }

    return this.store.createWebhook(url, events, options);
  }

  /**
   * Get webhook by ID
   */
  getWebhook(id: string): Webhook | null {
    return this.store.getWebhook(id);
  }

  /**
   * List all webhooks
   */
  listWebhooks(options: { active?: boolean } = {}): Webhook[] {
    return this.store.listWebhooks(options);
  }

  /**
   * Update webhook
   */
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
    // Validate URL if provided
    if (updates.url) {
      try {
        new URL(updates.url);
      } catch (error) {
        throw new Error(`Invalid webhook URL: ${updates.url}`);
      }
    }

    // Validate events if provided
    if (updates.events && updates.events.length === 0) {
      throw new Error('At least one event must be specified');
    }

    return this.store.updateWebhook(id, updates);
  }

  /**
   * Delete webhook
   */
  deleteWebhook(id: string): boolean {
    return this.store.deleteWebhook(id);
  }

  /**
   * Get delivery history for a webhook
   */
  getDeliveries(
    webhookId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: DeliveryStatus;
    } = {}
  ): WebhookDelivery[] {
    return this.store.listDeliveries(webhookId, options);
  }

  /**
   * Get webhook statistics
   */
  getStats() {
    return this.store.getStats();
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Shutdown webhook manager
   */
  shutdown(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
  }

  // ============================================
  // Utilities
  // ============================================

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// Singleton Instance
// ============================================

let webhookManagerInstance: WebhookManager | null = null;

export function getWebhookManager(): WebhookManager {
  if (!webhookManagerInstance) {
    webhookManagerInstance = new WebhookManager();
  }
  return webhookManagerInstance;
}

export function shutdownWebhookManager(): void {
  if (webhookManagerInstance) {
    webhookManagerInstance.shutdown();
    webhookManagerInstance = null;
  }
}
