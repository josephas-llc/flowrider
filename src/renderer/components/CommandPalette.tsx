import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStore, AI_PROVIDERS } from '../store';

interface Command {
  id: string;
  name: string;
  description: string;
  shortcut?: string;
  category: 'session' | 'navigation' | 'ai' | 'action' | 'settings';
  icon: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

// Command categories with styling
const CATEGORY_COLORS: Record<string, string> = {
  session: '#00ffff',
  navigation: '#9b59b6',
  ai: '#4285f4',
  action: '#4caf50',
  settings: '#ff9800',
};

const CATEGORY_LABELS: Record<string, string> = {
  session: 'Sessions',
  navigation: 'Navigation',
  ai: 'AI Models',
  action: 'Actions',
  settings: 'Settings',
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const {
    sessions,
    selectedFace,
    selectFace,
    updateSession,
    setDashboardView,
    setShowLeoPanel,
    setShowProjectModal,
    toggleLeoMode,
    leo,
    setIsFirstRun,
  } = useStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Define all available commands
  const allCommands: Command[] = useMemo(() => {
    const commands: Command[] = [];

    // Session commands - switch to any session
    sessions.forEach((session, index) => {
      commands.push({
        id: `session-${index}`,
        name: `Session ${index + 1}: ${session.name}`,
        description: session.status === 'empty' ? 'Empty session' : `${session.workingDir} • ${session.status}`,
        shortcut: index < 9 ? `⌘${index + 1}` : undefined,
        category: 'session',
        icon: session.status === 'empty' ? '○' : session.needsAttention ? '🔴' : '●',
        action: () => {
          selectFace(index);
          onClose();
        },
      });
    });

    // Navigation commands
    commands.push({
      id: 'nav-terminal',
      name: 'Go to Terminal',
      description: 'Switch to terminal view',
      shortcut: '⌘T',
      category: 'navigation',
      icon: '⌨️',
      action: () => {
        // Terminal is default view, just close palette
        onClose();
      },
    });

    commands.push({
      id: 'nav-dashboard',
      name: 'Go to Dashboard',
      description: 'View metrics and analytics',
      shortcut: '⌘D',
      category: 'navigation',
      icon: '📊',
      action: () => {
        setDashboardView('overview');
        onClose();
      },
    });

    commands.push({
      id: 'nav-projects',
      name: 'Go to Projects',
      description: 'Manage your projects',
      shortcut: '⌘P',
      category: 'navigation',
      icon: '📁',
      action: () => {
        setDashboardView('projects');
        onClose();
      },
    });

    commands.push({
      id: 'nav-providers',
      name: 'Go to AI Providers',
      description: 'Configure AI model settings',
      category: 'navigation',
      icon: '🤖',
      action: () => {
        setDashboardView('providers');
        onClose();
      },
    });

    commands.push({
      id: 'nav-costs',
      name: 'Go to Cost Tracker',
      description: 'View API costs and usage',
      category: 'navigation',
      icon: '💰',
      action: () => {
        setDashboardView('costs');
        onClose();
      },
    });

    // AI Provider quick-switch commands
    AI_PROVIDERS.forEach(provider => {
      if (provider.id !== 'openai') { // Minimize OpenAI per user preference
        commands.push({
          id: `ai-${provider.id}`,
          name: `Switch to ${provider.name}`,
          description: provider.isLocal ? 'FREE local inference' : `$${provider.costPerMToken}/M tokens`,
          category: 'ai',
          icon: provider.isLocal ? '🟢' : '☁️',
          action: () => {
            if (selectedFace !== null) {
              updateSession(selectedFace, {
                aiProvider: provider.id,
                aiModel: provider.models[0],
              });
            }
            onClose();
          },
        });
      }
    });

    // Action commands
    commands.push({
      id: 'action-create-session',
      name: 'Create New Session',
      description: 'Start a new AI coding session',
      shortcut: '⌘N',
      category: 'action',
      icon: '➕',
      action: () => {
        // Find first empty session
        const emptyIndex = sessions.findIndex(s => s.status === 'empty');
        if (emptyIndex !== -1) {
          selectFace(emptyIndex);
        }
        onClose();
      },
    });

    commands.push({
      id: 'action-create-project',
      name: 'Create New Project',
      description: 'Organize sessions into a project',
      category: 'action',
      icon: '📂',
      action: () => {
        setShowProjectModal(true);
        onClose();
      },
    });

    commands.push({
      id: 'action-toggle-leo',
      name: leo.enabled ? 'Disable Fleet Mode' : 'Enable Fleet Mode',
      description: leo.enabled ? 'Turn off fleet orchestration' : 'Manage 20 Flowriders = 400 sessions',
      category: 'action',
      icon: '🌐',
      action: () => {
        toggleLeoMode();
        onClose();
      },
    });

    commands.push({
      id: 'action-show-leo',
      name: 'Open Orchestration Panel',
      description: 'View Flowrider Intelligence dashboard',
      category: 'action',
      icon: '🎛️',
      action: () => {
        setShowLeoPanel(true);
        onClose();
      },
    });

    // Settings commands
    commands.push({
      id: 'settings-welcome',
      name: 'Show Welcome Wizard',
      description: 'Re-run the welcome tutorial',
      category: 'settings',
      icon: '❓',
      action: () => {
        setIsFirstRun(true);
        onClose();
      },
    });

    commands.push({
      id: 'settings-activity',
      name: 'View Activity Log',
      description: 'See all session activity',
      category: 'settings',
      icon: '📜',
      action: () => {
        setDashboardView('activity');
        onClose();
      },
    });

    return commands;
  }, [sessions, selectedFace, leo.enabled, selectFace, updateSession, setDashboardView, setShowLeoPanel, setShowProjectModal, toggleLeoMode, setIsFirstRun, onClose]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return allCommands;
    }

    const lowerQuery = query.toLowerCase();
    return allCommands.filter(cmd =>
      cmd.name.toLowerCase().includes(lowerQuery) ||
      cmd.description.toLowerCase().includes(lowerQuery) ||
      cmd.category.toLowerCase().includes(lowerQuery)
    );
  }, [allCommands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Tab') {
      // Tab completion: complete to currently selected command name
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        const selectedCommand = filteredCommands[selectedIndex];
        // Extract meaningful part of command name for completion
        const completionText = selectedCommand.name
          .replace(/^Session \d+: /, '') // Remove "Session N: " prefix
          .replace(/^Go to /, '')        // Remove "Go to " prefix
          .replace(/^Switch to /, '')    // Remove "Switch to " prefix
          .toLowerCase();
        setQuery(completionText);
      }
    }
  }, [filteredCommands, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 600,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Search input */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ color: '#00ffff', fontSize: 18 }}>⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 16,
              fontFamily: 'inherit',
            }}
          />
          <span style={{
            fontSize: 11,
            color: '#666',
            padding: '4px 8px',
            background: 'var(--bg-tertiary)',
            borderRadius: 4,
          }}>
            ESC
          </span>
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          style={{
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {Object.entries(groupedCommands).map(([category, commands]) => (
            <div key={category}>
              {/* Category header */}
              <div style={{
                padding: '8px 20px 4px',
                fontSize: 10,
                fontWeight: 600,
                color: CATEGORY_COLORS[category] || '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: 'rgba(0, 0, 0, 0.2)',
              }}>
                {CATEGORY_LABELS[category] || category}
              </div>

              {/* Commands in category */}
              {commands.map(cmd => {
                const currentIndex = flatIndex++;
                const isSelected = currentIndex === selectedIndex;

                return (
                  <div
                    key={cmd.id}
                    data-index={currentIndex}
                    onClick={() => cmd.action()}
                    style={{
                      padding: '10px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
                      borderLeft: isSelected ? '2px solid #00ffff' : '2px solid transparent',
                      transition: 'all 0.1s ease',
                    }}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                  >
                    <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>
                      {cmd.icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 13,
                        color: isSelected ? '#00ffff' : 'var(--text-primary)',
                        fontWeight: 500,
                      }}>
                        {cmd.name}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: '#666',
                        marginTop: 2,
                      }}>
                        {cmd.description}
                      </div>
                    </div>
                    {cmd.shortcut && (
                      <span style={{
                        fontSize: 10,
                        color: '#888',
                        padding: '2px 6px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 3,
                        fontFamily: 'monospace',
                      }}>
                        {cmd.shortcut}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div style={{
              padding: '32px 20px',
              textAlign: 'center',
              color: '#666',
              fontSize: 13,
            }}>
              No commands found for "{query}"
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: 16,
          fontSize: 10,
          color: '#666',
          background: 'rgba(0, 0, 0, 0.2)',
        }}>
          <span><kbd style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 2 }}>↑↓</kbd> Navigate</span>
          <span><kbd style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 2 }}>Tab</kbd> Complete</span>
          <span><kbd style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 2 }}>↵</kbd> Select</span>
          <span><kbd style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 2 }}>esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
};

// Hook to register global Cmd+K shortcut
export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
};

export default CommandPalette;
