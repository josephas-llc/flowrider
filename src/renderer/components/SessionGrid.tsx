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
  const { sessions, selectedFace, setAttachedSession, updateSession, controlGroups } = useStore();
  const [, forceUpdate] = useState(0);

  // Force re-render every minute to update relative timestamps
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);

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
      {sessions.slice(0, 20).map((session, idx) => {
        const isActive = session.status !== 'empty';
        const isSelected = selectedFace === idx;
        const needsAttention = session.needsAttention;
        const controlGroup = faceToControlGroup[idx];
        const hasNewOutput = session.hasNewOutput;
        const lastActivityTime = session.lastActivity ? formatRelativeTime(session.lastActivity) : null;

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
            {/* Blue glow for active sessions */}
            {isActive && !needsAttention && (
              <div
                className="session-glow active-glow"
                style={{
                  position: 'absolute',
                  inset: '-4px',
                  borderRadius: '14px',
                  background: 'transparent',
                  boxShadow: '0 0 15px rgba(0, 150, 255, 0.4), 0 0 30px rgba(0, 150, 255, 0.2), inset 0 0 20px rgba(0, 150, 255, 0.1)',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Vibrating glow for attention-needed sessions */}
            {needsAttention && (
              <div
                className="session-glow attention-glow"
                style={{
                  position: 'absolute',
                  inset: '-4px',
                  borderRadius: '14px',
                  background: 'transparent',
                  boxShadow: '0 0 20px rgba(255, 100, 100, 0.5), 0 0 40px rgba(255, 50, 50, 0.3), inset 0 0 25px rgba(255, 100, 100, 0.15)',
                  pointerEvents: 'none',
                  animation: 'vibratingGlow 0.5s ease-in-out infinite',
                }}
              />
            )}

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

            {/* Status indicator dot */}
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: needsAttention
                    ? '#ff6b6b'
                    : (session.status === 'attached' ? '#4caf50' : '#00d4ff'),
                  boxShadow: needsAttention
                    ? '0 0 8px rgba(255, 107, 107, 0.8)'
                    : '0 0 6px rgba(0, 212, 255, 0.6)',
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

      {/* CSS Keyframes for vibrating glow and shimmer */}
      <style>{`
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
          .control-group-badge {
            animation: none !important;
          }
        }

        .session-cell:hover {
          transform: scale(1.02);
          border-color: rgba(0, 255, 255, 0.4) !important;
        }

        .session-cell.active:hover .active-glow {
          box-shadow: 0 0 20px rgba(0, 150, 255, 0.6), 0 0 40px rgba(0, 150, 255, 0.3), inset 0 0 25px rgba(0, 150, 255, 0.15);
        }
      `}</style>
    </div>
  );
};

export default SessionGrid;
