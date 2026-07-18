import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useStore } from '../store';
import { TokenAccumulator, parseTokensFromOutput, parseClaudeCodeStatus } from '../utils/tokenParser';

const POLL_INTERVAL = 150;

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
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastOutputRef = useRef<string>('');
  const tokenAccumulatorRef = useRef<TokenAccumulator>(new TokenAccumulator());
  const connectedSessionRef = useRef<string | null>(null);
  const lastTokensRef = useRef<{ input: number; output: number }>({ input: 0, output: 0 });

  const [connectedSession, setConnectedSession] = useState<string | null>(null);
  const [liveTokens, setLiveTokens] = useState<{ input: number; output: number; cost: number }>({
    input: 0,
    output: 0,
    cost: 0,
  });

  const { sessions, selectedFace, attachedSession, addTokenUsage, setSessionNeedsAttention } = useStore();
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

    terminal.open(terminalRef.current);
    fitAddon.fit();

    // Handle input - send to tmux (use ref to avoid stale closure)
    terminal.onData((data) => {
      if (connectedSessionRef.current && window.flowrider) {
        window.flowrider.tmux.sendInput(connectedSessionRef.current, data).catch(console.error);
      }
    });

    // Welcome message with clearer instructions
    terminal.writeln('\x1b[36m╔══════════════════════════════════════════════════════╗\x1b[0m');
    terminal.writeln('\x1b[36m║\x1b[0m         \x1b[1;35mFLOWRIDER 2.0 TERMINAL\x1b[0m                      \x1b[36m║\x1b[0m');
    terminal.writeln('\x1b[36m╚══════════════════════════════════════════════════════╝\x1b[0m');
    terminal.writeln('');
    terminal.writeln('\x1b[1;33m→ TO START:\x1b[0m');
    terminal.writeln('  1. Look at the \x1b[36mSession panel\x1b[0m on the right →');
    terminal.writeln('  2. Enter a \x1b[36mname\x1b[0m (or use default)');
    terminal.writeln('  3. Browse to select a \x1b[36mworking directory\x1b[0m');
    terminal.writeln('  4. Click the \x1b[32m\x1b[1mCreate Session\x1b[0m button');
    terminal.writeln('');
    terminal.writeln('  Your terminal session will appear here automatically!');

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

  // Poll tmux for output with token parsing
  const startPolling = useCallback((sessionName: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Sync tmux size immediately on connect
    if (xtermRef.current && window.flowrider) {
      const terminal = xtermRef.current;
      const cols = terminal.cols;
      const rows = terminal.rows;
      if (cols > 0 && rows > 0) {
        window.flowrider.tmux.resize(sessionName, cols, rows)
          .then(() => console.log(`[Terminal] Initial tmux sync to ${cols}x${rows}`))
          .catch((err: unknown) => console.error('[Terminal] Failed initial tmux sync:', err));
      }
    }

    const pollOutput = async () => {
      if (!window.flowrider || !xtermRef.current) return;

      try {
        const result = await window.flowrider.tmux.getOutput(sessionName, 500);
        if ((result as any).success && (result as any).data) {
          const output = (result as any).data as string;

          if (output !== lastOutputRef.current) {
            // Use incremental updates to preserve scroll history
            if (lastOutputRef.current === '') {
              // First load - write full output
              xtermRef.current.write(output);
            } else if (output.startsWith(lastOutputRef.current)) {
              // Output grew - append only new content
              const newContent = output.slice(lastOutputRef.current.length);
              if (newContent) {
                xtermRef.current.write(newContent);
              }
            } else {
              // Output changed significantly (scrollback shifted or new context)
              // Clear and rewrite, but this should be rare
              xtermRef.current.clear();
              xtermRef.current.write(output);
            }
            lastOutputRef.current = output;

            // Parse tokens from output
            const tokenUsage = parseTokensFromOutput(output) || parseClaudeCodeStatus(output);
            if (tokenUsage && selectedFace !== null) {
              // Calculate delta from previous values using ref (avoids stale closure)
              const deltaInput = Math.max(0, tokenUsage.inputTokens - lastTokensRef.current.input);
              const deltaOutput = Math.max(0, tokenUsage.outputTokens - lastTokensRef.current.output);

              // Update live display
              setLiveTokens({
                input: tokenUsage.inputTokens,
                output: tokenUsage.outputTokens,
                cost: tokenUsage.estimatedCost,
              });

              // Update ref for next delta calculation
              lastTokensRef.current = { input: tokenUsage.inputTokens, output: tokenUsage.outputTokens };

              // Only add to store if there's a positive delta (new tokens used)
              if (deltaInput > 0 || deltaOutput > 0) {
                addTokenUsage(selectedFace, deltaInput, deltaOutput);
              }
            }

            // Check if session needs attention (only for the attached session)
            if (selectedFace !== null) {
              const attention = detectAttentionNeeded(output);
              setSessionNeedsAttention(selectedFace, attention.needsAttention, attention.reason);
            }
          }
        }
      } catch (err) {
        console.error('[Terminal] Poll error:', err);
        // Show error to user if terminal is available
        if (xtermRef.current) {
          xtermRef.current.writeln(`\x1b[31mError: Session may have disconnected\x1b[0m`);
        }
      }
    };

    pollOutput();
    pollIntervalRef.current = setInterval(pollOutput, POLL_INTERVAL);
  }, [selectedFace]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    lastOutputRef.current = '';
  }, []);

  // Handle attach/detach
  useEffect(() => {
    if (connectedSession) {
      if (xtermRef.current) {
        xtermRef.current.clear();
        xtermRef.current.writeln(`\x1b[32mConnecting to: ${connectedSession}\x1b[0m`);
        xtermRef.current.writeln('');
      }
      startPolling(connectedSession);
    } else {
      stopPolling();
      if (xtermRef.current) {
        xtermRef.current.clear();
        xtermRef.current.writeln('\x1b[36m╔══════════════════════════════════════════════════════╗\x1b[0m');
        xtermRef.current.writeln('\x1b[36m║\x1b[0m         \x1b[1;35mFLOWRIDER 2.0 TERMINAL\x1b[0m                      \x1b[36m║\x1b[0m');
        xtermRef.current.writeln('\x1b[36m╚══════════════════════════════════════════════════════╝\x1b[0m');
        xtermRef.current.writeln('');
        xtermRef.current.writeln('\x1b[1;33m→ TO START:\x1b[0m');
        xtermRef.current.writeln('  1. Look at the \x1b[36mSession panel\x1b[0m on the right →');
        xtermRef.current.writeln('  2. Enter a \x1b[36mname\x1b[0m (or use default)');
        xtermRef.current.writeln('  3. Browse to select a \x1b[36mworking directory\x1b[0m');
        xtermRef.current.writeln('  4. Click the \x1b[32m\x1b[1mCreate Session\x1b[0m button');
        xtermRef.current.writeln('');
        xtermRef.current.writeln('  Your terminal session will appear here automatically!');
      }
    }

    return () => stopPolling();
  }, [connectedSession, startPolling, stopPolling]);

  // Sync tmux session size to match xterm.js terminal dimensions
  const syncTmuxSize = useCallback(async (sessionName: string) => {
    if (!xtermRef.current || !window.flowrider) return;

    const terminal = xtermRef.current;
    const cols = terminal.cols;
    const rows = terminal.rows;

    if (cols > 0 && rows > 0) {
      try {
        await window.flowrider.tmux.resize(sessionName, cols, rows);
        console.log(`[Terminal] Synced tmux size to ${cols}x${rows}`);
      } catch (err) {
        console.error('[Terminal] Failed to sync tmux size:', err);
      }
    }
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();

        // After fitting, sync the new size to tmux
        if (connectedSessionRef.current) {
          syncTmuxSize(connectedSessionRef.current);
        }
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
  }, [syncTmuxSize]);

  const formatTokens = (n: number) => {
    if (n < 1000) return n.toString();
    if (n < 1000000) return `${(n / 1000).toFixed(1)}K`;
    return `${(n / 1000000).toFixed(2)}M`;
  };

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <div className="terminal-title">
          <span>$</span>
          <span>TERMINAL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Live cost display - only show when there's actual usage */}
          {connectedSession && (liveTokens.input > 0 || liveTokens.output > 0) && (
            <div className="live-cost-display">
              <div className="cost-item">
                <span className="cost-label">IN</span>
                <span className="cost-value cyan">{formatTokens(liveTokens.input)}</span>
              </div>
              <div className="cost-item">
                <span className="cost-label">OUT</span>
                <span className="cost-value magenta">{formatTokens(liveTokens.output)}</span>
              </div>
              <div className="cost-item">
                <span className="cost-label">COST</span>
                <span className="cost-value yellow">
                  ${liveTokens.cost < 0.01 ? '<0.01' : liveTokens.cost.toFixed(4)}
                </span>
              </div>
            </div>
          )}

          {connectedSession && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              background: 'rgba(0, 255, 136, 0.15)',
              borderRadius: 4,
              border: '1px solid rgba(0, 255, 136, 0.3)',
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--accent-green)',
                boxShadow: '0 0 6px var(--accent-green)',
              }} />
              <span style={{
                fontSize: 12,
                color: 'var(--accent-green)',
                fontFamily: 'monospace',
                fontWeight: 600,
              }}>
                {connectedSession}
              </span>
            </div>
          )}
          <button
            onClick={() => xtermRef.current?.clear()}
            style={{
              padding: '4px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              color: 'var(--text-secondary)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </div>
      <div className="terminal-body" ref={terminalRef} />
    </div>
  );
};
