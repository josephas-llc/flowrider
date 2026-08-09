/**
 * ThinkingIndicator - Shows AI inference progress
 *
 * Audit Fix: Dead air during model inference is a flow killer.
 * This component provides visual feedback while the AI is processing.
 *
 * Features:
 * - Animated "thinking" indicator
 * - Shows elapsed time
 * - Model name being used
 * - Estimated completion (if available)
 * - Calming animation to reduce anxiety
 */

import React, { useState, useEffect } from 'react';

export interface ThinkingIndicatorProps {
  isThinking: boolean;
  model?: string;
  provider?: string;
  startTime?: number;
  estimatedDurationMs?: number;
  message?: string;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  isThinking,
  model = 'AI',
  provider,
  startTime,
  estimatedDurationMs,
  message,
}) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [dots, setDots] = useState('');

  // Update elapsed time
  useEffect(() => {
    if (!isThinking || !startTime) {
      setElapsedMs(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isThinking, startTime]);

  // Animate dots
  useEffect(() => {
    if (!isThinking) {
      setDots('');
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    return () => clearInterval(interval);
  }, [isThinking]);

  if (!isThinking) return null;

  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const progress = estimatedDurationMs
    ? Math.min(100, (elapsedMs / estimatedDurationMs) * 100)
    : null;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusMessage = () => {
    if (message) return message;
    if (elapsedSeconds < 2) return 'Starting';
    if (elapsedSeconds < 5) return 'Processing';
    if (elapsedSeconds < 15) return 'Thinking deeply';
    if (elapsedSeconds < 30) return 'Complex reasoning';
    return 'Still working';
  };

  return (
    <div
      className="thinking-indicator"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 16px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15))',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '8px',
        fontSize: '13px',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      {/* Animated Brain/Sparkle Icon */}
      <div
        style={{
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      >
        <span style={{ fontSize: '18px' }}>🧠</span>
      </div>

      {/* Status */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#60a5fa', fontWeight: 500 }}>
            {model}
          </span>
          <span style={{ color: '#9ca3af' }}>
            {getStatusMessage()}{dots}
          </span>
        </div>

        {/* Progress bar (if estimated duration available) */}
        {progress !== null && (
          <div
            style={{
              marginTop: '6px',
              height: '3px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
        )}
      </div>

      {/* Timer */}
      <div
        style={{
          fontFamily: 'SF Mono, Monaco, monospace',
          fontSize: '11px',
          color: '#6b7280',
          minWidth: '40px',
          textAlign: 'right',
        }}
      >
        {formatTime(elapsedMs)}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

/**
 * Compact thinking indicator for nav bar
 */
export const ThinkingDot: React.FC<{ isThinking: boolean; sessionName?: string }> = ({
  isThinking,
  sessionName,
}) => {
  if (!isThinking) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        background: 'rgba(59, 130, 246, 0.2)',
        borderRadius: '4px',
        fontSize: '11px',
      }}
      title={sessionName ? `${sessionName} is thinking...` : 'AI is thinking...'}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#3b82f6',
          animation: 'blink 1s ease-in-out infinite',
        }}
      />
      <span style={{ color: '#60a5fa' }}>
        {sessionName ? sessionName.slice(0, 10) : 'Thinking'}
      </span>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default ThinkingIndicator;
