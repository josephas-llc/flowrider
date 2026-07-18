import React from 'react';

interface KeyboardHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Cmd', '/'], description: 'Search sessions' },
      { keys: ['Cmd', '?'], description: 'Show keyboard shortcuts' },
      { keys: ['Cmd', 'F'], description: 'Search in terminal' },
      { keys: ['1-9'], description: 'Quick switch to session 1-9' },
      { keys: ['Tab'], description: 'Next session' },
      { keys: ['Shift', 'Tab'], description: 'Previous session' },
    ],
  },
  {
    title: 'Session Management',
    shortcuts: [
      { keys: ['Cmd', 'N'], description: 'New session' },
      { keys: ['Cmd', 'W'], description: 'Close current session' },
      { keys: ['Cmd', 'D'], description: 'Toggle dashboard' },
      { keys: ['Enter'], description: 'Connect to selected session' },
      { keys: ['Escape'], description: 'Disconnect from session' },
    ],
  },
  {
    title: 'Terminal',
    shortcuts: [
      { keys: ['Cmd', 'C'], description: 'Copy selection' },
      { keys: ['Cmd', 'V'], description: 'Paste' },
      { keys: ['Cmd', 'K'], description: 'Clear terminal' },
      { keys: ['Cmd', '+'], description: 'Increase font size' },
      { keys: ['Cmd', '-'], description: 'Decrease font size' },
    ],
  },
  {
    title: 'Icosahedron',
    shortcuts: [
      { keys: ['Click'], description: 'Select face/session' },
      { keys: ['Drag'], description: 'Rotate icosahedron' },
      { keys: ['Scroll'], description: 'Zoom in/out' },
      { keys: ['Double-click'], description: 'Connect to session' },
    ],
  },
];

export const KeyboardHelp: React.FC<KeyboardHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="keyboard-help-overlay" onClick={onClose}>
      <div className="keyboard-help" onClick={(e) => e.stopPropagation()}>
        <div className="keyboard-help-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="keyboard-help-content">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="shortcut-group">
              <h3>{group.title}</h3>
              <div className="shortcut-list">
                {group.shortcuts.map((shortcut, index) => (
                  <div key={index} className="shortcut-item">
                    <div className="shortcut-keys">
                      {shortcut.keys.map((key, i) => (
                        <React.Fragment key={i}>
                          <kbd>{key}</kbd>
                          {i < shortcut.keys.length - 1 && <span className="key-plus">+</span>}
                        </React.Fragment>
                      ))}
                    </div>
                    <span className="shortcut-description">{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="keyboard-help-footer">
          <span className="help-tip">Press <kbd>Esc</kbd> or <kbd>Cmd</kbd>+<kbd>?</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};
