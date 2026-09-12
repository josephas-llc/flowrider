/**
 * RoutingSettingsPanel - Smart Model Routing UI
 *
 * Allows users to configure ZOIX's intelligent model routing:
 * - Routing mode (manual, suggest, auto, strict)
 * - Budget controls (daily/monthly limits)
 * - Fallback behavior when over budget
 * - Project-specific routing rules
 *
 * Appeals to both developers ("right tool for the right job")
 * and executives/CEOs (AI cost control - no surprise bills)
 */

import React, { useState } from 'react';
import {
  useFlowriderStore,
  RoutingMode,
  RoutingRule,
  AI_PROVIDERS,
  AIProvider,
} from '../store';

// Mode descriptions for the UI
const ROUTING_MODE_INFO: Record<RoutingMode, { label: string; description: string; icon: string }> = {
  manual: {
    label: 'Manual',
    description: 'You pick the model every time. Full control.',
    icon: '✋',
  },
  suggest: {
    label: 'Suggest',
    description: 'ZOIX suggests the best model, you confirm. Balanced.',
    icon: '💡',
  },
  auto: {
    label: 'Auto',
    description: 'ZOIX auto-routes to the optimal model. You can override.',
    icon: '🤖',
  },
  strict: {
    label: 'Strict',
    description: 'ZOIX enforces cost limits. Blocks expensive models when over budget.',
    icon: '🔒',
  },
};

export const RoutingSettingsPanel: React.FC = () => {
  const {
    routingSettings,
    routingStats,
    projects,
    setRoutingMode,
    updateRoutingSettings,
    addRoutingRule,
    removeRoutingRule,
    updateRoutingRule,
    resetDailyRoutingStats,
    resetMonthlyRoutingStats,
  } = useFlowriderStore();

  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState<Partial<RoutingRule>>({
    name: '',
    description: '',
    enabled: true,
  });

  // Calculate budget percentages
  const dailyPercent = routingSettings.dailyBudget
    ? Math.min(100, (routingStats.todayCost / routingSettings.dailyBudget) * 100)
    : 0;
  const monthlyPercent = routingSettings.monthlyBudget
    ? Math.min(100, (routingStats.monthCost / routingSettings.monthlyBudget) * 100)
    : 0;

  const handleAddRule = () => {
    if (!newRule.name) return;

    const rule: RoutingRule = {
      id: `rule-${Date.now()}`,
      name: newRule.name,
      description: newRule.description || '',
      enabled: true,
      projectId: newRule.projectId,
      preferredProvider: newRule.preferredProvider as AIProvider,
      preferredModel: newRule.preferredModel,
      maxCostPerTask: newRule.maxCostPerTask,
    };

    addRoutingRule(rule);
    setNewRule({ name: '', description: '', enabled: true });
    setShowAddRule(false);
  };

  return (
    <div className="routing-settings-panel" style={{ padding: '20px', color: '#e0e0e0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#a855f7' }}>ZOIX</span> Smart Model Routing
        </h2>
        <p style={{ margin: '8px 0 0 0', color: '#888', fontSize: '14px' }}>
          Automatically route tasks to the most cost-efficient AI model
        </p>
      </div>

      {/* Savings Overview */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(34, 197, 94, 0.15))',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        border: '1px solid rgba(168, 85, 247, 0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Total Savings</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>
              ${routingStats.totalSavings.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {routingStats.savingsPercent.toFixed(1)}% saved vs. always using Claude
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#888' }}>Tasks Routed</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#a855f7' }}>
              {routingStats.totalTasksRouted}
            </div>
          </div>
        </div>
      </div>

      {/* Routing Mode Selector */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '12px', textTransform: 'uppercase' }}>
          Routing Mode
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {(Object.keys(ROUTING_MODE_INFO) as RoutingMode[]).map((mode) => {
            const info = ROUTING_MODE_INFO[mode];
            const isSelected = routingSettings.mode === mode;
            return (
              <button
                key={mode}
                onClick={() => setRoutingMode(mode)}
                style={{
                  padding: '12px',
                  background: isSelected ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: isSelected ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{info.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: isSelected ? '#a855f7' : '#fff' }}>
                  {info.label}
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                  {info.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget Controls */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '12px', textTransform: 'uppercase' }}>
          Budget Controls
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Daily Budget */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>Daily Budget</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: dailyPercent >= 80 ? '#f59e0b' : '#22c55e' }}>
                ${routingStats.todayCost.toFixed(2)} / ${routingSettings.dailyBudget?.toFixed(2) || '∞'}
              </span>
            </div>
            <div style={{
              height: '6px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${dailyPercent}%`,
                height: '100%',
                background: dailyPercent >= 100 ? '#ef4444' : dailyPercent >= 80 ? '#f59e0b' : '#22c55e',
                borderRadius: '3px',
                transition: 'width 0.3s',
              }} />
            </div>
            <input
              type="number"
              placeholder="Set daily limit..."
              value={routingSettings.dailyBudget || ''}
              onChange={(e) => updateRoutingSettings({ dailyBudget: e.target.value ? parseFloat(e.target.value) : undefined })}
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '14px',
              }}
            />
            <button
              onClick={resetDailyRoutingStats}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: '#888',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Reset Daily
            </button>
          </div>

          {/* Monthly Budget */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>Monthly Budget</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: monthlyPercent >= 80 ? '#f59e0b' : '#22c55e' }}>
                ${routingStats.monthCost.toFixed(2)} / ${routingSettings.monthlyBudget?.toFixed(2) || '∞'}
              </span>
            </div>
            <div style={{
              height: '6px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${monthlyPercent}%`,
                height: '100%',
                background: monthlyPercent >= 100 ? '#ef4444' : monthlyPercent >= 80 ? '#f59e0b' : '#22c55e',
                borderRadius: '3px',
                transition: 'width 0.3s',
              }} />
            </div>
            <input
              type="number"
              placeholder="Set monthly limit..."
              value={routingSettings.monthlyBudget || ''}
              onChange={(e) => updateRoutingSettings({ monthlyBudget: e.target.value ? parseFloat(e.target.value) : undefined })}
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '14px',
              }}
            />
            <button
              onClick={resetMonthlyRoutingStats}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: '#888',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Reset Monthly
            </button>
          </div>
        </div>
      </div>

      {/* Fallback Behavior */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '12px', textTransform: 'uppercase' }}>
          When Over Budget
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['block', 'local', 'warn'] as const).map((fallback) => {
            const isSelected = routingSettings.overBudgetFallback === fallback;
            const info = {
              block: { label: 'Block', desc: 'Stop AI requests', icon: '🚫' },
              local: { label: 'Use Local', desc: 'Fall back to Ollama', icon: '💻' },
              warn: { label: 'Warn Only', desc: 'Show warning, continue', icon: '⚠️' },
            }[fallback];
            return (
              <button
                key={fallback}
                onClick={() => updateRoutingSettings({ overBudgetFallback: fallback })}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: isSelected ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: isSelected ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '20px' }}>{info.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: isSelected ? '#a855f7' : '#fff' }}>
                  {info.label}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>{info.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prefer Local Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
        marginBottom: '24px',
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
            Prefer Local for Simple Tasks
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            Use Ollama for simple tasks (free) instead of paid APIs
          </div>
        </div>
        <button
          onClick={() => updateRoutingSettings({ preferLocalWhenPossible: !routingSettings.preferLocalWhenPossible })}
          style={{
            width: '48px',
            height: '24px',
            borderRadius: '12px',
            border: 'none',
            background: routingSettings.preferLocalWhenPossible ? '#a855f7' : 'rgba(255,255,255,0.2)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
          }}
        >
          <div style={{
            position: 'absolute',
            top: '2px',
            left: routingSettings.preferLocalWhenPossible ? '26px' : '2px',
            width: '20px',
            height: '20px',
            borderRadius: '10px',
            background: '#fff',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Routing Rules */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', color: '#888', margin: 0, textTransform: 'uppercase' }}>
            Project-Specific Rules
          </h3>
          <button
            onClick={() => setShowAddRule(true)}
            style={{
              padding: '6px 12px',
              background: '#a855f7',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            + Add Rule
          </button>
        </div>

        {/* Add Rule Form */}
        {showAddRule && (
          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}>
            <input
              type="text"
              placeholder="Rule name..."
              value={newRule.name || ''}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                color: '#fff',
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <select
                value={newRule.projectId || ''}
                onChange={(e) => setNewRule({ ...newRule, projectId: e.target.value || undefined })}
                style={{
                  padding: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={newRule.preferredProvider || ''}
                onChange={(e) => setNewRule({ ...newRule, preferredProvider: e.target.value as AIProvider })}
                style={{
                  padding: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              >
                <option value="">Auto-select Provider</option>
                {AI_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <input
              type="number"
              placeholder="Max cost per task ($)..."
              value={newRule.maxCostPerTask || ''}
              onChange={(e) => setNewRule({ ...newRule, maxCostPerTask: e.target.value ? parseFloat(e.target.value) : undefined })}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '12px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                color: '#fff',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleAddRule}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#a855f7',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Add Rule
              </button>
              <button
                onClick={() => setShowAddRule(false)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  color: '#888',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Rules List */}
        {routingSettings.rules.length === 0 ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: '#666',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            border: '1px dashed rgba(255,255,255,0.1)',
          }}>
            No custom rules yet. Add rules to override routing for specific projects.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {routingSettings.rules.map((rule) => {
              const project = projects.find((p) => p.id === rule.projectId);
              const provider = AI_PROVIDERS.find((p) => p.id === rule.preferredProvider);
              return (
                <div
                  key={rule.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: rule.enabled ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    opacity: rule.enabled ? 1 : 0.5,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                      {rule.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                      {project ? `Project: ${project.name}` : 'All projects'}
                      {provider && ` → ${provider.name}`}
                      {rule.maxCostPerTask && ` (max $${rule.maxCostPerTask})`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => updateRoutingRule(rule.id, { enabled: !rule.enabled })}
                      style={{
                        padding: '4px 8px',
                        background: rule.enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '4px',
                        color: rule.enabled ? '#22c55e' : '#888',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => removeRoutingRule(rule.id)}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ef4444',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Complexity Distribution Stats */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '12px', textTransform: 'uppercase' }}>
          Task Complexity Distribution
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {(['simple', 'medium', 'complex', 'expert'] as const).map((complexity) => {
            const count = routingStats.routingsByComplexity[complexity];
            const total = routingStats.totalTasksRouted || 1;
            const percent = (count / total) * 100;
            const colors = {
              simple: '#22c55e',
              medium: '#3b82f6',
              complex: '#f59e0b',
              expert: '#a855f7',
            };
            return (
              <div
                key={complexity}
                style={{
                  padding: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: colors[complexity] }}>
                  {count}
                </div>
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'capitalize' }}>
                  {complexity}
                </div>
                <div style={{
                  height: '4px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '2px',
                  marginTop: '8px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${percent}%`,
                    height: '100%',
                    background: colors[complexity],
                    borderRadius: '2px',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoutingSettingsPanel;
