import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import { useStore } from '../store';
import { TokenAccumulator, parseTokensFromOutput, parseClaudeCodeStatus } from '../utils/tokenParser';

// Quick action toolbar icons (simple SVG paths)
const ClearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
  </svg>
);

const RestartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 4v6h6M23 20v-6h-6" />
    <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const StopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

// Patterns that indicate Claude Code is waiting for user input
const ATTENTION_PATTERNS = [
  // Questions
  /\?\s*$/m,                           // Ends with question mark
  /(?:would you like|do you want|shall I|should I|can I|may I)/i,  // Asking for permission
  /(?:please (?:confirm|choose|select|specify)|enter your|type your)/i, // Asking for input
  /(?:y\/n|yes\/no|\[Y\/n\]|\[y\/N\])/i,  // Yes/No prompts
  // Errors that need attention
  /(?:error:|failed:|exception:|crash(?:ed)?:|fatal:)/i,
  // Interactive prompts
  /(?:press enter|hit enter|continue\?|proceed\?)/i,
  // Approval requests
  /(?:approve|allow|deny|accept|reject)/i,
];

// Check if output indicates session needs attention
function detectAttentionNeeded(output: string): { needsAttention: boolean; reason?: string } {
  // Only check the last 1000 characters for recent context
  const recentOutput = output.slice(-1000);

  // Check for error patterns first (highest priority)
  if (/(?:error:|failed:|exception:|crash(?:ed)?:|fatal:)/i.test(recentOutput)) {
    return { needsAttention: true, reason: 'Error occurred' };
  }

  // Check for approval/permission patterns
  if (/(?:would you like|do you want|shall I|should I|can I)/i.test(recentOutput)) {
    return { needsAttention: true, reason: 'Waiting for approval' };
  }

  // Check for yes/no prompts
  if (/(?:y\/n|yes\/no|\[Y\/n\]|\[y\/N\])/i.test(recentOutput)) {
    return { needsAttention: true, reason: 'Question asked' };
  }

  // Check for input requests
  if (/(?:please (?:confirm|choose|select|specify)|enter your|type your)/i.test(recentOutput)) {
    return { needsAttention: true, reason: 'Input needed' };
  }

  // Check for interactive prompts
  if (/(?:press enter|hit enter|continue\?|proceed\?)/i.test(recentOutput)) {
    return { needsAttention: true, reason: 'Waiting for input' };
  }

  return { needsAttention: false };
}

export const TerminalView: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const lastOutputRef = useRef<string>(''); // For copy output feature
  const tokenAccumulatorRef = useRef<TokenAccumulator>(new TokenAccumulator());
  const connectedSessionRef = useRef<string | null>(null);
  const lastTokensRef = useRef<{ input: number; output: number }>({ input: 0, output: 0 });
  const ptyCleanupRef = useRef<(() => void) | null>(null); // PTY event listener cleanup

  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [connectedSession, setConnectedSession] = useState<string | null>(null);
  const [liveTokens, setLiveTokens] = useState<{ input: number; output: number; cost: number }>({
    input: 0,
    output: 0,
    cost: 0,
  });

  const { sessions, selectedFace, attachedSession, addTokenUsage, setSessionNeedsAttention, setTerminalDimensions } = useStore();
  const selectedSession = selectedFace !== null ? sessions[selectedFace] : null;

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: '"SF Mono", "Fira Code", "JetBrains Mono", monospace',
      fontSize: 14,
      lineHeight: 1.4,
      allowProposedApi: true,  // Required for Unicode11Addon
      theme: {
        background: '#0a0a0f',
        foreground: '#e0e0e0',
        cursor: '#00ffff',
        cursorAccent: '#0a0a0f',
        selection: 'rgba(0, 255, 255, 0.3)',
        black: '#1a1a1a',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#00d4ff',
        magenta: '#ff79c6',
        cyan: '#00ffff',
        white: '#e0e0e0',
        brightBlack: '#555',
        brightRed: '#ff6e67',
        brightGreen: '#5af78e',
        brightYellow: '#f4f99d',
        brightBlue: '#6eceff',
        brightMagenta: '#ff92df',
        brightCyan: '#9aedfe',
        brightWhite: '#ffffff',
      },
    });

    xtermRef.current = terminal;

    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    // Unicode 11 support for emoji rendering
    const unicodeAddon = new Unicode11Addon();
    terminal.loadAddon(unicodeAddon);
    terminal.unicode.activeVersion = '11';

    // Search functionality (Cmd+F / Ctrl+F)
    const searchAddon = new SearchAddon();
    searchAddonRef.current = searchAddon;
    terminal.loadAddon(searchAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    // Update store with initial terminal dimensions
    setTerminalDimensions(terminal.cols, terminal.rows);
    console.log(`[Terminal] Initial dimensions: ${terminal.cols}x${terminal.rows}`);

    // Handle input - send to PTY (use ref to avoid stale closure)
    // PTY streaming gives us real-time bidirectional communication
    terminal.onData((data) => {
      if (connectedSessionRef.current && window.flowrider?.pty) {
        window.flowrider.pty.write(connectedSessionRef.current, data).catch(console.error);
      }
    });

    // Welcome message - clean and minimal
    terminal.writeln('');
    terminal.writeln('  \x1b[36mflowrider\x1b[0m');
    terminal.writeln('');
    terminal.writeln('  Click \x1b[36m+ New Session\x1b[0m in the top bar to get started.');
    terminal.writeln('');

    return () => terminal.dispose();
  }, []);

  // Update connectedSession when store changes
  useEffect(() => {
    if (attachedSession && selectedSession?.tmuxSession) {
      const sessionName = selectedSession.tmuxSession;
      setConnectedSession(sessionName);
      connectedSessionRef.current = sessionName; // Keep ref in sync for onData callback
      // Reset token tracking for new connection
      tokenAccumulatorRef.current.clear();
      setLiveTokens({ input: 0, output: 0, cost: 0 });
      lastTokensRef.current = { input: 0, output: 0 };
    } else {
      setConnectedSession(null);
      connectedSessionRef.current = null;
    }
  }, [attachedSession, selectedSession?.tmuxSession]);

  // PTY streaming - attach to tmux session via node-pty
  // This replaces polling with real-time byte streaming
  const attachPty = useCallback(async (sessionName: string) => {
    if (!window.flowrider?.pty || !xtermRef.current) {
      console.error('[Terminal] PTY API not available');
      return;
    }

    // Cleanup any existing PTY connection
    if (ptyCleanupRef.current) {
      ptyCleanupRef.current();
      ptyCleanupRef.current = null;
    }

    const terminal = xtermRef.current;
    const cols = terminal.cols;
    const rows = terminal.rows;

    console.log(`[Terminal] Attaching PTY to session: ${sessionName} (${cols}x${rows})`);

    try {
      // Attach PTY to tmux session
      const result = await window.flowrider.pty.attach(sessionName, cols, rows);
      if (!result.success) {
        console.error('[Terminal] Failed to attach PTY:', result.error);
        terminal.writeln(`\x1b[31mError: ${result.error || 'Failed to attach'}\x1b[0m`);
        return;
      }

      console.log(`[Terminal] PTY attached successfully`);

      // Set up PTY data listener - streams raw bytes directly to xterm.js
      // This is the key fix: no polling, no capture-pane, just raw PTY output
      const cleanupData = window.flowrider.pty.onData((incomingSession: string, data: string) => {
        if (incomingSession === sessionName && xtermRef.current) {
          // Write raw PTY data directly to terminal
          xtermRef.current.write(data);

          // Accumulate for copy feature and token parsing
          lastOutputRef.current += data;
          // Keep last 10KB for memory efficiency
          if (lastOutputRef.current.length > 10000) {
            lastOutputRef.current = lastOutputRef.current.slice(-10000);
          }

          // Parse tokens from output (check periodically, not on every chunk)
          const tokenUsage = parseTokensFromOutput(lastOutputRef.current) || parseClaudeCodeStatus(lastOutputRef.current);
          if (tokenUsage && selectedFace !== null) {
            const deltaInput = Math.max(0, tokenUsage.inputTokens - lastTokensRef.current.input);
            const deltaOutput = Math.max(0, tokenUsage.outputTokens - lastTokensRef.current.output);

            setLiveTokens({
              input: tokenUsage.inputTokens,
              output: tokenUsage.outputTokens,
              cost: tokenUsage.estimatedCost,
            });

            lastTokensRef.current = { input: tokenUsage.inputTokens, output: tokenUsage.outputTokens };

            if (deltaInput > 0 || deltaOutput > 0) {
              addTokenUsage(selectedFace, deltaInput, deltaOutput);
            }
          }

          // Check if session needs attention
          if (selectedFace !== null) {
            const attention = detectAttentionNeeded(lastOutputRef.current);
            setSessionNeedsAttention(selectedFace, attention.needsAttention, attention.reason);
          }
        }
      });

      // Set up PTY exit listener
      const cleanupExit = window.flowrider.pty.onExit((incomingSession: string, exitCode: number) => {
        if (incomingSession === sessionName) {
          console.log(`[Terminal] PTY session exited with code: ${exitCode}`);
          if (xtermRef.current) {
            xtermRef.current.writeln(`\x1b[33mSession ended (exit code: ${exitCode})\x1b[0m`);
          }
        }
      });

      // Store cleanup function
      ptyCleanupRef.current = () => {
        cleanupData();
        cleanupExit();
        window.flowrider?.pty?.detach(sessionName).catch(console.error);
      };

    } catch (err) {
      console.error('[Terminal] PTY attach error:', err);
      terminal.writeln(`\x1b[31mError: Failed to attach to session\x1b[0m`);
    }
  }, [selectedFace, addTokenUsage, setSessionNeedsAttention]);

  // Detach PTY and cleanup listeners
  const detachPty = useCallback(() => {
    if (ptyCleanupRef.current) {
      ptyCleanupRef.current();
      ptyCleanupRef.current = null;
    }
    lastOutputRef.current = '';
  }, []);

  // Handle attach/detach via PTY streaming
  useEffect(() => {
    if (connectedSession) {
      if (xtermRef.current) {
        xtermRef.current.clear();
        xtermRef.current.writeln(`\x1b[32mConnecting to: ${connectedSession}...\x1b[0m`);
        xtermRef.current.writeln('');
      }
      // Attach PTY for real-time streaming (replaces polling)
      attachPty(connectedSession);
    } else {
      detachPty();
      if (xtermRef.current) {
        xtermRef.current.clear();
        xtermRef.current.writeln('');
        xtermRef.current.writeln('  \x1b[36mflowrider\x1b[0m');
        xtermRef.current.writeln('');
        xtermRef.current.writeln('  Click \x1b[36m+ New Session\x1b[0m in the top bar to get started.');
        xtermRef.current.writeln('');
      }
    }

    return () => detachPty();
  }, [connectedSession, attachPty, detachPty]);

  // Sync PTY size to match xterm.js terminal dimensions
  const syncPtySize = useCallback(async (sessionName: string) => {
    if (!xtermRef.current || !window.flowrider?.pty) return;

    const terminal = xtermRef.current;
    const cols = terminal.cols;
    const rows = terminal.rows;

    if (cols > 0 && rows > 0) {
      try {
        await window.flowrider.pty.resize(sessionName, cols, rows);
        console.log(`[Terminal] Synced PTY size to ${cols}x${rows}`);
      } catch (err) {
        console.error('[Terminal] Failed to sync PTY size:', err);
      }
    }
  }, []);

  // Handle resize with double-RAF for xterm.js sizing race condition
  // Game UX best practice: Let browser fully layout before fitting terminal
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        // Double requestAnimationFrame: First RAF schedules for next frame,
        // second RAF ensures DOM has fully reflowed before we measure
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!fitAddonRef.current || !xtermRef.current) return;

            fitAddonRef.current.fit();

            // Update store with new dimensions
            const terminal = xtermRef.current;
            setTerminalDimensions(terminal.cols, terminal.rows);
            console.log(`[Terminal] Resized to: ${terminal.cols}x${terminal.rows}`);

            // After fitting, sync the new size to PTY
            if (connectedSessionRef.current) {
              syncPtySize(connectedSessionRef.current);
            }
          });
        });
      }
    };

    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      observer.observe(terminalRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [syncPtySize]);

  const formatTokens = (n: number) => {
    if (n < 1000) return n.toString();
    if (n < 1000000) return `${(n / 1000).toFixed(1)}K`;
    return `${(n / 1000000).toFixed(2)}M`;
  };

  // Handle search
  const handleSearch = useCallback((term: string) => {
    if (searchAddonRef.current && term) {
      searchAddonRef.current.findNext(term);
    }
  }, []);

  const handleSearchPrev = useCallback(() => {
    if (searchAddonRef.current && searchTerm) {
      searchAddonRef.current.findPrevious(searchTerm);
    }
  }, [searchTerm]);

  const handleSearchNext = useCallback(() => {
    if (searchAddonRef.current && searchTerm) {
      searchAddonRef.current.findNext(searchTerm);
    }
  }, [searchTerm]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchTerm('');
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  }, []);

  // Keyboard shortcut for search (Cmd+F / Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape' && showSearch) {
        closeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, closeSearch]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Quick action handlers
  const handleClearTerminal = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  }, []);

  const handleCopyOutput = useCallback(async () => {
    if (lastOutputRef.current) {
      try {
        await navigator.clipboard.writeText(lastOutputRef.current);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 1500);
      } catch (err) {
        console.error('[Terminal] Failed to copy:', err);
      }
    }
  }, []);

  const handleSendInterrupt = useCallback(async () => {
    if (connectedSessionRef.current && window.flowrider) {
      try {
        // Send Ctrl+C (ASCII 3)
        await window.flowrider.tmux.sendInput(connectedSessionRef.current, '\x03');
      } catch (err) {
        console.error('[Terminal] Failed to send interrupt:', err);
      }
    }
  }, []);

  const handleRestartSession = useCallback(async () => {
    if (connectedSessionRef.current && window.flowrider) {
      try {
        // Send Ctrl+C first, then clear
        await window.flowrider.tmux.sendInput(connectedSessionRef.current, '\x03');
        if (xtermRef.current) {
          xtermRef.current.clear();
        }
      } catch (err) {
        console.error('[Terminal] Failed to restart:', err);
      }
    }
  }, []);

  // Pure terminal - no header chrome, just like Claude Code
  return (
    <div className="terminal-panel terminal-clean">
      {/* Quick Actions Toolbar - floating in top-right */}
      {connectedSession && (
        <div className="terminal-quick-actions">
          <button
            onClick={() => setShowSearch(true)}
            title="Search (Cmd+F)"
            className="quick-action-btn"
          >
            <SearchIcon />
          </button>
          <button
            onClick={handleCopyOutput}
            title={copyFeedback ? 'Copied!' : 'Copy Output'}
            className={`quick-action-btn ${copyFeedback ? 'success' : ''}`}
          >
            <CopyIcon />
            {copyFeedback && <span className="copy-feedback">Copied!</span>}
          </button>
          <button
            onClick={handleClearTerminal}
            title="Clear Terminal"
            className="quick-action-btn"
          >
            <ClearIcon />
          </button>
          <button
            onClick={handleSendInterrupt}
            title="Stop/Interrupt (Ctrl+C)"
            className="quick-action-btn danger"
          >
            <StopIcon />
          </button>
          <button
            onClick={handleRestartSession}
            title="Restart (Ctrl+C + Clear)"
            className="quick-action-btn"
          >
            <RestartIcon />
          </button>
        </div>
      )}

      {/* Search bar - floating overlay */}
      {showSearch && (
        <div className="terminal-search-bar">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              handleSearch(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.shiftKey) {
                  handleSearchPrev();
                } else {
                  handleSearchNext();
                }
              }
              if (e.key === 'Escape') {
                closeSearch();
              }
            }}
          />
          <button onClick={handleSearchPrev} title="Previous (Shift+Enter)">
            <span>↑</span>
          </button>
          <button onClick={handleSearchNext} title="Next (Enter)">
            <span>↓</span>
          </button>
          <button onClick={closeSearch} title="Close (Esc)">
            <span>×</span>
          </button>
        </div>
      )}
      <div className="terminal-body" ref={terminalRef} />
    </div>
  );
};
