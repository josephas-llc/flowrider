import React, { useState, useEffect, useCallback } from 'react';
import { useSuggestions, Suggestion, SuggestionType, SuggestionPriority } from '../hooks/useSuggestions';

interface SuggestionPanelProps {
  sessionId?: string;
  projectId?: string;
  workingDir?: string;
  language?: string;
  onApplyProvider?: (provider: string) => void;
  onApplyTemplate?: (templateId: string) => void;
  onCopyCode?: (code: string) => void;
  compact?: boolean;
  maxSuggestions?: number;
}

// Icons for different suggestion types
const typeIcons: Record<SuggestionType, string> = {
  ai_provider: '\u{1F916}',      // Robot
  template: '\u{1F4CB}',         // Clipboard
  error_prevention: '\u{26A0}',  // Warning
  workflow: '\u{27A1}',          // Arrow
  productivity: '\u{23F1}',      // Stopwatch
  cross_session: '\u{1F517}',    // Link
  code_pattern: '\u{1F4BB}',     // Computer
  project_context: '\u{1F4C1}',  // Folder
  learning: '\u{1F4A1}',         // Light bulb
  quick_action: '\u{26A1}',      // Lightning
};

// Priority colors
const priorityColors: Record<SuggestionPriority, string> = {
  critical: '#ff4444',
  high: '#ff9800',
  medium: '#00bcd4',
  low: '#9e9e9e',
};

// Type labels
const typeLabels: Record<SuggestionType, string> = {
  ai_provider: 'AI Provider',
  template: 'Template',
  error_prevention: 'Error Prevention',
  workflow: 'Workflow',
  productivity: 'Productivity',
  cross_session: 'Cross-Session',
  code_pattern: 'Code Pattern',
  project_context: 'Project',
  learning: 'Learning',
  quick_action: 'Quick Action',
};

export const SuggestionPanel: React.FC<SuggestionPanelProps> = ({
  sessionId,
  projectId,
  workingDir,
  language,
  onApplyProvider,
  onApplyTemplate,
  onCopyCode,
  compact = false,
  maxSuggestions = 5,
}) => {
  const {
    suggestions,
    loading,
    error,
    fetchSuggestions,
    dismissSuggestion,
    recordAction,
  } = useSuggestions({
    sessionId,
    projectId,
    workingDir,
    language,
    limit: maxSuggestions + 3, // Fetch a few extra in case some are dismissed
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Re-fetch when context changes
  useEffect(() => {
    fetchSuggestions({
      sessionId,
      projectId,
      workingDir,
      language,
      limit: maxSuggestions + 3,
    });
  }, [sessionId, projectId, workingDir, language, fetchSuggestions, maxSuggestions]);

  // Filter out locally dismissed suggestions
  const visibleSuggestions = suggestions
    .filter(s => !dismissedIds.has(s.id))
    .slice(0, maxSuggestions);

  // Handle action click
  const handleAction = useCallback(async (suggestion: Suggestion) => {
    if (!suggestion.action) return;

    await recordAction(suggestion.id, true);

    switch (suggestion.action.type) {
      case 'apply_provider':
        if (onApplyProvider && suggestion.action.payload) {
          onApplyProvider(suggestion.action.payload as string);
        }
        break;
      case 'apply_template':
        if (onApplyTemplate && suggestion.action.payload) {
          onApplyTemplate(suggestion.action.payload as string);
        }
        break;
      case 'copy_code':
        if (onCopyCode && suggestion.action.payload) {
          onCopyCode(suggestion.action.payload as string);
        } else if (suggestion.action.payload) {
          navigator.clipboard.writeText(suggestion.action.payload as string);
        }
        break;
      case 'dismiss':
        handleDismiss(suggestion.id);
        break;
    }
  }, [onApplyProvider, onApplyTemplate, onCopyCode, recordAction]);

  // Handle dismiss
  const handleDismiss = useCallback(async (suggestionId: string) => {
    setDismissedIds(prev => new Set(prev).add(suggestionId));
    await dismissSuggestion(suggestionId);
  }, [dismissSuggestion]);

  // Handle ignore (record as rejected, then dismiss)
  const handleIgnore = useCallback(async (suggestion: Suggestion) => {
    await recordAction(suggestion.id, false);
    handleDismiss(suggestion.id);
  }, [recordAction, handleDismiss]);

  // Don't render if loading and no suggestions yet
  if (loading && suggestions.length === 0) {
    return null;
  }

  // Don't render if no suggestions
  if (visibleSuggestions.length === 0) {
    return null;
  }

  // Compact view - just show count badge
  if (compact && !isExpanded) {
    const highPriority = visibleSuggestions.filter(
      s => s.priority === 'critical' || s.priority === 'high'
    ).length;

    return (
      <button
        className="suggestion-badge"
        onClick={() => setIsExpanded(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: highPriority > 0
            ? 'rgba(255, 152, 0, 0.2)'
            : 'rgba(0, 188, 212, 0.15)',
          border: `1px solid ${highPriority > 0 ? 'rgba(255, 152, 0, 0.4)' : 'rgba(0, 188, 212, 0.3)'}`,
          borderRadius: 12,
          cursor: 'pointer',
          fontSize: 12,
          color: highPriority > 0 ? '#ff9800' : '#00bcd4',
        }}
      >
        <span style={{ fontSize: 14 }}>{'\u{1F4A1}'}</span>
        <span>{visibleSuggestions.length} suggestions</span>
        {highPriority > 0 && (
          <span style={{
            background: '#ff9800',
            color: '#000',
            borderRadius: 8,
            padding: '0 5px',
            fontSize: 10,
            fontWeight: 600,
          }}>
            {highPriority}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="suggestion-panel" style={{
      background: 'rgba(0, 188, 212, 0.05)',
      border: '1px solid rgba(0, 188, 212, 0.2)',
      borderRadius: 8,
      padding: compact ? 8 : 12,
      marginBottom: 12,
    }}>
      {/* Header */}
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
          color: '#00bcd4',
          fontSize: 13,
          fontWeight: 500,
        }}>
          <span style={{ fontSize: 16 }}>{'\u{1F4A1}'}</span>
          <span>Flowfaster Suggestions</span>
          <span style={{
            background: 'rgba(0, 188, 212, 0.2)',
            padding: '1px 6px',
            borderRadius: 8,
            fontSize: 11,
          }}>
            {visibleSuggestions.length}
          </span>
        </div>
        {compact && (
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: 14,
              padding: 4,
            }}
          >
            {'\u{2715}'}
          </button>
        )}
      </div>

      {/* Suggestion list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visibleSuggestions.map(suggestion => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onAction={() => handleAction(suggestion)}
            onDismiss={() => handleDismiss(suggestion.id)}
            onIgnore={() => handleIgnore(suggestion)}
            compact={compact}
          />
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          marginTop: 8,
          padding: 8,
          background: 'rgba(255, 68, 68, 0.1)',
          borderRadius: 4,
          color: '#ff6464',
          fontSize: 11,
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

interface SuggestionCardProps {
  suggestion: Suggestion;
  onAction: () => void;
  onDismiss: () => void;
  onIgnore: () => void;
  compact?: boolean;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onAction,
  onDismiss,
  onIgnore,
  compact,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const icon = typeIcons[suggestion.type] || '\u{2139}';
  const priorityColor = priorityColors[suggestion.priority];
  const typeLabel = typeLabels[suggestion.type];

  return (
    <div
      className="suggestion-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.2)',
        borderRadius: 6,
        padding: compact ? 8 : 10,
        borderLeft: `3px solid ${priorityColor}`,
        transition: 'background 0.15s ease',
      }}
    >
      {/* Top row: icon, title, dismiss */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
          <span style={{ fontSize: 16, lineHeight: 1.2 }}>{icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 2,
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 500,
                color: '#fff',
              }}>
                {suggestion.title}
              </span>
              <span style={{
                fontSize: 9,
                padding: '1px 5px',
                background: `${priorityColor}22`,
                color: priorityColor,
                borderRadius: 4,
                textTransform: 'uppercase',
              }}>
                {typeLabel}
              </span>
            </div>
            <p style={{
              margin: 0,
              fontSize: 11,
              color: '#aaa',
              lineHeight: 1.4,
            }}>
              {suggestion.description}
            </p>
          </div>
        </div>

        {/* Dismiss button (shown on hover) */}
        {suggestion.dismissable && isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: 12,
              padding: 2,
              lineHeight: 1,
            }}
            title="Dismiss"
          >
            {'\u{2715}'}
          </button>
        )}
      </div>

      {/* Action row */}
      {suggestion.actionable && suggestion.action && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        }}>
          <button
            onClick={onAction}
            style={{
              background: `${priorityColor}22`,
              border: `1px solid ${priorityColor}44`,
              color: priorityColor,
              padding: '4px 10px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {suggestion.action.label}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIgnore();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: 11,
              padding: '4px 6px',
            }}
          >
            Not helpful
          </button>
          {suggestion.confidence > 0 && (
            <span style={{
              marginLeft: 'auto',
              fontSize: 10,
              color: '#666',
            }}>
              {Math.round(suggestion.confidence * 100)}% confident
            </span>
          )}
        </div>
      )}

      {/* Context tags */}
      {!compact && suggestion.context.tags && suggestion.context.tags.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 4,
          marginTop: 6,
          flexWrap: 'wrap',
        }}>
          {suggestion.context.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              style={{
                fontSize: 9,
                padding: '1px 5px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 3,
                color: '#888',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// Mini suggestion indicator for status bars
export const SuggestionIndicator: React.FC<{
  count: number;
  highPriorityCount: number;
  onClick?: () => void;
}> = ({ count, highPriorityCount, onClick }) => {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        background: highPriorityCount > 0
          ? 'rgba(255, 152, 0, 0.15)'
          : 'rgba(0, 188, 212, 0.1)',
        border: 'none',
        borderRadius: 10,
        cursor: onClick ? 'pointer' : 'default',
        fontSize: 11,
        color: highPriorityCount > 0 ? '#ff9800' : '#00bcd4',
      }}
      title={`${count} suggestions available`}
    >
      <span>{'\u{1F4A1}'}</span>
      <span>{count}</span>
    </button>
  );
};

export default SuggestionPanel;
