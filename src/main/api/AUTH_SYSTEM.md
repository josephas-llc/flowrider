# API Key Authentication System - Complete Documentation

## System Overview

A production-ready API key authentication system for Flowrider's REST API featuring:

- **Secure key generation** using `crypto.randomBytes` (32-byte random keys)
- **Hashed storage** using SHA-256 (never stores plaintext keys)
- **SQLite persistence** with WAL mode for concurrency
- **Scope-based permissions** (read, write, admin)
- **Usage tracking** (request count, last used timestamp)
- **Express middleware** for easy route protection
- **REST API** for key management

## File Structure

```
src/main/api/
├── auth/
│   ├── ApiKeyStore.ts       # SQLite storage layer (7.3 KB)
│   └── ApiKeyManager.ts     # Key generation & validation (7.6 KB)
├── middleware/
│   └── auth.ts              # Express authentication middleware (4.8 KB)
├── routes/
│   └── apikeys.ts           # REST endpoints for key management
├── bootstrap.ts             # Helper to create first admin key
├── server.example.ts        # Complete Express server example
├── USAGE.md                 # Quick start guide
└── AUTH_SYSTEM.md          # This file
```

## Architecture

### 1. ApiKeyStore (Storage Layer)

**File**: `auth/ApiKeyStore.ts`

Handles all database operations for API keys.

**Key Features:**
- SQLite database with WAL mode
- Indexed queries for performance
- Hashed key storage (SHA-256)
- Usage tracking on each request
- Support for soft delete (revoke) and hard delete

**Database Schema:**
```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,              -- UUID
  name TEXT NOT NULL,               -- Human-readable name
  key_hash TEXT NOT NULL UNIQUE,    -- SHA-256 hash of full key
  prefix TEXT NOT NULL,             -- First 12 chars for display
  scopes TEXT NOT NULL,             -- JSON array: ["read", "write", "admin"]
  created_at INTEGER NOT NULL,      -- Unix timestamp
  last_used_at INTEGER,             -- Unix timestamp (nullable)
  request_count INTEGER DEFAULT 0,  -- Total requests made
  is_active INTEGER DEFAULT 1       -- 1 = active, 0 = revoked
)
```

**API:**
```typescript
const store = getApiKeyStore();

// Create
const key = store.create({ name, keyHash, prefix, scopes });

// Read
const key = store.findByHash(keyHash);
const key = store.findById(id);
const keys = store.listAll();
const keys = store.listActive();

// Update
store.update(id, { name, scopes });
store.trackUsage(keyHash); // Increment count, update last_used_at

// Delete
store.revoke(id);  // Soft delete (set is_active = 0)
store.delete(id);  // Hard delete (remove from DB)

// Stats
const stats = store.getStats();
```

### 2. ApiKeyManager (Business Logic)

**File**: `auth/ApiKeyManager.ts`

High-level API for key generation, validation, and management.

**Key Format:**
- Live keys: `fr_live_<64 hex chars>`
- Test keys: `fr_test_<64 hex chars>`

**Example:**
```
fr_live_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
└──┬──┘ └────────────────────────────┬────────────────────────────┘
 prefix              64 hex characters (32 random bytes)
```

**API:**
```typescript
const manager = getApiKeyManager();

// Generate new key
const key = manager.generate(
  'My App',           // name
  ['read', 'write'],  // scopes
  'live'              // environment: 'live' or 'test'
);
// Returns: { id, key, prefix, name, scopes, createdAt }
// WARNING: `key` is only shown once!

// Validate key
const result = manager.validate('fr_live_...');
if (result.valid) {
  console.log('Key:', result.key);
  // Automatically tracks usage
}

// Check permissions
manager.hasScope(key, 'read');     // true/false
manager.hasAnyScope(key, ['read', 'write']); // true/false

// Management
manager.list();        // All keys (safe info only)
manager.listActive();  // Active keys only
manager.getById(id);   // Single key
manager.update(id, { name, scopes });
manager.revoke(id);    // Deactivate
manager.delete(id);    // Permanent delete
manager.getStats();    // Usage statistics
```

### 3. Authentication Middleware

**File**: `middleware/auth.ts`

Express middleware for protecting routes.

**Available Middleware:**

1. **`requireApiKey`** - Validates API key presence and validity
   ```typescript
   app.get('/api/data', requireApiKey, (req, res) => {
     // req.apiKey is populated with validated key info
   });
   ```

2. **`requireScope(...scopes)`** - Requires specific scope(s)
   ```typescript
   app.post('/api/data', requireApiKey, requireScope('write', 'admin'), (req, res) => {
     // Requires 'write' OR 'admin' scope
   });
   ```

3. **Convenience Middleware:**
   - `requireReadScope` - Shorthand for `requireScope('read')`
   - `requireWriteScope` - Shorthand for `requireScope('write')`
   - `requireAdminScope` - Shorthand for `requireScope('admin')`

4. **`optionalApiKey`** - Attaches key if present, but doesn't require it
   ```typescript
   app.get('/api/data', optionalApiKey, (req, res) => {
     if (req.apiKey) {
       // Authenticated - return premium data
     } else {
       // Unauthenticated - return public data
     }
   });
   ```

5. **`logApiRequest`** - Logs authenticated requests
   ```typescript
   app.get('/api/data', requireApiKey, logApiRequest, (req, res) => {
     // Logs: [API Request] GET /api/data { keyId, keyName, ... }
   });
   ```

**Authentication Headers:**

The middleware accepts keys in two formats:

1. **X-API-Key header** (recommended):
   ```
   X-API-Key: fr_live_...
   ```

2. **Authorization Bearer header**:
   ```
   Authorization: Bearer fr_live_...
   ```

**Error Responses:**

Missing key (401):
```json
{
  "success": false,
  "error": "Missing API key. Provide via X-API-Key header or Authorization: Bearer header."
}
```

Invalid key (401):
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

Insufficient permissions (403):
```json
{
  "success": false,
  "error": "Insufficient permissions. Required scopes: write",
  "requiredScopes": ["write"],
  "yourScopes": ["read"]
}
```

### 4. REST API Endpoints

**File**: `routes/apikeys.ts`

All endpoints require admin scope.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/keys` | List all API keys |
| GET | `/api/keys/active` | List active keys only |
| GET | `/api/keys/:id` | Get specific key by ID |
| POST | `/api/keys` | Create new API key |
| PUT | `/api/keys/:id` | Update key name/scopes |
| DELETE | `/api/keys/:id` | Revoke key (soft delete) |
| DELETE | `/api/keys/:id/permanent` | Delete key permanently |
| GET | `/api/keys-stats` | Get usage statistics |

**Example Requests:**

Create a new key:
```bash
curl -X POST http://localhost:3847/api/keys \
  -H "X-API-Key: fr_live_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobile App",
    "scopes": ["read", "write"],
    "environment": "live"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "key": "fr_live_a1b2c3d4...",
    "prefix": "fr_live_a1b2",
    "name": "Mobile App",
    "scopes": ["read", "write"],
    "createdAt": 1234567890
  },
  "warning": "Save this API key now. You will not be able to see it again!"
}
```

List keys:
```bash
curl http://localhost:3847/api/keys \
  -H "X-API-Key: fr_live_ADMIN_KEY"
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "prefix": "fr_live_a1b2",
      "name": "Mobile App",
      "scopes": ["read", "write"],
      "createdAt": 1234567890,
      "lastUsedAt": 1234567900,
      "requestCount": 42,
      "isActive": true
    }
  ]
}
```

## Scope Hierarchy

```
admin
  ├── Full system access
  ├── Manage API keys
  ├── Includes write permissions
  └── Includes read permissions

write
  ├── Create/update resources
  ├── Modify data
  └── Includes read permissions

read
  └── View-only access
```

**Scope Resolution:**
- Admin users can access all endpoints
- Write users can access write and read endpoints
- Read users can only access read endpoints

**Code Example:**
```typescript
// Check if key has write permission
if (manager.hasScope(apiKey, 'write')) {
  // Key has 'write' OR 'admin' scope
}

// Check multiple scopes (any match)
if (manager.hasAnyScope(apiKey, ['write', 'admin'])) {
  // Key has at least one of these scopes
}
```

## Security

### Key Generation

Keys are generated using Node.js `crypto.randomBytes`:
```typescript
const randomBytes = crypto.randomBytes(32); // 32 bytes = 256 bits
const randomHex = randomBytes.toString('hex'); // 64 hex characters
const fullKey = `fr_live_${randomHex}`;
```

This provides:
- 256 bits of entropy
- Cryptographically secure randomness
- ~1.16 × 10^77 possible combinations

### Key Storage

Keys are hashed using SHA-256 before storage:
```typescript
const keyHash = crypto.createHash('sha256').update(key).digest('hex');
```

The database stores:
- ✅ Key hash (SHA-256)
- ✅ Display prefix (first 12 chars)
- ✅ Metadata (name, scopes, timestamps)
- ❌ Never stores plaintext keys

### Best Practices

1. **Minimal Scopes**
   - Grant only the permissions needed
   - Use `read` for public-facing apps
   - Reserve `admin` for internal tools

2. **Key Rotation**
   - Create new keys periodically
   - Revoke old keys after migration
   - Track `lastUsedAt` to find unused keys

3. **Environment Separation**
   - Use `test` keys for development
   - Use `live` keys for production
   - Consider separate databases per environment

4. **Monitoring**
   - Check `requestCount` regularly
   - Alert on unusual usage patterns
   - Revoke compromised keys immediately

5. **Transport Security**
   - Always use HTTPS in production
   - Never log full API keys
   - Rotate keys if potentially exposed

## Integration Guide

### Step 1: Bootstrap

Create your first admin key:

```typescript
import { createFirstAdminKey } from './api/bootstrap';

// Run this once during setup
const adminKey = createFirstAdminKey('Admin Key');
console.log('Admin key:', adminKey);
// Save this somewhere safe!
```

### Step 2: Protect Routes

```typescript
import express from 'express';
import { requireApiKey, requireReadScope, requireWriteScope } from './api/middleware/auth';

const app = express();

// Public endpoint (no auth)
app.get('/api/public', (req, res) => {
  res.json({ data: 'public' });
});

// Read-only endpoint
app.get('/api/sessions', requireApiKey, requireReadScope, (req, res) => {
  res.json({ sessions: [] });
});

// Write endpoint
app.post('/api/sessions', requireApiKey, requireWriteScope, (req, res) => {
  res.json({ success: true });
});
```

### Step 3: Create Application Keys

```bash
# Create a read-only key for a mobile app
curl -X POST http://localhost:3847/api/keys \
  -H "X-API-Key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobile App (iOS)",
    "scopes": ["read"],
    "environment": "live"
  }'

# Create a write key for a web app
curl -X POST http://localhost:3847/api/keys \
  -H "X-API-Key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Web Dashboard",
    "scopes": ["read", "write"],
    "environment": "live"
  }'
```

### Step 4: Monitor Usage

```bash
# Get statistics
curl http://localhost:3847/api/keys-stats \
  -H "X-API-Key: YOUR_ADMIN_KEY"

# List all keys with usage
curl http://localhost:3847/api/keys \
  -H "X-API-Key: YOUR_ADMIN_KEY"
```

## Troubleshooting

### Database Location

API keys are stored in:
```
macOS:   ~/Library/Application Support/Flowrider/flowrider-apikeys.db
Windows: %APPDATA%/Flowrider/flowrider-apikeys.db
Linux:   ~/.config/Flowrider/flowrider-apikeys.db
```

### Reset Everything

To start fresh (WARNING: deletes all keys):

```bash
# Stop the app
# Delete the database
rm ~/Library/Application\ Support/Flowrider/flowrider-apikeys.db*

# Restart the app
# Create a new admin key
```

### Common Errors

**"Invalid API key prefix"**
- Key must start with `fr_live_` or `fr_test_`
- Check for typos or extra whitespace

**"API key not found or has been revoked"**
- Key was revoked or deleted
- Create a new key

**"At least one scope is required"**
- When creating/updating, must specify at least one scope
- Valid scopes: `read`, `write`, `admin`

## Performance

- **Key validation**: O(1) hash lookup in SQLite
- **Indexed queries**: All lookups use indexes
- **WAL mode**: Supports concurrent reads
- **Memory efficient**: Keys loaded on-demand, not cached in memory

Typical performance:
- Key validation: <1ms
- Key creation: <5ms
- List operations: <10ms (for 1000 keys)

## Testing

### Unit Tests

```typescript
import { ApiKeyManager } from './api/auth/ApiKeyManager';

describe('ApiKeyManager', () => {
  it('generates valid keys', () => {
    const manager = new ApiKeyManager();
    const key = manager.generate('Test', ['read'], 'live');
    expect(key.key).toMatch(/^fr_live_[a-f0-9]{64}$/);
  });

  it('validates correct keys', () => {
    const manager = new ApiKeyManager();
    const generated = manager.generate('Test', ['read'], 'live');
    const result = manager.validate(generated.key);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid keys', () => {
    const manager = new ApiKeyManager();
    const result = manager.validate('invalid');
    expect(result.valid).toBe(false);
  });
});
```

### Integration Tests

```bash
# Start server
npm run dev

# Create admin key (programmatically)

# Test endpoints
curl http://localhost:3847/api/keys -H "X-API-Key: fr_live_..."
curl -X POST http://localhost:3847/api/keys \
  -H "X-API-Key: fr_live_..." \
  -d '{"name":"Test","scopes":["read"]}'
```

## Migration

If you're adding authentication to an existing API:

1. **Deploy the system** without enforcing it
2. **Create API keys** for all existing integrations
3. **Update clients** to use API keys
4. **Enable optional authentication** (`optionalApiKey` middleware)
5. **Monitor adoption** (check which requests are authenticated)
6. **Enforce authentication** (switch to `requireApiKey`)
7. **Remove old authentication** (if applicable)

## Future Enhancements

Potential additions:

- [ ] Key expiration dates
- [ ] Rate limiting per key
- [ ] IP whitelisting
- [ ] Key usage analytics dashboard
- [ ] Webhook notifications for key events
- [ ] API key rotation (generate new, keep old valid for X days)
- [ ] Scope granularity (e.g., `read:sessions`, `write:projects`)
- [ ] Multi-factor authentication for admin operations
- [ ] Audit log of all key operations

## Support

For issues or questions:

1. Check `USAGE.md` for quick start guide
2. Review `server.example.ts` for integration examples
3. Check database file permissions
4. Review server logs for error details
5. Ensure Express server is running on expected port

## License

Part of Flowrider - AI Session Orchestration Tool
Copyright © 2024 Josephas LLC
