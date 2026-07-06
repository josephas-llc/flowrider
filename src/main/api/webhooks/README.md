# Flowrider Webhook System

Production-ready webhook system for Flowrider that enables external services to receive real-time notifications about application events.

## Features

### Core Functionality
- ✅ **Event-driven architecture** - Subscribe to specific events
- ✅ **HMAC-SHA256 signing** - Secure payload verification
- ✅ **Automatic retries** - Exponential backoff (3 attempts)
- ✅ **Delivery tracking** - Complete history with status
- ✅ **Non-blocking** - Async delivery doesn't block main thread
- ✅ **Rate limiting** - Max 5 concurrent deliveries
- ✅ **SQLite storage** - Persistent webhook configurations
- ✅ **REST-style IPC API** - Easy integration with renderer process

### Supported Events

| Event | Description |
|-------|-------------|
| `session.created` | Fired when a new terminal session is created |
| `session.completed` | Fired when a session is terminated |
| `session.error` | Fired when a session encounters an error |
| `session.output` | Fired when terminal output is received (high-volume) |
| `project.created` | Fired when a new project is created |
| `project.updated` | Fired when a project is updated |

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Flowrider Application                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Events (session.created, etc.)
                  │
                  ▼
      ┌───────────────────────┐
      │   WebhookManager      │
      │                       │
      │ • Fire events         │
      │ • Queue deliveries    │
      │ • Sign payloads       │
      │ • Retry failures      │
      │ • Track status        │
      └───────────┬───────────┘
                  │
                  │ Store/Retrieve
                  │
                  ▼
      ┌───────────────────────┐
      │    WebhookStore       │
      │                       │
      │ • SQLite database     │
      │ • Webhooks table      │
      │ • Deliveries table    │
      │ • Query interface     │
      └───────────────────────┘
```

### File Structure

```
src/main/api/webhooks/
├── WebhookStore.ts      # SQLite storage layer
├── WebhookManager.ts    # Core webhook logic
├── index.ts            # Public exports
├── INTEGRATION.md      # Integration guide
└── README.md           # This file

src/main/api/routes/
└── webhooks.ts         # IPC API endpoints
```

## Quick Start

### 1. Create a Webhook

```typescript
const result = await window.api.webhooks.create({
  url: 'https://your-server.com/webhooks/flowrider',
  events: ['session.created', 'session.completed'],
  secret: 'your-secret-key', // Optional but recommended
  description: 'Production webhook',
  metadata: {
    environment: 'production',
    team: 'engineering',
  },
});

console.log('Webhook created:', result.data.id);
```

### 2. Receive Webhooks

Your webhook endpoint will receive POST requests:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event": "session.created",
  "timestamp": 1699564800000,
  "data": {
    "sessionId": "face-0",
    "sessionName": "Dev Session",
    "faceIndex": 0,
    "workingDir": "/Users/john/projects/myapp"
  }
}
```

With headers:
```
Content-Type: application/json
X-Webhook-Event: session.created
X-Webhook-Id: 550e8400-e29b-41d4-a716-446655440000
X-Webhook-Signature: sha256=abc123... (if secret provided)
```

### 3. Verify Signatures (Recommended)

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expected = `sha256=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// Express example
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifySignature(req.body.toString(), signature, 'your-secret-key');

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(req.body);
  // Process webhook...
  res.status(200).send('OK');
});
```

## API Reference

### IPC Endpoints

All endpoints return `{ success: boolean, data?: any, error?: string }`

#### List Webhooks
```typescript
window.api.webhooks.list(options?: { active?: boolean })
```

#### Get Webhook
```typescript
window.api.webhooks.get(id: string)
```

#### Create Webhook
```typescript
window.api.webhooks.create({
  url: string;
  events: string[];
  secret?: string;
  description?: string;
  metadata?: Record<string, any>;
})
```

#### Update Webhook
```typescript
window.api.webhooks.update(id: string, {
  url?: string;
  events?: string[];
  secret?: string;
  active?: boolean;
  description?: string;
  metadata?: Record<string, any>;
})
```

#### Delete Webhook
```typescript
window.api.webhooks.delete(id: string)
```

#### Get Deliveries
```typescript
window.api.webhooks.deliveries(id: string, {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'success' | 'failed' | 'retrying';
})
```

#### Get Statistics
```typescript
window.api.webhooks.stats()
// Returns: {
//   totalWebhooks: number;
//   activeWebhooks: number;
//   totalDeliveries: number;
//   successfulDeliveries: number;
//   failedDeliveries: number;
//   averageDeliveryTime: number;
//   deliveriesByEvent: Record<string, number>;
// }
```

#### Test Webhook
```typescript
window.api.webhooks.test(id: string)
// Fires a test session.created event
```

## Data Models

### Webhook

```typescript
interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  description: string | null;
  metadata: Record<string, any>;
}
```

### WebhookDelivery

```typescript
interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, any>;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: number | null;
  nextRetryAt: number | null;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  createdAt: number;
  completedAt: number | null;
  duration: number | null;
}
```

## Retry Logic

Failed deliveries are automatically retried with exponential backoff:

| Attempt | Delay | Total Wait Time |
|---------|-------|----------------|
| 1 | 0s (immediate) | 0s |
| 2 | 5s | 5s |
| 3 | 25s | 30s |
| 4 | 125s (2m 5s) | 2m 35s |

A delivery is considered **successful** if the HTTP response status is 2xx (200-299).

After max attempts (default: 3), the delivery is marked as **failed** and retries stop.

## Performance

- **Async delivery**: Webhooks are delivered asynchronously and don't block the main process
- **Concurrent limit**: Maximum 5 concurrent deliveries to prevent network saturation
- **Request timeout**: 30 seconds per delivery attempt
- **Response size limit**: 10KB response body (prevents memory issues)
- **Background retry processor**: Checks for pending retries every 10 seconds

## Database

Webhooks are stored in SQLite at: `{userData}/webhooks.db`

### Tables

**webhooks**
- Stores webhook configurations
- Indexed on: active, created_at

**webhook_deliveries**
- Stores delivery history
- Indexed on: webhook_id, status, event, created_at, next_retry_at
- Foreign key to webhooks (CASCADE on delete)

### Maintenance

Clean up old delivery records:

```typescript
import { getWebhookStore } from './api/webhooks/WebhookStore';

// Delete deliveries older than 30 days
const store = getWebhookStore();
const deleted = store.deleteOldDeliveries(30);
console.log(`Deleted ${deleted} old delivery records`);
```

## Security Best Practices

1. **Always use HTTPS** for webhook URLs in production
2. **Provide a secret** for HMAC signing on all webhooks
3. **Verify signatures** on the receiving end
4. **Use timing-safe comparison** when verifying signatures
5. **Rate limit** your webhook endpoints to prevent abuse
6. **Validate payload structure** before processing
7. **Return quickly** from webhook handlers (< 5 seconds)
8. **Use unique secrets** for each webhook
9. **Rotate secrets** periodically
10. **Monitor failed deliveries** to detect issues early

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Request timeout` | Endpoint took > 30s to respond | Optimize endpoint or use async processing |
| `HTTP 4xx` | Client error (invalid request) | Check endpoint implementation |
| `HTTP 5xx` | Server error | Fix server-side issues |
| `Connection refused` | Endpoint unreachable | Verify URL and network connectivity |
| `Invalid signature` | Secret mismatch | Verify secret is correct on both sides |

### Debugging

1. **Check delivery history**:
   ```typescript
   const deliveries = await window.api.webhooks.deliveries(webhookId, { limit: 10 });
   deliveries.data.forEach(d => {
     console.log(`Status: ${d.status}, Error: ${d.errorMessage}`);
   });
   ```

2. **Test webhook**:
   ```typescript
   await window.api.webhooks.test(webhookId);
   ```

3. **View statistics**:
   ```typescript
   const stats = await window.api.webhooks.stats();
   const successRate = stats.data.successfulDeliveries / stats.data.totalDeliveries;
   console.log(`Success rate: ${(successRate * 100).toFixed(2)}%`);
   ```

## TypeScript Types

All types are fully typed and exported:

```typescript
import type {
  Webhook,
  WebhookEvent,
  WebhookDelivery,
  DeliveryStatus,
  WebhookStats,
  WebhookPayload,
  DeliveryResult,
} from './api/webhooks';
```

## Testing

### Unit Tests

```typescript
import { WebhookStore } from './WebhookStore';
import { WebhookManager } from './WebhookManager';

// Create test instances
const store = new WebhookStore(':memory:'); // In-memory DB for testing
const manager = new WebhookManager();

// Test webhook creation
const webhook = store.createWebhook(
  'https://test.com/webhook',
  ['session.created'],
  { secret: 'test-secret' }
);

// Test signature generation
const payload = JSON.stringify({ test: 'data' });
const signature = manager['generateSignature'](payload, 'secret');
const isValid = manager.verifySignature(payload, signature, 'secret');
```

### Integration Tests

See `INTEGRATION.md` for complete integration testing examples.

## Monitoring

Track webhook health with statistics:

```typescript
const stats = await window.api.webhooks.stats();

console.log(`
  Total Webhooks: ${stats.data.totalWebhooks}
  Active: ${stats.data.activeWebhooks}
  Total Deliveries: ${stats.data.totalDeliveries}
  Success Rate: ${(stats.data.successfulDeliveries / stats.data.totalDeliveries * 100).toFixed(2)}%
  Avg Delivery Time: ${stats.data.averageDeliveryTime}ms
`);
```

## License

Part of Flowrider. See main project license.

## Support

For issues or questions:
1. Check the `INTEGRATION.md` guide
2. Review delivery history for error messages
3. Verify webhook configuration
4. Test with a simple endpoint (e.g., webhook.site)
5. Check Flowrider logs for errors
