import { execSync, spawn, spawnSync } from 'child_process';
import { existsSync, statSync } from 'fs';

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

export interface GitHubRepo {
  owner: string;
  repo: string;
  branch: string;
  url: string;
}

const SESSION_PREFIX = 'fr2';

// Session name validation - only allow alphanumeric, dash, underscore
const SESSION_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

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

  /**
   * Validate session name to prevent command injection
   * Only allows alphanumeric, dash, and underscore characters
   */
  private validateSessionName(sessionName: string): void {
    if (!sessionName || typeof sessionName !== 'string') {
      throw new Error('Session name must be a non-empty string');
    }
    if (!SESSION_NAME_REGEX.test(sessionName)) {
      throw new Error(
        `Invalid session name: "${sessionName}". Only alphanumeric, dash, and underscore characters are allowed.`
      );
    }
  }

  /**
   * Validate and resolve working directory path
   * Ensures the path exists and is a directory
   */
  private validateAndResolvePath(workingDir: string): string {
    if (!workingDir || typeof workingDir !== 'string') {
      throw new Error('Working directory must be a non-empty string');
    }

    // Expand ~ to home directory
    const resolvedDir = workingDir.startsWith('~')
      ? workingDir.replace('~', process.env.HOME || '')
      : workingDir;

    // Verify path exists and is a directory
    if (!existsSync(resolvedDir)) {
      throw new Error(`Working directory does not exist: ${resolvedDir}`);
    }

    const stats = statSync(resolvedDir);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${resolvedDir}`);
    }

    return resolvedDir;
  }

  /**
   * Execute tmux command safely using spawnSync
   * Prevents command injection by using array arguments
   */
  private execTmux(args: string[], options: { allowError?: boolean } = {}): string {
    const result = spawnSync(this.tmuxPath, args, {
      encoding: 'utf-8',
      timeout: 5000,
    });

    if (result.error) {
      throw new Error(`Failed to execute tmux: ${result.error.message}`);
    }

    if (!options.allowError && result.status !== 0) {
      const errorMsg = result.stderr?.trim() || result.stdout?.trim() || 'Command failed';
      throw new Error(errorMsg);
    }

    return result.stdout?.trim() || '';
  }

  private makeSessionName(name: string, faceIndex: number): string {
    // Clean the name: lowercase, replace spaces with dashes
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    return `${SESSION_PREFIX}-${faceIndex}-${cleanName}`;
  }

  async createSession(name: string, faceIndex: number, workingDir: string): Promise<TmuxResult<TmuxSession>> {
    const sessionName = this.makeSessionName(name, faceIndex);

    try {
      // Validate session name
      this.validateSessionName(sessionName);

      // Validate and resolve working directory
      const resolvedDir = this.validateAndResolvePath(workingDir);

      // Check if session already exists
      try {
        this.execTmux(['has-session', '-t', sessionName]);
        return { success: false, error: `Session "${sessionName}" already exists` };
      } catch {
        // Session doesn't exist, good to create
      }

      // Create the tmux session with claude command
      // Using detached mode so we can control it
      this.execTmux(['new-session', '-d', '-s', sessionName, '-c', resolvedDir]);

      // Send the claude command to the session
      this.execTmux(['send-keys', '-t', sessionName, 'claude', 'Enter']);

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
      const output = this.execTmux(
        ['list-sessions', '-F', '#{session_name}:#{session_created}:#{session_attached}'],
        { allowError: true }
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
      // Validate session name
      this.validateSessionName(sessionName);

      this.execTmux(['kill-session', '-t', sessionName]);
      console.log(`[TmuxManager] Killed session: ${sessionName}`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async sendInput(sessionName: string, data: string): Promise<TmuxResult> {
    try {
      // Validate session name
      this.validateSessionName(sessionName);

      // For raw key input, we use send-keys -l (literal)
      // This safely handles all characters without escaping
      this.execTmux(['send-keys', '-t', sessionName, '-l', data]);
      return { success: true };
    } catch (error: unknown) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async getOutput(sessionName: string, lines: number = 500): Promise<TmuxResult<string>> {
    try {
      // Validate session name
      this.validateSessionName(sessionName);

      // Capture the pane content
      const output = this.execTmux(['capture-pane', '-t', sessionName, '-p', '-S', `-${lines}`]);
      return { success: true, data: output };
    } catch (error: unknown) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  async renameSession(oldName: string, newName: string): Promise<TmuxResult> {
    try {
      // Validate both session names
      this.validateSessionName(oldName);
      this.validateSessionName(newName);

      this.execTmux(['rename-session', '-t', oldName, newName]);
      console.log(`[TmuxManager] Renamed session: ${oldName} -> ${newName}`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  // Detect GitHub repository from working directory
  async detectGitRepo(workingDir: string): Promise<TmuxResult<GitHubRepo | null>> {
    try {
      // Validate and resolve working directory
      const resolvedDir = this.validateAndResolvePath(workingDir);

      // Get remote URL
      let remoteUrl: string;
      try {
        const result = spawnSync('git', ['config', '--get', 'remote.origin.url'], {
          cwd: resolvedDir,
          encoding: 'utf-8',
          timeout: 5000,
        });

        if (result.status !== 0 || !result.stdout) {
          // Not a git repo or no remote
          return { success: true, data: null };
        }

        remoteUrl = result.stdout.trim();
      } catch {
        // Not a git repo or no remote
        return { success: true, data: null };
      }

      // Parse GitHub URL (supports both SSH and HTTPS formats)
      // SSH: git@github.com:owner/repo.git
      // HTTPS: https://github.com/owner/repo.git
      const sshMatch = remoteUrl.match(/git@github\.com:(.+?)\/(.+?)(?:\.git)?$/);
      const httpsMatch = remoteUrl.match(/https:\/\/github\.com\/(.+?)\/(.+?)(?:\.git)?$/);

      const match = sshMatch || httpsMatch;
      if (!match) {
        return { success: true, data: null };
      }

      const owner = match[1];
      const repo = match[2].replace(/\.git$/, '');

      // Get current branch
      let branch = 'main';
      try {
        const result = spawnSync('git', ['branch', '--show-current'], {
          cwd: resolvedDir,
          encoding: 'utf-8',
          timeout: 5000,
        });

        if (result.status === 0 && result.stdout) {
          branch = result.stdout.trim() || 'main';
        }
      } catch {
        // Default to main
      }

      const url = `https://github.com/${owner}/${repo}`;
      console.log(`[TmuxManager] Detected GitHub repo: ${url} (branch: ${branch})`);

      return {
        success: true,
        data: { owner, repo, branch, url },
      };
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`[TmuxManager] Failed to detect git repo:`, err);
      return { success: false, error: err.message };
    }
  }
}
