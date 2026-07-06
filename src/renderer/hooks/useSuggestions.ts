import { useState, useEffect, useCallback } from 'react';

export type SuggestionType =
  | 'ai_provider'
  | 'template'
  | 'error_prevention'
  | 'workflow'
  | 'productivity'
  | 'cross_session'
  | 'code_pattern'
  | 'project_context'
  | 'learning'
  | 'quick_action';

export type SuggestionPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  priority: SuggestionPriority;
  confidence: number;
  relevance: number;
  actionable: boolean;
  action?: {
    label: string;
    type: 'apply_provider' | 'apply_template' | 'copy_code' | 'navigate' | 'dismiss' | 'custom';
    payload?: unknown;
  };
  dismissable: boolean;
  expiresAt?: number;
  source: {
    type: 'pattern' | 'insight' | 'interaction' | 'heuristic';
    id?: string;
  };
  context: {
    projectId?: string;
    sessionId?: string;
    language?: string;
    tags?: string[];
  };
  createdAt: number;
}

export interface SuggestionRequest {
  sessionId?: string;
  projectId?: string;
  workingDir?: string;
  language?: string;
  currentTask?: string;
  recentErrors?: string[];
  aiProvider?: string;
  limit?: number;
}

export function useSuggestions(request?: SuggestionRequest) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (req?: SuggestionRequest) => {
    if (!window.flowrider?.leoai) {
      console.warn('[useSuggestions] AI System service not available');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const result = await window.flowrider.leoai.getSuggestions(req || request);
      if (result.success && result.data) {
        setSuggestions(result.data);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('[useSuggestions] Failed to fetch suggestions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [request]);

  // Get session start suggestions
  const getSessionStartSuggestions = useCallback(async (
    workingDir: string,
    projectId?: string,
    language?: string
  ): Promise<Suggestion[]> => {
    if (!window.flowrider?.leoai) return [];

    try {
      const result = await window.flowrider.leoai.getSessionStartSuggestions(
        workingDir,
        projectId,
        language
      );
      if (result.success && result.data) {
        return result.data;
      }
    } catch (err) {
      console.error('[useSuggestions] Failed to get session start suggestions:', err);
    }
    return [];
  }, []);

  // Get error suggestions
  const getErrorSuggestions = useCallback(async (
    errors: string[],
    language?: string
  ): Promise<Suggestion[]> => {
    if (!window.flowrider?.leoai) return [];

    try {
      const result = await window.flowrider.leoai.getErrorSuggestions(errors, language);
      if (result.success && result.data) {
        return result.data;
      }
    } catch (err) {
      console.error('[useSuggestions] Failed to get error suggestions:', err);
    }
    return [];
  }, []);

  // Dismiss a suggestion
  const dismissSuggestion = useCallback(async (suggestionId: string) => {
    if (!window.flowrider?.leoai) return false;

    try {
      const result = await window.flowrider.leoai.dismissSuggestion(suggestionId);
      if (result.success) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
        return true;
      }
    } catch (err) {
      console.error('[useSuggestions] Failed to dismiss suggestion:', err);
    }
    return false;
  }, []);

  // Record action on a suggestion (for learning)
  const recordAction = useCallback(async (suggestionId: string, accepted: boolean) => {
    if (!window.flowrider?.leoai) return false;

    try {
      const result = await window.flowrider.leoai.recordSuggestionAction(suggestionId, accepted);
      return result.success;
    } catch (err) {
      console.error('[useSuggestions] Failed to record action:', err);
    }
    return false;
  }, []);

  // Clear dismissed suggestions
  const clearDismissed = useCallback(async () => {
    if (!window.flowrider?.leoai) return false;

    try {
      const result = await window.flowrider.leoai.clearDismissedSuggestions();
      if (result.success) {
        await fetchSuggestions();
        return true;
      }
    } catch (err) {
      console.error('[useSuggestions] Failed to clear dismissed:', err);
    }
    return false;
  }, [fetchSuggestions]);

  // Initial fetch
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Refresh periodically (every 2 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSuggestions();
    }, 120000);

    return () => clearInterval(interval);
  }, [fetchSuggestions]);

  return {
    suggestions,
    loading,
    error,
    fetchSuggestions,
    getSessionStartSuggestions,
    getErrorSuggestions,
    dismissSuggestion,
    recordAction,
    clearDismissed,
  };
}
