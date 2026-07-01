import { useState, useEffect, useCallback } from 'react';

export interface LeoAIStatus {
  enabled: boolean;
  learning: boolean;
  stats: {
    totalInteractions: number;
    totalPatterns: number;
    totalInsights: number;
    totalSnippets: number;
    avgConfidence: number;
    topLanguages: string[];
    topProjects: string[];
  };
  lastAnalysis: number | null;
  config: {
    analysisInterval: number;
    minInteractionsForAnalysis: number;
    autoLearn: boolean;
    defaultVerbosity: 'minimal' | 'normal' | 'detailed';
  };
}

// Normalize stats from backend to frontend format
function normalizeStats(backendStats: any): LeoAIStatus['stats'] {
  return {
    totalInteractions: backendStats?.totalInteractions ?? 0,
    totalPatterns: backendStats?.totalPatterns ?? 0,
    totalInsights: backendStats?.totalInsights ?? 0,
    totalSnippets: backendStats?.totalSnippets ?? 0,
    // Backend uses averageConfidence, frontend expects avgConfidence
    avgConfidence: backendStats?.avgConfidence ?? backendStats?.averageConfidence ?? 0,
    // These may not be returned by backend
    topLanguages: backendStats?.topLanguages ?? [],
    topProjects: backendStats?.topProjects ?? [],
  };
}

// Normalize full status from backend
function normalizeStatus(backendStatus: any): LeoAIStatus | null {
  if (!backendStatus) return null;
  return {
    enabled: backendStatus.enabled ?? false,
    learning: backendStatus.learning ?? false,
    stats: normalizeStats(backendStatus.stats),
    lastAnalysis: backendStatus.lastAnalysis ?? null,
    config: backendStatus.config ?? {
      analysisInterval: 300000,
      minInteractionsForAnalysis: 10,
      autoLearn: true,
      defaultVerbosity: 'normal',
    },
  };
}

export interface Pattern {
  id: string;
  type: 'error' | 'code' | 'workflow' | 'prompt';
  pattern: string;
  frequency: number;
  confidence: number;
  examples: string[];
  resolution?: string;
  tags: string[];
  language?: string;
  createdAt: number;
  lastSeen: number;
}

export interface Insight {
  id: string;
  category: string;
  content: string;
  confidence: number;
  sourcePatterns: string[];
  applicableTags: string[];
  applicableLanguages: string[];
  effectiveness: number;
  usageCount: number;
  createdAt: number;
  lastUsed: number;
}

export interface LearningEvent {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
}

export function useLeoAI() {
  const [status, setStatus] = useState<LeoAIStatus | null>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [learningEvents, setLearningEvents] = useState<LearningEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastEventCheck, setLastEventCheck] = useState(Date.now() - 60000); // Start 1 minute ago

  // Fetch LEO AI status
  const fetchStatus = useCallback(async () => {
    if (!window.flowrider?.leoai) {
      console.warn('[useLeoAI] LEO AI service not available');
      setLoading(false);
      return;
    }

    try {
      const result = await window.flowrider.leoai.getStatus();
      if (result.success && result.data) {
        setStatus(normalizeStatus(result.data));
      }
    } catch (err) {
      console.error('[useLeoAI] Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch patterns
  const fetchPatterns = useCallback(async (minConfidence = 0.5) => {
    if (!window.flowrider?.leoai) return;

    try {
      const result = await window.flowrider.leoai.getPatterns(minConfidence);
      if (result.success && result.data) {
        setPatterns(result.data);
      }
    } catch (err) {
      console.error('[useLeoAI] Failed to fetch patterns:', err);
    }
  }, []);

  // Fetch insights
  const fetchInsights = useCallback(async (limit = 20) => {
    if (!window.flowrider?.leoai) return;

    try {
      const result = await window.flowrider.leoai.getInsights(limit);
      if (result.success && result.data) {
        setInsights(result.data);
      }
    } catch (err) {
      console.error('[useLeoAI] Failed to fetch insights:', err);
    }
  }, []);

  // Fetch recent learning events
  const fetchLearningEvents = useCallback(async () => {
    if (!window.flowrider?.leoai) return;

    try {
      const result = await window.flowrider.leoai.getLearningEvents(lastEventCheck);
      if (result.success && result.data) {
        setLearningEvents(prev => [...result.data, ...prev].slice(0, 50)); // Keep last 50
        setLastEventCheck(Date.now());
      }
    } catch (err) {
      console.error('[useLeoAI] Failed to fetch learning events:', err);
    }
  }, [lastEventCheck]);

  // Get context for a prompt
  const getContext = useCallback(async (options: {
    prompt?: string;
    projectId?: string;
    language?: string;
    sessionId?: string;
  }) => {
    if (!window.flowrider?.leoai) {
      return null;
    }

    try {
      const result = await window.flowrider.leoai.getContext(options);
      if (result.success && result.data) {
        return result.data;
      }
    } catch (err) {
      console.error('[useLeoAI] Failed to get context:', err);
    }
    return null;
  }, []);

  // Get quick context (system prompt snippet)
  const getQuickContext = useCallback(async (projectId?: string, language?: string) => {
    if (!window.flowrider?.leoai) return null;

    try {
      const result = await window.flowrider.leoai.getQuickContext(projectId, language);
      if (result.success && result.data) {
        return result.data;
      }
    } catch (err) {
      console.error('[useLeoAI] Failed to get quick context:', err);
    }
    return null;
  }, []);

  // Trigger manual analysis
  const triggerAnalysis = useCallback(async () => {
    if (!window.flowrider?.leoai) return null;

    try {
      const result = await window.flowrider.leoai.analyze();
      if (result.success && result.data) {
        // Refresh data after analysis
        await Promise.all([fetchStatus(), fetchPatterns(), fetchInsights()]);
        return result.data;
      }
    } catch (err) {
      console.error('[useLeoAI] Failed to trigger analysis:', err);
    }
    return null;
  }, [fetchStatus, fetchPatterns, fetchInsights]);

  // Record feedback on a session
  const recordFeedback = useCallback(async (
    sessionId: string,
    signal: { type: string; value: number; context?: string }
  ) => {
    if (!window.flowrider?.leoai) return false;

    try {
      const result = await window.flowrider.leoai.recordFeedback(sessionId, signal);
      return result.success;
    } catch (err) {
      console.error('[useLeoAI] Failed to record feedback:', err);
      return false;
    }
  }, []);

  // Enable LEO AI
  const enable = useCallback(async () => {
    if (!window.flowrider?.leoai) return false;

    try {
      const result = await window.flowrider.leoai.enable();
      if (result.success) {
        await fetchStatus();
      }
      return result.success;
    } catch (err) {
      console.error('[useLeoAI] Failed to enable:', err);
      return false;
    }
  }, [fetchStatus]);

  // Disable LEO AI
  const disable = useCallback(async () => {
    if (!window.flowrider?.leoai) return false;

    try {
      const result = await window.flowrider.leoai.disable();
      if (result.success) {
        await fetchStatus();
      }
      return result.success;
    } catch (err) {
      console.error('[useLeoAI] Failed to disable:', err);
      return false;
    }
  }, [fetchStatus]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchStatus();
    fetchPatterns();
    fetchInsights();

    // Poll for new learning events every 30 seconds
    const eventInterval = setInterval(fetchLearningEvents, 30000);

    // Refresh status every 60 seconds
    const statusInterval = setInterval(fetchStatus, 60000);

    return () => {
      clearInterval(eventInterval);
      clearInterval(statusInterval);
    };
  }, [fetchStatus, fetchPatterns, fetchInsights, fetchLearningEvents]);

  return {
    status,
    patterns,
    insights,
    learningEvents,
    loading,
    fetchStatus,
    fetchPatterns,
    fetchInsights,
    getContext,
    getQuickContext,
    triggerAnalysis,
    recordFeedback,
    enable,
    disable,
  };
}
