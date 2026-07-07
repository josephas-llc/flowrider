/**
 * AICore - The Central Intelligence Coordinator
 *
 * This is the main entry point for AI Core's learning system.
 * It coordinates all components:
 * - Memory: Persistent storage
 * - Collector: Data collection
 * - Analyzer: Pattern detection
 * - Distiller: Knowledge application
 *
 * AI Core learns from every session across all Flowrider instances,
 * building a continuously improving AI assistant.
 */

import { Memory, AIStats } from './Memory';
import { Collector, SessionContext, FeedbackSignal } from './Collector';
import { Analyzer, AnalysisResult } from './Analyzer';
import { Distiller, DistilledContext, DistillationRequest } from './Distiller';
import { SuggestionEngine, Suggestion, SuggestionRequest } from './SuggestionEngine';

// ============================================
// Types
// ============================================

export interface AICoreConfig {
  // Background analysis interval (ms)
  analysisInterval: number;

  // Minimum interactions before first analysis
  minInteractionsForAnalysis: number;

  // Auto-learning enabled
  autoLearn: boolean;

  // Verbosity of context generation
  defaultVerbosity: 'minimal' | 'normal' | 'detailed';
}

export interface AICoreStatus {
  enabled: boolean;
  learning: boolean;
  stats: AIStats;
  lastAnalysis: number | null;
  config: AICoreConfig;
}

// ============================================
// AICore Class
// ============================================

export class AICore {
  private memory: Memory;
  private collector: Collector;
  private analyzer: Analyzer;
  private distiller: Distiller;
  private suggestionEngine: SuggestionEngine;

  private config: AICoreConfig;
  private enabled: boolean = false;
  private lastAnalysisTime: number | null = null;

  constructor(config?: Partial<AICoreConfig>) {
    this.config = {
      analysisInterval: config?.analysisInterval || 5 * 60 * 1000, // 5 minutes
      minInteractionsForAnalysis: config?.minInteractionsForAnalysis || 10,
      autoLearn: config?.autoLearn ?? true,
      defaultVerbosity: config?.defaultVerbosity || 'normal',
    };

    // Initialize components
    this.memory = new Memory();
    this.collector = new Collector(this.memory);
    this.analyzer = new Analyzer(this.memory);
    this.distiller = new Distiller(this.memory, this.analyzer);
    this.suggestionEngine = new SuggestionEngine(this.memory);

    console.log('[AICore] Initialized - The learning begins');
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Enable AI Core learning
   */
  enable(): void {
    if (this.enabled) return;

    this.enabled = true;

    if (this.config.autoLearn) {
      this.analyzer.startBackgroundAnalysis(this.config.analysisInterval);
    }

    console.log('[AICore] Enabled and learning');
  }

  /**
   * Disable AI Core learning
   */
  disable(): void {
    if (!this.enabled) return;

    this.enabled = false;
    this.analyzer.stopBackgroundAnalysis();

    console.log('[AICore] Disabled');
  }

  /**
   * Get current status
   */
  getStatus(): AICoreStatus {
    return {
      enabled: this.enabled,
      learning: this.enabled && this.config.autoLearn,
      stats: this.memory.getStats(),
      lastAnalysis: this.lastAnalysisTime,
      config: this.config,
    };
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Register a session for learning
   */
  registerSession(context: SessionContext): void {
    this.collector.registerSession(context);
  }

  /**
   * Unregister a session
   */
  unregisterSession(sessionId: string): void {
    this.collector.unregisterSession(sessionId);
  }

  /**
   * Update session context
   */
  updateSessionContext(sessionId: string, updates: Partial<SessionContext>): void {
    this.collector.updateSessionContext(sessionId, updates);
  }

  // ============================================
  // Interaction Collection
  // ============================================

  /**
   * Record an interaction (prompt + response)
   */
  recordInteraction(
    sessionId: string,
    prompt: string,
    response: string,
    metadata?: {
      filesModified?: string[];
      outcome?: 'success' | 'failure' | 'partial' | 'unknown';
      feedback?: number;
    }
  ): string {
    if (!this.enabled) {
      console.warn('[AICore] Recording interaction while disabled');
    }

    return this.collector.collectInteraction(sessionId, prompt, response, metadata);
  }

  /**
   * Record user feedback on a response
   */
  recordFeedback(sessionId: string, signal: FeedbackSignal): void {
    this.collector.recordFeedback(sessionId, signal);
  }

  /**
   * Parse tmux output for interactions
   */
  parseTmuxOutput(sessionId: string, output: string): void {
    this.collector.parseTmuxOutput(sessionId, output);
  }

  // ============================================
  // Knowledge Retrieval
  // ============================================

  /**
   * Get distilled context for a new interaction
   */
  getContext(request?: DistillationRequest): DistilledContext {
    return this.distiller.distill({
      ...request,
      verbosity: request?.verbosity || this.config.defaultVerbosity,
    });
  }

  /**
   * Get quick context for a session
   */
  getQuickContext(projectId?: string, language?: string): string {
    return this.distiller.getQuickContext(projectId, language);
  }

  /**
   * Get context specific to errors
   */
  getErrorContext(errors: string[], language?: string): string {
    return this.distiller.getErrorContext(errors, language);
  }

  /**
   * Get knowledge statistics
   */
  getKnowledgeStats(): AIStats & { insightBreakdown: { [category: string]: number } } {
    return this.distiller.getKnowledgeStats();
  }

  // ============================================
  // Manual Analysis
  // ============================================

  /**
   * Trigger manual analysis
   */
  async analyze(): Promise<AnalysisResult> {
    const result = await this.analyzer.analyze();
    this.lastAnalysisTime = Date.now();
    return result;
  }

  /**
   * Get relevant patterns for current context
   */
  getRelevantPatterns(context: {
    prompt?: string;
    errors?: string[];
    tags?: string[];
    projectId?: string;
  }) {
    return this.analyzer.getRelevantPatterns(context);
  }

  // ============================================
  // Data Access
  // ============================================

  /**
   * Get recent interactions
   */
  getRecentInteractions(limit: number = 50) {
    return this.memory.getRecentInteractions(limit);
  }

  /**
   * Get interactions for a specific session
   */
  getSessionInteractions(sessionId: string) {
    return this.memory.getInteractionsBySession(sessionId);
  }

  /**
   * Get interactions for a project
   */
  getProjectInteractions(projectId: string) {
    return this.memory.getInteractionsByProject(projectId);
  }

  /**
   * Get high-confidence patterns
   */
  getPatterns(minConfidence: number = 0.5) {
    return this.memory.getHighConfidencePatterns(minConfidence);
  }

  /**
   * Get most effective insights
   */
  getInsights(limit: number = 20) {
    return this.memory.getMostEffectiveInsights(limit);
  }

  /**
   * Search code snippets
   */
  searchSnippets(query: string) {
    return this.memory.searchSnippets(query);
  }

  /**
   * Get snippets by language
   */
  getSnippetsByLanguage(language: string) {
    return this.memory.getSnippetsByLanguage(language);
  }

  /**
   * Get learning events
   */
  getLearningEvents(since: number) {
    return this.memory.getLearningEvents(since);
  }

  // ============================================
  // Suggestions (Intelligence Layer)
  // ============================================

  /**
   * Get smart suggestions based on context
   */
  getSuggestions(request?: SuggestionRequest): Suggestion[] {
    return this.suggestionEngine.getSuggestions(request);
  }

  /**
   * Get suggestions specifically for session start
   */
  getSessionStartSuggestions(
    workingDir: string,
    projectId?: string,
    language?: string
  ): Suggestion[] {
    return this.suggestionEngine.getSessionStartSuggestions(workingDir, projectId, language);
  }

  /**
   * Get suggestions for error context
   */
  getErrorSuggestions(errors: string[], language?: string): Suggestion[] {
    return this.suggestionEngine.getErrorSuggestions(errors, language);
  }

  /**
   * Dismiss a suggestion (user doesn't want to see it)
   */
  dismissSuggestion(suggestionId: string): void {
    this.suggestionEngine.dismissSuggestion(suggestionId);
  }

  /**
   * Get AI-powered suggestions (async - makes actual Ollama calls)
   * Falls back to heuristic suggestions if AI is unavailable
   */
  async getAISuggestions(request?: SuggestionRequest): Promise<Suggestion[]> {
    return this.suggestionEngine.getAISuggestions(request);
  }

  /**
   * Enable or disable AI-powered suggestions
   */
  setAISuggestionsEnabled(enabled: boolean): void {
    this.suggestionEngine.setAIEnabled(enabled);
  }

  /**
   * Record that a suggestion was acted upon (for learning)
   */
  recordSuggestionAction(suggestionId: string, accepted: boolean): void {
    this.suggestionEngine.recordSuggestionAction(suggestionId, accepted);
  }

  /**
   * Clear dismissed suggestions (e.g., on new session)
   */
  clearDismissedSuggestions(): void {
    this.suggestionEngine.clearDismissed();
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Shutdown AI Core
   */
  shutdown(): void {
    this.disable();
    this.memory.close();
    console.log('[AICore] Shutdown complete');
  }
}

// ============================================
// Singleton Instance
// ============================================

let aiCoreInstance: AICore | null = null;

export function getAICore(): AICore {
  if (!aiCoreInstance) {
    aiCoreInstance = new AICore();
  }
  return aiCoreInstance;
}

export function shutdownAICore(): void {
  if (aiCoreInstance) {
    aiCoreInstance.shutdown();
    aiCoreInstance = null;
  }
}

export default AICore;
