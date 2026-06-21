import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useStore } from '../store';
import { TokenAccumulator, parseTokensFromOutput, parseClaudeCodeStatus } from '../utils/tokenParser';

const POLL_INTERVAL = 150;

export const TerminalView: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastOutputRef = useRef<string>('');
  const tokenAccumulatorRef = useRef<TokenAccumulator>(new TokenAccumulator());
  const connectedSessionRef = useRef<string | null>(null);

  const [connectedSession, setConnectedSession] = useState<string | null>(null);
  const [liveTokens, setLiveTokens] = useState<{ input: number; output: number; cost: number }>({
    input: 0,
    output: 0,
    cost: 0,
  });

  const { sessions, selectedFace, attachedSession, addTokenUsage } = useStore();
  const selectedSession = selectedFace !== null ? sessions[selectedFace] : null;

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: '"SF Mono", "Fira Code", "JetBrains Mono", monospace',
      fontSize: 13,
      lineHeight: 1.3,
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

    // Welcome message
    terminal.writeln('\x1b[36m╔══════════════════════════════════════════════════════╗\x1b[0m');
    terminal.writeln('\x1b[36m║\x1b[0m         \x1b[1;35mFLOWRIDER 2.0 TERMINAL\x1b[0m                      \x1b[36m║\x1b[0m');
    terminal.writeln('\x1b[36m╚══════════════════════════════════════════════════════╝\x1b[0m');
    terminal.writeln('');
    terminal.writeln('\x1b[90mSelect a face and create a session to begin.\x1b[0m');
    terminal.writeln('');

    return () => terminal.dispose();
  }, []);

  // Update connectedSession when store changes
  useEffect(() => {
    if (attachedSession && selectedSession?.tmuxSession) {
      const sessionName = selectedSession.tmuxSession;
      setConnectedSession(sessionName);
      connectedSessionRef.current = sessionName; // Keep ref in sync for onData callback
      // Reset token accumulator for new connection
      tokenAccumulatorRef.current.clear();
      setLiveTokens({ input: 0, output: 0, cost: 0 });
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

    const pollOutput = async () => {
      if (!window.flowrider || !xtermRef.current) return;

      try {
        const result = await window.flowrider.tmux.getOutput(sessionName, 500);
        if ((result as any).success && (result as any).data) {
          const output = (result as any).data as string;

          if (output !== lastOutputRef.current) {
            // Clear and write full output (simple approach)
            xtermRef.current.clear();
            xtermRef.current.write(output);
            lastOutputRef.current = output;

            // Parse tokens from output
            const tokenUsage = parseTokensFromOutput(output) || parseClaudeCodeStatus(output);
            if (tokenUsage && selectedFace !== null) {
              // Update live display
              setLiveTokens({
                input: tokenUsage.inputTokens,
                output: tokenUsage.outputTokens,
                cost: tokenUsage.estimatedCost,
              });

              // Update store with delta (for now just set the values)
              // In a real implementation, we'd track deltas
            }
          }
        }
      } catch (err) {
        console.error('[Terminal] Poll error:', err);
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
        xtermRef.current.writeln('\x1b[90mNo session attached.\x1b[0m');
        xtermRef.current.writeln('');
      }
    }

    return () => stopPolling();
  }, [connectedSession, startPolling, stopPolling]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
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
  }, []);

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
          {/* Live cost display */}
          {connectedSession && (
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
            <span style={{
              fontSize: 11,
              color: 'var(--accent-green)',
              fontFamily: 'monospace',
            }}>
              {connectedSession}
            </span>
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
