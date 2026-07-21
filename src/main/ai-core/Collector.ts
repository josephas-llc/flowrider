/**
 * Collector - Captures session interactions for learning
 *
 * Monitors tmux sessions and collects:
 * - Command/prompt inputs
 * - AI responses
 * - Code changes
 * - Error patterns
 * - User feedback signals
 */

import * as crypto from 'crypto';
import { Memory, Interaction } from './Memory';

// ============================================
// Types
// ============================================

export interface SessionContext {
  sessionId: string;
  sessionName: string;
  projectId: string | null;
  workingDir: string;
  repoUrl: string | null;
  language: string | null;
  framework: string | null;
}

export interface CollectedInteraction {
  prompt: string;
  response: string;
  startTime: number;
  endTime: number;
  filesModified: string[];
  errors: string[];
  exitCode: number | null;
}

export interface FeedbackSignal {
  type: 'accept' | 'reject' | 'modify' | 'retry' | 'undo';
  value: number; // -1 to 1
  context?: string;
}

// ============================================
// Interaction Parser
// ============================================

class InteractionParser {
  // Extract code blocks from response
  static extractCodeBlocks(text: string): { language: string; code: string }[] {
    const blocks: { language: string; code: string }[] = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'unknown',
        code: match[2].trim(),
      });
    }
    return blocks;
  }

  // Extract file paths mentioned in text
  static extractFilePaths(text: string): string[] {
    const paths: string[] = [];
    // Match common file path patterns
    const patterns = [
      /(?:^|\s)([\/~][\w\-\.\/]+\.\w+)/gm,
      /(?:file|path|in|at|from|to)\s*[:\s]*['"`]?([\/\w\-\.]+\.\w+)['"`]?/gi,
      /(?:created?|modified?|updated?|deleted?|wrote?|writing)\s+['"`]?([\/\w\-\.]+\.\w+)['"`]?/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && !paths.includes(match[1])) {
          paths.push(match[1]);
        }
      }
    }
    return paths;
  }

  // Extract error messages from terminal output
  static extractErrors(text: string): string[] {
    const errors: string[] = [];

    // JavaScript/TypeScript errors
    const jsErrorPatterns = [
      /(?:Error|Exception):\s*(.+?)(?:\n|$)/gi,
      /(?:TypeError|ReferenceError|SyntaxError|RangeError):\s*(.+?)(?:\n|$)/gi,
      /Uncaught\s+(?:\w+)?Error:\s*(.+?)(?:\n|$)/gi,
      /at\s+.+?:\d+:\d+/gi, // Stack trace lines
    ];

    // Python errors
    const pythonErrorPatterns = [
      /(?:Traceback.*?\n)?(?:File|line)\s+"[^"]+".+?(?:Error|Exception):\s*(.+?)(?:\n\n|\n$)/gis,
      /(?:NameError|ValueError|TypeError|AttributeError|KeyError|IndexError):\s*(.+?)(?:\n|$)/gi,
    ];

    // Shell/System errors
    const shellErrorPatterns = [
      /(?:bash|sh|zsh):\s*(?:line\s+\d+:)?\s*(.+?)(?:\n|$)/gi,
      /command\s+not\s+found:\s*(.+?)(?:\n|$)/gi,
      /permission\s+denied:\s*(.+?)(?:\n|$)/gi,
    ];

    // Git errors
    const gitErrorPatterns = [
      /fatal:\s*(.+?)(?:\n|$)/gi,
      /error:\s*(.+?)(?:\n|$)/gi,
      /CONFLICT\s*\([^)]+\):\s*(.+?)(?:\n|$)/gi,
    ];

    // NPM/Yarn errors
    const npmErrorPatterns = [
      /npm\s+ERR!\s*(.+?)(?:\n|$)/gi,
      /error\s+An unexpected error occurred:\s*(.+?)(?:\n|$)/gi,
      /ENOENT:\s*(.+?)(?:\n|$)/gi,
    ];

    // Build errors
    const buildErrorPatterns = [
      /error\s+TS\d+:\s*(.+?)(?:\n|$)/gi,
      /ERROR in\s+(.+?)(?:\n|$)/gi,
      /Build failed with\s+\d+\s+errors?/gi,
    ];

    // Test failures
    const testErrorPatterns = [
      /FAIL\s+(.+?)(?:\n|$)/gi,
      /Test failed:\s*(.+?)(?:\n|$)/gi,
      /AssertionError:\s*(.+?)(?:\n|$)/gi,
      /Expected.*?but got/gi,
    ];

    // Generic failure patterns
    const failurePatterns = [
      /failed\s+(?:to|with)?\s*(.+?)(?:\n|$)/gi,
      /exception:\s*(.+?)(?:\n|$)/gi,
      /(?:cannot|unable to)\s+(.+?)(?:\n|$)/gi,
    ];

    const allPatterns = [
      ...jsErrorPatterns,
      ...pythonErrorPatterns,
      ...shellErrorPatterns,
      ...gitErrorPatterns,
      ...npmErrorPatterns,
      ...buildErrorPatterns,
      ...testErrorPatterns,
      ...failurePatterns,
    ];

    for (const pattern of allPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const errorText = match[1] || match[0];
        if (errorText && errorText.trim().length > 0 && errorText.length < 500) {
          errors.push(errorText.trim());
        }
      }
    }

    // Also extract stack traces as complete error contexts
    const stackTracePattern = /(?:Error|Exception):[^\n]*\n(?:\s+at\s+[^\n]+\n?)+/g;
    let stackMatch;
    while ((stackMatch = stackTracePattern.exec(text)) !== null) {
      errors.push(stackMatch[0].trim());
    }

    return [...new Set(errors)]; // Remove duplicates
  }

  // Generate a semantic hash for similar prompt detection
  static generatePromptHash(prompt: string): string {
    // Normalize the prompt
    const normalized = prompt
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/['"`]/g, '')
      .replace(/\d+/g, 'N') // Replace numbers with placeholder
      .replace(/[\/\\][\w\-\.]+/g, 'PATH') // Replace paths
      .trim();

    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  // Detect the intent/category of a prompt from terminal interactions
  static detectPromptCategory(prompt: string): string[] {
    const categories: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    const categoryPatterns: { [key: string]: RegExp[] } = {
      'bugfix': [/fix\s/, /bug/, /error/, /issue/, /broken/, /doesn't work/, /not working/, /repair/],
      'feature': [/add\s/, /implement/, /create/, /build/, /new\s/, /feature/, /develop/],
      'refactor': [/refactor/, /improve/, /clean\s*up/, /optimize/, /restructure/, /reorganize/],
      'test': [/test/, /spec/, /coverage/, /assert/, /expect/, /vitest/, /jest/, /mocha/],
      'docs': [/document/, /readme/, /comment/, /explain/, /describe/, /documentation/],
      'debug': [/debug/, /why\s/, /what's wrong/, /investigate/, /find\s/, /trace/, /diagnose/],
      'config': [/config/, /setup/, /install/, /environment/, /settings/, /\.env/, /package\.json/],
      'style': [/style/, /format/, /lint/, /prettier/, /eslint/, /formatting/],
      'security': [/security/, /auth/, /permission/, /encrypt/, /password/, /token/, /vulnerability/],
      'performance': [/performance/, /speed/, /slow/, /optimize/, /cache/, /memory/, /latency/],
      'git': [/\bgit\s/, /commit/, /push/, /pull/, /merge/, /branch/, /rebase/, /checkout/, /clone/],
      'npm': [/\bnpm\s/, /\byarn\s/, /\bpnpm\s/, /package/, /install/, /dependencies/],
      'build': [/build/, /compile/, /bundle/, /webpack/, /vite/, /rollup/, /transpile/],
      'deploy': [/deploy/, /release/, /publish/, /production/, /staging/],
      'database': [/database/, /db/, /sql/, /query/, /schema/, /migration/, /postgres/, /mysql/, /mongo/],
      'api': [/\bapi\s/, /endpoint/, /route/, /request/, /response/, /rest/, /graphql/],
      'ui': [/ui/, /interface/, /component/, /react/, /vue/, /angular/, /css/, /html/],
      'typescript': [/typescript/, /\bts\b/, /type/, /interface/, /generic/],
      'javascript': [/javascript/, /\bjs\b/, /node/, /async/, /promise/],
      'python': [/python/, /\bpy\b/, /django/, /flask/, /pip/],
    };

    for (const [category, patterns] of Object.entries(categoryPatterns)) {
      if (patterns.some(p => p.test(lowerPrompt))) {
        categories.push(category);
      }
    }

    // Also detect from command patterns in prompt
    if (/\$\s*git\s/.test(prompt)) categories.push('git');
    if (/\$\s*npm\s/.test(prompt)) categories.push('npm');
    if (/\$\s*docker\s/.test(prompt)) categories.push('docker');

    return categories.length > 0 ? categories : ['general'];
  }

  // Estimate success from response content
  static estimateOutcome(response: string, errors: string[]): Interaction['outcome'] {
    const lowerResponse = response.toLowerCase();

    // Check for explicit failure indicators
    if (errors.length > 2) return 'failure';
    if (/failed|error|exception|cannot|unable/i.test(lowerResponse) && errors.length > 0) {
      return 'failure';
    }

    // Check for partial success indicators
    if (/partially|some\s+(?:issues|problems)|but\s+/i.test(lowerResponse)) {
      return 'partial';
    }

    // Check for success indicators
    if (/(?:successfully|done|complete|fixed|implemented|created|updated)/i.test(lowerResponse)) {
      return 'success';
    }

    return 'unknown';
  }
}

// ============================================
// Collector Class
// ============================================

export class Collector {
  private memory: Memory;
  private activeSessions: Map<string, SessionContext> = new Map();
  private pendingInteractions: Map<string, Partial<CollectedInteraction>> = new Map();
  private feedbackQueue: Map<string, FeedbackSignal[]> = new Map();

  constructor(memory: Memory) {
    this.memory = memory;
    console.log('[Collector] Initialized');
  }

  // ============================================
  // Session Management
  // ============================================

  registerSession(context: SessionContext): void {
    this.activeSessions.set(context.sessionId, context);
    this.feedbackQueue.set(context.sessionId, []);
    console.log(`[Collector] Registered session: ${context.sessionName}`);
  }

  unregisterSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    this.pendingInteractions.delete(sessionId);
    this.feedbackQueue.delete(sessionId);
  }

  updateSessionContext(sessionId: string, updates: Partial<SessionContext>): void {
    const current = this.activeSessions.get(sessionId);
    if (current) {
      this.activeSessions.set(sessionId, { ...current, ...updates });
    }
  }

  // ============================================
  // Interaction Collection
  // ============================================

  /**
   * Called when a prompt is sent to the AI
   */
  startInteraction(sessionId: string, prompt: string): string {
    const interactionId = crypto.randomUUID();
    this.pendingInteractions.set(interactionId, {
      prompt,
      startTime: Date.now(),
      filesModified: [],
      errors: [],
    });
    console.log(`[Collector] Started interaction ${interactionId.substring(0, 8)}`);
    return interactionId;
  }

  /**
   * Called when AI response is received
   */
  completeInteraction(
    interactionId: string,
    sessionId: string,
    response: string,
    exitCode?: number
  ): void {
    const pending = this.pendingInteractions.get(interactionId);
    if (!pending || !pending.prompt) {
      console.warn(`[Collector] No pending interaction for ${interactionId}`);
      return;
    }

    const context = this.activeSessions.get(sessionId);

    // Parse the response for insights
    const filesModified = InteractionParser.extractFilePaths(response);
    const errors = InteractionParser.extractErrors(response);
    const codeBlocks = InteractionParser.extractCodeBlocks(response);
    const categories = InteractionParser.detectPromptCategory(pending.prompt);
    const outcome = InteractionParser.estimateOutcome(response, errors);

    // Calculate feedback score from queued signals
    const feedbackSignals = this.feedbackQueue.get(sessionId) || [];
    const feedbackScore = this.calculateFeedbackScore(feedbackSignals);
    this.feedbackQueue.set(sessionId, []); // Clear queue

    // Build the interaction record
    const interaction: Omit<Interaction, 'id'> = {
      sessionId,
      projectId: context?.projectId || null,
      timestamp: Date.now(),
      promptHash: InteractionParser.generatePromptHash(pending.prompt),
      prompt: pending.prompt,
      response: this.truncateResponse(response),
      outcome,
      userFeedback: feedbackScore,
      codeChanged: codeBlocks.length > 0 || filesModified.length > 0,
      filesAffected: filesModified,
      errorsCaught: errors,
      tags: categories,
    };

    // Save to memory
    const savedId = this.memory.saveInteraction(interaction);
    console.log(`[Collector] Saved interaction ${savedId.substring(0, 8)} [${outcome}]`);

    // Clean up
    this.pendingInteractions.delete(interactionId);

    // Also save any interesting code snippets
    this.extractAndSaveSnippets(codeBlocks, context, categories);
  }

  /**
   * Record user feedback signal
   */
  recordFeedback(sessionId: string, signal: FeedbackSignal): void {
    const queue = this.feedbackQueue.get(sessionId) || [];
    queue.push(signal);
    this.feedbackQueue.set(sessionId, queue);
    console.log(`[Collector] Recorded feedback: ${signal.type} (${signal.value})`);
  }

  // ============================================
  // Tmux Output Parsing
  // ============================================

  /**
   * Parse tmux output to detect interactions
   * This is called periodically to scan session output
   */
  parseTmuxOutput(sessionId: string, output: string): void {
    const context = this.activeSessions.get(sessionId);
    if (!context) return;

    // Detect Claude Code prompts and responses
    // Look for patterns like "Human:", "Assistant:", ">" prompt markers
    const segments = this.segmentOutput(output);

    for (const segment of segments) {
      if (segment.type === 'prompt' && segment.content) {
        const interactionId = this.startInteraction(sessionId, segment.content);
        // Store for later completion
        this.pendingInteractions.set(`tmux-${sessionId}`, {
          ...this.pendingInteractions.get(interactionId),
        });
      } else if (segment.type === 'response' && segment.content) {
        const pending = this.pendingInteractions.get(`tmux-${sessionId}`);
        if (pending) {
          this.completeInteraction(`tmux-${sessionId}`, sessionId, segment.content);
        }
      }
    }
  }

  private segmentOutput(output: string): { type: 'prompt' | 'response' | 'other'; content: string }[] {
    const segments: { type: 'prompt' | 'response' | 'other'; content: string }[] = [];

    // Simple heuristic segmentation
    // In practice, this would need to be more sophisticated
    const lines = output.split('\n');
    let currentType: 'prompt' | 'response' | 'other' = 'other';
    let currentContent: string[] = [];

    for (const line of lines) {
      // Detect prompt start (user input)
      if (line.match(/^(>|❯|\$|Human:)\s*/)) {
        if (currentContent.length > 0) {
          segments.push({ type: currentType, content: currentContent.join('\n') });
        }
        currentType = 'prompt';
        currentContent = [line.replace(/^(>|❯|\$|Human:)\s*/, '')];
      }
      // Detect response start
      else if (line.match(/^(Assistant:|Claude:|AI:)/)) {
        if (currentContent.length > 0) {
          segments.push({ type: currentType, content: currentContent.join('\n') });
        }
        currentType = 'response';
        currentContent = [line.replace(/^(Assistant:|Claude:|AI:)\s*/, '')];
      }
      // Continue current segment
      else if (currentType !== 'other') {
        currentContent.push(line);
      }
    }

    // Don't forget the last segment
    if (currentContent.length > 0) {
      segments.push({ type: currentType, content: currentContent.join('\n') });
    }

    return segments;
  }

  // ============================================
  // Helper Methods
  // ============================================

  private truncateResponse(response: string, maxLength: number = 10000): string {
    if (response.length <= maxLength) return response;
    return response.substring(0, maxLength) + '\n... [truncated]';
  }

  private calculateFeedbackScore(signals: FeedbackSignal[]): number | null {
    if (signals.length === 0) return null;

    // Weighted average based on signal type
    const weights: { [key: string]: number } = {
      'accept': 1.0,
      'reject': -1.0,
      'modify': 0.3,
      'retry': -0.5,
      'undo': -0.8,
    };

    let totalWeight = 0;
    let totalScore = 0;

    for (const signal of signals) {
      const weight = weights[signal.type] || 0;
      totalWeight += Math.abs(weight);
      totalScore += signal.value * weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : null;
  }

  private extractAndSaveSnippets(
    codeBlocks: { language: string; code: string }[],
    context: SessionContext | undefined,
    categories: string[]
  ): void {
    for (const block of codeBlocks) {
      // Only save non-trivial code blocks
      if (block.code.length < 50 || block.code.length > 5000) continue;
      if (block.code.split('\n').length < 3) continue;

      // Try to determine the purpose from the code
      const purpose = this.inferCodePurpose(block.code, block.language);

      this.memory.saveSnippet({
        language: block.language,
        purpose,
        code: block.code,
        context: JSON.stringify({
          categories,
          workingDir: context?.workingDir,
          framework: context?.framework,
        }),
        projectId: context?.projectId || null,
        successRate: 0.5, // Start neutral
        useCount: 0,
        createdAt: Date.now(),
        tags: categories,
      });
    }
  }

  private inferCodePurpose(code: string, language: string): string {
    // Try to extract function/class names
    const functionMatch = code.match(/(?:function|def|const|let|var)\s+(\w+)/);
    const classMatch = code.match(/(?:class|interface|type)\s+(\w+)/);
    const componentMatch = code.match(/(?:export\s+(?:default\s+)?)?(?:function|const)\s+(\w+).*(?:React|Component|FC)/);

    if (componentMatch) return `React component: ${componentMatch[1]}`;
    if (classMatch) return `${language} class: ${classMatch[1]}`;
    if (functionMatch) return `${language} function: ${functionMatch[1]}`;

    // Fallback to general description
    const lineCount = code.split('\n').length;
    return `${language} snippet (${lineCount} lines)`;
  }

  // ============================================
  // Direct API for Programmatic Collection
  // ============================================

  /**
   * Directly collect an interaction (for programmatic use)
   */
  collectInteraction(
    sessionId: string,
    prompt: string,
    response: string,
    metadata?: {
      filesModified?: string[];
      outcome?: Interaction['outcome'];
      feedback?: number;
    }
  ): string {
    const context = this.activeSessions.get(sessionId);
    const errors = InteractionParser.extractErrors(response);
    const categories = InteractionParser.detectPromptCategory(prompt);
    const codeBlocks = InteractionParser.extractCodeBlocks(response);

    const interaction: Omit<Interaction, 'id'> = {
      sessionId,
      projectId: context?.projectId || null,
      timestamp: Date.now(),
      promptHash: InteractionParser.generatePromptHash(prompt),
      prompt,
      response: this.truncateResponse(response),
      outcome: metadata?.outcome || InteractionParser.estimateOutcome(response, errors),
      userFeedback: metadata?.feedback || null,
      codeChanged: codeBlocks.length > 0 || (metadata?.filesModified?.length || 0) > 0,
      filesAffected: metadata?.filesModified || InteractionParser.extractFilePaths(response),
      errorsCaught: errors,
      tags: categories,
    };

    const savedId = this.memory.saveInteraction(interaction);

    // Extract snippets
    this.extractAndSaveSnippets(codeBlocks, context, categories);

    return savedId;
  }
}

export default Collector;
