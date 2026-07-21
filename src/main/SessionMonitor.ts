/**
 * SessionMonitor - Watches tmux sessions and captures interactions for AI System
 *
 * Parses terminal output to detect prompt/response boundaries and
 * automatically records interactions for learning.
 */

import { getAICore } from './ai-core';
import { getSkillTracker } from './ai-core/SkillTracker';

interface MonitoredSession {
  sessionName: string;
  sessionId: string;
  workingDir: string;
  projectId?: string;
  language?: string;
  lastOutput: string;
  lastPrompt: string | null;
  lastPromptTime: number;
  isWaitingForResponse: boolean;
  outputBuffer: string;
}

// Claude Code prompt patterns
const PROMPT_PATTERNS = [
  /^>\s*$/m,                           // Simple prompt: >
  /^❯\s*$/m,                           // Fancy prompt: ❯
  /^\$\s*$/m,                          // Shell prompt: $
  /^claude>\s*$/m,                     // Claude prompt
  /Human:\s*$/m,                       // Human: prefix
  /^You:\s*$/m,                        // You: prefix
];

// Response completion patterns (Claude Code typically ends with these)
const RESPONSE_END_PATTERNS = [
  /\n>\s*$/,                           // Back to prompt
  /\n❯\s*$/,                           // Back to fancy prompt
  /\nHuman:\s*$/,                      // Waiting for human
  /\n\$\s*$/,                          // Back to shell
  /───────────────────/,               // Divider line (Claude Code uses these)
];

// Error patterns to extract
const ERROR_PATTERNS = [
  /error\[E\d+\]:/gi,                  // Rust errors
  /Error:/gi,                          // Generic errors
  /TypeError:/gi,                      // JS/TS errors
  /SyntaxError:/gi,
  /ReferenceError:/gi,
  /RangeError:/gi,
  /Cannot find module/gi,
  /Module not found/gi,
  /ENOENT:/gi,                         // File not found
  /EACCES:/gi,                         // Permission denied
  /Permission denied/gi,
  /Command failed/gi,
  /Build failed/gi,
  /Test failed/gi,
  /Compilation failed/gi,
  /npm ERR!/gi,
  /yarn error/gi,
  /pnpm ERR!/gi,
  /warning:/gi,
  /WARN:/gi,
  /Exception:/gi,
  /Traceback/gi,                       // Python errors
  /AssertionError:/gi,
  /ImportError:/gi,
  /KeyError:/gi,
  /ValueError:/gi,
  /panic:/gi,                          // Rust/Go panics
  /fatal:/gi,
  /FATAL:/gi,
];

// File modification patterns
const FILE_PATTERNS = [
  /(?:created?|modified?|updated?|wrote|writing|editing)\s+['"`]?([^\s'"`]+\.[a-z]+)['"`]?/gi,
  /(?:src|lib|app|components|pages|utils|services|hooks)\/[^\s]+\.[a-z]+/gi,
  /(?:Created file|Modified|Updated|Wrote to):\s*['"`]?([^\s'"`\n]+)['"`]?/gi,
  /(?:Saving|Writing|Creating)\s+(?:file\s+)?['"`]?([^\s'"`\n]+\.[a-z]{2,4})['"`]?/gi,
  /\[(?:Write|Edit|Create)\]\s+['"`]?([^\s'"`\n]+)['"`]?/gi,
];

// Extension to skill domain mapping for SkillTracker
const EXTENSION_TO_DOMAIN: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  rs: 'rust',
  go: 'golang',
  rb: 'ruby',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  yml: 'devops',
  yaml: 'devops',
  dockerfile: 'devops',
  tf: 'devops',
  css: 'frontend',
  scss: 'frontend',
  html: 'frontend',
  vue: 'frontend',
  svelte: 'frontend',
  json: 'config',
  md: 'documentation',
};

/**
 * Infer skill domain from modified files
 */
function inferDomain(filesModified: string[], sessionLanguage?: string): string {
  // If session has a language set, use it
  if (sessionLanguage) {
    return sessionLanguage.toLowerCase();
  }

  // Count file extensions
  const domainCounts: Record<string, number> = {};
  for (const file of filesModified) {
    const ext = file.split('.').pop()?.toLowerCase() || '';
    const domain = EXTENSION_TO_DOMAIN[ext];
    if (domain) {
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    }
  }

  // Return most common domain, or 'general' if none found
  const entries = Object.entries(domainCounts);
  if (entries.length === 0) {
    return 'general';
  }
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export class SessionMonitor {
  private sessions: Map<string, MonitoredSession> = new Map();
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  private getOutput: (sessionName: string, lines: number) => Promise<{ success: boolean; data?: string }>;

  // Configurable poll interval (ms)
  private pollInterval = 2000;

  constructor(
    getOutputFn: (sessionName: string, lines: number) => Promise<{ success: boolean; data?: string }>
  ) {
    this.getOutput = getOutputFn;
    console.log('[SessionMonitor] Initialized');
  }

  /**
   * Start monitoring a session
   */
  startMonitoring(
    sessionName: string,
    sessionId: string,
    workingDir: string,
    projectId?: string,
    language?: string
  ): void {
    if (this.sessions.has(sessionName)) {
      console.log(`[SessionMonitor] Already monitoring: ${sessionName}`);
      return;
    }

    const session: MonitoredSession = {
      sessionName,
      sessionId,
      workingDir,
      projectId,
      language,
      lastOutput: '',
      lastPrompt: null,
      lastPromptTime: 0,
      isWaitingForResponse: false,
      outputBuffer: '',
    };

    this.sessions.set(sessionName, session);

    // Register session with AI System
    const aiCore = getAICore();
    aiCore.registerSession({
      sessionId,
      sessionName,
      projectId: projectId ?? null,
      workingDir,
      repoUrl: null,
      language: language ?? null,
      framework: null,
    });

    // Start polling for output
    const interval = setInterval(() => this.pollSession(sessionName), this.pollInterval);
    this.pollIntervals.set(sessionName, interval);

    console.log(`[SessionMonitor] Started monitoring: ${sessionName}`);
  }

  /**
   * Stop monitoring a session
   */
  stopMonitoring(sessionName: string): void {
    const interval = this.pollIntervals.get(sessionName);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(sessionName);
    }
    this.sessions.delete(sessionName);
    console.log(`[SessionMonitor] Stopped monitoring: ${sessionName}`);
  }

  /**
   * Poll session for new output
   */
  private async pollSession(sessionName: string): Promise<void> {
    const session = this.sessions.get(sessionName);
    if (!session) return;

    try {
      const result = await this.getOutput(sessionName, 500); // Get last 500 lines
      if (!result.success || !result.data) return;

      const newOutput = result.data;

      // Skip if no change
      if (newOutput === session.lastOutput) return;

      // Find the new content
      const newContent = this.getNewContent(session.lastOutput, newOutput);
      if (!newContent) {
        session.lastOutput = newOutput;
        return;
      }

      // Process the new content
      this.processOutput(session, newContent);
      session.lastOutput = newOutput;

    } catch (err) {
      console.error(`[SessionMonitor] Error polling ${sessionName}:`, err);
    }
  }

  /**
   * Get only the new content since last poll
   */
  private getNewContent(oldOutput: string, newOutput: string): string | null {
    if (!oldOutput) return newOutput;

    // Simple approach: find where old output ends in new output
    const oldLines = oldOutput.split('\n');
    const newLines = newOutput.split('\n');

    // Find the last line of old output in new output
    const lastOldLine = oldLines[oldLines.length - 1];
    if (!lastOldLine) return newOutput;

    let matchIndex = -1;
    for (let i = newLines.length - 1; i >= 0; i--) {
      if (newLines[i] === lastOldLine) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex === -1) {
      // Output completely changed, return all new
      return newOutput;
    }

    // Return everything after the match
    const newContent = newLines.slice(matchIndex + 1).join('\n');
    return newContent || null;
  }

  /**
   * Process new output and detect interactions
   */
  private processOutput(session: MonitoredSession, newContent: string): void {
    session.outputBuffer += newContent;

    // Detect if user sent a prompt
    const promptMatch = this.detectPromptSent(session.outputBuffer);
    if (promptMatch && !session.isWaitingForResponse) {
      session.lastPrompt = promptMatch;
      session.lastPromptTime = Date.now();
      session.isWaitingForResponse = true;
      session.outputBuffer = '';
      console.log(`[SessionMonitor] Detected prompt in ${session.sessionName}`);
      return;
    }

    // Detect if response completed
    if (session.isWaitingForResponse && session.lastPrompt) {
      const responseComplete = this.detectResponseComplete(session.outputBuffer);
      if (responseComplete) {
        const response = this.extractResponse(session.outputBuffer);
        this.recordInteraction(session, session.lastPrompt, response);

        session.lastPrompt = null;
        session.isWaitingForResponse = false;
        session.outputBuffer = '';
      }
    }

    // Trim buffer if too large
    if (session.outputBuffer.length > 50000) {
      session.outputBuffer = session.outputBuffer.slice(-25000);
    }
  }

  /**
   * Detect if a prompt was sent (user input followed by enter)
   */
  private detectPromptSent(buffer: string): string | null {
    // Look for patterns like: "> some user input\n" followed by AI response
    const lines = buffer.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for prompt prefix patterns
      for (const pattern of PROMPT_PATTERNS) {
        if (pattern.test(line)) {
          // The prompt is the text after the prompt symbol
          const promptText = line.replace(pattern, '').trim();
          if (promptText && promptText.length > 2) {
            return promptText;
          }
        }
      }

      // Also detect "Human: <prompt>" style
      const humanMatch = line.match(/^(?:Human|You|User|>|❯|\$):\s*(.+)$/i);
      if (humanMatch && humanMatch[1]) {
        return humanMatch[1].trim();
      }

      // Detect multi-line prompts (common in Claude Code)
      // Look for lines that start with common command patterns
      const commandMatch = line.match(/^(?:create|add|fix|update|modify|implement|write|build|refactor|test)\s+.{5,}/i);
      if (commandMatch && commandMatch[0]) {
        return commandMatch[0].trim();
      }
    }

    return null;
  }

  /**
   * Detect if the AI response is complete
   */
  private detectResponseComplete(buffer: string): boolean {
    // Check for response end patterns
    for (const pattern of RESPONSE_END_PATTERNS) {
      if (pattern.test(buffer)) {
        return true;
      }
    }

    // Also check for idle time (no new output for 3+ seconds)
    // This would require tracking timestamps, skipping for now

    return false;
  }

  /**
   * Extract the response text from the buffer
   */
  private extractResponse(buffer: string): string {
    // Remove prompt patterns from the end
    let response = buffer;
    for (const pattern of RESPONSE_END_PATTERNS) {
      response = response.replace(pattern, '');
    }
    return response.trim();
  }

  /**
   * Record the interaction with AI System
   */
  private recordInteraction(session: MonitoredSession, prompt: string, response: string): void {
    const aiCore = getAICore();
    const skillTracker = getSkillTracker();

    // Extract metadata from the response
    const filesModified = this.extractFilesModified(response);
    const errorsSeen = this.extractErrors(response);
    const outcome = this.inferOutcome(response, errorsSeen);

    // Infer domain from files modified or session language
    const domain = inferDomain(filesModified, session.language);

    console.log(`[SessionMonitor] Recording interaction for ${session.sessionName}:`);
    console.log(`  Prompt: ${prompt.substring(0, 50)}...`);
    console.log(`  Response length: ${response.length}`);
    console.log(`  Files: ${filesModified.length}, Errors: ${errorsSeen.length}`);
    console.log(`  Domain: ${domain}, Outcome: ${outcome}`);

    // Record to AICore for memory storage
    aiCore.recordInteraction(session.sessionId, prompt, response, {
      filesModified,
      outcome,
    });

    // Record to SkillTracker for skill progression (THE GLUE!)
    if (outcome === 'success') {
      skillTracker.recordSuccess(domain, {
        linesChanged: filesModified.length * 20, // Rough estimate
      });
      console.log(`[SessionMonitor] Recorded SUCCESS in ${domain}`);
    } else if (outcome === 'failure') {
      const errorType = errorsSeen.length > 0 ? 'runtime_error' : 'unknown';
      skillTracker.recordError(domain, errorType, {});
      console.log(`[SessionMonitor] Recorded ERROR in ${domain}: ${errorType}`);
    }
    // 'partial' and 'unknown' outcomes don't affect skill tracking
  }

  /**
   * Extract file paths mentioned as modified
   */
  private extractFilesModified(response: string): string[] {
    const files: Set<string> = new Set();

    for (const pattern of FILE_PATTERNS) {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          // Clean up the file path
          const filePath = match[1].trim();
          // Filter out noise (URLs, etc.)
          if (filePath && !filePath.startsWith('http') && filePath.length < 200) {
            files.add(filePath);
          }
        } else if (match[0]) {
          const filePath = match[0].trim();
          if (filePath && !filePath.startsWith('http') && filePath.length < 200) {
            files.add(filePath);
          }
        }
      }
    }

    // Also parse tool call patterns like [Write] filename or [Edit] filename
    const toolCallRegex = /\[(?:Write|Edit|Create|Read)\]\s+([^\s\n]+)/gi;
    let toolMatch;
    while ((toolMatch = toolCallRegex.exec(response)) !== null) {
      if (toolMatch[1]) {
        const filePath = toolMatch[1].trim();
        if (filePath && !filePath.startsWith('http') && filePath.length < 200) {
          files.add(filePath);
        }
      }
    }

    return Array.from(files);
  }

  /**
   * Extract error messages from response
   */
  private extractErrors(response: string): string[] {
    const errors: string[] = [];

    for (const pattern of ERROR_PATTERNS) {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        // Get the full line containing the error
        const lineStart = response.lastIndexOf('\n', match.index || 0) + 1;
        const lineEnd = response.indexOf('\n', match.index || 0);
        const line = response.substring(lineStart, lineEnd === -1 ? undefined : lineEnd);
        if (line && !errors.includes(line)) {
          errors.push(line.trim());
        }
      }
    }

    return errors.slice(0, 10); // Limit to 10 errors
  }

  /**
   * Infer the outcome of the interaction
   */
  private inferOutcome(response: string, errors: string[]): 'success' | 'failure' | 'partial' | 'unknown' {
    const lowerResponse = response.toLowerCase();

    // Check for clear failure indicators
    if (errors.length > 3) return 'failure';
    if (lowerResponse.includes('failed') || lowerResponse.includes('error occurred')) {
      return 'failure';
    }

    // Check for success indicators
    if (
      lowerResponse.includes('successfully') ||
      lowerResponse.includes('completed') ||
      lowerResponse.includes('done') ||
      lowerResponse.includes('created') ||
      lowerResponse.includes('updated')
    ) {
      return errors.length > 0 ? 'partial' : 'success';
    }

    // Partial if some errors but also some progress
    if (errors.length > 0) return 'partial';

    return 'unknown';
  }

  /**
   * Manually record an interaction (for UI-triggered recording)
   */
  recordManualInteraction(
    sessionId: string,
    prompt: string,
    response: string,
    feedback?: number
  ): void {
    const aiCore = getAICore();
    const filesModified = this.extractFilesModified(response);
    const errorsSeen = this.extractErrors(response);
    const outcome = this.inferOutcome(response, errorsSeen);

    aiCore.recordInteraction(sessionId, prompt, response, {
      filesModified,
      outcome,
      feedback,
    });
  }

  /**
   * Get all monitored sessions
   */
  getMonitoredSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Check if a session is being monitored
   */
  isMonitoring(sessionName: string): boolean {
    return this.sessions.has(sessionName);
  }

  /**
   * Shutdown all monitoring
   */
  shutdown(): void {
    for (const [sessionName, interval] of this.pollIntervals) {
      clearInterval(interval);
      console.log(`[SessionMonitor] Stopped monitoring: ${sessionName}`);
    }
    this.pollIntervals.clear();
    this.sessions.clear();
    console.log('[SessionMonitor] Shutdown complete');
  }
}
