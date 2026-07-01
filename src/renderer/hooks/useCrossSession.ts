import { useState, useEffect, useCallback } from 'react';

// Types mirroring CrossSessionAwareness
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
  relevance: number;
  timestamp: number;
  dismissed: boolean;
}

export interface CrossSessionContext {
  relatedSessions: SessionActivity[];
  suggestions: CrossSessionSuggestion[];
  sharedFiles: string[];
  potentialSolutions: Array<{
    problem: string;
    solution: string;
    sessionId: string;
    timestamp: number;
  }>;
}

export interface ActivityFeedItem {
  sessionId: string;
  sessionName: string;
  action: string;
  timestamp: number;
  details?: string;
}

interface UseCrossSessionReturn {
  // Data
  activeSessions: SessionActivity[];
  suggestions: CrossSessionSuggestion[];
  activityFeed: ActivityFeedItem[];
  loading: boolean;

  // Session registration
  registerSession: (sessionId: string, sessionName: string, workingDir: string, projectId?: string) => Promise<void>;
  unregisterSession: (sessionId: string) => Promise<void>;

  // Activity tracking
  updateActivity: (sessionId: string, updates: Partial<Pick<SessionActivity, 'currentTask' | 'status' | 'tags'>>) => Promise<void>;
  recordFile: (sessionId: string, filePath: string) => Promise<void>;
  recordError: (sessionId: string, error: string) => Promise<void>;
  recordErrorResolved: (sessionId: string, error: string, solution: string) => Promise<void>;

  // Context & suggestions
  getContext: (sessionId: string) => Promise<CrossSessionContext | null>;
  getSuggestionsForSession: (sessionId: string) => Promise<CrossSessionSuggestion[]>;
  dismissSuggestion: (suggestionId: string) => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;
}

export function useCrossSession(): UseCrossSessionReturn {
  const [activeSessions, setActiveSessions] = useState<SessionActivity[]>([]);
  const [suggestions, setSuggestions] = useState<CrossSessionSuggestion[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Refresh data from the main process
  const refresh = useCallback(async () => {
    try {
      const [sessions, feed] = await Promise.all([
        window.electron.crossSession.getActiveSessions(),
        window.electron.crossSession.getActivityFeed(),
      ]);

      setActiveSessions(sessions || []);
      setActivityFeed(feed || []);

      // Aggregate suggestions from all sessions
      const allSuggestions: CrossSessionSuggestion[] = [];
      for (const session of sessions || []) {
        const sessionSuggestions = await window.electron.crossSession.getSuggestions(session.sessionId);
        if (sessionSuggestions) {
          allSuggestions.push(...sessionSuggestions);
        }
      }
      setSuggestions(allSuggestions);
    } catch (err) {
      console.error('[useCrossSession] Error refreshing:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(refresh, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [refresh]);

  // Session registration
  const registerSession = useCallback(async (
    sessionId: string,
    sessionName: string,
    workingDir: string,
    projectId?: string
  ) => {
    try {
      await window.electron.crossSession.register(sessionId, sessionName, workingDir, projectId);
      await refresh();
    } catch (err) {
      console.error('[useCrossSession] Error registering session:', err);
    }
  }, [refresh]);

  const unregisterSession = useCallback(async (sessionId: string) => {
    try {
      await window.electron.crossSession.unregister(sessionId);
      await refresh();
    } catch (err) {
      console.error('[useCrossSession] Error unregistering session:', err);
    }
  }, [refresh]);

  // Activity tracking
  const updateActivity = useCallback(async (
    sessionId: string,
    updates: Partial<Pick<SessionActivity, 'currentTask' | 'status' | 'tags'>>
  ) => {
    try {
      await window.electron.crossSession.updateActivity(sessionId, updates);
    } catch (err) {
      console.error('[useCrossSession] Error updating activity:', err);
    }
  }, []);

  const recordFile = useCallback(async (sessionId: string, filePath: string) => {
    try {
      await window.electron.crossSession.recordFile(sessionId, filePath);
    } catch (err) {
      console.error('[useCrossSession] Error recording file:', err);
    }
  }, []);

  const recordError = useCallback(async (sessionId: string, error: string) => {
    try {
      await window.electron.crossSession.recordError(sessionId, error);
      await refresh(); // Refresh to get new suggestions
    } catch (err) {
      console.error('[useCrossSession] Error recording error:', err);
    }
  }, [refresh]);

  const recordErrorResolved = useCallback(async (sessionId: string, error: string, solution: string) => {
    try {
      await window.electron.crossSession.recordErrorResolved(sessionId, error, solution);
    } catch (err) {
      console.error('[useCrossSession] Error recording error resolution:', err);
    }
  }, []);

  // Context & suggestions
  const getContext = useCallback(async (sessionId: string): Promise<CrossSessionContext | null> => {
    try {
      return await window.electron.crossSession.getContext(sessionId);
    } catch (err) {
      console.error('[useCrossSession] Error getting context:', err);
      return null;
    }
  }, []);

  const getSuggestionsForSession = useCallback(async (sessionId: string): Promise<CrossSessionSuggestion[]> => {
    try {
      return await window.electron.crossSession.getSuggestions(sessionId) || [];
    } catch (err) {
      console.error('[useCrossSession] Error getting suggestions:', err);
      return [];
    }
  }, []);

  const dismissSuggestion = useCallback(async (suggestionId: string) => {
    try {
      await window.electron.crossSession.dismissSuggestion(suggestionId);
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    } catch (err) {
      console.error('[useCrossSession] Error dismissing suggestion:', err);
    }
  }, []);

  return {
    activeSessions,
    suggestions,
    activityFeed,
    loading,
    registerSession,
    unregisterSession,
    updateActivity,
    recordFile,
    recordError,
    recordErrorResolved,
    getContext,
    getSuggestionsForSession,
    dismissSuggestion,
    refresh,
  };
}
