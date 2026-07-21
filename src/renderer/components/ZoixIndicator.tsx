import React, { useState, useEffect } from 'react';
import { useStore } from '../store';

/**
 * ZoixIndicator - Persistent nav bar indicator showing ZOIX learning activity
 *
 * Shows:
 * - Brain icon with pulse animation when learning
 * - Total patterns learned
 * - Click to expand insights panel
 */
export const ZoixIndicator: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { sessions, zoixPatterns, setZoixPatterns } = useStore();
  const [isPulsing, setIsPulsing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Count active sessions
  const activeSessions = sessions.filter(s => s.status !== 'empty').length;

  // Fetch real pattern count from backend
  useEffect(() => {
    const fetchPatternCount = async () => {
      try {
        const result = await window.flowrider.leoai.getStats();
        if (result.success && result.data) {
          setZoixPatterns(result.data.totalPatterns);
        }
      } catch (error) {
        console.error('[ZoixIndicator] Failed to fetch pattern count:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatternCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchPatternCount, 30000);
    return () => clearInterval(interval);
  }, [setZoixPatterns]);

  // Auto-pulse periodically when sessions are active (simulates learning)
  useEffect(() => {
    if (activeSessions === 0) {
      setIsPulsing(false);
      return;
    }

    // Pulse every 8-15 seconds when there are active sessions
    const scheduleNextPulse = () => {
      const delay = 8000 + Math.random() * 7000; // 8-15 seconds
      return setTimeout(() => {
        setIsPulsing(true);
        // Pulse for 2 seconds
        setTimeout(() => setIsPulsing(false), 2000);
        // Schedule next pulse
        timerId = scheduleNextPulse();
      }, delay);
    };

    // Start with an immediate pulse to show activity
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 2000);

    let timerId = scheduleNextPulse();
    return () => clearTimeout(timerId);
  }, [activeSessions > 0]);

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: isPulsing
          ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.3), rgba(59, 130, 246, 0.3))'
          : 'var(--bg-tertiary)',
        border: '1px solid',
        borderColor: isPulsing ? 'rgba(147, 51, 234, 0.5)' : 'var(--border-color)',
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      title="ZOIX Learning System - Click for insights"
    >
      {/* Pulse animation overlay */}
      {isPulsing && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.2), transparent)',
            animation: 'zoixPulse 1.5s infinite',
          }}
        />
      )}

      {/* Brain icon */}
      <span
        style={{
          fontSize: 14,
          filter: isPulsing ? 'drop-shadow(0 0 4px rgba(147, 51, 234, 0.8))' : 'none',
          transition: 'filter 0.3s ease',
        }}
      >
        🧠
      </span>

      {/* Label and count */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: isPulsing ? '#a855f7' : 'var(--text-secondary)',
          fontFamily: 'SF Mono, Monaco, monospace',
          letterSpacing: '0.5px',
        }}
      >
        ZOIX
      </span>

      <span
        style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          fontFamily: 'SF Mono, Monaco, monospace',
        }}
      >
        {zoixPatterns.toLocaleString()}
      </span>

      {/* Learning indicator dot */}
      {activeSessions > 0 && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: isPulsing ? '#a855f7' : '#22c55e',
            boxShadow: isPulsing
              ? '0 0 8px rgba(168, 85, 247, 0.8)'
              : '0 0 4px rgba(34, 197, 94, 0.5)',
            animation: 'blink 2s infinite',
          }}
        />
      )}

      <style>{`
        @keyframes zoixPulse {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </button>
  );
};

export default ZoixIndicator;
