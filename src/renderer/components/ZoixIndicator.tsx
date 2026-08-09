import React, { useState, useEffect } from 'react';
import { useStore } from '../store';

interface RoutingStats {
  totalSavings: number;
  savingsPercentage: number;
  totalTasks: number;
  lastRouting?: {
    model: string;
    reason: string;
    savedAmount: number;
  };
}

/**
 * ZoixIndicator - Persistent nav bar indicator showing ZOIX learning activity
 *
 * Shows:
 * - Brain icon with pulse animation when learning
 * - Total patterns learned
 * - LIVE SAVINGS from routing decisions (THE KEY VISIBILITY FIX)
 * - Click to expand insights panel
 */
export const ZoixIndicator: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { sessions, zoixPatterns, setZoixPatterns } = useStore();
  const [isPulsing, setIsPulsing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [routingStats, setRoutingStats] = useState<RoutingStats>({
    totalSavings: 0,
    savingsPercentage: 0,
    totalTasks: 0,
  });
  const [savingsAnimating, setSavingsAnimating] = useState(false);

  // Count active sessions
  const activeSessions = sessions.filter(s => s.status !== 'empty').length;

  // Fetch real pattern count and routing stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch pattern count
        const patternResult = await window.flowrider.leoai.getStats();
        if (patternResult.success && patternResult.data) {
          setZoixPatterns(patternResult.data.totalPatterns);
        }

        // Fetch routing/savings stats
        const routingResult = await window.flowrider.leoai.getRoutingStats?.();
        if (routingResult?.success && routingResult.data) {
          const prevSavings = routingStats.totalSavings;
          setRoutingStats({
            totalSavings: routingResult.data.totalSavingsUsd || 0,
            savingsPercentage: routingResult.data.savingsPercentage || 0,
            totalTasks: routingResult.data.totalTasks || 0,
            lastRouting: routingResult.data.lastRouting,
          });

          // Animate if savings increased
          if (routingResult.data.totalSavingsUsd > prevSavings) {
            setSavingsAnimating(true);
            setTimeout(() => setSavingsAnimating(false), 1000);
          }
        }
      } catch (error) {
        console.error('[ZoixIndicator] Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // Poll for updates every 10 seconds (more frequent for savings visibility)
    const interval = setInterval(fetchStats, 10000);
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

      {/* Label */}
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

      {/* Savings display - THE KEY VISIBILITY FIX */}
      {routingStats.totalSavings > 0 && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: savingsAnimating ? '#4ade80' : '#22c55e',
            fontFamily: 'SF Mono, Monaco, monospace',
            padding: '2px 6px',
            background: savingsAnimating
              ? 'rgba(34, 197, 94, 0.3)'
              : 'rgba(34, 197, 94, 0.15)',
            borderRadius: 4,
            transition: 'all 0.3s ease',
            transform: savingsAnimating ? 'scale(1.1)' : 'scale(1)',
            boxShadow: savingsAnimating
              ? '0 0 8px rgba(34, 197, 94, 0.5)'
              : 'none',
          }}
          title={`Saved ${routingStats.savingsPercentage.toFixed(0)}% vs baseline across ${routingStats.totalTasks} tasks`}
        >
          ${routingStats.totalSavings < 1
            ? routingStats.totalSavings.toFixed(2)
            : routingStats.totalSavings.toFixed(0)} saved
        </span>
      )}

      {/* Pattern count (secondary) */}
      <span
        style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          fontFamily: 'SF Mono, Monaco, monospace',
        }}
        title={`${zoixPatterns.toLocaleString()} patterns learned`}
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
