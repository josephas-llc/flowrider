import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Icosahedron } from './components/Icosahedron';
import { SessionPanel } from './components/SessionPanel';
import { SessionSearch } from './components/SessionSearch';
import { SessionGrid } from './components/SessionGrid';
import { TerminalView } from './components/TerminalView';
import { Dashboard } from './components/Dashboard';
import { DemoMode } from './components/DemoMode';
import { WelcomeWizard } from './components/WelcomeWizard';
import { CommandPalette, useCommandPalette } from './components/CommandPalette';
// AIStatus and CrossSessionPanel removed - terminal-first design
// import { AIStatusType as AIStatus } from './components/AIStatus';
// import { CrossSessionPanel } from './components/CrossSessionPanel';
import { DeployPanel } from './components/DeployPanel';
import { ProjectsPanel } from './components/ProjectsPanel';
import { LicensePanel } from './components/LicensePanel';
import { CinematicDemo } from './components/CinematicDemo';
import { UpdatePanel } from './components/UpdatePanel';
import { APIKeysPanel } from './components/APIKeysPanel';
import { useStore } from './store';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

type MainView = 'sessions' | 'projects' | 'dashboard' | 'deploy' | 'settings';

const App: React.FC = () => {
  console.log('[App] Rendering...');

  const [storeReady, setStoreReady] = useState(false);
  const [showIcosahedron, setShowIcosahedron] = useState(false);
  const [showSessionPanel, setShowSessionPanel] = useState(false);
  const [showSessionSearch, setShowSessionSearch] = useState(false);
  const [showCinematicDemo, setShowCinematicDemo] = useState(false);

  const store = useStore();
  const { sessions, selectedFace, selectFace, setAttachedSession, updateSession, costMetrics, appMode, setAppMode, resetDemoData, syncWithTmux, createSession, isFirstRun, setIsFirstRun } = store;

  // Command Palette (Cmd+K)
  const commandPalette = useCommandPalette();

  console.log('[App] Store loaded, sessions:', sessions?.length);

  useEffect(() => {
    console.log('[App] Store mounted, marking ready');
    setStoreReady(true);
    if (selectedFace === null) {
      selectFace(0);
    }
  }, []);

  useEffect(() => {
    syncWithTmux();
  }, [syncWithTmux]);

  const toggleSessionSearch = () => {
    setShowSessionSearch(prev => !prev);
  };

  useKeyboardShortcuts(toggleSessionSearch);

  const [mainView, setMainView] = useState<MainView>('sessions');

  const handleFaceClick = (faceIndex: number) => {
    selectFace(faceIndex);
    const session = sessions[faceIndex];
    if (session?.tmuxSession && session.status !== 'empty') {
      setAttachedSession(session.id);
      updateSession(faceIndex, { status: 'attached' });
    }
  };

  const handleQuickCreate = async () => {
    // Find first empty face
    const emptyFaceIndex = sessions.findIndex(s => s.status === 'empty');
    if (emptyFaceIndex >= 0) {
      selectFace(emptyFaceIndex);
      setShowSessionPanel(true);
    }
  };

  const activeSessions = sessions.filter(s => s.status !== 'empty').length;
  const selectedSession = selectedFace !== null ? sessions[selectedFace] : null;
  const hasActiveSession = selectedSession && selectedSession.status !== 'empty';

  return (
    <>
      {/* Show welcome wizard on first run */}
      {isFirstRun && <WelcomeWizard />}

      <div className="app app-v2">
        {/* Compact Top Bar */}
      <nav className="top-nav-v2">
        <div className="nav-left">
          <div className="nav-brand-v2">
            <span className="brand-icon">◇</span>
            <span className="brand-name">flowrider</span>
          </div>

          {/* Session Switcher - Compact horizontal pills */}
          <div className="session-switcher">
            {sessions.slice(0, 20).map((session, idx) => (
              <button
                key={idx}
                className={`session-pill ${selectedFace === idx ? 'selected' : ''} ${session.status !== 'empty' ? 'active' : ''} ${session.needsAttention ? 'attention' : ''}`}
                onClick={() => handleFaceClick(idx)}
                title={session.name || `Session ${idx + 1}`}
              >
                {session.status !== 'empty' ? (
                  <span className="pill-indicator" />
                ) : null}
                <span className="pill-number">{idx + 1}</span>
              </button>
            ))}
          </div>

          {/* Quick Create Button - PROMINENT */}
          <button className="quick-create-btn" onClick={handleQuickCreate}>
            <span>+</span> New Session
          </button>
        </div>

        <div className="nav-right">
          {/* View Tabs - Compact */}
          <div className="nav-tabs-v2">
            <button
              className={`nav-tab-v2 ${mainView === 'sessions' ? 'active' : ''}`}
              onClick={() => setMainView('sessions')}
            >
              Terminal
            </button>
            <button
              className={`nav-tab-v2 ${mainView === 'projects' ? 'active' : ''}`}
              onClick={() => setMainView('projects')}
            >
              Projects
            </button>
            <button
              className={`nav-tab-v2 ${mainView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setMainView('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`nav-tab-v2 ${mainView === 'settings' ? 'active' : ''}`}
              onClick={() => setMainView('settings')}
            >
              Settings
            </button>
          </div>

          {/* Stats - Minimal */}
          <div className="nav-stats-v2">
            <span className="stat-mini">{activeSessions}/20</span>
            <span className="stat-mini accent">${costMetrics.totalCost < 0.01 ? '<0.01' : costMetrics.totalCost.toFixed(2)}</span>
          </div>

          {/* Cinematic Demo Button */}
          <button
            className={`demo-btn ${showCinematicDemo ? 'active' : ''}`}
            onClick={() => setShowCinematicDemo(!showCinematicDemo)}
            title="Cinematic Demo for Investors"
            style={{
              padding: '6px 12px',
              background: showCinematicDemo ? 'linear-gradient(135deg, #9b59b6, #3498db)' : 'var(--bg-tertiary)',
              border: '1px solid rgba(155, 89, 182, 0.3)',
              borderRadius: 4,
              color: showCinematicDemo ? '#fff' : '#9b59b6',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            🎬 Demo
          </button>

          {/* Quick Tour Button */}
          <button
            className="wizard-trigger-btn"
            onClick={() => setIsFirstRun(true)}
            title="Show Welcome Wizard"
          >
            ?
          </button>

          {/* Icosahedron Toggle */}
          <button
            className={`toggle-viz-btn ${showIcosahedron ? 'active' : ''}`}
            onClick={() => setShowIcosahedron(!showIcosahedron)}
            title="Toggle 3D Visualization"
          >
            <span className="viz-icon">⬡</span>
          </button>

          {/* Session Panel Toggle */}
          <button
            className={`toggle-panel-btn ${showSessionPanel ? 'active' : ''}`}
            onClick={() => setShowSessionPanel(!showSessionPanel)}
            title="Toggle Session Details"
          >
            <span className="panel-icon">☰</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      {mainView === 'projects' ? (
        <div className="main-content-v2">
          <ProjectsPanel />
        </div>
      ) : mainView === 'sessions' ? (
        <div className="sessions-fullscreen-grid">
          {/* Full-Width Session Grid - All 20 sessions visible */}
          <SessionGrid onSessionSelect={handleFaceClick} />

          {/* Expanded Session Overlay - Shows when session is selected (not full screen) */}
          {hasActiveSession && (
            <div className="session-expanded-overlay">
              <div className="session-expanded-card">
                <div className="expanded-header">
                  <span className="expanded-title">
                    Session {selectedFace !== null ? selectedFace + 1 : ''}: {selectedSession?.name || 'Active'}
                  </span>
                  <div className="expanded-actions">
                    <button
                      className="expanded-action-btn"
                      onClick={() => setShowSessionPanel(!showSessionPanel)}
                      title="Session Details"
                    >
                      ☰
                    </button>
                    <button
                      className="expanded-action-btn"
                      onClick={() => setShowIcosahedron(!showIcosahedron)}
                      title="3D View"
                    >
                      ⬡
                    </button>
                    <button
                      className="expanded-action-btn close"
                      onClick={() => selectFace(null)}
                      title="Close"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="expanded-terminal">
                  <TerminalView />
                </div>
              </div>
            </div>
          )}

          {/* Floating Icosahedron - Optional, collapsible */}
          {showIcosahedron && (
            <div className="floating-icosahedron">
              <div className="ico-header">
                <span>Session Map</span>
                <button onClick={() => setShowIcosahedron(false)}>×</button>
              </div>
              <Canvas
                camera={{ position: [0, 0, 5], fov: 50 }}
                style={{ background: 'transparent' }}
              >
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00ffff" />
                <Icosahedron
                  sessions={sessions}
                  selectedFace={selectedFace}
                  onFaceClick={handleFaceClick}
                />
                <OrbitControls
                  enablePan={false}
                  enableZoom={true}
                  minDistance={3}
                  maxDistance={8}
                  autoRotate={false}
                />
              </Canvas>
            </div>
          )}

          {/* Floating Session Panel - Optional, collapsible */}
          {showSessionPanel && (
            <div className="floating-session-panel">
              <div className="panel-header-v2">
                <span>Session {selectedFace !== null ? selectedFace + 1 : '-'}</span>
                <button onClick={() => setShowSessionPanel(false)}>×</button>
              </div>
              <SessionPanel />
            </div>
          )}

          {/* Demo Mode Controls */}
          <DemoMode />
        </div>
      ) : mainView === 'dashboard' ? (
        <div className="main-content-v2">
          <Dashboard />
        </div>
      ) : mainView === 'deploy' ? (
        <div className="main-content-v2" style={{ padding: '20px' }}>
          <DeployPanel />
        </div>
      ) : (
        <div className="main-content-v2" style={{ padding: '20px', background: '#0a0a0f' }}>
          <LicensePanel />
          <div style={{ marginTop: '32px' }}>
            <APIKeysPanel />
          </div>
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '12px', fontWeight: 600 }}>Updates</h3>
            <UpdatePanel />
          </div>
        </div>
      )}

      {/*
        Terminal-first design: No floating overlays cluttering the terminal view.
        AIStatus and CrossSessionPanel are available via Dashboard tab if needed.
      */}

      {/* Session Search - CommandPalette-style overlay (Cmd+/) */}
      {showSessionSearch && (
        <SessionSearch onClose={() => setShowSessionSearch(false)} />
      )}

      {/* Command Palette (Cmd+K) */}
      <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />

      {/* Cinematic Demo for Investor Presentations */}
      {showCinematicDemo && (
        <CinematicDemo onClose={() => setShowCinematicDemo(false)} />
      )}
      </div>
    </>
  );
};

export default App;
