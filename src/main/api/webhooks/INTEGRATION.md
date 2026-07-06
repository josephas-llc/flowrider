# Webhook System Integration Guide

This guide shows how to integrate the webhook system into Flowrider's main process.

## Overview

The webhook system allows external services to receive notifications about Flowrider events in real-time. It supports:

- Event subscriptions (session.created, session.completed, etc.)
- HMAC-SHA256 payload signing for security
- Automatic retries with exponential backoff
- Delivery history tracking
- REST-style IPC API

## Architecture

```
┌─────────────┐
│  Flowrider  │
│   Events    │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ WebhookManager   │  ← Fires webhooks asynchronously
│ - Event firing   │
│ - Retries        │
│ - HMAC signing   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  WebhookStore    │  ← SQLite storage
│ - Webhooks       │
│ - Deliveries     │
└──────────────────┘
```

## Integration Steps

### 1. Setup in main.ts

Add webhook initialization to your `src/main/main.ts`:

```typescript
import { setupWebhookRoutes } from './api/routes/webhooks';
import { getWebhookManager, shutdownWebhookManager } from './api/webhooks';
import { shutdownWebhookStore } from './api/webhooks/WebhookStore';

// In your app.whenReady() or similar initialization:
app.whenReady().then(() => {
  createWindow();
  setupIPC();

  // Initialize webhook routes
  setupWebhookRoutes();

  console.log('[Main] Webhook system initialized');
});

// In your app shutdown handler:
app.on('will-quit', async () => {
  console.log('[Main] App shutting down...');

  // Shutdown webhooks
  shutdownWebhookManager();
  shutdownWebhookStore();

  // ... other cleanup
});
```

### 2. Fire Webhooks on Events

Fire webhooks when important events occur in your app:

```typescript
import { getWebhookManager } from './api/webhooks';

const webhookManager = getWebhookManager();

// When a session is created
ipcMain.handle('tmux:create', async (_event, name: string, faceIndex: number, workingDir: string) => {
  const result = await tmuxManager.createSession(name, faceIndex, workingDir);

  if (result.success) {
    // Fire webhook
    webhookManager.fireEvent('session.created', {
      sessionId: result.data.name,
      sessionName: name,
      faceIndex,
      workingDir,
      timestamp: Date.now(),
    });
  }

  return result;
});

// When a session completes
ipcMain.handle('tmux:kill', async (_event, sessionName: string) => {
  const result = tmuxManager.killSession(sessionName);

  if (result.success) {
    webhookManager.fireEvent('session.completed', {
      sessionId: sessionName,
      timestamp: Date.now(),
    });
  }

  return result;
});

// When a session encounters an error
function handleSessionError(sessionName: string, error: Error) {
  webhookManager.fireEvent('session.error', {
    sessionId: sessionName,
    error: error.message,
    stack: error.stack,
    timestamp: Date.now(),
  });
}

// For high-volume session output (optional)
function handleSessionOutput(sessionName: string, output: string) {
  webhookManager.fireEvent('session.output', {
    sessionId: sessionName,
    output,
    timestamp: Date.now(),
  });
}

// When a project is created
async function createProject(projectData: any) {
  // ... create project logic

  webhookManager.fireEvent('project.created', {
    projectId: projectData.id,
    projectName: projectData.name,
    timestamp: Date.now(),
  });
}

// When a project is updated
async function updateProject(projectId: string, updates: any) {
  // ... update project logic

  webhookManager.fireEvent('project.updated', {
    projectId,
    updates,
    timestamp: Date.now(),
  });
}
```

### 3. Add IPC Types to preload.ts

Update your `src/main/preload.ts` to expose webhook APIs:

```typescript
// Add to your contextBridge.exposeInMainWorld:
contextBridge.exposeInMainWorld('api', {
  // ... existing APIs

  // Webhooks
  webhooks: {
    list: (options?: { active?: boolean }) =>
      ipcRenderer.invoke('webhooks:list', options),

    get: (id: string) =>
      ipcRenderer.invoke('webhooks:get', id),

    create: (data: {
      url: string;
      events: string[];
      secret?: string;
      description?: string;
      metadata?: Record<string, any>;
    }) => ipcRenderer.invoke('webhooks:create', data),

    update: (id: string, data: any) =>
      ipcRenderer.invoke('webhooks:update', id, data),

    delete: (id: string) =>
      ipcRenderer.invoke('webhooks:delete', id),

    deliveries: (id: string, options?: {
      limit?: number;
      offset?: number;
      status?: string;
    }) => ipcRenderer.invoke('webhooks:deliveries', id, options),

    stats: () =>
      ipcRenderer.invoke('webhooks:stats'),

    test: (id: string) =>
      ipcRenderer.invoke('webhooks:test', id),
  },
});
```

## API Usage Examples

### Frontend (Renderer Process)

```typescript
// List all webhooks
const result = await window.api.webhooks.list();
if (result.success) {
  console.log('Webhooks:', result.data);
}

// Create a webhook
const webhook = await window.api.webhooks.create({
  url: 'https://example.com/webhook',
  events: ['session.created', 'session.completed'],
  secret: 'your-secret-key', // Optional, for HMAC signing
  description: 'Notify on session lifecycle',
  metadata: {
    team: 'engineering',
    environment: 'production',
  },
});

// Get webhook deliveries
const deliveries = await window.api.webhooks.deliveries(webhook.data.id, {
  limit: 20,
  status: 'failed', // Only failed deliveries
});

// Update webhook
await window.api.webhooks.update(webhook.data.id, {
  active: false, // Disable webhook
});

// Delete webhook
await window.api.webhooks.delete(webhook.data.id);

// Get statistics
const stats = await window.api.webhooks.stats();
console.log('Total deliveries:', stats.data.totalDeliveries);
console.log('Success rate:',
  stats.data.successfulDeliveries / stats.data.totalDeliveries * 100 + '%'
);
```

### Backend (Main Process)

```typescript
import { getWebhookManager } from './api/webhooks';

const manager = getWebhookManager();

// Programmatic webhook management
const webhook = manager.registerWebhook(
  'https://api.example.com/webhooks/flowrider',
  ['session.created', 'project.updated'],
  {
    secret: 'my-secret',
    description: 'Main CI/CD webhook',
  }
);

// Fire events
await manager.fireEvent('session.created', {
  sessionId: 'face-0',
  sessionName: 'Dev Session',
  faceIndex: 0,
  workingDir: '/Users/john/projects/myapp',
  timestamp: Date.now(),
});

// Get delivery history
const deliveries = manager.getDeliveries(webhook.id, { limit: 10 });

// Check statistics
const stats = manager.getStats();
```

## Webhook Payload Format

All webhooks receive a POST request with this structure:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event": "session.created",
  "timestamp": 1699564800000,
  "data": {
    "sessionId": "face-0",
    "sessionName": "Dev Session",
    "faceIndex": 0,
    "workingDir": "/Users/john/projects/myapp",
    "timestamp": 1699564800000
  }
}
```

### Headers

```
Content-Type: application/json
User-Agent: Flowrider-Webhooks/1.0
X-Webhook-Event: session.created
X-Webhook-Id: 550e8400-e29b-41d4-a716-446655440000
X-Webhook-Timestamp: 1699564800000
X-Webhook-Signature: sha256=a3b2c1d4e5f6... (if secret provided)
```

## Verifying Signatures

If you provide a secret when creating a webhook, payloads are signed with HMAC-SHA256:

### Node.js Example

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In your webhook handler:
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const secret = 'your-secret-key';

  if (!verifyWebhook(payload, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook...
  res.status(200).send('OK');
});
```

## Retry Behavior

Failed webhook deliveries are automatically retried:

- **Attempt 1**: Immediate
- **Attempt 2**: 5 seconds later
- **Attempt 3**: 25 seconds later
- **Attempt 4**: 125 seconds later (2+ minutes)

A delivery is considered successful if the HTTP response status is 2xx (200-299).

## Event Types

| Event | Description | Payload Fields |
|-------|-------------|---------------|
| `session.created` | New session started | sessionId, sessionName, faceIndex, workingDir |
| `session.completed` | Session terminated | sessionId |
| `session.error` | Session error occurred | sessionId, error, stack |
| `session.output` | Terminal output (high-volume) | sessionId, output |
| `project.created` | New project created | projectId, projectName |
| `project.updated` | Project updated | projectId, updates |

## Best Practices

1. **Use secrets for production webhooks** - Always provide a secret for HMAC signing
2. **Handle high-volume events carefully** - `session.output` can be very frequent
3. **Implement exponential backoff on your webhook receiver** - In case of temporary failures
4. **Return 2xx status codes quickly** - Webhook delivery has a 30-second timeout
5. **Clean up old deliveries periodically** - Use `WebhookStore.deleteOldDeliveries(30)` to delete deliveries older than 30 days
6. **Monitor delivery success rates** - Use `webhooks:stats` to track delivery health

## Testing

```typescript
// Test a webhook without waiting for a real event
const testResult = await window.api.webhooks.test(webhookId);

// This fires a test session.created event to the webhook
// Check the deliveries to see if it succeeded
const deliveries = await window.api.webhooks.deliveries(webhookId, { limit: 1 });
console.log('Latest delivery:', deliveries.data[0]);
```

## Troubleshooting

### Webhooks not firing
- Check if webhooks are active: `webhook.active === true`
- Verify the event is in the webhook's events array
- Check logs for errors in delivery attempts

### Failed deliveries
- Check the `responseStatus` and `errorMessage` in delivery records
- Verify the webhook URL is accessible
- Check if the receiving server is returning 2xx status codes
- Verify HMAC signature validation if using secrets

### Database location
- Webhooks are stored in: `{userData}/webhooks.db`
- Find path: `webhookStore.getDbPath()`

## Performance Considerations

- Webhook delivery is **non-blocking** and **asynchronous**
- Maximum 5 concurrent deliveries to prevent overwhelming the network
- Failed deliveries are queued for retry in the background
- Delivery history is stored indefinitely (clean up old records periodically)

## Security

- **HMAC-SHA256 signing** prevents payload tampering
- **Secrets are stored in plaintext** in SQLite (consider encrypting in production)
- **No authentication required** for webhook endpoints (rely on secrets)
- **Webhook URLs must be HTTPS in production** (recommended)
