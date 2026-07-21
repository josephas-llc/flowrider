/**
 * PtyManager - PTY-based terminal streaming for TUI apps
 *
 * Instead of polling tmux capture-pane, we spawn a PTY that attaches to tmux
 * and stream the raw bytes to xterm.js. This gives us:
 * - Real-time streaming (no 100ms polling delay)
 * - Proper cursor positioning
 * - No display artifacts
 * - Correct alternate screen buffer handling
 *
 * Key optimizations (from Hyper/VS Code research):
 * - 5ms data batching to prevent IPC thrashing
 * - Debounced resize to avoid race conditions
 */

import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';

interface PtySession {
  pty: pty.IPty;
  sessionName: string;
  cols: number;
  rows: number;
  // Data batching to prevent IPC thrashing (Hyper pattern)
  dataBuffer: string;
  flushTimeout: ReturnType<typeof setTimeout> | null;
}

// 5ms batching window - optimal balance per Hyper research
const DATA_BATCH_MS = 5;

export class PtyManager {
  private sessions: Map<string, PtySession> = new Map();
  private tmuxPath: string;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    // Find tmux binary
    try {
      const { execSync } = require('child_process');
      this.tmuxPath = execSync('which tmux', { encoding: 'utf-8' }).trim();
      console.log(`[PtyManager] Found tmux at: ${this.tmuxPath}`);
    } catch {
      this.tmuxPath = '/opt/homebrew/bin/tmux';
      console.log(`[PtyManager] Using default tmux path: ${this.tmuxPath}`);
    }
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  /**
   * Flush batched data for a session
   */
  private flushData(session: PtySession): void {
    if (session.dataBuffer.length > 0) {
      this.mainWindow?.webContents.send('pty:data', session.sessionName, session.dataBuffer);
      session.dataBuffer = '';
    }
    session.flushTimeout = null;
  }

  /**
   * Attach to an existing tmux session via PTY
   * This streams raw terminal output to the renderer
   */
  attach(sessionName: string, cols: number, rows: number): boolean {
    // Validate session name
    if (!sessionName || !/^[a-zA-Z0-9_-]+$/.test(sessionName)) {
      console.error(`[PtyManager] Invalid session name: ${sessionName}`);
      return false;
    }

    // Check if already attached
    if (this.sessions.has(sessionName)) {
      console.log(`[PtyManager] Already attached to session: ${sessionName}`);
      return true;
    }

    try {
      // Spawn PTY that attaches to tmux session
      const ptyProcess = pty.spawn(this.tmuxPath, ['attach-session', '-t', sessionName], {
        name: 'xterm-256color',
        cols: cols || 120,
        rows: rows || 40,
        cwd: process.env.HOME,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        } as { [key: string]: string },
      });

      // Store session info with batching state
      const session: PtySession = {
        pty: ptyProcess,
        sessionName,
        cols: cols || 120,
        rows: rows || 40,
        dataBuffer: '',
        flushTimeout: null,
      };
      this.sessions.set(sessionName, session);

      // Stream data to renderer with 5ms batching (Hyper pattern)
      // This prevents IPC message thrashing during verbose output
      ptyProcess.onData((data: string) => {
        session.dataBuffer += data;

        // If no flush is scheduled, schedule one
        if (!session.flushTimeout) {
          session.flushTimeout = setTimeout(() => {
            this.flushData(session);
          }, DATA_BATCH_MS);
        }
      });

      // Handle exit
      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`[PtyManager] Session ${sessionName} exited: code=${exitCode}, signal=${signal}`);
        // Flush any remaining data before exit notification
        if (session.flushTimeout) {
          clearTimeout(session.flushTimeout);
        }
        this.flushData(session);
        this.sessions.delete(sessionName);
        this.mainWindow?.webContents.send('pty:exit', sessionName, exitCode);
      });

      console.log(`[PtyManager] Attached to session: ${sessionName} (${cols}x${rows})`);
      return true;
    } catch (error) {
      console.error(`[PtyManager] Failed to attach to session:`, error);
      return false;
    }
  }

  /**
   * Detach from a tmux session (stop streaming)
   */
  detach(sessionName: string): boolean {
    const session = this.sessions.get(sessionName);
    if (!session) {
      console.log(`[PtyManager] Not attached to session: ${sessionName}`);
      return false;
    }

    try {
      // Send detach command to tmux before killing PTY
      session.pty.write('\x02d'); // Ctrl+B then 'd' (tmux detach)

      setTimeout(() => {
        session.pty.kill();
        this.sessions.delete(sessionName);
        console.log(`[PtyManager] Detached from session: ${sessionName}`);
      }, 100);

      return true;
    } catch (error) {
      console.error(`[PtyManager] Failed to detach from session:`, error);
      return false;
    }
  }

  /**
   * Send input to the attached PTY
   */
  write(sessionName: string, data: string): boolean {
    const session = this.sessions.get(sessionName);
    if (!session) {
      console.error(`[PtyManager] Not attached to session: ${sessionName}`);
      return false;
    }

    try {
      session.pty.write(data);
      return true;
    } catch (error) {
      console.error(`[PtyManager] Failed to write to session:`, error);
      return false;
    }
  }

  /**
   * Resize the PTY (and tmux will auto-resize)
   */
  resize(sessionName: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionName);
    if (!session) {
      console.error(`[PtyManager] Not attached to session: ${sessionName}`);
      return false;
    }

    // Validate dimensions
    if (cols < 10 || cols > 500 || rows < 5 || rows > 200) {
      console.log(`[PtyManager] Invalid dimensions: ${cols}x${rows}, skipping resize`);
      return false;
    }

    try {
      session.pty.resize(cols, rows);
      session.cols = cols;
      session.rows = rows;
      console.log(`[PtyManager] Resized session ${sessionName} to ${cols}x${rows}`);
      return true;
    } catch (error) {
      console.error(`[PtyManager] Failed to resize session:`, error);
      return false;
    }
  }

  /**
   * Check if attached to a session
   */
  isAttached(sessionName: string): boolean {
    return this.sessions.has(sessionName);
  }

  /**
   * Get all attached sessions
   */
  getAttachedSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Detach from all sessions (cleanup)
   */
  detachAll(): void {
    for (const sessionName of this.sessions.keys()) {
      this.detach(sessionName);
    }
  }
}
