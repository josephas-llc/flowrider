/**
 * Stripe License Service for Flowrider
 *
 * Simple integration:
 * 1. Customer pays via Stripe Checkout (hosted by Stripe)
 * 2. Stripe webhook notifies us of successful payment
 * 3. We generate a license key and email it to customer
 * 4. Customer enters license key in app
 *
 * This keeps things simple - Stripe handles all the payment complexity.
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import Database from 'better-sqlite3';

// License tiers
export enum LicenseTier {
  FREE = 'free',
  PRO = 'pro',
  TEAM = 'team',
  ENTERPRISE = 'enterprise'
}

// Stripe Configuration - Set via environment variables
// See docs/STRIPE_SETUP.md for setup instructions
export const STRIPE_CONFIG = {
  // Required: Set these environment variables
  PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
  SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Price IDs from Stripe Dashboard
  PRICE_IDS: {
    PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || '',      // $19/mo
    PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY || '',        // $190/yr
    TEAM_MONTHLY: process.env.STRIPE_PRICE_TEAM_MONTHLY || '',    // $49/mo
    TEAM_YEARLY: process.env.STRIPE_PRICE_TEAM_YEARLY || '',      // $490/yr
    ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || '',        // Custom
  },

  // Checkout URLs
  SUCCESS_URL: 'https://flowrider.dev/success.html?session_id={CHECKOUT_SESSION_ID}',
  CANCEL_URL: 'https://flowrider.dev/pricing.html',
};

// Session limits by tier
export const TIER_LIMITS: Record<LicenseTier, number> = {
  [LicenseTier.FREE]: 3,
  [LicenseTier.PRO]: 20,
  [LicenseTier.TEAM]: 100,
  [LicenseTier.ENTERPRISE]: 400
};

export interface License {
  id: string;
  key: string;
  tier: LicenseTier;
  customerEmail: string;
  customerName: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  maxSessions: number;
  activations: number;
  maxActivations: number;
  isActive: boolean;
  expiresAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface LicenseActivation {
  id: string;
  licenseId: string;
  machineId: string;
  machineName: string;
  activatedAt: number;
  lastSeenAt: number;
  isActive: boolean;
}

/**
 * Generate a license key in format: FR-XXXX-XXXX-XXXX-XXXX
 */
function generateLicenseKey(): string {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return `FR-${segments.join('-')}`;
}

/**
 * Get machine ID for this installation
 */
function getMachineId(): string {
  const userDataPath = app.getPath('userData');
  const machineIdPath = path.join(userDataPath, '.machine-id');

  if (fs.existsSync(machineIdPath)) {
    return fs.readFileSync(machineIdPath, 'utf-8').trim();
  }

  const machineId = crypto.randomUUID();
  fs.writeFileSync(machineIdPath, machineId);
  return machineId;
}

class StripeLicenseService {
  private db: Database.Database;
  private machineId: string;
  private currentLicense: License | null = null;
  private licenseFilePath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'licenses.db');
    this.licenseFilePath = path.join(userDataPath, 'current-license.json');
    this.machineId = getMachineId();

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
    this.loadCurrentLicense();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        tier TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_name TEXT,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        max_sessions INTEGER NOT NULL,
        activations INTEGER DEFAULT 0,
        max_activations INTEGER DEFAULT 3,
        is_active INTEGER DEFAULT 1,
        expires_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS license_activations (
        id TEXT PRIMARY KEY,
        license_id TEXT NOT NULL,
        machine_id TEXT NOT NULL,
        machine_name TEXT NOT NULL,
        activated_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (license_id) REFERENCES licenses(id),
        UNIQUE(license_id, machine_id)
      );

      CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(key);
      CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(customer_email);
      CREATE INDEX IF NOT EXISTS idx_activations_license ON license_activations(license_id);
      CREATE INDEX IF NOT EXISTS idx_activations_machine ON license_activations(machine_id);
    `);
  }

  private loadCurrentLicense(): void {
    try {
      if (fs.existsSync(this.licenseFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.licenseFilePath, 'utf-8'));
        // Validate the license is still valid
        if (data.key) {
          const result = this.validateLicenseKey(data.key);
          if (result.valid) {
            this.currentLicense = result.license!;
          }
        }
      }
    } catch (error) {
      console.error('[StripeLicenseService] Error loading license:', error);
    }
  }

  private saveCurrentLicense(): void {
    try {
      if (this.currentLicense) {
        fs.writeFileSync(this.licenseFilePath, JSON.stringify({
          key: this.currentLicense.key,
          tier: this.currentLicense.tier,
          activatedAt: Date.now()
        }, null, 2));
      } else {
        if (fs.existsSync(this.licenseFilePath)) {
          fs.unlinkSync(this.licenseFilePath);
        }
      }
    } catch (error) {
      console.error('[StripeLicenseService] Error saving license:', error);
    }
  }

  /**
   * Create a new license (called when Stripe payment succeeds)
   */
  createLicense(data: {
    tier: LicenseTier;
    customerEmail: string;
    customerName?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    expiresAt?: number;
  }): License {
    const id = crypto.randomUUID();
    const key = generateLicenseKey();
    const now = Date.now();

    const license: License = {
      id,
      key,
      tier: data.tier,
      customerEmail: data.customerEmail,
      customerName: data.customerName || null,
      stripeCustomerId: data.stripeCustomerId || null,
      stripeSubscriptionId: data.stripeSubscriptionId || null,
      maxSessions: TIER_LIMITS[data.tier],
      activations: 0,
      maxActivations: data.tier === LicenseTier.TEAM ? 10 : 3,
      isActive: true,
      expiresAt: data.expiresAt || null,
      createdAt: now,
      updatedAt: now
    };

    this.db.prepare(`
      INSERT INTO licenses (
        id, key, tier, customer_email, customer_name,
        stripe_customer_id, stripe_subscription_id,
        max_sessions, activations, max_activations,
        is_active, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      license.id, license.key, license.tier, license.customerEmail,
      license.customerName, license.stripeCustomerId, license.stripeSubscriptionId,
      license.maxSessions, license.activations, license.maxActivations,
      license.isActive ? 1 : 0, license.expiresAt, license.createdAt, license.updatedAt
    );

    console.log(`[StripeLicenseService] Created license: ${key} for ${data.customerEmail}`);
    return license;
  }

  /**
   * Validate a license key (doesn't activate, just checks)
   */
  validateLicenseKey(key: string): { valid: boolean; error?: string; license?: License } {
    const row = this.db.prepare('SELECT * FROM licenses WHERE key = ?').get(key) as any;

    if (!row) {
      return { valid: false, error: 'Invalid license key' };
    }

    if (!row.is_active) {
      return { valid: false, error: 'License has been deactivated' };
    }

    if (row.expires_at && row.expires_at < Date.now()) {
      return { valid: false, error: 'License has expired' };
    }

    const license: License = {
      id: row.id,
      key: row.key,
      tier: row.tier as LicenseTier,
      customerEmail: row.customer_email,
      customerName: row.customer_name,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      maxSessions: row.max_sessions,
      activations: row.activations,
      maxActivations: row.max_activations,
      isActive: row.is_active === 1,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    return { valid: true, license };
  }

  /**
   * Activate a license on this machine
   */
  activateLicense(key: string): { success: boolean; error?: string; license?: License } {
    const validation = this.validateLicenseKey(key);

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const license = validation.license!;

    // Check if already activated on this machine
    const existingActivation = this.db.prepare(`
      SELECT * FROM license_activations
      WHERE license_id = ? AND machine_id = ? AND is_active = 1
    `).get(license.id, this.machineId);

    if (existingActivation) {
      // Already activated on this machine, just update last seen
      this.db.prepare(`
        UPDATE license_activations SET last_seen_at = ? WHERE license_id = ? AND machine_id = ?
      `).run(Date.now(), license.id, this.machineId);

      this.currentLicense = license;
      this.saveCurrentLicense();
      return { success: true, license };
    }

    // Check activation limit
    if (license.activations >= license.maxActivations) {
      return {
        success: false,
        error: `Activation limit reached (${license.activations}/${license.maxActivations}). Deactivate another device first.`
      };
    }

    // Create new activation
    const activationId = crypto.randomUUID();
    const now = Date.now();
    const machineName = `${require('os').hostname()}-${this.machineId.slice(0, 8)}`;

    this.db.prepare(`
      INSERT INTO license_activations (id, license_id, machine_id, machine_name, activated_at, last_seen_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(activationId, license.id, this.machineId, machineName, now, now);

    // Increment activation count
    this.db.prepare(`
      UPDATE licenses SET activations = activations + 1, updated_at = ? WHERE id = ?
    `).run(now, license.id);

    license.activations += 1;
    this.currentLicense = license;
    this.saveCurrentLicense();

    console.log(`[StripeLicenseService] Activated license ${key} on machine ${this.machineId}`);
    return { success: true, license };
  }

  /**
   * Deactivate license on this machine
   */
  deactivateLicense(): { success: boolean; error?: string } {
    if (!this.currentLicense) {
      return { success: true }; // Nothing to deactivate
    }

    const now = Date.now();

    // Mark activation as inactive
    this.db.prepare(`
      UPDATE license_activations SET is_active = 0 WHERE license_id = ? AND machine_id = ?
    `).run(this.currentLicense.id, this.machineId);

    // Decrement activation count
    this.db.prepare(`
      UPDATE licenses SET activations = MAX(0, activations - 1), updated_at = ? WHERE id = ?
    `).run(now, this.currentLicense.id);

    console.log(`[StripeLicenseService] Deactivated license on machine ${this.machineId}`);

    this.currentLicense = null;
    this.saveCurrentLicense();

    return { success: true };
  }

  /**
   * Get current license (or free tier if none)
   */
  getCurrentLicense(): { tier: LicenseTier; maxSessions: number; license: License | null } {
    if (this.currentLicense && this.currentLicense.isActive) {
      // Check expiration
      if (this.currentLicense.expiresAt && this.currentLicense.expiresAt < Date.now()) {
        this.currentLicense = null;
        this.saveCurrentLicense();
      }
    }

    if (this.currentLicense) {
      return {
        tier: this.currentLicense.tier,
        maxSessions: this.currentLicense.maxSessions,
        license: this.currentLicense
      };
    }

    return {
      tier: LicenseTier.FREE,
      maxSessions: TIER_LIMITS[LicenseTier.FREE],
      license: null
    };
  }

  /**
   * Check if user can create more sessions
   */
  canCreateSession(currentCount: number): boolean {
    const { maxSessions } = this.getCurrentLicense();
    return currentCount < maxSessions;
  }

  /**
   * Handle Stripe webhook for subscription events
   * Called by the webhook endpoint
   */
  handleStripeWebhook(event: {
    type: string;
    data: {
      object: {
        id: string;
        customer: string;
        customer_email?: string;
        customer_details?: { email: string; name?: string };
        subscription?: string;
        status?: string;
        items?: { data: Array<{ price: { id: string } }> };
      }
    }
  }): { success: boolean; licenseKey?: string } {
    const { type, data } = event;

    switch (type) {
      case 'checkout.session.completed': {
        // Customer completed checkout - create license
        const session = data.object;
        const email = session.customer_email || session.customer_details?.email;

        if (!email) {
          console.error('[StripeLicenseService] No email in checkout session');
          return { success: false };
        }

        // Determine tier from price ID (you'd get this from the session)
        // For now, default to PRO
        const tier = LicenseTier.PRO;

        const license = this.createLicense({
          tier,
          customerEmail: email,
          customerName: session.customer_details?.name,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription || undefined
        });

        // TODO: Send email with license key
        console.log(`[StripeLicenseService] Created license for ${email}: ${license.key}`);

        return { success: true, licenseKey: license.key };
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.paused': {
        // Subscription cancelled - deactivate license
        const subscription = data.object;

        this.db.prepare(`
          UPDATE licenses SET is_active = 0, updated_at = ?
          WHERE stripe_subscription_id = ?
        `).run(Date.now(), subscription.id);

        console.log(`[StripeLicenseService] Deactivated license for subscription ${subscription.id}`);
        return { success: true };
      }

      case 'customer.subscription.updated': {
        // Subscription changed (upgrade/downgrade)
        const subscription = data.object;

        if (subscription.status === 'active') {
          // Re-enable if it was paused
          this.db.prepare(`
            UPDATE licenses SET is_active = 1, updated_at = ?
            WHERE stripe_subscription_id = ?
          `).run(Date.now(), subscription.id);
        }

        return { success: true };
      }

      case 'invoice.payment_failed': {
        // Payment failed - could deactivate after grace period
        console.log('[StripeLicenseService] Payment failed, consider grace period');
        return { success: true };
      }

      default:
        return { success: true };
    }
  }

  /**
   * Get all activations for a license (for customer portal)
   */
  getLicenseActivations(licenseId: string): LicenseActivation[] {
    const rows = this.db.prepare(`
      SELECT * FROM license_activations WHERE license_id = ? ORDER BY activated_at DESC
    `).all(licenseId) as any[];

    return rows.map(row => ({
      id: row.id,
      licenseId: row.license_id,
      machineId: row.machine_id,
      machineName: row.machine_name,
      activatedAt: row.activated_at,
      lastSeenAt: row.last_seen_at,
      isActive: row.is_active === 1
    }));
  }

  /**
   * Lookup license by email (for customer support)
   */
  getLicenseByEmail(email: string): License | null {
    const row = this.db.prepare('SELECT * FROM licenses WHERE customer_email = ?').get(email) as any;

    if (!row) return null;

    return {
      id: row.id,
      key: row.key,
      tier: row.tier as LicenseTier,
      customerEmail: row.customer_email,
      customerName: row.customer_name,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      maxSessions: row.max_sessions,
      activations: row.activations,
      maxActivations: row.max_activations,
      isActive: row.is_active === 1,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

// Singleton
let stripeService: StripeLicenseService | null = null;

export function getStripeLicenseService(): StripeLicenseService {
  if (!stripeService) {
    stripeService = new StripeLicenseService();
  }
  return stripeService;
}

export { StripeLicenseService };
