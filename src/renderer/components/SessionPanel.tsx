import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { ArborPanel } from './ArborPanel';
import { SessionTemplates } from './SessionTemplates';
import { GitHubRepoClone } from './GitHubRepoClone';
import { SuggestionPanel } from './SuggestionPanel';
import { OpenInCursor } from './OpenInCursor';

// Feedback button component
const FeedbackButton: React.FC<{
  type: 'positive' | 'negative';
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}> = ({ type, onClick, disabled, active }) => {
  const isPositive = type === 'positive';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        background: active
          ? isPositive ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'
          : 'var(--bg-tertiary)',
        border: `1px solid ${active
          ? isPositive ? '#4caf50' : '#f44336'
          : 'var(--border-color)'}`,
        borderRadius: 6,
        color: active
          ? isPositive ? '#4caf50' : '#f44336'
          : 'var(--text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
        fontSize: 16,
      }}
      title={isPositive ? 'This response was helpful' : 'This response was not helpful'}
    >
      {isPositive ? '👍' : '👎'}
    </button>
  );
};

export const SessionPanel: React.FC = () => {
  const {
    sessions,
    selectedFace,
    attachedSession,
    isCreatingSession,
    error,
    terminalDimensions,
    updateSession,
    setAttachedSession,
    setCreating,
    setError,
  } = useStore();

  const [sessionName, setSessionName] = useState('');
  const [workingDir, setWorkingDir] = useState('~');
  const [lastFeedback, setLastFeedback] = useState<'positive' | 'negative' | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // IMPORTANT: Define selectedSession BEFORE any callbacks that use it
  // to avoid TDZ (temporal dead zone) errors in bundled code
  const selectedSession = selectedFace !== null ? sessions[selectedFace] : null;
  const hasActiveTmux = selectedSession?.tmuxSession !== undefined;

  // Reset local state when selectedFace changes to prevent name bleeding between sessions
  useEffect(() => {
    setSessionName('');
    setWorkingDir('~');
    setIsEditingName(false);
    setEditedName('');
    setLastFeedback(null);
    setFeedbackSent(false);
  }, [selectedFace]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Handle rename session
  const handleRename = async () => {
    if (!selectedSession || !editedName.trim() || !window.flowrider || selectedFace === null) return;

    const newName = editedName.trim();
    if (newName === selectedSession.name) {
      setIsEditingName(false);
      return;
    }

    try {
      // Rename tmux session if exists
      if (selectedSession.tmuxSession) {
        const result = await window.flowrider.tmux.rename(selectedSession.tmuxSession, newName);
        if ((result as any).success) {
          updateSession(selectedFace, {
            name: newName,
            tmuxSession: newName,
          });
        } else {
          setError((result as any).error || 'Failed to rename session');
        }
      } else {
        // Just update local state if no tmux session
        updateSession(selectedFace, { name: newName });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename');
    } finally {
      setIsEditingName(false);
    }
  };

  // Send feedback to AI System
  const handleFeedback = useCallback(async (type: 'positive' | 'negative') => {
    if (!selectedSession || !window.flowrider) return;

    const sessionId = selectedSession.id;
    const value = type === 'positive' ? 1 : -1;

    try {
      await window.flowrider.leoai.recordFeedback(sessionId, {
        type: type === 'positive' ? 'accept' : 'reject',
        value,
        context: selectedSession.notes || undefined,
      });
      setLastFeedback(type);
      setFeedbackSent(true);
      console.log(`[SessionPanel] Recorded ${type} feedback for session ${sessionId}`);
      // Reset feedback sent indicator after 2s
      setTimeout(() => setFeedbackSent(false), 2000);
    } catch (err) {
      console.error('[SessionPanel] Failed to record feedback:', err);
    }
  }, [selectedSession]);

  const isAttached = attachedSession === selectedSession?.id;

  // Create a new tmux session
  const handleCreate = async () => {
    if (selectedFace === null || !window.flowrider) return;

    setCreating(true);
    setError(null);

    try {
      const name = sessionName || `session-${selectedFace + 1}`;
      // Pass terminal dimensions to create tmux session at correct initial size
      const result = await window.flowrider.tmux.create(name, selectedFace, workingDir, {
        cols: terminalDimensions.cols,
        rows: terminalDimensions.rows,
      });

      if ((result as any).success) {
        // Also detect GitHub repo
        let gitHubRepo = undefined;
        try {
          const gitResult = await window.flowrider.git.detectRepo(workingDir);
          if ((gitResult as any).success && (gitResult as any).data) {
            gitHubRepo = (gitResult as any).data;
          }
        } catch {
          // Ignore git detection errors
        }

        updateSession(selectedFace, {
          name,
          tmuxSession: (result as any).data.name,
          status: 'attached',
          workingDir,
          gitHubRepo,
        });

        // Auto-attach to the session immediately after creation
        setAttachedSession(selectedSession?.id || `face-${selectedFace}`);

        // Register with cross-session awareness for real-time tracking
        try {
          await window.flowrider.crossSession.register(
            selectedSession?.id || `face-${selectedFace}`,
            name,
            workingDir,
            selectedSession?.projectId
          );
          console.log('[SessionPanel] Registered session with CrossSessionAwareness:', name);
        } catch (err) {
          console.error('[SessionPanel] Failed to register with CrossSessionAwareness:', err);
        }

        setSessionName('');
      } else {
        setError((result as any).error || 'Failed to create session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  };

  // Attach to existing session
  const handleAttach = () => {
    if (!selectedSession) return;
    setAttachedSession(selectedSession.id);
    updateSession(selectedFace!, { status: 'attached' });
  };

  // Detach from session
  const handleDetach = () => {
    setAttachedSession(null);
    if (selectedFace !== null) {
      updateSession(selectedFace, { status: 'active' });
    }
  };

  // Kill the tmux session
  const handleKill = async () => {
    if (!selectedSession?.tmuxSession || !window.flowrider) return;

    if (!confirm(`Kill session "${selectedSession.name}"?`)) return;

    try {
      const result = await window.flowrider.tmux.kill(selectedSession.tmuxSession);
      if ((result as any).success) {
        // Unregister from cross-session awareness
        try {
          await window.flowrider.crossSession.unregister(selectedSession.id);
          console.log('[SessionPanel] Unregistered session from CrossSessionAwareness:', selectedSession.name);
        } catch (err) {
          console.error('[SessionPanel] Failed to unregister from CrossSessionAwareness:', err);
        }

        updateSession(selectedFace!, {
          tmuxSession: undefined,
          status: 'empty',
        });
        setAttachedSession(null);
      } else {
        setError((result as any).error || 'Failed to kill session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // No face selected
  if (selectedFace === null || !selectedSession) {
    return (
      <div className="session-panel">
        <div className="panel-header">
          <h2>Session</h2>
        </div>
        <div className="session-content">
          <div className="empty-state">
            <h3>No Face Selected</h3>
            <p>Click on a face of the icosahedron to view and manage its session.</p>
            <p style={{ marginTop: 8, fontSize: 11, color: '#666' }}>
              20 faces = 20 concurrent AI sessions
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="session-panel">
      <div className="panel-header">
        <h2>Session</h2>
        <span className={`status-badge ${selectedSession.status}`}>
          {selectedSession.status.toUpperCase()}
        </span>
      </div>

      <div className="session-content">
        {error && (
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid #ff4444',
            borderRadius: 4,
            padding: '8px 12px',
            marginBottom: 16,
            fontSize: 12,
            color: '#ff6666',
          }}>
            {error}
            <button
              onClick={() => setError(null)}
              style={{
                float: 'right',
                background: 'none',
                border: 'none',
                color: '#ff6666',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* AI System Smart Suggestions */}
        {hasActiveTmux && (
          <SuggestionPanel
            sessionId={selectedSession?.id}
            projectId={selectedSession?.projectId}
            workingDir={selectedSession?.workingDir}
            language={selectedSession?.language}
            compact={true}
            maxSuggestions={3}
          />
        )}

        <div className="session-info">
          <div className="info-row">
            <span className="info-label">Face</span>
            <span className="info-value">#{String(selectedFace + 1).padStart(2, '0')}</span>
          </div>

          {hasActiveTmux ? (
            <>
              <div className="info-row">
                <span className="info-label">Name</span>
                {isEditingName ? (
                  <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename();
                        if (e.key === 'Escape') setIsEditingName(false);
                      }}
                      onBlur={handleRename}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid #00ffff',
                        borderRadius: 4,
                        color: 'var(--text-primary)',
                        fontSize: 13,
                      }}
                    />
                  </div>
                ) : (
                  <span
                    className="info-value"
                    onClick={() => {
                      setEditedName(selectedSession.name);
                      setIsEditingName(true);
                    }}
                    style={{
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: 4,
                      transition: 'background 0.2s',
                    }}
                    title="Click to rename"
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {selectedSession.name} <span style={{ fontSize: 10, color: '#666' }}>✏️</span>
                  </span>
                )}
              </div>
              <div className="info-row">
                <span className="info-label">Tmux</span>
                <span className="info-value" style={{ fontSize: 11 }}>
                  {selectedSession.tmuxSession}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Directory</span>
                <span className="info-value">{selectedSession.workingDir}</span>
              </div>

              {/* Open in Cursor IDE button */}
              {selectedSession.workingDir && (
                <div style={{ marginTop: 12 }}>
                  <OpenInCursor workingDir={selectedSession.workingDir} />
                </div>
              )}

              {/* Session Notes */}
              <div style={{ marginTop: 16 }}>
                <label className="info-label">Notes</label>
                <textarea
                  value={selectedSession.notes || ''}
                  onChange={(e) => updateSession(selectedFace, { notes: e.target.value })}
                  placeholder="What are you working on?"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    marginTop: 4,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 4,
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Hypothesis Branch Info (Tier 3) */}
              {selectedSession.hypothesisBranch && (
                <div style={{
                  marginTop: 16,
                  padding: '12px',
                  background: 'rgba(0, 255, 255, 0.05)',
                  border: '1px solid rgba(0, 255, 255, 0.2)',
                  borderRadius: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: '#00ffff', fontSize: 12 }}>HYPOTHESIS BRANCH</span>
                    <span style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: selectedSession.hypothesisBranch.status === 'exploring' ? 'rgba(255, 193, 7, 0.2)' :
                                  selectedSession.hypothesisBranch.status === 'promising' ? 'rgba(76, 175, 80, 0.2)' :
                                  selectedSession.hypothesisBranch.status === 'abandoned' ? 'rgba(244, 67, 54, 0.2)' :
                                  'rgba(33, 150, 243, 0.2)',
                      color: selectedSession.hypothesisBranch.status === 'exploring' ? '#ffc107' :
                             selectedSession.hypothesisBranch.status === 'promising' ? '#4caf50' :
                             selectedSession.hypothesisBranch.status === 'abandoned' ? '#f44336' : '#2196f3',
                    }}>
                      {selectedSession.hypothesisBranch.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                    Branch: {selectedSession.hypothesisBranch.branchName}
                  </div>
                  <div style={{ fontSize: 12, color: '#ccc' }}>
                    {selectedSession.hypothesisBranch.hypothesis}
                  </div>
                </div>
              )}

              {/* Linked Sessions (Tier 3) */}
              {selectedSession.linkedSessions && selectedSession.linkedSessions.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <label className="info-label">Linked Sessions</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {selectedSession.linkedSessions.map((linkedId) => {
                      const faceNum = parseInt(linkedId.replace('face-', '')) + 1;
                      return (
                        <span
                          key={linkedId}
                          onClick={() => {
                            const idx = parseInt(linkedId.replace('face-', ''));
                            if (!isNaN(idx)) {
                              // selectFace not available here, would need to import from store
                            }
                          }}
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            background: 'rgba(0, 255, 255, 0.1)',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            borderRadius: 3,
                            color: '#00ffff',
                            cursor: 'pointer',
                          }}
                        >
                          #{String(faceNum).padStart(2, '0')}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ marginTop: 16 }}>
                <label className="info-label">Session Name</label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder={`session-${selectedFace + 1}`}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    marginTop: 4,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 4,
                    color: 'var(--text-primary)',
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <label className="info-label">Working Directory</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    type="text"
                    value={workingDir}
                    onChange={(e) => setWorkingDir(e.target.value)}
                    placeholder="~"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 4,
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      fontFamily: 'monospace',
                    }}
                  />
                  <button
                    onClick={async () => {
                      if (!window.flowrider) return;
                      const result = await window.flowrider.dialog.openDirectory();
                      if (result.success && result.path) {
                        setWorkingDir(result.path);
                        // Auto-detect git repo and suggest session name
                        try {
                          const gitResult = await window.flowrider.git.detectRepo(result.path);
                          if ((gitResult as any).success && (gitResult as any).data?.repo) {
                            const repoName = (gitResult as any).data.repo;
                            // Only auto-fill if session name is empty or default
                            if (!sessionName || sessionName.startsWith('session-')) {
                              setSessionName(repoName);
                            }
                          }
                        } catch {
                          // Ignore git detection errors
                        }
                      }
                    }}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 4,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                    }}
                    title="Browse for directory"
                  >
                    Browse
                  </button>
                </div>
              </div>

              {/* Clone from GitHub */}
              <GitHubRepoClone
                faceIndex={selectedFace}
                onClone={async (repo, cloneDir) => {
                  // Set working dir and session name from repo
                  setWorkingDir(cloneDir);
                  setSessionName(repo.repo);
                  // Update session with GitHub info
                  updateSession(selectedFace, {
                    name: repo.repo,
                    workingDir: cloneDir,
                    gitHubRepo: {
                      owner: repo.owner,
                      repo: repo.repo,
                      branch: 'main',
                      url: repo.url,
                    },
                  });
                }}
              />

              {/* Session Templates */}
              <SessionTemplates faceIndex={selectedFace} />
            </>
          )}
        </div>

        <div className="action-buttons">
          {!hasActiveTmux ? (
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={isCreatingSession}
              style={{ flex: 1 }}
            >
              {isCreatingSession ? 'Creating...' : 'Create Session'}
            </button>
          ) : (
            <>
              {isAttached ? (
                <button className="btn btn-secondary" onClick={handleDetach}>
                  Disconnect
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleAttach}>
                  Connect
                </button>
              )}
              <button className="btn btn-danger" onClick={handleKill}>
                Kill
              </button>
            </>
          )}
        </div>

        {/* AI System Feedback Section */}
        {hasActiveTmux && (
          <div style={{
            marginTop: 16,
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
              <span style={{
                fontSize: 11,
                color: '#00ffff',
                fontWeight: 500,
                letterSpacing: '0.5px',
              }}>
                AI System FEEDBACK
              </span>
              {feedbackSent && (
                <span style={{
                  fontSize: 10,
                  color: '#4caf50',
                  animation: 'fadeIn 0.3s ease',
                }}>
                  Feedback recorded
                </span>
              )}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <FeedbackButton
                type="positive"
                onClick={() => handleFeedback('positive')}
                active={lastFeedback === 'positive'}
              />
              <FeedbackButton
                type="negative"
                onClick={() => handleFeedback('negative')}
                active={lastFeedback === 'negative'}
              />
              <span style={{
                fontSize: 11,
                color: '#666',
                marginLeft: 4,
              }}>
                Rate last AI response
              </span>
            </div>
          </div>
        )}

        {/* GitHub repo link */}
        {hasActiveTmux && selectedSession.gitHubRepo && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
            <label className="info-label">GitHub Repository</label>
            <div style={{ marginTop: 8 }}>
              <a
                href={selectedSession.gitHubRepo.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#58a6ff',
                  textDecoration: 'none',
                  fontSize: 13,
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                {selectedSession.gitHubRepo.owner}/{selectedSession.gitHubRepo.repo}
              </a>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={`${selectedSession.gitHubRepo.url}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-small"
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 4,
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                  }}
                >
                  Issues
                </a>
                <a
                  href={`${selectedSession.gitHubRepo.url}/pulls`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-small"
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 4,
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                  }}
                >
                  PRs
                </a>
                <span style={{ fontSize: 11, color: '#666', alignSelf: 'center' }}>
                  branch: {selectedSession.gitHubRepo.branch}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Future: Project assignment */}
        {hasActiveTmux && !selectedSession.gitHubRepo && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
            <label className="info-label">GitHub Repository</label>
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              No GitHub repo detected. Point session to a git directory.
            </div>
          </div>
        )}

        {/* Arbor Panel - Tier 3 features */}
        <ArborPanel />
      </div>
    </div>
  );
};
