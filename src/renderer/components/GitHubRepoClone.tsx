import React, { useState, useEffect } from 'react';
import { useStore } from '../store';

interface GitHubRepo {
  owner: string;
  repo: string;
  url: string;
  description?: string;
}

interface GitHubRepoCloneProps {
  faceIndex: number;
  onClone: (repo: GitHubRepo, cloneDir: string) => void;
}

export const GitHubRepoClone: React.FC<GitHubRepoCloneProps> = ({ faceIndex, onClone }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoError, setRepoError] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [recentRepos, setRecentRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  // Load recent/starred repos from GitHub (if authenticated)
  useEffect(() => {
    if (isExpanded) {
      loadRecentRepos();
    }
  }, [isExpanded]);

  const loadRecentRepos = async () => {
    if (!window.flowrider) return;

    setLoadingRepos(true);
    try {
      // Try to get repos from gh CLI
      const result = await window.flowrider.github?.listRepos?.();
      if (result?.success && result.data) {
        setRecentRepos(result.data.slice(0, 10)); // Top 10 repos
      }
    } catch (err) {
      // Silently fail - user may not have gh CLI or be authenticated
      console.log('[GitHubRepoClone] Could not load repos:', err);
    } finally {
      setLoadingRepos(false);
    }
  };

  // Parse GitHub URL
  const parseGitHubUrl = (url: string): GitHubRepo | null => {
    // Support various formats:
    // https://github.com/owner/repo
    // https://github.com/owner/repo.git
    // git@github.com:owner/repo.git
    // owner/repo

    let owner: string | undefined;
    let repo: string | undefined;

    // Full HTTPS URL
    const httpsMatch = url.match(/github\.com[/:]([^/]+)\/([^/.\s]+)/);
    if (httpsMatch) {
      owner = httpsMatch[1];
      repo = httpsMatch[2].replace(/\.git$/, '');
    }

    // SSH URL
    const sshMatch = url.match(/git@github\.com:([^/]+)\/([^/.\s]+)/);
    if (sshMatch) {
      owner = sshMatch[1];
      repo = sshMatch[2].replace(/\.git$/, '');
    }

    // Short format: owner/repo
    const shortMatch = url.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (shortMatch) {
      owner = shortMatch[1];
      repo = shortMatch[2];
    }

    if (owner && repo) {
      return {
        owner,
        repo,
        url: `https://github.com/${owner}/${repo}`,
      };
    }

    return null;
  };

  const handleClone = async (repoInfo?: GitHubRepo) => {
    const repo = repoInfo || parseGitHubUrl(repoUrl);

    if (!repo) {
      setRepoError('Invalid GitHub URL. Use format: owner/repo or full URL');
      return;
    }

    setRepoError(null);
    setIsCloning(true);

    try {
      // Default clone location
      const homeDir = process.env.HOME || '~';
      const cloneDir = `${homeDir}/code/${repo.repo}`;

      onClone(repo, cloneDir);
      setRepoUrl('');
      setIsExpanded(false);
    } catch (err) {
      setRepoError(err instanceof Error ? err.message : 'Failed to clone');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="github-clone-section">
      <div
        className="clone-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="clone-icon">⬇</span>
        <span className="clone-title">Clone from GitHub</span>
        <span className="clone-toggle">{isExpanded ? '−' : '+'}</span>
      </div>

      {isExpanded && (
        <div className="clone-content">
          {/* URL Input */}
          <div className="clone-input-row">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value);
                setRepoError(null);
              }}
              placeholder="owner/repo or GitHub URL"
              className="clone-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && repoUrl.trim()) {
                  handleClone();
                }
              }}
            />
            <button
              onClick={() => handleClone()}
              disabled={!repoUrl.trim() || isCloning}
              className="clone-btn"
            >
              {isCloning ? '...' : 'Clone'}
            </button>
          </div>

          {repoError && (
            <div className="clone-error">{repoError}</div>
          )}

          {/* Recent Repos */}
          {loadingRepos ? (
            <div className="clone-loading">Loading repos...</div>
          ) : recentRepos.length > 0 ? (
            <div className="recent-repos">
              <div className="recent-label">Your Repos</div>
              {recentRepos.map((repo) => (
                <div
                  key={`${repo.owner}/${repo.repo}`}
                  className="repo-item"
                  onClick={() => handleClone(repo)}
                >
                  <span className="repo-name">{repo.owner}/{repo.repo}</span>
                  {repo.description && (
                    <span className="repo-desc">{repo.description}</span>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <style>{`
        .github-clone-section {
          margin: 12px 0;
          background: rgba(88, 166, 255, 0.05);
          border: 1px solid rgba(88, 166, 255, 0.2);
          border-radius: 8px;
          overflow: hidden;
        }

        .clone-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .clone-header:hover {
          background: rgba(88, 166, 255, 0.1);
        }

        .clone-icon {
          font-size: 14px;
        }

        .clone-title {
          flex: 1;
          font-size: 12px;
          font-weight: 600;
          color: #58a6ff;
        }

        .clone-toggle {
          color: #666;
          font-size: 14px;
        }

        .clone-content {
          padding: 12px;
          border-top: 1px solid rgba(88, 166, 255, 0.1);
        }

        .clone-input-row {
          display: flex;
          gap: 8px;
        }

        .clone-input {
          flex: 1;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(88, 166, 255, 0.3);
          border-radius: 4px;
          color: #e0e0e0;
          font-size: 13px;
          font-family: monospace;
        }

        .clone-input:focus {
          outline: none;
          border-color: #58a6ff;
        }

        .clone-input::placeholder {
          color: #666;
        }

        .clone-btn {
          padding: 8px 16px;
          background: rgba(88, 166, 255, 0.2);
          border: 1px solid rgba(88, 166, 255, 0.4);
          border-radius: 4px;
          color: #58a6ff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .clone-btn:hover:not(:disabled) {
          background: rgba(88, 166, 255, 0.3);
        }

        .clone-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .clone-error {
          margin-top: 8px;
          padding: 8px;
          background: rgba(255, 68, 68, 0.1);
          border: 1px solid rgba(255, 68, 68, 0.3);
          border-radius: 4px;
          color: #ff6666;
          font-size: 11px;
        }

        .clone-loading {
          margin-top: 12px;
          text-align: center;
          color: #666;
          font-size: 11px;
        }

        .recent-repos {
          margin-top: 12px;
        }

        .recent-label {
          font-size: 10px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .repo-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px;
          margin-bottom: 4px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(88, 166, 255, 0.1);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .repo-item:hover {
          background: rgba(88, 166, 255, 0.1);
          border-color: rgba(88, 166, 255, 0.3);
        }

        .repo-name {
          font-size: 12px;
          color: #58a6ff;
          font-family: monospace;
        }

        .repo-desc {
          font-size: 10px;
          color: #888;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
};

type TemplateCategory = 'development' | 'research' | 'writing' | 'custom';
