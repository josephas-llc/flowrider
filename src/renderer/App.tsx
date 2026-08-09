import React, { useState, useEffect } from 'react';
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
// DeployPanel removed from MVP - focus on core routing story (audit fix)
// import { DeployPanel } from './components/DeployPanel';
import { ProjectsPanel } from './components/ProjectsPanel';
import { LicensePanel } from './components/LicensePanel';
import { CinematicDemo } from './components/CinematicDemo';
import { AutopilotDemoOverlay } from './components/AutopilotDemoOverlay';
import { UpdatePanel } from './components/UpdatePanel';
import { APIKeysPanel } from './components/APIKeysPanel';
import { useStore } from './store';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useControlGroups } from './hooks/useControlGroups';
import { SessionMinimap } from './components/SessionMinimap';
import { KeyboardShortcutsHelp, useKeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { ZoixIndicator } from './components/ZoixIndicator';
import { ZoixInsightsPanel } from './components/ZoixInsightsPanel';
import { ZoixNotificationContainer } from './components/ZoixNotificationToast';
// VoiceControlIndicator removed from MVP - experimental, confusing (audit fix)
// import { VoiceControlIndicator } from './components/VoiceControlIndicator';
// Savings and completion celebration components (audit fix)
// import { SavingsToastContainer, useSavingsNotifications, CumulativeSavings } from './components/SavingsToast';
// import { CompletionCelebration, useCompletionCelebrations } from './components/CompletionCelebration';

// Simplified MVP - removed deploy from nav tabs (audit fix)
type MainView = 'sessions' | 'projects' | 'dashboard' | 'settings';

const App: React.FC = () => {
  console.log('[App] Rendering...');

  const [_storeReady, setStoreReady] = useState(false);
  const [showIcosahedron, setShowIcosahedron] = useState(false);
  const [showSessionPanel, setShowSessionPanel] = useState(false);
  const [showSessionSearch, setShowSessionSearch] = useState(false);
  const [showCinematicDemo, setShowCinematicDemo] = useState(false);
  const [showAutopilotDemo, setShowAutopilotDemo] = useState(false);
  const [showZoixPanel, setShowZoixPanel] = useState(false);
  const [zoixGlowActive, setZoixGlowActive] = useState(false);

  const store = useStore();
  const { sessions, selectedFace, selectFace, setAttachedSession, updateSession, costMetrics, syncWithTmux, syncZoixData, isFirstRun, setIsFirstRun, sessionSlots } = store;

  // Command Palette (Cmd+K)
  const commandPalette = useCommandPalette();

  // Keyboard Shortcuts Help (? key)
  const keyboardShortcuts = useKeyboardShortcutsHelp();

  console.log('[App] Store loaded, sessions:', sessions?.length);

  // Define activeSessions early so it can be used in effects
  const activeSessions = sessions.filter(s => s.status !== 'empty').length;

  useEffect(() => {
    console.log('[App] Store mounted, marking ready');
    setStoreReady(true);
    if (selectedFace === null) {
      selectFace(0);
    }
  }, []);

  useEffect(() => {
    syncWithTmux();
    syncZoixData();
  }, [syncWithTmux, syncZoixData]);

  // ZOIX ambient glow - subtle background pulse when sessions are active
  useEffect(() => {
    if (activeSessions === 0) {
      setZoixGlowActive(false);
      return;
    }

    // Pulse every 10-20 seconds when there are active sessions
    const scheduleNextPulse = () => {
      const delay = 10000 + Math.random() * 10000; // 10-20 seconds
      return setTimeout(() => {
        setZoixGlowActive(true);
        // Glow for 3 seconds
        setTimeout(() => setZoixGlowActive(false), 3000);
        timerId = scheduleNextPulse();
      }, delay);
    };

    let timerId = scheduleNextPulse();
    return () => clearTimeout(timerId);
  }, [activeSessions > 0]);

  const toggleSessionSearch = () => {
    setShowSessionSearch(prev => !prev);
  };

  useKeyboardShortcuts(toggleSessionSearch);
  useControlGroups(); // StarCraft-style Ctrl+1-9 for control groups

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

  const selectedSession = selectedFace !== null ? sessions[selectedFace] : null;
  const hasActiveSession = selectedSession && selectedSession.status !== 'empty';

  return (
    <>
      {/* Show welcome wizard on first run */}
      {isFirstRun && <WelcomeWizard />}

      <div className="app app-v2">
        {/* ZOIX ambient background glow - subtle purple pulse when learning */}
        {zoixGlowActive && (
          <div
            className="zoix-ambient-glow"
            style={{
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 0,
              background: 'radial-gradient(ellipse at 50% 50%, rgba(147, 51, 234, 0.06) 0%, rgba(147, 51, 234, 0.02) 40%, transparent 70%)',
              animation: 'zoixAmbientPulse 3s ease-in-out',
            }}
          />
        )}
        <style>{`
          @keyframes zoixAmbientPulse {
            0% { opacity: 0; }
            30% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>

        {/* Compact Top Bar */}
      <nav className="top-nav-v2">
        <div className="nav-left">
          <div className="nav-brand-v2">
            <span className="brand-icon">◇</span>
            <span className="brand-name">flowrider</span>
          </div>

          {/* Session Switcher - Compact horizontal pills */}
          <div className="session-switcher">
            {sessions.slice(0, sessionSlots).map((session, idx) => (
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

          {/* ZOIX Learning Indicator - Front and Center */}
          <ZoixIndicator onClick={() => setShowZoixPanel(true)} />

          {/* Voice Control removed from MVP - experimental feature (audit fix) */}
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
            <span className="stat-mini">{activeSessions}/{sessionSlots}</span>
            <span className="stat-mini accent">${costMetrics.totalCost < 0.01 ? '<0.01' : costMetrics.totalCost.toFixed(2)}</span>
          </div>

          {/* Autopilot Demo Button - Hands-free investor presentation */}
          <button
            className={`demo-btn ${showAutopilotDemo ? 'active' : ''}`}
            onClick={() => setShowAutopilotDemo(!showAutopilotDemo)}
            title="Autopilot Demo for Investors (90 seconds)"
            style={{
              padding: '6px 12px',
              background: showAutopilotDemo ? 'linear-gradient(135deg, #22c55e, #3b82f6)' : 'linear-gradient(135deg, #9b59b6, #3498db)',
              border: '1px solid rgba(155, 89, 182, 0.3)',
              borderRadius: 4,
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {showAutopilotDemo ? '⏹ Stop' : '▶ Demo'}
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

        </div>
      ) : mainView === 'dashboard' ? (
        <div className="main-content-v2">
          <Dashboard />
        </div>
      ) : (
        /* Deploy panel removed from MVP - focus on core routing story (audit fix) */
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

      {/* Keyboard Shortcuts Help (? key) */}
      <KeyboardShortcutsHelp isOpen={keyboardShortcuts.isOpen} onClose={keyboardShortcuts.close} />

      {/* Cinematic Demo for Investor Presentations (legacy) */}
      {showCinematicDemo && (
        <CinematicDemo onClose={() => setShowCinematicDemo(false)} />
      )}

      {/* Autopilot Demo - Hands-free 90-second investor demo */}
      <AutopilotDemoOverlay
        isActive={showAutopilotDemo}
        onClose={() => setShowAutopilotDemo(false)}
        onViewChange={setMainView}
      />

      {/* ZOIX Insights Panel */}
      <ZoixInsightsPanel isOpen={showZoixPanel} onClose={() => setShowZoixPanel(false)} />

      {/* ZOIX Notification Toasts - Skill progression, cross-session insights */}
      <ZoixNotificationContainer />

      {/* Savings Toast Container - Live savings notifications (audit fix) */}
      {/* Note: Actual notifications triggered by AIService when routing saves money */}

      {/* Game UX Components - Rendered at ROOT level (outside all containers) */}
      <DemoMode />
      <SessionMinimap onSessionSelect={handleFaceClick} />

      {/* Unified Value Proposition - shows on nav bar (audit fix) */}
      {/* "Your work costs less of the world" */}
      </div>
    </>
  );
};

export default App;
