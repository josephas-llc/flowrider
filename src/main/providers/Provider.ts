/**
 * Provider Interface - Clean abstraction for AI model providers
 *
 * Audit Fix: Extracts a common interface so adding new providers
 * requires implementing a single interface rather than modifying
 * multiple files.
 */

import { AIMessage } from '../AIService';

export type ProviderName =
  | 'zoix'
  | 'claude'
  | 'openai'
  | 'ollama'
  | 'gemini'
  | 'grok'
  | 'mistral'
  | 'cohere'
  | 'local';

export interface ProviderCallOptions {
  model?: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
  timeout?: number;
}

export interface ProviderCallResult {
  success: boolean;
  content?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  model: string;
  error?: string;
  duration: number;
}

export interface ProviderHealth {
  available: boolean;
  version?: string;
  models?: string[];
  error?: string;
  latencyMs?: number;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ProviderPricing {
  inputPerMTok: number;  // $ per million input tokens
  outputPerMTok: number; // $ per million output tokens
  energyWhPerMTok: number; // Wh per million tokens
}

/**
 * Provider Interface
 *
 * All AI providers must implement this interface for consistent behavior.
 */
export interface Provider {
  /** Provider identifier */
  readonly name: ProviderName;

  /** Human-readable display name */
  readonly displayName: string;

  /** Whether this provider requires an API key */
  readonly requiresApiKey: boolean;

  /** Whether this provider runs locally (no network) */
  readonly isLocal: boolean;

  /** Default model for this provider */
  readonly defaultModel: string;

  /** Available models for this provider */
  readonly models: string[];

  /** Configure the provider (API key, base URL, etc.) */
  configure(config: ProviderConfig): void;

  /** Check if the provider is available and healthy */
  checkHealth(): Promise<ProviderHealth>;

  /** Make a completion call to the provider */
  call(options: ProviderCallOptions): Promise<ProviderCallResult>;

  /** Get pricing for a specific model */
  getPricing(model: string): ProviderPricing;

  /** Estimate cost before making a call */
  estimateCost(inputTokens: number, outputTokens: number, model?: string): number;
}

/**
 * Base Provider Implementation
 *
 * Provides common functionality that concrete providers can extend.
 */
export abstract class BaseProvider implements Provider {
  abstract readonly name: ProviderName;
  abstract readonly displayName: string;
  abstract readonly requiresApiKey: boolean;
  abstract readonly isLocal: boolean;
  abstract readonly defaultModel: string;
  abstract readonly models: string[];

  protected config: ProviderConfig = {};

  configure(config: ProviderConfig): void {
    this.config = { ...this.config, ...config };
  }

  abstract checkHealth(): Promise<ProviderHealth>;
  abstract call(options: ProviderCallOptions): Promise<ProviderCallResult>;
  abstract getPricing(model: string): ProviderPricing;

  estimateCost(inputTokens: number, outputTokens: number, model?: string): number {
    const pricing = this.getPricing(model || this.defaultModel);
    return (inputTokens * pricing.inputPerMTok + outputTokens * pricing.outputPerMTok) / 1_000_000;
  }

  protected calculateDuration(startTime: number): number {
    return Date.now() - startTime;
  }

  protected createErrorResult(error: string, startTime: number): ProviderCallResult {
    return {
      success: false,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cost: 0,
      model: this.defaultModel,
      error,
      duration: this.calculateDuration(startTime),
    };
  }
}

/**
 * Provider Registry
 *
 * Manages all available providers and provides lookup functionality.
 */
export class ProviderRegistry {
  private providers: Map<ProviderName, Provider> = new Map();

  register(provider: Provider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: ProviderName): Provider | undefined {
    return this.providers.get(name);
  }

  getAll(): Provider[] {
    return Array.from(this.providers.values());
  }

  getAvailable(): Provider[] {
    return this.getAll().filter(p => p.requiresApiKey === false || p.isLocal);
  }

  async checkAllHealth(): Promise<Map<ProviderName, ProviderHealth>> {
    const results = new Map<ProviderName, ProviderHealth>();

    await Promise.all(
      this.getAll().map(async (provider) => {
        const health = await provider.checkHealth();
        results.set(provider.name, health);
      })
    );

    return results;
  }
}

// Singleton registry
let registryInstance: ProviderRegistry | null = null;

export function getProviderRegistry(): ProviderRegistry {
  if (!registryInstance) {
    registryInstance = new ProviderRegistry();
  }
  return registryInstance;
}

export default Provider;
