/**
 * Lemon Squeezy License Service for Flowrider
 *
 * Handles license key validation, activation, and tier management.
 * API docs: https://docs.lemonsqueezy.com/api/license-api
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// License tiers and their session limits
export enum LicenseTier {
  FREE = 'free',
  PRO = 'pro',
  TEAM = 'team',
  ENTERPRISE = 'enterprise'
}

export interface LicenseInfo {
  tier: LicenseTier;
  maxSessions: number;
  licenseKey: string | null;
  customerEmail: string | null;
  customerName: string | null;
  productName: string | null;
  expiresAt: string | null;
  isValid: boolean;
  lastValidated: string;
  instanceId: string | null;
}

export interface LemonSqueezyValidationResponse {
  valid: boolean;
  error: string | null;
  license_key: {
    id: number;
    status: string;
    key: string;
    activation_limit: number;
    activation_usage: number;
    created_at: string;
    expires_at: string | null;
  };
  instance: {
    id: string;
    name: string;
    created_at: string;
  } | null;
  meta: {
    store_id: number;
    order_id: number;
    product_id: number;
    product_name: string;
    variant_id: number;
    variant_name: string;
    customer_id: number;
    customer_name: string;
    customer_email: string;
  };
}

// Lemon Squeezy configuration
// TODO: Replace with your actual Lemon Squeezy store/product IDs
const LEMON_SQUEEZY_CONFIG = {
  API_URL: 'https://api.lemonsqueezy.com/v1/licenses',
  STORE_ID: 0, // Set after creating store
  PRODUCT_IDS: {
    PRO: 0,     // Set after creating products
    TEAM: 0,
    ENTERPRISE: 0
  }
};

// Session limits by tier
const TIER_LIMITS: Record<LicenseTier, number> = {
  [LicenseTier.FREE]: 3,
  [LicenseTier.PRO]: 20,
  [LicenseTier.TEAM]: 100,
  [LicenseTier.ENTERPRISE]: 400
};

class LicenseService {
  private licenseFilePath: string;
  private currentLicense: LicenseInfo;
  private machineId: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.licenseFilePath = path.join(userDataPath, 'license.json');
    this.machineId = this.getMachineId();
    this.currentLicense = this.loadLicense();
  }

  /**
   * Generate a unique machine ID for this installation
   */
  private getMachineId(): string {
    const machineIdPath = path.join(app.getPath('userData'), '.machine-id');

    if (fs.existsSync(machineIdPath)) {
      return fs.readFileSync(machineIdPath, 'utf-8').trim();
    }

    // Generate new machine ID
    const machineId = crypto.randomUUID();
    fs.writeFileSync(machineIdPath, machineId);
    return machineId;
  }

  /**
   * Load license from disk
   */
  private loadLicense(): LicenseInfo {
    const defaultLicense: LicenseInfo = {
      tier: LicenseTier.FREE,
      maxSessions: TIER_LIMITS[LicenseTier.FREE],
      licenseKey: null,
      customerEmail: null,
      customerName: null,
      productName: null,
      expiresAt: null,
      isValid: true, // Free tier is always valid
      lastValidated: new Date().toISOString(),
      instanceId: null
    };

    try {
      if (fs.existsSync(this.licenseFilePath)) {
        const data = fs.readFileSync(this.licenseFilePath, 'utf-8');
        const saved = JSON.parse(data) as LicenseInfo;
        return { ...defaultLicense, ...saved };
      }
    } catch (error) {
      console.error('[LicenseService] Error loading license:', error);
    }

    return defaultLicense;
  }

  /**
   * Save license to disk
   */
  private saveLicense(): void {
    try {
      fs.writeFileSync(this.licenseFilePath, JSON.stringify(this.currentLicense, null, 2));
    } catch (error) {
      console.error('[LicenseService] Error saving license:', error);
    }
  }

  /**
   * Activate a license key with Lemon Squeezy
   */
  async activateLicense(licenseKey: string): Promise<{ success: boolean; error?: string; license?: LicenseInfo }> {
    try {
      console.log('[LicenseService] Activating license...');

      const response = await fetch(`${LEMON_SQUEEZY_CONFIG.API_URL}/activate`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          license_key: licenseKey,
          instance_name: `Flowrider-${this.machineId.slice(0, 8)}`
        })
      });

      const data = await response.json() as LemonSqueezyValidationResponse;

      if (!data.valid) {
        return {
          success: false,
          error: data.error || 'Invalid license key'
        };
      }

      // Determine tier from product
      const tier = this.getTierFromProduct(data.meta.product_id, data.meta.variant_name);

      this.currentLicense = {
        tier,
        maxSessions: TIER_LIMITS[tier],
        licenseKey,
        customerEmail: data.meta.customer_email,
        customerName: data.meta.customer_name,
        productName: data.meta.product_name,
        expiresAt: data.license_key.expires_at,
        isValid: true,
        lastValidated: new Date().toISOString(),
        instanceId: data.instance?.id || null
      };

      this.saveLicense();

      console.log('[LicenseService] License activated:', tier);
      return { success: true, license: this.currentLicense };

    } catch (error) {
      console.error('[LicenseService] Activation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Validate the current license with Lemon Squeezy
   */
  async validateLicense(): Promise<{ success: boolean; error?: string; license?: LicenseInfo }> {
    if (!this.currentLicense.licenseKey) {
      // Free tier - always valid
      return { success: true, license: this.currentLicense };
    }

    try {
      console.log('[LicenseService] Validating license...');

      const params: Record<string, string> = {
        license_key: this.currentLicense.licenseKey
      };

      if (this.currentLicense.instanceId) {
        params.instance_id = this.currentLicense.instanceId;
      }

      const response = await fetch(`${LEMON_SQUEEZY_CONFIG.API_URL}/validate`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(params)
      });

      const data = await response.json() as LemonSqueezyValidationResponse;

      if (!data.valid) {
        // License is invalid/expired
        this.currentLicense.isValid = false;
        this.currentLicense.lastValidated = new Date().toISOString();
        this.saveLicense();

        return {
          success: false,
          error: data.error || 'License is no longer valid',
          license: this.currentLicense
        };
      }

      // License is valid
      const tier = this.getTierFromProduct(data.meta.product_id, data.meta.variant_name);

      this.currentLicense.isValid = true;
      this.currentLicense.tier = tier;
      this.currentLicense.maxSessions = TIER_LIMITS[tier];
      this.currentLicense.expiresAt = data.license_key.expires_at;
      this.currentLicense.lastValidated = new Date().toISOString();
      this.saveLicense();

      console.log('[LicenseService] License valid:', tier);
      return { success: true, license: this.currentLicense };

    } catch (error) {
      console.error('[LicenseService] Validation error:', error);
      // On network error, use cached validity for grace period
      return {
        success: this.currentLicense.isValid,
        error: error instanceof Error ? error.message : 'Network error',
        license: this.currentLicense
      };
    }
  }

  /**
   * Deactivate the current license
   */
  async deactivateLicense(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentLicense.licenseKey || !this.currentLicense.instanceId) {
      // Reset to free tier
      this.resetToFreeTier();
      return { success: true };
    }

    try {
      const response = await fetch(`${LEMON_SQUEEZY_CONFIG.API_URL}/deactivate`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          license_key: this.currentLicense.licenseKey,
          instance_id: this.currentLicense.instanceId
        })
      });

      const data = await response.json() as { deactivated?: boolean };

      if (data.deactivated) {
        this.resetToFreeTier();
        return { success: true };
      }

      return { success: false, error: 'Failed to deactivate license' };

    } catch (error) {
      console.error('[LicenseService] Deactivation error:', error);
      // Still reset locally
      this.resetToFreeTier();
      return { success: true };
    }
  }

  /**
   * Reset to free tier
   */
  private resetToFreeTier(): void {
    this.currentLicense = {
      tier: LicenseTier.FREE,
      maxSessions: TIER_LIMITS[LicenseTier.FREE],
      licenseKey: null,
      customerEmail: null,
      customerName: null,
      productName: null,
      expiresAt: null,
      isValid: true,
      lastValidated: new Date().toISOString(),
      instanceId: null
    };
    this.saveLicense();
  }

  /**
   * Determine license tier from Lemon Squeezy product/variant
   */
  private getTierFromProduct(productId: number, variantName: string): LicenseTier {
    // Map variant names to tiers
    const variantLower = variantName.toLowerCase();

    if (variantLower.includes('enterprise')) return LicenseTier.ENTERPRISE;
    if (variantLower.includes('team')) return LicenseTier.TEAM;
    if (variantLower.includes('pro')) return LicenseTier.PRO;

    // Default to Pro if we can't determine
    return LicenseTier.PRO;
  }

  /**
   * Get current license info
   */
  getLicense(): LicenseInfo {
    return { ...this.currentLicense };
  }

  /**
   * Check if user can create more sessions
   */
  canCreateSession(currentCount: number): boolean {
    return currentCount < this.currentLicense.maxSessions;
  }

  /**
   * Get session limit for current tier
   */
  getSessionLimit(): number {
    return this.currentLicense.maxSessions;
  }
}

// Singleton instance
let licenseService: LicenseService | null = null;

export function getLicenseService(): LicenseService {
  if (!licenseService) {
    licenseService = new LicenseService();
  }
  return licenseService;
}

export { LicenseService };
