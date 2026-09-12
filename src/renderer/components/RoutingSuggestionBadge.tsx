/**
 * RoutingSuggestionBadge - ZOIX Smart Model Routing UI Badge
 *
 * Shows the ZOIX-recommended AI model before task execution.
 * This appears in the session UI to proactively suggest the most
 * cost-efficient model for the detected task complexity.
 *
 * Key Value Props:
 * - For Developers: "Right tool for the right job"
 * - For CEOs/CFOs: "AI cost control - no surprise bills"
 */

import React, { useState } from 'react';
import {
  useStore,
  AI_PROVIDERS,
  TaskComplexity,
} from '../store';

// ============================================
// COMPLEXITY COLORS & ICONS
// ============================================

const COMPLEXITY_CONFIG: Record<
  TaskComplexity,
  { color: string; icon: string; label: string }
> = {
  simple: {
    color: '#4caf50', // green
    icon: '⚡',
    label: 'Simple',
  },
  medium: {
    color: '#ff9800', // orange
    icon: '🔧',
    label: 'Medium',
  },
  complex: {
    color: '#9c27b0', // purple
    icon: '🧠',
    label: 'Complex',
  },
  expert: {
    color: '#f44336', // red
    icon: '🎓',
    label: 'Expert',
  },
};

// ============================================
// COMPONENT
// ============================================

interface RoutingSuggestionBadgeProps {
  sessionId?: string;
  onAcceptSuggestion?: (provider: string, model: string) => void;
  onOverride?: () => void;
  compact?: boolean;
}

export const RoutingSuggestionBadge: React.FC<RoutingSuggestionBadgeProps> = ({
  sessionId,
  onAcceptSuggestion,
  onOverride,
  compact = false,
}) => {
  const { lastTaskAnalysis, routingSettings, routingStats } = useStore();
  const [expanded, setExpanded] = useState(false);

  // No analysis available yet
  if (!lastTaskAnalysis) {
    return null;
  }

  const {
    complexity,
    confidence,
    signals,
    suggestedProvider,
    suggestedModel,
    estimatedCost,
    potentialSavings,
  } = lastTaskAnalysis;

  const complexityConfig = COMPLEXITY_CONFIG[complexity];
  const providerInfo = AI_PROVIDERS.find((p) => p.id === suggestedProvider);
  const isLocal = providerInfo?.isLocal ?? false;
  const mode = routingSettings.mode;

  // Format cost display
  const formatCost = (cost: number) => {
    if (cost === 0) return 'Free';
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(3)}`;
  };

  // Compact mode - just show a small badge
  if (compact) {
    return (
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          background: 'rgba(138, 43, 226, 0.15)',
          border: '1px solid rgba(138, 43, 226, 0.3)',
          borderRadius: 12,
          fontSize: 11,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        title={`ZOIX suggests ${suggestedModel} (${complexityConfig.label} task)`}
      >
        <span style={{ fontSize: 10 }}>{complexityConfig.icon}</span>
        <span style={{ color: 'var(--accent-color)', fontWeight: 500 }}>
          {suggestedModel}
        </span>
        {potentialSavings > 0 && (
          <span style={{ color: '#4caf50', fontSize: 10 }}>
            -${potentialSavings.toFixed(2)}
          </span>
        )}
      </div>
    );
  }

  // Full badge with details
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 14,
              color: 'var(--accent-color)',
              fontWeight: 600,
            }}
          >
            ZOIX Routing
          </span>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 500,
              textTransform: 'uppercase',
              background:
                mode === 'auto'
                  ? 'rgba(76, 175, 80, 0.2)'
                  : mode === 'strict'
                  ? 'rgba(244, 67, 54, 0.2)'
                  : 'rgba(255, 152, 0, 0.2)',
              color:
                mode === 'auto'
                  ? '#4caf50'
                  : mode === 'strict'
                  ? '#f44336'
                  : '#ff9800',
            }}
          >
            {mode}
          </span>
        </div>

        {/* Toggle expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 12,
            padding: '2px 4px',
          }}
        >
          {expanded ? '▼' : '▶'} Details
        </button>
      </div>

      {/* Suggestion Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 10,
          background: 'var(--bg-tertiary)',
          borderRadius: 6,
          marginBottom: expanded ? 10 : 0,
        }}
      >
        {/* Complexity Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 4,
            background: `${complexityConfig.color}20`,
            border: `1px solid ${complexityConfig.color}40`,
          }}
        >
          <span style={{ fontSize: 14 }}>{complexityConfig.icon}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: complexityConfig.color,
            }}
          >
            {complexityConfig.label}
          </span>
          <span
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
            }}
          >
            {Math.round(confidence * 100)}%
          </span>
        </div>

        {/* Arrow */}
        <span style={{ color: 'var(--text-muted)' }}>→</span>

        {/* Suggested Provider/Model */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {suggestedModel}
            </span>
            {isLocal && (
              <span
                style={{
                  padding: '1px 4px',
                  borderRadius: 3,
                  fontSize: 9,
                  background: 'rgba(76, 175, 80, 0.2)',
                  color: '#4caf50',
                  fontWeight: 500,
                }}
              >
                LOCAL
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              marginTop: 2,
            }}
          >
            {providerInfo?.name || suggestedProvider}
          </div>
        </div>

        {/* Cost Info */}
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: isLocal ? '#4caf50' : 'var(--text-primary)',
            }}
          >
            {formatCost(estimatedCost)}
          </div>
          {potentialSavings > 0 && (
            <div
              style={{
                fontSize: 10,
                color: '#4caf50',
                marginTop: 2,
              }}
            >
              Save ${potentialSavings.toFixed(3)}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div
          style={{
            padding: 10,
            background: 'var(--bg-primary)',
            borderRadius: 6,
            marginBottom: 10,
          }}
        >
          {/* Signals */}
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              Detection Signals:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {signals.map((signal, i) => (
                <span
                  key={i}
                  style={{
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 10,
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {signal}
                </span>
              ))}
            </div>
          </div>

          {/* Session Stats */}
          {routingStats.totalTasksRouted > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              <span>
                Tasks Routed: {routingStats.totalTasksRouted}
              </span>
              <span style={{ color: '#4caf50' }}>
                Total Saved: ${routingStats.totalSavings.toFixed(2)} (
                {routingStats.savingsPercent.toFixed(0)}%)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons (only in suggest mode) */}
      {mode === 'suggest' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onAcceptSuggestion?.(suggestedProvider, suggestedModel)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--accent-color)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
            }}
          >
            Use {suggestedModel}
          </button>
          <button
            onClick={onOverride}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Override
          </button>
        </div>
      )}

      {/* Auto mode indicator */}
      {mode === 'auto' && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          ZOIX will auto-route to {suggestedModel}
        </div>
      )}

      {/* Manual mode indicator */}
      {mode === 'manual' && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          Manual mode - use AI selector to choose model
        </div>
      )}
    </div>
  );
};

// ============================================
// INLINE SAVINGS INDICATOR (for use in headers)
// ============================================

export const SavingsIndicator: React.FC = () => {
  const { routingStats } = useStore();

  if (routingStats.totalTasksRouted === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        background: 'rgba(76, 175, 80, 0.15)',
        border: '1px solid rgba(76, 175, 80, 0.3)',
        borderRadius: 12,
        fontSize: 11,
      }}
      title={`Smart routing saved ${routingStats.savingsPercent.toFixed(0)}% vs always using premium models`}
    >
      <span style={{ color: '#4caf50' }}>💰</span>
      <span style={{ color: '#4caf50', fontWeight: 500 }}>
        ${routingStats.totalSavings.toFixed(2)} saved
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
        ({routingStats.savingsPercent.toFixed(0)}%)
      </span>
    </div>
  );
};

export default RoutingSuggestionBadge;
