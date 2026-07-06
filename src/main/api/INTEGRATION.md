# Session REST API Integration Guide

## Overview

The Session REST API is now implemented in `/src/main/api/routes/sessions.ts` using Express Router. This guide shows how to integrate it with the existing Electron app.

## Integration Steps

### 1. Initialize Dependencies in main.ts

In your `setupIPC()` function in `main.ts`, after creating `tmuxManager` and `sessionMonitor`, initialize the session router:

```typescript
import { getApiServer } from './api';
import { initSessionRouter } from './api/routes/sessions';

function setupIPC() {
  tmuxManager = new TmuxManager();
  leoManager = new LeoManager();

  // Create SessionMonitor
  sessionMonitor = new SessionMonitor(
    (sessionName: string, lines: number) => tmuxManager.getOutput(sessionName, lines)
  );

  // Initialize session router with dependencies
  initSessionRouter(tmuxManager, sessionMonitor);

  // Start API server
  const apiServer = getApiServer();
  apiServer.start().catch((err) => {
    console.error('[Main] Failed to start API server:', err);
  });

  // ... rest of IPC setup
}
```

### 2. Stop API Server on Quit

In the `app.on('before-quit')` handler:

```typescript
import { stopApiServer } from './api';

app.on('before-quit', async () => {
  console.log('[Main] App quitting, cleaning up...');
  sessionMonitor.shutdown();
  shutdownLeoAI();
  shutdownCrossSessionAwareness();
  shutdownTemplateService();

  // Stop API server
  await stopApiServer();
});
```

### 3. Configure API Port (Optional)

By default, the API runs on port 3847. To customize:

```typescript
import { startApiServer } from './api';

// In setupIPC():
startApiServer({ port: 31339 }).catch((err) => {
  console.error('[Main] Failed to start API server:', err);
});
```

## Testing the API

Once integrated and running, test with curl:

```bash
# List sessions
curl http://localhost:3847/api/sessions

# Create a session
curl -X POST http://localhost:3847/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-session",
    "faceIndex": 0,
    "workingDir": "~"
  }'

# Send a message
curl -X POST http://localhost:3847/api/sessions/fr2-0-test-session/send \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello AI"}'

# Get output
curl http://localhost:3847/api/sessions/fr2-0-test-session/output?lines=100

# Delete session
curl -X DELETE http://localhost:3847/api/sessions/fr2-0-test-session
```

## API Endpoints

All endpoints are documented in `/src/main/api/README.md`.

### Quick Reference

- **GET** `/api/sessions` - List all sessions
- **GET** `/api/sessions/:id` - Get session by ID
- **POST** `/api/sessions` - Create new session
- **PUT** `/api/sessions/:id` - Update session
- **DELETE** `/api/sessions/:id` - Delete/kill session
- **POST** `/api/sessions/:id/send` - Send message to session
- **GET** `/api/sessions/:id/output` - Get session output/history
- **POST** `/api/sessions/:id/restart` - Restart a session

## Architecture

```
┌─────────────────────────────────────────┐
│         Electron Main Process           │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │      ApiServer (Express)         │  │
│  │                                  │  │
│  │  ┌────────────────────────────┐ │  │
│  │  │  Session Router            │ │  │
│  │  │                            │ │  │
│  │  │  GET /api/sessions         │ │  │
│  │  │  POST /api/sessions        │ │  │
│  │  │  etc...                    │ │  │
│  │  └────────────────────────────┘ │  │
│  │                                  │  │
│  │  ┌────────────────────────────┐ │  │
│  │  │  Other Routers             │ │  │
│  │  │  (projects, webhooks, etc) │ │  │
│  │  └────────────────────────────┘ │  │
│  └──────────────────────────────────┘  │
│          │                 │            │
│          ▼                 ▼            │
│   TmuxManager      SessionMonitor      │
│                                         │
└─────────────────────────────────────────┘
                  │
                  ▼
            HTTP REST API
         (localhost:3847)
```

## Features Included

- ✅ All 8 REST endpoints implemented
- ✅ Input validation for all requests
- ✅ Proper error handling with status codes
- ✅ Integration with TmuxManager
- ✅ Integration with SessionMonitor
- ✅ Integration with LEO AI learning
- ✅ Integration with Cross-Session Awareness
- ✅ Session metadata tracking (project, language, notes)
- ✅ CORS enabled for localhost
- ✅ JSON request/response format

## Security Considerations

### Current Status (Development)
- No authentication required
- CORS enabled for localhost only
- API accessible on localhost only

### Production Recommendations
1. Add API key authentication
2. Add rate limiting
3. Restrict CORS to specific origins
4. Add request logging
5. Add HTTPS support
6. Add webhook support for events

## Next Steps

1. **Add Authentication**: Implement API key middleware (see `/src/main/api/routes/apikeys.ts`)
2. **Add Webhooks**: Implement event webhooks for session events
3. **Add Tests**: Create integration tests for the API
4. **Add OpenAPI Docs**: Generate Swagger documentation
5. **Add Client SDK**: Create TypeScript/JavaScript client library

## Troubleshooting

### Port Already in Use
If port 3847 is already in use, change it in the config:
```typescript
startApiServer({ port: 8080 })
```

### Dependencies Not Initialized
Make sure `initSessionRouter(tmuxManager, sessionMonitor)` is called before starting the API server.

### Sessions Not Persisting
Session metadata is currently stored in memory. For persistence, integrate with a database or file storage.

## Files Created

- `/src/main/api/routes/sessions.ts` - Session router implementation
- `/src/main/api/types.ts` - Shared TypeScript types
- `/src/main/api/server.ts` - Standalone server (optional)
- `/src/main/api/client.ts` - TypeScript client SDK
- `/src/main/api/README.md` - API documentation
- `/src/main/api/INTEGRATION.md` - This file
- `/src/main/api/integration-example.ts` - Integration code examples
- `/src/main/api/test-client.ts` - Test client example
