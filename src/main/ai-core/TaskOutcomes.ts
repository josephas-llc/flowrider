/**
 * TaskOutcomes - Telemetry for AI routing decisions and outcomes
 *
 * THE #1 GAP identified in audit: Without tracking model used, tokens, retries,
 * and outcomes per task, Zoix cannot learn optimal routing.
 *
 * This module provides:
 * - Per-task outcome tracking (model, tokens, cost, outcome)
 * - Retry accounting (cheap model failures cost more than one strong-model shot)
 * - Routing baseline calculation (savings vs always-use-strongest)
 * - Energy estimation per task
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import * as crypto from 'crypto';

// ============================================
// Data Types
// ============================================

export type TaskOutcome = 'success' | 'failure' | 'partial' | 'timeout' | 'cancelled';

export type TaskCategory =
  | 'code_generation'
  | 'debugging'
  | 'refactoring'
  | 'testing'
  | 'documentation'
  | 'explanation'
  | 'review'
  | 'other';

export interface TaskOutcomeRecord {
  id: string;
  interactionId: string | null;
  sessionId: string;
  projectId: string | null;
  modelUsed: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  retryCount: number;
  wallTimeMs: number;
  outcome: TaskOutcome;
  userFeedback: number | null; // -1 to 1
  costUsd: number;
  estimatedWh: number;
  taskCategory: TaskCategory;
  complexityEstimate: number; // 0-1 predicted vs actual
  routingReason: string | null; // Why Zoix chose this model
  baselineCostUsd: number; // What it would have cost with always-strongest
  savingsUsd: number; // baselineCost - actualCost
  promptLength: number; // Character count for complexity estimation
  timestamp: number;
}

export interface CostLedgerEntry {
  id: string;
  taskId: string;
  sessionId: string;
  projectId: string | null;
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  retries: number;
  outcome: TaskOutcome;
  costUsd: number;
  estimatedWh: number;
  timestamp: number;
}

export interface RoutingStats {
  totalTasks: number;
  totalCostUsd: number;
  totalBaselineCostUsd: number;
  totalSavingsUsd: number;
  savingsPercentage: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalEnergyWh: number;
  byProvider: Record<string, ProviderStats>;
  byModel: Record<string, ModelStats>;
  byCategory: Record<TaskCategory, CategoryStats>;
  successRate: number;
  avgRetries: number;
  avgWallTimeMs: number;
}

export interface ProviderStats {
  taskCount: number;
  totalCost: number;
  totalTokens: number;
  successRate: number;
  avgWallTimeMs: number;
}

export interface ModelStats {
  taskCount: number;
  totalCost: number;
  totalTokens: number;
  successRate: number;
  avgWallTimeMs: number;
  avgRetries: number;
}

export interface CategoryStats {
  taskCount: number;
  avgCost: number;
  avgTokens: number;
  preferredModel: string;
  successRate: number;
}

export interface DailySummary {
  date: string;
  totalTasks: number;
  totalCostUsd: number;
  totalSavingsUsd: number;
  totalTokens: number;
  totalEnergyWh: number;
  topModel: string;
  successRate: number;
}

// Provider cost rates ($ per million tokens) - Used for baseline calculation
const BASELINE_MODEL = 'claude-opus-4';
const BASELINE_RATE_INPUT = 15.0; // $/MTok
const BASELINE_RATE_OUTPUT = 75.0; // $/MTok

// Energy estimates (Wh per million tokens)
const ENERGY_RATES: Record<string, number> = {
  // Cloud providers
  'claude': 0.5,
  'anthropic': 0.5,
  'openai': 0.4,
  'gemini': 0.3,
  'grok': 0.35,
  'mistral': 0.25,
  'cohere': 0.3,
  // Local inference
  'ollama': 0.01,
  'local': 0.01,
  'lmstudio': 0.01,
};

// ============================================
// TaskOutcomes Class
// ============================================

export class TaskOutcomes {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    if (dbPath) {
      this.dbPath = dbPath;
    } else {
      const userDataPath = app.getPath('userData');
      this.dbPath = path.join(userDataPath, 'task-outcomes.db');
    }
    this.db = new Database(this.dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      -- Task outcomes table: THE CRITICAL FEEDBACK LOOP
      CREATE TABLE IF NOT EXISTS task_outcomes (
        id TEXT PRIMARY KEY,
        interaction_id TEXT,
        session_id TEXT NOT NULL,
        project_id TEXT,
        model_used TEXT NOT NULL,
        provider TEXT NOT NULL,
        tokens_in INTEGER NOT NULL,
        tokens_out INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0,
        wall_time_ms INTEGER NOT NULL,
        outcome TEXT NOT NULL,
        user_feedback REAL,
        cost_usd REAL NOT NULL,
        estimated_wh REAL NOT NULL,
        task_category TEXT DEFAULT 'other',
        complexity_estimate REAL DEFAULT 0.5,
        routing_reason TEXT,
        baseline_cost_usd REAL NOT NULL,
        savings_usd REAL NOT NULL,
        prompt_length INTEGER DEFAULT 0,
        timestamp INTEGER NOT NULL
      );

      -- Cost ledger table: Queryable history for CFO visibility
      CREATE TABLE IF NOT EXISTS cost_ledger (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        project_id TEXT,
        model TEXT NOT NULL,
        provider TEXT NOT NULL,
        tokens_in INTEGER NOT NULL,
        tokens_out INTEGER NOT NULL,
        retries INTEGER DEFAULT 0,
        outcome TEXT NOT NULL,
        cost_usd REAL NOT NULL,
        estimated_wh REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES task_outcomes(id)
      );

      -- Daily summaries for fast dashboard queries
      CREATE TABLE IF NOT EXISTS daily_summaries (
        date TEXT PRIMARY KEY,
        total_tasks INTEGER DEFAULT 0,
        total_cost_usd REAL DEFAULT 0,
        total_savings_usd REAL DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        total_energy_wh REAL DEFAULT 0,
        top_model TEXT,
        success_rate REAL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );

      -- Routing decisions log for learning
      CREATE TABLE IF NOT EXISTS routing_decisions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        considered_models TEXT NOT NULL, -- JSON array
        selected_model TEXT NOT NULL,
        selection_reason TEXT NOT NULL,
        confidence REAL DEFAULT 0.5,
        context_features TEXT, -- JSON of task features
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES task_outcomes(id)
      );

      -- Indexes for fast queries
      CREATE INDEX IF NOT EXISTS idx_outcomes_session ON task_outcomes(session_id);
      CREATE INDEX IF NOT EXISTS idx_outcomes_project ON task_outcomes(project_id);
      CREATE INDEX IF NOT EXISTS idx_outcomes_timestamp ON task_outcomes(timestamp);
      CREATE INDEX IF NOT EXISTS idx_outcomes_model ON task_outcomes(model_used);
      CREATE INDEX IF NOT EXISTS idx_outcomes_provider ON task_outcomes(provider);
      CREATE INDEX IF NOT EXISTS idx_outcomes_category ON task_outcomes(task_category);
      CREATE INDEX IF NOT EXISTS idx_outcomes_outcome ON task_outcomes(outcome);
      CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON cost_ledger(timestamp);
      CREATE INDEX IF NOT EXISTS idx_ledger_project ON cost_ledger(project_id);
      CREATE INDEX IF NOT EXISTS idx_routing_task ON routing_decisions(task_id);
    `);

    console.log('[TaskOutcomes] Database initialized at:', this.dbPath);
  }

  // ============================================
  // Recording Methods
  // ============================================

  /**
   * Record a task outcome - THE CORE FEEDBACK LOOP
   */
  recordOutcome(data: {
    sessionId: string;
    projectId?: string;
    modelUsed: string;
    provider: string;
    tokensIn: number;
    tokensOut: number;
    retryCount?: number;
    wallTimeMs: number;
    outcome: TaskOutcome;
    userFeedback?: number;
    taskCategory?: TaskCategory;
    complexityEstimate?: number;
    routingReason?: string;
    promptLength?: number;
    interactionId?: string;
  }): TaskOutcomeRecord {
    const id = crypto.randomUUID();
    const now = Date.now();

    // Calculate costs
    const costUsd = this.calculateCost(data.provider, data.modelUsed, data.tokensIn, data.tokensOut);
    const baselineCostUsd = this.calculateBaselineCost(data.tokensIn, data.tokensOut);
    const savingsUsd = Math.max(0, baselineCostUsd - costUsd);
    const estimatedWh = this.calculateEnergy(data.provider, data.tokensIn + data.tokensOut);

    const record: TaskOutcomeRecord = {
      id,
      interactionId: data.interactionId || null,
      sessionId: data.sessionId,
      projectId: data.projectId || null,
      modelUsed: data.modelUsed,
      provider: data.provider,
      tokensIn: data.tokensIn,
      tokensOut: data.tokensOut,
      retryCount: data.retryCount || 0,
      wallTimeMs: data.wallTimeMs,
      outcome: data.outcome,
      userFeedback: data.userFeedback ?? null,
      costUsd,
      estimatedWh,
      taskCategory: data.taskCategory || 'other',
      complexityEstimate: data.complexityEstimate || 0.5,
      routingReason: data.routingReason || null,
      baselineCostUsd,
      savingsUsd,
      promptLength: data.promptLength || 0,
      timestamp: now,
    };

    // Insert into task_outcomes
    const stmt = this.db.prepare(`
      INSERT INTO task_outcomes (
        id, interaction_id, session_id, project_id, model_used, provider,
        tokens_in, tokens_out, retry_count, wall_time_ms, outcome,
        user_feedback, cost_usd, estimated_wh, task_category, complexity_estimate,
        routing_reason, baseline_cost_usd, savings_usd, prompt_length, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.interactionId,
      record.sessionId,
      record.projectId,
      record.modelUsed,
      record.provider,
      record.tokensIn,
      record.tokensOut,
      record.retryCount,
      record.wallTimeMs,
      record.outcome,
      record.userFeedback,
      record.costUsd,
      record.estimatedWh,
      record.taskCategory,
      record.complexityEstimate,
      record.routingReason,
      record.baselineCostUsd,
      record.savingsUsd,
      record.promptLength,
      record.timestamp
    );

    // Insert into cost_ledger
    this.recordLedgerEntry(record);

    // Update daily summary
    this.updateDailySummary(record);

    console.log(`[TaskOutcomes] Recorded: ${record.modelUsed} | $${record.costUsd.toFixed(4)} | Saved $${record.savingsUsd.toFixed(4)}`);

    return record;
  }

  /**
   * Record a routing decision (for learning)
   */
  recordRoutingDecision(data: {
    taskId: string;
    consideredModels: string[];
    selectedModel: string;
    selectionReason: string;
    confidence: number;
    contextFeatures?: Record<string, any>;
  }): void {
    const id = crypto.randomUUID();

    this.db.prepare(`
      INSERT INTO routing_decisions (
        id, task_id, considered_models, selected_model,
        selection_reason, confidence, context_features, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.taskId,
      JSON.stringify(data.consideredModels),
      data.selectedModel,
      data.selectionReason,
      data.confidence,
      data.contextFeatures ? JSON.stringify(data.contextFeatures) : null,
      Date.now()
    );
  }

  /**
   * Update user feedback for a task
   */
  recordFeedback(taskId: string, feedback: number): void {
    this.db.prepare(`
      UPDATE task_outcomes SET user_feedback = ? WHERE id = ?
    `).run(feedback, taskId);
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Get overall routing statistics
   */
  getRoutingStats(since?: number): RoutingStats {
    const whereClause = since ? 'WHERE timestamp > ?' : '';
    const params = since ? [since] : [];

    // Overall stats
    const overall = this.db.prepare(`
      SELECT
        COUNT(*) as total_tasks,
        COALESCE(SUM(cost_usd), 0) as total_cost,
        COALESCE(SUM(baseline_cost_usd), 0) as total_baseline_cost,
        COALESCE(SUM(savings_usd), 0) as total_savings,
        COALESCE(SUM(tokens_in), 0) as total_tokens_in,
        COALESCE(SUM(tokens_out), 0) as total_tokens_out,
        COALESCE(SUM(estimated_wh), 0) as total_energy,
        COALESCE(AVG(CASE WHEN outcome = 'success' THEN 1.0 ELSE 0.0 END), 0) as success_rate,
        COALESCE(AVG(retry_count), 0) as avg_retries,
        COALESCE(AVG(wall_time_ms), 0) as avg_wall_time
      FROM task_outcomes ${whereClause}
    `).get(...params) as any;

    // By provider
    const byProviderRows = this.db.prepare(`
      SELECT
        provider,
        COUNT(*) as task_count,
        COALESCE(SUM(cost_usd), 0) as total_cost,
        COALESCE(SUM(tokens_in + tokens_out), 0) as total_tokens,
        COALESCE(AVG(CASE WHEN outcome = 'success' THEN 1.0 ELSE 0.0 END), 0) as success_rate,
        COALESCE(AVG(wall_time_ms), 0) as avg_wall_time
      FROM task_outcomes ${whereClause}
      GROUP BY provider
    `).all(...params) as any[];

    const byProvider: Record<string, ProviderStats> = {};
    for (const row of byProviderRows) {
      byProvider[row.provider] = {
        taskCount: row.task_count,
        totalCost: row.total_cost,
        totalTokens: row.total_tokens,
        successRate: row.success_rate,
        avgWallTimeMs: row.avg_wall_time,
      };
    }

    // By model
    const byModelRows = this.db.prepare(`
      SELECT
        model_used,
        COUNT(*) as task_count,
        COALESCE(SUM(cost_usd), 0) as total_cost,
        COALESCE(SUM(tokens_in + tokens_out), 0) as total_tokens,
        COALESCE(AVG(CASE WHEN outcome = 'success' THEN 1.0 ELSE 0.0 END), 0) as success_rate,
        COALESCE(AVG(wall_time_ms), 0) as avg_wall_time,
        COALESCE(AVG(retry_count), 0) as avg_retries
      FROM task_outcomes ${whereClause}
      GROUP BY model_used
    `).all(...params) as any[];

    const byModel: Record<string, ModelStats> = {};
    for (const row of byModelRows) {
      byModel[row.model_used] = {
        taskCount: row.task_count,
        totalCost: row.total_cost,
        totalTokens: row.total_tokens,
        successRate: row.success_rate,
        avgWallTimeMs: row.avg_wall_time,
        avgRetries: row.avg_retries,
      };
    }

    // By category
    const byCategoryRows = this.db.prepare(`
      SELECT
        task_category,
        COUNT(*) as task_count,
        COALESCE(AVG(cost_usd), 0) as avg_cost,
        COALESCE(AVG(tokens_in + tokens_out), 0) as avg_tokens,
        COALESCE(AVG(CASE WHEN outcome = 'success' THEN 1.0 ELSE 0.0 END), 0) as success_rate,
        (SELECT model_used FROM task_outcomes t2
         WHERE t2.task_category = task_outcomes.task_category
         GROUP BY model_used ORDER BY COUNT(*) DESC LIMIT 1) as preferred_model
      FROM task_outcomes ${whereClause}
      GROUP BY task_category
    `).all(...params) as any[];

    const byCategory: Record<TaskCategory, CategoryStats> = {} as any;
    for (const row of byCategoryRows) {
      byCategory[row.task_category as TaskCategory] = {
        taskCount: row.task_count,
        avgCost: row.avg_cost,
        avgTokens: row.avg_tokens,
        preferredModel: row.preferred_model || 'unknown',
        successRate: row.success_rate,
      };
    }

    const totalBaseline = overall.total_baseline_cost || 0;
    const totalSavings = overall.total_savings || 0;

    return {
      totalTasks: overall.total_tasks || 0,
      totalCostUsd: overall.total_cost || 0,
      totalBaselineCostUsd: totalBaseline,
      totalSavingsUsd: totalSavings,
      savingsPercentage: totalBaseline > 0 ? (totalSavings / totalBaseline) * 100 : 0,
      totalTokensIn: overall.total_tokens_in || 0,
      totalTokensOut: overall.total_tokens_out || 0,
      totalEnergyWh: overall.total_energy || 0,
      byProvider,
      byModel,
      byCategory,
      successRate: overall.success_rate || 0,
      avgRetries: overall.avg_retries || 0,
      avgWallTimeMs: overall.avg_wall_time || 0,
    };
  }

  /**
   * Get savings headline metric
   */
  getSavingsHeadline(): { savings: number; percentage: number; tasks: number } {
    const stats = this.getRoutingStats();
    return {
      savings: stats.totalSavingsUsd,
      percentage: stats.savingsPercentage,
      tasks: stats.totalTasks,
    };
  }

  /**
   * Get daily summaries for dashboard
   */
  getDailySummaries(days: number = 30): DailySummary[] {
    const rows = this.db.prepare(`
      SELECT * FROM daily_summaries
      ORDER BY date DESC
      LIMIT ?
    `).all(days) as any[];

    return rows.map(row => ({
      date: row.date,
      totalTasks: row.total_tasks,
      totalCostUsd: row.total_cost_usd,
      totalSavingsUsd: row.total_savings_usd,
      totalTokens: row.total_tokens,
      totalEnergyWh: row.total_energy_wh,
      topModel: row.top_model || 'none',
      successRate: row.success_rate,
    }));
  }

  /**
   * Get recent outcomes
   */
  getRecentOutcomes(limit: number = 50): TaskOutcomeRecord[] {
    const rows = this.db.prepare(`
      SELECT * FROM task_outcomes
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(this.rowToOutcome);
  }

  /**
   * Get outcomes by session
   */
  getOutcomesBySession(sessionId: string): TaskOutcomeRecord[] {
    const rows = this.db.prepare(`
      SELECT * FROM task_outcomes
      WHERE session_id = ?
      ORDER BY timestamp DESC
    `).all(sessionId) as any[];

    return rows.map(this.rowToOutcome);
  }

  /**
   * Get outcomes by project
   */
  getOutcomesByProject(projectId: string): TaskOutcomeRecord[] {
    const rows = this.db.prepare(`
      SELECT * FROM task_outcomes
      WHERE project_id = ?
      ORDER BY timestamp DESC
    `).all(projectId) as any[];

    return rows.map(this.rowToOutcome);
  }

  /**
   * Get model performance for routing decisions
   */
  getModelPerformance(taskCategory?: TaskCategory): ModelStats[] {
    let query = `
      SELECT
        model_used,
        COUNT(*) as task_count,
        COALESCE(SUM(cost_usd), 0) as total_cost,
        COALESCE(SUM(tokens_in + tokens_out), 0) as total_tokens,
        COALESCE(AVG(CASE WHEN outcome = 'success' THEN 1.0 ELSE 0.0 END), 0) as success_rate,
        COALESCE(AVG(wall_time_ms), 0) as avg_wall_time,
        COALESCE(AVG(retry_count), 0) as avg_retries
      FROM task_outcomes
    `;

    const params: any[] = [];
    if (taskCategory) {
      query += ' WHERE task_category = ?';
      params.push(taskCategory);
    }

    query += ' GROUP BY model_used ORDER BY success_rate DESC, total_cost ASC';

    const rows = this.db.prepare(query).all(...params) as any[];

    return rows.map(row => ({
      taskCount: row.task_count,
      totalCost: row.total_cost,
      totalTokens: row.total_tokens,
      successRate: row.success_rate,
      avgWallTimeMs: row.avg_wall_time,
      avgRetries: row.avg_retries,
    }));
  }

  /**
   * Get best model for a task category (for routing decisions)
   */
  getBestModelForCategory(category: TaskCategory): string | null {
    const row = this.db.prepare(`
      SELECT model_used,
        AVG(CASE WHEN outcome = 'success' THEN 1.0 ELSE 0.0 END) as success_rate,
        AVG(cost_usd) as avg_cost
      FROM task_outcomes
      WHERE task_category = ?
      GROUP BY model_used
      HAVING COUNT(*) >= 5
      ORDER BY success_rate DESC, avg_cost ASC
      LIMIT 1
    `).get(category) as any;

    return row?.model_used || null;
  }

  // ============================================
  // Cost Calculation Methods
  // ============================================

  private calculateCost(provider: string, model: string, tokensIn: number, tokensOut: number): number {
    // Cost rates per million tokens
    const rates = this.getModelRates(provider, model);
    return (tokensIn * rates.input + tokensOut * rates.output) / 1_000_000;
  }

  private calculateBaselineCost(tokensIn: number, tokensOut: number): number {
    return (tokensIn * BASELINE_RATE_INPUT + tokensOut * BASELINE_RATE_OUTPUT) / 1_000_000;
  }

  private calculateEnergy(provider: string, totalTokens: number): number {
    const rate = ENERGY_RATES[provider.toLowerCase()] || 0.3;
    return (totalTokens * rate) / 1_000_000;
  }

  private getModelRates(provider: string, model: string): { input: number; output: number } {
    // Pricing as of 2026 ($/MTok)
    const rates: Record<string, { input: number; output: number }> = {
      // Anthropic
      'claude-opus-4': { input: 15.0, output: 75.0 },
      'claude-sonnet-4': { input: 3.0, output: 15.0 },
      'claude-haiku': { input: 0.25, output: 1.25 },
      // OpenAI
      'gpt-4o': { input: 2.5, output: 10.0 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gpt-4-turbo': { input: 10.0, output: 30.0 },
      // Google
      'gemini-pro': { input: 0.5, output: 1.5 },
      'gemini-flash': { input: 0.075, output: 0.3 },
      // Local (free)
      'llama': { input: 0, output: 0 },
      'mistral': { input: 0, output: 0 },
      'qwen': { input: 0, output: 0 },
    };

    const modelLower = model.toLowerCase();
    for (const [key, rate] of Object.entries(rates)) {
      if (modelLower.includes(key)) {
        return rate;
      }
    }

    // Default to mid-tier pricing
    if (provider.toLowerCase() === 'ollama' || provider.toLowerCase() === 'local') {
      return { input: 0, output: 0 };
    }

    return { input: 2.0, output: 8.0 };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private recordLedgerEntry(outcome: TaskOutcomeRecord): void {
    const id = crypto.randomUUID();

    this.db.prepare(`
      INSERT INTO cost_ledger (
        id, task_id, session_id, project_id, model, provider,
        tokens_in, tokens_out, retries, outcome, cost_usd, estimated_wh, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      outcome.id,
      outcome.sessionId,
      outcome.projectId,
      outcome.modelUsed,
      outcome.provider,
      outcome.tokensIn,
      outcome.tokensOut,
      outcome.retryCount,
      outcome.outcome,
      outcome.costUsd,
      outcome.estimatedWh,
      outcome.timestamp
    );
  }

  private updateDailySummary(outcome: TaskOutcomeRecord): void {
    const date = new Date(outcome.timestamp).toISOString().split('T')[0];

    // Upsert daily summary
    const existing = this.db.prepare('SELECT * FROM daily_summaries WHERE date = ?').get(date) as any;

    if (existing) {
      const newTasks = existing.total_tasks + 1;
      const newCost = existing.total_cost_usd + outcome.costUsd;
      const newSavings = existing.total_savings_usd + outcome.savingsUsd;
      const newTokens = existing.total_tokens + outcome.tokensIn + outcome.tokensOut;
      const newEnergy = existing.total_energy_wh + outcome.estimatedWh;
      const newSuccessRate = ((existing.success_rate * existing.total_tasks) + (outcome.outcome === 'success' ? 1 : 0)) / newTasks;

      this.db.prepare(`
        UPDATE daily_summaries SET
          total_tasks = ?,
          total_cost_usd = ?,
          total_savings_usd = ?,
          total_tokens = ?,
          total_energy_wh = ?,
          success_rate = ?,
          updated_at = ?
        WHERE date = ?
      `).run(newTasks, newCost, newSavings, newTokens, newEnergy, newSuccessRate, Date.now(), date);
    } else {
      this.db.prepare(`
        INSERT INTO daily_summaries (
          date, total_tasks, total_cost_usd, total_savings_usd,
          total_tokens, total_energy_wh, top_model, success_rate, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        date,
        1,
        outcome.costUsd,
        outcome.savingsUsd,
        outcome.tokensIn + outcome.tokensOut,
        outcome.estimatedWh,
        outcome.modelUsed,
        outcome.outcome === 'success' ? 1.0 : 0.0,
        Date.now()
      );
    }
  }

  private rowToOutcome(row: any): TaskOutcomeRecord {
    return {
      id: row.id,
      interactionId: row.interaction_id,
      sessionId: row.session_id,
      projectId: row.project_id,
      modelUsed: row.model_used,
      provider: row.provider,
      tokensIn: row.tokens_in,
      tokensOut: row.tokens_out,
      retryCount: row.retry_count,
      wallTimeMs: row.wall_time_ms,
      outcome: row.outcome,
      userFeedback: row.user_feedback,
      costUsd: row.cost_usd,
      estimatedWh: row.estimated_wh,
      taskCategory: row.task_category,
      complexityEstimate: row.complexity_estimate,
      routingReason: row.routing_reason,
      baselineCostUsd: row.baseline_cost_usd,
      savingsUsd: row.savings_usd,
      promptLength: row.prompt_length,
      timestamp: row.timestamp,
    };
  }

  // ============================================
  // Cleanup
  // ============================================

  close(): void {
    this.db.close();
  }
}

// ============================================
// Singleton Export
// ============================================

let instance: TaskOutcomes | null = null;

export function getTaskOutcomes(dbPath?: string): TaskOutcomes {
  if (!instance) {
    instance = new TaskOutcomes(dbPath);
  }
  return instance;
}

export function shutdownTaskOutcomes(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}

export default TaskOutcomes;
