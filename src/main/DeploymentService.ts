/**
 * DeploymentService - GitHub/Vercel integration with LEO learning
 *
 * Provides:
 * - List repos from josephas-llc org
 * - View GitHub Actions status
 * - Trigger deployments/releases
 * - Track deployment outcomes for LEO learning
 */

import { spawn, execSync } from 'child_process';
import { EventEmitter } from 'events';
import { existsSync } from 'fs';

// Types
export interface Repository {
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  defaultBranch: string;
  language: string | null;
  updatedAt: string;
  isPrivate: boolean;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  branch: string;
  event: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  duration?: number;
}

export interface Release {
  id: number;
  tagName: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  createdAt: string;
  publishedAt: string | null;
  url: string;
  assets: ReleaseAsset[];
}

export interface ReleaseAsset {
  name: string;
  size: number;
  downloadCount: number;
  url: string;
}

export interface DeploymentEvent {
  type: 'workflow_started' | 'workflow_completed' | 'release_created' | 'deploy_triggered';
  repo: string;
  timestamp: number;
  success: boolean;
  duration?: number;
  details: Record<string, any>;
}

export interface PullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  labels: string[];
  isDependabot: boolean;
}

export class DeploymentService extends EventEmitter {
  private ghPath: string | null = null;
  private org: string = 'josephas-llc';
  private deploymentHistory: DeploymentEvent[] = [];
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private watchedRepos: Set<string> = new Set();

  constructor() {
    super();
    this.findGhCli();
  }

  private findGhCli(): void {
    try {
      // Check common locations - use existsSync first for reliability in Electron
      const home = process.env.HOME || '/Users/' + process.env.USER;
      const locations = [
        '/opt/homebrew/bin/gh',
        '/usr/local/bin/gh',
        '/usr/bin/gh',
        `${home}/.local/bin/gh`,
        `${home}/bin/gh`,
      ];

      console.log(`[DeploymentService] Searching for gh CLI, HOME=${home}`);

      for (const loc of locations) {
        console.log(`[DeploymentService] Checking: ${loc}`);
        if (existsSync(loc)) {
          // Verify it's executable by running --version
          try {
            execSync(`"${loc}" --version`, { stdio: 'pipe', shell: '/bin/bash' });
            this.ghPath = loc;
            console.log(`[DeploymentService] Found gh CLI at: ${loc}`);
            return;
          } catch (execErr) {
            console.log(`[DeploymentService] File exists but not executable: ${loc}`, execErr);
            continue;
          }
        }
      }

      // Try PATH with shell: true
      try {
        const result = execSync('which gh', { encoding: 'utf-8', shell: '/bin/bash' }).trim();
        if (result && existsSync(result)) {
          this.ghPath = result;
          console.log(`[DeploymentService] Found gh CLI via PATH at: ${result}`);
        }
      } catch {
        // which gh failed
      }
    } catch (err) {
      console.warn('[DeploymentService] gh CLI not found - deployment features disabled', err);
    }
  }

  private async runGh(args: string[]): Promise<any> {
    if (!this.ghPath) {
      throw new Error('gh CLI not found');
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(this.ghPath!, args, {
        env: { ...process.env, GH_NO_UPDATE_NOTIFIER: '1' },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(stdout));
          } catch {
            resolve(stdout.trim());
          }
        } else {
          reject(new Error(stderr || `gh exited with code ${code}`));
        }
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // REPOSITORIES
  // ═══════════════════════════════════════════════════════════════

  async listRepos(): Promise<Repository[]> {
    try {
      const repos = await this.runGh([
        'repo', 'list', this.org,
        '--json', 'name,nameWithOwner,description,url,defaultBranchRef,primaryLanguage,updatedAt,isPrivate',
        '--limit', '50'
      ]);

      return repos.map((r: any) => ({
        name: r.name,
        fullName: r.nameWithOwner,
        description: r.description,
        url: r.url,
        defaultBranch: r.defaultBranchRef?.name || 'main',
        language: r.primaryLanguage?.name || null,
        updatedAt: r.updatedAt,
        isPrivate: r.isPrivate,
      }));
    } catch (err) {
      console.error('[DeploymentService] Error listing repos:', err);
      return [];
    }
  }

  async getRepoDetails(repo: string): Promise<Repository | null> {
    try {
      const fullName = repo.includes('/') ? repo : `${this.org}/${repo}`;
      const r = await this.runGh([
        'repo', 'view', fullName,
        '--json', 'name,nameWithOwner,description,url,defaultBranchRef,primaryLanguage,updatedAt,isPrivate'
      ]);

      return {
        name: r.name,
        fullName: r.nameWithOwner,
        description: r.description,
        url: r.url,
        defaultBranch: r.defaultBranchRef?.name || 'main',
        language: r.primaryLanguage?.name || null,
        updatedAt: r.updatedAt,
        isPrivate: r.isPrivate,
      };
    } catch (err) {
      console.error('[DeploymentService] Error getting repo details:', err);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // WORKFLOW RUNS (GitHub Actions)
  // ═══════════════════════════════════════════════════════════════

  async listWorkflowRuns(repo: string, limit: number = 10): Promise<WorkflowRun[]> {
    try {
      const fullName = repo.includes('/') ? repo : `${this.org}/${repo}`;
      const runs = await this.runGh([
        'run', 'list',
        '-R', fullName,
        '--json', 'databaseId,displayTitle,status,conclusion,headBranch,event,createdAt,updatedAt,url',
        '--limit', String(limit)
      ]);

      return runs.map((r: any) => ({
        id: r.databaseId,
        name: r.displayTitle,
        status: r.status.toLowerCase(),
        conclusion: r.conclusion?.toLowerCase() || null,
        branch: r.headBranch,
        event: r.event,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        url: r.url,
      }));
    } catch (err) {
      console.error('[DeploymentService] Error listing workflow runs:', err);
      return [];
    }
  }

  async getWorkflowRunLogs(repo: string, runId: number): Promise<string> {
    try {
      const fullName = repo.includes('/') ? repo : `${this.org}/${repo}`;
      const logs = await this.runGh([
        'run', 'view', String(runId),
        '-R', fullName,
        '--log'
      ]);
      return typeof logs === 'string' ? logs : JSON.stringify(logs);
    } catch (err) {
      console.error('[DeploymentService] Error getting workflow logs:', err);
      return '';
    }
  }

  async rerunWorkflow(repo: string, runId: number): Promise<boolean> {
    try {
      const fullName = repo.includes('/') ? repo : `${this.org}/${repo}`;
      await this.runGh(['run', 'rerun', String(runId), '-R', fullName]);

      this.recordEvent({
        type: 'workflow_started',
        repo: fullName,
        timestamp: Date.now(),
        success: true,
        details: { runId, action: 'rerun' }
      });

      return true;
    } catch (err) {
      console.error('[DeploymentService] Error rerunning workflow:', err);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RELEASES
  // ═══════════════════════════════════════════════════════════════

  async listReleases(repo: string, limit: number = 10): Promise<Release[]> {
    try {
      const fullName = repo.includes('/') ? repo : `${this.org}/${repo}`;
      const releases = await this.runGh([
        'release', 'list',
        '-R', fullName,
        '--json', 'tagName,name,body,isDraft,isPrerelease,createdAt,publishedAt,url',
        '--limit', String(limit)
      ]);

      // Get assets for each release
      return Promise.all(releases.map(async (r: any) => {
        let assets: ReleaseAsset[] = [];
        try {
          const releaseDetails = await this.runGh([
            'release', 'view', r.tagName,
            '-R', fullName,
            '--json', 'assets'
          ]);
          assets = (releaseDetails.assets || []).map((a: any) => ({
            name: a.name,
            size: a.size,
            downloadCount: a.downloadCount,
            url: a.url,
          }));
        } catch {
          // Release might not exist or no assets
        }

        return {
          id: 0, // Not available in list
          tagName: r.tagName,
          name: r.name || r.tagName,
          body: r.body || '',
          draft: r.isDraft,
          prerelease: r.isPrerelease,
          createdAt: r.createdAt,
          publishedAt: r.publishedAt,
          url: r.url,
          assets,
        };
      }));
    } catch (err) {
      console.error('[DeploymentService] Error listing releases:', err);
      return [];
    }
  }

  async createRelease(
    repo: string,
    tagName: string,
    title: string,
    notes: string,
    draft: boolean = false,
    prerelease: boolean = false
  ): Promise<Release | null> {
    try {
      const fullName = repo.includes('/') ? repo : `${this.org}/${repo}`;
      const args = [
        'release', 'create', tagName,
        '-R', fullName,
        '--title', title,
        '--notes', notes,
      ];

      if (draft) args.push('--draft');
      if (prerelease) args.push('--prerelease');

      const result = await this.runGh(args);

      this.recordEvent({
        type: 'release_created',
        repo: fullName,
        timestamp: Date.now(),
        success: true,
        details: { tagName, title, draft, prerelease }
      });

      // Fetch the created release
      return (await this.listReleases(repo, 1))[0] || null;
    } catch (err) {
      console.error('[DeploymentService] Error creating release:', err);

      this.recordEvent({
        type: 'release_created',
        repo,
        timestamp: Date.now(),
        success: false,
        details: { tagName, error: String(err) }
      });

      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PULL REQUESTS (including Dependabot)
  // ═══════════════════════════════════════════════════════════════

  async listPullRequests(repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<PullRequest[]> {
    try {
      const fullName = repo.includes('/') ? repo : `${this.org}/${repo}`;
      const prs = await this.runGh([
        'pr', 'list',
        '-R', fullName,
        '--state', state,
        '--json', 'number,title,state,author,createdAt,updatedAt,url,labels',
        '--limit', '50'
      ]);

      return prs.map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state.toLowerCase(),
        author: pr.author?.login || 'unknown',
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
        url: pr.url,
        labels: (pr.labels || []).map((l: any) => l.name),
        isDependabot: pr.author?.login === 'dependabot[bot]' ||
                      (pr.labels || []).some((l: any) => l.name === 'dependencies'),
      }));
    } catch (err) {
      console.error('[DeploymentService] Error listing PRs:', err);
      return [];
    }
  }

  async mergePullRequest(repo: string, prNumber: number, method: 'merge' | 'squash' | 'rebase' = 'squash'): Promise<boolean> {
    try {
      const fullName = repo.includes('/') ? repo : `${this.org}/${repo}`;
      await this.runGh([
        'pr', 'merge', String(prNumber),
        '-R', fullName,
        `--${method}`,
        '--auto'
      ]);
      return true;
    } catch (err) {
      console.error('[DeploymentService] Error merging PR:', err);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DEPLOYMENT TRIGGERS
  // ═══════════════════════════════════════════════════════════════

  async triggerWorkflow(repo: string, workflow: string, branch?: string): Promise<boolean> {
    try {
      const fullName = repo.includes('/') ? repo : `${this.org}/${repo}`;
      const args = ['workflow', 'run', workflow, '-R', fullName];

      if (branch) {
        args.push('--ref', branch);
      }

      await this.runGh(args);

      this.recordEvent({
        type: 'deploy_triggered',
        repo: fullName,
        timestamp: Date.now(),
        success: true,
        details: { workflow, branch }
      });

      return true;
    } catch (err) {
      console.error('[DeploymentService] Error triggering workflow:', err);

      this.recordEvent({
        type: 'deploy_triggered',
        repo,
        timestamp: Date.now(),
        success: false,
        details: { workflow, error: String(err) }
      });

      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STATUS MONITORING
  // ═══════════════════════════════════════════════════════════════

  async getOrgStatus(): Promise<{
    repos: number;
    activeWorkflows: number;
    pendingPRs: number;
    recentReleases: number;
    dependabotPRs: number;
  }> {
    try {
      const repos = await this.listRepos();
      let activeWorkflows = 0;
      let pendingPRs = 0;
      let dependabotPRs = 0;
      let recentReleases = 0;

      // Sample first 5 repos for quick status
      const sampleRepos = repos.slice(0, 5);

      await Promise.all(sampleRepos.map(async (repo) => {
        const [runs, prs, releases] = await Promise.all([
          this.listWorkflowRuns(repo.fullName, 5),
          this.listPullRequests(repo.fullName, 'open'),
          this.listReleases(repo.fullName, 3)
        ]);

        activeWorkflows += runs.filter(r => r.status === 'in_progress' || r.status === 'queued').length;
        pendingPRs += prs.length;
        dependabotPRs += prs.filter(pr => pr.isDependabot).length;

        // Count releases from last 7 days
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        recentReleases += releases.filter(r => new Date(r.createdAt).getTime() > weekAgo).length;
      }));

      return {
        repos: repos.length,
        activeWorkflows,
        pendingPRs,
        recentReleases,
        dependabotPRs,
      };
    } catch (err) {
      console.error('[DeploymentService] Error getting org status:', err);
      return {
        repos: 0,
        activeWorkflows: 0,
        pendingPRs: 0,
        recentReleases: 0,
        dependabotPRs: 0,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // LEO LEARNING INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  private recordEvent(event: DeploymentEvent): void {
    this.deploymentHistory.push(event);
    this.emit('deployment-event', event);

    // Keep last 1000 events
    if (this.deploymentHistory.length > 1000) {
      this.deploymentHistory = this.deploymentHistory.slice(-1000);
    }
  }

  getDeploymentHistory(): DeploymentEvent[] {
    return [...this.deploymentHistory];
  }

  getDeploymentStats(): {
    totalDeployments: number;
    successRate: number;
    avgDuration: number;
    repoBreakdown: Record<string, { success: number; failure: number }>;
  } {
    const stats = {
      totalDeployments: this.deploymentHistory.length,
      successRate: 0,
      avgDuration: 0,
      repoBreakdown: {} as Record<string, { success: number; failure: number }>,
    };

    if (this.deploymentHistory.length === 0) return stats;

    const successes = this.deploymentHistory.filter(e => e.success).length;
    stats.successRate = (successes / this.deploymentHistory.length) * 100;

    const withDuration = this.deploymentHistory.filter(e => e.duration);
    if (withDuration.length > 0) {
      stats.avgDuration = withDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / withDuration.length;
    }

    for (const event of this.deploymentHistory) {
      if (!stats.repoBreakdown[event.repo]) {
        stats.repoBreakdown[event.repo] = { success: 0, failure: 0 };
      }
      if (event.success) {
        stats.repoBreakdown[event.repo].success++;
      } else {
        stats.repoBreakdown[event.repo].failure++;
      }
    }

    return stats;
  }

  // For LEO: Extract patterns from deployment data
  getDeploymentPatterns(): {
    commonFailures: Array<{ repo: string; errorPattern: string; count: number }>;
    deploymentFrequency: Record<string, number>;
    successfulWorkflows: string[];
  } {
    const failures: Map<string, { repo: string; errorPattern: string; count: number }> = new Map();
    const frequency: Record<string, number> = {};
    const successfulWorkflows: Set<string> = new Set();

    for (const event of this.deploymentHistory) {
      // Track frequency per repo
      frequency[event.repo] = (frequency[event.repo] || 0) + 1;

      if (event.success && event.details.workflow) {
        successfulWorkflows.add(event.details.workflow);
      }

      if (!event.success && event.details.error) {
        const key = `${event.repo}:${event.details.error.substring(0, 50)}`;
        const existing = failures.get(key);
        if (existing) {
          existing.count++;
        } else {
          failures.set(key, {
            repo: event.repo,
            errorPattern: event.details.error.substring(0, 100),
            count: 1,
          });
        }
      }
    }

    return {
      commonFailures: Array.from(failures.values()).sort((a, b) => b.count - a.count).slice(0, 10),
      deploymentFrequency: frequency,
      successfulWorkflows: Array.from(successfulWorkflows),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // POLLING / WATCHING
  // ═══════════════════════════════════════════════════════════════

  startWatching(intervalMs: number = 60000): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = setInterval(async () => {
      for (const repo of this.watchedRepos) {
        const runs = await this.listWorkflowRuns(repo, 5);
        for (const run of runs) {
          if (run.status === 'completed') {
            this.recordEvent({
              type: 'workflow_completed',
              repo,
              timestamp: Date.now(),
              success: run.conclusion === 'success',
              details: {
                runId: run.id,
                name: run.name,
                conclusion: run.conclusion,
              }
            });
          }
        }
      }
    }, intervalMs);

    console.log(`[DeploymentService] Started watching ${this.watchedRepos.size} repos`);
  }

  stopWatching(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  watchRepo(repo: string): void {
    const fullName = repo.includes('/') ? repo : `${this.org}/${repo}`;
    this.watchedRepos.add(fullName);
  }

  unwatchRepo(repo: string): void {
    const fullName = repo.includes('/') ? repo : `${this.org}/${repo}`;
    this.watchedRepos.delete(fullName);
  }

  isAvailable(): boolean {
    return this.ghPath !== null;
  }
}

// Singleton
export const deploymentService = new DeploymentService();
