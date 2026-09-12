/**
 * TaskRouter - Smart Model Routing for ZOIX
 *
 * Analyzes task complexity and recommends the most cost-efficient AI model.
 * This is a major selling point for both:
 * - Developers: "Right tool for the right job"
 * - Corporate/CEOs: "AI cost control - no surprise bills"
 *
 * The WSJ has reported CEOs being shocked by unexpected AI costs.
 * TaskRouter solves this by proactively routing tasks to cheaper models
 * when complexity doesn't require expensive ones.
 */

import { AIProvider, AIProviderConfig, AI_PROVIDERS, TaskComplexity } from '../../shared/ai-types';

// Re-export TaskComplexity from shared for convenience
export { TaskComplexity } from '../../shared/ai-types';

export interface TaskAnalysis {
  complexity: TaskComplexity;
  confidence: number; // 0-1
  signals: string[];  // What we detected that led to this classification
  suggestedProvider: AIProvider;
  suggestedModel: string;
  estimatedTokens: number;
  estimatedCost: number;
  baselineCost: number;      // Cost if using most expensive model
  potentialSavings: number;  // baselineCost - estimatedCost
}

export interface RoutingRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  // Conditions
  projectId?: string;           // Apply to specific project
  taskPatterns?: string[];      // Regex patterns to match
  complexityOverride?: TaskComplexity;
  // Actions
  preferredProvider?: AIProvider;
  preferredModel?: string;
  maxCostPerTask?: number;      // Stop/warn if exceeds this
}

export type RoutingMode =
  | 'manual'       // User picks model every time
  | 'suggest'      // ZOIX suggests but user confirms
  | 'auto'         // ZOIX auto-routes (can override)
  | 'strict'       // ZOIX enforces cost limits

export interface RoutingSettings {
  mode: RoutingMode;
  defaultProvider: AIProvider;
  defaultModel: string;
  rules: RoutingRule[];
  // Global cost controls (for CEOs)
  dailyBudget?: number;         // Stop routing to paid models if exceeded
  monthlyBudget?: number;
  warnAtPercent?: number;       // Warn when hitting X% of budget (default 80%)
  // Fallback behavior
  overBudgetFallback: 'block' | 'local' | 'warn'; // What to do when over budget
  preferLocalWhenPossible: boolean; // Try Ollama first for simple tasks
}

export interface RoutingStats {
  totalTasksRouted: number;
  totalCostActual: number;
  totalCostBaseline: number;    // If always used most expensive
  totalSavings: number;
  savingsPercent: number;
  routingsByComplexity: Record<TaskComplexity, number>;
  routingsByProvider: Record<AIProvider, number>;
  todayCost: number;
  monthCost: number;
}

// ============================================
// COMPLEXITY DETECTION PATTERNS
// ============================================

// Simple tasks - can use free/cheap models
const SIMPLE_PATTERNS = [
  // Basic questions
  /^(what|where|when|who|how many|list|show|print|display)/i,
  // Simple commands
  /^(create|make|add|remove|delete|rename|move|copy)\s+(a\s+)?file/i,
  // Basic formatting
  /format|indent|lint|prettify/i,
  // Documentation lookups
  /what (is|does|are)\s+\w+/i,
  // Simple refactors
  /rename (variable|function|class|method)/i,
  // Comments
  /add comment|document this/i,
  // Type annotations
  /add type|add types|type annotation/i,
];

// Medium tasks - use mid-tier models
const MEDIUM_PATTERNS = [
  // Code generation
  /write a function|create a class|implement|build/i,
  // Debugging
  /debug|fix (this|the) (bug|error|issue)/i,
  // Testing
  /write (a )?test|add test|unit test/i,
  // Refactoring
  /refactor|clean up|improve|optimize/i,
  // API integration
  /call (the )?api|fetch|http request/i,
  // Database
  /sql query|database|schema/i,
];

// Complex tasks - use capable models
const COMPLEX_PATTERNS = [
  // Architecture
  /architect|design (a |the )?system|system design/i,
  // Multi-file changes
  /across (all |multiple )?files|refactor (the )?codebase/i,
  // Security
  /security|vulnerability|authentication|authorization/i,
  // Performance
  /performance|optimize (for )?speed|memory (leak|usage)/i,
  // Migration
  /migrate|upgrade|convert (to|from)/i,
  // Complex reasoning
  /why (is|does|did)|explain (how|why)|analyze/i,
];

// Expert tasks - use best available model
const EXPERT_PATTERNS = [
  // Novel algorithms
  /novel|new algorithm|research|state of the art/i,
  // Critical systems
  /production|critical|mission.?critical/i,
  // Legal/compliance
  /legal|compliance|gdpr|hipaa|pci/i,
  // Financial
  /financial|trading|payment|transaction/i,
  // Complex debugging
  /race condition|deadlock|memory corruption|segfault/i,
  // Full system analysis
  /audit|review (the )?entire|comprehensive/i,
];

// ============================================
// PROVIDER TIERS
// ============================================

// Map complexity to recommended providers (cheapest capable option first)
const PROVIDER_TIERS: Record<TaskComplexity, AIProvider[]> = {
  simple: ['ollama', 'qwen', 'falcon', 'deepseek', 'gemini', 'grok'],
  medium: ['deepseek', 'mistral', 'cohere', 'gemini', 'grok', 'claude'],
  complex: ['claude', 'openai', 'gemini', 'mistral'],
  expert: ['claude', 'openai'],
};

// Estimated tokens by complexity
const TOKEN_ESTIMATES: Record<TaskComplexity, number> = {
  simple: 500,
  medium: 2000,
  complex: 5000,
  expert: 10000,
};

// ============================================
// TASK ROUTER CLASS
// ============================================

export class TaskRouter {
  private settings: RoutingSettings;
  private stats: RoutingStats;
  private ollamaAvailable: boolean = false;

  constructor(settings?: Partial<RoutingSettings>) {
    this.settings = {
      mode: 'suggest',
      defaultProvider: 'claude',
      defaultModel: 'claude-sonnet-4',
      rules: [],
      overBudgetFallback: 'local',
      preferLocalWhenPossible: true,
      warnAtPercent: 80,
      ...settings,
    };

    this.stats = {
      totalTasksRouted: 0,
      totalCostActual: 0,
      totalCostBaseline: 0,
      totalSavings: 0,
      savingsPercent: 0,
      routingsByComplexity: { simple: 0, medium: 0, complex: 0, expert: 0 },
      routingsByProvider: {} as Record<AIProvider, number>,
      todayCost: 0,
      monthCost: 0,
    };
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Analyze a task and recommend the best model
   */
  async analyzeTask(
    prompt: string,
    projectId?: string,
    context?: {
      fileTypes?: string[];
      codeContext?: string;
      sessionHistory?: string[];
    }
  ): Promise<TaskAnalysis> {
    // Check if Ollama is available for free routing
    await this.checkOllamaAvailability();

    // Detect complexity
    const { complexity, confidence, signals } = this.detectComplexity(prompt, context);

    // Find best provider for this complexity
    const { provider, model } = this.selectProvider(complexity, projectId);

    // Estimate costs
    const estimatedTokens = TOKEN_ESTIMATES[complexity];
    const providerConfig = AI_PROVIDERS.find(p => p.id === provider);
    const baselineConfig = AI_PROVIDERS.find(p => p.id === 'claude'); // Claude as baseline

    const estimatedCost = this.calculateCost(estimatedTokens, providerConfig);
    const baselineCost = this.calculateCost(estimatedTokens, baselineConfig);
    const potentialSavings = Math.max(0, baselineCost - estimatedCost);

    return {
      complexity,
      confidence,
      signals,
      suggestedProvider: provider,
      suggestedModel: model,
      estimatedTokens,
      estimatedCost,
      baselineCost,
      potentialSavings,
    };
  }

  /**
   * Record a routing decision for stats
   */
  recordRouting(analysis: TaskAnalysis, actualTokens?: number, actualCost?: number): void {
    this.stats.totalTasksRouted++;
    this.stats.routingsByComplexity[analysis.complexity]++;

    const provider = analysis.suggestedProvider;
    this.stats.routingsByProvider[provider] = (this.stats.routingsByProvider[provider] || 0) + 1;

    const cost = actualCost ?? analysis.estimatedCost;
    const baseline = actualTokens
      ? this.calculateCost(actualTokens, AI_PROVIDERS.find(p => p.id === 'claude'))
      : analysis.baselineCost;

    this.stats.totalCostActual += cost;
    this.stats.totalCostBaseline += baseline;
    this.stats.totalSavings = this.stats.totalCostBaseline - this.stats.totalCostActual;
    this.stats.savingsPercent = this.stats.totalCostBaseline > 0
      ? (this.stats.totalSavings / this.stats.totalCostBaseline) * 100
      : 0;

    this.stats.todayCost += cost;
    this.stats.monthCost += cost;
  }

  /**
   * Check if we're over budget
   */
  checkBudget(): {
    overDaily: boolean;
    overMonthly: boolean;
    dailyUsedPercent: number;
    monthlyUsedPercent: number;
    shouldWarn: boolean;
  } {
    const dailyUsedPercent = this.settings.dailyBudget
      ? (this.stats.todayCost / this.settings.dailyBudget) * 100
      : 0;
    const monthlyUsedPercent = this.settings.monthlyBudget
      ? (this.stats.monthCost / this.settings.monthlyBudget) * 100
      : 0;

    const warnThreshold = this.settings.warnAtPercent || 80;

    return {
      overDaily: dailyUsedPercent >= 100,
      overMonthly: monthlyUsedPercent >= 100,
      dailyUsedPercent,
      monthlyUsedPercent,
      shouldWarn: dailyUsedPercent >= warnThreshold || monthlyUsedPercent >= warnThreshold,
    };
  }

  /**
   * Get current routing stats (for dashboard)
   */
  getStats(): RoutingStats {
    return { ...this.stats };
  }

  /**
   * Update routing settings
   */
  updateSettings(updates: Partial<RoutingSettings>): void {
    this.settings = { ...this.settings, ...updates };
  }

  /**
   * Get current settings
   */
  getSettings(): RoutingSettings {
    return { ...this.settings };
  }

  /**
   * Add a routing rule
   */
  addRule(rule: RoutingRule): void {
    this.settings.rules.push(rule);
  }

  /**
   * Reset daily stats (call at midnight)
   */
  resetDailyStats(): void {
    this.stats.todayCost = 0;
  }

  /**
   * Reset monthly stats (call on 1st of month)
   */
  resetMonthlyStats(): void {
    this.stats.monthCost = 0;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private detectComplexity(
    prompt: string,
    context?: { fileTypes?: string[]; codeContext?: string; sessionHistory?: string[] }
  ): { complexity: TaskComplexity; confidence: number; signals: string[] } {
    const signals: string[] = [];
    let complexity: TaskComplexity = 'medium'; // Default to medium
    let confidence = 0.5;

    const normalizedPrompt = prompt.toLowerCase().trim();

    // Check expert patterns first (highest priority)
    for (const pattern of EXPERT_PATTERNS) {
      if (pattern.test(normalizedPrompt)) {
        complexity = 'expert';
        confidence = 0.9;
        signals.push(`Expert pattern: ${pattern.source.slice(0, 30)}...`);
        break;
      }
    }

    // Check complex patterns
    if (complexity === 'medium') {
      for (const pattern of COMPLEX_PATTERNS) {
        if (pattern.test(normalizedPrompt)) {
          complexity = 'complex';
          confidence = 0.8;
          signals.push(`Complex pattern: ${pattern.source.slice(0, 30)}...`);
          break;
        }
      }
    }

    // Check medium patterns
    if (complexity === 'medium') {
      let mediumMatches = 0;
      for (const pattern of MEDIUM_PATTERNS) {
        if (pattern.test(normalizedPrompt)) {
          mediumMatches++;
          signals.push(`Medium pattern: ${pattern.source.slice(0, 30)}...`);
        }
      }
      if (mediumMatches > 0) {
        confidence = 0.7 + (mediumMatches * 0.05);
      }
    }

    // Check simple patterns (lowest priority, can downgrade)
    if (complexity === 'medium') {
      for (const pattern of SIMPLE_PATTERNS) {
        if (pattern.test(normalizedPrompt)) {
          complexity = 'simple';
          confidence = 0.85;
          signals.push(`Simple pattern: ${pattern.source.slice(0, 30)}...`);
          break;
        }
      }
    }

    // Adjust based on prompt length
    const wordCount = normalizedPrompt.split(/\s+/).length;
    if (wordCount < 10 && complexity !== 'expert') {
      complexity = 'simple';
      signals.push(`Short prompt (${wordCount} words)`);
      confidence = Math.max(confidence, 0.7);
    } else if (wordCount > 100) {
      if (complexity === 'simple') complexity = 'medium';
      if (complexity === 'medium') complexity = 'complex';
      signals.push(`Long prompt (${wordCount} words)`);
    }

    // Adjust based on context
    if (context?.fileTypes?.length && context.fileTypes.length > 3) {
      if (complexity === 'simple') complexity = 'medium';
      signals.push(`Multiple file types (${context.fileTypes.length})`);
    }

    return { complexity, confidence, signals };
  }

  private selectProvider(
    complexity: TaskComplexity,
    projectId?: string
  ): { provider: AIProvider; model: string } {
    // Check for project-specific rules
    const projectRule = this.settings.rules.find(
      r => r.enabled && r.projectId === projectId && r.preferredProvider
    );
    if (projectRule?.preferredProvider) {
      const provider = AI_PROVIDERS.find(p => p.id === projectRule.preferredProvider);
      if (provider) {
        return {
          provider: projectRule.preferredProvider,
          model: projectRule.preferredModel || provider.models[0],
        };
      }
    }

    // Check budget status
    const budgetStatus = this.checkBudget();
    if (budgetStatus.overDaily || budgetStatus.overMonthly) {
      if (this.settings.overBudgetFallback === 'local' && this.ollamaAvailable) {
        return { provider: 'ollama', model: 'llama3.2' };
      }
    }

    // Prefer local for simple tasks if enabled
    if (this.settings.preferLocalWhenPossible && complexity === 'simple' && this.ollamaAvailable) {
      return { provider: 'ollama', model: 'llama3.2' };
    }

    // Get tier of providers for this complexity
    const tier = PROVIDER_TIERS[complexity];

    // Find first available provider in tier
    for (const providerId of tier) {
      // Skip Ollama if not available
      if (['ollama', 'qwen', 'falcon', 'yi', 'hunyuan'].includes(providerId) && !this.ollamaAvailable) {
        continue;
      }

      const provider = AI_PROVIDERS.find(p => p.id === providerId);
      if (provider) {
        return {
          provider: providerId,
          model: provider.models[0],
        };
      }
    }

    // Fallback to defaults
    return {
      provider: this.settings.defaultProvider,
      model: this.settings.defaultModel,
    };
  }

  private calculateCost(tokens: number, provider?: AIProviderConfig): number {
    if (!provider || provider.isLocal) return 0;
    // Assume 50/50 input/output split
    const inputTokens = tokens * 0.5;
    const outputTokens = tokens * 0.5;
    return ((inputTokens + outputTokens) * provider.costPerMToken) / 1_000_000;
  }

  private async checkOllamaAvailability(): Promise<void> {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(2000), // 2 second timeout
      });
      this.ollamaAvailable = response.ok;
    } catch {
      this.ollamaAvailable = false;
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

let taskRouterInstance: TaskRouter | null = null;

export function getTaskRouter(): TaskRouter {
  if (!taskRouterInstance) {
    taskRouterInstance = new TaskRouter();
  }
  return taskRouterInstance;
}

export function initTaskRouter(settings?: Partial<RoutingSettings>): TaskRouter {
  taskRouterInstance = new TaskRouter(settings);
  return taskRouterInstance;
}
