/**
 * GoalInference - Multi-level Goal Detection for ZOIX User Intelligence Layer
 *
 * Infers what the user is TRYING to accomplish at multiple levels:
 * - Immediate goals (next few minutes): "fix this error", "add this feature"
 * - Session goals (this session): "build login flow", "refactor auth"
 * - Project goals (this week): "ship MVP", "add payments"
 * - Career goals (long term): "become full-stack", "master AI", "start startup"
 *
 * Detects goals through:
 * - Git commit message analysis
 * - File change patterns
 * - Repeated attempts at same task
 * - Error patterns (learning signals)
 * - Cross-project trajectory analysis
 */

import { Memory, Interaction } from './Memory';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ============================================
// Types
// ============================================

export type GoalLevel = 'immediate' | 'session' | 'project' | 'career';

export interface InferredGoal {
  id: string;
  level: GoalLevel;
  description: string;
  confidence: number; // 0 to 1
  evidence: string[]; // Array of evidence supporting this goal
  progress: number; // 0 to 1 (estimated completion)
  firstDetected: number; // timestamp
  lastUpdated: number; // timestamp
  tags: string[]; // e.g., ['startup', 'mvp', 'learning', 'auth']
  relatedGoals: string[]; // IDs of related goals
  status: 'active' | 'completed' | 'abandoned';
}

export interface GoalProgress {
  id: string;
  goalId: string;
  timestamp: number;
  progressDelta: number; // Change in progress (-1 to 1)
  notes: string;
  evidence: string[];
}

export interface SessionContext {
  sessionId: string;
  projectId?: string;
  recentInteractions: Interaction[];
  filesChanged: string[];
  commandsRun: string[];
  errorsEncountered: string[];
  duration: number; // milliseconds
}

export interface CareerTrajectory {
  primaryFocus: string[]; // e.g., ["AI/ML", "Full-Stack", "Fintech"]
  emergingInterests: string[]; // New areas appearing recently
  skillProgression: {
    area: string;
    trend: 'learning' | 'maintaining' | 'mastering';
    confidence: number;
  }[];
  projectTypes: {
    type: string;
    count: number;
    recent: boolean;
  }[];
  careerDirection: string; // Inferred career goal
  confidence: number;
}

// ============================================
// Detection Patterns
// ============================================

interface GoalPattern {
  keywords: string[];
  level: GoalLevel;
  confidence: number;
  tags: string[];
}

// Immediate goal patterns (next few minutes)
const IMMEDIATE_PATTERNS: GoalPattern[] = [
  {
    keywords: ['fix error', 'fix bug', 'debug', 'broken', 'not working', 'failing test'],
    level: 'immediate',
    confidence: 0.9,
    tags: ['bugfix', 'debugging'],
  },
  {
    keywords: ['add button', 'add field', 'add validation', 'quick fix', 'small change'],
    level: 'immediate',
    confidence: 0.8,
    tags: ['feature', 'ui', 'quick-task'],
  },
  {
    keywords: ['update dependency', 'fix import', 'fix typo', 'correct'],
    level: 'immediate',
    confidence: 0.8,
    tags: ['maintenance', 'quick-fix'],
  },
];

// Session goal patterns (this session)
const SESSION_PATTERNS: GoalPattern[] = [
  {
    keywords: ['build login', 'implement auth', 'add authentication', 'user signup', 'login flow'],
    level: 'session',
    confidence: 0.85,
    tags: ['auth', 'feature', 'user-management'],
  },
  {
    keywords: ['refactor', 'cleanup', 'reorganize', 'improve structure', 'optimize'],
    level: 'session',
    confidence: 0.8,
    tags: ['refactor', 'code-quality'],
  },
  {
    keywords: ['add tests', 'write tests', 'test coverage', 'unit tests'],
    level: 'session',
    confidence: 0.85,
    tags: ['testing', 'quality'],
  },
  {
    keywords: ['add api endpoint', 'create route', 'implement endpoint', 'build api'],
    level: 'session',
    confidence: 0.85,
    tags: ['backend', 'api', 'feature'],
  },
];

// Project goal patterns (this week)
const PROJECT_PATTERNS: GoalPattern[] = [
  {
    keywords: ['ship mvp', 'launch', 'go live', 'release', 'deploy to production'],
    level: 'project',
    confidence: 0.9,
    tags: ['startup', 'mvp', 'launch'],
  },
  {
    keywords: ['add payments', 'integrate stripe', 'payment processing', 'billing', 'subscription'],
    level: 'project',
    confidence: 0.9,
    tags: ['payments', 'monetization', 'feature'],
  },
  {
    keywords: ['complete feature', 'finish module', 'ship feature', 'complete milestone'],
    level: 'project',
    confidence: 0.85,
    tags: ['feature', 'milestone'],
  },
  {
    keywords: ['database migration', 'schema update', 'migrate to', 'upgrade'],
    level: 'project',
    confidence: 0.8,
    tags: ['migration', 'infrastructure'],
  },
];

// Career goal patterns (long term)
const CAREER_PATTERNS: GoalPattern[] = [
  {
    keywords: ['become full-stack', 'learn full stack', 'master full stack', 'full stack developer'],
    level: 'career',
    confidence: 0.9,
    tags: ['career', 'learning', 'full-stack'],
  },
  {
    keywords: ['master ai', 'learn machine learning', 'become ai engineer', 'ml engineer'],
    level: 'career',
    confidence: 0.9,
    tags: ['career', 'learning', 'ai-ml'],
  },
  {
    keywords: ['start startup', 'launch company', 'build saas', 'entrepreneurship'],
    level: 'career',
    confidence: 0.95,
    tags: ['career', 'startup', 'entrepreneur'],
  },
  {
    keywords: ['learn new framework', 'master', 'become expert', 'deep dive into'],
    level: 'career',
    confidence: 0.7,
    tags: ['career', 'learning', 'skill-building'],
  },
  {
    keywords: ['portfolio project', 'showcase', 'demonstrate skills', 'job search'],
    level: 'career',
    confidence: 0.85,
    tags: ['career', 'portfolio', 'job-search'],
  },
];

const ALL_PATTERNS = [
  ...IMMEDIATE_PATTERNS,
  ...SESSION_PATTERNS,
  ...PROJECT_PATTERNS,
  ...CAREER_PATTERNS,
];

// ============================================
// GoalInference Class
// ============================================

export class GoalInference {
  private memory: Memory;

  constructor(memory: Memory) {
    this.memory = memory;
    this.initializeDatabase();
    console.log('[GoalInference] Initialized');
  }

  private initializeDatabase(): void {
    const db = (this.memory as any).db;

    db.exec(`
      -- Goals table with 4-level hierarchy
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        description TEXT NOT NULL,
        confidence REAL DEFAULT 0.5,
        evidence TEXT DEFAULT '[]',
        progress REAL DEFAULT 0.0,
        first_detected INTEGER NOT NULL,
        last_updated INTEGER NOT NULL,
        tags TEXT DEFAULT '[]',
        related_goals TEXT DEFAULT '[]',
        status TEXT DEFAULT 'active'
      );

      -- Goal progress tracking
      CREATE TABLE IF NOT EXISTS goal_progress (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        progress_delta REAL NOT NULL,
        notes TEXT,
        evidence TEXT DEFAULT '[]',
        FOREIGN KEY (goal_id) REFERENCES goals(id)
      );

      -- File change patterns for goal detection
      CREATE TABLE IF NOT EXISTS file_change_patterns (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        change_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        session_id TEXT,
        inferred_intent TEXT,
        related_goal_id TEXT
      );

      -- Career trajectory tracking
      CREATE TABLE IF NOT EXISTS career_trajectory (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT 'default',
        focus_areas TEXT DEFAULT '[]',
        emerging_interests TEXT DEFAULT '[]',
        skill_progression TEXT DEFAULT '[]',
        project_types TEXT DEFAULT '[]',
        career_direction TEXT,
        confidence REAL DEFAULT 0.5,
        last_updated INTEGER NOT NULL
      );

      -- Indexes for fast lookups
      CREATE INDEX IF NOT EXISTS idx_goals_level ON goals(level);
      CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
      CREATE INDEX IF NOT EXISTS idx_goals_confidence ON goals(confidence);
      CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id);
      CREATE INDEX IF NOT EXISTS idx_goal_progress_timestamp ON goal_progress(timestamp);
      CREATE INDEX IF NOT EXISTS idx_file_changes_session ON file_change_patterns(session_id);
      CREATE INDEX IF NOT EXISTS idx_file_changes_timestamp ON file_change_patterns(timestamp);
    `);

    console.log('[GoalInference] Database tables initialized');
  }

  // ============================================
  // Goal Inference Methods
  // ============================================

  /**
   * Infer immediate goal from current session context
   * (next few minutes: "fix this error", "add this feature")
   */
  inferImmediateGoal(sessionContext: SessionContext): InferredGoal | null {
    const evidence: string[] = [];
    let description = '';
    let confidence = 0;
    const tags: string[] = ['immediate'];

    // Analyze recent errors - strong signal for immediate debugging goal
    if (sessionContext.errorsEncountered.length > 0) {
      const latestError = sessionContext.errorsEncountered[sessionContext.errorsEncountered.length - 1];
      description = `Fix error: ${latestError.substring(0, 100)}`;
      evidence.push(`Recent error encountered: ${latestError.substring(0, 100)}`);
      confidence = 0.9;
      tags.push('bugfix', 'debugging');
    }
    // Analyze recent file changes for quick feature additions
    else if (sessionContext.filesChanged.length > 0 && sessionContext.duration < 600000) {
      const recentFile = sessionContext.filesChanged[sessionContext.filesChanged.length - 1];
      description = `Quick change to ${path.basename(recentFile)}`;
      evidence.push(`Modified ${recentFile} recently`);
      confidence = 0.7;
      tags.push('quick-task');
    }
    // Check recent interactions for immediate intent
    else if (sessionContext.recentInteractions.length > 0) {
      const latestInteraction = sessionContext.recentInteractions[sessionContext.recentInteractions.length - 1];
      const detectedPattern = this.detectPatternInText(latestInteraction.prompt, IMMEDIATE_PATTERNS);

      if (detectedPattern) {
        description = this.extractGoalFromText(latestInteraction.prompt);
        evidence.push(`User prompt: "${latestInteraction.prompt.substring(0, 100)}"`);
        confidence = detectedPattern.confidence;
        tags.push(...detectedPattern.tags);
      }
    }

    if (confidence > 0.5) {
      return this.createGoal('immediate', description, confidence, evidence, tags);
    }

    return null;
  }

  /**
   * Infer session goal from current session
   * (this session: "build login flow", "refactor auth")
   */
  inferSessionGoal(sessionId: string): InferredGoal | null {
    const interactions = this.memory.getInteractionsBySession(sessionId);
    if (interactions.length === 0) return null;

    const evidence: string[] = [];
    const tags: string[] = ['session'];

    // Combine all prompts to find patterns
    const allText = interactions.map(i => i.prompt).join(' ');
    const filesAffected = new Set<string>();
    interactions.forEach(i => i.filesAffected.forEach(f => filesAffected.add(f)));

    // Detect session-level patterns
    const detectedPattern = this.detectPatternInText(allText, SESSION_PATTERNS);

    if (detectedPattern) {
      const description = this.extractGoalFromText(allText);
      evidence.push(`${interactions.length} interactions in session`);
      evidence.push(`Files affected: ${Array.from(filesAffected).slice(0, 3).join(', ')}`);
      tags.push(...detectedPattern.tags);

      return this.createGoal('session', description, detectedPattern.confidence, evidence, tags);
    }

    // Fallback: infer from file changes
    if (filesAffected.size > 0) {
      const filePatternGoal = this.inferGoalFromFileChanges(Array.from(filesAffected));
      if (filePatternGoal) {
        return { ...filePatternGoal, level: 'session' };
      }
    }

    return null;
  }

  /**
   * Infer project goal from project activity
   * (this week: "ship MVP", "add payments")
   */
  inferProjectGoal(projectPath: string): InferredGoal | null {
    // Extract project ID from path
    const projectId = this.getProjectIdFromPath(projectPath);
    const interactions = this.memory.getInteractionsByProject(projectId);

    if (interactions.length === 0) {
      // Try to infer from git commits
      return this.inferGoalFromGitHistory(projectPath);
    }

    const evidence: string[] = [];
    const tags: string[] = ['project'];

    // Analyze last 7 days of activity
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentInteractions = interactions.filter(i => i.timestamp > weekAgo);

    const allText = recentInteractions.map(i => i.prompt + ' ' + i.response).join(' ');

    // Detect project-level patterns
    const detectedPattern = this.detectPatternInText(allText, PROJECT_PATTERNS);

    if (detectedPattern) {
      const description = this.extractGoalFromText(allText);
      evidence.push(`${recentInteractions.length} interactions in last week`);
      evidence.push(`Project: ${projectId}`);
      tags.push(...detectedPattern.tags);

      return this.createGoal('project', description, detectedPattern.confidence, evidence, tags);
    }

    // Try git commits
    return this.inferGoalFromGitHistory(projectPath);
  }

  /**
   * Infer career trajectory from all projects and activity
   * (long term: "become full-stack", "master AI", "start startup")
   */
  inferCareerTrajectory(): CareerTrajectory {
    const allInteractions = this.memory.getRecentInteractions(1000);
    const evidence: string[] = [];

    // Analyze all interactions for career signals
    const allText = allInteractions.map(i => i.prompt + ' ' + i.response).join(' ');

    // Detect technology focus areas
    const techFocus = this.detectTechnologyFocus(allInteractions);

    // Detect emerging interests (new in last 30 days)
    const emergingInterests = this.detectEmergingInterests(allInteractions);

    // Analyze skill progression
    const skillProgression = this.analyzeSkillProgression(allInteractions);

    // Detect project types
    const projectTypes = this.analyzeProjectTypes(allInteractions);

    // Infer overall career direction
    const careerDirection = this.inferCareerDirection(
      techFocus,
      emergingInterests,
      projectTypes
    );

    const trajectory: CareerTrajectory = {
      primaryFocus: techFocus.slice(0, 3),
      emergingInterests: emergingInterests.slice(0, 3),
      skillProgression,
      projectTypes,
      careerDirection,
      confidence: this.calculateCareerConfidence(allInteractions.length),
    };

    // Save to database
    this.saveCareerTrajectory(trajectory);

    return trajectory;
  }

  /**
   * Record an explicitly stated goal from the user
   */
  recordExplicitGoal(description: string, level: GoalLevel, tags: string[] = []): string {
    const goal = this.createGoal(level, description, 1.0, ['Explicitly stated by user'], tags);
    this.saveGoal(goal);
    return goal.id;
  }

  /**
   * Get progress for a specific goal
   */
  getGoalProgress(goalId: string): GoalProgress[] {
    const db = (this.memory as any).db;
    const rows = db.prepare(`
      SELECT * FROM goal_progress
      WHERE goal_id = ?
      ORDER BY timestamp DESC
      LIMIT 50
    `).all(goalId) as any[];

    return rows.map(this.rowToProgress);
  }

  /**
   * Get all active goals
   */
  getActiveGoals(): InferredGoal[] {
    const db = (this.memory as any).db;
    const rows = db.prepare(`
      SELECT * FROM goals
      WHERE status = 'active'
      ORDER BY level DESC, confidence DESC
    `).all() as any[];

    return rows.map(this.rowToGoal);
  }

  /**
   * Get completed goals
   */
  getCompletedGoals(): InferredGoal[] {
    const db = (this.memory as any).db;
    const rows = db.prepare(`
      SELECT * FROM goals
      WHERE status = 'completed'
      ORDER BY last_updated DESC
      LIMIT 50
    `).all() as any[];

    return rows.map(this.rowToGoal);
  }

  /**
   * Mark a goal as complete
   */
  completeGoal(goalId: string, notes?: string): void {
    const db = (this.memory as any).db;
    const goal = this.getGoal(goalId);

    if (goal) {
      db.prepare(`
        UPDATE goals
        SET status = 'completed', progress = 1.0, last_updated = ?
        WHERE id = ?
      `).run(Date.now(), goalId);

      // Record progress
      this.recordProgress(goalId, 1.0 - goal.progress, notes || 'Goal completed', []);

      console.log(`[GoalInference] Goal completed: ${goal.description}`);
    }
  }

  /**
   * Update goal progress
   */
  updateGoalProgress(goalId: string, progressDelta: number, notes: string, evidence: string[]): void {
    this.recordProgress(goalId, progressDelta, notes, evidence);

    const goal = this.getGoal(goalId);
    if (goal) {
      goal.progress = Math.min(1.0, goal.progress + progressDelta);
      goal.lastUpdated = Date.now();
      this.updateGoal(goal);
    }
  }

  // ============================================
  // Git Analysis Methods
  // ============================================

  /**
   * Analyze git commits to infer project goals
   */
  private inferGoalFromGitHistory(projectPath: string): InferredGoal | null {
    try {
      // Get last 20 commits
      const commits = execSync('git log -20 --oneline --pretty=format:"%s"', {
        cwd: projectPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).split('\n').filter(Boolean);

      if (commits.length === 0) return null;

      const allCommits = commits.join(' ');
      const evidence = commits.slice(0, 5);

      // Detect patterns in commit messages
      const detectedPattern = this.detectPatternInText(allCommits, PROJECT_PATTERNS);

      if (detectedPattern) {
        const description = this.extractGoalFromCommits(commits);
        return this.createGoal('project', description, detectedPattern.confidence, evidence, detectedPattern.tags);
      }

      // Fallback: create generic goal from commit activity
      const description = `Working on ${this.summarizeCommitActivity(commits)}`;
      return this.createGoal('project', description, 0.6, evidence, ['git', 'development']);
    } catch (error) {
      // Not a git repo or git not available
      return null;
    }
  }

  /**
   * Extract meaningful goal from commit messages
   */
  private extractGoalFromCommits(commits: string[]): string {
    // Look for common patterns
    const featureCommits = commits.filter(c => c.toLowerCase().includes('add') || c.toLowerCase().includes('implement'));
    const fixCommits = commits.filter(c => c.toLowerCase().includes('fix') || c.toLowerCase().includes('bug'));
    const refactorCommits = commits.filter(c => c.toLowerCase().includes('refactor') || c.toLowerCase().includes('improve'));

    if (featureCommits.length > commits.length / 2) {
      return `Building new features (${featureCommits.length} commits)`;
    } else if (fixCommits.length > commits.length / 2) {
      return `Fixing bugs and issues (${fixCommits.length} commits)`;
    } else if (refactorCommits.length > commits.length / 2) {
      return `Refactoring and improving code (${refactorCommits.length} commits)`;
    }

    // Use most recent commit as primary goal
    return commits[0];
  }

  /**
   * Summarize commit activity into a goal description
   */
  private summarizeCommitActivity(commits: string[]): string {
    const words = commits.join(' ').toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();

    // Count significant words (ignore common words)
    const ignoreWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    words.forEach(word => {
      if (word.length > 3 && !ignoreWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });

    // Get top 2 words
    const topWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([word]) => word);

    return topWords.length > 0 ? topWords.join(' and ') : 'project development';
  }

  // ============================================
  // File Change Analysis
  // ============================================

  /**
   * Infer goal from file change patterns
   */
  private inferGoalFromFileChanges(files: string[]): InferredGoal | null {
    const evidence: string[] = files.slice(0, 3);
    const tags: string[] = [];

    // Detect patterns in file paths
    const hasTests = files.some(f => f.includes('test') || f.includes('spec'));
    const hasComponents = files.some(f => f.includes('component') || f.includes('ui'));
    const hasBackend = files.some(f => f.includes('api') || f.includes('server') || f.includes('controller'));
    const hasAuth = files.some(f => f.includes('auth') || f.includes('login') || f.includes('user'));

    let description = '';
    let confidence = 0.7;

    if (hasAuth) {
      description = 'Implementing authentication system';
      tags.push('auth', 'user-management');
      confidence = 0.85;
    } else if (hasTests) {
      description = 'Adding test coverage';
      tags.push('testing', 'quality');
      confidence = 0.8;
    } else if (hasComponents && hasBackend) {
      description = 'Building full-stack feature';
      tags.push('full-stack', 'feature');
      confidence = 0.75;
    } else if (hasComponents) {
      description = 'Building UI components';
      tags.push('ui', 'frontend');
    } else if (hasBackend) {
      description = 'Building API endpoints';
      tags.push('backend', 'api');
    } else {
      description = `Working on ${files.length} files`;
      confidence = 0.6;
    }

    return this.createGoal('session', description, confidence, evidence, tags);
  }

  /**
   * Track file changes for pattern detection
   */
  recordFileChange(filePath: string, changeType: 'created' | 'modified' | 'deleted', sessionId: string): void {
    const db = (this.memory as any).db;
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO file_change_patterns (
        id, file_path, change_type, timestamp, session_id
      ) VALUES (?, ?, ?, ?, ?)
    `).run(id, filePath, changeType, Date.now(), sessionId);
  }

  // ============================================
  // Career Trajectory Analysis
  // ============================================

  /**
   * Detect primary technology focus areas
   */
  private detectTechnologyFocus(interactions: Interaction[]): string[] {
    const techKeywords = {
      'AI/ML': ['machine learning', 'ai', 'neural network', 'llm', 'gpt', 'claude', 'pytorch', 'tensorflow'],
      'Full-Stack': ['full stack', 'frontend', 'backend', 'react', 'node', 'api'],
      'Mobile': ['ios', 'android', 'react native', 'flutter', 'mobile'],
      'DevOps': ['docker', 'kubernetes', 'ci/cd', 'deployment', 'cloud'],
      'Data Science': ['data analysis', 'pandas', 'numpy', 'visualization', 'statistics'],
      'Blockchain': ['blockchain', 'web3', 'smart contract', 'ethereum', 'solidity'],
      'Security': ['security', 'authentication', 'encryption', 'vulnerability'],
      'Fintech': ['payment', 'stripe', 'finance', 'trading', 'banking'],
    };

    const scores = new Map<string, number>();
    const allText = interactions.map(i => i.prompt + ' ' + i.response).join(' ').toLowerCase();

    for (const [area, keywords] of Object.entries(techKeywords)) {
      let score = 0;
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = allText.match(regex);
        if (matches) score += matches.length;
      }
      if (score > 0) scores.set(area, score);
    }

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([area]) => area);
  }

  /**
   * Detect emerging interests (new topics in last 30 days)
   */
  private detectEmergingInterests(interactions: Interaction[]): string[] {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentInteractions = interactions.filter(i => i.timestamp > thirtyDaysAgo);
    const olderInteractions = interactions.filter(i => i.timestamp <= thirtyDaysAgo);

    const recentTopics = this.detectTechnologyFocus(recentInteractions);
    const olderTopics = this.detectTechnologyFocus(olderInteractions);

    // Find topics in recent but not in older
    return recentTopics.filter(topic => !olderTopics.includes(topic));
  }

  /**
   * Analyze skill progression for different areas
   */
  private analyzeSkillProgression(interactions: Interaction[]): CareerTrajectory['skillProgression'] {
    const focusAreas = this.detectTechnologyFocus(interactions);
    const progression: CareerTrajectory['skillProgression'] = [];

    for (const area of focusAreas) {
      const areaInteractions = interactions.filter(i => {
        const text = (i.prompt + ' ' + i.response).toLowerCase();
        return text.includes(area.toLowerCase());
      });

      if (areaInteractions.length === 0) continue;

      // Analyze error rate trend
      const errorRate = areaInteractions.filter(i => i.outcome === 'failure').length / areaInteractions.length;

      // Analyze recency
      const avgTimestamp = areaInteractions.reduce((sum, i) => sum + i.timestamp, 0) / areaInteractions.length;
      const isRecent = avgTimestamp > (Date.now() - 60 * 24 * 60 * 60 * 1000);

      let trend: 'learning' | 'maintaining' | 'mastering';
      if (errorRate > 0.4 && isRecent) {
        trend = 'learning';
      } else if (errorRate < 0.2 && areaInteractions.length > 20) {
        trend = 'mastering';
      } else {
        trend = 'maintaining';
      }

      progression.push({
        area,
        trend,
        confidence: Math.min(1.0, areaInteractions.length / 50),
      });
    }

    return progression;
  }

  /**
   * Analyze types of projects being worked on
   */
  private analyzeProjectTypes(interactions: Interaction[]): CareerTrajectory['projectTypes'] {
    const projectKeywords = {
      'SaaS Product': ['saas', 'subscription', 'multi-tenant', 'billing'],
      'Startup MVP': ['mvp', 'minimum viable', 'launch', 'startup'],
      'Enterprise App': ['enterprise', 'large scale', 'corporate', 'b2b'],
      'Personal Project': ['portfolio', 'learning', 'experiment', 'side project'],
      'Open Source': ['open source', 'github', 'contribution', 'oss'],
      'Client Work': ['client', 'freelance', 'contract', 'consulting'],
    };

    const types: CareerTrajectory['projectTypes'] = [];
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const allText = interactions.map(i => i.prompt + ' ' + i.response).join(' ').toLowerCase();

    for (const [type, keywords] of Object.entries(projectKeywords)) {
      let count = 0;
      let recentCount = 0;

      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = allText.match(regex);
        if (matches) count += matches.length;

        // Check recent
        const recentText = interactions
          .filter(i => i.timestamp > thirtyDaysAgo)
          .map(i => i.prompt + ' ' + i.response)
          .join(' ')
          .toLowerCase();
        const recentMatches = recentText.match(regex);
        if (recentMatches) recentCount += recentMatches.length;
      }

      if (count > 0) {
        types.push({
          type,
          count,
          recent: recentCount > 0,
        });
      }
    }

    return types.sort((a, b) => b.count - a.count);
  }

  /**
   * Infer overall career direction
   */
  private inferCareerDirection(
    focus: string[],
    emerging: string[],
    projectTypes: CareerTrajectory['projectTypes']
  ): string {
    // Check for startup signals
    const hasStartupProject = projectTypes.some(p => p.type.includes('Startup') || p.type.includes('SaaS'));

    // Check for learning signals
    const isLearningAI = focus.includes('AI/ML') || emerging.includes('AI/ML');
    const isLearningFullStack = focus.includes('Full-Stack') || emerging.includes('Full-Stack');

    if (hasStartupProject && focus.length > 0) {
      return `Building a startup in ${focus[0]}`;
    } else if (isLearningAI) {
      return 'Transitioning to AI/ML engineering';
    } else if (isLearningFullStack) {
      return 'Becoming a full-stack developer';
    } else if (focus.length > 0) {
      return `Mastering ${focus[0]} development`;
    }

    return 'Exploring different technologies';
  }

  /**
   * Calculate confidence in career trajectory assessment
   */
  private calculateCareerConfidence(interactionCount: number): number {
    // More interactions = higher confidence
    return Math.min(1.0, interactionCount / 500);
  }

  /**
   * Save career trajectory to database
   */
  private saveCareerTrajectory(trajectory: CareerTrajectory): void {
    const db = (this.memory as any).db;
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT OR REPLACE INTO career_trajectory (
        id, user_id, focus_areas, emerging_interests, skill_progression,
        project_types, career_direction, confidence, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      'default',
      JSON.stringify(trajectory.primaryFocus),
      JSON.stringify(trajectory.emergingInterests),
      JSON.stringify(trajectory.skillProgression),
      JSON.stringify(trajectory.projectTypes),
      trajectory.careerDirection,
      trajectory.confidence,
      Date.now()
    );
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Detect pattern in text
   */
  private detectPatternInText(text: string, patterns: GoalPattern[]): GoalPattern | null {
    const lowerText = text.toLowerCase();
    let bestMatch: GoalPattern | null = null;
    let bestScore = 0;

    for (const pattern of patterns) {
      let score = 0;
      for (const keyword of pattern.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          score++;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = pattern;
      }
    }

    return bestScore > 0 ? bestMatch : null;
  }

  /**
   * Extract goal description from text
   */
  private extractGoalFromText(text: string): string {
    // Simple extraction: take first sentence or 100 chars
    const sentences = text.split(/[.!?]/);
    const firstSentence = sentences[0]?.trim() || text.substring(0, 100);
    return firstSentence.length > 100 ? firstSentence.substring(0, 100) + '...' : firstSentence;
  }

  /**
   * Create a goal object
   */
  private createGoal(
    level: GoalLevel,
    description: string,
    confidence: number,
    evidence: string[],
    tags: string[]
  ): InferredGoal {
    return {
      id: crypto.randomUUID(),
      level,
      description,
      confidence,
      evidence,
      progress: 0,
      firstDetected: Date.now(),
      lastUpdated: Date.now(),
      tags,
      relatedGoals: [],
      status: 'active',
    };
  }

  /**
   * Get project ID from path
   */
  private getProjectIdFromPath(projectPath: string): string {
    return path.basename(projectPath);
  }

  // ============================================
  // Database Operations
  // ============================================

  private saveGoal(goal: InferredGoal): void {
    const db = (this.memory as any).db;
    db.prepare(`
      INSERT INTO goals (
        id, level, description, confidence, evidence, progress,
        first_detected, last_updated, tags, related_goals, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      goal.id,
      goal.level,
      goal.description,
      goal.confidence,
      JSON.stringify(goal.evidence),
      goal.progress,
      goal.firstDetected,
      goal.lastUpdated,
      JSON.stringify(goal.tags),
      JSON.stringify(goal.relatedGoals),
      goal.status
    );
  }

  private updateGoal(goal: InferredGoal): void {
    const db = (this.memory as any).db;
    db.prepare(`
      UPDATE goals
      SET confidence = ?, evidence = ?, progress = ?, last_updated = ?,
          tags = ?, related_goals = ?, status = ?
      WHERE id = ?
    `).run(
      goal.confidence,
      JSON.stringify(goal.evidence),
      goal.progress,
      goal.lastUpdated,
      JSON.stringify(goal.tags),
      JSON.stringify(goal.relatedGoals),
      goal.status,
      goal.id
    );
  }

  private getGoal(id: string): InferredGoal | null {
    const db = (this.memory as any).db;
    const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as any;
    return row ? this.rowToGoal(row) : null;
  }

  private recordProgress(goalId: string, progressDelta: number, notes: string, evidence: string[]): void {
    const db = (this.memory as any).db;
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO goal_progress (
        id, goal_id, timestamp, progress_delta, notes, evidence
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      goalId,
      Date.now(),
      progressDelta,
      notes,
      JSON.stringify(evidence)
    );
  }

  private rowToGoal(row: any): InferredGoal {
    return {
      id: row.id,
      level: row.level,
      description: row.description,
      confidence: row.confidence,
      evidence: JSON.parse(row.evidence || '[]'),
      progress: row.progress,
      firstDetected: row.first_detected,
      lastUpdated: row.last_updated,
      tags: JSON.parse(row.tags || '[]'),
      relatedGoals: JSON.parse(row.related_goals || '[]'),
      status: row.status,
    };
  }

  private rowToProgress(row: any): GoalProgress {
    return {
      id: row.id,
      goalId: row.goal_id,
      timestamp: row.timestamp,
      progressDelta: row.progress_delta,
      notes: row.notes,
      evidence: JSON.parse(row.evidence || '[]'),
    };
  }
}

export default GoalInference;
