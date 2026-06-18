import React from 'react';
import { useStore } from '../store';

const SENIOR_DEV_HOURLY = 150;
const MID_DEV_HOURLY = 100;
const TOKENS_PER_DEV_HOUR = 50000; // Rough estimate

export const ROICalculator: React.FC = () => {
  const { costMetrics, sessions } = useStore();

  const activeSessions = sessions.filter(s => s.status !== 'empty').length;
  const totalTokens = costMetrics.totalTokens;
  const aiCost = costMetrics.totalCost;

  // Calculate equivalent developer hours
  const devHoursEquivalent = totalTokens / TOKENS_PER_DEV_HOUR;
  const seniorDevCost = devHoursEquivalent * SENIOR_DEV_HOURLY;
  const midDevCost = devHoursEquivalent * MID_DEV_HOURLY;

  // ROI calculations
  const savingsVsSenior = seniorDevCost - aiCost;
  const savingsVsMid = midDevCost - aiCost;
  const roiMultiplier = aiCost > 0 ? seniorDevCost / aiCost : 0;

  // Parallelization benefit
  const parallelSpeedup = Math.max(activeSessions, 1);
  const effectiveHoursSaved = devHoursEquivalent * (parallelSpeedup - 1) / parallelSpeedup;

  const formatCurrency = (n: number) => {
    if (n < 0.01) return '<$0.01';
    if (n < 1000) return `$${n.toFixed(2)}`;
    if (n < 1000000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${(n / 1000000).toFixed(2)}M`;
  };

  const formatHours = (n: number) => {
    if (n < 1) return `${(n * 60).toFixed(0)} min`;
    if (n < 100) return `${n.toFixed(1)} hrs`;
    return `${n.toFixed(0)} hrs`;
  };

  return (
    <div className="roi-calculator">
      <div className="roi-header">
        <h3>ROI Calculator</h3>
        <span className="roi-badge">LIVE</span>
      </div>

      <div className="roi-hero-stat">
        <div className="roi-multiplier">
          <span className="value">{roiMultiplier.toFixed(0)}x</span>
          <span className="label">Cost Efficiency vs Developer</span>
        </div>
      </div>

      <div className="roi-comparison">
        <div className="comparison-row header">
          <span>Resource</span>
          <span>Cost</span>
          <span>Savings</span>
        </div>

        <div className="comparison-row ai">
          <span className="resource">
            <span className="dot ai" />
            AI (Flowrider)
          </span>
          <span className="cost">{formatCurrency(aiCost)}</span>
          <span className="savings baseline">Baseline</span>
        </div>

        <div className="comparison-row human">
          <span className="resource">
            <span className="dot mid" />
            Mid Developer (${MID_DEV_HOURLY}/hr)
          </span>
          <span className="cost">{formatCurrency(midDevCost)}</span>
          <span className="savings positive">{formatCurrency(savingsVsMid)}</span>
        </div>

        <div className="comparison-row human">
          <span className="resource">
            <span className="dot senior" />
            Senior Developer (${SENIOR_DEV_HOURLY}/hr)
          </span>
          <span className="cost">{formatCurrency(seniorDevCost)}</span>
          <span className="savings positive">{formatCurrency(savingsVsSenior)}</span>
        </div>
      </div>

      <div className="roi-metrics">
        <div className="metric">
          <span className="metric-value">{formatHours(devHoursEquivalent)}</span>
          <span className="metric-label">Dev Hours Equivalent</span>
        </div>
        <div className="metric">
          <span className="metric-value">{activeSessions}</span>
          <span className="metric-label">Parallel Sessions</span>
        </div>
        <div className="metric">
          <span className="metric-value">{formatHours(effectiveHoursSaved)}</span>
          <span className="metric-label">Time Saved (Parallel)</span>
        </div>
      </div>

      <div className="roi-projection">
        <h4>Monthly Projection (at current rate)</h4>
        <div className="projection-grid">
          <div className="projection-item">
            <span className="label">AI Cost</span>
            <span className="value yellow">{formatCurrency(aiCost * 30)}</span>
          </div>
          <div className="projection-item">
            <span className="label">Developer Equivalent</span>
            <span className="value red">{formatCurrency(seniorDevCost * 30)}</span>
          </div>
          <div className="projection-item highlight">
            <span className="label">Monthly Savings</span>
            <span className="value green">{formatCurrency(savingsVsSenior * 30)}</span>
          </div>
          <div className="projection-item highlight">
            <span className="label">Annual Savings</span>
            <span className="value green">{formatCurrency(savingsVsSenior * 365)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
