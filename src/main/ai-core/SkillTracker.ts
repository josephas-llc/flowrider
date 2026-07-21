/**
 * SkillTracker - User Intelligence Layer for ZOIX
 *
 * Tracks the user's skill progression over time - like a fitness tracker for coding ability.
 *
 * Features:
 * - Skill metrics per domain (error frequency, resolution time, code velocity, pattern recognition)
 * - Skill level assessment (novice, intermediate, proficient, expert)
 * - Milestone tracking (achievements, level-ups, learning velocity)
 * - Progression analysis (skill trends, mastery prediction)
 *
 * Stores in SQLite:
 * - skills: domain-specific skill metrics
 * - milestones: achievements and level-up events
 * - skill_history: historical snapshots for trend analysis
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================
// Data Types
// ============================================

export type SkillLevel = 'novice' | 'intermediate' | 'proficient' | 'expert';

export type ProgressionRate = 'improving' | 'stable' | 'declining';

export interface SkillMetrics {
  domain: string;
  // Error tracking
  totalErrors: number;
  errorsPerHour: number;
  errorsPerDay: number;
  // Resolution tracking
  avgTimeToResolution: number; // seconds
  fastestResolution: number;
  slowestResolution: number;
  // Code velocity
  linesChangedPerSession: number;
  sessionsCount: number;
  totalLinesChanged: number;
  // Pattern recognition
  knownPatternsUsed: number;
  novelSolutionsCreated: number;
  patternRecognitionRate: number; // 0-1
  // Derived metrics
  successRate: number; // 0-1
  skillLevel: SkillLevel;
  lastUpdated: number;
  firstSeen: number;
}

export interface Milestone {
  id: string;
  type: 'achievement' | 'level_up' | 'mastery';
  domain: string;
  name: string;
  description: string;
  achievedAt: number;
  metadata: Record<string, any>;
}

export interface SkillHistorySnapshot {
  id: string;
  domain: string;
  skillLevel: SkillLevel;
  metrics: Partial<SkillMetrics>;
  timestamp: number;
}

export interface ProgressionAnalysis {
  domain: string;
  currentLevel: SkillLevel;
  progressionRate: ProgressionRate;
  daysAtCurrentLevel: number;
  estimatedDaysToNextLevel: number | null;
  recentTrends: {
    errorRateTrend: 'improving' | 'stable' | 'worsening';
    velocityTrend: 'increasing' | 'stable' | 'decreasing';
    patternRecognitionTrend: 'improving' | 'stable' | 'declining';
  };
}

export interface MasteryPrediction {
  domain: string;
  currentLevel: SkillLevel;
  estimatedDaysToExpert: number | null;
  confidence: number; // 0-1
  requiredMilestones: string[];
  currentProgressPercentage: number; // 0-100
}

export interface ActivityContext {
  sessionId?: string;
  projectId?: string;
  linesChanged?: number;
  filesAffected?: string[];
  timeSpent?: number; // seconds
  patternUsed?: string;
  wasNovel?: boolean;
}

// ============================================
// Skill Level Evaluation
// ============================================

class SkillLevelEvaluator {
  /**
   * Determine skill level based on comprehensive metrics
   */
  static evaluateSkillLevel(metrics: Partial<SkillMetrics>): SkillLevel {
    let expertScore = 0;
    let proficientScore = 0;
    let intermediateScore = 0;
    let noviceScore = 0;

    // Error frequency analysis
    if (metrics.errorsPerDay !== undefined) {
      if (metrics.errorsPerDay < 1) expertScore += 3;
      else if (metrics.errorsPerDay < 3) proficientScore += 3;
      else if (metrics.errorsPerDay < 8) intermediateScore += 2;
      else noviceScore += 3;
    }

    // Time to resolution analysis
    if (metrics.avgTimeToResolution !== undefined) {
      const minutesToResolve = metrics.avgTimeToResolution / 60;
      if (minutesToResolve < 5) expertScore += 3;
      else if (minutesToResolve < 15) proficientScore += 2;
      else if (minutesToResolve < 30) intermediateScore += 2;
      else noviceScore += 2;
    }

    // Code velocity analysis
    if (metrics.linesChangedPerSession !== undefined) {
      if (metrics.linesChangedPerSession > 200) expertScore += 2;
      else if (metrics.linesChangedPerSession > 100) proficientScore += 2;
      else if (metrics.linesChangedPerSession > 30) intermediateScore += 1;
      else noviceScore += 1;
    }

    // Pattern recognition analysis
    if (metrics.patternRecognitionRate !== undefined) {
      if (metrics.patternRecognitionRate > 0.8) expertScore += 3;
      else if (metrics.patternRecognitionRate > 0.6) proficientScore += 3;
      else if (metrics.patternRecognitionRate > 0.4) intermediateScore += 2;
      else noviceScore += 2;
    }

    // Success rate analysis
    if (metrics.successRate !== undefined) {
      if (metrics.successRate > 0.9) expertScore += 3;
      else if (metrics.successRate > 0.75) proficientScore += 2;
      else if (metrics.successRate > 0.5) intermediateScore += 2;
      else noviceScore += 2;
    }

    // Experience analysis
    if (metrics.sessionsCount !== undefined) {
      if (metrics.sessionsCount > 100) expertScore += 2;
      else if (metrics.sessionsCount > 50) proficientScore += 2;
      else if (metrics.sessionsCount > 10) intermediateScore += 1;
      else noviceScore += 1;
    }

    // Novel solutions (expert indicator)
    if (metrics.novelSolutionsCreated !== undefined && metrics.novelSolutionsCreated > 10) {
      expertScore += 3;
    }

    // Determine final level
    const scores = {
      expert: expertScore,
      proficient: proficientScore,
      intermediate: intermediateScore,
      novice: noviceScore,
    };

    const maxScore = Math.max(expertScore, proficientScore, intermediateScore, noviceScore);

    if (maxScore === 0) return 'novice';

    if (scores.expert === maxScore && expertScore >= 8) return 'expert';
    if (scores.proficient === maxScore && proficientScore >= 6) return 'proficient';
    if (scores.intermediate === maxScore && intermediateScore >= 4) return 'intermediate';
    return 'novice';
  }

  /**
   * Calculate progression rate based on historical data
   */
  static calculateProgressionRate(snapshots: SkillHistorySnapshot[]): ProgressionRate {
    if (snapshots.length < 2) return 'stable';

    // Sort by timestamp
    const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);

    // Get recent snapshots (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = sorted.filter(s => s.timestamp > thirtyDaysAgo);

    if (recent.length < 2) return 'stable';

    const first = recent[0];
    const last = recent[recent.length - 1];

    // Calculate improvement score
    let improvementScore = 0;

    // Compare error rates
    if (first.metrics.errorsPerDay && last.metrics.errorsPerDay) {
      const errorImprovement = (first.metrics.errorsPerDay - last.metrics.errorsPerDay) / Math.max(1, first.metrics.errorsPerDay);
      improvementScore += errorImprovement * 3;
    }

    // Compare resolution times
    if (first.metrics.avgTimeToResolution && last.metrics.avgTimeToResolution) {
      const resolutionImprovement = (first.metrics.avgTimeToResolution - last.metrics.avgTimeToResolution) / Math.max(1, first.metrics.avgTimeToResolution);
      improvementScore += resolutionImprovement * 2;
    }

    // Compare success rates
    if (first.metrics.successRate && last.metrics.successRate) {
      const successImprovement = (last.metrics.successRate - first.metrics.successRate) / Math.max(0.1, first.metrics.successRate);
      improvementScore += successImprovement * 3;
    }

    // Compare pattern recognition
    if (first.metrics.patternRecognitionRate && last.metrics.patternRecognitionRate) {
      const patternImprovement = (last.metrics.patternRecognitionRate - first.metrics.patternRecognitionRate) / Math.max(0.1, first.metrics.patternRecognitionRate);
      improvementScore += patternImprovement * 2;
    }

    if (improvementScore > 0.2) return 'improving';
    if (improvementScore < -0.2) return 'declining';
    return 'stable';
  }
}

// ============================================
// Milestone Definitions
// ============================================

class MilestoneManager {
  private static readonly MILESTONES = {
    // Session milestones
    'first_session': { name: 'First Steps', description: 'Completed your first coding session', threshold: 1 },
    'sessions_10': { name: 'Getting Started', description: 'Completed 10 coding sessions', threshold: 10 },
    'sessions_50': { name: 'Dedicated Learner', description: 'Completed 50 coding sessions', threshold: 50 },
    'sessions_100': { name: 'Centurion', description: 'Completed 100 coding sessions', threshold: 100 },
    'sessions_500': { name: 'Veteran', description: 'Completed 500 coding sessions', threshold: 500 },

    // Success milestones
    'builds_10': { name: 'Builder', description: '10 successful builds', threshold: 10 },
    'builds_100': { name: 'Master Builder', description: '100 successful builds', threshold: 100 },

    // Error reduction milestones
    'error_free_day': { name: 'Clean Slate', description: 'Completed a full day without errors', threshold: 1 },
    'error_free_week': { name: 'Flawless Week', description: 'Completed a week without errors', threshold: 1 },

    // Speed milestones
    'fast_resolver': { name: 'Quick Fix', description: 'Resolved an error in under 1 minute', threshold: 1 },
    'speed_demon': { name: 'Speed Demon', description: 'Resolved 10 errors in under 5 minutes each', threshold: 10 },

    // Pattern milestones
    'pattern_creator': { name: 'Pattern Creator', description: 'Created your first novel solution', threshold: 1 },
    'innovator': { name: 'Innovator', description: 'Created 10 novel solutions', threshold: 10 },

    // Velocity milestones
    'productive_session': { name: 'Productive Session', description: 'Changed 500+ lines in a session', threshold: 1 },
    'high_velocity': { name: 'High Velocity', description: 'Averaged 200+ lines per session for a week', threshold: 1 },
  };

  /**
   * Check if a milestone has been achieved
   */
  static checkMilestone(
    type: string,
    currentValue: number,
    existingMilestones: Milestone[]
  ): { achieved: boolean; milestone?: typeof MilestoneManager.MILESTONES[keyof typeof MilestoneManager.MILESTONES] } {
    const milestone = this.MILESTONES[type as keyof typeof this.MILESTONES];
    if (!milestone) return { achieved: false };

    // Check if already achieved
    const alreadyAchieved = existingMilestones.some(m => m.name === milestone.name);
    if (alreadyAchieved) return { achieved: false };

    // Check if threshold met
    if (currentValue >= milestone.threshold) {
      return { achieved: true, milestone };
    }

    return { achieved: false };
  }
}

// ============================================
// SkillTracker Class
// ============================================

export class SkillTracker {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    if (dbPath) {
      this.dbPath = dbPath;
    } else {
      const userDataPath = app.getPath('userData');
      this.dbPath = path.join(userDataPath, 'skill-tracker.db');
    }
    this.db = new Database(this.dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      -- Skills table: tracks metrics per domain
      CREATE TABLE IF NOT EXISTS skills (
        domain TEXT PRIMARY KEY,
        total_errors INTEGER DEFAULT 0,
        errors_per_hour REAL DEFAULT 0,
        errors_per_day REAL DEFAULT 0,
        avg_time_to_resolution REAL DEFAULT 0,
        fastest_resolution REAL DEFAULT 0,
        slowest_resolution REAL DEFAULT 0,
        lines_changed_per_session REAL DEFAULT 0,
        sessions_count INTEGER DEFAULT 0,
        total_lines_changed INTEGER DEFAULT 0,
        known_patterns_used INTEGER DEFAULT 0,
        novel_solutions_created INTEGER DEFAULT 0,
        pattern_recognition_rate REAL DEFAULT 0,
        success_rate REAL DEFAULT 0,
        skill_level TEXT DEFAULT 'novice',
        last_updated INTEGER NOT NULL,
        first_seen INTEGER NOT NULL
      );

      -- Milestones table: tracks achievements
      CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        domain TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        achieved_at INTEGER NOT NULL,
        metadata TEXT DEFAULT '{}'
      );

      -- Skill history table: snapshots for trend analysis
      CREATE TABLE IF NOT EXISTS skill_history (
        id TEXT PRIMARY KEY,
        domain TEXT NOT NULL,
        skill_level TEXT NOT NULL,
        metrics TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_skills_level ON skills(skill_level);
      CREATE INDEX IF NOT EXISTS idx_milestones_domain ON milestones(domain);
      CREATE INDEX IF NOT EXISTS idx_milestones_achieved_at ON milestones(achieved_at);
      CREATE INDEX IF NOT EXISTS idx_skill_history_domain ON skill_history(domain);
      CREATE INDEX IF NOT EXISTS idx_skill_history_timestamp ON skill_history(timestamp);
    `);

    console.log('[SkillTracker] Database initialized at:', this.dbPath);
  }

  // ============================================
  // Recording Methods
  // ============================================

  /**
   * Record a successful interaction
   */
  recordSuccess(domain: string, context: ActivityContext = {}): void {
    const now = Date.now();
    const skill = this.getOrCreateSkill(domain);

    // Update metrics
    const newSuccessRate = ((skill.successRate * skill.sessionsCount) + 1) / (skill.sessionsCount + 1);
    const newSessionsCount = skill.sessionsCount + 1;

    let updates: Partial<SkillMetrics> = {
      successRate: newSuccessRate,
      sessionsCount: newSessionsCount,
      lastUpdated: now,
    };

    // Update velocity if lines changed
    if (context.linesChanged) {
      const newTotalLines = skill.totalLinesChanged + context.linesChanged;
      const newLinesPerSession = newTotalLines / newSessionsCount;
      updates.totalLinesChanged = newTotalLines;
      updates.linesChangedPerSession = newLinesPerSession;
    }

    // Update pattern usage
    if (context.patternUsed) {
      updates.knownPatternsUsed = skill.knownPatternsUsed + 1;
      if (context.wasNovel) {
        updates.novelSolutionsCreated = skill.novelSolutionsCreated + 1;
      }
      const totalPatterns = (updates.knownPatternsUsed || skill.knownPatternsUsed) + (updates.novelSolutionsCreated || skill.novelSolutionsCreated);
      updates.patternRecognitionRate = totalPatterns > 0 ? (updates.knownPatternsUsed || skill.knownPatternsUsed) / totalPatterns : 0;
    }

    this.updateSkill(domain, updates);

    // Check for milestones
    this.checkAndAwardMilestones(domain, { ...skill, ...updates });

    // Create snapshot periodically (every 10 sessions)
    if (newSessionsCount % 10 === 0) {
      this.createHistorySnapshot(domain);
    }
  }

  /**
   * Record an error
   */
  recordError(domain: string, errorType: string, context: ActivityContext = {}): void {
    const now = Date.now();
    const skill = this.getOrCreateSkill(domain);

    // Calculate time-based error rates
    const hoursSinceFirstSeen = Math.max(1, (now - skill.firstSeen) / (1000 * 60 * 60));
    const daysSinceFirstSeen = Math.max(1, (now - skill.firstSeen) / (1000 * 60 * 60 * 24));

    const newTotalErrors = skill.totalErrors + 1;
    const newErrorsPerHour = newTotalErrors / hoursSinceFirstSeen;
    const newErrorsPerDay = newTotalErrors / daysSinceFirstSeen;

    // Update success rate
    const newSessionsCount = skill.sessionsCount + 1;
    const newSuccessRate = ((skill.successRate * skill.sessionsCount) + 0) / newSessionsCount;

    const updates: Partial<SkillMetrics> = {
      totalErrors: newTotalErrors,
      errorsPerHour: newErrorsPerHour,
      errorsPerDay: newErrorsPerDay,
      successRate: newSuccessRate,
      sessionsCount: newSessionsCount,
      lastUpdated: now,
    };

    // Update resolution time if provided
    if (context.timeSpent) {
      const currentAvg = skill.avgTimeToResolution || 0;
      const currentCount = skill.totalErrors || 1;
      updates.avgTimeToResolution = ((currentAvg * currentCount) + context.timeSpent) / (currentCount + 1);

      if (skill.fastestResolution === 0 || context.timeSpent < skill.fastestResolution) {
        updates.fastestResolution = context.timeSpent;
      }
      if (context.timeSpent > skill.slowestResolution) {
        updates.slowestResolution = context.timeSpent;
      }
    }

    this.updateSkill(domain, updates);

    // Create snapshot periodically
    if (newSessionsCount % 10 === 0) {
      this.createHistorySnapshot(domain);
    }
  }

  /**
   * Manually award a milestone
   */
  achieveMilestone(milestone: Omit<Milestone, 'id' | 'achievedAt'>): string {
    const id = crypto.randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO milestones (id, type, domain, name, description, achieved_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      milestone.type,
      milestone.domain,
      milestone.name,
      milestone.description,
      now,
      JSON.stringify(milestone.metadata || {})
    );

    console.log(`[SkillTracker] Milestone achieved: ${milestone.name} in ${milestone.domain}`);
    return id;
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Get skill level for a domain
   */
  getSkillLevel(domain: string): SkillLevel {
    const skill = this.getSkill(domain);
    return skill?.skillLevel || 'novice';
  }

  /**
   * Get all milestones
   */
  getMilestones(domain?: string): Milestone[] {
    let query = 'SELECT * FROM milestones';
    const params: any[] = [];

    if (domain) {
      query += ' WHERE domain = ?';
      params.push(domain);
    }

    query += ' ORDER BY achieved_at DESC';

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(this.rowToMilestone);
  }

  /**
   * Get recent achievements (last 30 days)
   */
  getRecentAchievements(days: number = 30): Milestone[] {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const rows = this.db.prepare(`
      SELECT * FROM milestones WHERE achieved_at > ? ORDER BY achieved_at DESC
    `).all(cutoff) as any[];
    return rows.map(this.rowToMilestone);
  }

  /**
   * Get comprehensive progression analysis for a domain
   */
  getProgressionAnalysis(domain: string): ProgressionAnalysis | null {
    const skill = this.getSkill(domain);
    if (!skill) return null;

    const history = this.getSkillHistory(domain);
    const progressionRate = SkillLevelEvaluator.calculateProgressionRate(history);

    // Calculate days at current level
    const currentLevelSnapshot = history
      .filter(h => h.skillLevel === skill.skillLevel)
      .sort((a, b) => a.timestamp - b.timestamp)[0];
    const daysAtCurrentLevel = currentLevelSnapshot
      ? Math.floor((Date.now() - currentLevelSnapshot.timestamp) / (1000 * 60 * 60 * 24))
      : 0;

    // Estimate days to next level
    let estimatedDaysToNextLevel: number | null = null;
    if (progressionRate === 'improving' && skill.skillLevel !== 'expert') {
      // Very rough estimate based on current progression rate
      const levelOrder: SkillLevel[] = ['novice', 'intermediate', 'proficient', 'expert'];
      const currentIndex = levelOrder.indexOf(skill.skillLevel);
      if (currentIndex < levelOrder.length - 1) {
        // Estimate based on historical progression
        estimatedDaysToNextLevel = Math.ceil(daysAtCurrentLevel * 1.5);
      }
    }

    // Analyze recent trends
    const recentSnapshots = history.slice(-5);
    const trends = this.analyzeTrends(recentSnapshots);

    return {
      domain,
      currentLevel: skill.skillLevel,
      progressionRate,
      daysAtCurrentLevel,
      estimatedDaysToNextLevel,
      recentTrends: trends,
    };
  }

  /**
   * Predict when user will reach expert level
   */
  predictMastery(domain: string): MasteryPrediction | null {
    const skill = this.getSkill(domain);
    if (!skill) return null;

    const analysis = this.getProgressionAnalysis(domain);
    if (!analysis) return null;

    let estimatedDaysToExpert: number | null = null;
    let confidence = 0.5;
    const requiredMilestones: string[] = [];

    const levelOrder: SkillLevel[] = ['novice', 'intermediate', 'proficient', 'expert'];
    const currentIndex = levelOrder.indexOf(skill.skillLevel);
    const stepsToExpert = levelOrder.length - 1 - currentIndex;

    if (skill.skillLevel === 'expert') {
      estimatedDaysToExpert = 0;
      confidence = 1.0;
    } else if (analysis.progressionRate === 'improving' && analysis.estimatedDaysToNextLevel) {
      // Rough estimate: multiply estimated days by steps remaining
      estimatedDaysToExpert = analysis.estimatedDaysToNextLevel * stepsToExpert;
      confidence = 0.7;

      // Add required milestones
      if (skill.novelSolutionsCreated < 10) {
        requiredMilestones.push('Create more novel solutions (10+ needed)');
      }
      if (skill.sessionsCount < 100) {
        requiredMilestones.push('Complete more sessions (100+ needed)');
      }
      if (skill.successRate < 0.9) {
        requiredMilestones.push('Improve success rate to 90%+');
      }
      if (skill.errorsPerDay > 1) {
        requiredMilestones.push('Reduce errors to less than 1 per day');
      }
    } else if (analysis.progressionRate === 'stable') {
      confidence = 0.4;
      requiredMilestones.push('Increase learning velocity');
    } else {
      confidence = 0.2;
      requiredMilestones.push('Reverse declining trend');
    }

    // Calculate progress percentage
    const currentProgressPercentage = (currentIndex / (levelOrder.length - 1)) * 100;

    return {
      domain,
      currentLevel: skill.skillLevel,
      estimatedDaysToExpert,
      confidence,
      requiredMilestones,
      currentProgressPercentage,
    };
  }

  /**
   * Get all tracked domains
   */
  getAllDomains(): string[] {
    const rows = this.db.prepare('SELECT domain FROM skills ORDER BY last_updated DESC').all() as { domain: string }[];
    return rows.map(r => r.domain);
  }

  /**
   * Get skill metrics for a domain
   */
  getSkillMetrics(domain: string): SkillMetrics | null {
    return this.getSkill(domain);
  }

  // ============================================
  // Internal Helper Methods
  // ============================================

  private getSkill(domain: string): SkillMetrics | null {
    const row = this.db.prepare('SELECT * FROM skills WHERE domain = ?').get(domain) as any;
    return row ? this.rowToSkillMetrics(row) : null;
  }

  private getOrCreateSkill(domain: string): SkillMetrics {
    let skill = this.getSkill(domain);
    if (skill) return skill;

    // Create new skill entry
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO skills (domain, last_updated, first_seen)
      VALUES (?, ?, ?)
    `).run(domain, now, now);

    return this.getSkill(domain)!;
  }

  private updateSkill(domain: string, updates: Partial<SkillMetrics>): void {
    const skill = this.getSkill(domain);
    if (!skill) return;

    const setClauses: string[] = [];
    const values: any[] = [];

    // Build dynamic update query
    const fields: (keyof SkillMetrics)[] = [
      'totalErrors', 'errorsPerHour', 'errorsPerDay', 'avgTimeToResolution',
      'fastestResolution', 'slowestResolution', 'linesChangedPerSession',
      'sessionsCount', 'totalLinesChanged', 'knownPatternsUsed',
      'novelSolutionsCreated', 'patternRecognitionRate', 'successRate', 'lastUpdated'
    ];

    for (const field of fields) {
      if (updates[field] !== undefined) {
        const dbField = this.camelToSnake(field);
        setClauses.push(`${dbField} = ?`);
        values.push(updates[field]);
      }
    }

    // Recalculate skill level
    const updatedMetrics = { ...skill, ...updates };
    const newSkillLevel = SkillLevelEvaluator.evaluateSkillLevel(updatedMetrics);
    setClauses.push('skill_level = ?');
    values.push(newSkillLevel);

    if (setClauses.length > 0) {
      values.push(domain);
      this.db.prepare(`UPDATE skills SET ${setClauses.join(', ')} WHERE domain = ?`).run(...values);

      // Check for level-up milestone
      if (newSkillLevel !== skill.skillLevel) {
        this.achieveMilestone({
          type: 'level_up',
          domain,
          name: `${this.capitalize(newSkillLevel)} in ${domain}`,
          description: `Advanced to ${newSkillLevel} level in ${domain}`,
          metadata: { previousLevel: skill.skillLevel, newLevel: newSkillLevel },
        });
      }
    }
  }

  private createHistorySnapshot(domain: string): void {
    const skill = this.getSkill(domain);
    if (!skill) return;

    const id = crypto.randomUUID();
    const metrics: Partial<SkillMetrics> = {
      errorsPerDay: skill.errorsPerDay,
      avgTimeToResolution: skill.avgTimeToResolution,
      successRate: skill.successRate,
      patternRecognitionRate: skill.patternRecognitionRate,
      linesChangedPerSession: skill.linesChangedPerSession,
    };

    this.db.prepare(`
      INSERT INTO skill_history (id, domain, skill_level, metrics, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, domain, skill.skillLevel, JSON.stringify(metrics), Date.now());
  }

  private getSkillHistory(domain: string, limit: number = 50): SkillHistorySnapshot[] {
    const rows = this.db.prepare(`
      SELECT * FROM skill_history WHERE domain = ? ORDER BY timestamp DESC LIMIT ?
    `).all(domain, limit) as any[];
    return rows.map(this.rowToHistorySnapshot).reverse(); // Chronological order
  }

  private checkAndAwardMilestones(domain: string, skill: SkillMetrics): void {
    const existingMilestones = this.getMilestones(domain);

    // Check session milestones
    const sessionChecks = [
      { type: 'first_session', value: skill.sessionsCount },
      { type: 'sessions_10', value: skill.sessionsCount },
      { type: 'sessions_50', value: skill.sessionsCount },
      { type: 'sessions_100', value: skill.sessionsCount },
      { type: 'sessions_500', value: skill.sessionsCount },
    ];

    for (const check of sessionChecks) {
      const result = MilestoneManager.checkMilestone(check.type, check.value, existingMilestones);
      if (result.achieved && result.milestone) {
        this.achieveMilestone({
          type: 'achievement',
          domain,
          name: result.milestone.name,
          description: result.milestone.description,
          metadata: { type: check.type },
        });
      }
    }

    // Check pattern milestones
    if (skill.novelSolutionsCreated >= 1) {
      const result = MilestoneManager.checkMilestone('pattern_creator', skill.novelSolutionsCreated, existingMilestones);
      if (result.achieved && result.milestone) {
        this.achieveMilestone({
          type: 'achievement',
          domain,
          name: result.milestone.name,
          description: result.milestone.description,
          metadata: { type: 'pattern_creator' },
        });
      }
    }

    if (skill.novelSolutionsCreated >= 10) {
      const result = MilestoneManager.checkMilestone('innovator', skill.novelSolutionsCreated, existingMilestones);
      if (result.achieved && result.milestone) {
        this.achieveMilestone({
          type: 'achievement',
          domain,
          name: result.milestone.name,
          description: result.milestone.description,
          metadata: { type: 'innovator' },
        });
      }
    }

    // Check speed milestones
    if (skill.fastestResolution > 0 && skill.fastestResolution < 60) {
      const result = MilestoneManager.checkMilestone('fast_resolver', 1, existingMilestones);
      if (result.achieved && result.milestone) {
        this.achieveMilestone({
          type: 'achievement',
          domain,
          name: result.milestone.name,
          description: result.milestone.description,
          metadata: { type: 'fast_resolver', time: skill.fastestResolution },
        });
      }
    }
  }

  private analyzeTrends(snapshots: SkillHistorySnapshot[]): ProgressionAnalysis['recentTrends'] {
    if (snapshots.length < 2) {
      return {
        errorRateTrend: 'stable',
        velocityTrend: 'stable',
        patternRecognitionTrend: 'stable',
      };
    }

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];

    // Error rate trend
    let errorRateTrend: 'improving' | 'stable' | 'worsening' = 'stable';
    if (first.metrics.errorsPerDay && last.metrics.errorsPerDay) {
      const change = (last.metrics.errorsPerDay - first.metrics.errorsPerDay) / Math.max(0.1, first.metrics.errorsPerDay);
      if (change < -0.2) errorRateTrend = 'improving';
      else if (change > 0.2) errorRateTrend = 'worsening';
    }

    // Velocity trend
    let velocityTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (first.metrics.linesChangedPerSession && last.metrics.linesChangedPerSession) {
      const change = (last.metrics.linesChangedPerSession - first.metrics.linesChangedPerSession) / Math.max(1, first.metrics.linesChangedPerSession);
      if (change > 0.2) velocityTrend = 'increasing';
      else if (change < -0.2) velocityTrend = 'decreasing';
    }

    // Pattern recognition trend
    let patternRecognitionTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (first.metrics.patternRecognitionRate && last.metrics.patternRecognitionRate) {
      const change = (last.metrics.patternRecognitionRate - first.metrics.patternRecognitionRate) / Math.max(0.1, first.metrics.patternRecognitionRate);
      if (change > 0.2) patternRecognitionTrend = 'improving';
      else if (change < -0.2) patternRecognitionTrend = 'declining';
    }

    return {
      errorRateTrend,
      velocityTrend,
      patternRecognitionTrend,
    };
  }

  // ============================================
  // Data Conversion Helpers
  // ============================================

  private rowToSkillMetrics(row: any): SkillMetrics {
    return {
      domain: row.domain,
      totalErrors: row.total_errors,
      errorsPerHour: row.errors_per_hour,
      errorsPerDay: row.errors_per_day,
      avgTimeToResolution: row.avg_time_to_resolution,
      fastestResolution: row.fastest_resolution,
      slowestResolution: row.slowest_resolution,
      linesChangedPerSession: row.lines_changed_per_session,
      sessionsCount: row.sessions_count,
      totalLinesChanged: row.total_lines_changed,
      knownPatternsUsed: row.known_patterns_used,
      novelSolutionsCreated: row.novel_solutions_created,
      patternRecognitionRate: row.pattern_recognition_rate,
      successRate: row.success_rate,
      skillLevel: row.skill_level as SkillLevel,
      lastUpdated: row.last_updated,
      firstSeen: row.first_seen,
    };
  }

  private rowToMilestone(row: any): Milestone {
    return {
      id: row.id,
      type: row.type,
      domain: row.domain,
      name: row.name,
      description: row.description,
      achievedAt: row.achieved_at,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }

  private rowToHistorySnapshot(row: any): SkillHistorySnapshot {
    return {
      id: row.id,
      domain: row.domain,
      skillLevel: row.skill_level as SkillLevel,
      metrics: JSON.parse(row.metrics || '{}'),
      timestamp: row.timestamp,
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
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

let instance: SkillTracker | null = null;

export function getSkillTracker(dbPath?: string): SkillTracker {
  if (!instance) {
    instance = new SkillTracker(dbPath);
  }
  return instance;
}

export default SkillTracker;
