/**
 * Memory - Persistent learning storage for AI Core
 *
 * SQLite-backed storage for:
 * - Session interactions (prompts, responses, outcomes)
 * - Learned patterns and insights
 * - Code snippets and solutions
 * - Error patterns and fixes
 * - Cross-project knowledge
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import * as crypto from 'crypto';
import { KnowledgeGraph } from './KnowledgeGraph';

// ============================================
// Data Types
// ============================================

export interface Interaction {
  id: string;
  sessionId: string;
  projectId: string | null;
  timestamp: number;
  promptHash: string;
  prompt: string;
  response: string;
  outcome: 'success' | 'failure' | 'partial' | 'unknown';
  userFeedback: number | null; // -1 to 1 scale
  codeChanged: boolean;
  filesAffected: string[];
  errorsCaught: string[];
  tags: string[];
}

export interface Pattern {
  id: string;
  type: 'code' | 'error' | 'workflow' | 'prompt' | 'architecture';
  name: string;
  description: string;
  confidence: number; // 0 to 1
  occurrences: number;
  lastSeen: number;
  context: string; // JSON blob of pattern context
  solution: string | null;
  projectIds: string[];
}

export interface Insight {
  id: string;
  type: 'learned' | 'inferred' | 'distilled';
  category: string;
  content: string;
  confidence: number;
  sourcePatternIds: string[];
  sourceInteractionIds: string[];
  createdAt: number;
  updatedAt: number;
  useCount: number;
  effectiveness: number; // Running average of feedback
}

export interface CodeSnippet {
  id: string;
  language: string;
  purpose: string;
  code: string;
  context: string;
  projectId: string | null;
  successRate: number;
  useCount: number;
  createdAt: number;
  tags: string[];
}

export interface AIStats {
  totalInteractions: number;
  totalPatterns: number;
  totalInsights: number;
  totalSnippets: number;
  averageConfidence: number;
  learningRate: number; // Insights per 100 interactions
  topCategories: { category: string; count: number }[];
  recentActivity: number; // Interactions in last 24h
}

// ============================================
// Memory Class
// ============================================

export class Memory {
  private db: Database.Database;
  private dbPath: string;
  private knowledgeGraph: KnowledgeGraph;

  constructor() {
    // Store in user data directory
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'leo-memory.db');
    this.db = new Database(this.dbPath);
    this.initialize();
    this.knowledgeGraph = new KnowledgeGraph(this.db);
  }

  private initialize(): void {
    // Enable WAL mode for better concurrent performance
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.db.exec(`
      -- Interactions table: raw session data
      CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        project_id TEXT,
        timestamp INTEGER NOT NULL,
        prompt_hash TEXT NOT NULL,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        outcome TEXT DEFAULT 'unknown',
        user_feedback REAL,
        code_changed INTEGER DEFAULT 0,
        files_affected TEXT DEFAULT '[]',
        errors_caught TEXT DEFAULT '[]',
        tags TEXT DEFAULT '[]',
        embedding BLOB
      );

      -- Patterns table: detected patterns across interactions
      CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        confidence REAL DEFAULT 0.5,
        occurrences INTEGER DEFAULT 1,
        last_seen INTEGER NOT NULL,
        context TEXT DEFAULT '{}',
        solution TEXT,
        project_ids TEXT DEFAULT '[]'
      );

      -- Insights table: distilled knowledge
      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        confidence REAL DEFAULT 0.5,
        source_pattern_ids TEXT DEFAULT '[]',
        source_interaction_ids TEXT DEFAULT '[]',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        use_count INTEGER DEFAULT 0,
        effectiveness REAL DEFAULT 0.5,
        embedding BLOB
      );

      -- Code snippets table: reusable code patterns
      CREATE TABLE IF NOT EXISTS code_snippets (
        id TEXT PRIMARY KEY,
        language TEXT NOT NULL,
        purpose TEXT NOT NULL,
        code TEXT NOT NULL,
        context TEXT,
        project_id TEXT,
        success_rate REAL DEFAULT 0.5,
        use_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        tags TEXT DEFAULT '[]',
        embedding BLOB
      );

      -- Learning events table: track learning progress
      CREATE TABLE IF NOT EXISTS learning_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        details TEXT,
        timestamp INTEGER NOT NULL
      );

      -- Create indexes for fast lookups
      CREATE INDEX IF NOT EXISTS idx_interactions_session ON interactions(session_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_project ON interactions(project_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_interactions_outcome ON interactions(outcome);
      CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(type);
      CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence);
      CREATE INDEX IF NOT EXISTS idx_insights_category ON insights(category);
      CREATE INDEX IF NOT EXISTS idx_insights_effectiveness ON insights(effectiveness);
      CREATE INDEX IF NOT EXISTS idx_snippets_language ON code_snippets(language);
    `);

    console.log('[Memory] Database initialized at:', this.dbPath);
  }

  // ============================================
  // Interaction Methods
  // ============================================

  saveInteraction(interaction: Omit<Interaction, 'id'>): string {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO interactions (
        id, session_id, project_id, timestamp, prompt_hash, prompt, response,
        outcome, user_feedback, code_changed, files_affected, errors_caught, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      interaction.sessionId,
      interaction.projectId,
      interaction.timestamp,
      interaction.promptHash,
      interaction.prompt,
      interaction.response,
      interaction.outcome,
      interaction.userFeedback,
      interaction.codeChanged ? 1 : 0,
      JSON.stringify(interaction.filesAffected),
      JSON.stringify(interaction.errorsCaught),
      JSON.stringify(interaction.tags)
    );

    // Extract concepts from interaction for knowledge graph
    const text = `${interaction.prompt} ${interaction.response}`;
    this.knowledgeGraph.extractConcepts(text, `interaction:${id}`);

    this.logLearningEvent('interaction_saved', { id, sessionId: interaction.sessionId });
    return id;
  }

  getInteraction(id: string): Interaction | null {
    const row = this.db.prepare('SELECT * FROM interactions WHERE id = ?').get(id) as any;
    return row ? this.rowToInteraction(row) : null;
  }

  getRecentInteractions(limit: number = 100): Interaction[] {
    const rows = this.db.prepare(`
      SELECT * FROM interactions ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as any[];
    return rows.map(this.rowToInteraction);
  }

  getInteractionsBySession(sessionId: string): Interaction[] {
    const rows = this.db.prepare(`
      SELECT * FROM interactions WHERE session_id = ? ORDER BY timestamp ASC
    `).all(sessionId) as any[];
    return rows.map(this.rowToInteraction);
  }

  getInteractionsByProject(projectId: string): Interaction[] {
    const rows = this.db.prepare(`
      SELECT * FROM interactions WHERE project_id = ? ORDER BY timestamp DESC
    `).all(projectId) as any[];
    return rows.map(this.rowToInteraction);
  }

  getSimilarInteractions(promptHash: string, limit: number = 10): Interaction[] {
    const rows = this.db.prepare(`
      SELECT * FROM interactions WHERE prompt_hash = ? ORDER BY timestamp DESC LIMIT ?
    `).all(promptHash, limit) as any[];
    return rows.map(this.rowToInteraction);
  }

  updateInteractionOutcome(id: string, outcome: Interaction['outcome'], feedback?: number): void {
    const stmt = this.db.prepare(`
      UPDATE interactions SET outcome = ?, user_feedback = COALESCE(?, user_feedback)
      WHERE id = ?
    `);
    stmt.run(outcome, feedback, id);
  }

  private rowToInteraction(row: any): Interaction {
    return {
      id: row.id,
      sessionId: row.session_id,
      projectId: row.project_id,
      timestamp: row.timestamp,
      promptHash: row.prompt_hash,
      prompt: row.prompt,
      response: row.response,
      outcome: row.outcome,
      userFeedback: row.user_feedback,
      codeChanged: row.code_changed === 1,
      filesAffected: JSON.parse(row.files_affected || '[]'),
      errorsCaught: JSON.parse(row.errors_caught || '[]'),
      tags: JSON.parse(row.tags || '[]'),
    };
  }

  // ============================================
  // Pattern Methods
  // ============================================

  savePattern(pattern: Omit<Pattern, 'id'>): string {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO patterns (
        id, type, name, description, confidence, occurrences, last_seen,
        context, solution, project_ids
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      pattern.type,
      pattern.name,
      pattern.description,
      pattern.confidence,
      pattern.occurrences,
      pattern.lastSeen,
      pattern.context,
      pattern.solution,
      JSON.stringify(pattern.projectIds)
    );

    this.logLearningEvent('pattern_detected', { id, type: pattern.type, name: pattern.name });
    return id;
  }

  updatePattern(id: string, updates: Partial<Pattern>): void {
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.confidence !== undefined) {
      setClauses.push('confidence = ?');
      values.push(updates.confidence);
    }
    if (updates.occurrences !== undefined) {
      setClauses.push('occurrences = ?');
      values.push(updates.occurrences);
    }
    if (updates.lastSeen !== undefined) {
      setClauses.push('last_seen = ?');
      values.push(updates.lastSeen);
    }
    if (updates.solution !== undefined) {
      setClauses.push('solution = ?');
      values.push(updates.solution);
    }
    if (updates.projectIds !== undefined) {
      setClauses.push('project_ids = ?');
      values.push(JSON.stringify(updates.projectIds));
    }

    if (setClauses.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE patterns SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    }
  }

  getPatternsByType(type: Pattern['type']): Pattern[] {
    const rows = this.db.prepare(`
      SELECT * FROM patterns WHERE type = ? ORDER BY confidence DESC
    `).all(type) as any[];
    return rows.map(this.rowToPattern);
  }

  getAllPatterns(): Pattern[] {
    const rows = this.db.prepare(`
      SELECT * FROM patterns ORDER BY last_seen DESC
    `).all() as any[];
    return rows.map(this.rowToPattern);
  }

  getPatternCounts(): { total: number; byType: Record<Pattern['type'], number> } {
    const total = (this.db.prepare('SELECT COUNT(*) as count FROM patterns').get() as any).count;

    const byTypeRows = this.db.prepare(`
      SELECT type, COUNT(*) as count FROM patterns GROUP BY type
    `).all() as { type: Pattern['type']; count: number }[];

    const byType: Record<Pattern['type'], number> = {
      code: 0,
      error: 0,
      workflow: 0,
      prompt: 0,
      architecture: 0,
    };

    for (const row of byTypeRows) {
      byType[row.type] = row.count;
    }

    return { total, byType };
  }

  getHighConfidencePatterns(minConfidence: number = 0.7): Pattern[] {
    const rows = this.db.prepare(`
      SELECT * FROM patterns WHERE confidence >= ? ORDER BY occurrences DESC
    `).all(minConfidence) as any[];
    return rows.map(this.rowToPattern);
  }

  findPatternByName(name: string): Pattern | null {
    const row = this.db.prepare('SELECT * FROM patterns WHERE name = ?').get(name) as any;
    return row ? this.rowToPattern(row) : null;
  }

  private rowToPattern(row: any): Pattern {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description,
      confidence: row.confidence,
      occurrences: row.occurrences,
      lastSeen: row.last_seen,
      context: row.context,
      solution: row.solution,
      projectIds: JSON.parse(row.project_ids || '[]'),
    };
  }

  // ============================================
  // Insight Methods
  // ============================================

  saveInsight(insight: Omit<Insight, 'id'>): string {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO insights (
        id, type, category, content, confidence, source_pattern_ids,
        source_interaction_ids, created_at, updated_at, use_count, effectiveness
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      insight.type,
      insight.category,
      insight.content,
      insight.confidence,
      JSON.stringify(insight.sourcePatternIds),
      JSON.stringify(insight.sourceInteractionIds),
      insight.createdAt,
      insight.updatedAt,
      insight.useCount,
      insight.effectiveness
    );

    this.logLearningEvent('insight_created', { id, category: insight.category });
    return id;
  }

  getInsightsByCategory(category: string): Insight[] {
    const rows = this.db.prepare(`
      SELECT * FROM insights WHERE category = ? ORDER BY effectiveness DESC
    `).all(category) as any[];
    return rows.map(this.rowToInsight);
  }

  getMostEffectiveInsights(limit: number = 20): Insight[] {
    const rows = this.db.prepare(`
      SELECT * FROM insights WHERE effectiveness > 0.5 ORDER BY effectiveness DESC LIMIT ?
    `).all(limit) as any[];
    return rows.map(this.rowToInsight);
  }

  incrementInsightUseCount(id: string, wasEffective: boolean): void {
    // Update use count and running average of effectiveness
    const insight = this.db.prepare('SELECT use_count, effectiveness FROM insights WHERE id = ?').get(id) as any;
    if (insight) {
      const newUseCount = insight.use_count + 1;
      const effectivenessValue = wasEffective ? 1 : 0;
      const newEffectiveness = (insight.effectiveness * insight.use_count + effectivenessValue) / newUseCount;

      this.db.prepare(`
        UPDATE insights SET use_count = ?, effectiveness = ?, updated_at = ? WHERE id = ?
      `).run(newUseCount, newEffectiveness, Date.now(), id);
    }
  }

  private rowToInsight(row: any): Insight {
    return {
      id: row.id,
      type: row.type,
      category: row.category,
      content: row.content,
      confidence: row.confidence,
      sourcePatternIds: JSON.parse(row.source_pattern_ids || '[]'),
      sourceInteractionIds: JSON.parse(row.source_interaction_ids || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      useCount: row.use_count,
      effectiveness: row.effectiveness,
    };
  }

  // ============================================
  // Code Snippet Methods
  // ============================================

  saveSnippet(snippet: Omit<CodeSnippet, 'id'>): string {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO code_snippets (
        id, language, purpose, code, context, project_id,
        success_rate, use_count, created_at, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      snippet.language,
      snippet.purpose,
      snippet.code,
      snippet.context,
      snippet.projectId,
      snippet.successRate,
      snippet.useCount,
      snippet.createdAt,
      JSON.stringify(snippet.tags)
    );

    this.logLearningEvent('snippet_saved', { id, language: snippet.language });
    return id;
  }

  getSnippetsByLanguage(language: string): CodeSnippet[] {
    const rows = this.db.prepare(`
      SELECT * FROM code_snippets WHERE language = ? ORDER BY success_rate DESC
    `).all(language) as any[];
    return rows.map(this.rowToSnippet);
  }

  searchSnippets(query: string): CodeSnippet[] {
    const rows = this.db.prepare(`
      SELECT * FROM code_snippets
      WHERE purpose LIKE ? OR code LIKE ? OR tags LIKE ?
      ORDER BY success_rate DESC LIMIT 20
    `).all(`%${query}%`, `%${query}%`, `%${query}%`) as any[];
    return rows.map(this.rowToSnippet);
  }

  private rowToSnippet(row: any): CodeSnippet {
    return {
      id: row.id,
      language: row.language,
      purpose: row.purpose,
      code: row.code,
      context: row.context,
      projectId: row.project_id,
      successRate: row.success_rate,
      useCount: row.use_count,
      createdAt: row.created_at,
      tags: JSON.parse(row.tags || '[]'),
    };
  }

  // ============================================
  // Stats and Analytics
  // ============================================

  getStats(): AIStats {
    const totalInteractions = (this.db.prepare('SELECT COUNT(*) as count FROM interactions').get() as any).count;
    const totalPatterns = (this.db.prepare('SELECT COUNT(*) as count FROM patterns').get() as any).count;
    const totalInsights = (this.db.prepare('SELECT COUNT(*) as count FROM insights').get() as any).count;
    const totalSnippets = (this.db.prepare('SELECT COUNT(*) as count FROM code_snippets').get() as any).count;

    const avgConfidence = (this.db.prepare('SELECT AVG(confidence) as avg FROM patterns').get() as any).avg || 0;

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentActivity = (this.db.prepare('SELECT COUNT(*) as count FROM interactions WHERE timestamp > ?').get(dayAgo) as any).count;

    const learningRate = totalInteractions > 0 ? (totalInsights / totalInteractions) * 100 : 0;

    const topCategories = this.db.prepare(`
      SELECT category, COUNT(*) as count FROM insights GROUP BY category ORDER BY count DESC LIMIT 5
    `).all() as { category: string; count: number }[];

    return {
      totalInteractions,
      totalPatterns,
      totalInsights,
      totalSnippets,
      averageConfidence: avgConfidence,
      learningRate,
      topCategories,
      recentActivity,
    };
  }

  // ============================================
  // Learning Event Logging
  // ============================================

  private logLearningEvent(eventType: string, details: any): void {
    this.db.prepare(`
      INSERT INTO learning_events (event_type, details, timestamp) VALUES (?, ?, ?)
    `).run(eventType, JSON.stringify(details), Date.now());
  }

  getLearningEvents(since: number): { eventType: string; details: any; timestamp: number }[] {
    const rows = this.db.prepare(`
      SELECT * FROM learning_events WHERE timestamp > ? ORDER BY timestamp DESC
    `).all(since) as any[];
    return rows.map(row => ({
      eventType: row.event_type,
      details: JSON.parse(row.details || '{}'),
      timestamp: row.timestamp,
    }));
  }

  // ============================================
  // Knowledge Graph Methods
  // ============================================

  /**
   * Get the knowledge graph (concepts, relations, clusters)
   */
  getKnowledgeGraph() {
    return this.knowledgeGraph.getKnowledgeGraph();
  }

  /**
   * Get concepts related to a specific concept
   */
  getRelatedConcepts(conceptName: string, limit?: number) {
    return this.knowledgeGraph.getRelatedConcepts(conceptName, limit);
  }

  /**
   * Get all knowledge clusters
   */
  getKnowledgeClusters() {
    return this.knowledgeGraph.getKnowledgeClusters();
  }

  /**
   * Get detected knowledge gaps
   */
  getKnowledgeGaps(includeDismissed?: boolean) {
    return this.knowledgeGraph.getKnowledgeGaps(includeDismissed);
  }

  /**
   * Dismiss a knowledge gap
   */
  dismissKnowledgeGap(gapId: string) {
    return this.knowledgeGraph.dismissGap(gapId);
  }

  /**
   * Get knowledge graph statistics
   */
  getKnowledgeGraphStats() {
    return this.knowledgeGraph.getStats();
  }

  /**
   * Form knowledge clusters from concepts
   */
  formKnowledgeClusters() {
    return this.knowledgeGraph.formClusters();
  }

  /**
   * Detect knowledge gaps
   */
  detectKnowledgeGaps() {
    return this.knowledgeGraph.detectGaps();
  }

  /**
   * Extract concepts from text
   */
  extractConceptsFromText(text: string, context?: string) {
    return this.knowledgeGraph.extractConcepts(text, context);
  }

  // ============================================
  // Cleanup
  // ============================================

  close(): void {
    this.db.close();
  }
}

export default Memory;
