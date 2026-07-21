import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import type {
  Interest,
  KnowledgeNode,
  SkillLevel,
  LearningGoal,
  ContextItem,
  RecommendedResource,
  UserProfile,
} from '../store';

/**
 * ZoixProfilePanel - Personal ontology, knowledge graph, and recommendations
 *
 * Displays:
 * 1. Header - Knowledge score, total concepts, active domains, learning velocity
 * 2. Knowledge Map - Interactive tree/graph with bubble chart
 * 3. Top Interests - List with trending indicators
 * 4. Skill Progression - Bar charts and skill level badges
 * 5. Learning Goals - Active goals with progress bars
 * 6. Resource Recommendations - Personalized suggestions
 * 7. Ontology Stats - Footer with growth metrics
 */

// ============================================
// MAIN COMPONENT
// ============================================

export const ZoixProfilePanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { userProfile, syncUserProfile } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<
    'interests' | 'knowledge' | 'skills' | 'goals' | 'resources'
  >('interests');

  // Export knowledge map handler
  const handleExportKnowledgeMap = () => {
    if (!userProfile) return;

    const exportData = {
      exportedAt: new Date().toISOString(),
      stats: profile.stats,
      interests: profile.interests,
      knowledgeGraph: profile.knowledgeGraph,
      skillProgress: profile.skillProgress,
      learningGoals: profile.learningGoals,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zoix-knowledge-map-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Fetch user profile when panel opens
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          await syncUserProfile();
        } catch (err) {
          setError('Failed to load profile data');
          console.error('[ZoixProfilePanel] Failed to fetch data:', err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();

      // Refresh every 30 seconds while panel is open
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, syncUserProfile]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const profile = userProfile || getDefaultProfile();
  const stats = profile.stats || {
    knowledgeScore: 0,
    totalConcepts: 0,
    activeDomains: 0,
    learningVelocity: 0,
    growthThisMonth: 0,
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 480,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)',
        boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15), rgba(59, 130, 246, 0.15))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🎯</span>
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#a855f7',
                  letterSpacing: '1px',
                }}
              >
                ZOIX PROFILE
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Your Personal Ontology
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close profile panel"
          >
            ×
          </button>
        </div>

        {/* Knowledge Stats Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginTop: 12,
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 8,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: getScoreColor(stats.knowledgeScore),
              }}
            >
              {stats.knowledgeScore}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Score
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#a855f7' }}>
              {stats.totalConcepts}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Concepts
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>
              {stats.activeDomains}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Domains
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>
              +{stats.learningVelocity}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Per Week
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 12,
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'interests', label: 'Interests', icon: '⭐' },
            { id: 'knowledge', label: 'Map', icon: '🗺️' },
            { id: 'skills', label: 'Skills', icon: '📈' },
            { id: 'goals', label: 'Goals', icon: '🎯' },
            { id: 'resources', label: 'Learn', icon: '📚' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSection(tab.id as any)}
              style={{
                padding: '6px 12px',
                background: selectedSection === tab.id ? 'rgba(147, 51, 234, 0.2)' : 'transparent',
                border: selectedSection === tab.id ? '1px solid #a855f7' : '1px solid transparent',
                borderRadius: 6,
                color: selectedSection === tab.id ? '#a855f7' : 'var(--text-secondary)',
                fontSize: 11,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
              aria-pressed={selectedSection === tab.id}
            >
              <span style={{ marginRight: 4 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {error && (
          <div
            style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: '#ef4444',
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {isLoading && (
          <div>
            {/* Loading Skeleton */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  marginBottom: 12,
                  padding: 12,
                  background: 'var(--bg-tertiary)',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                }}
              >
                <div
                  style={{
                    height: 14,
                    width: '70%',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    borderRadius: 4,
                    marginBottom: 8,
                  }}
                />
                <div
                  style={{
                    height: 10,
                    width: '90%',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    borderRadius: 4,
                    marginBottom: 6,
                  }}
                />
                <div
                  style={{
                    height: 6,
                    width: '50%',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    borderRadius: 4,
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {!isLoading && selectedSection === 'interests' && (
          <InterestsSection interests={profile.interests} />
        )}

        {!isLoading && selectedSection === 'knowledge' && (
          <KnowledgeMapSection nodes={profile.knowledgeGraph} />
        )}

        {!isLoading && selectedSection === 'skills' && (
          <SkillProgressSection skills={profile.skillProgress} />
        )}

        {!isLoading && selectedSection === 'goals' && (
          <LearningGoalsSection goals={profile.learningGoals || []} context={profile.context} />
        )}

        {!isLoading && selectedSection === 'resources' && (
          <ResourcesSection resources={profile.recommendedResources} />
        )}
      </div>

      {/* Footer - Ontology Stats */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-color)',
          background: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, textAlign: 'center' }}>
          You know <strong style={{ color: '#a855f7' }}>{stats.totalConcepts}</strong> concepts across{' '}
          <strong style={{ color: '#3b82f6' }}>{stats.activeDomains}</strong> domains
        </div>
        {stats.growthThisMonth > 0 && (
          <div style={{ fontSize: 11, color: '#22c55e', marginBottom: 8, textAlign: 'center' }}>
            Your knowledge grew <strong>{stats.growthThisMonth}%</strong> this month
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          <button
            onClick={handleExportKnowledgeMap}
            style={{
              padding: '6px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              color: 'var(--text-secondary)',
              fontSize: 10,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(147, 51, 234, 0.2)';
              e.currentTarget.style.borderColor = '#a855f7';
              e.currentTarget.style.color = '#a855f7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            Export Knowledge Map
          </button>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Updated: {formatTime(profile.lastUpdated)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SECTION: YOUR INTERESTS
// ============================================

const InterestsSection: React.FC<{ interests: Interest[] }> = ({ interests }) => {
  if (interests.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
        No interests detected yet. Start coding to build your profile!
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#a855f7', marginBottom: 16 }}>
        Top Topics You Work On
      </h3>

      {interests.slice(0, 10).map((interest, idx) => (
        <div
          key={interest.topic}
          style={{
            marginBottom: 12,
            padding: 12,
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#666' }}>#{idx + 1}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {interest.topic}
              </span>
            </div>
            <TrajectoryBadge trajectory={interest.trajectory} />
          </div>

          {/* Weight bar */}
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                height: 8,
                background: 'var(--bg-primary)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${interest.weight * 100}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${getTrajectoryColor(interest.trajectory)}, ${getTrajectoryColor(interest.trajectory)}88)`,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)', alignItems: 'center' }}>
            <span>{interest.sessions} sessions</span>
            <span>Last: {formatTime(interest.lastWorkedOn)}</span>
            <TrendArrow trend={interest.trend || 'stable'} />
          </div>
        </div>
      ))}
    </div>
  );
};

const TrajectoryBadge: React.FC<{ trajectory: Interest['trajectory'] }> = ({ trajectory }) => {
  const configs: Record<Interest['trajectory'], { label: string; icon: string; color: string }> = {
    new: { label: 'New', icon: '✨', color: '#3b82f6' },
    learning: { label: 'Learning', icon: '📚', color: '#f59e0b' },
    established: { label: 'Established', icon: '⚡', color: '#22c55e' },
    expert: { label: 'Expert', icon: '🏆', color: '#a855f7' },
  };

  const config = configs[trajectory];

  return (
    <span
      style={{
        padding: '4px 8px',
        borderRadius: 4,
        background: `${config.color}22`,
        color: config.color,
        fontSize: 10,
        fontWeight: 600,
      }}
    >
      {config.icon} {config.label}
    </span>
  );
};

const TrendArrow: React.FC<{ trend: Interest['trend'] }> = ({ trend }) => {
  if (!trend) return null;

  const configs: Record<NonNullable<Interest['trend']>, { icon: string; color: string; label: string }> = {
    growing: { icon: '↑', color: '#22c55e', label: 'Growing' },
    stable: { icon: '→', color: '#3b82f6', label: 'Stable' },
    declining: { icon: '↓', color: '#ef4444', label: 'Declining' },
  };

  const config = configs[trend];

  return (
    <span
      style={{ color: config.color, fontSize: 12, fontWeight: 700 }}
      title={config.label}
      aria-label={config.label}
    >
      {config.icon}
    </span>
  );
};

const getTrajectoryColor = (trajectory: Interest['trajectory']): string => {
  const colors: Record<Interest['trajectory'], string> = {
    new: '#3b82f6',
    learning: '#f59e0b',
    established: '#22c55e',
    expert: '#a855f7',
  };
  return colors[trajectory];
};

// ============================================
// SECTION: KNOWLEDGE MAP
// ============================================

const KnowledgeMapSection: React.FC<{ nodes: KnowledgeNode[] }> = ({ nodes }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  if (nodes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
        No knowledge graph built yet. Continue working to map your expertise!
      </div>
    );
  }

  // Group by cluster
  const clusters = nodes.reduce((acc, node) => {
    if (!acc[node.cluster]) acc[node.cluster] = [];
    acc[node.cluster].push(node);
    return acc;
  }, {} as Record<string, KnowledgeNode[]>);

  const selected = nodes.find(n => n.id === selectedNode);

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#a855f7', marginBottom: 16 }}>
        Connected Concepts
      </h3>

      {Object.entries(clusters).map(([cluster, clusterNodes]) => (
        <div key={cluster} style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#3b82f6',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 8,
            }}
          >
            {cluster}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {clusterNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                style={{
                  padding: '8px 12px',
                  background: node.isGap
                    ? 'rgba(239, 68, 68, 0.1)'
                    : selectedNode === node.id
                    ? 'rgba(147, 51, 234, 0.2)'
                    : 'var(--bg-tertiary)',
                  border: node.isGap
                    ? '1px dashed #ef4444'
                    : selectedNode === node.id
                    ? '1px solid #a855f7'
                    : '1px solid var(--border-color)',
                  borderRadius: 6,
                  color: node.isGap ? '#ef4444' : 'var(--text-primary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {node.isGap && '⚠️ '}
                {node.concept}
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
                  {Math.round(node.confidence * 100)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {selected && (
        <div
          style={{
            marginTop: 20,
            padding: 12,
            background: 'rgba(147, 51, 234, 0.1)',
            border: '1px solid #a855f7',
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#a855f7', marginBottom: 8 }}>
            {selected.concept}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Confidence: {Math.round(selected.confidence * 100)}% • Cluster: {selected.cluster}
          </div>
          {selected.connections.length > 0 && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Connected to: {selected.connections.map(id => nodes.find(n => n.id === id)?.concept || id).join(', ')}
            </div>
          )}
          {selected.isGap && (
            <div style={{ fontSize: 10, color: '#ef4444', marginTop: 8 }}>
              ⚠️ Knowledge gap - consider learning more about this area
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// SECTION: SKILL PROGRESS
// ============================================

const SkillProgressSection: React.FC<{ skills: SkillLevel[] }> = ({ skills }) => {
  if (skills.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
        No skill data tracked yet. Keep coding to build your skill profile!
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#a855f7', marginBottom: 16 }}>
        Technology Proficiency
      </h3>

      {skills.map((skill) => (
        <div
          key={skill.technology}
          style={{
            marginBottom: 16,
            padding: 12,
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {skill.technology}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Last activity: {formatTime(skill.lastActivity)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <SkillLevelBadge level={skill.level} />
              <TrendIndicator trend={skill.trend} />
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                height: 8,
                background: 'var(--bg-primary)',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${(skill.progress || 0) * 100}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${getSkillLevelColor(skill.level)}, ${getSkillLevelColor(skill.level)}88)`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              {Math.round((skill.progress || 0) * 100)}% mastery
            </div>
          </div>

          {skill.milestones.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                Recent milestones:
              </div>
              {skill.milestones.slice(0, 3).map((milestone, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    padding: '4px 8px',
                    background: 'var(--bg-primary)',
                    borderRadius: 4,
                    marginBottom: 4,
                  }}
                >
                  ✓ {milestone}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const SkillLevelBadge: React.FC<{ level: SkillLevel['level'] }> = ({ level }) => {
  const config = {
    novice: { label: 'Novice', color: '#3b82f6', stars: 1 },
    intermediate: { label: 'Intermediate', color: '#f59e0b', stars: 2 },
    proficient: { label: 'Proficient', color: '#22c55e', stars: 3 },
    expert: { label: 'Expert', color: '#a855f7', stars: 4 },
  }[level];

  return (
    <span
      style={{
        padding: '4px 8px',
        borderRadius: 4,
        background: `${config.color}22`,
        color: config.color,
        fontSize: 10,
        fontWeight: 600,
      }}
    >
      {'⭐'.repeat(config.stars)} {config.label}
    </span>
  );
};

const getSkillLevelColor = (level: SkillLevel['level']) => {
  return {
    novice: '#3b82f6',
    intermediate: '#f59e0b',
    proficient: '#22c55e',
    expert: '#a855f7',
  }[level];
};

const TrendIndicator: React.FC<{ trend: SkillLevel['trend'] }> = ({ trend }) => {
  const config = {
    improving: { icon: '📈', color: '#22c55e', label: 'Improving' },
    stable: { icon: '➡️', color: '#3b82f6', label: 'Stable' },
    'needs-work': { icon: '⚠️', color: '#ef4444', label: 'Needs work' },
  }[trend];

  return (
    <span style={{ fontSize: 14 }} title={config.label}>
      {config.icon}
    </span>
  );
};

// ============================================
// SECTION: LEARNING GOALS
// ============================================

const LearningGoalsSection: React.FC<{ goals: LearningGoal[]; context: ContextItem[] }> = ({ goals }) => {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');

  const explicitGoals = goals.filter(g => g.type === 'explicit');
  const inferredGoals = goals.filter(g => g.type === 'inferred');

  const handleAddGoal = () => {
    if (!newGoalText.trim()) return;

    // TODO: Call IPC to save goal
    console.log('[ZoixProfilePanel] Adding goal:', newGoalText);
    setNewGoalText('');
    setShowAddGoal(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#a855f7' }}>
          Learning Goals
        </h3>
        <button
          onClick={() => setShowAddGoal(!showAddGoal)}
          style={{
            padding: '6px 12px',
            background: showAddGoal ? 'rgba(147, 51, 234, 0.2)' : 'var(--bg-tertiary)',
            border: '1px solid',
            borderColor: showAddGoal ? '#a855f7' : 'var(--border-color)',
            borderRadius: 6,
            color: showAddGoal ? '#a855f7' : 'var(--text-secondary)',
            fontSize: 11,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          + Add Goal
        </button>
      </div>

      {/* Add Goal Form */}
      {showAddGoal && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: 'rgba(147, 51, 234, 0.1)',
            border: '1px solid #a855f7',
            borderRadius: 8,
          }}
        >
          <input
            type="text"
            value={newGoalText}
            onChange={(e) => setNewGoalText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
            placeholder="What do you want to learn?"
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 12,
              marginBottom: 8,
            }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowAddGoal(false)}
              style={{
                padding: '6px 12px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                color: 'var(--text-secondary)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddGoal}
              style={{
                padding: '6px 12px',
                background: '#a855f7',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Add Goal
            </button>
          </div>
        </div>
      )}

      {/* Active Goals */}
      {explicitGoals.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#22c55e', marginBottom: 8, textTransform: 'uppercase' }}>
            Active Goals
          </div>
          {explicitGoals.map((goal) => (
            <div
              key={goal.id}
              style={{
                padding: 12,
                background: 'var(--bg-tertiary)',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 8 }}>
                {goal.description}
              </div>
              <div style={{ marginBottom: 6 }}>
                <div
                  style={{
                    height: 6,
                    background: 'var(--bg-primary)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${goal.progress * 100}%`,
                      height: '100%',
                      background: goal.progress >= 0.9
                        ? 'linear-gradient(90deg, #22c55e, #10b981)'
                        : goal.progress >= 0.5
                        ? 'linear-gradient(90deg, #f59e0b, #fb923c)'
                        : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {Math.round(goal.progress * 100)}% complete
                {goal.targetDate && ` • Target: ${new Date(goal.targetDate).toLocaleDateString()}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inferred Goals */}
      {inferredGoals.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 8, textTransform: 'uppercase' }}>
            Inferred Goals
          </div>
          {inferredGoals.map((goal) => (
            <div
              key={goal.id}
              style={{
                padding: 12,
                background: 'rgba(59, 130, 246, 0.05)',
                borderRadius: 8,
                border: '1px dashed rgba(59, 130, 246, 0.3)',
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 4 }}>
                {goal.description}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)' }}>
                <span>Confidence: {Math.round((goal.confidence || 0) * 100)}%</span>
                <span>Progress: {Math.round(goal.progress * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {goals.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          No learning goals yet. Add an explicit goal or let ZOIX infer them from your work!
        </div>
      )}
    </div>
  );
};

// ============================================
// SECTION: CONTEXT (Currently unused, kept for future use)
// ============================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ContextSection: React.FC<{ context: ContextItem[] }> = ({ context }) => {
  if (context.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
        No recent context available. Start a session to build context!
      </div>
    );
  }

  const lastWork = context.filter(c => c.type === 'last-work');
  const unfinished = context.filter(c => c.type === 'unfinished');
  const goals = context.filter(c => c.type === 'goal');

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#a855f7', marginBottom: 16 }}>
        What You Were Working On
      </h3>

      {lastWork.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 8 }}>
            LAST SESSION
          </div>
          {lastWork.map((item, idx) => (
            <ContextCard key={idx} item={item} />
          ))}
        </div>
      )}

      {unfinished.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>
            UNFINISHED TASKS
          </div>
          {unfinished.map((item, idx) => (
            <ContextCard key={idx} item={item} />
          ))}
        </div>
      )}

      {goals.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#22c55e', marginBottom: 8 }}>
            INFERRED GOALS
          </div>
          {goals.map((item, idx) => (
            <ContextCard key={idx} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

const ContextCard: React.FC<{ item: ContextItem }> = ({ item }) => (
  <div
    style={{
      padding: 12,
      background: 'var(--bg-tertiary)',
      borderRadius: 8,
      border: '1px solid var(--border-color)',
      marginBottom: 8,
    }}
  >
    <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 6 }}>
      {item.description}
    </div>

    {item.progress > 0 && (
      <div style={{ marginBottom: 6 }}>
        <div
          style={{
            height: 4,
            background: 'var(--bg-primary)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${item.progress * 100}%`,
              height: '100%',
              background: item.progress >= 0.9 ? '#22c55e' : item.progress >= 0.5 ? '#f59e0b' : '#3b82f6',
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          {Math.round(item.progress * 100)}% complete
        </div>
      </div>
    )}

    <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)' }}>
      {item.sessionId && <span>Session {item.sessionId}</span>}
      <span>{formatTime(item.timestamp)}</span>
    </div>
  </div>
);

// ============================================
// SECTION: RECOMMENDED RESOURCES
// ============================================

const ResourcesSection: React.FC<{ resources: RecommendedResource[] }> = ({ resources }) => {
  const [savedResources, setSavedResources] = useState<Set<number>>(new Set());
  const [completedResources, setCompletedResources] = useState<Set<number>>(new Set());

  if (resources.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
        No recommendations yet. ZOIX will suggest resources as you work!
      </div>
    );
  }

  const handleSave = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = new Set(savedResources);
    if (newSaved.has(idx)) {
      newSaved.delete(idx);
    } else {
      newSaved.add(idx);
    }
    setSavedResources(newSaved);
    // TODO: Call IPC to save
    console.log('[ZoixProfilePanel] Toggle save resource:', idx);
  };

  const handleComplete = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCompleted = new Set(completedResources);
    if (newCompleted.has(idx)) {
      newCompleted.delete(idx);
    } else {
      newCompleted.add(idx);
    }
    setCompletedResources(newCompleted);
    // TODO: Call IPC to mark complete
    console.log('[ZoixProfilePanel] Toggle complete resource:', idx);
  };

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#a855f7', marginBottom: 8 }}>
        Recommended for You
      </h3>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
        Based on your interests, you might like...
      </p>

      {resources.map((resource, idx) => (
        <div
          key={idx}
          style={{
            marginBottom: 12,
            padding: 12,
            background: completedResources.has(idx)
              ? 'rgba(34, 197, 94, 0.05)'
              : 'var(--bg-tertiary)',
            borderRadius: 8,
            border: completedResources.has(idx)
              ? '1px solid rgba(34, 197, 94, 0.3)'
              : '1px solid var(--border-color)',
            cursor: resource.url ? 'pointer' : 'default',
            opacity: completedResources.has(idx) ? 0.7 : 1,
          }}
          onClick={() => {
            if (resource.url && !completedResources.has(idx)) {
              window.open(resource.url, '_blank');
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <ResourceIcon type={resource.type} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: completedResources.has(idx) ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: completedResources.has(idx) ? 'line-through' : 'none',
                  }}
                >
                  {resource.title}
                </span>
                {completedResources.has(idx) && (
                  <span style={{ fontSize: 12, color: '#22c55e' }}>✓</span>
                )}
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
                {resource.description}
              </div>

              <div style={{ fontSize: 10, color: '#3b82f6', marginBottom: 4 }}>
                Why: {resource.reason}
              </div>

              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
                Relevance: {Math.round(resource.relevance * 100)}%
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={(e) => handleSave(idx, e)}
                  style={{
                    padding: '4px 10px',
                    background: savedResources.has(idx) ? 'rgba(168, 85, 247, 0.2)' : 'var(--bg-primary)',
                    border: '1px solid',
                    borderColor: savedResources.has(idx) ? '#a855f7' : 'var(--border-color)',
                    borderRadius: 4,
                    color: savedResources.has(idx) ? '#a855f7' : 'var(--text-secondary)',
                    fontSize: 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {savedResources.has(idx) ? '★ Saved' : '☆ Save'}
                </button>
                <button
                  onClick={(e) => handleComplete(idx, e)}
                  style={{
                    padding: '4px 10px',
                    background: completedResources.has(idx) ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg-primary)',
                    border: '1px solid',
                    borderColor: completedResources.has(idx) ? '#22c55e' : 'var(--border-color)',
                    borderRadius: 4,
                    color: completedResources.has(idx) ? '#22c55e' : 'var(--text-secondary)',
                    fontSize: 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {completedResources.has(idx) ? '✓ Completed' : 'Mark Complete'}
                </button>
              </div>
            </div>

            {resource.url && (
              <span style={{ fontSize: 12, color: '#3b82f6', marginLeft: 8 }}>↗</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const ResourceIcon: React.FC<{ type: RecommendedResource['type'] }> = ({ type }) => {
  const icons = {
    book: '📖',
    documentation: '📘',
    tutorial: '🎓',
    course: '🎯',
  };
  return <span style={{ fontSize: 16 }}>{icons[type]}</span>;
};

// ============================================
// HELPERS
// ============================================

const formatTime = (date: Date) => {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
};

const getDefaultProfile = (): UserProfile => ({
  interests: [],
  knowledgeGraph: [],
  skillProgress: [],
  context: [],
  recommendedResources: [],
  learningGoals: [],
  lastUpdated: new Date(),
  stats: {
    knowledgeScore: 0,
    totalConcepts: 0,
    activeDomains: 0,
    learningVelocity: 0,
    growthThisMonth: 0,
  },
});

const getScoreColor = (score: number): string => {
  if (score >= 90) return '#a855f7'; // Expert - Purple
  if (score >= 75) return '#22c55e'; // Proficient - Green
  if (score >= 50) return '#f59e0b'; // Intermediate - Orange
  if (score >= 25) return '#3b82f6'; // Novice - Blue
  return '#6b7280'; // Beginner - Gray
};

export default ZoixProfilePanel;
