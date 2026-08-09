/**
 * SavingsToast - Live savings notifications
 *
 * Shows a toast notification whenever Zoix routes a task and saves money.
 * This makes the invisible visible - users see exactly when and how much they're saving.
 *
 * Features:
 * - Animated entry/exit
 * - Shows model used, cost, and savings
 * - Stacks multiple notifications
 * - Auto-dismisses after 4 seconds
 * - Click to dismiss
 */

import React, { useState, useEffect, useCallback } from 'react';

export interface SavingsNotification {
  id: string;
  model: string;
  provider: string;
  cost: number;
  savings: number;
  savingsPercentage: number;
  routingReason?: string;
  timestamp: number;
}

interface SavingsToastProps {
  notification: SavingsNotification;
  onDismiss: (id: string) => void;
}

const SavingsToast: React.FC<SavingsToastProps> = ({ notification, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(notification.id), 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const handleClick = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(3)}`;
  };

  const getSavingsColor = (percentage: number) => {
    if (percentage >= 80) return '#22c55e'; // green
    if (percentage >= 50) return '#84cc16'; // lime
    if (percentage >= 20) return '#eab308'; // yellow
    return '#f97316'; // orange
  };

  return (
    <div
      className={`savings-toast ${isExiting ? 'exiting' : 'entering'}`}
      onClick={handleClick}
      style={{
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.1))',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '8px',
        cursor: 'pointer',
        animation: isExiting ? 'slideOutRight 0.3s ease-out forwards' : 'slideInRight 0.3s ease-out',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        maxWidth: '320px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Savings Icon */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${getSavingsColor(notification.savingsPercentage)}, #059669)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 0 12px ${getSavingsColor(notification.savingsPercentage)}40`,
          }}
        >
          <span style={{ fontSize: '16px' }}>💰</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '13px' }}>
              Zoix Saved {notification.savingsPercentage.toFixed(0)}%
            </span>
            <span style={{ color: '#6b7280', fontSize: '11px' }}>
              {formatCost(notification.cost)} actual
            </span>
          </div>

          {/* Model Info */}
          <div style={{ color: '#d1d5db', fontSize: '12px', marginBottom: '4px' }}>
            Routed to <span style={{ color: '#60a5fa', fontWeight: 500 }}>{notification.model}</span>
          </div>

          {/* Savings Amount */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              color: getSavingsColor(notification.savingsPercentage),
              fontWeight: 700,
              fontSize: '14px',
            }}>
              Saved {formatCost(notification.savings)}
            </span>
            {notification.routingReason && (
              <span style={{ color: '#6b7280', fontSize: '10px', fontStyle: 'italic' }}>
                {notification.routingReason}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Container that manages multiple toasts
interface SavingsToastContainerProps {
  notifications: SavingsNotification[];
  onDismiss: (id: string) => void;
}

export const SavingsToastContainer: React.FC<SavingsToastContainerProps> = ({
  notifications,
  onDismiss,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .savings-toast {
          pointer-events: auto;
          transition: transform 0.2s ease;
        }

        .savings-toast:hover {
          transform: scale(1.02);
        }
      `}</style>

      {notifications.slice(-5).map((notification) => (
        <SavingsToast
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};

// Hook to manage savings notifications
export function useSavingsNotifications() {
  const [notifications, setNotifications] = useState<SavingsNotification[]>([]);

  const addNotification = useCallback((notification: Omit<SavingsNotification, 'id' | 'timestamp'>) => {
    const id = `savings-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setNotifications((prev) => [
      ...prev,
      {
        ...notification,
        id,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAll,
  };
}

// Cumulative savings display for nav bar
interface CumulativeSavingsProps {
  totalSavings: number;
  taskCount: number;
  onClick?: () => void;
}

export const CumulativeSavings: React.FC<CumulativeSavingsProps> = ({
  totalSavings,
  taskCount,
  onClick,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevSavings, setPrevSavings] = useState(totalSavings);

  useEffect(() => {
    if (totalSavings > prevSavings) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    }
    setPrevSavings(totalSavings);
  }, [totalSavings, prevSavings]);

  const formatSavings = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
    if (amount >= 100) return `$${amount.toFixed(0)}`;
    if (amount >= 10) return `$${amount.toFixed(1)}`;
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        background: isAnimating
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.2))'
          : 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '6px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        transform: isAnimating ? 'scale(1.05)' : 'scale(1)',
      }}
      title={`Zoix has saved you ${formatSavings(totalSavings)} across ${taskCount} tasks`}
    >
      <span style={{ fontSize: '12px' }}>💰</span>
      <span
        style={{
          color: '#22c55e',
          fontWeight: 600,
          fontSize: '12px',
          fontFamily: 'SF Mono, Monaco, monospace',
        }}
      >
        {formatSavings(totalSavings)}
      </span>
      <span style={{ color: '#6b7280', fontSize: '10px' }}>saved</span>
    </div>
  );
};

export default SavingsToast;
