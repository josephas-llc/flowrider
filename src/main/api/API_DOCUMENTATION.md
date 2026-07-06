# Flowrider REST API Documentation

Complete documentation for the Flowrider REST API, including OpenAPI/Swagger specifications.

## Overview

The Flowrider REST API provides programmatic access to manage AI terminal sessions, projects, webhooks, and API keys. The API is built with Express.js and runs within the Electron main process.

## Base URL

- **Development**: `http://localhost:3737/api`
- **Production**: Configured via `ApiConfig` (default port: 3737)

## Interactive Documentation

The API includes interactive Swagger UI documentation:

- **Swagger UI**: `http://localhost:3737/api/docs`
- **OpenAPI JSON**: `http://localhost:3737/api/docs/openapi.json`
- **OpenAPI YAML**: `http://localhost:3737/api/docs/openapi.yaml`

## Authentication

All API endpoints (except `/health` and `/version`) require authentication via API key.

### API Key Authentication

Include your API key in the request header:

```http
X-API-Key: your-api-key-here
```

Or use the Authorization header:

```http
Authorization: Bearer your-api-key-here
```

### Default Development Key

For development, a default API key is available:

```
fwr_dev_flowrider2024
```

**Note**: This key should NEVER be used in production!

### API Key Scopes

API keys can have the following scopes:
- `read` - Read-only access to resources
- `write` - Create, update, and delete resources
- `admin` - Full access including key management
- `*` - All scopes (development only)

## Available Endpoints

### Health & Version

#### GET /api/health
Health check endpoint (no authentication required)

```bash
curl http://localhost:3737/api/health
```

Response:
```json
{
  "status": "ok",
  "uptime": 86400000,
  "timestamp": "2026-07-06T21:30:00Z",
  "version": "0.1.0"
}
```

#### GET /api/version
Get API version information (no authentication required)

```bash
curl http://localhost:3737/api/version
```

Response:
```json
{
  "name": "Flowrider",
  "version": "0.1.0",
  "electron": "43.0.0",
  "node": "v20.11.0",
  "chrome": "130.0.6723.59"
}
```

### Projects

#### GET /api/projects
List all projects

```bash
curl -H "X-API-Key: fwr_dev_flowrider2024" \
  http://localhost:3737/api/projects
```

#### POST /api/projects
Create a new project

```bash
curl -X POST \
  -H "X-API-Key: fwr_dev_flowrider2024" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "path": "/Users/dev/my-project",
    "description": "A new project",
    "language": "typescript"
  }' \
  http://localhost:3737/api/projects
```

#### GET /api/projects/:id
Get project details

```bash
curl -H "X-API-Key: fwr_dev_flowrider2024" \
  http://localhost:3737/api/projects/proj_123
```

#### PUT /api/projects/:id
Update a project

```bash
curl -X PUT \
  -H "X-API-Key: fwr_dev_flowrider2024" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Project Name",
    "description": "Updated description"
  }' \
  http://localhost:3737/api/projects/proj_123
```

#### DELETE /api/projects/:id
Delete a project

```bash
curl -X DELETE \
  -H "X-API-Key: fwr_dev_flowrider2024" \
  http://localhost:3737/api/projects/proj_123
```

### API Keys

#### GET /api/keys
List all API keys (requires admin scope)

```bash
curl -H "X-API-Key: fwr_dev_flowrider2024" \
  http://localhost:3737/api/keys
```

#### POST /api/keys
Create a new API key (requires admin scope)

```bash
curl -X POST \
  -H "X-API-Key: fwr_dev_flowrider2024" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CI/CD Pipeline",
    "scopes": ["read", "write"],
    "expiresAt": "2026-12-31T23:59:59Z"
  }' \
  http://localhost:3737/api/keys
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "key_abc123",
    "name": "CI/CD Pipeline",
    "key": "fwr_live_xyz789...",
    "prefix": "fwr_live_xyz",
    "scopes": ["read", "write"],
    "expiresAt": "2026-12-31T23:59:59Z",
    "createdAt": "2026-07-06T21:30:00Z"
  }
}
```

**Important**: The `key` field is only returned once upon creation. Store it securely!

#### DELETE /api/keys/:id
Revoke an API key (requires admin scope)

```bash
curl -X DELETE \
  -H "X-API-Key: fwr_dev_flowrider2024" \
  http://localhost:3737/api/keys/key_abc123
```

## Sessions (Planned)

Session management endpoints are currently available via Electron IPC. REST API endpoints are defined in the OpenAPI specification and will be implemented in a future release.

Planned endpoints:
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session
- `POST /api/sessions/:id/send` - Send input to session
- `GET /api/sessions/:id/output` - Get session output
- `POST /api/sessions/:id/restart` - Restart session

For now, use Electron IPC handlers:
- `ipcMain.handle('tmux:create', ...)`
- `ipcMain.handle('tmux:list', ...)`
- `ipcMain.handle('tmux:kill', ...)`
- etc.

## Webhooks (Planned)

Webhook management endpoints are currently available via Electron IPC. REST API endpoints are defined in the OpenAPI specification and will be implemented in a future release.

Planned endpoints:
- `GET /api/webhooks` - List all webhooks
- `POST /api/webhooks` - Create new webhook
- `DELETE /api/webhooks/:id` - Delete webhook
- `GET /api/webhooks/:id/deliveries` - Get webhook delivery history

For now, use Electron IPC handlers:
- `ipcMain.handle('webhooks:create', ...)`
- `ipcMain.handle('webhooks:list', ...)`
- `ipcMain.handle('webhooks:delete', ...)`
- etc.

## Error Handling

All endpoints return errors in a standard format:

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2026-07-06T21:30:00Z",
  "path": "/api/endpoint"
}
```

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid API key
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Common Error Codes

- `INVALID_INPUT` - Request validation failed
- `UNAUTHORIZED` - Authentication required
- `INSUFFICIENT_PERMISSIONS` - Missing required scopes
- `NOT_FOUND` - Resource doesn't exist
- `INTERNAL_ERROR` - Server-side error

## Rate Limiting

API requests are rate-limited to **100 requests per minute** per API key.

When rate limit is exceeded:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

## CORS

CORS is enabled for the following origins by default:
- `http://localhost:3000`
- `http://localhost:5173`
- `http://localhost:5174`

Additional origins can be configured in `ApiServerConfig`.

## Request Examples

### JavaScript/TypeScript

```typescript
// Using fetch API
const response = await fetch('http://localhost:3737/api/projects', {
  method: 'GET',
  headers: {
    'X-API-Key': 'fwr_dev_flowrider2024',
    'Content-Type': 'application/json',
  },
});

const result = await response.json();
console.log(result.data);
```

### Python

```python
import requests

headers = {
    'X-API-Key': 'fwr_dev_flowrider2024',
    'Content-Type': 'application/json',
}

response = requests.get(
    'http://localhost:3737/api/projects',
    headers=headers
)

data = response.json()
print(data['data'])
```

### cURL

```bash
# GET request
curl -H "X-API-Key: fwr_dev_flowrider2024" \
  http://localhost:3737/api/projects

# POST request
curl -X POST \
  -H "X-API-Key: fwr_dev_flowrider2024" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","path":"/path/to/project"}' \
  http://localhost:3737/api/projects
```

## Configuration

The API server can be configured via `src/main/api/ApiConfig.ts`:

```typescript
interface ApiServerConfig {
  port: number;              // Server port (default: 3737)
  enableCors?: boolean;      // Enable CORS (default: true)
  corsOrigins?: string[];    // Allowed origins
  logRequests?: boolean;     // Log requests (default: true)
}
```

## Development

### Starting the API Server

The API server starts automatically with the Electron app when API is enabled in settings.

To start manually:
```typescript
import { startApiServer } from './api';

const server = await startApiServer({ port: 3737 });
```

### Testing

Use the Swagger UI for interactive testing:
- Navigate to `http://localhost:3737/api/docs`
- Click "Authorize" and enter your API key
- Try out endpoints directly in the browser

### Generating API Clients

The OpenAPI specification can be used to generate client libraries:

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i http://localhost:3737/api/docs/openapi.json \
  -g typescript-fetch \
  -o ./generated-client

# Generate Python client
openapi-generator-cli generate \
  -i http://localhost:3737/api/docs/openapi.json \
  -g python \
  -o ./generated-client-python
```

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for API keys in production
3. **Rotate keys regularly** - especially after potential exposure
4. **Use scoped keys** - grant minimum required permissions
5. **Set expiration dates** on API keys when possible
6. **Monitor API usage** - check logs for suspicious activity
7. **Use HTTPS** in production (configure reverse proxy)

## Support

For issues, questions, or feature requests:
- GitHub Issues: https://github.com/josephas-llc/flowrider/issues
- Documentation: See `/api/docs` for interactive API explorer

## Changelog

### v1.0.0 (Current)
- OpenAPI 3.0 specification
- Swagger UI documentation
- Projects API endpoints
- API Keys management
- Health and version endpoints
- API key authentication
- CORS support

### Planned Features
- Sessions REST API (currently IPC only)
- Webhooks REST API (currently IPC only)
- WebSocket support for real-time updates
- Bulk operations
- GraphQL endpoint
- OAuth2 authentication
