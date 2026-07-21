import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';

interface DemoSession {
  faceIndex: number;
  name: string;
  task: string;
  progress: number;
  tokens: { input: number; output: number };
}

const DEMO_TASKS = [
  { name: 'API Backend', task: 'Building REST API with authentication' },
  { name: 'React UI', task: 'Creating dashboard components' },
  { name: 'Database', task: 'Designing schema and migrations' },
  { name: 'Tests', task: 'Writing unit and integration tests' },
  { name: 'Docs', task: 'Generating API documentation' },
  { name: 'DevOps', task: 'Setting up CI/CD pipeline' },
  { name: 'Security', task: 'Implementing auth middleware' },
  { name: 'Analytics', task: 'Building metrics dashboard' },
];

export const DemoMode: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [demoSessions, setDemoSessions] = useState<DemoSession[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { updateSession, addTokenUsage, seedZoixDemoData, resetDemoData } = useStore();

  // Start demo mode - creates multiple sessions with simulated activity
  const startDemo = async () => {
    setIsRunning(true);
    setTotalCost(0);
    setTotalTokens(0);

    // Seed ZOIX with impressive demo data for investor presentations
    seedZoixDemoData();

    // Pick random faces for demo
    const faceIndices = Array.from({ length: 8 }, (_, i) => i * 2); // Even faces

    const sessions: DemoSession[] = faceIndices.map((faceIndex, i) => ({
      faceIndex,
      name: DEMO_TASKS[i].name,
      task: DEMO_TASKS[i].task,
      progress: 0,
      tokens: { input: 0, output: 0 },
    }));

    setDemoSessions(sessions);

    // Create real tmux sessions if available
    for (const session of sessions) {
      try {
        if (window.flowrider) {
          const result = await window.flowrider.tmux.create(
            `demo-${session.name.toLowerCase()}`,
            session.faceIndex,
            '~'
          );

          if ((result as any).success) {
            updateSession(session.faceIndex, {
              name: `Demo: ${session.name}`,
              tmuxSession: (result as any).data.name,
              status: 'active',
              workingDir: '~',
            });
          }
        } else {
          // Simulated mode without tmux
          updateSession(session.faceIndex, {
            name: `Demo: ${session.name}`,
            status: 'active',
            workingDir: '~',
          });
        }
      } catch (err) {
        console.error('[Demo] Failed to create session:', err);
      }
    }

    // Start simulating activity
    intervalRef.current = setInterval(() => {
      setDemoSessions((prev) => {
        const updated = prev.map((session) => {
          // Random token increment
          const inputDelta = Math.floor(Math.random() * 500) + 100;
          const outputDelta = Math.floor(Math.random() * 200) + 50;

          const newSession = {
            ...session,
            progress: Math.min(100, session.progress + Math.random() * 5),
            tokens: {
              input: session.tokens.input + inputDelta,
              output: session.tokens.output + outputDelta,
            },
          };

          // Update store
          addTokenUsage(session.faceIndex, inputDelta, outputDelta);

          return newSession;
        });

        // Calculate totals
        const newTotalTokens = updated.reduce(
          (sum, s) => sum + s.tokens.input + s.tokens.output,
          0
        );
        const newTotalCost = (newTotalTokens * 3) / 1_000_000; // Simplified cost calc

        setTotalTokens(newTotalTokens);
        setTotalCost(newTotalCost);

        return updated;
      });
    }, 1000);
  };

  // Stop demo mode
  const stopDemo = async () => {
    setIsRunning(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset ZOIX demo data
    resetDemoData();

    // Kill demo sessions
    for (const session of demoSessions) {
      try {
        if (window.flowrider) {
          await window.flowrider.tmux.kill(`fr2-${session.faceIndex}-demo-${session.name.toLowerCase()}`);
        }
        updateSession(session.faceIndex, {
          tmuxSession: undefined,
          status: 'empty',
        });
      } catch (err) {
        // Session might not exist
      }
    }

    setDemoSessions([]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatTokens = (n: number) => {
    if (n < 1000) return n.toString();
    if (n < 1000000) return `${(n / 1000).toFixed(1)}K`;
    return `${(n / 1000000).toFixed(2)}M`;
  };

  // Calculate "value saved" - comparison to hiring developers
  const developerHourlyCost = 150; // $/hr for senior dev
  const hoursSimulated = (totalTokens / 50000) * 0.5; // Rough estimate
  const valueSaved = hoursSimulated * developerHourlyCost - totalCost;

  return (
    <>
      {/* Demo Controls */}
      <div className="demo-controls">
        <button
          className="demo-button"
          onClick={isRunning ? stopDemo : startDemo}
          disabled={false}
        >
          <span className="icon">{isRunning ? '⏹' : '▶'}</span>
          {isRunning ? 'Stop Demo' : 'Start Demo Mode'}
        </button>
      </div>

      {/* Demo Activity Display */}
      {isRunning && demoSessions.length > 0 && (
        <div className="demo-activity">
          <div className="demo-activity-header">
            <div className="pulse" />
            <span>DEMO MODE ACTIVE</span>
          </div>

          <div className="demo-stats">
            <div className="stat">
              <span className="stat-value">{demoSessions.length}</span>
              <span className="stat-label">Sessions</span>
            </div>
            <div className="stat">
              <span className="stat-value">{formatTokens(totalTokens)}</span>
              <span className="stat-label">Tokens</span>
            </div>
            <div className="stat">
              <span className="stat-value">${totalCost.toFixed(4)}</span>
              <span className="stat-label">Cost</span>
            </div>
          </div>

          {/* Value Comparison */}
          <div className="value-comparison" style={{ marginTop: 12, padding: 12 }}>
            <h4 style={{ margin: 0, fontSize: 11, color: '#888' }}>
              VALUE COMPARISON
            </h4>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#666' }}>Dev cost equiv:</span>
              <span style={{ color: '#ff6b6b', fontFamily: 'monospace' }}>
                ${(hoursSimulated * developerHourlyCost).toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#666' }}>AI cost:</span>
              <span style={{ color: '#ffcc00', fontFamily: 'monospace' }}>
                ${totalCost.toFixed(4)}
              </span>
            </div>
            <div style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              fontWeight: 600,
            }}>
              <span style={{ color: '#00ff88' }}>Savings:</span>
              <span style={{ color: '#00ff88', fontFamily: 'monospace' }}>
                ${valueSaved.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Active Tasks */}
          <div style={{ marginTop: 12, maxHeight: 120, overflowY: 'auto' }}>
            {demoSessions.map((session) => (
              <div
                key={session.faceIndex}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 0',
                  fontSize: 11,
                }}
              >
                <span style={{ color: '#00ffff', fontFamily: 'monospace' }}>
                  #{String(session.faceIndex + 1).padStart(2, '0')}
                </span>
                <span style={{ color: '#ccc', flex: 1 }}>{session.name}</span>
                <div
                  style={{
                    width: 60,
                    height: 4,
                    background: '#333',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${session.progress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #00ffff, #ff00ff)',
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
