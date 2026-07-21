/**
 * ContextMemory - Long-term context and memory tracking for ZOIX
 *
 * Provides comprehensive tracking of:
 * - Session summaries and accomplishments
 * - Daily and weekly work digests
 * - Project timelines and progress
 * - Unfinished tasks and context restoration
 * - Inferred goals from user patterns
 *
 * This service helps users recall what they were working on and
 * provides intelligent context when returning to projects.
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import * as crypto from 'crypto';

// ============================================
// Data Types
// ============================================

export interface SessionSummary {
  id: string;
  sessionId: string;
  sessionName: string;
  projectId: string | null;
  startTime: number;
  endTime: number | null;
  duration: number; // in milliseconds
  summary: string;
  keyAccomplishments: string[];
  unfinishedItems: string[];
  filesModified: string[];
  commandsRun: string[];
  errorsEncountered: string[];
  timestamp: number;
}

export interface DailyDigest {
  id: string;
  date: string; // YYYY-MM-DD format
  summary: string;
  projectsTouched: string[];
  hoursActive: number;
  keyEvents: string[];
  sessionsCount: number;
  filesModifiedCount: number;
  commandsRunCount: number;
  timestamp: number;
}

export interface ProjectContext {
  id: string;
  projectId: string;
  projectName: string;
  lastActivity: number;
  currentFocus: string;
  pendingTasks: string[];
  recentFiles: string[];
  recentCommands: string[];
  notes: string;
  tags: string[];
  progressIndicators: {
    filesModified: number;
    sessionsCount: number;
    totalHours: number;
    lastUpdated: number;
  };
}

export interface InferredGoal {
  id: string;
  description: string;
  category: 'feature' | 'bugfix' | 'refactor' | 'learning' | 'research' | 'deployment' | 'other';
  progress: number; // 0-100
  evidence: string[]; // What made us infer this goal
  relatedProjects: string[];
  relatedSessions: string[];
  firstDetected: number;
  lastUpdated: number;
  status: 'active' | 'completed' | 'abandoned' | 'on-hold';
  confidence: number; // 0-1
}

export interface UnfinishedTask {
  id: string;
  sessionId: string;
  projectId: string | null;
  description: string;
  context: string;
  priority: 'low' | 'medium' | 'high';
  inferredFrom: 'error' | 'incomplete-command' | 'user-pattern' | 'explicit';
  createdAt: number;
  lastSeen: number;
  relatedFiles: string[];
  status: 'pending' | 'completed' | 'abandoned';
}

export interface WeeklyTheme {
  id: string;
  weekStart: string; // YYYY-MM-DD format (Monday)
  weekEnd: string; // YYYY-MM-DD format (Sunday)
  themes: string[]; // Main focus areas
  projectsWorkedOn: string[];
  totalHours: number;
  topAccomplishments: string[];
  challengesFaced: string[];
  goalsProgressed: string[];
  timestamp: number;
}

export interface ContextRestoration {
  sessionId: string;
  projectId: string | null;
  lastContext: {
    summary: string;
    lastFiles: string[];
    lastCommands: string[];
    pendingTasks: UnfinishedTask[];
    suggestedNextSteps: string[];
  };
  relevantGoals: InferredGoal[];
  recentActivity: SessionSummary[];
}

// ============================================
// ContextMemory Class
// ============================================

export class ContextMemory {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    // Store in user data directory
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'zoix-context-memory.db');
    this.db = new Database(this.dbPath);
    this.initialize();
  }

  private initialize(): void {
    // Enable WAL mode for better concurrent performance
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.db.exec(`
      -- Session summaries table
      CREATE TABLE IF NOT EXISTS session_summaries (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        session_name TEXT NOT NULL,
        project_id TEXT,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration INTEGER DEFAULT 0,
        summary TEXT DEFAULT '',
        key_accomplishments TEXT DEFAULT '[]',
        unfinished_items TEXT DEFAULT '[]',
        files_modified TEXT DEFAULT '[]',
        commands_run TEXT DEFAULT '[]',
        errors_encountered TEXT DEFAULT '[]',
        timestamp INTEGER NOT NULL
      );

      -- Daily digests table
      CREATE TABLE IF NOT EXISTS daily_digests (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        summary TEXT DEFAULT '',
        projects_touched TEXT DEFAULT '[]',
        hours_active REAL DEFAULT 0,
        key_events TEXT DEFAULT '[]',
        sessions_count INTEGER DEFAULT 0,
        files_modified_count INTEGER DEFAULT 0,
        commands_run_count INTEGER DEFAULT 0,
        timestamp INTEGER NOT NULL
      );

      -- Project context table
      CREATE TABLE IF NOT EXISTS project_context (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL UNIQUE,
        project_name TEXT NOT NULL,
        last_activity INTEGER NOT NULL,
        current_focus TEXT DEFAULT '',
        pending_tasks TEXT DEFAULT '[]',
        recent_files TEXT DEFAULT '[]',
        recent_commands TEXT DEFAULT '[]',
        notes TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        progress_indicators TEXT DEFAULT '{}',
        timestamp INTEGER NOT NULL
      );

      -- Inferred goals table
      CREATE TABLE IF NOT EXISTS inferred_goals (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        category TEXT DEFAULT 'other',
        progress INTEGER DEFAULT 0,
        evidence TEXT DEFAULT '[]',
        related_projects TEXT DEFAULT '[]',
        related_sessions TEXT DEFAULT '[]',
        first_detected INTEGER NOT NULL,
        last_updated INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        confidence REAL DEFAULT 0.5
      );

      -- Unfinished tasks table
      CREATE TABLE IF NOT EXISTS unfinished_tasks (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        project_id TEXT,
        description TEXT NOT NULL,
        context TEXT DEFAULT '',
        priority TEXT DEFAULT 'medium',
        inferred_from TEXT DEFAULT 'user-pattern',
        created_at INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        related_files TEXT DEFAULT '[]',
        status TEXT DEFAULT 'pending'
      );

      -- Weekly themes table
      CREATE TABLE IF NOT EXISTS weekly_themes (
        id TEXT PRIMARY KEY,
        week_start TEXT NOT NULL,
        week_end TEXT NOT NULL,
        themes TEXT DEFAULT '[]',
        projects_worked_on TEXT DEFAULT '[]',
        total_hours REAL DEFAULT 0,
        top_accomplishments TEXT DEFAULT '[]',
        challenges_faced TEXT DEFAULT '[]',
        goals_progressed TEXT DEFAULT '[]',
        timestamp INTEGER NOT NULL,
        UNIQUE(week_start, week_end)
      );

      -- Create indexes for fast lookups
      CREATE INDEX IF NOT EXISTS idx_session_summaries_session_id ON session_summaries(session_id);
      CREATE INDEX IF NOT EXISTS idx_session_summaries_project_id ON session_summaries(project_id);
      CREATE INDEX IF NOT EXISTS idx_session_summaries_start_time ON session_summaries(start_time);
      CREATE INDEX IF NOT EXISTS idx_daily_digests_date ON daily_digests(date);
      CREATE INDEX IF NOT EXISTS idx_project_context_last_activity ON project_context(last_activity);
      CREATE INDEX IF NOT EXISTS idx_inferred_goals_status ON inferred_goals(status);
      CREATE INDEX IF NOT EXISTS idx_inferred_goals_last_updated ON inferred_goals(last_updated);
      CREATE INDEX IF NOT EXISTS idx_unfinished_tasks_session_id ON unfinished_tasks(session_id);
      CREATE INDEX IF NOT EXISTS idx_unfinished_tasks_status ON unfinished_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_weekly_themes_week_start ON weekly_themes(week_start);
    `);

    console.log('[ContextMemory] Database initialized at:', this.dbPath);
  }

  // ============================================
  // Session Summary Methods
  // ============================================

  startSession(sessionId: string, sessionName: string, projectId?: string): string {
    const id = crypto.randomUUID();
    const now = Date.now();

    this.db.prepare(`
      INSERT INTO session_summaries (
        id, session_id, session_name, project_id, start_time, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, sessionId, sessionName, projectId || null, now, now);

    return id;
  }

  /**
   * Convenience alias for startSession
   */
  recordSessionStart(sessionId: string, projectPath: string, sessionName?: string): string {
    const projectId = this.hashProjectPath(projectPath);
    return this.startSession(sessionId, sessionName || 'Unnamed Session', projectId);
  }

  endSession(sessionId: string, summary?: Partial<SessionSummary>): void {
    const now = Date.now();
    const existing = this.db.prepare(`
      SELECT id, start_time FROM session_summaries
      WHERE session_id = ? AND end_time IS NULL
      ORDER BY start_time DESC LIMIT 1
    `).get(sessionId) as any;

    if (existing) {
      const duration = now - existing.start_time;

      this.db.prepare(`
        UPDATE session_summaries
        SET end_time = ?, duration = ?, summary = ?,
            key_accomplishments = ?, unfinished_items = ?,
            files_modified = ?, commands_run = ?, errors_encountered = ?
        WHERE id = ?
      `).run(
        now,
        duration,
        summary?.summary || '',
        JSON.stringify(summary?.keyAccomplishments || []),
        JSON.stringify(summary?.unfinishedItems || []),
        JSON.stringify(summary?.filesModified || []),
        JSON.stringify(summary?.commandsRun || []),
        JSON.stringify(summary?.errorsEncountered || []),
        existing.id
      );

      // Update daily digest
      this.updateDailyDigest(now);
    }
  }

  /**
   * Convenience alias for endSession
   */
  recordSessionEnd(sessionId: string, summary: string | Partial<SessionSummary>): void {
    if (typeof summary === 'string') {
      this.endSession(sessionId, { summary });
    } else {
      this.endSession(sessionId, summary);
    }
  }

  getSessionSummary(sessionId: string): SessionSummary | null {
    const row = this.db.prepare(`
      SELECT * FROM session_summaries
      WHERE session_id = ?
      ORDER BY start_time DESC LIMIT 1
    `).get(sessionId) as any;

    return row ? this.rowToSessionSummary(row) : null;
  }

  getRecentSessions(limit: number = 10): SessionSummary[] {
    const rows = this.db.prepare(`
      SELECT * FROM session_summaries
      ORDER BY start_time DESC LIMIT ?
    `).all(limit) as any[];

    return rows.map(this.rowToSessionSummary);
  }

  private rowToSessionSummary(row: any): SessionSummary {
    return {
      id: row.id,
      sessionId: row.session_id,
      sessionName: row.session_name,
      projectId: row.project_id,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      summary: row.summary,
      keyAccomplishments: JSON.parse(row.key_accomplishments || '[]'),
      unfinishedItems: JSON.parse(row.unfinished_items || '[]'),
      filesModified: JSON.parse(row.files_modified || '[]'),
      commandsRun: JSON.parse(row.commands_run || '[]'),
      errorsEncountered: JSON.parse(row.errors_encountered || '[]'),
      timestamp: row.timestamp,
    };
  }

  // ============================================
  // Daily Digest Methods
  // ============================================

  private updateDailyDigest(timestamp: number): void {
    const date = this.formatDate(new Date(timestamp));
    const existing = this.db.prepare(
      'SELECT * FROM daily_digests WHERE date = ?'
    ).get(date) as any;

    const dayStart = new Date(date + 'T00:00:00').getTime();
    const dayEnd = new Date(date + 'T23:59:59').getTime();

    // Calculate stats from sessions in this day
    const sessions = this.db.prepare(`
      SELECT * FROM session_summaries
      WHERE start_time >= ? AND start_time <= ?
    `).all(dayStart, dayEnd) as any[];

    const projectsTouched = new Set<string>();
    const keyEvents: string[] = [];
    let totalDuration = 0;
    let filesModifiedCount = 0;
    let commandsRunCount = 0;

    sessions.forEach((session: any) => {
      if (session.project_id) projectsTouched.add(session.project_id);
      totalDuration += session.duration || 0;

      const accomplishments = JSON.parse(session.key_accomplishments || '[]');
      keyEvents.push(...accomplishments);

      filesModifiedCount += JSON.parse(session.files_modified || '[]').length;
      commandsRunCount += JSON.parse(session.commands_run || '[]').length;
    });

    const hoursActive = totalDuration / (1000 * 60 * 60);

    if (existing) {
      this.db.prepare(`
        UPDATE daily_digests
        SET projects_touched = ?, hours_active = ?, key_events = ?,
            sessions_count = ?, files_modified_count = ?, commands_run_count = ?
        WHERE date = ?
      `).run(
        JSON.stringify([...projectsTouched]),
        hoursActive,
        JSON.stringify(keyEvents),
        sessions.length,
        filesModifiedCount,
        commandsRunCount,
        date
      );
    } else {
      const id = crypto.randomUUID();
      this.db.prepare(`
        INSERT INTO daily_digests (
          id, date, projects_touched, hours_active, key_events,
          sessions_count, files_modified_count, commands_run_count, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, date, JSON.stringify([...projectsTouched]), hoursActive,
        JSON.stringify(keyEvents), sessions.length, filesModifiedCount,
        commandsRunCount, timestamp
      );
    }
  }

  getDailyDigest(date?: string): DailyDigest | null {
    const targetDate = date || this.formatDate(new Date());
    const row = this.db.prepare(
      'SELECT * FROM daily_digests WHERE date = ?'
    ).get(targetDate) as any;

    return row ? this.rowToDailyDigest(row) : null;
  }

  getRecentDigests(days: number = 7): DailyDigest[] {
    const rows = this.db.prepare(`
      SELECT * FROM daily_digests
      ORDER BY date DESC LIMIT ?
    `).all(days) as any[];

    return rows.map(this.rowToDailyDigest);
  }

  private rowToDailyDigest(row: any): DailyDigest {
    return {
      id: row.id,
      date: row.date,
      summary: row.summary,
      projectsTouched: JSON.parse(row.projects_touched || '[]'),
      hoursActive: row.hours_active,
      keyEvents: JSON.parse(row.key_events || '[]'),
      sessionsCount: row.sessions_count,
      filesModifiedCount: row.files_modified_count,
      commandsRunCount: row.commands_run_count,
      timestamp: row.timestamp,
    };
  }

  // ============================================
  // Project Context Methods
  // ============================================

  updateProjectContext(
    projectId: string,
    projectName: string,
    updates: Partial<Omit<ProjectContext, 'id' | 'projectId' | 'projectName'>>
  ): void {
    const now = Date.now();
    const existing = this.db.prepare(
      'SELECT * FROM project_context WHERE project_id = ?'
    ).get(projectId) as any;

    if (existing) {
      const setClauses: string[] = ['last_activity = ?', 'timestamp = ?'];
      const values: any[] = [now, now];

      if (updates.currentFocus !== undefined) {
        setClauses.push('current_focus = ?');
        values.push(updates.currentFocus);
      }
      if (updates.pendingTasks !== undefined) {
        setClauses.push('pending_tasks = ?');
        values.push(JSON.stringify(updates.pendingTasks));
      }
      if (updates.recentFiles !== undefined) {
        setClauses.push('recent_files = ?');
        values.push(JSON.stringify(updates.recentFiles));
      }
      if (updates.recentCommands !== undefined) {
        setClauses.push('recent_commands = ?');
        values.push(JSON.stringify(updates.recentCommands));
      }
      if (updates.notes !== undefined) {
        setClauses.push('notes = ?');
        values.push(updates.notes);
      }
      if (updates.tags !== undefined) {
        setClauses.push('tags = ?');
        values.push(JSON.stringify(updates.tags));
      }
      if (updates.progressIndicators !== undefined) {
        setClauses.push('progress_indicators = ?');
        values.push(JSON.stringify(updates.progressIndicators));
      }

      values.push(projectId);
      this.db.prepare(`
        UPDATE project_context SET ${setClauses.join(', ')} WHERE project_id = ?
      `).run(...values);
    } else {
      const id = crypto.randomUUID();
      this.db.prepare(`
        INSERT INTO project_context (
          id, project_id, project_name, last_activity, current_focus,
          pending_tasks, recent_files, recent_commands, notes, tags,
          progress_indicators, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, projectId, projectName, now,
        updates.currentFocus || '',
        JSON.stringify(updates.pendingTasks || []),
        JSON.stringify(updates.recentFiles || []),
        JSON.stringify(updates.recentCommands || []),
        updates.notes || '',
        JSON.stringify(updates.tags || []),
        JSON.stringify(updates.progressIndicators || {
          filesModified: 0,
          sessionsCount: 0,
          totalHours: 0,
          lastUpdated: now
        }),
        now
      );
    }
  }

  getProjectContext(projectId: string): ProjectContext | null {
    const row = this.db.prepare(
      'SELECT * FROM project_context WHERE project_id = ?'
    ).get(projectId) as any;

    return row ? this.rowToProjectContext(row) : null;
  }

  getRecentProjects(limit: number = 10): ProjectContext[] {
    const rows = this.db.prepare(`
      SELECT * FROM project_context
      ORDER BY last_activity DESC LIMIT ?
    `).all(limit) as any[];

    return rows.map(this.rowToProjectContext);
  }

  private rowToProjectContext(row: any): ProjectContext {
    return {
      id: row.id,
      projectId: row.project_id,
      projectName: row.project_name,
      lastActivity: row.last_activity,
      currentFocus: row.current_focus,
      pendingTasks: JSON.parse(row.pending_tasks || '[]'),
      recentFiles: JSON.parse(row.recent_files || '[]'),
      recentCommands: JSON.parse(row.recent_commands || '[]'),
      notes: row.notes,
      tags: JSON.parse(row.tags || '[]'),
      progressIndicators: JSON.parse(row.progress_indicators || '{}'),
    };
  }

  // ============================================
  // Inferred Goals Methods
  // ============================================

  saveInferredGoal(goal: Omit<InferredGoal, 'id'>): string {
    const id = crypto.randomUUID();

    this.db.prepare(`
      INSERT INTO inferred_goals (
        id, description, category, progress, evidence, related_projects,
        related_sessions, first_detected, last_updated, status, confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, goal.description, goal.category, goal.progress,
      JSON.stringify(goal.evidence),
      JSON.stringify(goal.relatedProjects),
      JSON.stringify(goal.relatedSessions),
      goal.firstDetected, goal.lastUpdated, goal.status, goal.confidence
    );

    return id;
  }

  updateInferredGoal(id: string, updates: Partial<InferredGoal>): void {
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      values.push(updates.description);
    }
    if (updates.progress !== undefined) {
      setClauses.push('progress = ?');
      values.push(updates.progress);
    }
    if (updates.evidence !== undefined) {
      setClauses.push('evidence = ?');
      values.push(JSON.stringify(updates.evidence));
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.confidence !== undefined) {
      setClauses.push('confidence = ?');
      values.push(updates.confidence);
    }
    if (updates.relatedProjects !== undefined) {
      setClauses.push('related_projects = ?');
      values.push(JSON.stringify(updates.relatedProjects));
    }
    if (updates.relatedSessions !== undefined) {
      setClauses.push('related_sessions = ?');
      values.push(JSON.stringify(updates.relatedSessions));
    }

    if (setClauses.length > 0) {
      setClauses.push('last_updated = ?');
      values.push(Date.now());
      values.push(id);

      this.db.prepare(`
        UPDATE inferred_goals SET ${setClauses.join(', ')} WHERE id = ?
      `).run(...values);
    }
  }

  getInferredGoals(status?: InferredGoal['status']): InferredGoal[] {
    let query = 'SELECT * FROM inferred_goals';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY last_updated DESC';

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(this.rowToInferredGoal);
  }

  private rowToInferredGoal(row: any): InferredGoal {
    return {
      id: row.id,
      description: row.description,
      category: row.category,
      progress: row.progress,
      evidence: JSON.parse(row.evidence || '[]'),
      relatedProjects: JSON.parse(row.related_projects || '[]'),
      relatedSessions: JSON.parse(row.related_sessions || '[]'),
      firstDetected: row.first_detected,
      lastUpdated: row.last_updated,
      status: row.status,
      confidence: row.confidence,
    };
  }

  // ============================================
  // Unfinished Tasks Methods
  // ============================================

  saveUnfinishedTask(task: Omit<UnfinishedTask, 'id'>): string {
    const id = crypto.randomUUID();

    this.db.prepare(`
      INSERT INTO unfinished_tasks (
        id, session_id, project_id, description, context, priority,
        inferred_from, created_at, last_seen, related_files, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, task.sessionId, task.projectId || null, task.description,
      task.context, task.priority, task.inferredFrom, task.createdAt,
      task.lastSeen, JSON.stringify(task.relatedFiles), task.status
    );

    return id;
  }

  /**
   * Convenience method for recording a task
   */
  recordTask(
    description: string,
    status: UnfinishedTask['status'],
    options?: {
      sessionId?: string;
      projectId?: string;
      context?: string;
      priority?: UnfinishedTask['priority'];
      relatedFiles?: string[];
    }
  ): string {
    return this.saveUnfinishedTask({
      sessionId: options?.sessionId || 'unknown',
      projectId: options?.projectId || null,
      description,
      context: options?.context || '',
      priority: options?.priority || 'medium',
      inferredFrom: 'explicit',
      createdAt: Date.now(),
      lastSeen: Date.now(),
      relatedFiles: options?.relatedFiles || [],
      status,
    });
  }

  getUnfinishedTasks(projectId?: string, status?: UnfinishedTask['status']): UnfinishedTask[] {
    let query = 'SELECT * FROM unfinished_tasks WHERE 1=1';
    const params: any[] = [];

    if (projectId) {
      query += ' AND project_id = ?';
      params.push(projectId);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    } else {
      query += ' AND status = ?';
      params.push('pending');
    }

    query += ' ORDER BY last_seen DESC';

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(this.rowToUnfinishedTask);
  }

  completeTask(taskId: string): void {
    this.db.prepare(
      'UPDATE unfinished_tasks SET status = ? WHERE id = ?'
    ).run('completed', taskId);
  }

  private rowToUnfinishedTask(row: any): UnfinishedTask {
    return {
      id: row.id,
      sessionId: row.session_id,
      projectId: row.project_id,
      description: row.description,
      context: row.context,
      priority: row.priority,
      inferredFrom: row.inferred_from,
      createdAt: row.created_at,
      lastSeen: row.last_seen,
      relatedFiles: JSON.parse(row.related_files || '[]'),
      status: row.status,
    };
  }

  // ============================================
  // Weekly Themes Methods
  // ============================================

  updateWeeklyTheme(weekStart: string, updates: Partial<Omit<WeeklyTheme, 'id' | 'weekStart' | 'weekEnd'>>): void {
    const weekEnd = this.getWeekEnd(weekStart);
    const existing = this.db.prepare(
      'SELECT * FROM weekly_themes WHERE week_start = ?'
    ).get(weekStart) as any;

    if (existing) {
      const setClauses: string[] = [];
      const values: any[] = [];

      if (updates.themes !== undefined) {
        setClauses.push('themes = ?');
        values.push(JSON.stringify(updates.themes));
      }
      if (updates.projectsWorkedOn !== undefined) {
        setClauses.push('projects_worked_on = ?');
        values.push(JSON.stringify(updates.projectsWorkedOn));
      }
      if (updates.totalHours !== undefined) {
        setClauses.push('total_hours = ?');
        values.push(updates.totalHours);
      }
      if (updates.topAccomplishments !== undefined) {
        setClauses.push('top_accomplishments = ?');
        values.push(JSON.stringify(updates.topAccomplishments));
      }
      if (updates.challengesFaced !== undefined) {
        setClauses.push('challenges_faced = ?');
        values.push(JSON.stringify(updates.challengesFaced));
      }
      if (updates.goalsProgressed !== undefined) {
        setClauses.push('goals_progressed = ?');
        values.push(JSON.stringify(updates.goalsProgressed));
      }

      if (setClauses.length > 0) {
        values.push(weekStart);
        this.db.prepare(`
          UPDATE weekly_themes SET ${setClauses.join(', ')} WHERE week_start = ?
        `).run(...values);
      }
    } else {
      const id = crypto.randomUUID();
      this.db.prepare(`
        INSERT INTO weekly_themes (
          id, week_start, week_end, themes, projects_worked_on, total_hours,
          top_accomplishments, challenges_faced, goals_progressed, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, weekStart, weekEnd,
        JSON.stringify(updates.themes || []),
        JSON.stringify(updates.projectsWorkedOn || []),
        updates.totalHours || 0,
        JSON.stringify(updates.topAccomplishments || []),
        JSON.stringify(updates.challengesFaced || []),
        JSON.stringify(updates.goalsProgressed || []),
        Date.now()
      );
    }
  }

  getWeeklyTheme(weekStart?: string): WeeklyTheme | null {
    const targetWeek = weekStart || this.getWeekStart(new Date());
    const row = this.db.prepare(
      'SELECT * FROM weekly_themes WHERE week_start = ?'
    ).get(targetWeek) as any;

    return row ? this.rowToWeeklyTheme(row) : null;
  }

  getRecentWeeks(count: number = 4): WeeklyTheme[] {
    const rows = this.db.prepare(`
      SELECT * FROM weekly_themes
      ORDER BY week_start DESC LIMIT ?
    `).all(count) as any[];

    return rows.map(this.rowToWeeklyTheme);
  }

  private rowToWeeklyTheme(row: any): WeeklyTheme {
    return {
      id: row.id,
      weekStart: row.week_start,
      weekEnd: row.week_end,
      themes: JSON.parse(row.themes || '[]'),
      projectsWorkedOn: JSON.parse(row.projects_worked_on || '[]'),
      totalHours: row.total_hours,
      topAccomplishments: JSON.parse(row.top_accomplishments || '[]'),
      challengesFaced: JSON.parse(row.challenges_faced || '[]'),
      goalsProgressed: JSON.parse(row.goals_progressed || '[]'),
      timestamp: row.timestamp,
    };
  }

  // ============================================
  // Recent Context & History Methods
  // ============================================

  /**
   * Get recent context (everything that happened in the last N hours)
   */
  getRecentContext(hours: number = 24): {
    sessions: SessionSummary[];
    tasks: UnfinishedTask[];
    projects: ProjectContext[];
    digest?: DailyDigest;
  } {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);

    // Get recent sessions
    const sessions = this.db.prepare(`
      SELECT * FROM session_summaries
      WHERE start_time >= ?
      ORDER BY start_time DESC
    `).all(cutoffTime).map(this.rowToSessionSummary) as SessionSummary[];

    // Get recent tasks
    const tasks = this.db.prepare(`
      SELECT * FROM unfinished_tasks
      WHERE last_seen >= ? AND status = 'pending'
      ORDER BY last_seen DESC
    `).all(cutoffTime).map(this.rowToUnfinishedTask) as UnfinishedTask[];

    // Get recently active projects
    const projects = this.db.prepare(`
      SELECT * FROM project_context
      WHERE last_activity >= ?
      ORDER BY last_activity DESC
    `).all(cutoffTime).map(this.rowToProjectContext) as ProjectContext[];

    // Get today's digest if within the time range
    const digest = hours >= 24 ? (this.getDailyDigest() || undefined) : undefined;

    return { sessions, tasks, projects, digest };
  }

  /**
   * Get everything that happened in this project
   */
  getProjectHistory(projectPath: string): {
    context: ProjectContext | null;
    sessions: SessionSummary[];
    tasks: UnfinishedTask[];
    goals: InferredGoal[];
    totalHours: number;
    firstSeen: number | null;
    lastSeen: number | null;
  } {
    // Try to find project by ID (path hash) or name
    const projectId = this.hashProjectPath(projectPath);

    const context = this.getProjectContext(projectId);

    // Get all sessions for this project
    const sessions = this.db.prepare(`
      SELECT * FROM session_summaries
      WHERE project_id = ?
      ORDER BY start_time ASC
    `).all(projectId).map(this.rowToSessionSummary) as SessionSummary[];

    // Get all tasks for this project
    const tasks = this.db.prepare(`
      SELECT * FROM unfinished_tasks
      WHERE project_id = ?
      ORDER BY created_at DESC
    `).all(projectId).map(this.rowToUnfinishedTask) as UnfinishedTask[];

    // Get goals related to this project
    const goals = this.db.prepare(`
      SELECT * FROM inferred_goals
      WHERE related_projects LIKE ?
      ORDER BY last_updated DESC
    `).all(`%"${projectId}"%`).map(this.rowToInferredGoal) as InferredGoal[];

    // Calculate total hours and date range
    const totalHours = sessions.reduce((sum, s) => sum + (s.duration / (1000 * 60 * 60)), 0);
    const firstSeen = sessions.length > 0 ? sessions[0].startTime : null;
    const lastSeen = sessions.length > 0 ? sessions[sessions.length - 1].startTime : null;

    return { context, sessions, tasks, goals, totalHours, firstSeen, lastSeen };
  }

  /**
   * Get yesterday's work (pick up where you left off)
   */
  getYesterdaysWork(): {
    summary: string;
    sessions: SessionSummary[];
    unfinishedTasks: UnfinishedTask[];
    filesWorkedOn: string[];
    suggestedActions: string[];
  } {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this.formatDate(yesterday);

    // Get yesterday's digest
    const digest = this.getDailyDigest(yesterdayStr);

    // Get yesterday's sessions
    const dayStart = new Date(yesterdayStr + 'T00:00:00').getTime();
    const dayEnd = new Date(yesterdayStr + 'T23:59:59').getTime();

    const sessions = this.db.prepare(`
      SELECT * FROM session_summaries
      WHERE start_time >= ? AND start_time <= ?
      ORDER BY start_time DESC
    `).all(dayStart, dayEnd).map(this.rowToSessionSummary) as SessionSummary[];

    // Get unfinished tasks from yesterday
    const unfinishedTasks = this.db.prepare(`
      SELECT * FROM unfinished_tasks
      WHERE created_at >= ? AND created_at <= ? AND status = 'pending'
      ORDER BY priority DESC, created_at DESC
    `).all(dayStart, dayEnd).map(this.rowToUnfinishedTask) as UnfinishedTask[];

    // Collect all files worked on
    const filesSet = new Set<string>();
    sessions.forEach(s => s.filesModified.forEach(f => filesSet.add(f)));
    const filesWorkedOn = Array.from(filesSet);

    // Generate suggested actions
    const suggestedActions: string[] = [];

    // Add unfinished items from sessions
    sessions.forEach(s => {
      if (s.unfinishedItems.length > 0) {
        suggestedActions.push(...s.unfinishedItems.slice(0, 2));
      }
    });

    // Add unfinished tasks
    unfinishedTasks.slice(0, 3).forEach(t => {
      suggestedActions.push(t.description);
    });

    // Generate summary
    const summary = digest?.summary ||
      `Yesterday you worked on ${sessions.length} session(s), ` +
      `modified ${filesWorkedOn.length} file(s), and left ${unfinishedTasks.length} task(s) incomplete.`;

    return {
      summary,
      sessions,
      unfinishedTasks,
      filesWorkedOn,
      suggestedActions: [...new Set(suggestedActions)].slice(0, 5),
    };
  }

  /**
   * Search through all memories (simple text search for now)
   * TODO: Add semantic search with embeddings
   */
  searchMemory(query: string, limit: number = 20): {
    sessions: SessionSummary[];
    tasks: UnfinishedTask[];
    goals: InferredGoal[];
  } {
    const searchPattern = `%${query}%`;

    // Search sessions
    const sessions = this.db.prepare(`
      SELECT * FROM session_summaries
      WHERE summary LIKE ?
         OR session_name LIKE ?
         OR key_accomplishments LIKE ?
         OR files_modified LIKE ?
      ORDER BY start_time DESC LIMIT ?
    `).all(searchPattern, searchPattern, searchPattern, searchPattern, limit)
      .map(this.rowToSessionSummary) as SessionSummary[];

    // Search tasks
    const tasks = this.db.prepare(`
      SELECT * FROM unfinished_tasks
      WHERE description LIKE ? OR context LIKE ?
      ORDER BY last_seen DESC LIMIT ?
    `).all(searchPattern, searchPattern, limit)
      .map(this.rowToUnfinishedTask) as UnfinishedTask[];

    // Search goals
    const goals = this.db.prepare(`
      SELECT * FROM inferred_goals
      WHERE description LIKE ? OR evidence LIKE ?
      ORDER BY last_updated DESC LIMIT ?
    `).all(searchPattern, searchPattern, limit)
      .map(this.rowToInferredGoal) as InferredGoal[];

    return { sessions, tasks, goals };
  }

  /**
   * Generate daily digest for a specific date (or today)
   */
  generateDailyDigest(date?: string): DailyDigest {
    const targetDate = date || this.formatDate(new Date());
    this.updateDailyDigest(new Date(targetDate + 'T12:00:00').getTime());

    const digest = this.getDailyDigest(targetDate);
    if (!digest) {
      // Create empty digest if none exists
      const id = crypto.randomUUID();
      this.db.prepare(`
        INSERT INTO daily_digests (
          id, date, summary, timestamp
        ) VALUES (?, ?, ?, ?)
      `).run(id, targetDate, 'No activity recorded for this day', Date.now());

      return this.getDailyDigest(targetDate)!;
    }

    return digest;
  }

  // ============================================
  // Context Restoration
  // ============================================

  restoreContext(sessionId: string, projectId?: string): ContextRestoration {
    // Get last session summary
    const lastSession = this.getSessionSummary(sessionId);

    // Get project context if available
    const projectContext = projectId ? this.getProjectContext(projectId) : null;

    // Get unfinished tasks
    const pendingTasks = this.getUnfinishedTasks(projectId || undefined, 'pending');

    // Get relevant goals
    const allGoals = this.getInferredGoals('active');
    const relevantGoals = projectId
      ? allGoals.filter(g => g.relatedProjects.includes(projectId))
      : allGoals.slice(0, 5);

    // Get recent activity
    const recentActivity = projectId
      ? this.db.prepare(`
          SELECT * FROM session_summaries
          WHERE project_id = ?
          ORDER BY start_time DESC LIMIT 5
        `).all(projectId).map(this.rowToSessionSummary) as SessionSummary[]
      : this.getRecentSessions(5);

    // Generate suggested next steps based on context
    const suggestedNextSteps: string[] = [];
    if (lastSession?.unfinishedItems.length) {
      suggestedNextSteps.push(...lastSession.unfinishedItems);
    }
    if (projectContext?.pendingTasks.length) {
      suggestedNextSteps.push(...projectContext.pendingTasks.slice(0, 3));
    }
    if (pendingTasks.length) {
      suggestedNextSteps.push(...pendingTasks.slice(0, 3).map(t => t.description));
    }

    return {
      sessionId,
      projectId: projectId || null,
      lastContext: {
        summary: lastSession?.summary || projectContext?.currentFocus || 'No previous context available',
        lastFiles: lastSession?.filesModified || projectContext?.recentFiles || [],
        lastCommands: lastSession?.commandsRun || projectContext?.recentCommands || [],
        pendingTasks: pendingTasks.slice(0, 5),
        suggestedNextSteps: [...new Set(suggestedNextSteps)].slice(0, 5),
      },
      relevantGoals,
      recentActivity,
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    d.setDate(diff);
    return this.formatDate(d);
  }

  private getWeekEnd(weekStart: string): string {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return this.formatDate(d);
  }

  private hashProjectPath(path: string): string {
    // Create a consistent hash for project paths
    return crypto.createHash('sha256').update(path).digest('hex').substring(0, 16);
  }

  // ============================================
  // Cleanup
  // ============================================

  close(): void {
    this.db.close();
  }
}

export default ContextMemory;
