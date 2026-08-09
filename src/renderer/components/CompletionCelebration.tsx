/**
 * CompletionCelebration - Visual feedback for task completion
 *
 * Audit Fix: No celebration of success = missing dopamine hit.
 * This component provides satisfying feedback when tasks complete.
 *
 * Features:
 * - Success animation with particles
 * - Shows savings if any
 * - Skill progression indicator
 * - Auto-dismisses gracefully
 */

import React, { useState, useEffect } from 'react';

export interface CompletionData {
  sessionName: string;
  taskDescription?: string;
  duration: number;
  cost?: number;
  savings?: number;
  savingsPercentage?: number;
  model?: string;
  tokensUsed?: number;
  skillLevelUp?: {
    domain: string;
    newLevel: string;
  };
}

interface CompletionCelebrationProps {
  data: CompletionData;
  onDismiss: () => void;
}

export const CompletionCelebration: React.FC<CompletionCelebrationProps> = ({
  data,
  onDismiss,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [showParticles, setShowParticles] = useState(true);

  useEffect(() => {
    // Stop particles after animation
    const particleTimer = setTimeout(() => setShowParticles(false), 1500);

    // Auto-dismiss after 5 seconds
    const dismissTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onDismiss, 300);
    }, 5000);

    return () => {
      clearTimeout(particleTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  const handleClick = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 300);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(3)}`;
  };

  // Generate particles
  const particles = showParticles
    ? Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 0.8 + Math.random() * 0.4,
        size: 4 + Math.random() * 4,
        color: ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b'][i % 4],
      }))
    : [];

  return (
    <div
      className={`completion-celebration ${isExiting ? 'exiting' : ''}`}
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        zIndex: 10000,
        cursor: 'pointer',
        animation: isExiting
          ? 'celebrationSlideOut 0.3s ease-out forwards'
          : 'celebrationSlideIn 0.5s ease-out',
      }}
    >
      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            bottom: '100%',
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: p.color,
            animation: `particleFly ${p.duration}s ease-out ${p.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}

      {/* Main card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.15))',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(34, 197, 94, 0.2)',
          minWidth: '280px',
          maxWidth: '360px',
        }}
      >
        {/* Header with checkmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'checkmarkPop 0.5s ease-out 0.2s both',
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
            }}
          >
            <span style={{ fontSize: '20px' }}>✓</span>
          </div>
          <div>
            <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '15px' }}>
              Task Complete!
            </div>
            <div style={{ color: '#9ca3af', fontSize: '12px' }}>
              {data.sessionName}
            </div>
          </div>
        </div>

        {/* Task description */}
        {data.taskDescription && (
          <div style={{
            color: '#d1d5db',
            fontSize: '13px',
            marginBottom: '12px',
            lineHeight: 1.4,
          }}>
            {data.taskDescription}
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: '16px',
          padding: '10px 0',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '12px',
        }}>
          {/* Duration */}
          <div>
            <div style={{ color: '#6b7280' }}>Duration</div>
            <div style={{ color: '#e5e7eb', fontWeight: 500 }}>
              {formatDuration(data.duration)}
            </div>
          </div>

          {/* Cost */}
          {data.cost !== undefined && (
            <div>
              <div style={{ color: '#6b7280' }}>Cost</div>
              <div style={{ color: '#e5e7eb', fontWeight: 500 }}>
                {formatCost(data.cost)}
              </div>
            </div>
          )}

          {/* Savings */}
          {data.savings !== undefined && data.savings > 0 && (
            <div>
              <div style={{ color: '#6b7280' }}>Saved</div>
              <div style={{ color: '#22c55e', fontWeight: 700 }}>
                {formatCost(data.savings)}
                {data.savingsPercentage && (
                  <span style={{ fontSize: '10px', marginLeft: '4px' }}>
                    ({data.savingsPercentage.toFixed(0)}%)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Model */}
          {data.model && (
            <div>
              <div style={{ color: '#6b7280' }}>Model</div>
              <div style={{ color: '#60a5fa', fontWeight: 500 }}>
                {data.model}
              </div>
            </div>
          )}
        </div>

        {/* Skill level up */}
        {data.skillLevelUp && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 12px',
              background: 'rgba(168, 85, 247, 0.2)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'levelUpGlow 1s ease-in-out infinite',
            }}
          >
            <span style={{ fontSize: '24px' }}>🎯</span>
            <div>
              <div style={{ color: '#a855f7', fontWeight: 700, fontSize: '13px' }}>
                Level Up!
              </div>
              <div style={{ color: '#c4b5fd', fontSize: '11px' }}>
                {data.skillLevelUp.domain}: {data.skillLevelUp.newLevel}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes celebrationSlideIn {
          from {
            transform: translateX(100%) scale(0.8);
            opacity: 0;
          }
          to {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes celebrationSlideOut {
          from {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
          to {
            transform: translateX(100%) scale(0.8);
            opacity: 0;
          }
        }

        @keyframes checkmarkPop {
          from {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          to {
            transform: scale(1);
          }
        }

        @keyframes particleFly {
          from {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          to {
            transform: translateY(-100px) scale(0);
            opacity: 0;
          }
        }

        @keyframes levelUpGlow {
          0%, 100% {
            box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
          }
          50% {
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Hook to manage completion celebrations
 */
export function useCompletionCelebrations() {
  const [celebration, setCelebration] = useState<CompletionData | null>(null);

  const showCelebration = (data: CompletionData) => {
    setCelebration(data);
  };

  const dismissCelebration = () => {
    setCelebration(null);
  };

  return {
    celebration,
    showCelebration,
    dismissCelebration,
  };
}

export default CompletionCelebration;
