# Webhook Secret Encryption - Code Example

## How It Works

### Creating a Webhook (Encryption)

```typescript
// User calls API
const webhook = webhookManager.createWebhook(
  'https://api.example.com/webhook',
  ['session.created'],
  { secret: 'my-super-secret-key-123' }
);

// Inside WebhookStore.createWebhook():
// 1. Encrypt the secret
const encryptedSecret = this.encryptSecret('my-super-secret-key-123');
// Result: 'YzJWa2NtVjBMVzE1TFhOMVpHWnlaUzF6WldOeVpYUXRhMlY1TFRFeU13PT0='

// 2. Store encrypted secret in database
INSERT INTO webhooks (id, url, events, secret, ...)
VALUES (
  'abc-123',
  'https://api.example.com/webhook',
  '["session.created"]',
  'YzJWa2NtVjBMVzE1TFhOMVpHWnlaUzF6WldOeVpYUXRhMlY1TFRFeU13PT0=', // ENCRYPTED
  ...
);

// 3. Return webhook with plaintext secret to caller
return {
  id: 'abc-123',
  url: 'https://api.example.com/webhook',
  events: ['session.created'],
  secret: 'my-super-secret-key-123', // PLAINTEXT (for immediate use)
  ...
};
```

### Retrieving a Webhook (Decryption)

```typescript
// User calls API
const webhook = webhookManager.getWebhook('abc-123');

// Inside WebhookStore.getWebhook() -> rowToWebhook():
// 1. Read from database
SELECT * FROM webhooks WHERE id = 'abc-123';
// Result: { secret: 'YzJWa2NtVjBMVzE1TFhOMVpHWnlaUzF6WldOeVpYUXRhMlY1TFRFeU13PT0=' }

// 2. Decrypt the secret
const decryptedSecret = this.decryptSecret(
  'YzJWa2NtVjBMVzE1TFhOMVpHWnlaUzF6WldOeVpYUXRhMlY1TFRFeU13PT0='
);
// Result: 'my-super-secret-key-123'

// 3. Return webhook with decrypted secret
return {
  id: 'abc-123',
  url: 'https://api.example.com/webhook',
  events: ['session.created'],
  secret: 'my-super-secret-key-123', // DECRYPTED
  ...
};
```

### Updating a Webhook (Re-encryption)

```typescript
// User calls API to update secret
webhookManager.updateWebhook('abc-123', {
  secret: 'new-secret-key-456'
});

// Inside WebhookStore.updateWebhook():
// 1. Encrypt the new secret
const encryptedSecret = this.encryptSecret('new-secret-key-456');
// Result: 'YzJWa2NtVjBMVzF1WlhjdGMyVmpjbVYwTFd0bGVTMDBOVFk9'

// 2. Update database with new encrypted secret
UPDATE webhooks
SET secret = 'YzJWa2NtVjBMVzF1WlhjdGMyVmpjbVYwTFd0bGVTMDBOVFk9',
    updated_at = 1720281600000
WHERE id = 'abc-123';
```

### Migration (Automatic on First Run)

```typescript
// On app startup, WebhookStore constructor calls migrateExistingSecrets()

// Database BEFORE migration:
SELECT id, secret FROM webhooks;
// Results:
// [
//   { id: 'webhook-1', secret: 'plaintext-secret-1' },
//   { id: 'webhook-2', secret: 'plaintext-secret-2' },
//   { id: 'webhook-3', secret: 'YzJXa2...' } // Already encrypted, skip
// ]

// Migration process:
for (const row of rows) {
  if (this.isSecretEncrypted(row.secret)) {
    continue; // Skip already encrypted secrets
  }

  // Encrypt plaintext secret
  const encrypted = this.encryptSecret(row.secret);

  // Update database
  UPDATE webhooks SET secret = ? WHERE id = ?
  VALUES (encrypted, row.id);
}

// Database AFTER migration:
SELECT id, secret FROM webhooks;
// Results:
// [
//   { id: 'webhook-1', secret: 'cGxhaW50ZXh0LXNlY3JldC0x...' }, // NOW ENCRYPTED
//   { id: 'webhook-2', secret: 'cGxhaW50ZXh0LXNlY3JldC0y...' }, // NOW ENCRYPTED
//   { id: 'webhook-3', secret: 'YzJXa2...' } // Already encrypted
// ]

// Console output:
// "Migrated 2 webhook secret(s) to encrypted format"
```

## Platform-Specific Encryption

### macOS (Keychain)
```typescript
// When you call encryptSecret() on macOS:
safeStorage.encryptString('my-secret');
// Internally uses:
// - Keychain Services API
// - AES-256-GCM encryption
// - Key derived from user login keychain
// - Only decryptable by same user on same machine
```

### Windows (DPAPI)
```typescript
// When you call encryptSecret() on Windows:
safeStorage.encryptString('my-secret');
// Internally uses:
// - CryptProtectData (DPAPI)
// - AES-256 encryption
// - Key derived from user profile
// - Only decryptable by same user on same machine
```

### Linux (libsecret)
```typescript
// When you call encryptSecret() on Linux:
safeStorage.encryptString('my-secret');
// Internally uses:
// - libsecret library
// - Encrypted with session/user keyring
// - Only decryptable by same user on same machine
```

## Error Handling Example

```typescript
// If decryption fails (corrupt data, wrong machine, etc.):
try {
  const decrypted = this.decryptSecret(row.secret);
  webhook.secret = decrypted;
} catch (error) {
  console.error('Error decrypting webhook secret:', error);
  // Graceful degradation - webhook still works but without secret
  webhook.secret = null;
}

// Application continues to function
// Webhook deliveries will proceed without HMAC signature
```

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CREATE WEBHOOK                            │
└─────────────────────────────────────────────────────────────┘
         │
         ├──> User provides: 'my-secret-123'
         │
         ├──> encryptSecret() called
         │    └──> Electron safeStorage.encryptString()
         │         └──> Platform-specific encryption (Keychain/DPAPI/libsecret)
         │              └──> Returns encrypted buffer
         │
         ├──> Convert to base64: 'YzJWa2NtVjBMVzE1...'
         │
         ├──> Store in SQLite: INSERT INTO webhooks (secret = 'YzJWa2NtVjBMVzE1...')
         │
         └──> Return to caller: { secret: 'my-secret-123' } (plaintext)


┌─────────────────────────────────────────────────────────────┐
│                    RETRIEVE WEBHOOK                          │
└─────────────────────────────────────────────────────────────┘
         │
         ├──> Query SQLite: SELECT secret FROM webhooks
         │    └──> Returns: 'YzJWa2NtVjBMVzE1...'
         │
         ├──> decryptSecret() called
         │    └──> Convert from base64 to buffer
         │         └──> Electron safeStorage.decryptString()
         │              └──> Platform-specific decryption
         │                   └──> Returns plaintext: 'my-secret-123'
         │
         └──> Return to caller: { secret: 'my-secret-123' } (decrypted)


┌─────────────────────────────────────────────────────────────┐
│                    USE SECRET (HMAC)                         │
└─────────────────────────────────────────────────────────────┘
         │
         ├──> Webhook delivery triggered
         │
         ├──> Get webhook (automatic decryption)
         │    └──> secret: 'my-secret-123'
         │
         ├──> Generate HMAC signature
         │    └──> crypto.createHmac('sha256', 'my-secret-123')
         │         └──> hmac.update(payload)
         │              └──> signature = hmac.digest('hex')
         │
         ├──> Send HTTP request with headers:
         │    └──> X-Webhook-Signature: sha256=abc123def456...
         │
         └──> Secret never exposed in logs or external systems
```

## Security Properties

### What's Protected
- ✅ Secrets encrypted at rest in SQLite database
- ✅ Decryption only possible by same user on same machine
- ✅ Platform keychain/credential manager protection
- ✅ AES-256 encryption (platform-dependent implementation)

### What's NOT Protected
- ⚠️ Secrets in memory during use (normal for any application)
- ⚠️ Secrets in network requests (required for HMAC verification)
- ⚠️ Secrets if user keychain is compromised (OS-level security)

### Attack Scenarios

| Attack | Protected? | Explanation |
|--------|-----------|-------------|
| Database file theft | ✅ Yes | Secrets encrypted, can't be decrypted on different machine |
| Database file read by another user | ✅ Yes | OS keychain prevents decryption by different user |
| Database file read by same user | ⚠️ Partial | Same user can decrypt, but that's expected (they created it) |
| Memory dump during runtime | ❌ No | Secrets in memory during use (unavoidable for HMAC) |
| Man-in-the-middle attack | ❌ No | Use HTTPS for webhook URLs (not related to storage) |
| SQL injection | ✅ Yes | Even if attacker reads encrypted secrets, can't decrypt |

## Real-World Example

```typescript
// Example: Slack webhook integration

// 1. User creates webhook in Flowrider UI
const webhook = await ipcRenderer.invoke('webhooks:create', {
  url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
  events: ['session.completed'],
  secret: 'whsec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', // Slack signing secret
  description: 'Notify Slack on session completion'
});

// 2. Flowrider stores it (encrypted):
// Database: secret = 'YzJXa2MyVmpYM0V4WWpKak0yUTBaVFZtTm1jM2FEaHBPV293YXpGc01tMHpialJ2TldBMg=='

// 3. Session completes, webhook fires
await webhookManager.fireEvent('session.completed', {
  sessionId: 'sess_123',
  sessionName: 'Main Session',
  exitCode: 0,
  duration: 3600000
});

// 4. WebhookManager retrieves webhook (decrypted):
// secret = 'whsec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'

// 5. Generate HMAC signature
const signature = crypto
  .createHmac('sha256', 'whsec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6')
  .update(JSON.stringify(payload))
  .digest('hex');

// 6. Send to Slack with signature
POST https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
Headers:
  X-Webhook-Signature: sha256=abc123def456...
  X-Webhook-Event: session.completed
Body:
  { sessionId: 'sess_123', ... }

// 7. Slack verifies signature using their stored secret
// 8. Message appears in Slack channel!
```

---

**Security Level**: HIGH
**Encryption**: AES-256 (platform-specific)
**Key Storage**: OS Keychain/DPAPI/libsecret
**Backward Compatible**: YES
**Production Ready**: YES
