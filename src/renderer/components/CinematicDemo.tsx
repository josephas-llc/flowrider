import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';

// Cinematic Demo Mode for investor presentations and marketing videos
// Shows realistic multi-project AI development with impressive visuals

interface DemoScenario {
  id: string;
  name: string;
  description: string;
  duration: number; // seconds
  sessions: DemoSessionConfig[];
  narrative: string[];
}

interface DemoSessionConfig {
  faceIndex: number;
  projectName: string;
  task: string;
  aiProvider: 'claude' | 'gemini' | 'ollama';
  terminalLines: string[];
  codeSnippets: string[];
}

// Realistic terminal output snippets for different project types
const TERMINAL_OUTPUTS = {
  api: [
    '$ claude "Create REST API with auth"',
    'Analyzing requirements...',
    'Creating src/routes/auth.ts',
    'export const authRouter = express.Router();',
    'Implementing JWT middleware...',
    'Added POST /api/auth/login',
    'Added POST /api/auth/register',
    'Added GET /api/auth/me',
    'Running tests... 12/12 passed',
    'API ready at localhost:3000',
  ],
  frontend: [
    '$ claude "Build dashboard UI"',
    'Scaffolding React components...',
    'Creating src/components/Dashboard.tsx',
    'Adding Tailwind styles...',
    'Implementing data visualizations...',
    'Chart components ready',
    'Adding responsive breakpoints...',
    'Bundle size: 142kb gzipped',
    'Hot reload active',
  ],
  database: [
    '$ claude "Design database schema"',
    'Analyzing data requirements...',
    'Creating migrations/001_users.sql',
    'CREATE TABLE users (...)',
    'Adding foreign key constraints...',
    'Creating indexes for performance...',
    'Migration applied successfully',
    'Seeding test data... 1000 rows',
  ],
  devops: [
    '$ claude "Setup CI/CD pipeline"',
    'Creating .github/workflows/ci.yml',
    'Adding build, test, deploy stages...',
    'Configuring Docker multi-stage build...',
    'Setting up Kubernetes manifests...',
    'Pipeline ready for deployment',
    'Estimated build time: 3m 45s',
  ],
  security: [
    '$ claude "Security audit"',
    'Scanning dependencies...',
    'Checking for CVEs...',
    'No critical vulnerabilities found',
    'Adding rate limiting...',
    'Implementing CORS policies...',
    'Security headers configured',
    'Audit complete: Score A+',
  ],
  mobile: [
    '$ claude "Build React Native app"',
    'Creating expo project...',
    'Adding navigation stack...',
    'Implementing auth screens...',
    'Building component library...',
    'iOS simulator ready',
    'Android build queued...',
  ],
  ml: [
    '$ claude "Train ML model"',
    'Loading dataset: 50,000 samples',
    'Preprocessing features...',
    'Training epoch 1/10: loss=0.42',
    'Training epoch 5/10: loss=0.18',
    'Training epoch 10/10: loss=0.08',
    'Model accuracy: 94.2%',
    'Exporting to ONNX format...',
  ],
  docs: [
    '$ claude "Generate API docs"',
    'Scanning route definitions...',
    'Extracting TypeScript types...',
    'Generating OpenAPI spec...',
    'Creating markdown docs...',
    'Building Docusaurus site...',
    'Docs deployed to /docs',
  ],
};

// Pre-defined cinematic scenarios for different demo purposes
const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'ecommerce',
    name: 'E-Commerce Platform',
    description: 'Building a full-stack e-commerce site with 8 AI agents',
    duration: 60,
    narrative: [
      'Building complete e-commerce platform...',
      '8 AI agents working in parallel',
      'API, Frontend, Database, DevOps, Security, Mobile, Analytics, Docs',
      'Estimated dev time: 4-6 weeks',
      'Flowrider time: 45 minutes',
      'Cost: $12.50 vs $50,000+ contractor',
    ],
    sessions: [
      { faceIndex: 0, projectName: 'API Backend', task: 'REST API + GraphQL', aiProvider: 'claude', terminalLines: TERMINAL_OUTPUTS.api, codeSnippets: [] },
      { faceIndex: 2, projectName: 'React Frontend', task: 'Product catalog UI', aiProvider: 'claude', terminalLines: TERMINAL_OUTPUTS.frontend, codeSnippets: [] },
      { faceIndex: 4, projectName: 'Database', task: 'PostgreSQL schema', aiProvider: 'gemini', terminalLines: TERMINAL_OUTPUTS.database, codeSnippets: [] },
      { faceIndex: 6, projectName: 'DevOps', task: 'CI/CD + K8s', aiProvider: 'ollama', terminalLines: TERMINAL_OUTPUTS.devops, codeSnippets: [] },
      { faceIndex: 8, projectName: 'Security', task: 'Auth + audit', aiProvider: 'claude', terminalLines: TERMINAL_OUTPUTS.security, codeSnippets: [] },
      { faceIndex: 10, projectName: 'Mobile App', task: 'React Native', aiProvider: 'claude', terminalLines: TERMINAL_OUTPUTS.mobile, codeSnippets: [] },
      { faceIndex: 12, projectName: 'ML Recommender', task: 'Product recs', aiProvider: 'gemini', terminalLines: TERMINAL_OUTPUTS.ml, codeSnippets: [] },
      { faceIndex: 14, projectName: 'Documentation', task: 'API docs', aiProvider: 'ollama', terminalLines: TERMINAL_OUTPUTS.docs, codeSnippets: [] },
    ],
  },
  {
    id: 'saas',
    name: 'SaaS Dashboard',
    description: 'Enterprise analytics platform with real-time data',
    duration: 45,
    narrative: [
      'Enterprise SaaS platform build...',
      '6 specialized AI agents',
      'Real-time analytics + team collaboration',
      'Traditional dev: 3-4 months',
      'Flowrider: 2 hours',
    ],
    sessions: [
      { faceIndex: 0, projectName: 'API Layer', task: 'REST + WebSocket', aiProvider: 'claude', terminalLines: TERMINAL_OUTPUTS.api, codeSnippets: [] },
      { faceIndex: 3, projectName: 'Dashboard', task: 'Charts + Tables', aiProvider: 'claude', terminalLines: TERMINAL_OUTPUTS.frontend, codeSnippets: [] },
      { faceIndex: 6, projectName: 'Database', task: 'TimescaleDB', aiProvider: 'gemini', terminalLines: TERMINAL_OUTPUTS.database, codeSnippets: [] },
      { faceIndex: 9, projectName: 'Auth System', task: 'SSO + RBAC', aiProvider: 'claude', terminalLines: TERMINAL_OUTPUTS.security, codeSnippets: [] },
      { faceIndex: 12, projectName: 'Infrastructure', task: 'Terraform', aiProvider: 'ollama', terminalLines: TERMINAL_OUTPUTS.devops, codeSnippets: [] },
      { faceIndex: 15, projectName: 'Docs Portal', task: 'User guides', aiProvider: 'ollama', terminalLines: TERMINAL_OUTPUTS.docs, codeSnippets: [] },
    ],
  },
  {
    id: 'startup',
    name: 'Startup MVP Sprint',
    description: 'Launch-ready MVP in one session',
    duration: 30,
    narrative: [
      'MVP Sprint: Idea to launch',
      '4 AI agents, 1 hour',
      'Full-stack + mobile + docs',
      'Investor demo ready',
    ],
    sessions: [
      { faceIndex: 0, projectName: 'Full Stack', task: 'Next.js app', aiProvider: 'claude', terminalLines: TERMINAL_OUTPUTS.frontend, codeSnippets: [] },
      { faceIndex: 5, projectName: 'Mobile', task: 'Expo app', aiProvider: 'claude', terminalLines: TERMINAL_OUTPUTS.mobile, codeSnippets: [] },
      { faceIndex: 10, projectName: 'Backend', task: 'Supabase', aiProvider: 'gemini', terminalLines: TERMINAL_OUTPUTS.api, codeSnippets: [] },
      { faceIndex: 15, projectName: 'Landing', task: 'Marketing site', aiProvider: 'ollama', terminalLines: TERMINAL_OUTPUTS.docs, codeSnippets: [] },
    ],
  },
];

interface CinematicDemoProps {
  onClose?: () => void;
}

export const CinematicDemo: React.FC<CinematicDemoProps> = ({ onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario>(DEMO_SCENARIOS[0]);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [sessionProgress, setSessionProgress] = useState<Record<number, number>>({});
  const [sessionOutputIndex, setSessionOutputIndex] = useState<Record<number, number>>({});
  const [isRecording, setIsRecording] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { updateSession, addTokenUsage, selectFace } = useStore();

  // Start cinematic demo
  const startDemo = useCallback(async () => {
    setIsRunning(true);
    setElapsedTime(0);
    setTotalTokens(0);
    setTotalCost(0);
    setCurrentPhase(0);

    // Initialize progress tracking
    const progress: Record<number, number> = {};
    const outputIndex: Record<number, number> = {};
    selectedScenario.sessions.forEach(session => {
      progress[session.faceIndex] = 0;
      outputIndex[session.faceIndex] = 0;
    });
    setSessionProgress(progress);
    setSessionOutputIndex(outputIndex);

    // Create demo sessions
    for (const session of selectedScenario.sessions) {
      try {
        if (window.flowrider) {
          const result = await window.flowrider.tmux.create(
            `cinematic-${session.projectName.toLowerCase().replace(/\s/g, '-')}`,
            session.faceIndex,
            '~'
          );

          if ((result as any).success) {
            updateSession(session.faceIndex, {
              name: session.projectName,
              tmuxSession: (result as any).data.name,
              status: 'active',
              workingDir: '~',
              aiProvider: session.aiProvider,
            });
          }
        } else {
          updateSession(session.faceIndex, {
            name: session.projectName,
            status: 'active',
            workingDir: '~',
            aiProvider: session.aiProvider,
          });
        }
      } catch (err) {
        console.error('[CinematicDemo] Failed to create session:', err);
      }
    }

    // Select first session to show activity
    selectFace(selectedScenario.sessions[0].faceIndex);

    // Start simulation loop
    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);

      // Update progress for each session
      setSessionProgress(prev => {
        const updated = { ...prev };
        selectedScenario.sessions.forEach(session => {
          const currentProgress = prev[session.faceIndex] || 0;
          if (currentProgress < 100) {
            // Random progress increment, faster for local models
            const increment = session.aiProvider === 'ollama'
              ? Math.random() * 3 + 1
              : Math.random() * 2 + 0.5;
            updated[session.faceIndex] = Math.min(100, currentProgress + increment);
          }
        });
        return updated;
      });

      // Advance terminal output
      setSessionOutputIndex(prev => {
        const updated = { ...prev };
        selectedScenario.sessions.forEach(session => {
          const currentIndex = prev[session.faceIndex] || 0;
          const maxIndex = session.terminalLines.length - 1;
          if (currentIndex < maxIndex && Math.random() > 0.7) {
            updated[session.faceIndex] = currentIndex + 1;
          }
        });
        return updated;
      });

      // Update token counts
      const inputDelta = Math.floor(Math.random() * 2000) + 500;
      const outputDelta = Math.floor(Math.random() * 1000) + 200;
      setTotalTokens(prev => prev + inputDelta + outputDelta);
      setTotalCost(prev => prev + ((inputDelta * 3 + outputDelta * 15) / 1_000_000));

      // Update narrative phase
      setCurrentPhase(prev => {
        const phaseLength = selectedScenario.duration / selectedScenario.narrative.length;
        const newPhase = Math.floor((prev + 1) / phaseLength);
        return Math.min(newPhase, selectedScenario.narrative.length - 1);
      });
    }, 1000);
  }, [selectedScenario, updateSession, selectFace]);

  // Stop demo
  const stopDemo = useCallback(async () => {
    setIsRunning(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Clean up sessions
    for (const session of selectedScenario.sessions) {
      try {
        if (window.flowrider) {
          await window.flowrider.tmux.kill(`fr2-${session.faceIndex}-cinematic-${session.projectName.toLowerCase().replace(/\s/g, '-')}`);
        }
        updateSession(session.faceIndex, {
          tmuxSession: undefined,
          status: 'empty',
        });
      } catch (err) {
        // Session might not exist
      }
    }
  }, [selectedScenario, updateSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Start screen recording (macOS native)
  const startRecording = () => {
    setIsRecording(true);
    // Open macOS screen recording
    if (window.flowrider?.shell?.exec) {
      window.flowrider.shell.exec('open -a "QuickTime Player"');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const formatTokens = (n: number) => {
    if (n < 1000) return n.toString();
    if (n < 1000000) return `${(n / 1000).toFixed(1)}K`;
    return `${(n / 1000000).toFixed(2)}M`;
  };

  // Value calculation
  const developerHourlyCost = 150;
  const hoursEquivalent = totalTokens / 100000; // Rough estimate
  const traditionalCost = hoursEquivalent * developerHourlyCost * selectedScenario.sessions.length;
  const savings = traditionalCost - totalCost;

  return (
    <div className="cinematic-demo" style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 380,
      background: 'linear-gradient(135deg, rgba(10,10,15,0.98), rgba(20,20,30,0.98))',
      border: '1px solid rgba(0,255,255,0.3)',
      borderRadius: 12,
      padding: 16,
      zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 60px rgba(0,255,255,0.1)',
      fontFamily: 'SF Pro Display, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: isRunning ? '#00ff88' : '#666',
            boxShadow: isRunning ? '0 0 10px #00ff88' : 'none',
            animation: isRunning ? 'pulse 1.5s infinite' : 'none',
          }} />
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            letterSpacing: '0.5px',
          }}>
            CINEMATIC DEMO
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            x
          </button>
        )}
      </div>

      {/* Scenario Selector */}
      {!isRunning && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, color: '#888', display: 'block', marginBottom: 6 }}>
            SELECT SCENARIO
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DEMO_SCENARIOS.map(scenario => (
              <button
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario)}
                style={{
                  padding: '8px 12px',
                  background: selectedScenario.id === scenario.id
                    ? 'rgba(0,255,255,0.2)'
                    : 'rgba(255,255,255,0.05)',
                  border: selectedScenario.id === scenario.id
                    ? '1px solid #00ffff'
                    : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  color: selectedScenario.id === scenario.id ? '#00ffff' : '#aaa',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >
                {scenario.name}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
            {selectedScenario.description}
          </p>
        </div>
      )}

      {/* Running Demo Display */}
      {isRunning && (
        <>
          {/* Narrative */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(0,255,255,0.05)',
            borderRadius: 8,
            marginBottom: 12,
            borderLeft: '3px solid #00ffff',
          }}>
            <p style={{
              fontSize: 13,
              color: '#00ffff',
              margin: 0,
              fontWeight: 500,
            }}>
              {selectedScenario.narrative[currentPhase] || selectedScenario.narrative[0]}
            </p>
          </div>

          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            marginBottom: 12,
          }}>
            <div style={{ textAlign: 'center', padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#00ffff', fontFamily: 'monospace' }}>
                {selectedScenario.sessions.length}
              </div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>AGENTS</div>
            </div>
            <div style={{ textAlign: 'center', padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                {formatTime(elapsedTime)}
              </div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>TIME</div>
            </div>
            <div style={{ textAlign: 'center', padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#ff9800', fontFamily: 'monospace' }}>
                {formatTokens(totalTokens)}
              </div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>TOKENS</div>
            </div>
            <div style={{ textAlign: 'center', padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#4caf50', fontFamily: 'monospace' }}>
                ${totalCost.toFixed(2)}
              </div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>COST</div>
            </div>
          </div>

          {/* Session Progress */}
          <div style={{ marginBottom: 12, maxHeight: 120, overflowY: 'auto' }}>
            {selectedScenario.sessions.map(session => {
              const progress = sessionProgress[session.faceIndex] || 0;
              const outputIdx = sessionOutputIndex[session.faceIndex] || 0;
              const currentLine = session.terminalLines[outputIdx] || '';

              return (
                <div key={session.faceIndex} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span style={{
                    fontSize: 10,
                    color: '#00ffff',
                    fontFamily: 'monospace',
                    width: 24,
                  }}>
                    #{String(session.faceIndex + 1).padStart(2, '0')}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 11,
                      color: '#fff',
                      fontWeight: 500,
                    }}>
                      {session.projectName}
                    </div>
                    <div style={{
                      fontSize: 9,
                      color: '#666',
                      fontFamily: 'monospace',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {currentLine}
                    </div>
                  </div>
                  <div style={{
                    width: 50,
                    height: 4,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: progress >= 100
                        ? '#4caf50'
                        : 'linear-gradient(90deg, #00ffff, #9b59b6)',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Value Comparison */}
          <div style={{
            padding: 12,
            background: 'rgba(0,255,136,0.05)',
            borderRadius: 8,
            border: '1px solid rgba(0,255,136,0.2)',
          }}>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>ROI COMPARISON</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#ff6b6b' }}>Traditional dev:</span>
              <span style={{ color: '#ff6b6b', fontFamily: 'monospace' }}>
                ${traditionalCost.toFixed(0)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#00ffff' }}>Flowrider cost:</span>
              <span style={{ color: '#00ffff', fontFamily: 'monospace' }}>
                ${totalCost.toFixed(2)}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 14,
              fontWeight: 700,
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}>
              <span style={{ color: '#00ff88' }}>SAVINGS:</span>
              <span style={{ color: '#00ff88', fontFamily: 'monospace' }}>
                ${savings.toFixed(0)} ({((savings / traditionalCost) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        </>
      )}

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginTop: 16,
      }}>
        <button
          onClick={isRunning ? stopDemo : startDemo}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: isRunning
              ? 'linear-gradient(135deg, #ff4444, #cc0000)'
              : 'linear-gradient(135deg, #00ffff, #00cc99)',
            border: 'none',
            borderRadius: 8,
            color: isRunning ? '#fff' : '#000',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'transform 0.1s',
          }}
        >
          <span>{isRunning ? '⏹' : '▶'}</span>
          {isRunning ? 'Stop Demo' : 'Start Demo'}
        </button>

        {!isRunning && (
          <button
            onClick={startRecording}
            style={{
              padding: '12px 16px',
              background: isRecording ? '#ff4444' : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Open QuickTime for screen recording"
          >
            <span style={{ color: isRecording ? '#ff4444' : '#ff6b6b' }}>●</span>
            REC
          </button>
        )}
      </div>

      {/* Recording Tips */}
      {!isRunning && (
        <div style={{
          marginTop: 12,
          padding: 10,
          background: 'rgba(255,165,0,0.1)',
          borderRadius: 6,
          fontSize: 10,
          color: '#ff9800',
        }}>
          <strong>Recording Tips:</strong>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Use Cmd+Shift+5 for macOS screen recording</li>
            <li>Select the Flowrider window only</li>
            <li>Show icosahedron for visual impact</li>
            <li>Switch between sessions during demo</li>
          </ul>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default CinematicDemo;
