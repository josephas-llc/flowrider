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
import { GoalInference, InferredGoal as ZoixGoal, GoalProgress, GoalLevel, CareerTrajectory } from './GoalInference';
import { ContextMemory, SessionSummary, DailyDigest, ProjectContext, InferredGoal, UnfinishedTask, WeeklyTheme, ContextRestoration } from './ContextMemory';
import { OntologyBuilder, OntologyCategory, OntologyTree, OntologyExportJSON, OntologyStats, EvolutionMetrics, GrowthArea } from './OntologyBuilder';
import { ResourceRecommender, Resource, ResourceRecommendation, LearningGap, ResourceRequest } from './ResourceRecommender';

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
  private contextMemory: ContextMemory;
  private goalInference: GoalInference;
  private ontologyBuilder: OntologyBuilder;
  private resourceRecommender: ResourceRecommender;

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
    this.contextMemory = new ContextMemory();
    this.goalInference = new GoalInference(this.memory);
    // OntologyBuilder needs direct database access
    const db = (this.memory as any).db;
    this.ontologyBuilder = new OntologyBuilder(db);
    this.resourceRecommender = new ResourceRecommender(this.memory, this.analyzer);

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
   * Get all patterns
   */
  getAllPatterns() {
    return this.memory.getAllPatterns();
  }

  /**
   * Get patterns by type
   */
  getPatternsByType(type: 'code' | 'error' | 'workflow' | 'prompt' | 'architecture') {
    return this.memory.getPatternsByType(type);
  }

  /**
   * Get pattern counts
   */
  getPatternCounts() {
    return this.memory.getPatternCounts();
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
  // Context Memory Methods (ZOIX)
  // ============================================

  startSessionTracking(sessionId: string, sessionName: string, projectId?: string): string {
    return this.contextMemory.startSession(sessionId, sessionName, projectId);
  }

  endSessionTracking(sessionId: string, summary?: Partial<SessionSummary>): void {
    this.contextMemory.endSession(sessionId, summary);
  }

  getSessionSummary(sessionId: string): SessionSummary | null {
    return this.contextMemory.getSessionSummary(sessionId);
  }

  getDailyDigest(date?: string): DailyDigest | null {
    return this.contextMemory.getDailyDigest(date);
  }

  getRecentDigests(days?: number): DailyDigest[] {
    return this.contextMemory.getRecentDigests(days);
  }

  updateProjectContext(projectId: string, projectName: string, updates: Partial<Omit<ProjectContext, 'id' | 'projectId' | 'projectName'>>): void {
    this.contextMemory.updateProjectContext(projectId, projectName, updates);
  }

  getProjectContext(projectId: string): ProjectContext | null {
    return this.contextMemory.getProjectContext(projectId);
  }

  getRecentProjects(limit?: number): ProjectContext[] {
    return this.contextMemory.getRecentProjects(limit);
  }

  saveInferredGoal(goal: Omit<InferredGoal, 'id'>): string {
    return this.contextMemory.saveInferredGoal(goal);
  }

  updateInferredGoal(id: string, updates: Partial<InferredGoal>): void {
    this.contextMemory.updateInferredGoal(id, updates);
  }

  getInferredGoals(status?: InferredGoal['status']): InferredGoal[] {
    return this.contextMemory.getInferredGoals(status);
  }

  saveUnfinishedTask(task: Omit<UnfinishedTask, 'id'>): string {
    return this.contextMemory.saveUnfinishedTask(task);
  }

  getUnfinishedTasks(projectId?: string, status?: UnfinishedTask['status']): UnfinishedTask[] {
    return this.contextMemory.getUnfinishedTasks(projectId, status);
  }

  completeTask(taskId: string): void {
    this.contextMemory.completeTask(taskId);
  }

  updateWeeklyTheme(weekStart: string, updates: Partial<Omit<WeeklyTheme, 'id' | 'weekStart' | 'weekEnd'>>): void {
    this.contextMemory.updateWeeklyTheme(weekStart, updates);
  }

  getWeeklyTheme(weekStart?: string): WeeklyTheme | null {
    return this.contextMemory.getWeeklyTheme(weekStart);
  }

  getRecentWeeks(count?: number): WeeklyTheme[] {
    return this.contextMemory.getRecentWeeks(count);
  }

  restoreContext(sessionId: string, projectId?: string): ContextRestoration {
    return this.contextMemory.restoreContext(sessionId, projectId);
  }

  // ============================================
  // Resource Recommendations (ZOIX)
  // ============================================

  /**
   * Get recommended resources based on learning gaps
   */
  getRecommendedResources(options?: {
    topic?: string;
    language?: string;
    type?: 'book' | 'documentation' | 'tutorial' | 'article' | 'course' | 'video';
    includeReasoning?: boolean;
  }): Array<Resource & { reason?: string }> {
    return this.resourceRecommender.getRecommendedResources(options);
  }

  /**
   * Get book recommendations
   */
  getRecommendedBooks(topic?: string, language?: string): Resource[] {
    return this.resourceRecommender.getRecommendedBooks(topic, language);
  }

  /**
   * Get relevant documentation
   */
  getRelevantDocs(language?: string, topic?: string): Resource[] {
    return this.resourceRecommender.getRelevantDocs(language, topic);
  }

  /**
   * Get tutorial suggestions
   */
  getTutorialSuggestions(topic?: string): Resource[] {
    return this.resourceRecommender.getTutorialSuggestions(topic);
  }

  /**
   * Get article recommendations
   */
  getArticleRecommendations(topic?: string): Resource[] {
    return this.resourceRecommender.getArticleRecommendations(topic);
  }

  /**
   * Get course suggestions
   */
  getCourseSuggestions(level?: 'beginner' | 'intermediate' | 'advanced'): Resource[] {
    return this.resourceRecommender.getCourseSuggestions(level);
  }

  /**
   * Record that a user clicked on a resource
   */
  recordResourceClick(recommendationId: string): void {
    this.resourceRecommender.recordResourceClick(recommendationId);
  }

  /**
   * Get learning gaps analysis
   */
  analyzeLearningGaps(): LearningGap[] {
    return this.resourceRecommender.analyzeLearningGaps();
  }

  /**
   * Get recommendation statistics
   */
  getRecommendationStats(): {
    totalShown: number;
    totalClicked: number;
    clickThroughRate: number;
    byType: Record<string, { shown: number; clicked: number; ctr: number }>;
  } {
    return this.resourceRecommender.getRecommendationStats();
  }

  // ============================================
  // Ontology Builder (Personal Knowledge Structure)
  // ============================================

  /**
   * Build/rebuild the entire ontology
   */
  buildOntology(): OntologyTree {
    return this.ontologyBuilder.buildOntology();
  }

  /**
   * Get the complete ontology tree
   */
  getOntology(): OntologyTree {
    return this.ontologyBuilder.getOntologyTree();
  }

  /**
   * Get a specific category by path
   */
  getOntologyBranch(path: string): OntologyCategory | null {
    return this.ontologyBuilder.getCategory(path);
  }

  /**
   * Export ontology in different formats
   */
  exportOntology(format: 'json' | 'markdown' | 'graph' = 'json'): OntologyExportJSON | string | any {
    if (format === 'json') {
      return this.ontologyBuilder.exportAsJSON();
    } else if (format === 'markdown') {
      return this.ontologyBuilder.exportAsMarkdown();
    } else {
      return this.ontologyBuilder.exportAsGraph();
    }
  }

  /**
   * Get ontology growth (evolution metrics)
   */
  getOntologyGrowth(period?: { start: number; end: number }): EvolutionMetrics {
    const now = Date.now();
    const range = period || {
      start: now - (7 * 24 * 60 * 60 * 1000), // Last week
      end: now
    };
    return this.ontologyBuilder.getEvolution(range);
  }

  /**
   * Get growth statistics
   */
  getOntologyGrowthStats(): GrowthArea[] {
    return this.ontologyBuilder.getGrowthAreas();
  }

  /**
   * Create a snapshot of current ontology
   */
  createOntologySnapshot() {
    return this.ontologyBuilder.createSnapshot();
  }

  /**
   * Get ontology statistics
   */
  getOntologyStats(): OntologyStats {
    return this.ontologyBuilder.getOntologyStats();
  }

  /**
   * Compare to standard ontologies (not implemented in new version)
   */
  compareOntologyToStandard(_standard: string): any {
    // Not implemented in the new OntologyBuilder META service
    return {
      message: 'Gap analysis is performed automatically during buildOntology()',
      note: 'Check ontology stats for expertise and learning areas'
    };
  }

  /**
   * Add a node to ontology (not applicable in META service)
   */
  addOntologyNode(_name: string, _type: string, _parentId?: string, _options?: any): any {
    return {
      message: 'Categories are auto-created from knowledge clusters',
      note: 'Use buildOntology() to regenerate from current knowledge state'
    };
  }

  /**
   * Auto-organize concept (done automatically in META service)
   */
  autoOrganizeConcept(_conceptName: string, _context?: any): any {
    return {
      message: 'Concepts are auto-organized by the KnowledgeGraph service',
      note: 'Categories are created automatically from concept clusters'
    };
  }

  /**
   * Get a specific node
   */
  getOntologyNode(id: string): OntologyCategory | null {
    return this.ontologyBuilder.getCategoryById(id);
  }

  /**
   * Find node by name
   */
  findOntologyNodeByName(name: string): OntologyCategory | null {
    return this.ontologyBuilder.getCategory(name);
  }

  /**
   * Search ontology (search across all categories)
   */
  searchOntology(query: string): OntologyCategory[] {
    const allCategories = this.ontologyBuilder.getAllCategories();
    const lowerQuery = query.toLowerCase();
    return allCategories.filter(cat =>
      cat.name.toLowerCase().includes(lowerQuery) ||
      cat.path.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Add relation (managed automatically in META service)
   */
  addOntologyRelation(_fromId: string, _toId: string, _relationType: string, _options?: any): any {
    return {
      message: 'Relationships are auto-detected by analyzing shared concepts',
      note: 'Cross-references are created automatically during buildOntology()'
    };
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
    this.contextMemory.close();
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
