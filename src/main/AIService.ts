import { execSync, spawn, ChildProcess } from 'child_process';
import * as http from 'http';
import * as https from 'https';
import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getTaskOutcomes, TaskOutcome, TaskCategory } from './ai-core/TaskOutcomes';

// ============================================
// TYPES
// ============================================

// Import AIProvider from shared types and re-export as AIProviderType for backwards compatibility
import { AIProvider } from '../shared/ai-types';
export type AIProviderType = AIProvider;

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AICallOptions {
  provider: AIProviderType;
  model?: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
  // Tracking metadata
  sessionId?: string;
  projectId?: string;
  taskCategory?: TaskCategory;
  routingReason?: string;
}

export interface AICallResult {
  success: boolean;
  content?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
  model?: string;
  provider: AIProviderType;
  error?: string;
  duration?: number;
  // New: Savings tracking from TaskOutcomes
  taskId?: string;
  baselineCost?: number;
  savingsUsd?: number;
  savingsPercentage?: number;
  routingReason?: string;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

export interface ProviderHealth {
  provider: AIProviderType;
  available: boolean;
  version?: string;
  models?: string[];
  error?: string;
}

// ============================================
// PRICING DATA
// ============================================

const CLAUDE_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4': { input: 15, output: 75 },
  'claude-sonnet-4': { input: 3, output: 15 },
  'claude-3-opus-20240229': { input: 15, output: 75 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'claude-haiku': { input: 0.25, output: 1.25 },
};

// Zoix API configuration
const ZOIX_API_URL = 'https://flowrider-web.vercel.app/api';

export interface ZoixResponse {
  content: string;
  model: string;
  cost: number;
  tokens: {
    input: number;
    output: number;
  };
  zoixInsights?: {
    routingReason: string;
    learnedPatterns: number;
  };
}

// ============================================
// AI SERVICE CLASS
// ============================================

export class AIService {
  private ollamaUrl: string = 'http://localhost:11434';
  private claudePath: string = '';
  private apiKeys: Map<AIProviderType, string> = new Map();
  private apiKeysFilePath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.apiKeysFilePath = path.join(userDataPath, 'ai-keys.enc');
    this.detectClaudeCLI();
    this.loadApiKeys();
  }

  private detectClaudeCLI(): void {
    try {
      this.claudePath = execSync('which claude', { encoding: 'utf-8' }).trim();
      console.log(`[AIService] Found Claude CLI at: ${this.claudePath}`);
    } catch {
      // Try common paths
      const commonPaths = [
        '/Users/zacharykramer/.local/bin/claude',
        '/usr/local/bin/claude',
        '/opt/homebrew/bin/claude',
      ];
      for (const p of commonPaths) {
        try {
          execSync(`test -x "${p}"`, { encoding: 'utf-8' });
          this.claudePath = p;
          console.log(`[AIService] Found Claude CLI at: ${this.claudePath}`);
          return;
        } catch {
          // Continue
        }
      }
      console.log('[AIService] Claude CLI not found');
    }
  }

  // ========================================
  // Provider Health Checks
  // ========================================

  async checkOllamaHealth(): Promise<ProviderHealth> {
    return new Promise((resolve) => {
      const req = http.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const models = (parsed.models || []).map((m: OllamaModel) => m.name);
            resolve({
              provider: 'ollama',
              available: true,
              models,
            });
          } catch (e) {
            resolve({
              provider: 'ollama',
              available: false,
              error: 'Invalid response from Ollama',
            });
          }
        });
      });

      req.on('error', (err) => {
        resolve({
          provider: 'ollama',
          available: false,
          error: err.message,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          provider: 'ollama',
          available: false,
          error: 'Connection timeout',
        });
      });
    });
  }

  async checkClaudeHealth(): Promise<ProviderHealth> {
    if (!this.claudePath) {
      return {
        provider: 'claude',
        available: false,
        error: 'Claude CLI not found',
      };
    }

    try {
      const version = execSync(`${this.claudePath} --version 2>/dev/null || echo "unknown"`, {
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();

      return {
        provider: 'claude',
        available: true,
        version,
        models: ['claude-opus-4', 'claude-sonnet-4', 'claude-haiku'],
      };
    } catch (err) {
      return {
        provider: 'claude',
        available: false,
        error: (err as Error).message,
      };
    }
  }

  async checkZoixHealth(): Promise<ProviderHealth> {
    const apiKey = this.apiKeys.get('zoix');
    if (!apiKey) {
      return {
        provider: 'zoix',
        available: false,
        error: 'ZOIX_API_KEY not configured',
      };
    }

    return new Promise((resolve) => {
      const req = https.get(
        `${ZOIX_API_URL}/v1/models`,
        {
          timeout: 5000,
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              const models = Array.isArray(parsed) ? parsed.map((m: { id: string }) => m.id) : [];
              resolve({
                provider: 'zoix',
                available: true,
                models,
              });
            } catch {
              resolve({
                provider: 'zoix',
                available: false,
                error: 'Invalid response from Zoix',
              });
            }
          });
        }
      );

      req.on('error', (err) => {
        resolve({
          provider: 'zoix',
          available: false,
          error: err.message,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          provider: 'zoix',
          available: false,
          error: 'Connection timeout',
        });
      });
    });
  }

  async checkAllProviders(): Promise<ProviderHealth[]> {
    const results = await Promise.all([
      this.checkZoixHealth(),
      this.checkClaudeHealth(),
      this.checkOllamaHealth(),
    ]);
    return results;
  }

  // ========================================
  // Ollama Integration
  // ========================================

  async listOllamaModels(): Promise<OllamaModel[]> {
    return new Promise((resolve, reject) => {
      const req = http.get(`${this.ollamaUrl}/api/tags`, { timeout: 10000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.models || []);
          } catch (e) {
            reject(new Error('Failed to parse Ollama response'));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Ollama connection timeout'));
      });
    });
  }

  async callOllama(options: AICallOptions): Promise<AICallResult> {
    const startTime = Date.now();
    const model = options.model || 'llama3';

    return new Promise((resolve) => {
      const requestBody = JSON.stringify({
        model,
        messages: options.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 4096,
        },
      });

      const req = http.request(
        `${this.ollamaUrl}/api/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody),
          },
          timeout: 120000, // 2 minutes for response
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              const duration = Date.now() - startTime;

              if (parsed.error) {
                resolve({
                  success: false,
                  provider: 'ollama',
                  error: parsed.error,
                  duration,
                });
                return;
              }

              // Extract token counts from Ollama response
              const inputTokens = parsed.prompt_eval_count || 0;
              const outputTokens = parsed.eval_count || 0;

              resolve({
                success: true,
                content: parsed.message?.content || '',
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                cost: 0, // Local models are free
                model: parsed.model || model,
                provider: 'ollama',
                duration,
              });
            } catch (e) {
              resolve({
                success: false,
                provider: 'ollama',
                error: 'Failed to parse Ollama response',
                duration: Date.now() - startTime,
              });
            }
          });
        }
      );

      req.on('error', (err) => {
        resolve({
          success: false,
          provider: 'ollama',
          error: err.message,
          duration: Date.now() - startTime,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          provider: 'ollama',
          error: 'Request timeout',
          duration: Date.now() - startTime,
        });
      });

      req.write(requestBody);
      req.end();
    });
  }

  // ========================================
  // Claude Code CLI Integration
  // ========================================

  async callClaudeCLI(options: AICallOptions): Promise<AICallResult> {
    const startTime = Date.now();

    if (!this.claudePath) {
      return {
        success: false,
        provider: 'claude',
        error: 'Claude CLI not found',
        duration: Date.now() - startTime,
      };
    }

    return new Promise((resolve) => {
      // Build the prompt from messages
      const prompt = options.messages
        .filter((m) => m.role !== 'system')
        .map((m) => m.content)
        .join('\n\n');

      // Build command arguments
      const args = ['--print', '--output-format', 'json'];

      if (options.model) {
        args.push('--model', options.model);
      }

      if (options.systemPrompt || options.messages.find((m) => m.role === 'system')) {
        const systemMsg = options.systemPrompt || options.messages.find((m) => m.role === 'system')?.content || '';
        args.push('--system-prompt', systemMsg);
      }

      if (options.maxTokens) {
        args.push('--max-turns', '1');
      }

      args.push(prompt);

      console.log(`[AIService] Calling Claude CLI with args:`, args.slice(0, -1));

      const child = spawn(this.claudePath, args, {
        timeout: 300000, // 5 minutes
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;

        if (code !== 0) {
          resolve({
            success: false,
            provider: 'claude',
            error: stderr || `Process exited with code ${code}`,
            duration,
          });
          return;
        }

        try {
          // Try to parse JSON output
          const parsed = JSON.parse(stdout);
          const model = options.model || 'claude-sonnet-4';
          const pricing = CLAUDE_PRICING[model] || { input: 3, output: 15 };

          // Extract token counts if available
          const inputTokens = parsed.usage?.input_tokens || 0;
          const outputTokens = parsed.usage?.output_tokens || 0;
          const cost =
            (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;

          resolve({
            success: true,
            content: parsed.result || parsed.content || stdout,
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            cost,
            model,
            provider: 'claude',
            duration,
          });
        } catch {
          // Return raw output if not JSON
          resolve({
            success: true,
            content: stdout,
            provider: 'claude',
            model: options.model || 'claude-sonnet-4',
            duration,
          });
        }
      });

      child.on('error', (err) => {
        resolve({
          success: false,
          provider: 'claude',
          error: err.message,
          duration: Date.now() - startTime,
        });
      });
    });
  }

  // ========================================
  // Zoix Integration (Flowrider AI Routing Layer)
  // ========================================

  async callZoix(options: AICallOptions): Promise<AICallResult> {
    const startTime = Date.now();
    const apiKey = this.apiKeys.get('zoix');

    if (!apiKey) {
      return {
        success: false,
        provider: 'zoix',
        error: 'ZOIX_API_KEY not configured. Set it in Settings > API Keys.',
        duration: Date.now() - startTime,
      };
    }

    return new Promise((resolve) => {
      // Build the prompt from messages
      let fullPrompt = '';
      let systemPrompt = options.systemPrompt || '';

      for (const msg of options.messages) {
        if (msg.role === 'system') {
          systemPrompt = msg.content;
        } else {
          fullPrompt += msg.content + '\n\n';
        }
      }

      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\n${fullPrompt}`;
      }

      // Build Zoix request payload
      const payload: Record<string, unknown> = {
        prompt: fullPrompt.trim(),
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 1000,
        stream: false,
      };

      // Add model if specified and not 'auto'
      if (options.model && options.model !== 'auto') {
        payload.model = options.model;
      }

      // Add context for cross-session learning
      payload.context = 'flowrider_cli|domain:development|agent:flowrider';

      // Add budget control
      payload.budget = 0.10; // Max $0.10 per request

      const requestBody = JSON.stringify(payload);

      const url = new URL(`${ZOIX_API_URL}/v1/completions`);
      const reqOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 60000, // 60 seconds
      };

      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const duration = Date.now() - startTime;

          if (res.statusCode !== 200) {
            resolve({
              success: false,
              provider: 'zoix',
              error: `Zoix API returned ${res.statusCode}: ${data}`,
              duration,
            });
            return;
          }

          try {
            const parsed = JSON.parse(data) as ZoixResponse;

            // Log insights if available
            if (parsed.zoixInsights) {
              console.log(
                `[AIService/Zoix] Routing: ${parsed.zoixInsights.routingReason}, ` +
                  `Learned patterns: ${parsed.zoixInsights.learnedPatterns}`
              );
            }

            resolve({
              success: true,
              content: parsed.content || '',
              inputTokens: parsed.tokens?.input || 0,
              outputTokens: parsed.tokens?.output || 0,
              totalTokens: (parsed.tokens?.input || 0) + (parsed.tokens?.output || 0),
              cost: parsed.cost || 0,
              model: parsed.model || 'auto',
              provider: 'zoix',
              duration,
            });
          } catch (e) {
            resolve({
              success: false,
              provider: 'zoix',
              error: 'Failed to parse Zoix response',
              duration,
            });
          }
        });
      });

      req.on('error', (err) => {
        resolve({
          success: false,
          provider: 'zoix',
          error: err.message,
          duration: Date.now() - startTime,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          provider: 'zoix',
          error: 'Request timeout',
          duration: Date.now() - startTime,
        });
      });

      req.write(requestBody);
      req.end();
    });
  }

  // ========================================
  // Unified Call Interface
  // ========================================

  async call(options: AICallOptions): Promise<AICallResult> {
    const startTime = Date.now();
    let result: AICallResult;

    switch (options.provider) {
      case 'zoix':
        result = await this.callZoix(options);
        break;
      case 'ollama':
        result = await this.callOllama(options);
        break;
      case 'claude':
        result = await this.callClaudeCLI(options);
        break;
      default:
        result = {
          success: false,
          provider: options.provider,
          error: `Provider ${options.provider} not yet implemented`,
        };
    }

    // Track outcome in TaskOutcomes for feedback loop
    if (options.sessionId && (result.inputTokens || result.outputTokens)) {
      try {
        const taskOutcomes = getTaskOutcomes();

        // Calculate prompt length for complexity estimation
        const promptLength = options.messages.reduce((acc, m) => acc + m.content.length, 0);

        // Determine outcome
        const outcome: TaskOutcome = result.success ? 'success' : 'failure';

        // Record the task outcome
        const record = taskOutcomes.recordOutcome({
          sessionId: options.sessionId,
          projectId: options.projectId,
          modelUsed: result.model || options.model || 'unknown',
          provider: options.provider,
          tokensIn: result.inputTokens || 0,
          tokensOut: result.outputTokens || 0,
          wallTimeMs: result.duration || (Date.now() - startTime),
          outcome,
          taskCategory: options.taskCategory || 'other',
          routingReason: options.routingReason || result.routingReason,
          promptLength,
        });

        // Attach savings info to result
        result.taskId = record.id;
        result.baselineCost = record.baselineCostUsd;
        result.savingsUsd = record.savingsUsd;
        result.savingsPercentage = record.baselineCostUsd > 0
          ? (record.savingsUsd / record.baselineCostUsd) * 100
          : 0;
        result.routingReason = record.routingReason || undefined;

        // Log savings for visibility
        if (record.savingsUsd > 0) {
          console.log(
            `[AIService] Saved $${record.savingsUsd.toFixed(4)} ` +
            `(${result.savingsPercentage?.toFixed(1)}%) by using ${result.model} instead of baseline`
          );
        }
      } catch (err) {
        console.error('[AIService] Failed to record task outcome:', err);
      }
    }

    return result;
  }

  // ========================================
  // Quick Prompt (convenience method)
  // ========================================

  async quickPrompt(
    provider: AIProviderType,
    prompt: string,
    model?: string
  ): Promise<AICallResult> {
    return this.call({
      provider,
      model,
      messages: [{ role: 'user', content: prompt }],
    });
  }

  // ========================================
  // Cost Calculation
  // ========================================

  calculateCost(
    provider: AIProviderType,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    if (provider === 'ollama' || provider === 'local') {
      return 0;
    }

    if (provider === 'claude') {
      const pricing = CLAUDE_PRICING[model] || { input: 3, output: 15 };
      return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
    }

    // Default pricing for other providers
    return ((inputTokens + outputTokens) * 5) / 1_000_000;
  }

  // ========================================
  // Configuration
  // ========================================

  setOllamaUrl(url: string): void {
    this.ollamaUrl = url;
  }

  setApiKey(provider: AIProviderType, key: string): void {
    this.apiKeys.set(provider, key);
    this.saveApiKeys();
  }

  getApiKey(provider: AIProviderType): string | undefined {
    return this.apiKeys.get(provider);
  }

  getApiKeys(): Record<AIProviderType, string | undefined> {
    const keys: Record<string, string | undefined> = {};
    const providers: AIProviderType[] = ['zoix', 'claude', 'openai', 'ollama', 'gemini', 'grok', 'local'];
    for (const provider of providers) {
      keys[provider] = this.apiKeys.get(provider);
    }
    return keys as Record<AIProviderType, string | undefined>;
  }

  // ========================================
  // Secure Storage for API Keys
  // ========================================

  private loadApiKeys(): void {
    try {
      if (!fs.existsSync(this.apiKeysFilePath)) {
        console.log('[AIService] No stored API keys found');
        return;
      }

      // Verify encryption is available before attempting to decrypt
      if (!safeStorage.isEncryptionAvailable()) {
        console.error('[AIService] SECURITY: Cannot load API keys - encryption unavailable');
        throw new Error('Secure storage not available. Please ensure your system keychain is unlocked.');
      }

      // Verify file permissions (macOS/Linux)
      if (process.platform !== 'win32') {
        const stats = fs.statSync(this.apiKeysFilePath);
        const mode = stats.mode & 0o777;
        if (mode !== 0o600) {
          console.warn('[AIService] Fixing insecure file permissions on API keys file');
          fs.chmodSync(this.apiKeysFilePath, 0o600);
        }
      }

      const encryptedData = fs.readFileSync(this.apiKeysFilePath);
      const jsonString = safeStorage.decryptString(encryptedData);

      const keysObj = JSON.parse(jsonString);
      Object.entries(keysObj).forEach(([provider, key]) => {
        if (key && typeof key === 'string') {
          this.apiKeys.set(provider as AIProviderType, key);
        }
      });

      console.log(`[AIService] Loaded ${this.apiKeys.size} API keys`);
    } catch (err) {
      console.error('[AIService] Failed to load API keys:', err);
    }
  }

  private saveApiKeys(): void {
    try {
      // Verify encryption is available before attempting to save
      if (!safeStorage.isEncryptionAvailable()) {
        console.error('[AIService] SECURITY: Cannot store API keys - encryption unavailable');
        throw new Error('Secure storage not available. Please ensure your system keychain is unlocked.');
      }

      const keysObj: Record<string, string> = {};
      this.apiKeys.forEach((value, key) => {
        keysObj[key] = value;
      });

      const jsonString = JSON.stringify(keysObj);
      const dataToWrite = safeStorage.encryptString(jsonString);

      // Ensure directory exists
      const dir = path.dirname(this.apiKeysFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.apiKeysFilePath, dataToWrite);

      // Set restrictive file permissions (macOS/Linux)
      if (process.platform !== 'win32') {
        fs.chmodSync(this.apiKeysFilePath, 0o600);
      }

      console.log('[AIService] API keys saved securely');
    } catch (err) {
      console.error('[AIService] Failed to save API keys:', err);
      throw err;
    }
  }
}

// Singleton instance
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}
