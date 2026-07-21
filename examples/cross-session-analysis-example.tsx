/**
 * Example: Cross-Session Analysis Component
 *
 * This example shows how to use the Cross-Session Analysis system
 * in a React component to display session similarities and insights.
 */

import React, { useState, useEffect } from 'react';

// Type definitions (these would normally come from preload types)
interface CrossSessionInsight {
  id: string;
  type: 'pattern-similarity' | 'workflow-match' | 'code-reuse' | 'error-solution' | 'collaboration';
  title: string;
  description: string;
  affectedSessions: string[];
  actionable: boolean;
  action?: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
  dismissed: boolean;
}

interface SessionSimilarity {
  session1Id: string;
  session1Name: string;
  session2Id: string;
  session2Name: string;
  similarityScore: number;
  sharedPatterns: any[];
  sharedWorkflows: any[];
  reuseOpportunities: any[];
  timestamp: number;
}

interface SessionPatternSummary {
  sessionId: string;
  sessionName: string;
  topPatterns: {
    type: string;
    name: string;
    count: number;
    confidence: number;
  }[];
  dominantWorkflows: string[][];
  codeLanguages: string[];
  errorTypes: string[];
  activityLevel: 'low' | 'medium' | 'high';
  lastAnalyzed: number;
}

// Example Component
export const CrossSessionAnalysisPanel: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [insights, setInsights] = useState<CrossSessionInsight[]>([]);
  const [similarities, setSimilarities] = useState<SessionSimilarity[]>([]);
  const [summary, setSummary] = useState<SessionPatternSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [sessionId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get session summary
      const summaryResult = await window.api.crossSession.getSessionSummary(sessionId);
      if (summaryResult.success) {
        setSummary(summaryResult.data);
      }

      // Get similarities
      const simResult = await window.api.crossSession.getSimilarities(sessionId);
      if (simResult.success) {
        setSimilarities(simResult.data);
      }

      // Get insights
      const insightResult = await window.api.crossSession.getInsights(sessionId);
      if (insightResult.success) {
        setInsights(insightResult.data);
      }
    } catch (error) {
      console.error('Failed to load cross-session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await window.api.crossSession.analyze();
      if (result.success) {
        console.log('Analysis complete:', result.data);
        // Reload data
        await loadData();
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const dismissInsight = async (insightId: string) => {
    try {
      await window.api.crossSession.dismissInsight(insightId);
      setInsights(insights.filter(i => i.id !== insightId));
    } catch (error) {
      console.error('Failed to dismiss insight:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading cross-session analysis...</div>;
  }

  return (
    <div className="cross-session-analysis">
      <header className="header">
        <h2>Cross-Session Analysis</h2>
        <button onClick={runAnalysis} disabled={analyzing}>
          {analyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </header>

      {/* Session Summary */}
      {summary && (
        <section className="summary">
          <h3>Session: {summary.sessionName}</h3>
          <div className="summary-grid">
            <div className="stat">
              <label>Activity Level</label>
              <span className={`activity-${summary.activityLevel}`}>
                {summary.activityLevel}
              </span>
            </div>
            <div className="stat">
              <label>Languages</label>
              <span>{summary.codeLanguages.join(', ') || 'None'}</span>
            </div>
            <div className="stat">
              <label>Top Patterns</label>
              <span>{summary.topPatterns.length}</span>
            </div>
          </div>

          {/* Top Patterns */}
          {summary.topPatterns.length > 0 && (
            <div className="top-patterns">
              <h4>Top Patterns</h4>
              <ul>
                {summary.topPatterns.slice(0, 5).map((pattern, idx) => (
                  <li key={idx}>
                    <span className="pattern-name">{pattern.name}</span>
                    <span className="pattern-count">{pattern.count}x</span>
                    <span className="pattern-confidence">
                      {(pattern.confidence * 100).toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* High-Priority Insights */}
      {insights.length > 0 && (
        <section className="insights">
          <h3>Insights ({insights.length})</h3>
          {insights.map(insight => (
            <div key={insight.id} className={`insight priority-${insight.priority}`}>
              <div className="insight-header">
                <span className="insight-type">{insight.type}</span>
                <span className="insight-priority">{insight.priority}</span>
                <button
                  onClick={() => dismissInsight(insight.id)}
                  className="dismiss-btn"
                >
                  ×
                </button>
              </div>
              <h4>{insight.title}</h4>
              <p>{insight.description}</p>
              {insight.actionable && insight.action && (
                <div className="action">
                  <strong>Action:</strong> {insight.action}
                </div>
              )}
              <div className="affected-sessions">
                <small>Affects {insight.affectedSessions.length} sessions</small>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Similar Sessions */}
      {similarities.length > 0 && (
        <section className="similarities">
          <h3>Similar Sessions</h3>
          {similarities.map((sim, idx) => (
            <div key={idx} className="similarity-card">
              <div className="similarity-header">
                <span className="session-name">
                  {sim.session1Id === sessionId ? sim.session2Name : sim.session1Name}
                </span>
                <span className="similarity-score">
                  {(sim.similarityScore * 100).toFixed(0)}% similar
                </span>
              </div>

              <div className="similarity-details">
                <div className="detail">
                  <label>Shared Patterns:</label>
                  <span>{sim.sharedPatterns.length}</span>
                </div>
                <div className="detail">
                  <label>Shared Workflows:</label>
                  <span>{sim.sharedWorkflows.length}</span>
                </div>
                <div className="detail">
                  <label>Reuse Opportunities:</label>
                  <span>{sim.reuseOpportunities.length}</span>
                </div>
              </div>

              {/* Reuse Opportunities */}
              {sim.reuseOpportunities.length > 0 && (
                <div className="opportunities">
                  <h5>Reuse Opportunities:</h5>
                  <ul>
                    {sim.reuseOpportunities.slice(0, 3).map((opp, oppIdx) => (
                      <li key={oppIdx}>
                        <strong>{opp.title}</strong>
                        <p>{opp.description}</p>
                        {opp.estimatedTimeSaved && (
                          <small>Could save: {opp.estimatedTimeSaved}</small>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Empty State */}
      {!loading && insights.length === 0 && similarities.length === 0 && (
        <div className="empty-state">
          <p>No cross-session insights available yet.</p>
          <p>Run analysis to discover patterns and similarities.</p>
          <button onClick={runAnalysis}>Run First Analysis</button>
        </div>
      )}
    </div>
  );
};

// Example CSS (would be in a separate file)
const exampleStyles = `
.cross-session-analysis {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin: 15px 0;
}

.stat {
  background: rgba(255, 255, 255, 0.05);
  padding: 15px;
  border-radius: 8px;
}

.stat label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 5px;
}

.activity-high { color: #4ade80; }
.activity-medium { color: #fbbf24; }
.activity-low { color: #94a3b8; }

.insight {
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 4px;
}

.insight.priority-high { border-color: #ef4444; }
.insight.priority-medium { border-color: #f59e0b; }
.insight.priority-low { border-color: #3b82f6; }

.insight-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.similarity-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 8px;
}

.similarity-score {
  color: #4ade80;
  font-weight: bold;
}

.opportunities ul {
  list-style: none;
  padding: 0;
}

.opportunities li {
  background: rgba(255, 255, 255, 0.03);
  padding: 10px;
  margin: 5px 0;
  border-radius: 4px;
}
`;

// Example: Simple Dashboard
export const CrossSessionDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [allInsights, setAllInsights] = useState<CrossSessionInsight[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get stats
      const statsResult = await window.api.crossSession.getStats();
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // Get all insights
      const insightResult = await window.api.crossSession.getInsights();
      if (insightResult.success) {
        setAllInsights(insightResult.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  return (
    <div className="dashboard">
      <h2>Cross-Session Analysis Dashboard</h2>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>{stats.totalInsights}</h3>
            <p>Total Insights</p>
          </div>
          <div className="stat-card">
            <h3>{stats.activeInsights}</h3>
            <p>Active Insights</p>
          </div>
          <div className="stat-card">
            <h3>{stats.cachedSessions}</h3>
            <p>Cached Sessions</p>
          </div>
        </div>
      )}

      {/* High-priority insights across all sessions */}
      <div className="global-insights">
        <h3>Global Insights</h3>
        {allInsights
          .filter(i => i.priority === 'high')
          .slice(0, 5)
          .map(insight => (
            <div key={insight.id} className="global-insight">
              <h4>{insight.title}</h4>
              <p>{insight.description}</p>
            </div>
          ))}
      </div>
    </div>
  );
};

export default CrossSessionAnalysisPanel;
