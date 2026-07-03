import React, { useState, useEffect, useCallback } from 'react';

interface Repository {
  name: string;
  fullName: string;
  description: string;
  isPrivate: boolean;
  defaultBranch: string;
  url: string;
  pushedAt: string;
  language: string;
}

interface WorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | null;
  branch: string;
  event: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  actor: string;
}

interface Release {
  id: number;
  tagName: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  createdAt: string;
  publishedAt: string;
  url: string;
  author: string;
  assets: Array<{
    name: string;
    size: number;
    downloadCount: number;
    downloadUrl: string;
  }>;
}

interface DeployStats {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  averageDuration: number;
  deploymentsByRepo: Record<string, number>;
  mostActiveRepo: string;
  lastDeployment: number | null;
}

type TabType = 'repos' | 'workflows' | 'releases' | 'stats';

export const DeployPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [stats, setStats] = useState<DeployStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('repos');
  const [error, setError] = useState<string | null>(null);

  // Check availability
  useEffect(() => {
    const checkAvailability = async () => {
      if (!window.flowrider?.deploy) {
        setIsAvailable(false);
        setLoading(false);
        return;
      }

      try {
        const result = await window.flowrider.deploy.isAvailable();
        setIsAvailable(result.data ?? false);
        if (result.data) {
          loadRepos();
          loadStats();
        }
      } catch (err) {
        console.error('[DeployPanel] Availability check failed:', err);
        setIsAvailable(false);
      }
      setLoading(false);
    };

    checkAvailability();
  }, []);

  // Load repos
  const loadRepos = useCallback(async () => {
    if (!window.flowrider?.deploy) return;
    try {
      const result = await window.flowrider.deploy.listRepos();
      if (result.success && result.data) {
        setRepos(result.data as Repository[]);
        if (result.data.length > 0 && !selectedRepo) {
          setSelectedRepo((result.data[0] as Repository).name);
        }
      }
    } catch (err) {
      console.error('[DeployPanel] Failed to load repos:', err);
      setError('Failed to load repositories');
    }
  }, [selectedRepo]);

  // Load stats
  const loadStats = useCallback(async () => {
    if (!window.flowrider?.deploy) return;
    try {
      const result = await window.flowrider.deploy.getStats();
      if (result.success && result.data) {
        setStats(result.data as DeployStats);
      }
    } catch (err) {
      console.error('[DeployPanel] Failed to load stats:', err);
    }
  }, []);

  // Load workflow runs when repo changes
  useEffect(() => {
    if (!selectedRepo || !window.flowrider?.deploy) return;

    const loadWorkflows = async () => {
      try {
        const result = await window.flowrider.deploy.listWorkflowRuns(selectedRepo, 10);
        if (result.success && result.data) {
          setWorkflowRuns(result.data as WorkflowRun[]);
        }
      } catch (err) {
        console.error('[DeployPanel] Failed to load workflows:', err);
      }
    };

    const loadReleases = async () => {
      try {
        const result = await window.flowrider.deploy.listReleases(selectedRepo, 10);
        if (result.success && result.data) {
          setReleases(result.data as Release[]);
        }
      } catch (err) {
        console.error('[DeployPanel] Failed to load releases:', err);
      }
    };

    loadWorkflows();
    loadReleases();
  }, [selectedRepo]);

  // Rerun workflow
  const handleRerunWorkflow = async (runId: number) => {
    if (!selectedRepo || !window.flowrider?.deploy) return;
    try {
      await window.flowrider.deploy.rerunWorkflow(selectedRepo, runId);
      // Refresh after a brief delay
      setTimeout(() => {
        if (selectedRepo) {
          window.flowrider.deploy.listWorkflowRuns(selectedRepo, 10).then((result) => {
            if (result.success && result.data) {
              setWorkflowRuns(result.data as WorkflowRun[]);
            }
          });
        }
      }, 2000);
    } catch (err) {
      console.error('[DeployPanel] Failed to rerun workflow:', err);
      setError('Failed to rerun workflow');
    }
  };

  // Create release
  const handleCreateRelease = async () => {
    if (!selectedRepo || !window.flowrider?.deploy) return;
    const tagName = prompt('Enter tag name (e.g., v1.0.0):');
    if (!tagName) return;
    const title = prompt('Enter release title:', tagName);
    const notes = prompt('Enter release notes (optional):');

    try {
      const result = await window.flowrider.deploy.createRelease(
        selectedRepo,
        tagName,
        title || tagName,
        notes || undefined
      );
      if (result.success) {
        // Refresh releases
        const releasesResult = await window.flowrider.deploy.listReleases(selectedRepo, 10);
        if (releasesResult.success && releasesResult.data) {
          setReleases(releasesResult.data as Release[]);
        }
        loadStats(); // Refresh stats
      } else {
        setError(result.error || 'Failed to create release');
      }
    } catch (err) {
      console.error('[DeployPanel] Failed to create release:', err);
      setError('Failed to create release');
    }
  };

  // Format time
  const formatTime = (timestamp: string | number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  // Get status color
  const getStatusColor = (conclusion: string | null, status: string) => {
    if (status === 'in_progress' || status === 'queued') return '#f0b400';
    if (conclusion === 'success') return '#00ff88';
    if (conclusion === 'failure') return '#ff4444';
    if (conclusion === 'cancelled') return '#888888';
    return '#666666';
  };

  if (loading) {
    return (
      <div className="deploy-panel" style={panelStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, color: '#00d4ff' }}>Deployments</h3>
          {onClose && <button onClick={onClose} style={closeButtonStyle}>X</button>}
        </div>
        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
          Loading deployment service...
        </div>
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="deploy-panel" style={panelStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, color: '#00d4ff' }}>Deployments</h3>
          {onClose && <button onClick={onClose} style={closeButtonStyle}>X</button>}
        </div>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ color: '#ff6464' }}>GitHub CLI not available</p>
          <p style={{ color: '#888', fontSize: 12 }}>
            Install and authenticate GitHub CLI:
            <br />
            <code style={{ background: '#1a1a2e', padding: '4px 8px', borderRadius: 4 }}>
              brew install gh && gh auth login
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="deploy-panel" style={panelStyle}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0, color: '#00d4ff' }}>Deployments</h3>
        {onClose && <button onClick={onClose} style={closeButtonStyle}>X</button>}
      </div>

      {error && (
        <div style={{ padding: '8px 16px', background: 'rgba(255,68,68,0.2)', color: '#ff4444', fontSize: 12 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 8, cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div style={tabsStyle}>
        {(['repos', 'workflows', 'releases', 'stats'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...tabStyle,
              background: activeTab === tab ? 'rgba(0,212,255,0.2)' : 'transparent',
              borderBottom: activeTab === tab ? '2px solid #00d4ff' : '2px solid transparent',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Repo selector */}
      {repos.length > 0 && activeTab !== 'stats' && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #333' }}>
          <select
            value={selectedRepo || ''}
            onChange={(e) => setSelectedRepo(e.target.value)}
            style={selectStyle}
          >
            {repos.map((repo) => (
              <option key={repo.name} value={repo.name}>
                {repo.name} {repo.language && `(${repo.language})`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      <div style={contentStyle}>
        {activeTab === 'repos' && (
          <div>
            {repos.map((repo) => (
              <div
                key={repo.name}
                style={{
                  ...itemStyle,
                  background: selectedRepo === repo.name ? 'rgba(0,212,255,0.1)' : 'transparent',
                }}
                onClick={() => setSelectedRepo(repo.name)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#00d4ff', fontWeight: 500 }}>{repo.name}</span>
                  <span style={{ color: '#666', fontSize: 11 }}>{repo.language}</span>
                </div>
                <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                  {repo.description || 'No description'}
                </div>
                <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>
                  Last push: {formatTime(repo.pushedAt)}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'workflows' && (
          <div>
            {workflowRuns.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                No workflow runs found
              </div>
            ) : (
              workflowRuns.map((run) => (
                <div key={run.id} style={itemStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: getStatusColor(run.conclusion, run.status),
                        }}
                      />
                      <span style={{ color: '#ddd' }}>{run.name}</span>
                    </span>
                    <button
                      onClick={() => handleRerunWorkflow(run.id)}
                      style={smallButtonStyle}
                      disabled={run.status !== 'completed'}
                    >
                      Rerun
                    </button>
                  </div>
                  <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                    {run.branch} - {run.event} by {run.actor}
                  </div>
                  <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>
                    {formatTime(run.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'releases' && (
          <div>
            <div style={{ padding: '8px 16px' }}>
              <button onClick={handleCreateRelease} style={buttonStyle}>
                + Create Release
              </button>
            </div>
            {releases.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                No releases found
              </div>
            ) : (
              releases.map((release) => (
                <div key={release.id} style={itemStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#00ff88' }}>{release.tagName}</span>
                    <span style={{ color: '#666', fontSize: 11 }}>
                      {release.draft && 'Draft'} {release.prerelease && 'Pre-release'}
                    </span>
                  </div>
                  <div style={{ color: '#ddd', fontSize: 13, marginTop: 4 }}>
                    {release.name}
                  </div>
                  {release.assets.length > 0 && (
                    <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>
                      {release.assets.length} asset(s) - {release.assets.reduce((sum, a) => sum + a.downloadCount, 0)} downloads
                    </div>
                  )}
                  <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>
                    by {release.author} - {formatTime(release.publishedAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div style={{ padding: 16 }}>
            <div style={statCardStyle}>
              <div style={{ color: '#888', fontSize: 11 }}>Total Deployments</div>
              <div style={{ color: '#00d4ff', fontSize: 24, fontWeight: 600 }}>
                {stats.totalDeployments}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div style={statCardStyle}>
                <div style={{ color: '#888', fontSize: 11 }}>Successful</div>
                <div style={{ color: '#00ff88', fontSize: 20, fontWeight: 600 }}>
                  {stats.successfulDeployments}
                </div>
              </div>
              <div style={statCardStyle}>
                <div style={{ color: '#888', fontSize: 11 }}>Failed</div>
                <div style={{ color: '#ff4444', fontSize: 20, fontWeight: 600 }}>
                  {stats.failedDeployments}
                </div>
              </div>
            </div>
            <div style={{ ...statCardStyle, marginTop: 12 }}>
              <div style={{ color: '#888', fontSize: 11 }}>Success Rate</div>
              <div style={{ color: '#ddd', fontSize: 20, fontWeight: 600 }}>
                {stats.totalDeployments > 0
                  ? `${((stats.successfulDeployments / stats.totalDeployments) * 100).toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
            <div style={{ ...statCardStyle, marginTop: 12 }}>
              <div style={{ color: '#888', fontSize: 11 }}>Avg Duration</div>
              <div style={{ color: '#ddd', fontSize: 16 }}>
                {stats.averageDuration > 0 ? `${(stats.averageDuration / 1000).toFixed(1)}s` : 'N/A'}
              </div>
            </div>
            {stats.mostActiveRepo && (
              <div style={{ ...statCardStyle, marginTop: 12 }}>
                <div style={{ color: '#888', fontSize: 11 }}>Most Active Repo</div>
                <div style={{ color: '#00d4ff', fontSize: 14 }}>{stats.mostActiveRepo}</div>
              </div>
            )}
            <div style={{ ...statCardStyle, marginTop: 12 }}>
              <div style={{ color: '#888', fontSize: 11 }}>Last Deployment</div>
              <div style={{ color: '#ddd', fontSize: 14 }}>{formatTime(stats.lastDeployment)}</div>
            </div>
            <div style={{ marginTop: 16, padding: '8px 12px', background: 'rgba(0,212,255,0.1)', borderRadius: 8, fontSize: 11, color: '#888' }}>
              All deployment data is being fed to LEO AI for pattern analysis and self-improvement
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Styles
const panelStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #0d0d1a 0%, #1a1a2e 100%)',
  borderRadius: 12,
  border: '1px solid rgba(0,212,255,0.2)',
  overflow: 'hidden',
  maxHeight: '70vh',
  display: 'flex',
  flexDirection: 'column',
  width: 400,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid #333',
  background: 'rgba(0,212,255,0.05)',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#888',
  fontSize: 16,
  cursor: 'pointer',
  padding: '4px 8px',
};

const tabsStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #333',
};

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 12px',
  border: 'none',
  background: 'transparent',
  color: '#888',
  cursor: 'pointer',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: '#1a1a2e',
  border: '1px solid #333',
  borderRadius: 6,
  color: '#ddd',
  fontSize: 13,
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
};

const itemStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  cursor: 'pointer',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: 'linear-gradient(90deg, #00d4ff 0%, #00ff88 100%)',
  border: 'none',
  borderRadius: 6,
  color: '#0a0a0f',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  width: '100%',
};

const smallButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  background: 'rgba(0,212,255,0.2)',
  border: '1px solid rgba(0,212,255,0.4)',
  borderRadius: 4,
  color: '#00d4ff',
  fontSize: 11,
  cursor: 'pointer',
};

const statCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 8,
  padding: '12px 16px',
  border: '1px solid rgba(255,255,255,0.05)',
};

export default DeployPanel;
