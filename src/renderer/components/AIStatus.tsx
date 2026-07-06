import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import { useAICore } from '../hooks/useAICore';

// Error boundary to prevent crashes
class AIStatusErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AIStatusType] Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="leo-status-mini" style={{ background: 'rgba(255,100,100,0.2)', border: '1px solid rgba(255,100,100,0.4)' }}>
          <span className="leo-indicator" style={{ background: '#ff6464' }} />
          <span style={{ color: '#ff6464' }}>AI System Error</span>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginLeft: 8, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AIStatusContent: React.FC = () => {
  const {
    status,
    patterns,
    insights,
    learningEvents,
    loading,
    triggerAnalysis,
    enable,
    disable,
  } = useAICore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    await triggerAnalysis();
    setIsAnalyzing(false);
  };

  if (loading || !status) {
    return (
      <div className="leo-status-mini">
        <span className="leo-indicator loading" />
        <span>AI System Loading...</span>
      </div>
    );
  }

  const formatNumber = (n: number) => {
    if (n < 1000) return n.toString();
    if (n < 1000000) return `${(n / 1000).toFixed(1)}K`;
    return `${(n / 1000000).toFixed(2)}M`;
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="leo-status-container">
      {/* Mini status bar */}
      <div
        className="leo-status-mini"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
      >
        <span className={`leo-indicator ${status.enabled ? 'active' : 'inactive'}`} />
        <span className="leo-label">AI System</span>
        {status.learning && (
          <span className="leo-learning-badge">Learning</span>
        )}
        <div className="leo-mini-stats">
          <span>{formatNumber(status.stats.totalInteractions)} interactions</span>
          <span>{formatNumber(status.stats.totalPatterns)} patterns</span>
          <span>{formatNumber(status.stats.totalInsights)} insights</span>
        </div>
        <span className="leo-expand-icon">{isExpanded ? '−' : '+'}</span>
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="leo-status-expanded">
          {/* Header with controls */}
          <div className="leo-header">
            <h3>AI System Learning System</h3>
            <div className="leo-controls">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="leo-btn leo-btn-primary"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Now'}
              </button>
              <button
                onClick={() => status.enabled ? disable() : enable()}
                className={`leo-btn ${status.enabled ? 'leo-btn-danger' : 'leo-btn-success'}`}
              >
                {status.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>

          {/* Stats grid */}
          <div className="leo-stats-grid">
            <div className="leo-stat-card">
              <div className="leo-stat-value">{formatNumber(status.stats.totalInteractions)}</div>
              <div className="leo-stat-label">Interactions</div>
            </div>
            <div className="leo-stat-card">
              <div className="leo-stat-value">{formatNumber(status.stats.totalPatterns)}</div>
              <div className="leo-stat-label">Patterns</div>
            </div>
            <div className="leo-stat-card">
              <div className="leo-stat-value">{formatNumber(status.stats.totalInsights)}</div>
              <div className="leo-stat-label">Insights</div>
            </div>
            <div className="leo-stat-card">
              <div className="leo-stat-value">{formatNumber(status.stats.totalSnippets)}</div>
              <div className="leo-stat-label">Snippets</div>
            </div>
            <div className="leo-stat-card">
              <div className="leo-stat-value">{(status.stats.avgConfidence * 100).toFixed(0)}%</div>
              <div className="leo-stat-label">Avg Confidence</div>
            </div>
            <div className="leo-stat-card">
              <div className="leo-stat-value">{formatTime(status.lastAnalysis)}</div>
              <div className="leo-stat-label">Last Analysis</div>
            </div>
          </div>

          {/* Top languages & projects */}
          <div className="leo-lists">
            {(status.stats.topLanguages?.length ?? 0) > 0 && (
              <div className="leo-list">
                <h4>Top Languages</h4>
                <div className="leo-tags">
                  {status.stats.topLanguages.slice(0, 5).map(lang => (
                    <span key={lang} className="leo-tag leo-tag-language">{lang}</span>
                  ))}
                </div>
              </div>
            )}
            {(status.stats.topProjects?.length ?? 0) > 0 && (
              <div className="leo-list">
                <h4>Active Projects</h4>
                <div className="leo-tags">
                  {status.stats.topProjects.slice(0, 5).map(proj => (
                    <span key={proj} className="leo-tag leo-tag-project">{proj}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent insights */}
          {(insights?.length ?? 0) > 0 && (
            <div className="leo-insights">
              <h4>Recent Insights</h4>
              <div className="leo-insight-list">
                {insights.slice(0, 3).map(insight => (
                  <div key={insight.id} className="leo-insight-card">
                    <div className="leo-insight-category">{insight.category}</div>
                    <div className="leo-insight-content">{insight.content}</div>
                    <div className="leo-insight-meta">
                      <span className="leo-confidence">
                        {(insight.confidence * 100).toFixed(0)}% confidence
                      </span>
                      <span className="leo-usage">
                        Used {insight.usageCount} times
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent patterns */}
          {(patterns?.length ?? 0) > 0 && (
            <div className="leo-patterns">
              <h4>Detected Patterns</h4>
              <div className="leo-pattern-list">
                {patterns.slice(0, 5).map(pattern => (
                  <div key={pattern.id} className="leo-pattern-card">
                    <div className="leo-pattern-header">
                      <span className={`leo-pattern-type leo-pattern-type-${pattern.type}`}>
                        {pattern.type}
                      </span>
                      <span className="leo-pattern-frequency">
                        {pattern.frequency}x
                      </span>
                    </div>
                    <div className="leo-pattern-text">
                      {pattern.pattern.substring(0, 100)}
                      {pattern.pattern.length > 100 ? '...' : ''}
                    </div>
                    {pattern.resolution && (
                      <div className="leo-pattern-resolution">
                        Resolution: {pattern.resolution.substring(0, 80)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning activity */}
          {(learningEvents?.length ?? 0) > 0 && (
            <div className="leo-activity">
              <h4>Recent Learning Activity</h4>
              <div className="leo-activity-list">
                {learningEvents.slice(0, 5).map(event => (
                  <div key={event.id} className="leo-activity-item">
                    <span className="leo-activity-type">{event.type}</span>
                    <span className="leo-activity-time">{formatTime(event.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .leo-status-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          font-family: 'SF Mono', 'Fira Code', monospace;
        }

        .leo-status-mini {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(10, 10, 15, 0.95);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 11px;
          color: #e0e0e0;
        }

        .leo-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .leo-indicator.active {
          background: #00ffaa;
          box-shadow: 0 0 8px #00ffaa;
        }

        .leo-indicator.inactive {
          background: #666;
        }

        .leo-indicator.loading {
          background: #ffaa00;
          animation: blink 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .leo-label {
          font-weight: 600;
          color: #00ffff;
        }

        .leo-learning-badge {
          background: rgba(0, 255, 170, 0.2);
          border: 1px solid rgba(0, 255, 170, 0.4);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          color: #00ffaa;
        }

        .leo-mini-stats {
          display: flex;
          gap: 12px;
          color: #888;
          font-size: 10px;
        }

        .leo-expand-icon {
          color: #666;
          font-size: 14px;
          margin-left: 8px;
        }

        .leo-status-expanded {
          position: absolute;
          bottom: 100%;
          right: 0;
          width: 400px;
          max-height: 70vh;
          overflow-y: auto;
          background: rgba(10, 10, 15, 0.98);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 12px;
          margin-bottom: 8px;
          padding: 16px;
        }

        .leo-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .leo-header h3 {
          margin: 0;
          font-size: 14px;
          color: #00ffff;
        }

        .leo-controls {
          display: flex;
          gap: 8px;
        }

        .leo-btn {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 10px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }

        .leo-btn-primary {
          background: rgba(0, 255, 255, 0.2);
          border: 1px solid rgba(0, 255, 255, 0.4);
          color: #00ffff;
        }

        .leo-btn-primary:hover {
          background: rgba(0, 255, 255, 0.3);
        }

        .leo-btn-success {
          background: rgba(0, 255, 170, 0.2);
          border: 1px solid rgba(0, 255, 170, 0.4);
          color: #00ffaa;
        }

        .leo-btn-danger {
          background: rgba(255, 100, 100, 0.2);
          border: 1px solid rgba(255, 100, 100, 0.4);
          color: #ff6464;
        }

        .leo-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .leo-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .leo-stat-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          padding: 8px;
          text-align: center;
        }

        .leo-stat-value {
          font-size: 16px;
          font-weight: 600;
          color: #00ffff;
        }

        .leo-stat-label {
          font-size: 9px;
          color: #666;
          text-transform: uppercase;
          margin-top: 4px;
        }

        .leo-lists {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .leo-list {
          flex: 1;
        }

        .leo-list h4, .leo-insights h4, .leo-patterns h4, .leo-activity h4 {
          font-size: 11px;
          color: #888;
          margin: 0 0 8px 0;
          text-transform: uppercase;
        }

        .leo-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .leo-tag {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
        }

        .leo-tag-language {
          background: rgba(0, 200, 255, 0.15);
          color: #00c8ff;
        }

        .leo-tag-project {
          background: rgba(255, 200, 0, 0.15);
          color: #ffc800;
        }

        .leo-insights, .leo-patterns, .leo-activity {
          margin-bottom: 16px;
        }

        .leo-insight-card {
          background: rgba(0, 255, 170, 0.05);
          border: 1px solid rgba(0, 255, 170, 0.15);
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 8px;
        }

        .leo-insight-category {
          font-size: 9px;
          color: #00ffaa;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .leo-insight-content {
          font-size: 12px;
          color: #e0e0e0;
          line-height: 1.4;
        }

        .leo-insight-meta {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          font-size: 9px;
          color: #666;
        }

        .leo-pattern-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          padding: 8px;
          margin-bottom: 6px;
        }

        .leo-pattern-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .leo-pattern-type {
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 3px;
          text-transform: uppercase;
        }

        .leo-pattern-type-error {
          background: rgba(255, 100, 100, 0.2);
          color: #ff6464;
        }

        .leo-pattern-type-code {
          background: rgba(0, 200, 255, 0.2);
          color: #00c8ff;
        }

        .leo-pattern-type-workflow {
          background: rgba(200, 100, 255, 0.2);
          color: #c864ff;
        }

        .leo-pattern-type-prompt {
          background: rgba(255, 200, 0, 0.2);
          color: #ffc800;
        }

        .leo-pattern-frequency {
          font-size: 10px;
          color: #888;
        }

        .leo-pattern-text {
          font-size: 11px;
          color: #ccc;
          font-family: 'SF Mono', monospace;
        }

        .leo-pattern-resolution {
          font-size: 10px;
          color: #00ffaa;
          margin-top: 6px;
          font-style: italic;
        }

        .leo-activity-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .leo-activity-item {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }

        .leo-activity-type {
          color: #00ffff;
        }

        .leo-activity-time {
          color: #666;
        }
      `}</style>
    </div>
  );
};

// Export with error boundary wrapper
export const AIStatusType: React.FC = () => (
  <AIStatusErrorBoundary>
    <AIStatusContent />
  </AIStatusErrorBoundary>
);
