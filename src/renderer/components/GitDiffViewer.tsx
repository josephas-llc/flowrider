import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';

interface GitDiff {
  file: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  hunks?: Array<{
    header: string;
    lines: Array<{
      type: 'add' | 'remove' | 'context';
      content: string;
      lineNumber?: number;
    }>;
  }>;
}

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitDiff[];
  unstaged: GitDiff[];
  untracked: string[];
}

interface GitDiffViewerProps {
  workingDir: string;
  compact?: boolean;
  maxHeight?: string;
}

const STATUS_ICONS: Record<string, string> = {
  added: '+',
  modified: '~',
  deleted: '-',
  renamed: '>',
};

const STATUS_COLORS: Record<string, string> = {
  added: '#4caf50',
  modified: '#ffc107',
  deleted: '#f44336',
  renamed: '#2196f3',
};

export const GitDiffViewer: React.FC<GitDiffViewerProps> = ({
  workingDir,
  compact = false,
  maxHeight = '300px',
}) => {
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiff, setFileDiff] = useState<GitDiff | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(!compact);

  const loadGitStatus = useCallback(async () => {
    if (!workingDir || !window.flowrider) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulate git status call - in a real implementation this would call the backend
      // For now, we'll use the tmux session to run git commands
      const result = await window.flowrider.git.detectRepo(workingDir);

      if ((result as any).success && (result as any).data) {
        // Parse git status from the working directory
        // This is a simplified version - full implementation would parse git diff output
        setGitStatus({
          branch: (result as any).data.branch || 'main',
          ahead: 0,
          behind: 0,
          staged: [],
          unstaged: [],
          untracked: [],
        });
      } else {
        setGitStatus(null);
      }
    } catch (err) {
      setError('Not a git repository');
      setGitStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [workingDir]);

  useEffect(() => {
    loadGitStatus();
    // Refresh git status every 30 seconds
    const interval = setInterval(loadGitStatus, 30000);
    return () => clearInterval(interval);
  }, [loadGitStatus]);

  const handleFileClick = async (file: string, diff: GitDiff) => {
    if (selectedFile === file) {
      setSelectedFile(null);
      setFileDiff(null);
    } else {
      setSelectedFile(file);
      setFileDiff(diff);
    }
  };

  const totalChanges = gitStatus
    ? gitStatus.staged.length + gitStatus.unstaged.length + gitStatus.untracked.length
    : 0;

  if (!workingDir) {
    return null;
  }

  return (
    <div className="git-diff-viewer">
      <div
        className="git-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="git-header-left">
          <span className="git-icon">◇</span>
          <span className="git-title">Git Changes</span>
          {gitStatus && (
            <span className="git-branch">
              {gitStatus.branch}
              {gitStatus.ahead > 0 && <span className="ahead">↑{gitStatus.ahead}</span>}
              {gitStatus.behind > 0 && <span className="behind">↓{gitStatus.behind}</span>}
            </span>
          )}
        </div>
        <div className="git-header-right">
          {totalChanges > 0 && (
            <span className="change-count">{totalChanges}</span>
          )}
          <button
            className="refresh-btn"
            onClick={(e) => {
              e.stopPropagation();
              loadGitStatus();
            }}
            title="Refresh"
          >
            ↻
          </button>
          <span className="toggle-icon">{isExpanded ? '−' : '+'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="git-content" style={{ maxHeight }}>
          {isLoading ? (
            <div className="git-loading">Checking git status...</div>
          ) : error ? (
            <div className="git-empty">{error}</div>
          ) : !gitStatus ? (
            <div className="git-empty">No git repository detected</div>
          ) : totalChanges === 0 ? (
            <div className="git-clean">
              <span className="clean-icon">✓</span>
              <span>Working tree clean</span>
            </div>
          ) : (
            <>
              {/* Staged Changes */}
              {gitStatus.staged.length > 0 && (
                <div className="git-section">
                  <div className="section-header">
                    <span className="section-icon">◈</span>
                    <span className="section-title">Staged</span>
                    <span className="section-count">{gitStatus.staged.length}</span>
                  </div>
                  <div className="file-list">
                    {gitStatus.staged.map((diff) => (
                      <div
                        key={diff.file}
                        className={`file-item ${selectedFile === diff.file ? 'selected' : ''}`}
                        onClick={() => handleFileClick(diff.file, diff)}
                      >
                        <span
                          className="file-status"
                          style={{ color: STATUS_COLORS[diff.status] }}
                        >
                          {STATUS_ICONS[diff.status]}
                        </span>
                        <span className="file-name">{diff.file}</span>
                        <div className="file-stats">
                          {diff.additions > 0 && (
                            <span className="additions">+{diff.additions}</span>
                          )}
                          {diff.deletions > 0 && (
                            <span className="deletions">-{diff.deletions}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unstaged Changes */}
              {gitStatus.unstaged.length > 0 && (
                <div className="git-section">
                  <div className="section-header">
                    <span className="section-icon">○</span>
                    <span className="section-title">Changed</span>
                    <span className="section-count">{gitStatus.unstaged.length}</span>
                  </div>
                  <div className="file-list">
                    {gitStatus.unstaged.map((diff) => (
                      <div
                        key={diff.file}
                        className={`file-item ${selectedFile === diff.file ? 'selected' : ''}`}
                        onClick={() => handleFileClick(diff.file, diff)}
                      >
                        <span
                          className="file-status"
                          style={{ color: STATUS_COLORS[diff.status] }}
                        >
                          {STATUS_ICONS[diff.status]}
                        </span>
                        <span className="file-name">{diff.file}</span>
                        <div className="file-stats">
                          {diff.additions > 0 && (
                            <span className="additions">+{diff.additions}</span>
                          )}
                          {diff.deletions > 0 && (
                            <span className="deletions">-{diff.deletions}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Untracked Files */}
              {gitStatus.untracked.length > 0 && (
                <div className="git-section">
                  <div className="section-header">
                    <span className="section-icon">?</span>
                    <span className="section-title">Untracked</span>
                    <span className="section-count">{gitStatus.untracked.length}</span>
                  </div>
                  <div className="file-list">
                    {gitStatus.untracked.map((file) => (
                      <div key={file} className="file-item untracked">
                        <span className="file-status" style={{ color: '#888' }}>?</span>
                        <span className="file-name">{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diff View */}
              {fileDiff && fileDiff.hunks && (
                <div className="diff-view">
                  <div className="diff-header">
                    <span className="diff-file">{fileDiff.file}</span>
                    <button
                      className="close-diff"
                      onClick={() => {
                        setSelectedFile(null);
                        setFileDiff(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div className="diff-content">
                    {fileDiff.hunks.map((hunk, idx) => (
                      <div key={idx} className="diff-hunk">
                        <div className="hunk-header">{hunk.header}</div>
                        {hunk.lines.map((line, lineIdx) => (
                          <div
                            key={lineIdx}
                            className={`diff-line ${line.type}`}
                          >
                            <span className="line-number">{line.lineNumber || ''}</span>
                            <span className="line-content">{line.content}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <style>{`
        .git-diff-viewer {
          margin: 12px 0;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
        }

        .git-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .git-header:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .git-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .git-icon {
          color: #00ffff;
          font-size: 14px;
        }

        .git-title {
          font-size: 12px;
          font-weight: 600;
          color: #00ffff;
        }

        .git-branch {
          font-size: 11px;
          color: #888;
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }

        .git-branch .ahead {
          color: #4caf50;
          margin-left: 4px;
        }

        .git-branch .behind {
          color: #f44336;
          margin-left: 4px;
        }

        .git-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .change-count {
          font-size: 10px;
          padding: 2px 6px;
          background: rgba(0, 255, 255, 0.2);
          color: #00ffff;
          border-radius: 10px;
        }

        .refresh-btn {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 14px;
          padding: 2px;
          transition: color 0.2s;
        }

        .refresh-btn:hover {
          color: #00ffff;
        }

        .toggle-icon {
          color: #666;
          font-size: 14px;
        }

        .git-content {
          padding: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          overflow-y: auto;
        }

        .git-loading,
        .git-empty {
          text-align: center;
          padding: 20px;
          color: #888;
          font-size: 12px;
        }

        .git-clean {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 20px;
          color: #4caf50;
          font-size: 12px;
        }

        .clean-icon {
          font-size: 16px;
        }

        .git-section {
          margin-bottom: 12px;
        }

        .git-section:last-child {
          margin-bottom: 0;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        .section-icon {
          color: #888;
          font-size: 12px;
        }

        .section-title {
          font-size: 11px;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
        }

        .section-count {
          font-size: 10px;
          color: #666;
          padding: 1px 4px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid transparent;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .file-item:hover {
          background: rgba(0, 255, 255, 0.05);
          border-color: rgba(0, 255, 255, 0.2);
        }

        .file-item.selected {
          background: rgba(0, 255, 255, 0.1);
          border-color: rgba(0, 255, 255, 0.3);
        }

        .file-status {
          font-size: 12px;
          font-weight: bold;
          font-family: monospace;
          width: 14px;
          text-align: center;
        }

        .file-name {
          flex: 1;
          font-size: 12px;
          color: #e0e0e0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-stats {
          display: flex;
          gap: 4px;
          font-size: 10px;
          font-family: monospace;
        }

        .additions {
          color: #4caf50;
        }

        .deletions {
          color: #f44336;
        }

        .diff-view {
          margin-top: 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          overflow: hidden;
        }

        .diff-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .diff-file {
          font-size: 11px;
          font-family: monospace;
          color: #00ffff;
        }

        .close-diff {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
        }

        .close-diff:hover {
          color: #fff;
        }

        .diff-content {
          max-height: 200px;
          overflow-y: auto;
        }

        .diff-hunk {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .diff-hunk:last-child {
          border-bottom: none;
        }

        .hunk-header {
          padding: 4px 12px;
          background: rgba(0, 255, 255, 0.05);
          color: #888;
          font-size: 10px;
          font-family: monospace;
        }

        .diff-line {
          display: flex;
          font-size: 11px;
          font-family: monospace;
          line-height: 1.4;
        }

        .diff-line.add {
          background: rgba(76, 175, 80, 0.15);
        }

        .diff-line.remove {
          background: rgba(244, 67, 54, 0.15);
        }

        .line-number {
          width: 40px;
          padding: 0 8px;
          color: #555;
          text-align: right;
          user-select: none;
        }

        .line-content {
          flex: 1;
          padding: 0 8px;
          color: #e0e0e0;
          white-space: pre;
        }

        .diff-line.add .line-content::before {
          content: '+';
          color: #4caf50;
          margin-right: 4px;
        }

        .diff-line.remove .line-content::before {
          content: '-';
          color: #f44336;
          margin-right: 4px;
        }

        /* Scrollbar */
        .git-content::-webkit-scrollbar,
        .diff-content::-webkit-scrollbar {
          width: 4px;
        }

        .git-content::-webkit-scrollbar-track,
        .diff-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .git-content::-webkit-scrollbar-thumb,
        .diff-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};
