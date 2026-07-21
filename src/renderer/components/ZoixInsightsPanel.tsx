import React, { useState, useEffect } from 'react';
import { useStore } from '../store';

interface ZoixPattern {
  id: string;
  type: 'error' | 'code' | 'workflow' | 'prompt';
  description: string;
  sessionId?: number;
  timestamp: Date;
  confidence: number;
}

interface ZoixInsight {
  id: string;
  type: 'cross_session' | 'suggestion' | 'cost_saving';
  title: string;
  description: string;
  actionable: boolean;
  sessions?: number[];
}

/**
 * ZoixInsightsPanel - Collapsible panel showing what ZOIX has learned
 *
 * Displays:
 * - Recent patterns learned
 * - Cross-session insights
 * - Suggestions for the user
 * - Cost savings from cached patterns
 */
export const ZoixInsightsPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { sessions, zoixPatterns, zoixRecentLearnings, zoixInsights, zoixStats, syncZoixData } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real ZOIX data when panel opens
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          await syncZoixData();
        } catch (err) {
          setError('Failed to load ZOIX data');
          console.error('[ZoixInsightsPanel] Failed to fetch data:', err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();

      // Poll for updates every 15 seconds while panel is open
      const interval = setInterval(fetchData, 15000);
      return () => clearInterval(interval);
    }
  }, [isOpen, syncZoixData]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeSessions = sessions.filter(s => s.status !== 'empty');

  // Use real data from backend, fallback to empty arrays if no data yet
  const recentLearnings: ZoixPattern[] = zoixRecentLearnings;
  const insights: ZoixInsight[] = zoixInsights;

  const getTypeIcon = (type: ZoixPattern['type']) => {
    switch (type) {
      case 'error': return '🔴';
      case 'code': return '💻';
      case 'workflow': return '🔄';
      case 'prompt': return '💬';
      default: return '📝';
    }
  };

  const getInsightIcon = (type: ZoixInsight['type']) => {
    switch (type) {
      case 'cross_session': return '🔗';
      case 'suggestion': return '💡';
      case 'cost_saving': return '💰';
      default: return '📊';
    }
  };

  const formatTime = (date: Date) => {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 360,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)',
        boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(59, 130, 246, 0.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🧠</span>
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#a855f7',
                letterSpacing: '1px',
              }}
            >
              ZOIX
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Learning Intelligence System
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: 'none',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      {/* Stats Bar */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          gap: 16,
          background: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#a855f7' }}>
            {zoixPatterns.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Patterns
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>
            {activeSessions.length}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Learning From
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>
            {isLoading ? '...' : Math.round((zoixStats?.averageConfidence || 0) * 100)}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Confidence
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {/* Error State */}
        {error && (
          <div
            style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: '#ef4444',
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* Recently Learned */}
        <div style={{ marginBottom: 24 }}>
          <h3
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--accent-cyan)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: '#22c55e' }}>●</span>
            Recently Learned
          </h3>
          {isLoading && (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              Loading patterns...
            </div>
          )}
          {!isLoading && recentLearnings.length === 0 && (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              No patterns learned yet. Start coding to help ZOIX learn!
            </div>
          )}
          {!isLoading && recentLearnings.map((learning) => (
            <div
              key={learning.id}
              style={{
                padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 8,
                marginBottom: 8,
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 14 }}>{getTypeIcon(learning.type)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {learning.description}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)' }}>
                    {learning.sessionId && <span>Session {learning.sessionId}</span>}
                    <span>{formatTime(learning.timestamp)}</span>
                    <span style={{ color: learning.confidence > 0.9 ? '#22c55e' : '#f59e0b' }}>
                      {Math.round(learning.confidence * 100)}% conf
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cross-Session Insights */}
        <div style={{ marginBottom: 24 }}>
          <h3
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--accent-cyan)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: '#a855f7' }}>●</span>
            Cross-Session Insights
          </h3>
          {isLoading && (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              Loading insights...
            </div>
          )}
          {!isLoading && insights.length === 0 && (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              No insights yet. ZOIX will analyze patterns as you work.
            </div>
          )}
          {!isLoading && insights.map((insight) => (
            <div
              key={insight.id}
              style={{
                padding: '12px',
                background: insight.actionable
                  ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(59, 130, 246, 0.1))'
                  : 'var(--bg-tertiary)',
                borderRadius: 8,
                marginBottom: 8,
                border: `1px solid ${insight.actionable ? 'rgba(147, 51, 234, 0.3)' : 'var(--border-color)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 16 }}>{getInsightIcon(insight.type)}</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: 4,
                    }}
                  >
                    {insight.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {insight.description}
                  </div>
                  {insight.sessions && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                      {insight.sessions.map((s) => (
                        <span
                          key={s}
                          style={{
                            padding: '2px 8px',
                            background: 'rgba(147, 51, 234, 0.2)',
                            borderRadius: 4,
                            fontSize: 10,
                            color: '#a855f7',
                          }}
                        >
                          Session {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Learning Progress */}
        <div>
          <h3
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--accent-cyan)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: '#3b82f6' }}>●</span>
            Training Progress
          </h3>
          <div
            style={{
              padding: '12px',
              background: 'var(--bg-tertiary)',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Pattern Extraction
                </span>
                <span style={{ fontSize: 11, color: '#22c55e' }}>Active</span>
              </div>
              <div
                style={{
                  height: 4,
                  background: 'var(--bg-primary)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, (zoixPatterns / 1000) * 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #22c55e, #10b981)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                {zoixPatterns.toLocaleString()} / 1,000 patterns for LoRA fine-tuning
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              ZOIX is learning from your {activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''}.
              The more you code, the smarter your personal AI becomes.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-color)',
          background: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          🔒 Data stays on your machine • Privacy-first learning
        </span>
      </div>
    </div>
  );
};

export default ZoixInsightsPanel;
