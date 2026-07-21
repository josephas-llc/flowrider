/**
 * ZOIX Database Usage Examples
 *
 * This file demonstrates how to use the ZOIX learning database
 * in React components within the Flowrider frontend.
 */

import React, { useEffect, useState } from 'react';

// ============================================
// Example 1: Display Pattern Statistics
// ============================================

export const PatternStatsWidget: React.FC = () => {
  const [stats, setStats] = useState<{
    code: number;
    error: number;
    workflow: number;
    prompt: number;
    architecture: number;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const result = await window.flowrider.leoai.getPatternCounts();
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Failed to load pattern stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();

    // Optionally refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading patterns...</div>;
  if (!stats) return <div>No pattern data available</div>;

  return (
    <div className="pattern-stats">
      <h3>ZOIX Learning Progress</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Total Patterns</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Error Patterns</span>
          <span className="stat-value">{stats.error}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Code Patterns</span>
          <span className="stat-value">{stats.code}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Workflow Patterns</span>
          <span className="stat-value">{stats.workflow}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Example 2: Display Recent Interactions
// ============================================

export const RecentInteractionsPanel: React.FC = () => {
  const [interactions, setInteractions] = useState<any[]>([]);

  useEffect(() => {
    const loadInteractions = async () => {
      const result = await window.flowrider.leoai.getInteractions(10);
      if (result.success) {
        setInteractions(result.data);
      }
    };

    loadInteractions();
  }, []);

  return (
    <div className="interactions-panel">
      <h3>Recent Learning Interactions</h3>
      {interactions.map((interaction) => (
        <div key={interaction.id} className="interaction-card">
          <div className="timestamp">
            {new Date(interaction.timestamp).toLocaleString()}
          </div>
          <div className="prompt">{interaction.prompt.substring(0, 100)}...</div>
          <div className="outcome-badge" data-outcome={interaction.outcome}>
            {interaction.outcome}
          </div>
          {interaction.userFeedback && (
            <div className="feedback">
              Feedback: {interaction.userFeedback > 0 ? '👍' : '👎'}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================
// Example 3: Error Pattern Browser
// ============================================

export const ErrorPatternBrowser: React.FC = () => {
  const [errorPatterns, setErrorPatterns] = useState<any[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<any | null>(null);

  useEffect(() => {
    const loadErrorPatterns = async () => {
      const result = await window.flowrider.leoai.getPatternsByType('error');
      if (result.success) {
        setErrorPatterns(result.data);
      }
    };

    loadErrorPatterns();
  }, []);

  return (
    <div className="error-patterns">
      <h3>Known Error Patterns</h3>
      <div className="pattern-list">
        {errorPatterns.map((pattern) => (
          <div
            key={pattern.id}
            className="pattern-item"
            onClick={() => setSelectedPattern(pattern)}
          >
            <div className="pattern-name">{pattern.name}</div>
            <div className="pattern-meta">
              <span className="confidence">
                Confidence: {(pattern.confidence * 100).toFixed(0)}%
              </span>
              <span className="occurrences">Seen {pattern.occurrences}x</span>
            </div>
          </div>
        ))}
      </div>

      {selectedPattern && (
        <div className="pattern-detail">
          <h4>{selectedPattern.name}</h4>
          <p>{selectedPattern.description}</p>
          {selectedPattern.solution && (
            <div className="solution">
              <strong>Solution:</strong>
              <pre>{selectedPattern.solution}</pre>
            </div>
          )}
          <div className="pattern-context">
            <strong>Context:</strong>
            <pre>{JSON.stringify(JSON.parse(selectedPattern.context), null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// Example 4: Learning Dashboard with Full Stats
// ============================================

export const LearningDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const [statsResult, statusResult] = await Promise.all([
        window.flowrider.leoai.getStats(),
        window.flowrider.leoai.getStatus(),
      ]);

      if (statsResult.success) setStats(statsResult.data);
      if (statusResult.success) setStatus(statusResult.data);
    };

    loadData();
  }, []);

  if (!stats || !status) return <div>Loading...</div>;

  return (
    <div className="learning-dashboard">
      <div className="dashboard-header">
        <h2>ZOIX Learning System</h2>
        <div className={`status-indicator ${status.enabled ? 'active' : 'inactive'}`}>
          {status.enabled ? 'Learning Active' : 'Learning Paused'}
        </div>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <h3>{stats.totalInteractions}</h3>
          <p>Total Interactions</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalPatterns}</h3>
          <p>Patterns Detected</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalInsights}</h3>
          <p>Insights Generated</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalSnippets}</h3>
          <p>Code Snippets</p>
        </div>
      </div>

      <div className="learning-metrics">
        <div className="metric">
          <span>Average Confidence:</span>
          <strong>{(stats.averageConfidence * 100).toFixed(1)}%</strong>
        </div>
        <div className="metric">
          <span>Learning Rate:</span>
          <strong>{stats.learningRate.toFixed(1)} insights per 100 interactions</strong>
        </div>
        <div className="metric">
          <span>Recent Activity (24h):</span>
          <strong>{stats.recentActivity} interactions</strong>
        </div>
      </div>

      {stats.topCategories && stats.topCategories.length > 0 && (
        <div className="top-categories">
          <h3>Top Learning Categories</h3>
          <ul>
            {stats.topCategories.map((cat: any) => (
              <li key={cat.category}>
                <span>{cat.category}</span>
                <span>{cat.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ============================================
// Example 5: Record Feedback After Interaction
// ============================================

export const InteractionFeedbackButton: React.FC<{
  sessionId: string;
  onFeedbackRecorded?: () => void;
}> = ({ sessionId, onFeedbackRecorded }) => {
  const recordFeedback = async (value: number) => {
    try {
      await window.flowrider.leoai.recordFeedback(sessionId, {
        type: 'suggestion_quality',
        value,
        context: 'User manually rated the suggestion',
      });
      onFeedbackRecorded?.();
    } catch (error) {
      console.error('Failed to record feedback:', error);
    }
  };

  return (
    <div className="feedback-buttons">
      <button onClick={() => recordFeedback(1)}>👍 Helpful</button>
      <button onClick={() => recordFeedback(-1)}>👎 Not Helpful</button>
    </div>
  );
};

// ============================================
// Example 6: Smart Suggestions Based on Context
// ============================================

export const SmartSuggestionsPanel: React.FC<{
  sessionId: string;
  projectId?: string;
  workingDir?: string;
}> = ({ sessionId, projectId, workingDir }) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    const loadSuggestions = async () => {
      const result = await window.flowrider.leoai.getSuggestions({
        sessionId,
        projectId,
        workingDir,
        limit: 5,
      });

      if (result.success) {
        setSuggestions(result.data);
      }
    };

    loadSuggestions();
  }, [sessionId, projectId, workingDir]);

  const handleDismiss = async (suggestionId: string) => {
    await window.flowrider.leoai.dismissSuggestion(suggestionId);
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  };

  const handleAccept = async (suggestionId: string) => {
    await window.flowrider.leoai.recordSuggestionAction(suggestionId, true);
    // Handle the action based on suggestion type
  };

  return (
    <div className="suggestions-panel">
      <h3>Smart Suggestions</h3>
      {suggestions.length === 0 ? (
        <p>No suggestions available</p>
      ) : (
        suggestions.map((suggestion) => (
          <div key={suggestion.id} className="suggestion-card">
            <div className="suggestion-header">
              <span className="suggestion-type">{suggestion.type}</span>
              <span className="confidence">
                {(suggestion.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <h4>{suggestion.title}</h4>
            <p>{suggestion.description}</p>
            <div className="suggestion-actions">
              <button onClick={() => handleAccept(suggestion.id)}>Apply</button>
              <button onClick={() => handleDismiss(suggestion.id)}>Dismiss</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ============================================
// Example 7: Code Snippet Search
// ============================================

export const SnippetSearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [snippets, setSnippets] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    const result = await window.flowrider.leoai.searchSnippets(query);
    if (result.success) {
      setSnippets(result.data);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    // Show toast notification
  };

  return (
    <div className="snippet-search">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search code snippets..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      <div className="snippet-results">
        {snippets.map((snippet) => (
          <div key={snippet.id} className="snippet-card">
            <div className="snippet-header">
              <span className="language">{snippet.language}</span>
              <span className="success-rate">
                {(snippet.successRate * 100).toFixed(0)}% success
              </span>
            </div>
            <h4>{snippet.purpose}</h4>
            <pre className="code-block">{snippet.code}</pre>
            <button onClick={() => copyToClipboard(snippet.code)}>
              Copy to Clipboard
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// Example 8: Trigger Manual Analysis
// ============================================

export const AnalyzeButton: React.FC = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const analysisResult = await window.flowrider.leoai.analyze();
      if (analysisResult.success) {
        setResult(analysisResult.data);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="analyze-section">
      <button onClick={handleAnalyze} disabled={analyzing}>
        {analyzing ? 'Analyzing...' : 'Analyze Patterns Now'}
      </button>

      {result && (
        <div className="analysis-result">
          <p>Found {result.patternsFound} new patterns</p>
          <p>Generated {result.insightsGenerated} insights</p>
          <p>Extracted {result.snippetsExtracted} code snippets</p>
          <p>Completed in {result.duration}ms</p>
        </div>
      )}
    </div>
  );
};

// ============================================
// CSS Example (add to your stylesheet)
// ============================================

/*
.pattern-stats {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #00ff88;
}

.interaction-card {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.outcome-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.outcome-badge[data-outcome="success"] {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

.outcome-badge[data-outcome="failure"] {
  background: rgba(255, 68, 68, 0.2);
  color: #ff4444;
}

.status-indicator {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: bold;
}

.status-indicator.active {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

.status-indicator.inactive {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
}
*/
