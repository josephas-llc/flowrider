/**
 * Shared AI Types for Main and Renderer Processes
 *
 * These types are used by both the Electron main process (TaskRouter, BillingService)
 * and the renderer process (store, components). By keeping them in a shared location,
 * we avoid cross-process imports that violate Electron's architecture.
 */
export type AIProvider = 'zoix' | 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'mistral' | 'kimi' | 'deepseek' | 'cohere' | 'qwen' | 'yi' | 'falcon' | 'hunyuan' | 'local';
export interface AIProviderConfig {
    id: AIProvider;
    name: string;
    description: string;
    costPerMToken: number;
    wattsPerMToken: number;
    isLocal: boolean;
    apiUrl?: string;
    models: string[];
}
export declare const AI_PROVIDERS: AIProviderConfig[];
export type TaskComplexity = 'simple' | 'medium' | 'complex' | 'expert';
