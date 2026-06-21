/**
 * LeoAIView - LEO AI Learning System Dashboard
 *
 * Visualizes the self-improving learning system:
 * - Learning status and stats
 * - Pattern discovery
 * - Insights generated
 * - Code snippets collected
 * - Recent interactions
 */

import React, { useState, useEffect, useCallback } from 'react';

// Types from preload
interface LeoAIStatus {
  enabled: boolean;
  learning: boolean;
  stats: LeoStats;
  lastAnalysis: number | null;
  config: {
    analysisInterval: number;
    minInteractionsForAnalysis: number;
    autoLearn: boolean;
    defaultVerbosity: 'minimal' | 'normal' | 'detailed';
  };
}

interface LeoStats {
  totalInteractions: number;
  totalPatterns: number;
  totalInsights: number;
  totalSnippets: number;
  avgConfidence: number;
  topLanguages: string[];
  topProjects: string[];
}

interface Pattern {
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

interface Insight {
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

interface Interaction {
  id: string;
  sessionId: string;
  timestamp: number;
  prompt: string;
  response: string;
  tags: string[];
  outcome: 'success' | 'failure' | 'partial' | 'unknown';
  feedback: number;
  projectId?: string;
  language?: string;
  filesModified: string[];
  errorsSeen: string[];
}

export const LeoAIView: React.FC = () => {
  const [status, setStatus] = useState<LeoAIStatus | null>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'patterns' | 'insights' | 'interactions'>('overview');
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!window.flowrider?.leoai) return;

    try {
      const [statusRes, patternsRes, insightsRes, interactionsRes] = await Promise.all([
        window.flowrider.leoai.getStatus(),
        window.flowrider.leoai.getPatterns(0.3),
        window.flowrider.leoai.getInsights(20),
        window.flowrider.leoai.getInteractions(50),
      ]);

      if (statusRes.success) setStatus(statusRes.data);
      if (patternsRes.success) setPatterns(patternsRes.data);
      if (insightsRes.success) setInsights(insightsRes.data);
      if (interactionsRes.success) setInteractions(interactionsRes.data);
      setLastRefresh(Date.now());
    } catch (err) {
      console.error('[LeoAIView] Failed to fetch data:', err);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Toggle LEO AI
  const handleToggle = async () => {
    if (!window.flowrider?.leoai) return;

    try {
      if (status?.enabled) {
        await window.flowrider.leoai.disable();
      } else {
        await window.flowrider.leoai.enable();
      }
      fetchData();
    } catch (err) {
      console.error('[LeoAIView] Toggle error:', err);
    }
  };

  // Trigger analysis
  const handleAnalyze = async () => {
    if (!window.flowrider?.leoai) return;

    setIsAnalyzing(true);
    try {
      const result = await window.flowrider.leoai.analyze();
      console.log('[LeoAIView] Analysis result:', result);
      fetchData();
    } catch (err) {
      console.error('[LeoAIView] Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getPatternTypeColor = (type: string) => {
    switch (type) {
      case 'error': return '#ff4444';
      case 'code': return '#00ff88';
      case 'workflow': return '#00ffff';
      case 'prompt': return '#ff00ff';
      default: return '#888888';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'success': return '#00ff88';
      case 'failure': return '#ff4444';
      case 'partial': return '#ffaa00';
      default: return '#888888';
    }
  };

  return (
    <div className="leo-ai-view">
      {/* Hero Section */}
      <div className="leoai-hero">
        <div className="leoai-hero-left">
          <div className="leoai-title-section">
            <h2>LEO AI</h2>
            <p>Self-Improving Learning System</p>
            <p className="leoai-subtitle">
              Learns from every interaction across all sessions
            </p>
          </div>
          <div className="leoai-toggle">
            <span className={`status-indicator large ${status?.enabled ? 'enabled' : 'disabled'}`}>
              {status?.learning ? 'LEARNING' : status?.enabled ? 'ACTIVE' : 'STANDBY'}
            </span>
            <button
              className={`btn ${status?.enabled ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleToggle}
            >
              {status?.enabled ? 'Disable LEO AI' : 'Enable LEO AI'}
            </button>
            {status?.enabled && (
              <button
                className="btn btn-secondary"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                style={{ marginLeft: 8 }}
              >
                {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
              </button>
            )}
          </div>
        </div>

        {/* Brain Visualization */}
        <div className="leoai-brain">
          <div className={`brain-core ${status?.enabled ? 'active' : ''}`}>
            <div className="brain-ring ring-1" />
            <div className="brain-ring ring-2" />
            <div className="brain-ring ring-3" />
            <div className="brain-center">
              <span className="brain-icon">🧠</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="leoai-stats-grid">
        <div className="leoai-stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-value">{status?.stats.totalInteractions || 0}</div>
          <div className="stat-label">Interactions Learned</div>
        </div>
        <div className="leoai-stat-card">
          <div className="stat-icon">🔍</div>
          <div className="stat-value">{status?.stats.totalPatterns || 0}</div>
          <div className="stat-label">Patterns Detected</div>
        </div>
        <div className="leoai-stat-card">
          <div className="stat-icon">💡</div>
          <div className="stat-value">{status?.stats.totalInsights || 0}</div>
          <div className="stat-label">Insights Generated</div>
        </div>
        <div className="leoai-stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-value">{status?.stats.totalSnippets || 0}</div>
          <div className="stat-label">Code Snippets</div>
        </div>
        <div className="leoai-stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">
            {((status?.stats.avgConfidence || 0) * 100).toFixed(0)}%
          </div>
          <div className="stat-label">Avg Confidence</div>
        </div>
        <div className="leoai-stat-card wide">
          <div className="stat-icon">🏷️</div>
          <div className="stat-label">Top Languages</div>
          <div className="stat-tags">
            {(status?.stats.topLanguages || []).map((lang) => (
              <span key={lang} className="tag">{lang}</span>
            ))}
            {(!status?.stats.topLanguages || status.stats.topLanguages.length === 0) && (
              <span className="tag empty">No data yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="leoai-tabs">
        {(['overview', 'patterns', 'insights', 'interactions'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab ${selectedTab === tab ? 'active' : ''}`}
            onClick={() => setSelectedTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        <span className="refresh-time">
          Last refresh: {formatTime(lastRefresh)}
        </span>
      </div>

      {/* Tab Content */}
      <div className="leoai-content">
        {selectedTab === 'overview' && (
          <OverviewTab
            status={status}
            patterns={patterns}
            insights={insights}
            interactions={interactions}
          />
        )}

        {selectedTab === 'patterns' && (
          <PatternsTab
            patterns={patterns}
            getTypeColor={getPatternTypeColor}
            formatDate={formatDate}
          />
        )}

        {selectedTab === 'insights' && (
          <InsightsTab
            insights={insights}
            formatDate={formatDate}
          />
        )}

        {selectedTab === 'interactions' && (
          <InteractionsTab
            interactions={interactions}
            getOutcomeColor={getOutcomeColor}
            formatDate={formatDate}
          />
        )}
      </div>
    </div>
  );
};

// ============================================
// Overview Tab
// ============================================

interface OverviewTabProps {
  status: LeoAIStatus | null;
  patterns: Pattern[];
  insights: Insight[];
  interactions: Interaction[];
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  status,
  patterns,
  insights,
  interactions,
}) => {
  const recentPatterns = patterns.slice(0, 5);
  const recentInsights = insights.slice(0, 5);
  const recentInteractions = interactions.slice(0, 5);

  return (
    <div className="overview-tab">
      {/* Learning Status */}
      <div className="overview-section">
        <h3>Learning Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="label">Status</span>
            <span className={`value ${status?.enabled ? 'active' : ''}`}>
              {status?.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="status-item">
            <span className="label">Auto-Learn</span>
            <span className="value">
              {status?.config.autoLearn ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="status-item">
            <span className="label">Analysis Interval</span>
            <span className="value">
              {((status?.config.analysisInterval || 0) / 60000).toFixed(0)} min
            </span>
          </div>
          <div className="status-item">
            <span className="label">Last Analysis</span>
            <span className="value">
              {status?.lastAnalysis
                ? new Date(status.lastAnalysis).toLocaleTimeString()
                : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="overview-columns">
        {/* Recent Patterns */}
        <div className="overview-column">
          <h4>Recent Patterns</h4>
          {recentPatterns.length === 0 ? (
            <div className="empty-state">No patterns detected yet</div>
          ) : (
            <div className="mini-list">
              {recentPatterns.map((p) => (
                <div key={p.id} className="mini-item">
                  <span
                    className="type-badge"
                    style={{ background: getPatternTypeColor(p.type) }}
                  >
                    {p.type}
                  </span>
                  <span className="pattern-text">{p.pattern.slice(0, 50)}...</span>
                  <span className="confidence">{(p.confidence * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Insights */}
        <div className="overview-column">
          <h4>Recent Insights</h4>
          {recentInsights.length === 0 ? (
            <div className="empty-state">No insights generated yet</div>
          ) : (
            <div className="mini-list">
              {recentInsights.map((i) => (
                <div key={i.id} className="mini-item">
                  <span className="category-badge">{i.category}</span>
                  <span className="insight-text">{i.content.slice(0, 50)}...</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="overview-section how-it-works">
        <h3>How LEO AI Works</h3>
        <div className="process-flow">
          <div className="process-step">
            <div className="step-icon">👁️</div>
            <div className="step-title">Observe</div>
            <div className="step-desc">Watches all session interactions</div>
          </div>
          <div className="process-arrow">→</div>
          <div className="process-step">
            <div className="step-icon">🔍</div>
            <div className="step-title">Analyze</div>
            <div className="step-desc">Detects patterns & errors</div>
          </div>
          <div className="process-arrow">→</div>
          <div className="process-step">
            <div className="step-icon">💡</div>
            <div className="step-title">Learn</div>
            <div className="step-desc">Generates actionable insights</div>
          </div>
          <div className="process-arrow">→</div>
          <div className="process-step">
            <div className="step-icon">🚀</div>
            <div className="step-title">Apply</div>
            <div className="step-desc">Improves future responses</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper for overview
const getPatternTypeColor = (type: string) => {
  switch (type) {
    case 'error': return '#ff4444';
    case 'code': return '#00ff88';
    case 'workflow': return '#00ffff';
    case 'prompt': return '#ff00ff';
    default: return '#888888';
  }
};

// ============================================
// Patterns Tab
// ============================================

interface PatternsTabProps {
  patterns: Pattern[];
  getTypeColor: (type: string) => string;
  formatDate: (timestamp: number) => string;
}

const PatternsTab: React.FC<PatternsTabProps> = ({
  patterns,
  getTypeColor,
  formatDate,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredPatterns = filterType === 'all'
    ? patterns
    : patterns.filter((p) => p.type === filterType);

  const patternTypes = ['all', 'error', 'code', 'workflow', 'prompt'];

  return (
    <div className="patterns-tab">
      <div className="patterns-header">
        <h3>Detected Patterns ({filteredPatterns.length})</h3>
        <div className="filter-buttons">
          {patternTypes.map((type) => (
            <button
              key={type}
              className={`filter-btn ${filterType === type ? 'active' : ''}`}
              onClick={() => setFilterType(type)}
              style={{
                borderColor: type === 'all' ? '#888' : getTypeColor(type),
              }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredPatterns.length === 0 ? (
        <div className="empty-state large">
          <div className="empty-icon">🔍</div>
          <h4>No Patterns Yet</h4>
          <p>LEO AI will detect patterns as you interact with sessions.</p>
        </div>
      ) : (
        <div className="patterns-list">
          {filteredPatterns.map((pattern) => (
            <div key={pattern.id} className="pattern-card">
              <div className="pattern-header">
                <span
                  className="pattern-type"
                  style={{ background: getTypeColor(pattern.type) }}
                >
                  {pattern.type.toUpperCase()}
                </span>
                <span className="pattern-confidence">
                  {(pattern.confidence * 100).toFixed(0)}% confidence
                </span>
                <span className="pattern-frequency">
                  Seen {pattern.frequency}x
                </span>
              </div>
              <div className="pattern-content">
                <pre>{pattern.pattern}</pre>
              </div>
              {pattern.resolution && (
                <div className="pattern-resolution">
                  <span className="resolution-label">Resolution:</span>
                  <span className="resolution-text">{pattern.resolution}</span>
                </div>
              )}
              <div className="pattern-meta">
                {pattern.language && (
                  <span className="meta-tag">{pattern.language}</span>
                )}
                {pattern.tags.map((tag) => (
                  <span key={tag} className="meta-tag">{tag}</span>
                ))}
                <span className="meta-time">Last seen: {formatDate(pattern.lastSeen)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// Insights Tab
// ============================================

interface InsightsTabProps {
  insights: Insight[];
  formatDate: (timestamp: number) => string;
}

const InsightsTab: React.FC<InsightsTabProps> = ({
  insights,
  formatDate,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = ['all', ...new Set(insights.map((i) => i.category))];
  const filteredInsights = filterCategory === 'all'
    ? insights
    : insights.filter((i) => i.category === filterCategory);

  return (
    <div className="insights-tab">
      <div className="insights-header">
        <h3>Generated Insights ({filteredInsights.length})</h3>
        <div className="filter-buttons">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${filterCategory === cat ? 'active' : ''}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredInsights.length === 0 ? (
        <div className="empty-state large">
          <div className="empty-icon">💡</div>
          <h4>No Insights Yet</h4>
          <p>LEO AI generates insights by analyzing patterns across sessions.</p>
        </div>
      ) : (
        <div className="insights-list">
          {filteredInsights.map((insight) => (
            <div key={insight.id} className="insight-card">
              <div className="insight-header">
                <span className="insight-category">{insight.category}</span>
                <span className="insight-confidence">
                  {(insight.confidence * 100).toFixed(0)}% confidence
                </span>
                <span className="insight-effectiveness">
                  {(insight.effectiveness * 100).toFixed(0)}% effective
                </span>
              </div>
              <div className="insight-content">
                {insight.content}
              </div>
              <div className="insight-meta">
                <span className="meta-usage">Used {insight.usageCount}x</span>
                {insight.applicableLanguages.map((lang) => (
                  <span key={lang} className="meta-tag">{lang}</span>
                ))}
                <span className="meta-time">Created: {formatDate(insight.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// Interactions Tab
// ============================================

interface InteractionsTabProps {
  interactions: Interaction[];
  getOutcomeColor: (outcome: string) => string;
  formatDate: (timestamp: number) => string;
}

const InteractionsTab: React.FC<InteractionsTabProps> = ({
  interactions,
  getOutcomeColor,
  formatDate,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="interactions-tab">
      <div className="interactions-header">
        <h3>Recent Interactions ({interactions.length})</h3>
      </div>

      {interactions.length === 0 ? (
        <div className="empty-state large">
          <div className="empty-icon">💬</div>
          <h4>No Interactions Recorded</h4>
          <p>Interactions will appear here as you use sessions.</p>
        </div>
      ) : (
        <div className="interactions-list">
          {interactions.map((interaction) => (
            <div
              key={interaction.id}
              className={`interaction-card ${expandedId === interaction.id ? 'expanded' : ''}`}
              onClick={() => setExpandedId(
                expandedId === interaction.id ? null : interaction.id
              )}
            >
              <div className="interaction-header">
                <span
                  className="interaction-outcome"
                  style={{ background: getOutcomeColor(interaction.outcome) }}
                >
                  {interaction.outcome}
                </span>
                <span className="interaction-session">
                  Session: {interaction.sessionId.slice(0, 8)}...
                </span>
                <span className="interaction-time">
                  {formatDate(interaction.timestamp)}
                </span>
              </div>
              <div className="interaction-prompt">
                <span className="label">Prompt:</span>
                {interaction.prompt.slice(0, 100)}
                {interaction.prompt.length > 100 && '...'}
              </div>
              {expandedId === interaction.id && (
                <div className="interaction-details">
                  <div className="detail-section">
                    <h5>Full Prompt</h5>
                    <pre>{interaction.prompt}</pre>
                  </div>
                  <div className="detail-section">
                    <h5>Response Preview</h5>
                    <pre>{interaction.response.slice(0, 500)}...</pre>
                  </div>
                  {interaction.errorsSeen.length > 0 && (
                    <div className="detail-section">
                      <h5>Errors Detected</h5>
                      <ul>
                        {interaction.errorsSeen.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {interaction.filesModified.length > 0 && (
                    <div className="detail-section">
                      <h5>Files Modified</h5>
                      <ul>
                        {interaction.filesModified.map((file, i) => (
                          <li key={i}>{file}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="interaction-tags">
                    {interaction.tags.map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeoAIView;
