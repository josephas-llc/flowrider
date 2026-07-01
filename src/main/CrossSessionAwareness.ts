/**
 * CrossSessionAwareness - Enables sessions to benefit from each other's work
 *
 * This service tracks what each session is working on and provides:
 * - Shared context between sessions working on related tasks
 * - Suggestions when one session solves a problem another is facing
 * - Activity feed showing what's happening across all sessions
 * - Conflict detection when sessions modify the same files
 */

import { getLeoAI } from './leo-ai';

// ============================================
// Types
// ============================================

export interface SessionActivity {
  sessionId: string;
  sessionName: string;
  projectId: string | null;
  workingDir: string;
  currentTask: string | null;
  recentFiles: string[];
  recentErrors: string[];
  status: 'idle' | 'active' | 'waiting' | 'error';
  lastActivityTime: number;
  tags: string[];
}

export interface CrossSessionSuggestion {
  id: string;
  type: 'solution' | 'warning' | 'insight' | 'collaboration';
  sourceSessionId: string;
  targetSessionId: string;
  title: string;
  description: string;
  context?: string;
  relevance: number; // 0-1
  timestamp: number;
  dismissed: boolean;
}

export interface FileConflict {
  filePath: string;
  sessions: string[];
  lastModified: number;
  severity: 'low' | 'medium' | 'high';
}

export interface CrossSessionContext {
  relatedSessions: {
    sessionId: string;
    sessionName: string;
    relevance: number;
    sharedContext: string[];
  }[];
  recentSolutions: {
    problem: string;
    solution: string;
    sessionId: string;
    timestamp: number;
  }[];
  activeConflicts: FileConflict[];
  suggestions: CrossSessionSuggestion[];
}

// ============================================
// CrossSessionAwareness Class
// ============================================

export class CrossSessionAwareness {
  private sessions: Map<string, SessionActivity> = new Map();
  private suggestions: Map<string, CrossSessionSuggestion> = new Map();
  private fileModifications: Map<string, { sessionId: string; timestamp: number }[]> = new Map();
  private suggestionIdCounter = 0;

  constructor() {
    console.log('[CrossSessionAwareness] Initialized');
  }

  // ============================================
  // Session Tracking
  // ============================================

  /**
   * Register a session for cross-session awareness
   */
  registerSession(
    sessionId: string,
    sessionName: string,
    workingDir: string,
    projectId?: string
  ): void {
    const activity: SessionActivity = {
      sessionId,
      sessionName,
      projectId: projectId ?? null,
      workingDir,
      currentTask: null,
      recentFiles: [],
      recentErrors: [],
      status: 'idle',
      lastActivityTime: Date.now(),
      tags: [],
    };

    this.sessions.set(sessionId, activity);
    console.log(`[CrossSessionAwareness] Registered session: ${sessionName}`);
  }

  /**
   * Unregister a session
   */
  unregisterSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    // Clean up suggestions for this session
    for (const [id, suggestion] of this.suggestions) {
      if (suggestion.sourceSessionId === sessionId || suggestion.targetSessionId === sessionId) {
        this.suggestions.delete(id);
      }
    }
    console.log(`[CrossSessionAwareness] Unregistered session: ${sessionId}`);
  }

  /**
   * Update session activity
   */
  updateActivity(
    sessionId: string,
    updates: Partial<Pick<SessionActivity, 'currentTask' | 'status' | 'tags'>>
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    Object.assign(session, updates);
    session.lastActivityTime = Date.now();
  }

  /**
   * Record a file modification
   */
  recordFileModification(sessionId: string, filePath: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Track in session
    if (!session.recentFiles.includes(filePath)) {
      session.recentFiles.unshift(filePath);
      session.recentFiles = session.recentFiles.slice(0, 20); // Keep last 20
    }
    session.lastActivityTime = Date.now();

    // Track globally for conflict detection
    const mods = this.fileModifications.get(filePath) ?? [];
    mods.push({ sessionId, timestamp: Date.now() });
    // Keep only last hour of modifications
    const oneHourAgo = Date.now() - 3600000;
    this.fileModifications.set(
      filePath,
      mods.filter(m => m.timestamp > oneHourAgo)
    );

    // Check for conflicts
    this.detectConflicts(filePath);
  }

  /**
   * Record an error in a session
   */
  recordError(sessionId: string, error: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Add to recent errors
    if (!session.recentErrors.includes(error)) {
      session.recentErrors.unshift(error);
      session.recentErrors = session.recentErrors.slice(0, 10);
    }
    session.status = 'error';
    session.lastActivityTime = Date.now();

    // Check if another session has solved this error
    this.findSolutionForError(sessionId, error);
  }

  /**
   * Record that an error was resolved
   */
  recordErrorResolved(sessionId: string, error: string, solution: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Remove from recent errors
    session.recentErrors = session.recentErrors.filter(e => e !== error);
    if (session.recentErrors.length === 0) {
      session.status = 'active';
    }

    // Create suggestions for other sessions with the same error
    for (const [otherSessionId, otherSession] of this.sessions) {
      if (otherSessionId === sessionId) continue;

      if (otherSession.recentErrors.some(e => this.errorsSimilar(e, error))) {
        this.createSuggestion({
          type: 'solution',
          sourceSessionId: sessionId,
          targetSessionId: otherSessionId,
          title: 'Similar error resolved in another session',
          description: `Session "${session.sessionName}" just resolved a similar error`,
          context: solution,
          relevance: 0.9,
        });
      }
    }
  }

  // ============================================
  // Cross-Session Intelligence
  // ============================================

  /**
   * Get context relevant to a session from other sessions
   */
  getCrossSessionContext(sessionId: string): CrossSessionContext {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        relatedSessions: [],
        recentSolutions: [],
        activeConflicts: [],
        suggestions: [],
      };
    }

    // Find related sessions
    const relatedSessions = this.findRelatedSessions(session);

    // Get recent solutions from LEO AI that might be relevant
    const leoAI = getLeoAI();
    const recentSolutions = this.extractRecentSolutions(session);

    // Get active conflicts
    const activeConflicts = this.getActiveConflicts(sessionId);

    // Get suggestions for this session
    const suggestions = Array.from(this.suggestions.values())
      .filter(s => s.targetSessionId === sessionId && !s.dismissed)
      .sort((a, b) => b.relevance - a.relevance);

    return {
      relatedSessions,
      recentSolutions,
      activeConflicts,
      suggestions,
    };
  }

  /**
   * Find sessions related to the given session
   */
  private findRelatedSessions(session: SessionActivity): CrossSessionContext['relatedSessions'] {
    const related: CrossSessionContext['relatedSessions'] = [];

    for (const [otherId, other] of this.sessions) {
      if (otherId === session.sessionId) continue;

      // Calculate relevance based on:
      // 1. Same project
      // 2. Shared files
      // 3. Similar errors
      // 4. Shared tags

      let relevance = 0;
      const sharedContext: string[] = [];

      // Same project is highly relevant
      if (session.projectId && session.projectId === other.projectId) {
        relevance += 0.4;
        sharedContext.push(`Same project: ${session.projectId}`);
      }

      // Same working directory
      if (session.workingDir === other.workingDir) {
        relevance += 0.3;
        sharedContext.push('Same working directory');
      }

      // Shared files
      const sharedFiles = session.recentFiles.filter(f => other.recentFiles.includes(f));
      if (sharedFiles.length > 0) {
        relevance += Math.min(0.3, sharedFiles.length * 0.1);
        sharedContext.push(`Shared files: ${sharedFiles.slice(0, 3).join(', ')}`);
      }

      // Similar errors
      const sharedErrors = session.recentErrors.filter(e =>
        other.recentErrors.some(oe => this.errorsSimilar(e, oe))
      );
      if (sharedErrors.length > 0) {
        relevance += 0.2;
        sharedContext.push(`Similar errors: ${sharedErrors.length}`);
      }

      // Shared tags
      const sharedTags = session.tags.filter(t => other.tags.includes(t));
      if (sharedTags.length > 0) {
        relevance += sharedTags.length * 0.05;
        sharedContext.push(`Shared tags: ${sharedTags.join(', ')}`);
      }

      if (relevance > 0.1) {
        related.push({
          sessionId: otherId,
          sessionName: other.sessionName,
          relevance: Math.min(1, relevance),
          sharedContext,
        });
      }
    }

    return related.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Extract recent solutions that might be relevant
   */
  private extractRecentSolutions(session: SessionActivity): CrossSessionContext['recentSolutions'] {
    const solutions: CrossSessionContext['recentSolutions'] = [];
    const leoAI = getLeoAI();

    // Get recent interactions from LEO AI
    const recentInteractions = leoAI.getRecentInteractions(50);

    for (const interaction of recentInteractions) {
      // Skip interactions from the same session
      if (interaction.sessionId === session.sessionId) continue;

      // Look for interactions that resolved errors
      if (interaction.outcome === 'success' && interaction.filesAffected?.length) {
        // Check if any files are shared
        const sharedFiles = interaction.filesAffected.filter(f =>
          session.recentFiles.includes(f)
        );

        if (sharedFiles.length > 0) {
          solutions.push({
            problem: interaction.prompt.substring(0, 100) + '...',
            solution: interaction.response.substring(0, 200) + '...',
            sessionId: interaction.sessionId,
            timestamp: interaction.timestamp,
          });
        }
      }
    }

    return solutions.slice(0, 5);
  }

  /**
   * Detect file conflicts
   */
  private detectConflicts(filePath: string): void {
    const mods = this.fileModifications.get(filePath);
    if (!mods || mods.length < 2) return;

    // Find recent modifications from different sessions
    const fiveMinutesAgo = Date.now() - 300000;
    const recentMods = mods.filter(m => m.timestamp > fiveMinutesAgo);

    const uniqueSessions = new Set(recentMods.map(m => m.sessionId));
    if (uniqueSessions.size > 1) {
      const sessions = Array.from(uniqueSessions);
      const severity: FileConflict['severity'] =
        sessions.length > 2 ? 'high' : 'medium';

      // Create warning suggestions for all involved sessions
      for (const sessionId of sessions) {
        const session = this.sessions.get(sessionId);
        if (!session) continue;

        const otherSessions = sessions
          .filter(s => s !== sessionId)
          .map(s => this.sessions.get(s)?.sessionName ?? s)
          .join(', ');

        this.createSuggestion({
          type: 'warning',
          sourceSessionId: 'system',
          targetSessionId: sessionId,
          title: 'Potential file conflict',
          description: `File "${filePath}" is being modified by multiple sessions: ${otherSessions}`,
          relevance: severity === 'high' ? 0.95 : 0.7,
        });
      }
    }
  }

  /**
   * Find a solution for an error from other sessions
   */
  private findSolutionForError(sessionId: string, error: string): void {
    const leoAI = getLeoAI();

    // Search for patterns that match this error
    const patterns = leoAI.getPatterns(0.6);

    for (const pattern of patterns) {
      if (pattern.type === 'error' && this.errorsSimilar(pattern.name, error)) {
        if (pattern.solution) {
          this.createSuggestion({
            type: 'solution',
            sourceSessionId: 'leo-ai',
            targetSessionId: sessionId,
            title: 'LEO AI found a solution',
            description: 'This error pattern has been resolved before',
            context: pattern.solution,
            relevance: pattern.confidence,
          });
        }
      }
    }
  }

  /**
   * Get active conflicts for a session
   */
  private getActiveConflicts(sessionId: string): FileConflict[] {
    const conflicts: FileConflict[] = [];
    const session = this.sessions.get(sessionId);
    if (!session) return conflicts;

    const fiveMinutesAgo = Date.now() - 300000;

    for (const filePath of session.recentFiles) {
      const mods = this.fileModifications.get(filePath);
      if (!mods) continue;

      const recentMods = mods.filter(m => m.timestamp > fiveMinutesAgo);
      const otherSessions = new Set(
        recentMods.filter(m => m.sessionId !== sessionId).map(m => m.sessionId)
      );

      if (otherSessions.size > 0) {
        conflicts.push({
          filePath,
          sessions: Array.from(otherSessions),
          lastModified: Math.max(...recentMods.map(m => m.timestamp)),
          severity: otherSessions.size > 1 ? 'high' : 'medium',
        });
      }
    }

    return conflicts;
  }

  /**
   * Check if two errors are similar
   */
  private errorsSimilar(error1: string, error2: string): boolean {
    // Simple similarity check
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

    const n1 = normalize(error1);
    const n2 = normalize(error2);

    // Exact match
    if (n1 === n2) return true;

    // Check for significant overlap
    const words1 = new Set(n1.split(' ').filter(w => w.length > 3));
    const words2 = new Set(n2.split(' ').filter(w => w.length > 3));

    let shared = 0;
    for (const word of words1) {
      if (words2.has(word)) shared++;
    }

    const minSize = Math.min(words1.size, words2.size);
    return minSize > 0 && shared / minSize > 0.5;
  }

  // ============================================
  // Suggestions Management
  // ============================================

  /**
   * Create a new suggestion
   */
  private createSuggestion(
    data: Omit<CrossSessionSuggestion, 'id' | 'timestamp' | 'dismissed'>
  ): void {
    const id = `suggestion-${++this.suggestionIdCounter}`;
    const suggestion: CrossSessionSuggestion = {
      ...data,
      id,
      timestamp: Date.now(),
      dismissed: false,
    };

    this.suggestions.set(id, suggestion);

    // Limit total suggestions
    if (this.suggestions.size > 100) {
      // Remove oldest dismissed suggestions first
      const sorted = Array.from(this.suggestions.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      for (const [id, sugg] of sorted) {
        if (sugg.dismissed) {
          this.suggestions.delete(id);
          if (this.suggestions.size <= 50) break;
        }
      }
    }
  }

  /**
   * Dismiss a suggestion
   */
  dismissSuggestion(suggestionId: string): void {
    const suggestion = this.suggestions.get(suggestionId);
    if (suggestion) {
      suggestion.dismissed = true;
    }
  }

  /**
   * Get all suggestions for a session
   */
  getSuggestions(sessionId: string): CrossSessionSuggestion[] {
    return Array.from(this.suggestions.values())
      .filter(s => s.targetSessionId === sessionId && !s.dismissed)
      .sort((a, b) => b.relevance - a.relevance);
  }

  // ============================================
  // Activity Feed
  // ============================================

  /**
   * Get activity feed across all sessions
   */
  getActivityFeed(): SessionActivity[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.lastActivityTime - a.lastActivityTime);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionActivity | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionActivity[] {
    const fiveMinutesAgo = Date.now() - 300000;
    return Array.from(this.sessions.values())
      .filter(s => s.lastActivityTime > fiveMinutesAgo || s.status !== 'idle')
      .sort((a, b) => b.lastActivityTime - a.lastActivityTime);
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Shutdown
   */
  shutdown(): void {
    this.sessions.clear();
    this.suggestions.clear();
    this.fileModifications.clear();
    console.log('[CrossSessionAwareness] Shutdown complete');
  }
}

// ============================================
// Singleton Instance
// ============================================

let instance: CrossSessionAwareness | null = null;

export function getCrossSessionAwareness(): CrossSessionAwareness {
  if (!instance) {
    instance = new CrossSessionAwareness();
  }
  return instance;
}

export function shutdownCrossSessionAwareness(): void {
  if (instance) {
    instance.shutdown();
    instance = null;
  }
}

export default CrossSessionAwareness;
