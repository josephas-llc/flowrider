/**
 * SavingsDashboard - ZOIX Cost Control & Savings Dashboard
 *
 * This is the "CFO View" - a comprehensive dashboard showing:
 * - Real-time AI spend tracking
 * - Savings from smart model routing
 * - Budget status and projections
 * - Cost breakdown by provider and complexity
 *
 * Key Value Props:
 * - For CEOs/CFOs: "AI cost control - no surprise bills"
 * - For Developers: Transparency on where tokens go
 */

import React, { useState } from 'react';
import {
  useStore,
  AI_PROVIDERS,
  TaskComplexity,
} from '../store';

// ============================================
// TYPES
// ============================================

type TimeRange = 'today' | 'week' | 'month' | 'all';

// ============================================
// COMPONENT
// ============================================

export const SavingsDashboard: React.FC = () => {
  const { routingStats, routingSettings } = useStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // Calculate percentage for progress bars
  const savingsPercent = Math.min(routingStats.savingsPercent || 0, 100);

  // Budget status
  const dailyBudget = routingSettings.dailyBudget || 0;
  const monthlyBudget = routingSettings.monthlyBudget || 0;
  const dailyUsed = dailyBudget > 0 ? (routingStats.todayCost / dailyBudget) * 100 : 0;
  const monthlyUsed = monthlyBudget > 0 ? (routingStats.monthCost / monthlyBudget) * 100 : 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount === 0) return '$0.00';
    if (amount < 0.01) return '<$0.01';
    if (amount < 1) return `$${amount.toFixed(3)}`;
    return `$${amount.toFixed(2)}`;
  };

  // Format percentage
  const formatPercent = (value: number) => `${Math.round(value)}%`;

  // Get complexity breakdown
  const complexityBreakdown = routingStats.routingsByComplexity;
  const totalRouted = routingStats.totalTasksRouted || 1; // Avoid division by zero

  return (
    <div
      style={{
        padding: 20,
        background: 'var(--bg-primary)',
        borderRadius: 12,
        border: '1px solid var(--border-color)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 20 }}>💰</span>
            ZOIX Cost Intelligence
          </h2>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            AI spend tracking and savings analytics
          </p>
        </div>

        {/* Time Range Selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['today', 'week', 'month', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
                background:
                  timeRange === range
                    ? 'var(--accent-color)'
                    : 'var(--bg-tertiary)',
                color:
                  timeRange === range ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {/* Total Tasks Routed */}
        <StatCard
          icon="🎯"
          label="Tasks Routed"
          value={routingStats.totalTasksRouted.toString()}
          subtext="by ZOIX"
        />

        {/* Total Actual Cost */}
        <StatCard
          icon="💳"
          label="Actual Spend"
          value={formatCurrency(routingStats.totalCostActual)}
          subtext="total cost"
        />

        {/* Total Savings */}
        <StatCard
          icon="💰"
          label="Total Saved"
          value={formatCurrency(routingStats.totalSavings)}
          subtext={`${formatPercent(savingsPercent)} reduction`}
          highlight
        />

        {/* Would Have Cost */}
        <StatCard
          icon="📊"
          label="Baseline Cost"
          value={formatCurrency(routingStats.totalCostBaseline)}
          subtext="without ZOIX"
          muted
        />
      </div>

      {/* Savings Progress Bar */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            Savings Rate
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#4caf50',
            }}
          >
            {formatPercent(savingsPercent)}
          </span>
        </div>
        <div
          style={{
            height: 8,
            background: 'var(--bg-tertiary)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${savingsPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4caf50, #81c784)',
              borderRadius: 4,
              transition: 'width 0.5s ease',
            }}
          />
        </div>
        <p
          style={{
            margin: '8px 0 0 0',
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          ZOIX routed {formatPercent((complexityBreakdown.simple / totalRouted) * 100)} of
          tasks to free/cheap models
        </p>
      </div>

      {/* Budget Status (if budgets are set) */}
      {(dailyBudget > 0 || monthlyBudget > 0) && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h3
            style={{
              margin: '0 0 12px 0',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            Budget Status
          </h3>

          {dailyBudget > 0 && (
            <BudgetBar
              label="Daily Budget"
              used={routingStats.todayCost}
              total={dailyBudget}
              percent={dailyUsed}
            />
          )}

          {monthlyBudget > 0 && (
            <BudgetBar
              label="Monthly Budget"
              used={routingStats.monthCost}
              total={monthlyBudget}
              percent={monthlyUsed}
            />
          )}
        </div>
      )}

      {/* Complexity Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
      >
        {/* By Complexity */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h3
            style={{
              margin: '0 0 12px 0',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            Tasks by Complexity
          </h3>

          <ComplexityBar
            label="Simple"
            icon="⚡"
            count={complexityBreakdown.simple}
            total={totalRouted}
            color="#4caf50"
          />
          <ComplexityBar
            label="Medium"
            icon="🔧"
            count={complexityBreakdown.medium}
            total={totalRouted}
            color="#ff9800"
          />
          <ComplexityBar
            label="Complex"
            icon="🧠"
            count={complexityBreakdown.complex}
            total={totalRouted}
            color="#9c27b0"
          />
          <ComplexityBar
            label="Expert"
            icon="🎓"
            count={complexityBreakdown.expert}
            total={totalRouted}
            color="#f44336"
          />
        </div>

        {/* By Provider */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h3
            style={{
              margin: '0 0 12px 0',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            Tasks by Provider
          </h3>

          {Object.entries(routingStats.routingsByProvider || {})
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([providerId, count]) => {
              const provider = AI_PROVIDERS.find((p) => p.id === providerId);
              return (
                <ProviderBar
                  key={providerId}
                  name={provider?.name || providerId}
                  isLocal={provider?.isLocal || false}
                  count={count}
                  total={totalRouted}
                />
              );
            })}

          {Object.keys(routingStats.routingsByProvider || {}).length === 0 && (
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}
            >
              No provider data yet
            </p>
          )}
        </div>
      </div>

      {/* Routing Mode Info */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: 'var(--bg-tertiary)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>
            {routingSettings.mode === 'auto'
              ? '🤖'
              : routingSettings.mode === 'suggest'
              ? '💡'
              : routingSettings.mode === 'strict'
              ? '🔒'
              : '✋'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Routing Mode:{' '}
            <strong style={{ textTransform: 'capitalize' }}>
              {routingSettings.mode}
            </strong>
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {routingSettings.preferLocalWhenPossible
            ? 'Prefer local models'
            : 'Cloud models enabled'}
        </span>
      </div>
    </div>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  subtext: string;
  highlight?: boolean;
  muted?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subtext,
  highlight,
  muted,
}) => (
  <div
    style={{
      background: highlight
        ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05))'
        : 'var(--bg-secondary)',
      border: highlight
        ? '1px solid rgba(76, 175, 80, 0.3)'
        : '1px solid var(--border-color)',
      borderRadius: 8,
      padding: 12,
      textAlign: 'center',
    }}
  >
    <span style={{ fontSize: 20 }}>{icon}</span>
    <div
      style={{
        fontSize: 18,
        fontWeight: 600,
        color: highlight
          ? '#4caf50'
          : muted
          ? 'var(--text-muted)'
          : 'var(--text-primary)',
        marginTop: 4,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        marginTop: 2,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 10,
        color: 'var(--text-muted)',
        opacity: 0.7,
      }}
    >
      {subtext}
    </div>
  </div>
);

interface BudgetBarProps {
  label: string;
  used: number;
  total: number;
  percent: number;
}

const BudgetBar: React.FC<BudgetBarProps> = ({ label, used, total, percent }) => {
  const isOverBudget = percent >= 100;
  const isWarning = percent >= 80 && percent < 100;

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: isOverBudget
              ? '#f44336'
              : isWarning
              ? '#ff9800'
              : 'var(--text-primary)',
          }}
        >
          ${used.toFixed(2)} / ${total.toFixed(2)}
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: 'var(--bg-tertiary)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(percent, 100)}%`,
            height: '100%',
            background: isOverBudget
              ? '#f44336'
              : isWarning
              ? '#ff9800'
              : '#4caf50',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};

interface ComplexityBarProps {
  label: string;
  icon: string;
  count: number;
  total: number;
  color: string;
}

const ComplexityBar: React.FC<ComplexityBarProps> = ({
  label,
  icon,
  count,
  total,
  color,
}) => {
  const percent = total > 0 ? (count / total) * 100 : 0;

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ fontSize: 12 }}>{icon}</span>
          {label}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          {count} ({Math.round(percent)}%)
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: 'var(--bg-tertiary)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: color,
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};

interface ProviderBarProps {
  name: string;
  isLocal: boolean;
  count: number;
  total: number;
}

const ProviderBar: React.FC<ProviderBarProps> = ({
  name,
  isLocal,
  count,
  total,
}) => {
  const percent = total > 0 ? (count / total) * 100 : 0;

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {name}
          {isLocal && (
            <span
              style={{
                padding: '1px 4px',
                borderRadius: 3,
                fontSize: 8,
                background: 'rgba(76, 175, 80, 0.2)',
                color: '#4caf50',
              }}
            >
              LOCAL
            </span>
          )}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          {count} ({Math.round(percent)}%)
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: 'var(--bg-tertiary)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: isLocal
              ? '#4caf50'
              : 'var(--accent-color)',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};

// ============================================
// COMPACT SAVINGS WIDGET (for sidebar/header)
// ============================================

export const CompactSavingsWidget: React.FC = () => {
  const { routingStats } = useStore();

  if (routingStats.totalTasksRouted === 0) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    if (amount < 1) return `${Math.round(amount * 100)}c`;
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05))',
        border: '1px solid rgba(76, 175, 80, 0.25)',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      title={`ZOIX saved ${routingStats.savingsPercent.toFixed(0)}% by smart routing`}
    >
      <span style={{ fontSize: 14 }}>💰</span>
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#4caf50',
          }}
        >
          {formatCurrency(routingStats.totalSavings)} saved
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
          }}
        >
          {routingStats.totalTasksRouted} tasks routed
        </div>
      </div>
    </div>
  );
};

export default SavingsDashboard;
