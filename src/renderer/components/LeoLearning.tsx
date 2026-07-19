import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';

// Types for LEO Learning system
interface Pattern {
  id: string;
  type: 'error' | 'code' | 'workflow' | 'prompt';
  name: string;
  description: string;
  frequency: number;
  confidence: number;
  lastSeen: number;
  examples: string[];
}

interface Interaction {
  id: string;
  sessionId: string;
  timestamp: number;
  prompt: string;
  response: string;
  outcome: 'accepted' | 'modified' | 'rejected';
  feedback?: 'positive' | 'negative';
  metrics?: {
    testsPassed?: boolean;
    buildSucceeded?: boolean;
    revertedWithin24h?: boolean;
  };
}

interface LearningStats {
  totalInteractions: number;
  positiveOutcomes: number;
  negativeOutcomes: number;
  patternsDetected: number;
  avgConfidence: number;
  costSaved: number;
  energySaved: number;
}

interface LeoLearningProps {
  compact?: boolean;
}

export const LeoLearning: React.FC<LeoLearningProps> = ({ compact = false }) => {
  const { sessions, costMetrics, energyMetrics } = useStore();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [selectedPatternType, setSelectedPatternType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [trainingStatus, setTrainingStatus] = useState<'idle' | 'training' | 'complete'>('idle');

  // Fetch learning data
  useEffect(() => {
    const fetchLearningData = async () => {
      setIsLoading(true);
      try {
        // Mock data for now - would integrate with actual LEO Learning backend
        const mockPatterns: Pattern[] = [
          {
            id: 'p1',
            type: 'error',
            name: 'TypeScript null check',
            description: 'Common pattern: Add null check before accessing optional properties',
            frequency: 47,
            confidence: 0.92,
            lastSeen: Date.now() - 3600000,
            examples: ['obj?.property', 'if (obj !== null)', 'obj ?? default'],
          },
          {
            id: 'p2',
            type: 'code',
            name: 'React useEffect cleanup',
            description: 'Pattern: Return cleanup function in useEffect for subscriptions',
            frequency: 31,
            confidence: 0.88,
            lastSeen: Date.now() - 7200000,
            examples: ['return () => subscription.unsubscribe()', 'return () => clearInterval(id)'],
          },
          {
            id: 'p3',
            type: 'workflow',
            name: 'Test before commit',
            description: 'Successful workflow: Run tests before git commits',
            frequency: 89,
            confidence: 0.95,
            lastSeen: Date.now() - 1800000,
            examples: ['npm test && git commit', 'Pre-commit hook'],
          },
          {
            id: 'p4',
            type: 'prompt',
            name: 'Context-first prompts',
            description: 'Effective prompt pattern: Provide context before asking questions',
            frequency: 156,
            confidence: 0.91,
            lastSeen: Date.now() - 900000,
            examples: ['Given this error...', 'In the context of...', 'When working with...'],
          },
          {
            id: 'p5',
            type: 'error',
            name: 'Async/await error handling',
            description: 'Pattern: Wrap async operations in try-catch blocks',
            frequency: 23,
            confidence: 0.85,
            lastSeen: Date.now() - 5400000,
            examples: ['try { await fetch() } catch (e) {}', 'async function with try-catch'],
          },
        ];

        const mockStats: LearningStats = {
          totalInteractions: 1247,
          positiveOutcomes: 987,
          negativeOutcomes: 260,
          patternsDetected: mockPatterns.length,
          avgConfidence: mockPatterns.reduce((sum, p) => sum + p.confidence, 0) / mockPatterns.length,
          costSaved: (costMetrics.totalCost * 0.3), // Estimated 30% savings from learning
          energySaved: energyMetrics.energySaved,
        };

        setPatterns(mockPatterns);
        setStats(mockStats);
      } catch (err) {
        console.error('[LeoLearning] Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLearningData();
  }, [costMetrics.totalCost, energyMetrics.energySaved]);

  // Simulate pattern training
  const startTraining = useCallback(async () => {
    setTrainingStatus('training');
    // Simulate training delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    setTrainingStatus('complete');
    setTimeout(() => setTrainingStatus('idle'), 2000);
  }, []);

  // Filter patterns by type
  const filteredPatterns = selectedPatternType === 'all'
    ? patterns
    : patterns.filter(p => p.type === selectedPatternType);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'error': return '🔴';
      case 'code': return '💻';
      case 'workflow': return '🔄';
      case 'prompt': return '💬';
      default: return '📊';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#4caf50';
    if (confidence >= 0.7) return '#ff9800';
    return '#f44336';
  };

  if (compact) {
    return (
      <div style={{
        padding: 12,
        background: 'rgba(0, 255, 255, 0.03)',
        border: '1px solid rgba(0, 255, 255, 0.1)',
        borderRadius: 6,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>🧠</span>
            <span style={{
              fontSize: 12,
              color: '#00ffff',
              fontWeight: 600,
            }}>
              LEO Learning
            </span>
          </div>
          <span style={{
            fontSize: 10,
            color: '#4caf50',
            padding: '2px 6px',
            background: 'rgba(76, 175, 80, 0.2)',
            borderRadius: 3,
          }}>
            Active
          </span>
        </div>

        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            fontSize: 10,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#00ffff', fontSize: 14, fontWeight: 600 }}>
                {stats.patternsDetected}
              </div>
              <div style={{ color: '#666' }}>Patterns</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#4caf50', fontSize: 14, fontWeight: 600 }}>
                {(stats.avgConfidence * 100).toFixed(0)}%
              </div>
              <div style={{ color: '#666' }}>Confidence</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#ff9800', fontSize: 14, fontWeight: 600 }}>
                ${stats.costSaved.toFixed(2)}
              </div>
              <div style={{ color: '#666' }}>Saved</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <h2 style={{
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span>🧠</span>
            LEO Learning
          </h2>
          <p style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
            Self-improving AI that learns from your coding patterns
          </p>
        </div>
        <button
          onClick={startTraining}
          disabled={trainingStatus !== 'idle'}
          style={{
            padding: '8px 16px',
            background: trainingStatus === 'complete'
              ? 'rgba(76, 175, 80, 0.2)'
              : trainingStatus === 'training'
              ? 'rgba(255, 152, 0, 0.2)'
              : 'rgba(0, 255, 255, 0.1)',
            border: `1px solid ${
              trainingStatus === 'complete'
                ? '#4caf50'
                : trainingStatus === 'training'
                ? '#ff9800'
                : '#00ffff'
            }`,
            borderRadius: 6,
            color: trainingStatus === 'complete'
              ? '#4caf50'
              : trainingStatus === 'training'
              ? '#ff9800'
              : '#00ffff',
            cursor: trainingStatus === 'idle' ? 'pointer' : 'default',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {trainingStatus === 'training' ? 'Training...' :
           trainingStatus === 'complete' ? 'Complete!' : 'Train Now'}
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}>
          <div style={{
            padding: 16,
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ color: '#00ffff', fontSize: 24, fontWeight: 600 }}>
              {stats.totalInteractions.toLocaleString()}
            </div>
            <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
              Total Interactions
            </div>
          </div>
          <div style={{
            padding: 16,
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ color: '#4caf50', fontSize: 24, fontWeight: 600 }}>
              {((stats.positiveOutcomes / stats.totalInteractions) * 100).toFixed(1)}%
            </div>
            <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
              Success Rate
            </div>
          </div>
          <div style={{
            padding: 16,
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ color: '#ff9800', fontSize: 24, fontWeight: 600 }}>
              ${stats.costSaved.toFixed(2)}
            </div>
            <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
              Estimated Savings
            </div>
          </div>
          <div style={{
            padding: 16,
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ color: '#9b59b6', fontSize: 24, fontWeight: 600 }}>
              {stats.energySaved.toFixed(1)} Wh
            </div>
            <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
              Energy Saved
            </div>
          </div>
        </div>
      )}

      {/* Pattern Type Filter */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
      }}>
        {['all', 'error', 'code', 'workflow', 'prompt'].map(type => (
          <button
            key={type}
            onClick={() => setSelectedPatternType(type)}
            style={{
              padding: '6px 12px',
              background: selectedPatternType === type
                ? 'rgba(0, 255, 255, 0.15)'
                : 'var(--bg-tertiary)',
              border: `1px solid ${selectedPatternType === type ? '#00ffff' : 'var(--border-color)'}`,
              borderRadius: 4,
              color: selectedPatternType === type ? '#00ffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 11,
              textTransform: 'capitalize',
            }}
          >
            {type === 'all' ? 'All Patterns' : `${getPatternIcon(type)} ${type}`}
          </button>
        ))}
      </div>

      {/* Patterns List */}
      <div style={{
        background: 'var(--bg-tertiary)',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
          fontSize: 12,
          fontWeight: 600,
          color: '#00ffff',
        }}>
          Detected Patterns ({filteredPatterns.length})
        </div>

        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
            Loading patterns...
          </div>
        ) : filteredPatterns.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
            No patterns detected yet. Keep coding!
          </div>
        ) : (
          <div>
            {filteredPatterns.map(pattern => (
              <div
                key={pattern.id}
                style={{
                  padding: 16,
                  borderBottom: '1px solid var(--border-color)',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{getPatternIcon(pattern.type)}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {pattern.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                        {pattern.description}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                    }}>
                      <span style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        background: `${getConfidenceColor(pattern.confidence)}20`,
                        color: getConfidenceColor(pattern.confidence),
                        borderRadius: 3,
                      }}>
                        {(pattern.confidence * 100).toFixed(0)}% confident
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: '#666' }}>
                      {pattern.frequency}x seen • {formatTime(pattern.lastSeen)}
                    </div>
                  </div>
                </div>

                {/* Examples */}
                <div style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  marginTop: 8,
                }}>
                  {pattern.examples.slice(0, 3).map((example, i) => (
                    <code
                      key={i}
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: 3,
                        color: '#888',
                        fontFamily: 'monospace',
                      }}
                    >
                      {example}
                    </code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Training Info */}
      <div style={{
        marginTop: 16,
        padding: 16,
        background: 'rgba(0, 255, 255, 0.03)',
        border: '1px solid rgba(0, 255, 255, 0.1)',
        borderRadius: 8,
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#00ffff',
          marginBottom: 8,
        }}>
          How LEO Learning Works
        </div>
        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>1. Pattern Detection</strong> — LEO analyzes your coding sessions to identify recurring patterns
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>2. Feedback Loop</strong> — Your accepts/rejects train LEO to understand what works for you
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>3. Cost Optimization</strong> — Uses free local models for patterns it recognizes, cloud for novel problems
          </p>
          <p style={{ margin: 0 }}>
            <strong>4. Custom Training</strong> — Build your own AI that knows YOUR codebase (Enterprise feature)
          </p>
        </div>
      </div>
    </div>
  );
};

export default LeoLearning;
