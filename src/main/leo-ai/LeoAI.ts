/**
 * LeoAI - The Central Intelligence Coordinator
 *
 * This is the main entry point for LEO AI's learning system.
 * It coordinates all components:
 * - LeoMemory: Persistent storage
 * - LeoCollector: Data collection
 * - LeoAnalyzer: Pattern detection
 * - LeoDistiller: Knowledge application
 *
 * LEO AI learns from every session across all Flowrider instances,
 * building a continuously improving AI assistant.
 */

import { LeoMemory, LeoStats } from './LeoMemory';
import { LeoCollector, SessionContext, FeedbackSignal } from './LeoCollector';
import { LeoAnalyzer, AnalysisResult } from './LeoAnalyzer';
import { LeoDistiller, DistilledContext, DistillationRequest } from './LeoDistiller';

// ============================================
// Types
// ============================================

export interface LeoAIConfig {
  // Background analysis interval (ms)
  analysisInterval: number;

  // Minimum interactions before first analysis
  minInteractionsForAnalysis: number;

  // Auto-learning enabled
  autoLearn: boolean;

  // Verbosity of context generation
  defaultVerbosity: 'minimal' | 'normal' | 'detailed';
}

export interface LeoAIStatus {
  enabled: boolean;
  learning: boolean;
  stats: LeoStats;
  lastAnalysis: number | null;
  config: LeoAIConfig;
}

// ============================================
// LeoAI Class
// ============================================

export class LeoAI {
  private memory: LeoMemory;
  private collector: LeoCollector;
  private analyzer: LeoAnalyzer;
  private distiller: LeoDistiller;

  private config: LeoAIConfig;
  private enabled: boolean = false;
  private lastAnalysisTime: number | null = null;

  constructor(config?: Partial<LeoAIConfig>) {
    this.config = {
      analysisInterval: config?.analysisInterval || 5 * 60 * 1000, // 5 minutes
      minInteractionsForAnalysis: config?.minInteractionsForAnalysis || 10,
      autoLearn: config?.autoLearn ?? true,
      defaultVerbosity: config?.defaultVerbosity || 'normal',
    };

    // Initialize components
    this.memory = new LeoMemory();
    this.collector = new LeoCollector(this.memory);
    this.analyzer = new LeoAnalyzer(this.memory);
    this.distiller = new LeoDistiller(this.memory, this.analyzer);

    console.log('[LeoAI] Initialized - The learning begins');
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Enable LEO AI learning
   */
  enable(): void {
    if (this.enabled) return;

    this.enabled = true;

    if (this.config.autoLearn) {
      this.analyzer.startBackgroundAnalysis(this.config.analysisInterval);
    }

    console.log('[LeoAI] Enabled and learning');
  }

  /**
   * Disable LEO AI learning
   */
  disable(): void {
    if (!this.enabled) return;

    this.enabled = false;
    this.analyzer.stopBackgroundAnalysis();

    console.log('[LeoAI] Disabled');
  }

  /**
   * Get current status
   */
  getStatus(): LeoAIStatus {
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
      console.warn('[LeoAI] Recording interaction while disabled');
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
  getKnowledgeStats(): LeoStats & { insightBreakdown: { [category: string]: number } } {
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
  // Cleanup
  // ============================================

  /**
   * Shutdown LEO AI
   */
  shutdown(): void {
    this.disable();
    this.memory.close();
    console.log('[LeoAI] Shutdown complete');
  }
}

// ============================================
// Singleton Instance
// ============================================

let leoAIInstance: LeoAI | null = null;

export function getLeoAI(): LeoAI {
  if (!leoAIInstance) {
    leoAIInstance = new LeoAI();
  }
  return leoAIInstance;
}

export function shutdownLeoAI(): void {
  if (leoAIInstance) {
    leoAIInstance.shutdown();
    leoAIInstance = null;
  }
}

export default LeoAI;
