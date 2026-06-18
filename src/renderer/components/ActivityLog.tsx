import React, { useState, useEffect } from 'react';
import { useStore } from '../store';

export interface ActivityEntry {
  id: string;
  timestamp: number;
  type: 'session_created' | 'session_attached' | 'session_detached' | 'session_killed' |
        'tokens_used' | 'project_created' | 'leo_enabled' | 'flowrider_added' | 'error';
  sessionId?: string;
  sessionName?: string;
  details: string;
  metadata?: Record<string, any>;
}

// Global activity log (would be persisted in real implementation)
let activityLog: ActivityEntry[] = [];

export const addActivity = (
  type: ActivityEntry['type'],
  details: string,
  sessionId?: string,
  sessionName?: string,
  metadata?: Record<string, any>
) => {
  const entry: ActivityEntry = {
    id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type,
    sessionId,
    sessionName,
    details,
    metadata,
  };
  activityLog = [entry, ...activityLog].slice(0, 500); // Keep last 500 entries
  return entry;
};

export const getActivityLog = () => activityLog;

export const ActivityLog: React.FC = () => {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'sessions' | 'tokens' | 'errors'>('all');

  useEffect(() => {
    // Refresh every second
    const interval = setInterval(() => {
      setActivities([...getActivityLog()]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredActivities = activities.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'sessions') return a.type.includes('session');
    if (filter === 'tokens') return a.type === 'tokens_used';
    if (filter === 'errors') return a.type === 'error';
    return true;
  });

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getTypeIcon = (type: ActivityEntry['type']) => {
    switch (type) {
      case 'session_created': return '➕';
      case 'session_attached': return '🔗';
      case 'session_detached': return '🔓';
      case 'session_killed': return '❌';
      case 'tokens_used': return '🔤';
      case 'project_created': return '📁';
      case 'leo_enabled': return '🌐';
      case 'flowrider_added': return '◇';
      case 'error': return '⚠️';
      default: return '•';
    }
  };

  const getTypeColor = (type: ActivityEntry['type']) => {
    switch (type) {
      case 'session_created': return 'var(--accent-green)';
      case 'session_attached': return 'var(--accent-cyan)';
      case 'session_detached': return 'var(--text-secondary)';
      case 'session_killed': return 'var(--accent-red, #ff5555)';
      case 'tokens_used': return 'var(--accent-yellow)';
      case 'project_created': return 'var(--accent-magenta)';
      case 'leo_enabled': return 'var(--accent-magenta)';
      case 'flowrider_added': return 'var(--accent-cyan)';
      case 'error': return 'var(--accent-red, #ff5555)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="activity-log">
      <div className="activity-header">
        <h3>Activity Log</h3>
        <div className="activity-filters">
          {(['all', 'sessions', 'tokens', 'errors'] as const).map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="activity-stats">
        <span>{activities.length} total events</span>
        <span>•</span>
        <span>{activities.filter(a => a.type === 'error').length} errors</span>
      </div>

      <div className="activity-list">
        {filteredActivities.length === 0 ? (
          <div className="activity-empty">
            No activity recorded yet. Start using Flowrider to see events here.
          </div>
        ) : (
          filteredActivities.slice(0, 100).map(activity => (
            <div key={activity.id} className="activity-item">
              <span className="activity-time">{formatTime(activity.timestamp)}</span>
              <span
                className="activity-icon"
                style={{ color: getTypeColor(activity.type) }}
              >
                {getTypeIcon(activity.type)}
              </span>
              <span className="activity-details">
                {activity.sessionName && (
                  <span className="activity-session">[{activity.sessionName}]</span>
                )}
                {activity.details}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="activity-footer">
        <span>Audit trail for compliance & debugging</span>
      </div>
    </div>
  );
};
