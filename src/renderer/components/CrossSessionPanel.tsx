import React, { useState } from 'react';
import { useCrossSession, SessionActivity, CrossSessionSuggestion, ActivityFeedItem } from '../hooks/useCrossSession';

export const CrossSessionPanel: React.FC = () => {
  const {
    activeSessions,
    suggestions,
    activityFeed,
    loading,
    dismissSuggestion,
    refresh,
  } = useCrossSession();

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'sessions' | 'suggestions' | 'activity'>('sessions');

  if (loading) {
    return (
      <div className="cross-session-mini">
        <span className="cross-session-indicator loading" />
        <span>Cross-Session Loading...</span>
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getStatusColor = (status: SessionActivity['status']) => {
    switch (status) {
      case 'active': return '#00ffaa';
      case 'waiting': return '#ffaa00';
      case 'error': return '#ff6464';
      default: return '#666';
    }
  };

  const getSuggestionIcon = (type: CrossSessionSuggestion['type']) => {
    switch (type) {
      case 'solution': return '💡';
      case 'warning': return '⚠️';
      case 'insight': return '🔍';
      case 'collaboration': return '🤝';
    }
  };

  const undismissedSuggestions = suggestions.filter(s => !s.dismissed);

  return (
    <div className="cross-session-container">
      {/* Mini status bar */}
      <div
        className="cross-session-mini"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={`cross-session-indicator ${activeSessions.length > 0 ? 'active' : 'inactive'}`} />
        <span className="cross-session-label">Cross-Session</span>
        <div className="cross-session-mini-stats">
          <span>{activeSessions.length} sessions</span>
          {undismissedSuggestions.length > 0 && (
            <span className="cross-session-badge">{undismissedSuggestions.length} suggestions</span>
          )}
        </div>
        <span className="cross-session-expand-icon">{isExpanded ? '−' : '+'}</span>
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="cross-session-expanded">
          {/* Header with tabs */}
          <div className="cross-session-header">
            <div className="cross-session-tabs">
              <button
                className={`cross-session-tab ${activeTab === 'sessions' ? 'active' : ''}`}
                onClick={() => setActiveTab('sessions')}
              >
                Sessions ({activeSessions.length})
              </button>
              <button
                className={`cross-session-tab ${activeTab === 'suggestions' ? 'active' : ''}`}
                onClick={() => setActiveTab('suggestions')}
              >
                Suggestions ({undismissedSuggestions.length})
              </button>
              <button
                className={`cross-session-tab ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                Activity
              </button>
            </div>
            <button className="cross-session-refresh-btn" onClick={refresh}>
              ↻
            </button>
          </div>

          {/* Content */}
          <div className="cross-session-content">
            {activeTab === 'sessions' && (
              <div className="cross-session-sessions">
                {activeSessions.length === 0 ? (
                  <div className="cross-session-empty">
                    No active sessions registered
                  </div>
                ) : (
                  activeSessions.map(session => (
                    <div key={session.sessionId} className="cross-session-session-card">
                      <div className="cross-session-session-header">
                        <span
                          className="cross-session-status-dot"
                          style={{ background: getStatusColor(session.status) }}
                        />
                        <span className="cross-session-session-name">{session.sessionName}</span>
                        <span className="cross-session-session-status">{session.status}</span>
                      </div>
                      {session.currentTask && (
                        <div className="cross-session-task">
                          {session.currentTask}
                        </div>
                      )}
                      <div className="cross-session-session-meta">
                        <span className="cross-session-dir">{session.workingDir}</span>
                        <span className="cross-session-time">{formatTime(session.lastActivityTime)}</span>
                      </div>
                      {session.tags.length > 0 && (
                        <div className="cross-session-tags">
                          {session.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="cross-session-tag">{tag}</span>
                          ))}
                        </div>
                      )}
                      {session.recentErrors.length > 0 && (
                        <div className="cross-session-errors">
                          <span className="cross-session-error-count">
                            {session.recentErrors.length} recent error(s)
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'suggestions' && (
              <div className="cross-session-suggestions">
                {undismissedSuggestions.length === 0 ? (
                  <div className="cross-session-empty">
                    No suggestions at this time
                  </div>
                ) : (
                  undismissedSuggestions.map(suggestion => (
                    <div
                      key={suggestion.id}
                      className={`cross-session-suggestion-card cross-session-suggestion-${suggestion.type}`}
                    >
                      <div className="cross-session-suggestion-header">
                        <span className="cross-session-suggestion-icon">
                          {getSuggestionIcon(suggestion.type)}
                        </span>
                        <span className="cross-session-suggestion-title">
                          {suggestion.title}
                        </span>
                        <button
                          className="cross-session-dismiss-btn"
                          onClick={() => dismissSuggestion(suggestion.id)}
                        >
                          ×
                        </button>
                      </div>
                      <div className="cross-session-suggestion-description">
                        {suggestion.description}
                      </div>
                      {suggestion.context && (
                        <div className="cross-session-suggestion-context">
                          {suggestion.context}
                        </div>
                      )}
                      <div className="cross-session-suggestion-meta">
                        <span className="cross-session-relevance">
                          {(suggestion.relevance * 100).toFixed(0)}% relevant
                        </span>
                        <span className="cross-session-suggestion-time">
                          {formatTime(suggestion.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="cross-session-activity">
                {activityFeed.length === 0 ? (
                  <div className="cross-session-empty">
                    No recent activity
                  </div>
                ) : (
                  activityFeed.slice(0, 20).map((item, idx) => (
                    <div key={idx} className="cross-session-activity-item">
                      <span className="cross-session-activity-session">
                        {item.sessionName}
                      </span>
                      <span className="cross-session-activity-action">
                        {item.action}
                      </span>
                      <span className="cross-session-activity-time">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .cross-session-container {
          position: fixed;
          bottom: 20px;
          left: 20px;
          z-index: 1000;
          font-family: 'SF Mono', 'Fira Code', monospace;
        }

        .cross-session-mini {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(10, 10, 15, 0.95);
          border: 1px solid rgba(200, 100, 255, 0.3);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 11px;
          color: #e0e0e0;
          cursor: pointer;
        }

        .cross-session-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .cross-session-indicator.active {
          background: #c864ff;
          box-shadow: 0 0 8px #c864ff;
        }

        .cross-session-indicator.inactive {
          background: #666;
        }

        .cross-session-indicator.loading {
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

        .cross-session-label {
          font-weight: 600;
          color: #c864ff;
        }

        .cross-session-mini-stats {
          display: flex;
          gap: 12px;
          color: #888;
          font-size: 10px;
        }

        .cross-session-badge {
          background: rgba(255, 170, 0, 0.2);
          border: 1px solid rgba(255, 170, 0, 0.4);
          padding: 2px 6px;
          border-radius: 4px;
          color: #ffaa00;
        }

        .cross-session-expand-icon {
          color: #666;
          font-size: 14px;
          margin-left: 8px;
        }

        .cross-session-expanded {
          position: absolute;
          bottom: 100%;
          left: 0;
          width: 380px;
          max-height: 60vh;
          overflow-y: auto;
          background: rgba(10, 10, 15, 0.98);
          border: 1px solid rgba(200, 100, 255, 0.3);
          border-radius: 12px;
          margin-bottom: 8px;
        }

        .cross-session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cross-session-tabs {
          display: flex;
          gap: 4px;
        }

        .cross-session-tab {
          padding: 4px 10px;
          border: none;
          background: transparent;
          color: #888;
          font-size: 10px;
          font-family: inherit;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .cross-session-tab.active {
          background: rgba(200, 100, 255, 0.2);
          color: #c864ff;
        }

        .cross-session-tab:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .cross-session-refresh-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #888;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .cross-session-refresh-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        .cross-session-content {
          padding: 12px;
        }

        .cross-session-empty {
          text-align: center;
          color: #666;
          padding: 20px;
          font-size: 11px;
        }

        .cross-session-session-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 8px;
        }

        .cross-session-session-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .cross-session-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .cross-session-session-name {
          font-weight: 600;
          color: #e0e0e0;
          font-size: 12px;
          flex: 1;
        }

        .cross-session-session-status {
          font-size: 9px;
          text-transform: uppercase;
          color: #666;
        }

        .cross-session-task {
          font-size: 11px;
          color: #c864ff;
          margin-bottom: 6px;
        }

        .cross-session-session-meta {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #666;
        }

        .cross-session-dir {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cross-session-tags {
          display: flex;
          gap: 4px;
          margin-top: 6px;
        }

        .cross-session-tag {
          padding: 2px 6px;
          background: rgba(200, 100, 255, 0.15);
          color: #c864ff;
          border-radius: 3px;
          font-size: 9px;
        }

        .cross-session-errors {
          margin-top: 6px;
        }

        .cross-session-error-count {
          font-size: 10px;
          color: #ff6464;
        }

        .cross-session-suggestion-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 8px;
        }

        .cross-session-suggestion-solution {
          border: 1px solid rgba(0, 255, 170, 0.2);
        }

        .cross-session-suggestion-warning {
          border: 1px solid rgba(255, 170, 0, 0.3);
        }

        .cross-session-suggestion-insight {
          border: 1px solid rgba(0, 200, 255, 0.2);
        }

        .cross-session-suggestion-collaboration {
          border: 1px solid rgba(200, 100, 255, 0.2);
        }

        .cross-session-suggestion-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .cross-session-suggestion-icon {
          font-size: 14px;
        }

        .cross-session-suggestion-title {
          font-weight: 600;
          color: #e0e0e0;
          font-size: 11px;
          flex: 1;
        }

        .cross-session-dismiss-btn {
          background: transparent;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          line-height: 1;
        }

        .cross-session-dismiss-btn:hover {
          color: #ff6464;
        }

        .cross-session-suggestion-description {
          font-size: 11px;
          color: #ccc;
          line-height: 1.4;
          margin-bottom: 6px;
        }

        .cross-session-suggestion-context {
          font-size: 10px;
          color: #00ffaa;
          background: rgba(0, 255, 170, 0.05);
          padding: 6px;
          border-radius: 4px;
          margin-bottom: 6px;
          font-family: 'SF Mono', monospace;
        }

        .cross-session-suggestion-meta {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #666;
        }

        .cross-session-activity-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 10px;
        }

        .cross-session-activity-session {
          color: #c864ff;
          font-weight: 600;
          min-width: 80px;
        }

        .cross-session-activity-action {
          color: #ccc;
          flex: 1;
        }

        .cross-session-activity-time {
          color: #666;
        }
      `}</style>
    </div>
  );
};
