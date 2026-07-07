import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStore, LeoFlowrider } from '../store';
import { ROICalculator } from './ROICalculator';
import { ActivityLog } from './ActivityLog';
import { MCPStatus } from './MCPStatus';
import { SessionMessaging } from './SessionMessaging';
import { AIProviders } from './AIProviders';
import { LeoDodecahedron } from './LeoDodecahedron';
import { LeoAIView } from './AIView';
import { ApiSettings } from './dashboard/ApiSettings';
import { ApiKeyManager } from './dashboard/ApiKeyManager';
import { ApiDocs } from './dashboard/ApiDocs';

const formatCost = (cost: number): string => {
  return cost < 0.01 ? '<$0.01' : `$${cost.toFixed(2)}`;
};

const formatTokens = (tokens: number): string => {
  if (tokens < 1000) return tokens.toString();
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1000000).toFixed(2)}M`;
};

export const Dashboard: React.FC = () => {
  const {
    dashboard,
    dashboardView,
    setDashboardView,
    costMetrics,
    energyMetrics,
    projects,
    sessions,
    leo,
  } = useStore();

  const activeSessions = sessions.filter(s => s.status !== 'empty');

  return (
    <div className="dashboard">
      {/* Header with navigation tabs */}
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <div className="dashboard-tabs">
          {(['overview', 'providers', 'roi', 'mcp', 'messaging', 'activity', 'leo', 'leoai', 'api'] as const).map((tab) => (
            <button
              key={tab}
              className={`tab ${dashboardView === tab ? 'active' : ''}`}
              onClick={() => setDashboardView(tab as any)}
            >
              {tab === 'roi' ? 'ROI' : tab === 'mcp' ? 'MCP' : tab === 'providers' ? 'AI Models' : tab === 'leoai' ? 'AI System' : tab === 'api' ? 'API' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-content">
        {dashboardView === 'overview' && (
          <OverviewView
            dashboard={dashboard}
            costMetrics={costMetrics}
            energyMetrics={energyMetrics}
            activeSessions={activeSessions.length}
            projectCount={projects.length}
          />
        )}

        {dashboardView === 'providers' && (
          <AIProviders />
        )}

        {dashboardView === 'projects' && (
          <ProjectsView projects={projects} sessions={sessions} />
        )}

        {dashboardView === 'costs' && (
          <CostsView costMetrics={costMetrics} sessions={sessions} projects={projects} />
        )}

        {dashboardView === 'roi' && (
          <ROICalculator />
        )}

        {dashboardView === 'mcp' && (
          <MCPStatus />
        )}

        {dashboardView === 'messaging' && (
          <SessionMessaging />
        )}

        {dashboardView === 'activity' && (
          <ActivityLog />
        )}

        {dashboardView === 'leo' && (
          <LeoView leo={leo} />
        )}

        {dashboardView === 'leoai' && (
          <AIView />
        )}

        {dashboardView === 'api' && (
          <ApiView />
        )}
      </div>
    </div>
  );
};

// ============================================
// OVERVIEW VIEW
// ============================================

interface OverviewProps {
  dashboard: ReturnType<typeof useStore>['dashboard'];
  costMetrics: ReturnType<typeof useStore>['costMetrics'];
  energyMetrics: ReturnType<typeof useStore>['energyMetrics'];
  activeSessions: number;
  projectCount: number;
}

const formatEnergy = (wh: number): string => {
  if (wh < 0.001) return '<0.001 Wh';
  if (wh < 1) return `${(wh * 1000).toFixed(1)} mWh`;
  if (wh < 1000) return `${wh.toFixed(2)} Wh`;
  return `${(wh / 1000).toFixed(2)} kWh`;
};

const OverviewView: React.FC<OverviewProps> = ({
  dashboard,
  costMetrics,
  energyMetrics,
  activeSessions,
  projectCount,
}) => {
  const energySavedPercent = energyMetrics.baselineEnergy > 0
    ? ((energyMetrics.energySaved / energyMetrics.baselineEnergy) * 100).toFixed(0)
    : '0';

  return (
  <div className="overview-grid">
    <div className="metric-card primary">
      <div className="metric-icon">🎯</div>
      <div className="metric-value">{activeSessions}</div>
      <div className="metric-label">Active Sessions</div>
      <div className="metric-subtext">of 20 available</div>
    </div>

    <div className="metric-card">
      <div className="metric-icon">📁</div>
      <div className="metric-value">{projectCount}</div>
      <div className="metric-label">Projects</div>
    </div>

    <div className="metric-card accent">
      <div className="metric-icon">💰</div>
      <div className="metric-value">{formatCost(costMetrics.totalCost)}</div>
      <div className="metric-label">Total Cost</div>
    </div>

    <div className="metric-card">
      <div className="metric-icon">🔤</div>
      <div className="metric-value">{formatTokens(costMetrics.totalTokens)}</div>
      <div className="metric-label">Tokens Used</div>
    </div>

    <div className="metric-card wide">
      <div className="metric-icon">📊</div>
      <div className="metric-label">Token Breakdown</div>
      <div className="token-bar">
        <div
          className="token-input"
          style={{
            width: `${costMetrics.totalTokens > 0 ? (costMetrics.totalInputTokens / costMetrics.totalTokens) * 100 : 50}%`,
          }}
        />
        <div className="token-output" />
      </div>
      <div className="token-legend">
        <span className="input">Input: {formatTokens(costMetrics.totalInputTokens)}</span>
        <span className="output">Output: {formatTokens(costMetrics.totalOutputTokens)}</span>
      </div>
    </div>

    <div className="metric-card">
      <div className="metric-icon">⚡</div>
      <div className="metric-value">{dashboard.uptimePercent}%</div>
      <div className="metric-label">Uptime</div>
    </div>

    {/* Energy Metrics Section - ESG Appeal */}
    <div className="metric-card energy">
      <div className="metric-icon">🔋</div>
      <div className="metric-value">{formatEnergy(energyMetrics.totalEnergy)}</div>
      <div className="metric-label">Energy Used</div>
    </div>

    <div className="metric-card energy-saved">
      <div className="metric-icon">🌱</div>
      <div className="metric-value" style={{ color: '#00ff88' }}>
        {formatEnergy(energyMetrics.energySaved)}
      </div>
      <div className="metric-label">Energy Saved</div>
      <div className="metric-subtext" style={{ color: '#00ff88' }}>
        {energySavedPercent}% reduction vs baseline
      </div>
    </div>
  </div>
  );
};

// ============================================
// PROJECTS VIEW
// ============================================

interface ProjectsViewProps {
  projects: ReturnType<typeof useStore>['projects'];
  sessions: ReturnType<typeof useStore>['sessions'];
}

const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, sessions }) => {
  const { createProject, setShowProjectModal } = useStore();

  if (projects.length === 0) {
    return (
      <div className="empty-projects">
        <div className="empty-icon">📁</div>
        <h3>No Projects Yet</h3>
        <p>Create a project to organize your sessions and track costs per project.</p>
        <button
          className="btn btn-primary"
          onClick={() => createProject('New Project', 'Project description', '', '')}
        >
          Create First Project
        </button>
      </div>
    );
  }

  return (
    <div className="projects-list">
      <div className="projects-header">
        <h3>Projects ({projects.length})</h3>
        <button
          className="btn btn-secondary"
          onClick={() => createProject(`Project ${projects.length + 1}`, '', '', '')}
        >
          + New Project
        </button>
      </div>

      {projects.map((project) => {
        const projectSessions = sessions.filter(s => s.projectId === project.id);
        const activeSessions = projectSessions.filter(s => s.status !== 'empty');

        return (
          <div key={project.id} className="project-card" style={{ borderColor: project.color }}>
            <div className="project-header">
              <span className="project-icon">{project.icon}</span>
              <span className="project-name">{project.name}</span>
              <span className="project-badge" style={{ background: project.color }}>
                {activeSessions.length}/{projectSessions.length} sessions
              </span>
            </div>
            <div className="project-description">{project.description || 'No description'}</div>
            <div className="project-stats">
              <div className="stat">
                <span className="stat-value">{formatCost(project.totalCost)}</span>
                <span className="stat-label">Cost</span>
              </div>
              <div className="stat">
                <span className="stat-value">{formatTokens(project.totalTokens)}</span>
                <span className="stat-label">Tokens</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// COSTS VIEW
// ============================================

interface CostsViewProps {
  costMetrics: ReturnType<typeof useStore>['costMetrics'];
  sessions: ReturnType<typeof useStore>['sessions'];
  projects: ReturnType<typeof useStore>['projects'];
}

const CostsView: React.FC<CostsViewProps> = ({ costMetrics, sessions, projects }) => (
  <div className="costs-view">
    <div className="cost-summary">
      <div className="cost-total">
        <span className="label">Total Spend</span>
        <span className="value">{formatCost(costMetrics.totalCost)}</span>
      </div>

      <div className="cost-breakdown">
        <div className="breakdown-item">
          <span className="label">Input Tokens</span>
          <span className="value">{formatTokens(costMetrics.totalInputTokens)}</span>
          <span className="cost">{formatCost(costMetrics.totalInputTokens * 3 / 1_000_000)}</span>
        </div>
        <div className="breakdown-item">
          <span className="label">Output Tokens</span>
          <span className="value">{formatTokens(costMetrics.totalOutputTokens)}</span>
          <span className="cost">{formatCost(costMetrics.totalOutputTokens * 15 / 1_000_000)}</span>
        </div>
      </div>
    </div>

    <div className="cost-by-session">
      <h4>Cost by Session</h4>
      <div className="session-costs">
        {sessions
          .filter(s => s.estimatedCost > 0)
          .sort((a, b) => b.estimatedCost - a.estimatedCost)
          .slice(0, 10)
          .map(session => (
            <div key={session.id} className="session-cost-row">
              <span className="session-name">{session.name}</span>
              <span className="session-tokens">{formatTokens(session.totalTokens)}</span>
              <span className="session-cost">{formatCost(session.estimatedCost)}</span>
            </div>
          ))}
      </div>
    </div>

    {projects.length > 0 && (
      <div className="cost-by-project">
        <h4>Cost by Project</h4>
        <div className="project-costs">
          {projects
            .filter(p => p.totalCost > 0)
            .sort((a, b) => b.totalCost - a.totalCost)
            .map(project => (
              <div key={project.id} className="project-cost-row">
                <span className="project-icon">{project.icon}</span>
                <span className="project-name">{project.name}</span>
                <span className="project-cost">{formatCost(project.totalCost)}</span>
              </div>
            ))}
        </div>
      </div>
    )}
  </div>
);

// ============================================
// LEO VIEW
// ============================================

interface LeoViewProps {
  leo: ReturnType<typeof useStore>['leo'];
}

const LeoView: React.FC<LeoViewProps> = ({ leo }) => {
  const { toggleLeoMode, addFlowrider, removeFlowrider } = useStore();
  const [selectedFlowrider, setSelectedFlowrider] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [leoStatus, setLeoStatus] = useState<{
    enabled: boolean;
    instanceId: string;
    instanceName: string;
    apiPort: number;
  } | null>(null);

  // Fetch real LEO status when enabled
  useEffect(() => {
    const fetchStatus = async () => {
      if (!window.flowrider?.leo) return;
      try {
        const status = await window.flowrider.leo.getStatus();
        setLeoStatus(status as any);
      } catch (err) {
        console.error('[LEO] Failed to get status:', err);
      }
    };

    if (leo.enabled) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [leo.enabled]);

  // Handle LEO toggle with real IPC
  const handleToggleLeo = async () => {
    if (!window.flowrider?.leo) {
      toggleLeoMode(); // Fallback to store-only
      return;
    }

    try {
      if (leo.enabled) {
        await window.flowrider.leo.disable();
      } else {
        const result = await window.flowrider.leo.enable();
        if (!result.success) {
          console.error('[LEO] Failed to enable:', result.error);
        }
      }
      toggleLeoMode();
    } catch (err) {
      console.error('[LEO] Toggle error:', err);
      toggleLeoMode();
    }
  };

  // Discover flowriders on network
  const handleDiscover = async () => {
    if (!window.flowrider?.leo) return;

    setIsDiscovering(true);
    try {
      const result = await window.flowrider.leo.discover();
      console.log(`[LEO] Discovered ${result.count} flowriders`);

      // Fetch the updated list
      const flowriders = await window.flowrider.leo.getFlowriders();
      if (flowriders.success && flowriders.data) {
        // Update store with discovered flowriders
        (flowriders.data as LeoFlowrider[]).forEach((fr) => {
          if (!leo.flowriders.find((existing) => existing.id === fr.id)) {
            addFlowrider(fr);
          }
        });
      }
    } catch (err) {
      console.error('[LEO] Discover error:', err);
    } finally {
      setIsDiscovering(false);
    }
  };

  const addDemoFlowrider = () => {
    const id = `fr-${Date.now()}`;
    const index = leo.flowriders.length;
    addFlowrider({
      id,
      name: `Flowrider ${index + 1}`,
      status: Math.random() > 0.3 ? 'active' : 'idle',
      activeSessions: Math.floor(Math.random() * 15),
      totalSessions: 20,
      host: index < 5 ? 'localhost' : `node-${index}.cluster.local`,
      port: 3000 + index,
      lastPing: Date.now(),
      metrics: {
        cpuUsage: Math.random() * 60 + 10,
        memoryUsage: Math.random() * 50 + 20,
        uptime: Date.now() - Math.random() * 86400000,
      },
    });
  };

  const addMultipleFlowriders = (count: number) => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => addDemoFlowrider(), i * 100);
    }
  };

  const totalActiveSessions = leo.flowriders.reduce((sum, fr) => sum + fr.activeSessions, 0);
  const avgCpu = leo.flowriders.length > 0
    ? leo.flowriders.reduce((sum, fr) => sum + fr.metrics.cpuUsage, 0) / leo.flowriders.length
    : 0;
  const avgMemory = leo.flowriders.length > 0
    ? leo.flowriders.reduce((sum, fr) => sum + fr.metrics.memoryUsage, 0) / leo.flowriders.length
    : 0;

  return (
    <div className="leo-view">
      {/* Hero Section with 3D Visualization */}
      <div className="leo-hero">
        <div className="leo-hero-left">
          <div className="leo-title-section">
            <h2>LEO Orchestration</h2>
            <p>Local Execution Orchestrator - Scale to 400 concurrent AI sessions</p>
            {leoStatus && (
              <div className="leo-instance-info">
                <span className="instance-name">{leoStatus.instanceName}</span>
                <span className="instance-port">Port: {leoStatus.apiPort}</span>
              </div>
            )}
          </div>
          <div className="leo-toggle">
            <span className={`status-indicator large ${leo.enabled ? 'enabled' : 'disabled'}`}>
              {leo.enabled ? 'ACTIVE' : 'STANDBY'}
            </span>
            <button
              className={`btn ${leo.enabled ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleToggleLeo}
            >
              {leo.enabled ? 'Disable LEO' : 'Activate LEO'}
            </button>
            {leo.enabled && (
              <button
                className="btn btn-secondary"
                onClick={handleDiscover}
                disabled={isDiscovering}
                style={{ marginLeft: 8 }}
              >
                {isDiscovering ? 'Scanning...' : 'Discover'}
              </button>
            )}
          </div>
        </div>

        {/* 3D Network Visualization */}
        <div className="leo-3d-viz">
          <Canvas
            camera={{ position: [0, 0, 6], fov: 50 }}
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={0.8} />
            <pointLight position={[-10, -10, -10]} intensity={0.4} color="#ff00ff" />

            <LeoDodecahedron
              flowriders={leo.flowriders}
              selectedFlowrider={selectedFlowrider}
              onFlowriderClick={setSelectedFlowrider}
            />

            <OrbitControls
              enablePan={false}
              enableZoom={true}
              minDistance={4}
              maxDistance={10}
              autoRotate
              autoRotateSpeed={0.3}
            />
          </Canvas>
        </div>
      </div>

      {/* Capacity Overview */}
      <div className="leo-metrics-row">
        <div className="leo-metric-card">
          <div className="metric-header">Total Capacity</div>
          <div className="metric-big-value">
            {leo.flowriders.length * 20}
            <span className="metric-unit">/ 400 sessions</span>
          </div>
          <div className="capacity-bar large">
            <div
              className="capacity-fill"
              style={{ width: `${(leo.flowriders.length / 20) * 100}%` }}
            />
          </div>
        </div>

        <div className="leo-metric-card">
          <div className="metric-header">Active Sessions</div>
          <div className="metric-big-value highlight">
            {totalActiveSessions}
            <span className="metric-unit">running</span>
          </div>
        </div>

        <div className="leo-metric-card">
          <div className="metric-header">Cluster Health</div>
          <div className="metric-row">
            <span>CPU</span>
            <div className="mini-bar">
              <div style={{ width: `${avgCpu}%`, background: avgCpu > 80 ? '#ff4444' : '#00ff88' }} />
            </div>
            <span>{avgCpu.toFixed(0)}%</span>
          </div>
          <div className="metric-row">
            <span>MEM</span>
            <div className="mini-bar">
              <div style={{ width: `${avgMemory}%`, background: avgMemory > 80 ? '#ff4444' : '#00ffff' }} />
            </div>
            <span>{avgMemory.toFixed(0)}%</span>
          </div>
        </div>

        <div className="leo-metric-card action">
          <div className="metric-header">Quick Actions</div>
          <button className="btn btn-secondary" onClick={() => addMultipleFlowriders(5)}>
            + Add 5 Demo
          </button>
          <button className="btn btn-secondary" onClick={addDemoFlowrider}>
            + Add 1 Demo
          </button>
        </div>
      </div>

      {/* Flowrider Grid */}
      <div className="flowriders-section">
        <h3>Connected Flowriders ({leo.flowriders.length}/20)</h3>
        <div className="flowriders-grid">
          {leo.flowriders.length === 0 ? (
            <div className="no-flowriders">
              <div style={{ fontSize: 48, marginBottom: 16 }}>◇</div>
              <h4>No Flowriders Connected</h4>
              <p>Each flowrider can manage 20 concurrent AI sessions.</p>
              <p>Scale to 400 sessions with 20 flowriders.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
                {leo.enabled && (
                  <button className="btn btn-primary" onClick={handleDiscover} disabled={isDiscovering}>
                    {isDiscovering ? 'Scanning Network...' : 'Discover on Network'}
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => addMultipleFlowriders(5)}>
                  Launch 5 Demo Flowriders
                </button>
              </div>
            </div>
          ) : (
            leo.flowriders.map((fr) => (
              <div
                key={fr.id}
                className={`flowrider-card ${fr.status} ${selectedFlowrider === fr.id ? 'selected' : ''}`}
                onClick={() => setSelectedFlowrider(fr.id)}
              >
                <div className="fr-header">
                  <span className="fr-name">{fr.name}</span>
                  <span className={`fr-status ${fr.status}`}>{fr.status.toUpperCase()}</span>
                </div>
                <div className="fr-session-bar">
                  <div
                    className="fr-session-fill"
                    style={{ width: `${(fr.activeSessions / fr.totalSessions) * 100}%` }}
                  />
                </div>
                <div className="fr-stats">
                  <div className="fr-stat">
                    <span className="label">Sessions</span>
                    <span className="value">{fr.activeSessions}/{fr.totalSessions}</span>
                  </div>
                  <div className="fr-stat">
                    <span className="label">CPU</span>
                    <span className="value">{fr.metrics.cpuUsage.toFixed(0)}%</span>
                  </div>
                  <div className="fr-stat">
                    <span className="label">Memory</span>
                    <span className="value">{fr.metrics.memoryUsage.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="fr-endpoint">
                  {fr.host}:{fr.port}
                </div>
                <button
                  className="fr-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFlowrider(fr.id);
                  }}
                  title="Remove flowrider"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected Flowrider Details */}
      {selectedFlowrider && (
        <SelectedFlowriderPanel
          flowrider={leo.flowriders.find((fr) => fr.id === selectedFlowrider)}
          onClose={() => setSelectedFlowrider(null)}
        />
      )}
    </div>
  );
};

// Selected Flowrider Details Panel
interface SelectedFlowriderPanelProps {
  flowrider?: LeoFlowrider;
  onClose: () => void;
}

const SelectedFlowriderPanel: React.FC<SelectedFlowriderPanelProps> = ({ flowrider, onClose }) => {
  if (!flowrider) return null;

  const uptime = Date.now() - flowrider.metrics.uptime;
  const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
  const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="selected-flowrider-panel">
      <div className="panel-header">
        <h3>{flowrider.name}</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="panel-content">
        <div className="detail-row">
          <span className="label">ID</span>
          <span className="value mono">{flowrider.id}</span>
        </div>
        <div className="detail-row">
          <span className="label">Endpoint</span>
          <span className="value mono">{flowrider.host}:{flowrider.port}</span>
        </div>
        <div className="detail-row">
          <span className="label">Status</span>
          <span className={`value status-${flowrider.status}`}>{flowrider.status.toUpperCase()}</span>
        </div>
        <div className="detail-row">
          <span className="label">Sessions</span>
          <span className="value">{flowrider.activeSessions} / {flowrider.totalSessions}</span>
        </div>
        <div className="detail-row">
          <span className="label">CPU Usage</span>
          <span className="value">{flowrider.metrics.cpuUsage.toFixed(1)}%</span>
        </div>
        <div className="detail-row">
          <span className="label">Memory</span>
          <span className="value">{flowrider.metrics.memoryUsage.toFixed(1)}%</span>
        </div>
        <div className="detail-row">
          <span className="label">Uptime</span>
          <span className="value">{uptimeHours}h {uptimeMinutes}m</span>
        </div>
        <div className="detail-row">
          <span className="label">Last Ping</span>
          <span className="value">{new Date(flowrider.lastPing).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// API VIEW
// ============================================

const ApiView: React.FC = () => {
  const [apiTab, setApiTab] = useState<'settings' | 'keys' | 'docs'>('settings');

  return (
    <div className="api-view">
      {/* Sub-navigation for API sections */}
      <div className="api-sub-tabs" style={apiSubTabsStyle}>
        <button
          className={`api-tab ${apiTab === 'settings' ? 'active' : ''}`}
          onClick={() => setApiTab('settings')}
          style={{
            ...apiTabStyle,
            backgroundColor: apiTab === 'settings' ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
            borderBottom: apiTab === 'settings' ? '2px solid #00ffff' : '2px solid transparent',
          }}
        >
          ⚙️ Settings
        </button>
        <button
          className={`api-tab ${apiTab === 'keys' ? 'active' : ''}`}
          onClick={() => setApiTab('keys')}
          style={{
            ...apiTabStyle,
            backgroundColor: apiTab === 'keys' ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
            borderBottom: apiTab === 'keys' ? '2px solid #00ffff' : '2px solid transparent',
          }}
        >
          🔑 API Keys
        </button>
        <button
          className={`api-tab ${apiTab === 'docs' ? 'active' : ''}`}
          onClick={() => setApiTab('docs')}
          style={{
            ...apiTabStyle,
            backgroundColor: apiTab === 'docs' ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
            borderBottom: apiTab === 'docs' ? '2px solid #00ffff' : '2px solid transparent',
          }}
        >
          📘 Documentation
        </button>
      </div>

      {/* Tab Content */}
      <div className="api-tab-content" style={apiContentStyle}>
        {apiTab === 'settings' && <ApiSettings />}
        {apiTab === 'keys' && <ApiKeyManager />}
        {apiTab === 'docs' && <ApiDocs />}
      </div>
    </div>
  );
};

const apiSubTabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  padding: '16px 24px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'rgba(0, 0, 0, 0.2)',
};

const apiTabStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: 'transparent',
  border: 'none',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  borderRadius: '4px 4px 0 0',
};

const apiContentStyle: React.CSSProperties = {
  padding: '0',
  overflowY: 'auto',
  maxHeight: 'calc(100vh - 200px)',
};

export default Dashboard;
