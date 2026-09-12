import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store';

// Helper to format relative time (e.g., "2m ago", "1h ago")
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

interface SessionGridProps {
  onSessionSelect: (index: number) => void;
}

export const SessionGrid: React.FC<SessionGridProps> = ({ onSessionSelect }) => {
  const { sessions, selectedFace, setAttachedSession, updateSession, controlGroups, sessionSlots, setIsFirstRun } = useStore();
  const [, forceUpdate] = useState(0);

  // Force re-render every minute to update relative timestamps
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Check if this is an empty state (no active sessions)
  const activeSessions = sessions.filter(s => s.status !== 'empty').length;

  // Build a map of faceIndex -> control group number for badge display
  const faceToControlGroup = useMemo(() => {
    const map: Record<number, number> = {};
    for (const [groupNum, faceIndices] of Object.entries(controlGroups)) {
      for (const faceIdx of faceIndices) {
        map[faceIdx] = parseInt(groupNum);
      }
    }
    return map;
  }, [controlGroups]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(5);

  // Calculate optimal columns based on container width
  useEffect(() => {
    const updateColumns = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        // Minimum cell size ~120px, with gap
        if (width < 400) setColumns(2);
        else if (width < 600) setColumns(3);
        else if (width < 800) setColumns(4);
        else if (width < 1000) setColumns(5);
        else if (width < 1400) setColumns(6);
        else setColumns(10);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);

    // Also observe the container itself
    const resizeObserver = new ResizeObserver(updateColumns);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateColumns);
      resizeObserver.disconnect();
    };
  }, []);

  const handleSessionClick = (index: number) => {
    onSessionSelect(index);
    const session = sessions[index];
    if (session?.tmuxSession && session.status !== 'empty') {
      setAttachedSession(session.id);
      updateSession(index, { status: 'attached' });
    }
  };

  // Empty State: When no active sessions, show prominent CTA
  if (activeSessions === 0) {
    return (
      <div
        ref={containerRef}
        className="session-grid-empty"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px',
          textAlign: 'center',
        }}
      >
        {/* Empty State Visual */}
        <div
          className="empty-state-icon"
          style={{
            fontSize: '64px',
            marginBottom: '24px',
            opacity: 0.3,
          }}
        >
          <span style={{
            display: 'inline-block',
            animation: 'gentlePulse 3s ease-in-out infinite',
          }}>
            ◇
          </span>
        </div>

        <h2 style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--text-primary, #fff)',
          marginBottom: '12px',
        }}>
          No Active Sessions
        </h2>

        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary, #888)',
          marginBottom: '32px',
          maxWidth: '400px',
          lineHeight: 1.5,
        }}>
          Click any slot below to start your first AI coding session.
          Press <kbd style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'monospace',
          }}>1-9</kbd> to quickly select slots.
        </p>

        {/* PROMINENT Start Button - The ONE obvious action */}
        <button
          onClick={() => onSessionSelect(0)}
          style={{
            padding: '16px 48px',
            fontSize: '18px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #00d4ff, #0096ff)',
            border: 'none',
            borderRadius: '12px',
            color: '#000',
            cursor: 'pointer',
            boxShadow: '0 0 30px rgba(0, 212, 255, 0.4), 0 4px 20px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s ease',
            marginBottom: '40px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 212, 255, 0.6), 0 6px 30px rgba(0, 0, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 212, 255, 0.4), 0 4px 20px rgba(0, 0, 0, 0.3)';
          }}
        >
          + Start First Session
        </button>

        {/* Quick Start Slots - Visual session picker */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          maxWidth: '320px',
        }}>
          {sessions.slice(0, 8).map((_, idx) => (
            <button
              key={idx}
              onClick={() => onSessionSelect(idx)}
              style={{
                width: '60px',
                height: '60px',
                background: 'var(--bg-secondary, #1a1a2e)',
                border: '2px solid var(--border-color, #333)',
                borderRadius: '8px',
                color: 'var(--text-secondary, #888)',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)';
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)';
                e.currentTarget.style.color = '#00d4ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color, #333)';
                e.currentTarget.style.background = 'var(--bg-secondary, #1a1a2e)';
                e.currentTarget.style.color = 'var(--text-secondary, #888)';
              }}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Help link */}
        <button
          onClick={() => setIsFirstRun(true)}
          style={{
            marginTop: '32px',
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid var(--border-color, #333)',
            borderRadius: '6px',
            color: 'var(--text-secondary, #888)',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(147, 51, 234, 0.5)';
            e.currentTarget.style.color = '#9333ea';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color, #333)';
            e.currentTarget.style.color = 'var(--text-secondary, #888)';
          }}
        >
          ? First time? Take a quick tour
        </button>

        {/* CSS Keyframes */}
        <style>{`
          @keyframes gentlePulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.05); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="session-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '12px',
        padding: '16px',
        height: '100%',
        alignContent: 'start',
      }}
    >
      {sessions.slice(0, sessionSlots).map((session, idx) => {
        const isActive = session.status !== 'empty';
        const isSelected = selectedFace === idx;
        const needsAttention = session.needsAttention;
        const controlGroup = faceToControlGroup[idx];
        const hasNewOutput = session.hasNewOutput;
        const lastActivityTime = session.lastActivity ? formatRelativeTime(session.lastActivity) : null;

        // Determine visual state for clearer UX (P0 fix from cognitive simulation)
        // States: empty, working (AI active), waiting (needs input), error, done
        const activityLevel = session.activityLevel || 'idle';
        const isWorking = isActive && activityLevel === 'high';
        const isWaiting = isActive && needsAttention;
        const isError = isActive && session.attentionReason?.toLowerCase().includes('error');
        const isDone = isActive && activityLevel === 'idle' && !needsAttention && !hasNewOutput;

        return (
          <div
            key={idx}
            className={`session-cell ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''} ${needsAttention ? 'attention' : ''} ${hasNewOutput ? 'has-new-output' : ''} ${controlGroup ? 'in-control-group' : ''}`}
            onClick={() => handleSessionClick(idx)}
            style={{
              aspectRatio: '1',
              minHeight: '80px',
              background: isSelected
                ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 200, 255, 0.1))'
                : 'var(--bg-secondary)',
              border: `2px solid ${isSelected ? 'rgba(0, 255, 255, 0.5)' : 'var(--border-color)'}`,
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* State-based glows for cognitive UX clarity */}

            {/* Working state: Animated cyan pulse (AI actively working) */}
            {isWorking && !isError && (
              <div
                className="session-glow working-glow"
                style={{
                  position: 'absolute',
                  inset: '-4px',
                  borderRadius: '14px',
                  background: 'transparent',
                  boxShadow: '0 0 20px rgba(0, 200, 255, 0.6), 0 0 40px rgba(0, 150, 255, 0.3), inset 0 0 25px rgba(0, 200, 255, 0.15)',
                  pointerEvents: 'none',
                  animation: 'workingPulse 1.5s ease-in-out infinite',
                }}
              />
            )}

            {/* Waiting state: Amber glow (needs human input) */}
            {isWaiting && !isError && (
              <div
                className="session-glow waiting-glow"
                style={{
                  position: 'absolute',
                  inset: '-4px',
                  borderRadius: '14px',
                  background: 'transparent',
                  boxShadow: '0 0 20px rgba(255, 180, 50, 0.6), 0 0 40px rgba(255, 150, 0, 0.3), inset 0 0 25px rgba(255, 180, 50, 0.15)',
                  pointerEvents: 'none',
                  animation: 'waitingPulse 2s ease-in-out infinite',
                }}
              />
            )}

            {/* Error state: Vibrating red glow */}
            {isError && (
              <div
                className="session-glow error-glow"
                style={{
                  position: 'absolute',
                  inset: '-4px',
                  borderRadius: '14px',
                  background: 'transparent',
                  boxShadow: '0 0 20px rgba(255, 60, 60, 0.6), 0 0 40px rgba(255, 30, 30, 0.4), inset 0 0 25px rgba(255, 60, 60, 0.2)',
                  pointerEvents: 'none',
                  animation: 'vibratingGlow 0.5s ease-in-out infinite',
                }}
              />
            )}

            {/* Idle active state: Subtle blue glow (active but not working) */}
            {isActive && !isWorking && !isWaiting && !isError && (
              <div
                className="session-glow idle-glow"
                style={{
                  position: 'absolute',
                  inset: '-4px',
                  borderRadius: '14px',
                  background: 'transparent',
                  boxShadow: '0 0 12px rgba(0, 150, 255, 0.3), 0 0 25px rgba(0, 150, 255, 0.15), inset 0 0 15px rgba(0, 150, 255, 0.08)',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Keyboard shortcut hint (P1 cognitive UX fix) - shows on hover */}
            <div
              className="keyboard-hint"
              style={{
                position: 'absolute',
                top: '4px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '9px',
                color: 'var(--text-muted, #666)',
                opacity: 0,
                transition: 'opacity 0.15s ease',
                background: 'rgba(0, 0, 0, 0.6)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                zIndex: 3,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {idx < 9 ? `Press ${idx + 1}` : `Ctrl+${idx === 9 ? '0' : (idx - 9)}`}
            </div>

            {/* Session number */}
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: isActive
                  ? (needsAttention ? '#ff6b6b' : '#00d4ff')
                  : 'var(--text-secondary)',
                marginBottom: '4px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {idx + 1}
            </div>

            {/* Session name or status */}
            <div
              style={{
                fontSize: '10px',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                maxWidth: '90%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {isActive ? (session.name || 'Active') : 'Empty'}
            </div>

            {/* Status indicator dot - color-coded for cognitive clarity */}
            {isActive && (
              <div
                className={`status-dot ${isWorking ? 'working' : ''} ${isWaiting ? 'waiting' : ''} ${isError ? 'error' : ''}`}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isError
                    ? '#ff4444'
                    : isWaiting
                    ? '#ffaa33'
                    : isWorking
                    ? '#00d4ff'
                    : isDone
                    ? '#4caf50'
                    : (session.status === 'attached' ? '#4caf50' : '#00d4ff'),
                  boxShadow: isError
                    ? '0 0 10px rgba(255, 68, 68, 0.9)'
                    : isWaiting
                    ? '0 0 10px rgba(255, 170, 51, 0.8)'
                    : isWorking
                    ? '0 0 10px rgba(0, 212, 255, 0.8)'
                    : '0 0 6px rgba(0, 212, 255, 0.6)',
                  animation: isWorking ? 'statusDotPulse 1s ease-in-out infinite' : undefined,
                }}
              />
            )}

            {/* Control Group Badge (StarCraft-style) */}
            {controlGroup && (
              <div
                className="control-group-badge"
                style={{
                  position: 'absolute',
                  top: '6px',
                  left: '6px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  background: 'linear-gradient(135deg, #bf00ff, #9b59b6)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(191, 0, 255, 0.5)',
                  zIndex: 2,
                }}
                title={`Control Group ${controlGroup} (Press ${controlGroup} to select)`}
              >
                {controlGroup}
              </div>
            )}

            {/* Last Activity Timestamp */}
            {isActive && lastActivityTime && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  right: '6px',
                  fontSize: '9px',
                  color: 'var(--text-muted, #666)',
                  opacity: 0.8,
                  zIndex: 1,
                }}
              >
                {lastActivityTime}
              </div>
            )}

            {/* Shimmer overlay for new output (Diablo 4 style) */}
            {hasNewOutput && (
              <div
                className="shimmer-overlay"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '12px',
                  background: 'linear-gradient(90deg, transparent, rgba(102, 252, 241, 0.15), transparent)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmerSweep 2s ease-in-out infinite',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            )}
          </div>
        );
      })}

      {/* CSS Keyframes for state-based visual indicators (Cognitive UX P0 fix) */}
      <style>{`
        /* Working state: Smooth breathing pulse for AI actively working */
        @keyframes workingPulse {
          0%, 100% {
            opacity: 0.8;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.02);
          }
        }

        /* Waiting state: Gentle amber pulse for needs input */
        @keyframes waitingPulse {
          0%, 100% {
            opacity: 0.7;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.01);
          }
        }

        /* Error state: Vibrating alert */
        @keyframes vibratingGlow {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          25% {
            transform: scale(1.02) translate(1px, -1px);
            opacity: 0.9;
          }
          50% {
            transform: scale(0.98);
            opacity: 1;
          }
          75% {
            transform: scale(1.01) translate(-1px, 1px);
            opacity: 0.95;
          }
        }

        /* Status dot pulse for working state */
        @keyframes statusDotPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.7;
          }
        }

        @keyframes shimmerSweep {
          0% {
            background-position: -100% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes controlGroupPulse {
          0%, 100% {
            box-shadow: 0 0 8px rgba(191, 0, 255, 0.5);
          }
          50% {
            box-shadow: 0 0 12px rgba(191, 0, 255, 0.8);
          }
        }

        .control-group-badge {
          animation: controlGroupPulse 2s ease-in-out infinite;
        }

        /* Reduce motion support */
        @media (prefers-reduced-motion: reduce) {
          .session-glow,
          .shimmer-overlay,
          .control-group-badge,
          .status-dot {
            animation: none !important;
          }
        }

        .session-cell:hover {
          transform: scale(1.02);
          border-color: rgba(0, 255, 255, 0.4) !important;
        }

        /* P1 Cognitive UX: Show keyboard hints on hover */
        .session-cell:hover .keyboard-hint {
          opacity: 1 !important;
        }

        .session-cell.active:hover .idle-glow {
          box-shadow: 0 0 20px rgba(0, 150, 255, 0.5), 0 0 35px rgba(0, 150, 255, 0.25), inset 0 0 20px rgba(0, 150, 255, 0.12);
        }
      `}</style>
    </div>
  );
};

export default SessionGrid;
