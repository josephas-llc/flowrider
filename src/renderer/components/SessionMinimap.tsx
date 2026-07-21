import React, { useState } from 'react';
import { useStore } from '../store';

interface SessionMinimapProps {
  onSessionSelect?: (index: number) => void;
}

/**
 * Session Minimap Component
 *
 * A compact 5x4 grid visualization of all 20 sessions.
 * Shows active/empty/attention status at a glance.
 *
 * Visual Design (from GAME_UX_RESEARCH.md):
 * ┌─────────────┐
 * │ ● ● ○ ○ ●   │  ← Row of 5 dots per row
 * │ ○ ○ ● ● ○   │     4 rows = 20 sessions
 * │ ● ○ ○ ○ ●   │
 * │ ○ ○ ○ ○ ○   │  ● = Active session
 * └─────────────┘     ○ = Empty session
 *
 * Position: Bottom-right corner (toggleable)
 * Size: ~100x60px
 */
export const SessionMinimap: React.FC<SessionMinimapProps> = ({ onSessionSelect }) => {
  const { sessions, selectedFace, selectFace, setAttachedSession, updateSession } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleDotClick = (index: number) => {
    selectFace(index);
    const session = sessions[index];
    if (session?.tmuxSession && session.status !== 'empty') {
      setAttachedSession(session.id);
      updateSession(index, { status: 'attached' });
    }
    onSessionSelect?.(index);
  };

  if (isCollapsed) {
    return (
      <button
        className="minimap-collapsed"
        onClick={() => setIsCollapsed(false)}
        title="Show Session Minimap"
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'rgba(10, 10, 15, 0.9)',
          border: '1px solid var(--border-color)',
          color: 'var(--accent-cyan)',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
        }}
      >
        ⬡
      </button>
    );
  }

  // Create 4 rows of 5 sessions each
  const rows = [
    sessions.slice(0, 5),
    sessions.slice(5, 10),
    sessions.slice(10, 15),
    sessions.slice(15, 20),
  ];

  return (
    <div
      className="session-minimap"
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        padding: '8px 10px',
        borderRadius: '10px',
        background: 'rgba(10, 10, 15, 0.95)',
        border: '1px solid var(--border-color)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
          paddingBottom: '4px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <span
          style={{
            fontSize: '9px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Sessions
        </span>
        <button
          onClick={() => setIsCollapsed(true)}
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '3px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
          title="Collapse minimap"
        >
          −
        </button>
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            style={{
              display: 'flex',
              gap: '4px',
            }}
          >
            {row.map((session, colIdx) => {
              const index = rowIdx * 5 + colIdx;
              const isActive = session.status !== 'empty';
              const isSelected = selectedFace === index;
              const needsAttention = session.needsAttention;
              const hasNewOutput = session.hasNewOutput;

              return (
                <button
                  key={index}
                  onClick={() => handleDotClick(index)}
                  title={`Session ${index + 1}${session.name ? `: ${session.name}` : ''}`}
                  className={`minimap-dot ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''} ${needsAttention ? 'attention' : ''} ${hasNewOutput ? 'new-output' : ''}`}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    border: isSelected
                      ? '2px solid var(--accent-cyan)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    background: needsAttention
                      ? 'var(--status-error)'
                      : isActive
                        ? 'var(--accent-cyan)'
                        : 'rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    padding: 0,
                    boxShadow: needsAttention
                      ? '0 0 6px var(--status-error)'
                      : isActive
                        ? '0 0 4px var(--accent-cyan-dim)'
                        : 'none',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Shimmer for new output */}
                  {hasNewOutput && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'minimapShimmer 1.5s ease-in-out infinite',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: '6px',
          paddingTop: '4px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          gap: '8px',
          fontSize: '8px',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '2px', background: 'var(--accent-cyan)' }} />
          Active
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '2px', background: 'var(--status-error)' }} />
          Attention
        </span>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes minimapShimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }

        .minimap-dot:hover {
          transform: scale(1.2);
          border-color: var(--accent-cyan) !important;
        }

        .minimap-dot.attention {
          animation: minimapPulse 1s ease-in-out infinite;
        }

        @keyframes minimapPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        @media (prefers-reduced-motion: reduce) {
          .minimap-dot,
          .minimap-dot.attention {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SessionMinimap;
