/**
 * Bootstrap Script - Create First Admin API Key
 *
 * Run this script once to create your first admin API key.
 * This is needed to access the API key management endpoints.
 *
 * Usage:
 *   npx ts-node src/main/api/bootstrap.ts
 *
 * Or programmatically:
 *   import { createFirstAdminKey } from './api/bootstrap';
 *   const key = createFirstAdminKey();
 */

import { getApiKeyManager } from './auth/ApiKeyManager';

/**
 * Create the first admin API key
 * Use this to bootstrap your API authentication system
 */
export function createFirstAdminKey(keyName: string = 'Bootstrap Admin Key'): string {
  console.log('[Bootstrap] Creating first admin API key...');

  const manager = getApiKeyManager();

  try {
    // Check if any admin keys already exist
    const existingKeys = manager.listActive();
    const hasAdminKey = existingKeys.some(key => key.scopes.includes('admin'));

    if (hasAdminKey) {
      console.log('[Bootstrap] Admin key already exists. Listing existing keys:');
      existingKeys.forEach(key => {
        console.log(`  - ${key.name} (${key.prefix}...) - Scopes: ${key.scopes.join(', ')}`);
      });
      throw new Error('Admin key already exists. Use existing key or revoke it first.');
    }

    // Generate the admin key
    const adminKey = manager.generate(keyName, ['admin'], 'live');

    console.log('\n========================================');
    console.log('Admin API Key Created Successfully!');
    console.log('========================================\n');
    console.log('API Key:', adminKey.key);
    console.log('Name:', adminKey.name);
    console.log('Prefix:', adminKey.prefix);
    console.log('Scopes:', adminKey.scopes.join(', '));
    console.log('Created:', new Date(adminKey.createdAt).toISOString());
    console.log('\n========================================');
    console.log('IMPORTANT: Save this key now!');
    console.log('You will NOT be able to see it again.');
    console.log('========================================\n');

    return adminKey.key;
  } catch (error: any) {
    console.error('[Bootstrap] Error:', error.message);
    throw error;
  }
}

/**
 * Create a test key (for development)
 */
export function createTestKey(keyName: string = 'Test Key'): string {
  console.log('[Bootstrap] Creating test API key...');

  const manager = getApiKeyManager();

  const testKey = manager.generate(keyName, ['read', 'write'], 'test');

  console.log('\n========================================');
  console.log('Test API Key Created!');
  console.log('========================================\n');
  console.log('API Key:', testKey.key);
  console.log('Name:', testKey.name);
  console.log('Prefix:', testKey.prefix);
  console.log('Scopes:', testKey.scopes.join(', '));
  console.log('Environment: test');
  console.log('\n========================================\n');

  return testKey.key;
}

// If running as a script (not imported)
if (require.main === module) {
  const args = process.argv.slice(2);
  const keyName = args[0] || 'Admin Key';

  try {
    createFirstAdminKey(keyName);
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}
