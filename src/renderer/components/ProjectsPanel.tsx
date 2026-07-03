import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';

interface Repository {
  name: string;
  fullName: string;
  description: string;
  isPrivate: boolean;
  defaultBranch: string;
  url: string;
  pushedAt: string;
  language: string;
  localPath?: string; // Path if repo exists locally
}

interface LocalProject {
  path: string;
  name: string;
  lastOpened?: number;
}

type TabType = 'github' | 'local' | 'recent';

export const ProjectsPanel: React.FC = () => {
  const { sessions, selectedFace, createSession, updateSession } = useStore();

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [localProjects, setLocalProjects] = useState<LocalProject[]>([]);
  const [recentProjects, setRecentProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('github');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRepo, setLoadingRepo] = useState<string | null>(null);

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
        }
      } catch (err) {
        console.error('[ProjectsPanel] Availability check failed:', err);
        setIsAvailable(false);
      }
      setLoading(false);
    };

    checkAvailability();
    loadRecentProjects();
  }, []);

  // Check if a repo exists locally using proper IPC
  const findLocalPath = useCallback(async (repoName: string): Promise<string | undefined> => {
    if (!window.flowrider?.fs) return undefined;

    try {
      const result = await window.flowrider.fs.findLocalRepo(repoName);
      if (result?.found) {
        return result.path;
      }
    } catch {
      // Search failed, continue
    }
    return undefined;
  }, []);

  // Load GitHub repos and check for local paths
  const loadRepos = useCallback(async () => {
    if (!window.flowrider?.deploy) return;
    try {
      const result = await window.flowrider.deploy.listRepos();
      if (result.success && result.data) {
        // Check for local paths
        const reposWithLocalPaths = await Promise.all(
          result.data.map(async (repo: Repository) => {
            const localPath = await findLocalPath(repo.name);
            return { ...repo, localPath };
          })
        );
        setRepos(reposWithLocalPaths);
      }
    } catch (err) {
      console.error('[ProjectsPanel] Failed to load repos:', err);
      setError('Failed to load repositories');
    }
  }, [findLocalPath]);

  // Load recent projects from localStorage
  const loadRecentProjects = useCallback(() => {
    try {
      const stored = localStorage.getItem('flowrider-recent-projects');
      if (stored) {
        setRecentProjects(JSON.parse(stored));
      }
    } catch (err) {
      console.error('[ProjectsPanel] Failed to load recent projects:', err);
    }
  }, []);

  // Save to recent projects
  const addToRecent = useCallback((project: LocalProject) => {
    setRecentProjects(prev => {
      const filtered = prev.filter(p => p.path !== project.path);
      const updated = [{ ...project, lastOpened: Date.now() }, ...filtered].slice(0, 10);
      localStorage.setItem('flowrider-recent-projects', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Load a GitHub repo into the current session
  const loadGitHubRepo = async (repo: Repository) => {
    setLoadingRepo(repo.fullName);
    setError(null);

    try {
      const currentSession = sessions[selectedFace];

      // Use local path if available, otherwise use tmp dir
      const projectDir = repo.localPath || `/tmp/flowrider-projects/${repo.name}`;
      const isLocal = !!repo.localPath;

      if (window.flowrider?.tmux) {
        // First, create or get the session
        if (currentSession.status === 'empty') {
          await createSession(
            selectedFace,
            repo.name,
            projectDir,
            'claude'
          );
        }

        // Update session with GitHub repo info
        updateSession(currentSession.id, {
          name: repo.name,
          workingDir: projectDir,
          gitHubRepo: {
            owner: repo.fullName.split('/')[0],
            repo: repo.name,
            branch: repo.defaultBranch,
            url: repo.url,
          },
        });

        // If local, just cd to it. If not local, clone it.
        let cmd: string;
        if (isLocal) {
          cmd = `cd "${projectDir}"`;
        } else {
          cmd = `mkdir -p /tmp/flowrider-projects && cd /tmp/flowrider-projects && ([ -d "${repo.name}" ] && cd "${repo.name}" && git pull || git clone ${repo.url} "${repo.name}" && cd "${repo.name}")`;
        }

        await window.flowrider.tmux.sendKeys(currentSession.tmuxSession || `flowrider-${selectedFace}`, cmd);
        addToRecent({ path: projectDir, name: repo.name });
      }
    } catch (err) {
      console.error('[ProjectsPanel] Failed to load repo:', err);
      setError(`Failed to load ${repo.name}`);
    } finally {
      setLoadingRepo(null);
    }
  };

  // Open folder picker for local project
  const browseLocalProject = async () => {
    // For now, we'll use a simple prompt - in production this would use Electron dialog
    const path = prompt('Enter project path:');
    if (path) {
      const name = path.split('/').pop() || 'project';
      await loadLocalProject({ path, name });
    }
  };

  // Load a local project
  const loadLocalProject = async (project: LocalProject) => {
    setLoadingRepo(project.path);
    setError(null);

    try {
      const currentSession = sessions[selectedFace];

      if (currentSession.status === 'empty') {
        await createSession(
          selectedFace,
          project.name,
          project.path,
          'claude'
        );
      } else {
        updateSession(currentSession.id, {
          name: project.name,
          workingDir: project.path,
        });
      }

      // Send cd command to tmux
      if (window.flowrider?.tmux && currentSession.tmuxSession) {
        await window.flowrider.tmux.sendKeys(currentSession.tmuxSession, `cd "${project.path}"`);
      }

      addToRecent(project);
    } catch (err) {
      console.error('[ProjectsPanel] Failed to load local project:', err);
      setError(`Failed to load ${project.name}`);
    } finally {
      setLoadingRepo(null);
    }
  };

  // Filter repos by search
  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecent = recentProjects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format time ago
  const timeAgo = (date: string | number) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Language colors
  const langColors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Rust: '#dea584',
    Go: '#00ADD8',
    Java: '#b07219',
    Ruby: '#701516',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    default: '#888',
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading projects...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Load Project</h2>
        <p style={styles.subtitle}>
          Select a GitHub repo or local project to load into face {selectedFace + 1}
        </p>
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'github' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('github')}
        >
          GitHub Repos
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'recent' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('recent')}
        >
          Recent
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'local' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('local')}
        >
          Browse Local
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.error}>{error}</div>
      )}

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'github' && (
          <>
            {!isAvailable ? (
              <div style={styles.unavailable}>
                <span style={styles.warningIcon}>!</span>
                <span>GitHub CLI (gh) not available. Install with: brew install gh</span>
              </div>
            ) : filteredRepos.length === 0 ? (
              <div style={styles.empty}>
                {searchQuery ? 'No repos match your search' : 'No repositories found'}
              </div>
            ) : (
              <div style={styles.repoList}>
                {filteredRepos.map(repo => (
                  <div
                    key={repo.fullName}
                    style={styles.repoCard}
                    onClick={() => !loadingRepo && loadGitHubRepo(repo)}
                  >
                    <div style={styles.repoHeader}>
                      <span style={styles.repoName}>{repo.name}</span>
                      {repo.localPath && <span style={styles.localBadge}>Local</span>}
                      {repo.isPrivate && <span style={styles.privateBadge}>Private</span>}
                    </div>
                    <div style={styles.repoDescription}>
                      {repo.description || 'No description'}
                    </div>
                    <div style={styles.repoMeta}>
                      {repo.language && (
                        <span style={styles.language}>
                          <span
                            style={{
                              ...styles.langDot,
                              backgroundColor: langColors[repo.language] || langColors.default,
                            }}
                          />
                          {repo.language}
                        </span>
                      )}
                      <span style={styles.branch}>{repo.defaultBranch}</span>
                      <span style={styles.updated}>{timeAgo(repo.pushedAt)}</span>
                    </div>
                    {loadingRepo === repo.fullName && (
                      <div style={styles.loadingOverlay}>Loading...</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'recent' && (
          <>
            {filteredRecent.length === 0 ? (
              <div style={styles.empty}>
                {searchQuery ? 'No recent projects match' : 'No recent projects yet'}
              </div>
            ) : (
              <div style={styles.repoList}>
                {filteredRecent.map(project => (
                  <div
                    key={project.path}
                    style={styles.repoCard}
                    onClick={() => !loadingRepo && loadLocalProject(project)}
                  >
                    <div style={styles.repoHeader}>
                      <span style={styles.repoName}>{project.name}</span>
                    </div>
                    <div style={styles.repoDescription}>{project.path}</div>
                    <div style={styles.repoMeta}>
                      {project.lastOpened && (
                        <span style={styles.updated}>Opened {timeAgo(project.lastOpened)}</span>
                      )}
                    </div>
                    {loadingRepo === project.path && (
                      <div style={styles.loadingOverlay}>Loading...</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'local' && (
          <div style={styles.browseContainer}>
            <button style={styles.browseButton} onClick={browseLocalProject}>
              Browse for Project Folder
            </button>
            <p style={styles.browseHint}>
              Select a local folder to load as a project
            </p>
          </div>
        )}
      </div>

      {/* Current Session Info */}
      <div style={styles.footer}>
        <div style={styles.sessionInfo}>
          <span style={styles.sessionLabel}>Target:</span>
          <span style={styles.sessionValue}>
            Face {selectedFace + 1} - {sessions[selectedFace]?.name || 'Empty'}
          </span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#0a0a0f',
    color: '#e0e0e0',
    fontFamily: 'monospace',
  },
  header: {
    padding: '20px 24px 10px',
    borderBottom: '1px solid #1a1a2e',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#00ffff',
  },
  subtitle: {
    margin: '8px 0 0',
    fontSize: '12px',
    color: '#888',
  },
  searchContainer: {
    padding: '12px 24px',
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px',
    background: '#12121a',
    border: '1px solid #2a2a3e',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontSize: '13px',
    outline: 'none',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    padding: '0 24px',
    borderBottom: '1px solid #1a1a2e',
  },
  tab: {
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#888',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#00ffff',
    borderBottomColor: '#00ffff',
  },
  error: {
    margin: '12px 24px',
    padding: '10px 14px',
    background: 'rgba(255, 60, 60, 0.1)',
    border: '1px solid rgba(255, 60, 60, 0.3)',
    borderRadius: '6px',
    color: '#ff6b6b',
    fontSize: '12px',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 24px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#888',
  },
  unavailable: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: 'rgba(255, 170, 0, 0.1)',
    border: '1px solid rgba(255, 170, 0, 0.3)',
    borderRadius: '8px',
    color: '#ffaa00',
    fontSize: '13px',
  },
  warningIcon: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 170, 0, 0.2)',
    borderRadius: '50%',
    fontWeight: 'bold',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#666',
    fontSize: '14px',
  },
  repoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  repoCard: {
    position: 'relative',
    padding: '14px 16px',
    background: '#12121a',
    border: '1px solid #2a2a3e',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  repoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '6px',
  },
  repoName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#00d4ff',
  },
  privateBadge: {
    padding: '2px 6px',
    background: 'rgba(255, 170, 0, 0.15)',
    border: '1px solid rgba(255, 170, 0, 0.3)',
    borderRadius: '4px',
    fontSize: '10px',
    color: '#ffaa00',
  },
  localBadge: {
    padding: '2px 6px',
    background: 'rgba(0, 255, 100, 0.15)',
    border: '1px solid rgba(0, 255, 100, 0.3)',
    borderRadius: '4px',
    fontSize: '10px',
    color: '#00ff64',
  },
  repoDescription: {
    fontSize: '12px',
    color: '#888',
    lineHeight: 1.4,
    marginBottom: '8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  repoMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    fontSize: '11px',
    color: '#666',
  },
  language: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  langDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  branch: {
    padding: '2px 6px',
    background: 'rgba(0, 255, 255, 0.1)',
    borderRadius: '4px',
    color: '#00cccc',
  },
  updated: {
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(10, 10, 15, 0.9)',
    borderRadius: '8px',
    color: '#00ffff',
    fontSize: '13px',
  },
  browseContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    gap: '16px',
  },
  browseButton: {
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #00ffff 0%, #00cccc 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#0a0a0f',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  browseHint: {
    color: '#666',
    fontSize: '12px',
    margin: 0,
  },
  footer: {
    padding: '12px 24px',
    borderTop: '1px solid #1a1a2e',
    background: '#0d0d14',
  },
  sessionInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
  },
  sessionLabel: {
    color: '#666',
  },
  sessionValue: {
    color: '#00ffff',
    fontWeight: 500,
  },
};
