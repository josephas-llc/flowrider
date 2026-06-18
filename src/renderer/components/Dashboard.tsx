import React from 'react';
import { useStore } from '../store';
import { ROICalculator } from './ROICalculator';
import { ActivityLog } from './ActivityLog';
import { MCPStatus } from './MCPStatus';
import { SessionMessaging } from './SessionMessaging';
import { AIProviders } from './AIProviders';

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
          {(['overview', 'providers', 'roi', 'mcp', 'messaging', 'activity', 'leo'] as const).map((tab) => (
            <button
              key={tab}
              className={`tab ${dashboardView === tab ? 'active' : ''}`}
              onClick={() => setDashboardView(tab as any)}
            >
              {tab === 'roi' ? 'ROI' : tab === 'mcp' ? 'MCP' : tab === 'providers' ? 'AI Models' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-content">
        {dashboardView === 'overview' && (
          <OverviewView
            dashboard={dashboard}
            costMetrics={costMetrics}
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
  activeSessions: number;
  projectCount: number;
}

const OverviewView: React.FC<OverviewProps> = ({
  dashboard,
  costMetrics,
  activeSessions,
  projectCount,
}) => (
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
  </div>
);

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
  const { toggleLeoMode, addFlowrider, removeFlowrider, updateFlowrider } = useStore();

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

  // Calculate positions for network visualization
  const getFlowriderPosition = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    const radius = 120;
    return {
      x: 150 + Math.cos(angle) * radius,
      y: 150 + Math.sin(angle) * radius,
    };
  };

  return (
    <div className="leo-view">
      {/* Hero Section */}
      <div className="leo-hero">
        <div className="leo-hero-left">
          <div className="leo-title-section">
            <h2>LEO Orchestration</h2>
            <p>Local Execution Orchestrator - Scale to 400 concurrent AI sessions</p>
          </div>
          <div className="leo-toggle">
            <span className={`status-indicator large ${leo.enabled ? 'enabled' : 'disabled'}`}>
              {leo.enabled ? 'ACTIVE' : 'STANDBY'}
            </span>
            <button
              className={`btn ${leo.enabled ? 'btn-danger' : 'btn-primary'}`}
              onClick={toggleLeoMode}
            >
              {leo.enabled ? 'Disable LEO' : 'Activate LEO'}
            </button>
          </div>
        </div>

        {/* Network Visualization */}
        <div className="leo-network-viz">
          <svg width="300" height="300" viewBox="0 0 300 300">
            {/* Connection lines */}
            {leo.flowriders.map((fr, i) => {
              const pos = getFlowriderPosition(i, leo.flowriders.length);
              return (
                <line
                  key={`line-${fr.id}`}
                  x1="150"
                  y1="150"
                  x2={pos.x}
                  y2={pos.y}
                  stroke={fr.status === 'active' ? '#00ffff' : '#333'}
                  strokeWidth="2"
                  strokeDasharray={fr.status === 'active' ? '0' : '4'}
                  opacity={fr.status === 'active' ? 0.6 : 0.3}
                />
              );
            })}

            {/* Center hub */}
            <circle cx="150" cy="150" r="30" fill="#1a1a24" stroke="#ff00ff" strokeWidth="2" />
            <text x="150" y="145" textAnchor="middle" fill="#ff00ff" fontSize="10" fontWeight="600">LEO</text>
            <text x="150" y="160" textAnchor="middle" fill="#888" fontSize="8">CORE</text>

            {/* Flowrider nodes */}
            {leo.flowriders.map((fr, i) => {
              const pos = getFlowriderPosition(i, leo.flowriders.length);
              const statusColor = fr.status === 'active' ? '#00ff88'
                : fr.status === 'busy' ? '#ffcc00'
                : fr.status === 'error' ? '#ff4444' : '#666';
              return (
                <g key={`node-${fr.id}`}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="20"
                    fill="#12121a"
                    stroke={statusColor}
                    strokeWidth="2"
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fill={statusColor}
                    fontSize="10"
                    fontWeight="600"
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}

            {/* Pulsing animation ring */}
            {leo.enabled && (
              <circle
                cx="150"
                cy="150"
                r="140"
                fill="none"
                stroke="#00ffff"
                strokeWidth="1"
                opacity="0.3"
                style={{
                  animation: 'pulse-ring 2s ease-out infinite',
                }}
              />
            )}
          </svg>
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
            + Add 5 Flowriders
          </button>
          <button className="btn btn-secondary" onClick={addDemoFlowrider}>
            + Add 1 Flowrider
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
              <button className="btn btn-primary" onClick={() => addMultipleFlowriders(5)}>
                Launch 5 Demo Flowriders
              </button>
            </div>
          ) : (
            leo.flowriders.map((fr) => (
              <div key={fr.id} className={`flowrider-card ${fr.status}`}>
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
                  onClick={() => removeFlowrider(fr.id)}
                  title="Remove flowrider"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
