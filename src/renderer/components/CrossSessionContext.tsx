import React, { useState, useEffect, useCallback } from 'react';
import { useStore, Session } from '../store';

// Types for cross-session context
interface SharedContext {
  id: string;
  name: string;
  description: string;
  sourceSessionId: string;
  targetSessionIds: string[];
  contextType: 'file' | 'pattern' | 'error' | 'insight' | 'code';
  content: string;
  metadata?: Record<string, any>;
  createdAt: number;
  usageCount: number;
}

interface SessionActivity {
  sessionId: string;
  sessionName: string;
  action: string;
  timestamp: number;
  relevantFiles?: string[];
  language?: string;
}

interface CrossSessionContextProps {
  currentSessionId?: string;
  compact?: boolean;
  onShareContext?: (context: SharedContext) => void;
}

export const CrossSessionContext: React.FC<CrossSessionContextProps> = ({
  currentSessionId,
  compact = false,
  onShareContext,
}) => {
  const { sessions, selectedFace, linkSessions, unlinkSessions } = useStore();
  const [sharedContexts, setSharedContexts] = useState<SharedContext[]>([]);
  const [recentActivity, setRecentActivity] = useState<SessionActivity[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get current session
  const currentSession = currentSessionId
    ? sessions.find(s => s.id === currentSessionId)
    : selectedFace !== null ? sessions[selectedFace] : null;

  // Get active sessions (excluding current)
  const activeSessions = sessions.filter(
    s => s.status !== 'empty' && s.id !== currentSession?.id
  );

  // Fetch cross-session data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Mock data - would integrate with actual CrossSessionAwareness service
        const mockContexts: SharedContext[] = [
          {
            id: 'ctx1',
            name: 'API Error Handler',
            description: 'Reusable error handling pattern from Session 3',
            sourceSessionId: 'face-2',
            targetSessionIds: ['face-0', 'face-4'],
            contextType: 'pattern',
            content: 'try { await api.call() } catch (e) { handleApiError(e) }',
            createdAt: Date.now() - 3600000,
            usageCount: 5,
          },
          {
            id: 'ctx2',
            name: 'Database Schema',
            description: 'User table schema from Session 1',
            sourceSessionId: 'face-0',
            targetSessionIds: ['face-2', 'face-5'],
            contextType: 'file',
            content: 'schema.prisma',
            metadata: { tables: ['User', 'Session', 'Token'] },
            createdAt: Date.now() - 7200000,
            usageCount: 12,
          },
          {
            id: 'ctx3',
            name: 'Auth Flow Insight',
            description: 'JWT token refresh implementation notes',
            sourceSessionId: 'face-4',
            targetSessionIds: ['face-0', 'face-1', 'face-2'],
            contextType: 'insight',
            content: 'Use sliding window for token refresh. Set refresh at 80% of expiry.',
            createdAt: Date.now() - 1800000,
            usageCount: 3,
          },
        ];

        const mockActivity: SessionActivity[] = activeSessions.slice(0, 5).map(s => ({
          sessionId: s.id,
          sessionName: s.name,
          action: ['Editing', 'Running tests', 'Debugging', 'Reviewing', 'Refactoring'][Math.floor(Math.random() * 5)],
          timestamp: Date.now() - Math.random() * 300000,
          relevantFiles: [`src/${s.name.toLowerCase().replace(/\s+/g, '-')}.ts`],
          language: 'TypeScript',
        }));

        setSharedContexts(mockContexts);
        setRecentActivity(mockActivity.sort((a, b) => b.timestamp - a.timestamp));
      } catch (err) {
        console.error('[CrossSessionContext] Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeSessions.length]);

  // Link current session to another
  const handleLinkSession = useCallback((targetFaceIndex: number) => {
    if (selectedFace !== null && selectedFace !== targetFaceIndex) {
      linkSessions(selectedFace, targetFaceIndex);
    }
  }, [selectedFace, linkSessions]);

  // Unlink sessions
  const handleUnlinkSession = useCallback((targetFaceIndex: number) => {
    if (selectedFace !== null) {
      unlinkSessions(selectedFace, targetFaceIndex);
    }
  }, [selectedFace, unlinkSessions]);

  // Share context to other sessions
  const handleShareContext = useCallback((context: SharedContext) => {
    setSharedContexts(prev => [...prev, context]);
    onShareContext?.(context);
  }, [onShareContext]);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getContextIcon = (type: string) => {
    switch (type) {
      case 'file': return '📄';
      case 'pattern': return '🔄';
      case 'error': return '🔴';
      case 'insight': return '💡';
      case 'code': return '💻';
      default: return '📌';
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'Editing': return '#00ffff';
      case 'Running tests': return '#4caf50';
      case 'Debugging': return '#ff9800';
      case 'Reviewing': return '#9b59b6';
      case 'Refactoring': return '#2196f3';
      default: return '#666';
    }
  };

  if (compact) {
    return (
      <div style={{
        padding: 12,
        background: 'rgba(0, 255, 255, 0.03)',
        border: '1px solid rgba(0, 255, 255, 0.1)',
        borderRadius: 6,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>🔗</span>
            <span style={{
              fontSize: 12,
              color: '#00ffff',
              fontWeight: 600,
            }}>
              Cross-Session
            </span>
          </div>
          <span style={{
            fontSize: 10,
            color: '#888',
          }}>
            {activeSessions.length} active
          </span>
        </div>

        {/* Quick activity feed */}
        <div style={{ fontSize: 10 }}>
          {recentActivity.slice(0, 3).map((activity, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 0',
                borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: getActivityColor(activity.action),
              }} />
              <span style={{ color: '#888' }}>
                {activity.sessionName.slice(0, 12)}
              </span>
              <span style={{ color: getActivityColor(activity.action) }}>
                {activity.action}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <h2 style={{
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span>🔗</span>
            Cross-Session Context
          </h2>
          <p style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
            Share knowledge across your AI sessions
          </p>
        </div>
        <button
          onClick={() => setShowShareModal(true)}
          style={{
            padding: '8px 16px',
            background: 'rgba(0, 255, 255, 0.1)',
            border: '1px solid #00ffff',
            borderRadius: 6,
            color: '#00ffff',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          + Share Context
        </button>
      </div>

      {/* Active Sessions Grid */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#00ffff',
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Active Sessions ({activeSessions.length})
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
        }}>
          {activeSessions.slice(0, 8).map((session) => {
            const isLinked = currentSession?.linkedSessions?.includes(session.id);
            const faceIndex = session.faceIndex;

            return (
              <div
                key={session.id}
                style={{
                  padding: 12,
                  background: isLinked
                    ? 'rgba(0, 255, 255, 0.1)'
                    : 'var(--bg-tertiary)',
                  border: `1px solid ${isLinked ? '#00ffff' : 'var(--border-color)'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => isLinked ? handleUnlinkSession(faceIndex) : handleLinkSession(faceIndex)}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}>
                  <span style={{
                    fontSize: 11,
                    color: isLinked ? '#00ffff' : '#888',
                    fontWeight: 500,
                  }}>
                    #{String(faceIndex + 1).padStart(2, '0')}
                  </span>
                  {isLinked && (
                    <span style={{ fontSize: 12 }}>🔗</span>
                  )}
                </div>
                <div style={{
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  marginBottom: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {session.name}
                </div>
                <div style={{
                  fontSize: 10,
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {session.workingDir}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shared Contexts */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#00ffff',
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Shared Contexts ({sharedContexts.length})
        </h3>

        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
            Loading contexts...
          </div>
        ) : sharedContexts.length === 0 ? (
          <div style={{
            padding: 24,
            textAlign: 'center',
            color: '#666',
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
          }}>
            No shared contexts yet. Click "Share Context" to create one.
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {sharedContexts.map((context) => (
              <div
                key={context.id}
                style={{
                  padding: 14,
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{getContextIcon(context.contextType)}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {context.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                        {context.description}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: '#666',
                    textAlign: 'right',
                  }}>
                    <div>{context.usageCount}x used</div>
                    <div>{formatTime(context.createdAt)}</div>
                  </div>
                </div>

                {/* Context preview */}
                <div style={{
                  padding: 8,
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: '#888',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {context.content}
                </div>

                {/* Shared to sessions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 8,
                  fontSize: 10,
                  color: '#666',
                }}>
                  <span>Shared to:</span>
                  {context.targetSessionIds.slice(0, 3).map(id => {
                    const faceNum = parseInt(id.replace('face-', '')) + 1;
                    return (
                      <span
                        key={id}
                        style={{
                          padding: '2px 6px',
                          background: 'rgba(0, 255, 255, 0.1)',
                          borderRadius: 3,
                          color: '#00ffff',
                        }}
                      >
                        #{String(faceNum).padStart(2, '0')}
                      </span>
                    );
                  })}
                  {context.targetSessionIds.length > 3 && (
                    <span style={{ color: '#888' }}>
                      +{context.targetSessionIds.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div>
        <h3 style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#00ffff',
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Recent Activity
        </h3>

        <div style={{
          background: 'var(--bg-tertiary)',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {recentActivity.map((activity, i) => (
            <div
              key={i}
              style={{
                padding: '10px 14px',
                borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border-color)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: getActivityColor(activity.action),
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                    {activity.sessionName}
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: getActivityColor(activity.action),
                    padding: '1px 6px',
                    background: `${getActivityColor(activity.action)}15`,
                    borderRadius: 3,
                  }}>
                    {activity.action}
                  </span>
                </div>
                {activity.relevantFiles && (
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                    {activity.relevantFiles[0]}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10, color: '#555' }}>
                {formatTime(activity.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareContextModal
          sessions={activeSessions}
          onClose={() => setShowShareModal(false)}
          onShare={handleShareContext}
        />
      )}
    </div>
  );
};

// Share Context Modal Component
const ShareContextModal: React.FC<{
  sessions: Session[];
  onClose: () => void;
  onShare: (context: SharedContext) => void;
}> = ({ sessions, onClose, onShare }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [contextType, setContextType] = useState<SharedContext['contextType']>('insight');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!name.trim() || !content.trim() || selectedTargets.length === 0) return;

    const context: SharedContext = {
      id: `ctx-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      sourceSessionId: 'current',
      targetSessionIds: selectedTargets,
      contextType,
      content: content.trim(),
      createdAt: Date.now(),
      usageCount: 0,
    };

    onShare(context);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 500,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h3 style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#00ffff',
          margin: '0 0 20px 0',
        }}>
          Share Context to Sessions
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Auth Pattern"
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
            Type
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['insight', 'pattern', 'code', 'file', 'error'] as const).map(type => (
              <button
                key={type}
                onClick={() => setContextType(type)}
                style={{
                  padding: '6px 12px',
                  background: contextType === type ? 'rgba(0, 255, 255, 0.15)' : 'var(--bg-tertiary)',
                  border: `1px solid ${contextType === type ? '#00ffff' : 'var(--border-color)'}`,
                  borderRadius: 4,
                  color: contextType === type ? '#00ffff' : '#888',
                  cursor: 'pointer',
                  fontSize: 11,
                  textTransform: 'capitalize',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
            Content
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Enter the context to share..."
            rows={4}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: 'monospace',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8 }}>
            Share to Sessions
          </label>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            maxHeight: 120,
            overflowY: 'auto',
          }}>
            {sessions.map(session => {
              const isSelected = selectedTargets.includes(session.id);
              return (
                <button
                  key={session.id}
                  onClick={() => setSelectedTargets(prev =>
                    isSelected ? prev.filter(id => id !== session.id) : [...prev, session.id]
                  )}
                  style={{
                    padding: '6px 10px',
                    background: isSelected ? 'rgba(0, 255, 255, 0.15)' : 'var(--bg-tertiary)',
                    border: `1px solid ${isSelected ? '#00ffff' : 'var(--border-color)'}`,
                    borderRadius: 4,
                    color: isSelected ? '#00ffff' : '#888',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  #{String(session.faceIndex + 1).padStart(2, '0')} {session.name}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !content.trim() || selectedTargets.length === 0}
            style={{
              padding: '10px 20px',
              background: 'rgba(0, 255, 255, 0.15)',
              border: '1px solid #00ffff',
              borderRadius: 6,
              color: '#00ffff',
              cursor: !name.trim() || !content.trim() || selectedTargets.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 500,
              opacity: !name.trim() || !content.trim() || selectedTargets.length === 0 ? 0.5 : 1,
            }}
          >
            Share Context
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrossSessionContext;
