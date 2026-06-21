import React, { useState } from 'react';
import { useStore } from '../store';

/**
 * ArborPanel - Tier 3 Arbor Pattern Features
 *
 * Implements the "Arbor" pattern for parallel hypothesis exploration:
 * - Create hypothesis branches from a source session
 * - Link related sessions together
 * - Track and compare exploration progress
 */
export const ArborPanel: React.FC = () => {
  const {
    sessions,
    selectedFace,
    selectFace,
    linkSessions,
    unlinkSessions,
    createHypothesisBranch,
    updateHypothesisStatus,
  } = useStore();

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [targetFace, setTargetFace] = useState<number | null>(null);
  const [linkFace, setLinkFace] = useState<number | null>(null);

  const selectedSession = selectedFace !== null ? sessions[selectedFace] : null;
  const hasActiveTmux = selectedSession?.tmuxSession !== undefined;

  // Get available empty faces for branching
  const emptyFaces = sessions
    .filter((s) => s.status === 'empty')
    .map((s) => s.faceIndex);

  // Get active sessions for linking (excluding self)
  const linkableSessions = sessions
    .filter((s) => s.status !== 'empty' && s.faceIndex !== selectedFace)
    .map((s) => ({ faceIndex: s.faceIndex, name: s.name, id: s.id }));

  // Handle branch creation
  const handleCreateBranch = () => {
    if (selectedFace === null || targetFace === null || !branchName) return;

    createHypothesisBranch(selectedFace, targetFace, branchName, hypothesis);
    setShowBranchModal(false);
    setBranchName('');
    setHypothesis('');
    setTargetFace(null);

    // Select the new branch
    selectFace(targetFace);
  };

  // Handle linking sessions
  const handleLinkSession = () => {
    if (selectedFace === null || linkFace === null) return;

    linkSessions(selectedFace, linkFace);
    setShowLinkModal(false);
    setLinkFace(null);
  };

  // Handle unlinking
  const handleUnlink = (linkedFaceIndex: number) => {
    if (selectedFace === null) return;
    unlinkSessions(selectedFace, linkedFaceIndex);
  };

  // If no session selected or not active, don't show
  if (!hasActiveTmux) {
    return null;
  }

  return (
    <div className="arbor-panel">
      <div className="arbor-header">
        <span className="arbor-icon">🌳</span>
        <span className="arbor-title">Arbor</span>
      </div>

      <div className="arbor-actions">
        {/* Branch Button */}
        <button
          className="arbor-btn branch"
          onClick={() => setShowBranchModal(true)}
          disabled={emptyFaces.length === 0}
          title={emptyFaces.length === 0 ? 'No empty faces available' : 'Create hypothesis branch'}
        >
          <span className="btn-icon">⑃</span>
          Branch
        </button>

        {/* Link Button */}
        <button
          className="arbor-btn link"
          onClick={() => setShowLinkModal(true)}
          disabled={linkableSessions.length === 0}
          title={linkableSessions.length === 0 ? 'No other sessions to link' : 'Link to another session'}
        >
          <span className="btn-icon">⬡⬡</span>
          Link
        </button>
      </div>

      {/* Hypothesis Status (if this is a branch) */}
      {selectedSession?.hypothesisBranch && (
        <div className="hypothesis-controls">
          <label className="control-label">Hypothesis Status</label>
          <div className="status-buttons">
            {(['exploring', 'promising', 'abandoned', 'merged'] as const).map((status) => (
              <button
                key={status}
                className={`status-btn ${status} ${selectedSession.hypothesisBranch?.status === status ? 'active' : ''}`}
                onClick={() => updateHypothesisStatus(selectedFace!, status)}
              >
                {status === 'exploring' && '🔍'}
                {status === 'promising' && '✨'}
                {status === 'abandoned' && '❌'}
                {status === 'merged' && '✅'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Branch Modal */}
      {showBranchModal && (
        <div className="modal-overlay" onClick={() => setShowBranchModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Hypothesis Branch</h3>
            <p className="modal-desc">
              Branch from <strong>#{String((selectedFace || 0) + 1).padStart(2, '0')}</strong> to explore an alternative approach.
            </p>

            <div className="form-group">
              <label>Target Face</label>
              <select
                value={targetFace ?? ''}
                onChange={(e) => setTargetFace(Number(e.target.value))}
              >
                <option value="">Select empty face...</option>
                {emptyFaces.map((face) => (
                  <option key={face} value={face}>
                    Face #{String(face + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Branch Name</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g., approach-a, redis-cache, new-algorithm"
              />
            </div>

            <div className="form-group">
              <label>Hypothesis (optional)</label>
              <textarea
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
                placeholder="What are you testing? e.g., 'Using Redis instead of SQLite will reduce latency by 50%'"
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowBranchModal(false)}>
                Cancel
              </button>
              <button
                className="btn-create"
                onClick={handleCreateBranch}
                disabled={!targetFace || !branchName}
              >
                Create Branch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Link Sessions</h3>
            <p className="modal-desc">
              Link <strong>#{String((selectedFace || 0) + 1).padStart(2, '0')}</strong> to another session for coordination.
            </p>

            <div className="form-group">
              <label>Link to Session</label>
              <select
                value={linkFace ?? ''}
                onChange={(e) => setLinkFace(Number(e.target.value))}
              >
                <option value="">Select session...</option>
                {linkableSessions
                  .filter((s) => !selectedSession?.linkedSessions?.includes(s.id))
                  .map((s) => (
                    <option key={s.faceIndex} value={s.faceIndex}>
                      #{String(s.faceIndex + 1).padStart(2, '0')} - {s.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowLinkModal(false)}>
                Cancel
              </button>
              <button
                className="btn-create"
                onClick={handleLinkSession}
                disabled={linkFace === null}
              >
                Link Sessions
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .arbor-panel {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
        }

        .arbor-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .arbor-icon {
          font-size: 14px;
        }

        .arbor-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
        }

        .arbor-actions {
          display: flex;
          gap: 8px;
        }

        .arbor-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--text-secondary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .arbor-btn:hover:not(:disabled) {
          background: var(--bg-primary);
          border-color: rgba(0, 255, 255, 0.3);
          color: var(--text-primary);
        }

        .arbor-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .arbor-btn.branch:hover:not(:disabled) {
          border-color: rgba(255, 193, 7, 0.4);
          color: #ffc107;
        }

        .arbor-btn.link:hover:not(:disabled) {
          border-color: rgba(0, 255, 255, 0.4);
          color: #00ffff;
        }

        .btn-icon {
          font-size: 14px;
        }

        .hypothesis-controls {
          margin-top: 12px;
        }

        .control-label {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .status-buttons {
          display: flex;
          gap: 6px;
        }

        .status-btn {
          flex: 1;
          padding: 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .status-btn:hover {
          background: var(--bg-primary);
        }

        .status-btn.exploring.active {
          background: rgba(255, 193, 7, 0.2);
          border-color: rgba(255, 193, 7, 0.4);
        }

        .status-btn.promising.active {
          background: rgba(76, 175, 80, 0.2);
          border-color: rgba(76, 175, 80, 0.4);
        }

        .status-btn.abandoned.active {
          background: rgba(244, 67, 54, 0.2);
          border-color: rgba(244, 67, 54, 0.4);
        }

        .status-btn.merged.active {
          background: rgba(33, 150, 243, 0.2);
          border-color: rgba(33, 150, 243, 0.4);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 24px;
          width: 400px;
          max-width: 90vw;
        }

        .modal-content h3 {
          margin: 0 0 8px;
          font-size: 16px;
          color: var(--text-primary);
        }

        .modal-desc {
          margin: 0 0 20px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--text-primary);
          font-size: 13px;
          font-family: inherit;
        }

        .form-group textarea {
          resize: vertical;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: rgba(0, 255, 255, 0.5);
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .btn-cancel {
          padding: 10px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--text-secondary);
          font-size: 13px;
          cursor: pointer;
        }

        .btn-cancel:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .btn-create {
          padding: 10px 16px;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 4px;
          color: #00ffff;
          font-size: 13px;
          cursor: pointer;
        }

        .btn-create:hover:not(:disabled) {
          background: rgba(0, 255, 255, 0.2);
        }

        .btn-create:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
