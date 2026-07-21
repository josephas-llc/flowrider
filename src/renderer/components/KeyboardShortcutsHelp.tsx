import React, { useState, useEffect } from 'react';

interface ShortcutCategory {
  name: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const SHORTCUTS: ShortcutCategory[] = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: ['Cmd', 'K'], description: 'Open Command Palette' },
      { keys: ['Cmd', '/'], description: 'Open Session Search' },
      { keys: ['Cmd', '1-9'], description: 'Jump to session 1-9' },
      { keys: ['Tab'], description: 'Next session' },
      { keys: ['Shift', 'Tab'], description: 'Previous session' },
      { keys: ['?'], description: 'Show this help' },
    ],
  },
  {
    name: 'Control Groups (StarCraft-style)',
    shortcuts: [
      { keys: ['Ctrl', '1-9'], description: 'Assign session to control group' },
      { keys: ['1-9'], description: 'Select control group' },
      { keys: ['1-9', '1-9'], description: 'Double-tap to center on group' },
    ],
  },
  {
    name: 'Session Actions',
    shortcuts: [
      { keys: ['Cmd', 'N'], description: 'New session' },
      { keys: ['Cmd', 'W'], description: 'Close current session' },
      { keys: ['Cmd', 'R'], description: 'Restart current session' },
      { keys: ['Cmd', 'Enter'], description: 'Maximize/restore terminal' },
    ],
  },
  {
    name: 'Terminal',
    shortcuts: [
      { keys: ['Cmd', 'F'], description: 'Search in terminal' },
      { keys: ['Cmd', 'C'], description: 'Copy selection' },
      { keys: ['Cmd', 'V'], description: 'Paste' },
      { keys: ['Cmd', '+'], description: 'Increase font size' },
      { keys: ['Cmd', '-'], description: 'Decrease font size' },
      { keys: ['Cmd', '0'], description: 'Reset font size' },
    ],
  },
  {
    name: 'Views',
    shortcuts: [
      { keys: ['Cmd', 'D'], description: 'Toggle Dashboard' },
      { keys: ['Cmd', 'P'], description: 'Toggle Projects' },
      { keys: ['Cmd', ','], description: 'Open Settings' },
    ],
  },
];

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
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

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 700,
          maxHeight: '80vh',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>⌨️</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Keyboard Shortcuts
            </span>
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
          >
            ×
          </button>
        </div>

        {/* Shortcuts List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
          }}
        >
          {SHORTCUTS.map((category) => (
            <div key={category.name} style={{ marginBottom: 24 }}>
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--accent-cyan)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 12,
                }}
              >
                {category.name}
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px 24px',
                }}
              >
                {category.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {shortcut.description}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {shortcut.keys.map((key, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          style={{
                            padding: '3px 7px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 4,
                            fontSize: 10,
                            fontFamily: 'SF Mono, Monaco, monospace',
                            color: 'var(--text-primary)',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                          }}
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Press <kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 3 }}>?</kbd> anytime to show this help
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 3 }}>Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to register "?" key to show keyboard shortcuts
 */
export const useKeyboardShortcutsHelp = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // "?" key (Shift + /)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    setIsOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
};

export default KeyboardShortcutsHelp;
