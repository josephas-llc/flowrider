# API Key Authentication - Quick Start Guide

## Overview

Your Flowrider API now has secure API key authentication! This guide will walk you through generating your first API key and using it to make authenticated requests.

## Step 1: Generate Your First Admin Key

Since you need an admin key to create other keys, you'll need to bootstrap the system. Run this code once in your Electron app:

```typescript
import { createFirstAdminKey } from './api/bootstrap';

// Create the first admin key (run this once!)
const adminKey = createFirstAdminKey();

// Or from the full path:
import { createFirstAdminKey } from './src/main/api';
const adminKey = createFirstAdminKey('My Admin Key');
```

**Save the output!** The full API key will look like:
```
fr_live_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

## Step 2: Test the API

### Using curl

```bash
# Check server health (no auth required)
curl http://localhost:3847/api/health

# List API keys (requires admin key)
curl http://localhost:3847/api/keys \
  -H "X-API-Key: fr_live_..."

# Create a new read-only key
curl -X POST http://localhost:3847/api/keys \
  -H "X-API-Key: fr_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobile App Key",
    "scopes": ["read"],
    "environment": "live"
  }'
```

### Using JavaScript/TypeScript

```typescript
// Make authenticated API call
const response = await fetch('http://localhost:3847/api/keys', {
  headers: {
    'X-API-Key': 'fr_live_...',
  },
});

const data = await response.json();
console.log(data);
```

## Step 3: Protect Your Routes

Add authentication to your custom API endpoints:

```typescript
import { requireApiKey, requireReadScope } from './api/middleware/auth';

// Protect a route with API key authentication
app.get('/api/sessions', requireApiKey, requireReadScope, (req, res) => {
  // req.apiKey contains the validated key info
  console.log('Authenticated as:', req.apiKey.name);

  res.json({
    success: true,
    data: [], // your session data
  });
});
```

## API Scopes

| Scope | Permissions | Use Case |
|-------|-------------|----------|
| `read` | View data only | Public-facing apps, dashboards |
| `write` | Create/update data (includes read) | Trusted applications |
| `admin` | Full access (includes read/write) | Internal tools, key management |

## Common Operations

### Create a Test Key

```typescript
import { getApiKeyManager } from './api';

const manager = getApiKeyManager();
const testKey = manager.generate('Test Key', ['read'], 'test');
console.log('Test key:', testKey.key);
```

### Revoke a Compromised Key

```bash
curl -X DELETE http://localhost:3847/api/keys/KEY_ID_HERE \
  -H "X-API-Key: fr_live_..."
```

### List All Keys with Usage Stats

```bash
curl http://localhost:3847/api/keys \
  -H "X-API-Key: fr_live_..."
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "abc-123",
      "name": "Mobile App",
      "prefix": "fr_live_a1b2",
      "scopes": ["read"],
      "requestCount": 1247,
      "lastUsedAt": 1234567890,
      "createdAt": 1234567890,
      "isActive": true
    }
  ]
}
```

## Integration Examples

### Example 1: Protect Existing Endpoints

```typescript
// Before (no auth)
app.get('/api/data', (req, res) => {
  res.json({ data: [] });
});

// After (with auth)
import { requireApiKey, requireReadScope } from './api/middleware/auth';

app.get('/api/data', requireApiKey, requireReadScope, (req, res) => {
  res.json({ data: [] });
});
```

### Example 2: Different Scopes for Different Routes

```typescript
import { requireApiKey, requireReadScope, requireWriteScope, requireAdminScope } from './api/middleware/auth';

// Public read access
app.get('/api/sessions', requireApiKey, requireReadScope, (req, res) => {
  res.json({ sessions: [] });
});

// Write access required
app.post('/api/sessions', requireApiKey, requireWriteScope, (req, res) => {
  res.json({ success: true, id: 123 });
});

// Admin only
app.delete('/api/sessions/:id', requireApiKey, requireAdminScope, (req, res) => {
  res.json({ success: true });
});
```

### Example 3: Optional Authentication

```typescript
import { optionalApiKey } from './api/middleware/auth';

app.get('/api/public', optionalApiKey, (req, res) => {
  if (req.apiKey) {
    // Authenticated request - return more data
    res.json({ premium: true, data: [] });
  } else {
    // Unauthenticated - return limited data
    res.json({ premium: false, data: [] });
  }
});
```

## Security Best Practices

1. **Never commit API keys to version control**
   - Add `*.key` to `.gitignore`
   - Use environment variables for production keys

2. **Rotate keys regularly**
   - Create new keys periodically
   - Revoke old keys after migration

3. **Use minimal scopes**
   - Give each key only the permissions it needs
   - Use `read` for public apps
   - Reserve `admin` for internal tools

4. **Monitor usage**
   - Check `requestCount` and `lastUsedAt` regularly
   - Revoke unused keys

5. **Separate environments**
   - Use `test` keys for development
   - Use `live` keys for production

## Troubleshooting

### "Missing API key" Error

Make sure you're including the header:
```bash
-H "X-API-Key: fr_live_..."
```
or
```bash
-H "Authorization: Bearer fr_live_..."
```

### "Insufficient permissions" Error

Your key doesn't have the required scope. Check your key's scopes:
```bash
curl http://localhost:3847/api/keys/YOUR_KEY_ID \
  -H "X-API-Key: fr_live_ADMIN_KEY"
```

### Database Issues

The API keys are stored in:
```
~/Library/Application Support/Flowrider/flowrider-apikeys.db
```

If you have issues, you can delete this file to start fresh (you'll lose all keys).

## Next Steps

1. Generate your first admin key using the bootstrap script
2. Create keys for your applications (web, mobile, CLI tools)
3. Protect your existing API endpoints with the middleware
4. Monitor usage and rotate keys regularly

For more details, see:
- `auth/ApiKeyManager.ts` - Key generation and validation
- `auth/ApiKeyStore.ts` - Database operations
- `middleware/auth.ts` - Authentication middleware
- `routes/apikeys.ts` - API endpoints
