/**
 * SuggestionEngine - Smart Suggestion Generation
 *
 * Generates actionable suggestions based on usage patterns, history, and context.
 * This provides the "intelligence" layer that makes AI Core visibly valuable.
 *
 * Types of suggestions:
 * 1. AI Provider suggestions: "You usually use Claude for TypeScript projects"
 * 2. Template suggestions: "Your last 3 sessions used fullstack template"
 * 3. Error prevention: "This error occurred before - try X"
 * 4. Workflow suggestions: "You typically run tests after making changes"
 * 5. Time-based: "You're most productive with short sessions (< 30 min)"
 * 6. Cross-session: "Session X is working on the same file"
 */

import { Memory, Interaction, Pattern, Insight } from './Memory';
import { getAIService, AIProviderType } from '../AIService';
import * as crypto from 'crypto';

// ============================================
// Types
// ============================================

export type SuggestionType =
  | 'ai_provider'      // Which AI to use
  | 'template'         // Session template recommendation
  | 'error_prevention' // Proactive error warning
  | 'workflow'         // Suggested next action
  | 'productivity'     // Session management tips
  | 'cross_session'    // Related session awareness
  | 'code_pattern'     // Reusable code suggestion
  | 'project_context'  // Project-specific recommendations
  | 'learning'         // What LEO has learned
  | 'quick_action';    // Actionable buttons

export type SuggestionPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  priority: SuggestionPriority;
  confidence: number; // 0-1, how confident we are this is relevant
  relevance: number;  // 0-1, how relevant to current context
  actionable: boolean;
  action?: {
    label: string;
    type: 'apply_provider' | 'apply_template' | 'copy_code' | 'navigate' | 'dismiss' | 'custom';
    payload?: unknown;
  };
  dismissable: boolean;
  expiresAt?: number; // Timestamp when suggestion becomes irrelevant
  source: {
    type: 'pattern' | 'insight' | 'interaction' | 'heuristic';
    id?: string;
  };
  context: {
    projectId?: string;
    sessionId?: string;
    language?: string;
    tags?: string[];
  };
  createdAt: number;
}

export interface SuggestionRequest {
  sessionId?: string;
  projectId?: string;
  workingDir?: string;
  language?: string;
  currentTask?: string;
  recentErrors?: string[];
  aiProvider?: string;
  limit?: number;
}

export interface ProviderUsageStats {
  provider: string;
  count: number;
  successRate: number;
  avgTokens: number;
  projects: string[];
  languages: string[];
}

export interface WorkflowPattern {
  sequence: string[];
  frequency: number;
  successRate: number;
}

// ============================================
// SuggestionEngine Class
// ============================================

export class SuggestionEngine {
  private memory: Memory;
  private dismissedSuggestions: Set<string> = new Set();
  private suggestionCache: Map<string, { suggestions: Suggestion[]; timestamp: number }> = new Map();
  private aiSuggestionCache: Map<string, { suggestions: Suggestion[]; timestamp: number }> = new Map();
  private cacheTTL: number = 60000; // 1 minute cache
  private aiCacheTTL: number = 300000; // 5 minute cache for AI suggestions (more expensive)
  private aiEnabled: boolean = true;

  constructor(memory: Memory) {
    this.memory = memory;
    console.log('[SuggestionEngine] Initialized with AI-powered suggestions');
  }

  // ============================================
  // Main API
  // ============================================

  /**
   * Get smart suggestions for the current context
   */
  getSuggestions(request: SuggestionRequest = {}): Suggestion[] {
    const cacheKey = this.getCacheKey(request);
    const cached = this.suggestionCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return this.filterDismissed(cached.suggestions);
    }

    const suggestions: Suggestion[] = [];
    const limit = request.limit || 10;

    // Generate suggestions from different sources
    suggestions.push(...this.getProviderSuggestions(request));
    suggestions.push(...this.getTemplateSuggestions(request));
    suggestions.push(...this.getErrorPreventionSuggestions(request));
    suggestions.push(...this.getWorkflowSuggestions(request));
    suggestions.push(...this.getProductivitySuggestions(request));
    suggestions.push(...this.getCodePatternSuggestions(request));
    suggestions.push(...this.getProjectContextSuggestions(request));
    suggestions.push(...this.getLearningHighlights());

    // Sort by relevance and priority
    const sorted = this.rankSuggestions(suggestions, request);

    // Cache and return
    this.suggestionCache.set(cacheKey, { suggestions: sorted, timestamp: Date.now() });

    return this.filterDismissed(sorted).slice(0, limit);
  }

  /**
   * Get suggestions specifically for session start
   */
  getSessionStartSuggestions(
    workingDir: string,
    projectId?: string,
    language?: string
  ): Suggestion[] {
    return this.getSuggestions({
      projectId,
      workingDir,
      language,
      limit: 5,
    });
  }

  /**
   * Get suggestions for error context
   */
  getErrorSuggestions(errors: string[], language?: string): Suggestion[] {
    return this.getErrorPreventionSuggestions({
      recentErrors: errors,
      language,
    });
  }

  /**
   * Dismiss a suggestion
   */
  dismissSuggestion(suggestionId: string): void {
    this.dismissedSuggestions.add(suggestionId);
    // Clear cache to refresh suggestions
    this.suggestionCache.clear();
  }

  /**
   * Clear dismissed suggestions (e.g., on new session)
   */
  clearDismissed(): void {
    this.dismissedSuggestions.clear();
    this.suggestionCache.clear();
  }

  /**
   * Record that a suggestion was acted upon (for learning)
   */
  recordSuggestionAction(suggestionId: string, accepted: boolean): void {
    // In a future version, this could feed back into the learning system
    console.log(`[SuggestionEngine] Suggestion ${suggestionId} was ${accepted ? 'accepted' : 'rejected'}`);
  }

  // ============================================
  // Suggestion Generators
  // ============================================

  private getProviderSuggestions(request: SuggestionRequest): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Get interactions for this project/working dir
    const interactions = this.getRelevantInteractions(request);
    if (interactions.length < 3) return suggestions;

    // Analyze provider usage
    const providerStats = this.analyzeProviderUsage(interactions);
    if (providerStats.length === 0) return suggestions;

    // Find dominant provider for this context
    const topProvider = providerStats[0];
    if (topProvider.count >= 3 && topProvider.successRate > 0.6) {
      const languageNote = request.language
        ? ` for ${request.language} projects`
        : '';

      suggestions.push({
        id: this.generateId('provider'),
        type: 'ai_provider',
        title: `Use ${this.formatProviderName(topProvider.provider)}`,
        description: `You typically use ${this.formatProviderName(topProvider.provider)}${languageNote} with ${Math.round(topProvider.successRate * 100)}% success rate`,
        priority: 'medium',
        confidence: Math.min(0.9, topProvider.count / 10),
        relevance: topProvider.successRate,
        actionable: true,
        action: {
          label: `Switch to ${this.formatProviderName(topProvider.provider)}`,
          type: 'apply_provider',
          payload: { provider: topProvider.provider },
        },
        dismissable: true,
        source: { type: 'heuristic' },
        context: { projectId: request.projectId, language: request.language },
        createdAt: Date.now(),
      });
    }

    // Suggest free local option if cost is high
    const claudeUsage = providerStats.find(p => p.provider === 'claude');
    if (claudeUsage && claudeUsage.avgTokens > 10000) {
      suggestions.push({
        id: this.generateId('provider-cost'),
        type: 'ai_provider',
        title: 'Try Ollama for cost savings',
        description: `High token usage detected (avg ${Math.round(claudeUsage.avgTokens / 1000)}k tokens). Ollama is free and runs locally.`,
        priority: 'low',
        confidence: 0.6,
        relevance: 0.5,
        actionable: true,
        action: {
          label: 'Try Ollama',
          type: 'apply_provider',
          payload: { provider: 'ollama' },
        },
        dismissable: true,
        source: { type: 'heuristic' },
        context: {},
        createdAt: Date.now(),
      });
    }

    return suggestions;
  }

  private getTemplateSuggestions(request: SuggestionRequest): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const interactions = this.getRelevantInteractions(request, 20);

    if (interactions.length < 2) return suggestions;

    // Look for common patterns in how sessions start
    const startPatterns = this.analyzeStartPatterns(interactions);

    if (startPatterns.commonTemplate && startPatterns.frequency >= 2) {
      suggestions.push({
        id: this.generateId('template'),
        type: 'template',
        title: `Use your ${startPatterns.commonTemplate} setup`,
        description: `You've used this configuration ${startPatterns.frequency} times recently`,
        priority: 'medium',
        confidence: Math.min(0.85, startPatterns.frequency / 5),
        relevance: 0.7,
        actionable: true,
        action: {
          label: 'Apply Template',
          type: 'apply_template',
          payload: { template: startPatterns.commonTemplate },
        },
        dismissable: true,
        source: { type: 'heuristic' },
        context: { projectId: request.projectId },
        createdAt: Date.now(),
      });
    }

    return suggestions;
  }

  private getErrorPreventionSuggestions(request: SuggestionRequest): Suggestion[] {
    const suggestions: Suggestion[] = [];

    if (!request.recentErrors || request.recentErrors.length === 0) {
      // Proactive suggestions based on historical errors
      const patterns = this.memory.getPatternsByType('error');

      for (const pattern of patterns.slice(0, 3)) {
        if (pattern.confidence > 0.7 && pattern.solution) {
          const context = JSON.parse(pattern.context || '{}');

          // Check if relevant to current project
          if (request.projectId && !pattern.projectIds.includes(request.projectId)) {
            continue;
          }

          suggestions.push({
            id: this.generateId('error-prevent'),
            type: 'error_prevention',
            title: `Common error: ${pattern.name.substring(0, 50)}`,
            description: `This error occurred ${pattern.occurrences} times. Solution: ${pattern.solution?.substring(0, 100)}...`,
            priority: 'low',
            confidence: pattern.confidence,
            relevance: 0.5,
            actionable: pattern.solution !== null,
            action: pattern.solution ? {
              label: 'View Solution',
              type: 'custom',
              payload: { solution: pattern.solution },
            } : undefined,
            dismissable: true,
            source: { type: 'pattern', id: pattern.id },
            context: { projectId: request.projectId },
            createdAt: Date.now(),
          });
        }
      }

      return suggestions;
    }

    // Active error resolution suggestions
    for (const error of request.recentErrors) {
      const normalizedError = this.normalizeError(error);

      // Find matching patterns
      const patterns = this.memory.getPatternsByType('error');
      for (const pattern of patterns) {
        const patternContext = JSON.parse(pattern.context || '{}');
        if (patternContext.errorTemplate &&
            this.normalizeError(patternContext.originalError || '').includes(normalizedError.substring(0, 30))) {

          if (pattern.solution) {
            suggestions.push({
              id: this.generateId('error-fix'),
              type: 'error_prevention',
              title: 'Known error - solution available',
              description: `This error has been resolved before: ${pattern.solution.substring(0, 100)}...`,
              priority: 'high',
              confidence: pattern.confidence,
              relevance: 0.9,
              actionable: true,
              action: {
                label: 'Apply Fix',
                type: 'copy_code',
                payload: { code: pattern.solution },
              },
              dismissable: true,
              source: { type: 'pattern', id: pattern.id },
              context: { language: request.language },
              createdAt: Date.now(),
            });
          }
        }
      }
    }

    return suggestions;
  }

  private getWorkflowSuggestions(request: SuggestionRequest): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const patterns = this.memory.getPatternsByType('workflow');

    for (const pattern of patterns.slice(0, 3)) {
      if (pattern.confidence < 0.6) continue;

      const context = JSON.parse(pattern.context || '{}');
      if (!context.sequence || context.sequence.length < 2) continue;

      // Check if relevant to current project
      if (request.projectId && !pattern.projectIds.includes(request.projectId)) {
        continue;
      }

      const workflowSteps = context.sequence.slice(0, 4).join(' → ');

      suggestions.push({
        id: this.generateId('workflow'),
        type: 'workflow',
        title: 'Recommended workflow',
        description: `${workflowSteps} (${Math.round(context.successRate * 100)}% success rate)`,
        priority: 'low',
        confidence: pattern.confidence,
        relevance: context.successRate,
        actionable: false,
        dismissable: true,
        source: { type: 'pattern', id: pattern.id },
        context: { projectId: request.projectId },
        createdAt: Date.now(),
      });
    }

    return suggestions;
  }

  private getProductivitySuggestions(request: SuggestionRequest): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const stats = this.memory.getStats();

    // Suggest based on activity patterns
    if (stats.recentActivity > 50) {
      suggestions.push({
        id: this.generateId('productivity'),
        type: 'productivity',
        title: 'High activity detected',
        description: `${stats.recentActivity} interactions in the last 24 hours. Consider breaking complex tasks into smaller sessions.`,
        priority: 'low',
        confidence: 0.5,
        relevance: 0.4,
        actionable: false,
        dismissable: true,
        source: { type: 'heuristic' },
        context: {},
        createdAt: Date.now(),
      });
    }

    // Learning progress
    if (stats.totalPatterns > 5 && stats.averageConfidence > 0.6) {
      suggestions.push({
        id: this.generateId('learning-progress'),
        type: 'learning',
        title: 'Flowfaster is learning your patterns',
        description: `${stats.totalPatterns} patterns detected with ${Math.round(stats.averageConfidence * 100)}% average confidence. Suggestions will improve over time.`,
        priority: 'low',
        confidence: stats.averageConfidence,
        relevance: 0.3,
        actionable: false,
        dismissable: true,
        source: { type: 'heuristic' },
        context: {},
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // Expire after 24 hours
      });
    }

    return suggestions;
  }

  private getCodePatternSuggestions(request: SuggestionRequest): Suggestion[] {
    const suggestions: Suggestion[] = [];

    if (!request.language) return suggestions;

    const snippets = this.memory.getSnippetsByLanguage(request.language);

    for (const snippet of snippets.slice(0, 2)) {
      if (snippet.successRate < 0.7 || snippet.useCount < 2) continue;

      suggestions.push({
        id: this.generateId('code-pattern'),
        type: 'code_pattern',
        title: `Reusable ${request.language} pattern`,
        description: snippet.purpose.substring(0, 100),
        priority: 'low',
        confidence: snippet.successRate,
        relevance: 0.5,
        actionable: true,
        action: {
          label: 'Copy Code',
          type: 'copy_code',
          payload: { code: snippet.code },
        },
        dismissable: true,
        source: { type: 'pattern' },
        context: { language: request.language },
        createdAt: Date.now(),
      });
    }

    return suggestions;
  }

  private getProjectContextSuggestions(request: SuggestionRequest): Suggestion[] {
    const suggestions: Suggestion[] = [];

    if (!request.projectId) return suggestions;

    // Get project-specific insights
    const insights = this.memory.getMostEffectiveInsights(10);
    const projectInsights = insights.filter(i =>
      i.sourcePatternIds.some(pid => {
        const pattern = this.memory.findPatternByName(pid);
        return pattern?.projectIds.includes(request.projectId!);
      })
    );

    for (const insight of projectInsights.slice(0, 2)) {
      suggestions.push({
        id: this.generateId('project-insight'),
        type: 'project_context',
        title: `Project insight: ${insight.category}`,
        description: insight.content.substring(0, 150),
        priority: 'medium',
        confidence: insight.confidence,
        relevance: insight.effectiveness,
        actionable: false,
        dismissable: true,
        source: { type: 'insight', id: insight.id },
        context: { projectId: request.projectId },
        createdAt: Date.now(),
      });
    }

    return suggestions;
  }

  private getLearningHighlights(): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const stats = this.memory.getStats();

    // Show what Flowfaster has learned if there's enough data
    if (stats.totalInteractions >= 10 && stats.totalInsights > 0) {
      const topCategory = stats.topCategories[0];

      if (topCategory) {
        suggestions.push({
          id: this.generateId('learning-highlight'),
          type: 'learning',
          title: `Flowfaster learned ${stats.totalInsights} insights`,
          description: `Most learning in: ${topCategory.category} (${topCategory.count} insights). ${stats.totalPatterns} patterns detected.`,
          priority: 'low',
          confidence: 0.8,
          relevance: 0.2,
          actionable: false,
          dismissable: true,
          source: { type: 'heuristic' },
          context: {},
          createdAt: Date.now(),
          expiresAt: Date.now() + 12 * 60 * 60 * 1000, // Expire after 12 hours
        });
      }
    }

    return suggestions;
  }

  // ============================================
  // Helper Methods
  // ============================================

  private getRelevantInteractions(request: SuggestionRequest, limit: number = 50): Interaction[] {
    if (request.projectId) {
      return this.memory.getInteractionsByProject(request.projectId).slice(0, limit);
    }

    if (request.sessionId) {
      return this.memory.getInteractionsBySession(request.sessionId);
    }

    return this.memory.getRecentInteractions(limit);
  }

  private analyzeProviderUsage(interactions: Interaction[]): ProviderUsageStats[] {
    const providerMap = new Map<string, {
      count: number;
      successes: number;
      totalTokens: number;
      projects: Set<string>;
      languages: Set<string>;
    }>();

    for (const interaction of interactions) {
      // Extract provider from tags or infer from response patterns
      const provider = this.inferProvider(interaction);
      if (!provider) continue;

      const stats = providerMap.get(provider) || {
        count: 0,
        successes: 0,
        totalTokens: 0,
        projects: new Set<string>(),
        languages: new Set<string>(),
      };

      stats.count++;
      if (interaction.outcome === 'success') stats.successes++;
      stats.totalTokens += interaction.response.length / 4; // Rough token estimate

      if (interaction.projectId) stats.projects.add(interaction.projectId);

      // Infer language from tags
      const langTag = interaction.tags.find(t =>
        ['typescript', 'javascript', 'python', 'rust', 'go', 'java'].includes(t.toLowerCase())
      );
      if (langTag) stats.languages.add(langTag.toLowerCase());

      providerMap.set(provider, stats);
    }

    return Array.from(providerMap.entries())
      .map(([provider, stats]) => ({
        provider,
        count: stats.count,
        successRate: stats.count > 0 ? stats.successes / stats.count : 0,
        avgTokens: stats.count > 0 ? stats.totalTokens / stats.count : 0,
        projects: [...stats.projects],
        languages: [...stats.languages],
      }))
      .sort((a, b) => b.count - a.count);
  }

  private analyzeStartPatterns(interactions: Interaction[]): { commonTemplate: string | null; frequency: number } {
    // Group by session and look at first interaction
    const sessionStarts = new Map<string, Interaction>();
    for (const interaction of interactions) {
      if (!sessionStarts.has(interaction.sessionId)) {
        sessionStarts.set(interaction.sessionId, interaction);
      }
    }

    // Analyze common starting patterns
    const templates = new Map<string, number>();
    for (const [, firstInteraction] of sessionStarts) {
      const template = this.inferTemplate(firstInteraction);
      if (template) {
        templates.set(template, (templates.get(template) || 0) + 1);
      }
    }

    // Find most common
    let maxFreq = 0;
    let commonTemplate: string | null = null;
    for (const [template, freq] of templates) {
      if (freq > maxFreq) {
        maxFreq = freq;
        commonTemplate = template;
      }
    }

    return { commonTemplate, frequency: maxFreq };
  }

  private inferProvider(interaction: Interaction): string | null {
    // Check tags
    const providerTag = interaction.tags.find(t =>
      ['claude', 'openai', 'ollama', 'gemini', 'grok', 'local'].includes(t.toLowerCase())
    );
    if (providerTag) return providerTag.toLowerCase();

    // Infer from response patterns
    if (interaction.response.includes('Claude') || interaction.response.includes('Anthropic')) {
      return 'claude';
    }
    if (interaction.response.includes('GPT') || interaction.response.includes('OpenAI')) {
      return 'openai';
    }

    return null;
  }

  private inferTemplate(interaction: Interaction): string | null {
    const tags = interaction.tags.map(t => t.toLowerCase());

    if (tags.includes('fullstack') || tags.includes('react') || tags.includes('next')) {
      return 'fullstack';
    }
    if (tags.includes('api') || tags.includes('backend')) {
      return 'api';
    }
    if (tags.includes('research') || tags.includes('analysis')) {
      return 'research';
    }
    if (tags.includes('bug') || tags.includes('fix') || tags.includes('debug')) {
      return 'debugging';
    }

    return null;
  }

  private normalizeError(error: string): string {
    return error
      .replace(/\d+/g, 'N')
      .replace(/['"`].*?['"`]/g, 'STR')
      .replace(/0x[a-fA-F0-9]+/g, 'ADDR')
      .replace(/\/[\w\/\-\.]+/g, 'PATH')
      .toLowerCase()
      .trim()
      .substring(0, 100);
  }

  private formatProviderName(provider: string): string {
    const names: Record<string, string> = {
      claude: 'Claude',
      openai: 'OpenAI',
      ollama: 'Ollama',
      gemini: 'Gemini',
      grok: 'Grok',
      local: 'Local LLM',
    };
    return names[provider] || provider;
  }

  private rankSuggestions(suggestions: Suggestion[], request: SuggestionRequest): Suggestion[] {
    return suggestions.sort((a, b) => {
      // Priority ordering
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Relevance + confidence weighted
      const scoreA = a.relevance * 0.6 + a.confidence * 0.4;
      const scoreB = b.relevance * 0.6 + b.confidence * 0.4;

      return scoreB - scoreA;
    });
  }

  private filterDismissed(suggestions: Suggestion[]): Suggestion[] {
    const now = Date.now();
    return suggestions.filter(s =>
      !this.dismissedSuggestions.has(s.id) &&
      (!s.expiresAt || s.expiresAt > now)
    );
  }

  private getCacheKey(request: SuggestionRequest): string {
    return `${request.sessionId || ''}-${request.projectId || ''}-${request.language || ''}`;
  }

  private generateId(prefix: string): string {
    return `${prefix}-${crypto.randomUUID().substring(0, 8)}`;
  }

  // ============================================
  // AI-Powered Suggestions
  // ============================================

  /**
   * Enable or disable AI-powered suggestions
   */
  setAIEnabled(enabled: boolean): void {
    this.aiEnabled = enabled;
    console.log(`[SuggestionEngine] AI suggestions ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get AI-powered suggestions (async - makes actual AI calls)
   * Falls back to heuristic suggestions if AI is unavailable
   */
  async getAISuggestions(request: SuggestionRequest = {}): Promise<Suggestion[]> {
    if (!this.aiEnabled) {
      return this.getSuggestions(request);
    }

    const cacheKey = `ai-${this.getCacheKey(request)}`;
    const cached = this.aiSuggestionCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.aiCacheTTL) {
      return this.filterDismissed(cached.suggestions);
    }

    // Start with heuristic suggestions
    const heuristicSuggestions = this.getSuggestions(request);

    // Try to get AI-enhanced suggestions
    try {
      const aiSuggestions = await this.generateAISuggestions(request);
      const combined = [...aiSuggestions, ...heuristicSuggestions];

      // Deduplicate by title similarity
      const unique = this.deduplicateSuggestions(combined);
      const ranked = this.rankSuggestions(unique, request);

      this.aiSuggestionCache.set(cacheKey, { suggestions: ranked, timestamp: Date.now() });
      return this.filterDismissed(ranked).slice(0, request.limit || 10);
    } catch (err) {
      console.warn('[SuggestionEngine] AI suggestions failed, using heuristics:', err);
      return heuristicSuggestions;
    }
  }

  /**
   * Generate suggestions using actual AI calls
   */
  private async generateAISuggestions(request: SuggestionRequest): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    const aiService = getAIService();

    // Check if Ollama is available (free, local AI)
    const ollamaHealth = await aiService.checkOllamaHealth();

    if (!ollamaHealth.available) {
      console.log('[SuggestionEngine] Ollama not available, skipping AI suggestions');
      return suggestions;
    }

    // Build context for AI
    const context = this.buildAIContext(request);

    if (!context) {
      return suggestions;
    }

    // Make AI call with cost-efficient prompt
    const result = await aiService.call({
      provider: 'ollama',
      model: ollamaHealth.models?.[0] || 'llama3',
      messages: [
        {
          role: 'system',
          content: `You are a helpful coding assistant. Analyze the context and provide 1-3 actionable suggestions for the developer. Each suggestion should be practical and specific. Respond in JSON format only:
{
  "suggestions": [
    {"title": "short title", "description": "1-2 sentence description", "priority": "low|medium|high", "type": "workflow|code_pattern|productivity"}
  ]
}`
        },
        {
          role: 'user',
          content: context
        }
      ],
      maxTokens: 300,
      temperature: 0.7
    });

    if (!result.success || !result.content) {
      return suggestions;
    }

    // Parse AI response
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = result.content;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonStr);

      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        for (const s of parsed.suggestions) {
          suggestions.push({
            id: this.generateId('ai'),
            type: this.mapAIType(s.type) as SuggestionType,
            title: `✨ ${s.title}`,
            description: s.description,
            priority: this.mapPriority(s.priority) as SuggestionPriority,
            confidence: 0.75,
            relevance: 0.8,
            actionable: false,
            dismissable: true,
            source: { type: 'heuristic' },
            context: {
              projectId: request.projectId,
              language: request.language,
              tags: ['ai-generated']
            },
            createdAt: Date.now(),
            expiresAt: Date.now() + this.aiCacheTTL,
          });
        }
      }
    } catch (parseErr) {
      console.warn('[SuggestionEngine] Failed to parse AI response:', parseErr);
    }

    return suggestions;
  }

  /**
   * Build context string for AI from request and history
   */
  private buildAIContext(request: SuggestionRequest): string | null {
    const parts: string[] = [];

    if (request.workingDir) {
      parts.push(`Working directory: ${request.workingDir}`);
    }

    if (request.language) {
      parts.push(`Language: ${request.language}`);
    }

    if (request.currentTask) {
      parts.push(`Current task: ${request.currentTask}`);
    }

    if (request.recentErrors && request.recentErrors.length > 0) {
      parts.push(`Recent errors:\n${request.recentErrors.slice(0, 3).join('\n')}`);
    }

    // Add recent interaction summary
    const interactions = this.getRelevantInteractions(request, 5);
    if (interactions.length > 0) {
      const summary = interactions
        .slice(0, 3)
        .map(i => `- ${i.prompt.substring(0, 100)}...`)
        .join('\n');
      parts.push(`Recent prompts:\n${summary}`);
    }

    // Add pattern insights
    const patterns = this.memory.getHighConfidencePatterns(0.7);
    if (patterns.length > 0) {
      const patternSummary = patterns
        .slice(0, 3)
        .map(p => `- ${p.name}: ${p.description || 'common pattern'}`)
        .join('\n');
      parts.push(`Known patterns:\n${patternSummary}`);
    }

    if (parts.length === 0) {
      return null;
    }

    return `Developer context:\n${parts.join('\n\n')}\n\nProvide helpful suggestions for this developer.`;
  }

  /**
   * Map AI suggestion type to our type
   */
  private mapAIType(type: string): string {
    const mapping: Record<string, SuggestionType> = {
      'workflow': 'workflow',
      'code_pattern': 'code_pattern',
      'productivity': 'productivity',
      'error': 'error_prevention',
      'template': 'template',
      'provider': 'ai_provider',
    };
    return mapping[type?.toLowerCase()] || 'workflow';
  }

  /**
   * Map priority string to our priority type
   */
  private mapPriority(priority: string): string {
    const p = priority?.toLowerCase();
    if (p === 'high' || p === 'critical') return 'high';
    if (p === 'medium') return 'medium';
    return 'low';
  }

  /**
   * Remove duplicate suggestions by similar titles
   */
  private deduplicateSuggestions(suggestions: Suggestion[]): Suggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(s => {
      const key = s.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export default SuggestionEngine;
