import React, { useState, useEffect, useCallback } from 'react';

/**
 * Insight type from ZoixIntelligence backend
 */
interface ZoixInsightData {
  id: string;
  type: 'skill_progress' | 'cross_session' | 'optimization' | 'pattern' | 'milestone';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  actions?: {
    label: string;
    action: string;
    data?: unknown;
  }[];
  expiresAt?: Date;
  dismissed?: boolean;
  createdAt: Date;
}

interface ZoixNotificationToastProps {
  insight: ZoixInsightData;
  onDismiss: (id: string) => void;
  onAction?: (action: string, data?: unknown) => void;
  autoHide?: boolean;
  hideDelay?: number;
}

/**
 * Get icon based on insight type
 */
const getInsightIcon = (type: ZoixInsightData['type']): string => {
  switch (type) {
    case 'skill_progress':
      return ''; // Level up / progress
    case 'cross_session':
      return ''; // Connection / link
    case 'optimization':
      return ''; // Lightning bolt / speed
    case 'pattern':
      return ''; // Pattern / grid
    case 'milestone':
      return ''; // Trophy / achievement
    default:
      return ''; // Lightbulb
  }
};

/**
 * Get color based on priority
 */
const getPriorityColor = (priority: ZoixInsightData['priority']): string => {
  switch (priority) {
    case 'high':
      return '#ff6b6b'; // Red
    case 'medium':
      return '#a855f7'; // Purple (ZOIX brand)
    case 'low':
    default:
      return '#6b7280'; // Gray
  }
};

/**
 * Single notification toast for ZOIX insights
 */
const ZoixNotificationToast: React.FC<ZoixNotificationToastProps> = ({
  insight,
  onDismiss,
  onAction,
  autoHide = true,
  hideDelay = 8000,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(insight.id);
    }, 300); // Match animation duration
  }, [insight.id, onDismiss]);

  // Auto-hide after delay
  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(handleDismiss, hideDelay);
      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay, handleDismiss]);

  const priorityColor = getPriorityColor(insight.priority);
  const icon = getInsightIcon(insight.type);

  return (
    <div
      style={{
        backgroundColor: 'rgba(17, 17, 17, 0.95)',
        border: `1px solid ${priorityColor}40`,
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '8px',
        boxShadow: `0 4px 20px ${priorityColor}20, 0 0 0 1px rgba(255, 255, 255, 0.05)`,
        transition: 'all 0.3s ease',
        transform: isExiting ? 'translateX(120%)' : 'translateX(0)',
        opacity: isExiting ? 0 : 1,
        maxWidth: '360px',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Header with icon and title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span
          style={{
            fontSize: '20px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${priorityColor}20`,
            borderRadius: '6px',
          }}
        >
          {icon}
        </span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: '#fff',
              fontWeight: 600,
              fontSize: '13px',
              lineHeight: 1.3,
            }}
          >
            {insight.title}
          </div>
          <div
            style={{
              color: priorityColor,
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginTop: '2px',
            }}
          >
            ZOIX Intelligence
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            padding: '4px',
            fontSize: '14px',
            lineHeight: 1,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
        >
          x
        </button>
      </div>

      {/* Message */}
      <div
        style={{
          color: '#aaa',
          fontSize: '12px',
          lineHeight: 1.5,
          marginBottom: insight.actions?.length ? '10px' : '0',
        }}
      >
        {insight.message}
      </div>

      {/* Actions */}
      {insight.actions && insight.actions.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {insight.actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                onAction?.(action.action, action.data);
                handleDismiss();
              }}
              style={{
                backgroundColor: idx === 0 ? `${priorityColor}30` : 'transparent',
                border: `1px solid ${idx === 0 ? priorityColor : '#444'}`,
                color: idx === 0 ? '#fff' : '#aaa',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${priorityColor}40`;
                e.currentTarget.style.borderColor = priorityColor;
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = idx === 0 ? `${priorityColor}30` : 'transparent';
                e.currentTarget.style.borderColor = idx === 0 ? priorityColor : '#444';
                e.currentTarget.style.color = idx === 0 ? '#fff' : '#aaa';
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Container for multiple ZOIX notification toasts
 * Positioned in the bottom-right corner of the screen
 */
export const ZoixNotificationContainer: React.FC = () => {
  const [insights, setInsights] = useState<ZoixInsightData[]>([]);
  const [isPolling, setIsPolling] = useState(true);

  // Fetch pending insights from backend
  const fetchInsights = useCallback(async () => {
    try {
      const result = await window.flowrider.zoix.getPendingInsights();
      if (result.success && result.data) {
        // Only show non-dismissed insights
        const pending = result.data.filter((i: ZoixInsightData) => !i.dismissed);
        setInsights(pending);
      }
    } catch (error) {
      console.error('[ZoixNotification] Failed to fetch insights:', error);
    }
  }, []);

  // Poll for new insights
  useEffect(() => {
    if (!isPolling) return;

    // Initial fetch
    fetchInsights();

    // Poll every 30 seconds
    const interval = setInterval(fetchInsights, 30000);
    return () => clearInterval(interval);
  }, [isPolling, fetchInsights]);

  // Generate new insights periodically (trigger backend analysis)
  useEffect(() => {
    if (!isPolling) return;

    const generateInsights = async () => {
      try {
        await window.flowrider.zoix.generateInsights();
        // After generating, fetch the new insights
        await fetchInsights();
      } catch (error) {
        console.error('[ZoixNotification] Failed to generate insights:', error);
      }
    };

    // Generate insights every 2 minutes
    const interval = setInterval(generateInsights, 120000);

    // Initial generation after 10 seconds
    const initialTimeout = setTimeout(generateInsights, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [isPolling, fetchInsights]);

  // Dismiss an insight
  const handleDismiss = useCallback(async (id: string) => {
    try {
      await window.flowrider.zoix.dismissInsight(id);
      setInsights((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      console.error('[ZoixNotification] Failed to dismiss insight:', error);
      // Remove from UI anyway
      setInsights((prev) => prev.filter((i) => i.id !== id));
    }
  }, []);

  // Handle insight actions
  const handleAction = useCallback((action: string, data?: unknown) => {
    console.log('[ZoixNotification] Action triggered:', action, data);
    // TODO: Implement action handling (navigate to session, show profile, etc.)
  }, []);

  // Don't render if no insights
  if (insights.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column-reverse', // New notifications appear at bottom
        pointerEvents: 'auto',
      }}
    >
      {insights.slice(0, 3).map((insight) => (
        <ZoixNotificationToast
          key={insight.id}
          insight={insight}
          onDismiss={handleDismiss}
          onAction={handleAction}
        />
      ))}
    </div>
  );
};

export default ZoixNotificationToast;
