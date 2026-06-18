import React, { useState } from 'react';
import { useStore } from '../store';

export const SessionPanel: React.FC = () => {
  const {
    sessions,
    selectedFace,
    attachedSession,
    isCreatingSession,
    error,
    updateSession,
    setAttachedSession,
    setCreating,
    setError,
  } = useStore();

  const [sessionName, setSessionName] = useState('');
  const [workingDir, setWorkingDir] = useState('~');

  const selectedSession = selectedFace !== null ? sessions[selectedFace] : null;
  const hasActiveTmux = selectedSession?.tmuxSession !== undefined;
  const isAttached = attachedSession === selectedSession?.id;

  // Create a new tmux session
  const handleCreate = async () => {
    if (selectedFace === null || !window.flowrider) return;

    setCreating(true);
    setError(null);

    try {
      const name = sessionName || `session-${selectedFace + 1}`;
      const result = await window.flowrider.tmux.create(name, selectedFace, workingDir);

      if ((result as any).success) {
        updateSession(selectedFace, {
          name,
          tmuxSession: (result as any).data.name,
          status: 'active',
          workingDir,
        });
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

        <div className="session-info">
          <div className="info-row">
            <span className="info-label">Face</span>
            <span className="info-value">#{String(selectedFace + 1).padStart(2, '0')}</span>
          </div>

          {hasActiveTmux ? (
            <>
              <div className="info-row">
                <span className="info-label">Name</span>
                <span className="info-value">{selectedSession.name}</span>
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
                <input
                  type="text"
                  value={workingDir}
                  onChange={(e) => setWorkingDir(e.target.value)}
                  placeholder="~"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    marginTop: 4,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 4,
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontFamily: 'monospace',
                  }}
                />
              </div>
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
                  Detach
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleAttach}>
                  Attach
                </button>
              )}
              <button className="btn btn-danger" onClick={handleKill}>
                Kill
              </button>
            </>
          )}
        </div>

        {/* Future: Project assignment */}
        {hasActiveTmux && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
            <label className="info-label">Project (Coming Soon)</label>
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              Assign sessions to projects for cost tracking and organization.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
