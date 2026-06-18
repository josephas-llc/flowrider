import { execSync, spawn } from 'child_process';

export interface TmuxSession {
  name: string;
  faceIndex: number;
  created: string;
  attached: boolean;
}

export interface TmuxResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const SESSION_PREFIX = 'fr2';

export class TmuxManager {
  private tmuxPath: string;

  constructor() {
    // Find tmux binary
    try {
      this.tmuxPath = execSync('which tmux', { encoding: 'utf-8' }).trim();
      console.log(`[TmuxManager] Found tmux at: ${this.tmuxPath}`);
    } catch {
      this.tmuxPath = '/opt/homebrew/bin/tmux';
      console.log(`[TmuxManager] Using default tmux path: ${this.tmuxPath}`);
    }
  }

  private exec(cmd: string): string {
    try {
      return execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim();
    } catch (error: unknown) {
      const err = error as { stderr?: Buffer; message?: string };
      throw new Error(err.stderr?.toString() || err.message || 'Command failed');
    }
  }

  private makeSessionName(name: string, faceIndex: number): string {
    // Clean the name: lowercase, replace spaces with dashes
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    return `${SESSION_PREFIX}-${faceIndex}-${cleanName}`;
  }

  async createSession(name: string, faceIndex: number, workingDir: string): Promise<TmuxResult<TmuxSession>> {
    const sessionName = this.makeSessionName(name, faceIndex);

    try {
      // Check if session already exists
      try {
        this.exec(`${this.tmuxPath} has-session -t "${sessionName}" 2>/dev/null`);
        return { success: false, error: `Session "${sessionName}" already exists` };
      } catch {
        // Session doesn't exist, good to create
      }

      // Expand ~ to home directory
      const resolvedDir = workingDir.startsWith('~')
        ? workingDir.replace('~', process.env.HOME || '')
        : workingDir;

      // Create the tmux session with claude command
      // Using detached mode so we can control it
      const createCmd = `${this.tmuxPath} new-session -d -s "${sessionName}" -c "${resolvedDir}"`;
      this.exec(createCmd);

      // Send the claude command to the session
      const claudeCmd = `${this.tmuxPath} send-keys -t "${sessionName}" "claude" Enter`;
      this.exec(claudeCmd);

      console.log(`[TmuxManager] Created session: ${sessionName} in ${resolvedDir}`);

      return {
        success: true,
        data: {
          name: sessionName,
          faceIndex,
          created: new Date().toISOString(),
          attached: false,
        },
      };
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`[TmuxManager] Failed to create session:`, err);
      return { success: false, error: err.message };
    }
  }

  async listSessions(): Promise<TmuxResult<TmuxSession[]>> {
    try {
      const output = this.exec(
        `${this.tmuxPath} list-sessions -F "#{session_name}:#{session_created}:#{session_attached}" 2>/dev/null || echo ""`
      );

      if (!output) {
        return { success: true, data: [] };
      }

      const sessions: TmuxSession[] = output
        .split('\n')
        .filter((line) => line.startsWith(SESSION_PREFIX))
        .map((line) => {
          const [name, created, attached] = line.split(':');
          // Parse face index from session name (fr2-{faceIndex}-{name})
          const parts = name.split('-');
          const faceIndex = parseInt(parts[1], 10) || 0;

          return {
            name,
            faceIndex,
            created: new Date(parseInt(created, 10) * 1000).toISOString(),
            attached: attached === '1',
          };
        });

      return { success: true, data: sessions };
    } catch (error: unknown) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async killSession(sessionName: string): Promise<TmuxResult> {
    try {
      this.exec(`${this.tmuxPath} kill-session -t "${sessionName}"`);
      console.log(`[TmuxManager] Killed session: ${sessionName}`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async sendInput(sessionName: string, data: string): Promise<TmuxResult> {
    try {
      // Escape special characters for tmux send-keys
      // For raw key input, we use send-keys -l (literal)
      const escaped = data.replace(/'/g, "'\\''");
      this.exec(`${this.tmuxPath} send-keys -t "${sessionName}" -l '${escaped}'`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async getOutput(sessionName: string, lines: number = 500): Promise<TmuxResult<string>> {
    try {
      // Capture the pane content
      const output = this.exec(
        `${this.tmuxPath} capture-pane -t "${sessionName}" -p -S -${lines}`
      );
      return { success: true, data: output };
    } catch (error: unknown) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async renameSession(oldName: string, newName: string): Promise<TmuxResult> {
    try {
      this.exec(`${this.tmuxPath} rename-session -t "${oldName}" "${newName}"`);
      console.log(`[TmuxManager] Renamed session: ${oldName} -> ${newName}`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }
}
