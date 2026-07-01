import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Icosahedron } from './components/Icosahedron';
import { SessionPanel } from './components/SessionPanel';
import { SessionSearch } from './components/SessionSearch';
import { TerminalView } from './components/TerminalView';
import { Dashboard } from './components/Dashboard';
import { DemoMode } from './components/DemoMode';
import { LeoAIStatus } from './components/LeoAIStatus';
import { CrossSessionPanel } from './components/CrossSessionPanel';
import { useStore } from './store';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

type MainView = 'sessions' | 'dashboard';

// Loading fallback for 3D canvas
const CanvasLoading: React.FC = () => (
  <div style={{
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0f',
    color: '#00ffff',
    fontSize: '14px',
    fontFamily: 'monospace',
  }}>
    Loading 3D...
  </div>
);

const App: React.FC = () => {
  console.log('[App] Rendering...');

  // State to track if store is ready
  const [storeReady, setStoreReady] = useState(false);

  const store = useStore();
  const { sessions, selectedFace, selectFace, costMetrics, appMode, setAppMode, resetDemoData, syncWithTmux } = store;

  console.log('[App] Store loaded, sessions:', sessions?.length);

  // Mark store as ready after first render
  useEffect(() => {
    console.log('[App] Store mounted, marking ready');
    setStoreReady(true);
  }, []);

  // Sync with tmux sessions on mount
  useEffect(() => {
    syncWithTmux();
  }, [syncWithTmux]);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  const [mainView, setMainView] = useState<MainView>('sessions');

  const handleFaceClick = (faceIndex: number) => {
    selectFace(faceIndex);
  };

  const activeSessions = sessions.filter(s => s.status !== 'empty').length;

  return (
    <div className="app">
      {/* Top Navigation Bar */}
      <nav className="top-nav">
        <div className="nav-brand">
          <span className="brand-icon">◇</span>
          <span className="brand-name">FLOWRIDER</span>
          <span className="brand-version">2.0</span>
        </div>

        <div className="nav-tabs">
          <button
            className={`nav-tab ${mainView === 'sessions' ? 'active' : ''}`}
            onClick={() => setMainView('sessions')}
          >
            <span className="tab-icon">⬡</span>
            Sessions
          </button>
          <button
            className={`nav-tab ${mainView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setMainView('dashboard')}
          >
            <span className="tab-icon">◈</span>
            Dashboard
          </button>
        </div>

        <div className="nav-stats">
          <div className="stat-item">
            <span className="stat-value">{activeSessions}/20</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-item accent">
            <span className="stat-value">
              ${costMetrics.totalCost < 0.01 ? '<0.01' : costMetrics.totalCost.toFixed(2)}
            </span>
            <span className="stat-label">Cost</span>
          </div>
          <div className="mode-toggle">
            <button
              className={`mode-btn ${appMode === 'work' ? 'active' : ''}`}
              onClick={() => {
                if (appMode === 'demo') resetDemoData();
                setAppMode('work');
              }}
            >
              Work
            </button>
            <button
              className={`mode-btn ${appMode === 'demo' ? 'active' : ''}`}
              onClick={() => setAppMode('demo')}
            >
              Demo
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      {mainView === 'sessions' ? (
        <>
          {/* 3D Icosahedron View */}
          <div className="icosahedron-panel">
            <Canvas
              camera={{ position: [0, 0, 6], fov: 50 }}
              style={{ background: '#0a0a0f' }}
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
                minDistance={4}
                maxDistance={12}
                autoRotate
                autoRotateSpeed={0.5}
              />
            </Canvas>

            {/* Overlay info */}
            <div className="icosahedron-overlay">
              <span>Click a face to select • Drag to rotate</span>
            </div>
          </div>

          {/* Session Search/Filter */}
          <SessionSearch />

          {/* Session Control Panel */}
          <SessionPanel />

          {/* Terminal View */}
          <TerminalView />

          {/* Demo Mode Controls */}
          <DemoMode />
        </>
      ) : (
        <div className="dashboard-container">
          <Dashboard />
        </div>
      )}

      {/* LEO AI Status Widget */}
      <LeoAIStatus />

      {/* Cross-Session Awareness Panel */}
      <CrossSessionPanel />
    </div>
  );
};

export default App;
