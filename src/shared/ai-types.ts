/**
 * Shared AI Types for Main and Renderer Processes
 *
 * These types are used by both the Electron main process (TaskRouter, BillingService)
 * and the renderer process (store, components). By keeping them in a shared location,
 * we avoid cross-process imports that violate Electron's architecture.
 */

// All supported AI providers
export type AIProvider =
  | 'zoix'
  | 'claude'
  | 'openai'
  | 'ollama'
  | 'gemini'
  | 'grok'
  | 'mistral'
  | 'kimi'
  | 'deepseek'
  | 'cohere'
  | 'qwen'
  | 'yi'
  | 'falcon'
  | 'hunyuan'
  | 'local';

// Provider configuration
export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  costPerMToken: number; // Cost per million tokens (0 for local)
  wattsPerMToken: number; // Estimated watt-hours per million tokens (energy usage)
  isLocal: boolean;
  apiUrl?: string;
  models: string[];
}

// Full list of AI providers with their configurations
export const AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'zoix',
    name: 'Zoix (Flowrider)',
    description: 'Smart routing + cross-session learning layer',
    costPerMToken: 5, // Varies by routed model, avg estimate
    wattsPerMToken: 0.3, // Optimized routing reduces waste
    isLocal: false,
    apiUrl: 'https://flowrider-web.vercel.app/api',
    models: ['auto', 'claude-sonnet-4-20250514', 'claude-haiku', 'gpt-4o', 'gpt-4o-mini', 'llama-3.3-70b'],
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Advanced reasoning, coding, and analysis',
    costPerMToken: 15, // Opus pricing approx
    wattsPerMToken: 0.5, // Large model, datacenter GPU inference
    isLocal: false,
    apiUrl: 'https://api.anthropic.com',
    models: ['claude-opus-4', 'claude-sonnet-4', 'claude-haiku'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o and GPT models',
    costPerMToken: 10,
    wattsPerMToken: 0.4, // Large model, datacenter GPU inference
    isLocal: false,
    apiUrl: 'https://api.openai.com',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    id: 'gemini',
    name: 'Gemini (Google)',
    description: 'Multimodal AI with long context',
    costPerMToken: 7,
    wattsPerMToken: 0.3, // Google's efficient TPU infrastructure
    isLocal: false,
    apiUrl: 'https://generativelanguage.googleapis.com',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  {
    id: 'grok',
    name: 'Grok (xAI)',
    description: 'Real-time knowledge, witty responses',
    costPerMToken: 5,
    wattsPerMToken: 0.35, // xAI infrastructure
    isLocal: false,
    apiUrl: 'https://api.x.ai',
    models: ['grok-2', 'grok-2-mini'],
  },
  {
    id: 'mistral',
    name: 'Mistral AI (France)',
    description: 'European AI, strong multilingual & coding',
    costPerMToken: 3,
    wattsPerMToken: 0.25, // Efficient European datacenter
    isLocal: false,
    apiUrl: 'https://api.mistral.ai',
    models: ['mistral-large-latest', 'mistral-medium', 'mistral-small', 'codestral'],
  },
  {
    id: 'kimi',
    name: 'Kimi/Moonshot (China)',
    description: 'Long context specialist (128K tokens)',
    costPerMToken: 2,
    wattsPerMToken: 0.2,
    isLocal: false,
    apiUrl: 'https://api.moonshot.cn',
    models: ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek (China)',
    description: 'Cost-effective coding and reasoning',
    costPerMToken: 1,
    wattsPerMToken: 0.15,
    isLocal: false,
    apiUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
  {
    id: 'cohere',
    name: 'Cohere (Canada)',
    description: 'Enterprise-focused, RAG specialist',
    costPerMToken: 4,
    wattsPerMToken: 0.25,
    isLocal: false,
    apiUrl: 'https://api.cohere.ai',
    models: ['command-r-plus', 'command-r', 'embed-english-v3.0'],
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Run AI models locally - free & private',
    costPerMToken: 0,
    wattsPerMToken: 0.8, // Local GPU, higher power usage but no network
    isLocal: true,
    apiUrl: 'http://localhost:11434',
    models: ['llama3.2', 'codellama', 'mistral', 'phi3', 'qwen2.5'],
  },
  {
    id: 'qwen',
    name: 'Qwen (Alibaba)',
    description: 'Multilingual, math & coding specialist',
    costPerMToken: 0,
    wattsPerMToken: 0.8,
    isLocal: true,
    apiUrl: 'http://localhost:11434',
    models: ['qwen2.5:7b', 'qwen2.5:14b', 'qwen2.5-coder'],
  },
  {
    id: 'yi',
    name: 'Yi (01.AI)',
    description: 'Bilingual Chinese-English model',
    costPerMToken: 0,
    wattsPerMToken: 0.8,
    isLocal: true,
    apiUrl: 'http://localhost:11434',
    models: ['yi:6b', 'yi:34b'],
  },
  {
    id: 'falcon',
    name: 'Falcon (TII UAE)',
    description: 'Open-source, efficient inference',
    costPerMToken: 0,
    wattsPerMToken: 0.7,
    isLocal: true,
    apiUrl: 'http://localhost:11434',
    models: ['falcon:7b', 'falcon:40b'],
  },
  {
    id: 'hunyuan',
    name: 'Hunyuan (Tencent)',
    description: 'Chinese language specialist',
    costPerMToken: 0,
    wattsPerMToken: 0.8,
    isLocal: true,
    apiUrl: 'http://localhost:11434',
    models: ['hunyuan-lite'],
  },
  {
    id: 'local',
    name: 'Local Custom',
    description: 'Custom local model configuration',
    costPerMToken: 0,
    wattsPerMToken: 0.8,
    isLocal: true,
    apiUrl: 'http://localhost:11434',
    models: ['custom'],
  },
];

// Task complexity levels for smart routing
export type TaskComplexity = 'simple' | 'medium' | 'complex' | 'expert';
